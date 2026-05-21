import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { intent, model } = await request.json();

    if (!intent || intent.trim().length < 5) {
      return NextResponse.json({ questions: [] });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ questions: fallbackQuestions(intent) });
    }

    const activeModel = model || process.env.DEFAULT_MODEL || "openai/gpt-4o";

    const systemPrompt =
      'A user wants to create an AI prompt for: "' +
      intent +
      '"\n\nReturn 2-3 short clarifying questions as a JSON array of strings. Only ask questions whose answers would meaningfully improve the prompt. Do not repeat what is already in their description.\n\nExample: ["Who is the target audience?", "Should the tone be formal or casual?"]';

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
        "HTTP-Referer": "https://promptforge.vercel.app",
        "X-Title": "PromptForge",
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: intent },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ questions: fallbackQuestions(intent) });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";

    let questions: string[] = [];
    try {
      let jsonStr = text;
      const startIdx = text.indexOf("[");
      const endIdx = text.lastIndexOf("]") + 1;
      if (startIdx >= 0 && endIdx > startIdx) {
        jsonStr = text.substring(startIdx, endIdx);
      }
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        questions = parsed.filter((q: unknown) => typeof q === "string").slice(0, 4);
      }
    } catch {
      questions = text
        .split("\n")
        .filter((l: string) => l.includes("?"))
        .map((l: string) =>
          l
            .replace(/^[\d\-*.)"+\s]+/, "")
            .replace(/"$/, "")
            .trim()
        )
        .filter((l: string) => l.length > 10)
        .slice(0, 3);
    }

    if (questions.length === 0) {
      questions = fallbackQuestions(intent);
    }

    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({
      questions: ["Who is the target audience?", "Any preference for tone or style?", "How should the output be structured?"],
    });
  }
}

function fallbackQuestions(intent: string): string[] {
  const il = intent.toLowerCase();
  const qs: string[] = [];
  if (!["audience", "reader", "beginner", "expert", "for"].some((k) => il.includes(k)))
    qs.push("Who is the target audience?");
  if (!["tone", "style", "casual", "formal"].some((k) => il.includes(k)))
    qs.push("Any preference for tone or style?");
  if (!["format", "list", "table", "json", "code", "article"].some((k) => il.includes(k)))
    qs.push("How should the output be structured?");
  return qs.slice(0, 3);
}