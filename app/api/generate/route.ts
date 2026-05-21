import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const META_PROMPT = `You are an elite prompt engineer. Your sole task is to generate optimized, production-quality prompts that will be fed to Large Language Models.

The user will provide you with a rough description of what they want an AI to do. Your job is to transform that rough description into a perfectly crafted prompt that will get the best possible results from any LLM.

YOUR PROCESS:
1. Analyze the user's intent — what are they REALLY trying to achieve?
2. Identify implicit requirements they didn't state but clearly need
3. Structure the prompt using proven prompt engineering techniques
4. Add specificity, constraints, and formatting instructions
5. Include a role/persona if it would improve output quality
6. Add output format specifications if not obvious
7. Include guard rails and edge case handling where appropriate

TECHNIQUES TO APPLY (when appropriate):
- Role assignment ("Act as...")
- Task decomposition (break complex tasks into steps)
- Output formatting (specify structure, length, format)
- Few-shot examples (if it would help)
- Chain-of-thought (for reasoning tasks)
- Constraint specification (what to include AND avoid)
- Audience awareness (adjust language level)

RULES:
- Output ONLY the generated prompt — no explanations, no "Here's your prompt:" prefix
- Do NOT wrap in code blocks or quotes
- Copy-paste ready
- Natural professional language, not robotic
- Scale complexity to the task
- If vague, make reasonable assumptions`;

export async function POST(request: NextRequest) {
  try {
    const { intent, followUpQA, context, model, provider, temperature } = await request.json();

    if (!intent || intent.trim().length < 5) {
      return NextResponse.json({ error: "Please describe what you need (min 10 characters)." }, { status: 400 });
    }

    // Build user message
    let userMessage = intent;
    if (followUpQA && Object.keys(followUpQA).length > 0) {
      userMessage += "\n\nAdditional details:";
      for (const [q, a] of Object.entries(followUpQA)) {
        if (a) userMessage += `\n- ${q}: ${a}`;
      }
    }
    if (context?.trim()) {
      userMessage += `\n\nReference material:\n---\n${context}\n---`;
    }

    // Determine provider and API key
    const activeProvider = provider || process.env.DEFAULT_PROVIDER || "openrouter";
    const activeModel = model || process.env.DEFAULT_MODEL || "openai/gpt-4o";

    const result = await callLLM(activeProvider, activeModel, META_PROMPT, userMessage, temperature);

    return NextResponse.json({
      prompt: result.text,
      model: activeModel,
      provider: activeProvider,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      estimatedCost: result.estimatedCost,
    });
  } catch (err: any) {
    console.error("[generate]", err.message);
    return NextResponse.json({ error: err.message || "Generation failed" }, { status: 500 });
  }
}

async function callLLM(
  provider: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature?: number
) {
  const temp = temperature ?? 0.7;

  if (provider === "anthropic") {
    return callAnthropic(model, systemPrompt, userMessage, temp);
  }
  // OpenAI, OpenRouter, and compatible all use OpenAI protocol
  return callOpenAICompatible(provider, model, systemPrompt, userMessage, temp);
}

async function callOpenAICompatible(
  provider: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number
) {
  let apiBase: string;
  let apiKey: string;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (provider === "openrouter") {
    apiBase = "https://openrouter.ai/api/v1";
    apiKey = process.env.OPENROUTER_API_KEY || "";
    headers["HTTP-Referer"] = "https://promptforge.vercel.app";
    headers["X-Title"] = "PromptForge";
  } else if (provider === "openai") {
    apiBase = "https://api.openai.com/v1";
    apiKey = process.env.OPENAI_API_KEY || "";
  } else {
    apiBase = process.env.CUSTOM_API_BASE || "http://localhost:1234/v1";
    apiKey = process.env.CUSTOM_API_KEY || "not-needed";
  }

  if (!apiKey) throw new Error(`No API key set for ${provider}. Add it in Vercel Environment Variables.`);

  headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || err?.message || `HTTP ${res.status}`;
    throw new Error(`${provider} error (${res.status}): ${msg}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const usage = data.usage || {};

  return {
    text,
    tokensInput: usage.prompt_tokens || 0,
    tokensOutput: usage.completion_tokens || 0,
    estimatedCost: null as number | null,
  };
}

async function callAnthropic(
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("No Anthropic API key set. Add ANTHROPIC_API_KEY in Vercel Environment Variables.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Anthropic error (${res.status}): ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    text: data.content?.[0]?.text || "",
    tokensInput: data.usage?.input_tokens || 0,
    tokensOutput: data.usage?.output_tokens || 0,
    estimatedCost: null as number | null,
  };
}