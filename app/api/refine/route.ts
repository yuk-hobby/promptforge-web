import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { previousPrompt, feedback, model } = await request.json();

    if (!previousPrompt) {
      return NextResponse.json({ error: "No prompt to refine." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server not configured. Add OPENROUTER_API_KEY." }, { status: 500 });
    }

    const activeModel = model || process.env.DEFAULT_MODEL || "openai/gpt-4o";

    const systemPrompt =
      "You are an elite prompt engineer. You previously generated this prompt:\n\n---\n" +
      previousPrompt +
      "\n---\n\nThe user wants these changes: " +
      (feedback || "Optimize for maximum effectiveness.") +
      "\n\nGenerate the improved prompt. Output ONLY the revised prompt. No explanations, no commentary.";

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
          { role: "user", content: feedback || "Optimize this prompt for best results." },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.error?.message || "API error " + res.status;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";

    return NextResponse.json({ prompt: text, model: activeModel });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}