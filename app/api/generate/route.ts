import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an elite prompt engineer. Your sole task is to generate optimized, production-quality prompts that will be fed to Large Language Models.

The user will provide a rough description of what they want an AI to do. Transform it into a perfectly crafted prompt.

Process:
1. Analyze intent - what are they REALLY trying to achieve?
2. Identify implicit requirements they did not state
3. Structure using prompt engineering best practices
4. Add specificity, constraints, formatting instructions
5. Include a role/persona if it improves quality
6. Add output format specifications
7. Include guard rails where appropriate

Techniques to apply when appropriate:
- Role assignment ("Act as...")
- Task decomposition (break into steps)
- Output formatting (specify structure, length, format)
- Few-shot examples if helpful
- Chain-of-thought for reasoning tasks
- Constraints (what to include AND avoid)
- Audience awareness

Rules:
- Output ONLY the generated prompt
- No explanations, no "Here is your prompt:" prefix
- Do NOT wrap in code blocks or quotes
- Copy-paste ready immediately
- Natural professional language, not robotic
- Scale complexity to the task
- If request is vague, make reasonable assumptions`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intent, followUpQA, context, model, temperature } = body;

    if (!intent || intent.trim().length < 5) {
      return NextResponse.json(
        { error: "Please describe what you need (minimum 10 characters)." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server not configured. Add OPENROUTER_API_KEY in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    let userMessage = intent;
    if (followUpQA && Object.keys(followUpQA).length > 0) {
      userMessage += "\n\nAdditional details from user:";
      for (const [q, a] of Object.entries(followUpQA)) {
        if (a) userMessage += "\n- " + q + ": " + a;
      }
    }
    if (context && context.trim()) {
      userMessage += "\n\nReference material:\n---\n" + context + "\n---";
    }

    const activeModel = model || process.env.DEFAULT_MODEL || "openai/gpt-4o";

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: temperature ?? 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: { message: res.statusText } }));
      const msg = errBody?.error?.message || "API returned " + res.status;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";

    if (!text) {
      return NextResponse.json({ error: "AI returned an empty response. Try again." }, { status: 500 });
    }

    return NextResponse.json({
      prompt: text,
      model: activeModel,
      tokensInput: data?.usage?.prompt_tokens || 0,
      tokensOutput: data?.usage?.completion_tokens || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}