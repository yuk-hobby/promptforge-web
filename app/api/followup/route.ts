import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const FOLLOWUP_PROMPT = `A user wants to create an AI prompt for this purpose:

"{INTENT}"

What 2-3 short, specific clarifying questions would help you create a much better prompt for them?

Rules:
- Ask ONLY questions whose answers would meaningfully change the prompt
- Don't ask obvious questions already answered in their description
- Keep questions concise
- Return as a JSON array of strings

Example: ["Who is the target audience?", "Should the tone be formal or casual?", "Are there any topics to avoid?"]`;

export async function POST(request: NextRequest) {
  try {
    const { intent, model, provider } = await request.json();

    if (!intent || intent.trim().length < 5) {
      return NextResponse.json({ questions: [] });
    }

    const activeProvider = provider || process.env.DEFAULT_PROVIDER || "openrouter";
    const activeModel = model || process.env.DEFAULT_MODEL || "openai/gpt-4o";
    const systemPrompt = FOLLOWUP_PROMPT.replace("{INTENT}", intent);

    // Get API key
    let apiKey = "";
    let apiBase = "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (activeProvider === "openrouter") {
      apiBase = "https://openrouter.ai/api/v1";
      apiKey = process.env.OPENROUTER_API_KEY || "";
      headers["HTTP-Referer"] = "https://promptforge.vercel.app";
      headers["X-Title"] = "PromptForge";
    } else if (activeProvider === "openai") {
      apiBase = "https://api.openai.com/v1";
      apiKey = process.env.OPENAI_API_KEY || "";
    } else if (activeProvider === "anthropic") {
      // For simplicity, use heuristic fallback for Anthropic follow-ups
      return NextResponse.json({
        questions: getHeuristicQuestions(intent),
      });
    } else {
      apiBase = "https://openrouter.ai/api/v1";
      apiKey = process.env.OPENROUTER_API_KEY || "";
    }

    if (!apiKey) {
      return NextResponse.json({ questions: getHeuristicQuestions(intent) });
    }

    headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: activeModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: intent },
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ questions: getHeuristicQuestions(intent) });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    // Parse JSON
    let questions: string[] = [];
    try {
      let jsonText = text;
      if (text.includes("```")) {
        const s = text.indexOf("[");
        const e = text.lastIndexOf("]") + 1;
        if (s >= 0 && e > s) jsonText = text.substring(s, e);
      }
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        questions = parsed.filter((q: any) => typeof q === "string").slice(0, 4);
      }
    } catch {
      questions = text
        .split("\n")
        .filter((l: string) => l.includes("?"))
        .map((l: string) => l.replace(/^[\d\-\*\.\)]+\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter((l: string) => l.length > 10)
        .slice(0, 3);
    }

    if (questions.length === 0) {
      questions = getHeuristicQuestions(intent);
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[followup]", err);
    return NextResponse.json({ questions: getHeuristicQuestions("") });
  }
}

function getHeuristicQuestions(intent: string): string[] {
  const il = intent.toLowerCase();
  const questions: string[] = [];

  if (!["for", "audience", "reader", "beginner", "expert"].some((k) => il.includes(k)))
    questions.push("Who is the target audience?");
  if (!["tone", "style", "casual", "formal"].some((k) => il.includes(k)))
    questions.push("Any preference for tone or style?");
  if (!["format", "list", "table", "json", "code", "article"].some((k) => il.includes(k)))
    questions.push("How should the output be structured?");

  return questions.slice(0, 3);
}