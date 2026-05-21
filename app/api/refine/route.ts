import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const REFINE_PROMPT = `You are an elite prompt engineer. You previously generated this prompt:

---
{PREVIOUS}
---

The user wants the following changes:
{FEEDBACK}

Generate the improved prompt incorporating this feedback. Output ONLY the revised prompt — no explanations.`;

export async function POST(request: NextRequest) {
  try {
    const { previousPrompt, feedback, model, provider } = await request.json();

    if (!previousPrompt) {
      return NextResponse.json({ error: "No prompt to refine" }, { status: 400 });
    }

    const systemPrompt = REFINE_PROMPT.replace("{PREVIOUS}", previousPrompt).replace(
      "{FEEDBACK}",
      feedback || "Optimize for maximum effectiveness."
    );

    const activeProvider = provider || process.env.DEFAULT_PROVIDER || "openrouter";
    const activeModel = model || process.env.DEFAULT_MODEL || "openai/gpt-4o";

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
      const antKey = process.env.ANTHROPIC_API_KEY;
      if (!antKey) throw new Error("No Anthropic key");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": antKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: activeModel,
          system: systemPrompt,
          messages: [{ role: "user", content: feedback || "Optimize this prompt." }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Anthropic ${res.status}`);
      }
      const data = await res.json();
      return NextResponse.json({
        prompt: data.content?.[0]?.text || "",
        model: activeModel,
        provider: activeProvider,
        tokensInput: data.usage?.input_tokens || 0,
        tokensOutput: data.usage?.output_tokens || 0,
      });
    } else {
      apiBase = process.env.CUSTOM_API_BASE || "https://openrouter.ai/api/v1";
      apiKey = process.env.OPENROUTER_API_KEY || "";
    }

    if (!apiKey) throw new Error(`No API key for ${activeProvider}`);
    headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: activeModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: feedback || "Optimize this prompt." },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `${activeProvider} error ${res.status}`);
    }

    const data = await res.json();

    return NextResponse.json({
      prompt: data.choices?.[0]?.message?.content || "",
      model: activeModel,
      provider: activeProvider,
      tokensInput: data.usage?.prompt_tokens || 0,
      tokensOutput: data.usage?.completion_tokens || 0,
    });
  } catch (err: any) {
    console.error("[refine]", err.message);
    return NextResponse.json({ error: err.message || "Refinement failed" }, { status: 500 });
  }
}