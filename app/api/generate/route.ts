import { NextRequest, NextResponse } from "next/server";
import { callLLM, callLLMStream } from "@/lib/llm-client";
import { META_PROMPT } from "@/lib/meta-prompts";
import { GenerateRequest } from "@/lib/types";

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { intent, followUpQA, context, model, provider, temperature } = body;

    if (!intent || intent.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a description of what you need." },
        { status: 400 }
      );
    }

    // Build the user message with all context
    let followUpSection = "";
    if (followUpQA && Object.keys(followUpQA).length > 0) {
      followUpSection = "\n\nADDITIONAL DETAILS FROM USER:\n";
      for (const [q, a] of Object.entries(followUpQA)) {
        followUpSection += `Q: ${q}\nA: ${a}\n`;
      }
    }

    let contextSection = "";
    if (context && context.trim()) {
      contextSection = `\n\nREFERENCE MATERIAL PROVIDED:\n---\n${context}\n---`;
    }

    const userMessage = `${intent}${followUpSection}${contextSection}`;

    const systemPrompt = META_PROMPT;

    // Check if streaming is requested
    const wantsStream = request.headers.get("accept") === "text/event-stream";

    if (wantsStream) {
      // Return streaming response
      const stream = await callLLMStream({
        systemPrompt,
        userMessage,
        model,
        provider,
        temperature,
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response
    const result = await callLLM({
      systemPrompt,
      userMessage,
      model,
      provider,
      temperature,
    });

    return NextResponse.json({
      prompt: result.text,
      model: model || process.env.DEFAULT_MODEL || "openai/gpt-4o",
      provider: provider || process.env.DEFAULT_PROVIDER || "openrouter",
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      estimatedCost: estimateCost(model || "openai/gpt-4o", result.tokensInput, result.tokensOutput),
    });
  } catch (error: any) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate prompt" },
      { status: 500 }
    );
  }
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number | null {
  // Rough cost estimates per 1K tokens
  const costs: Record<string, { input: number; output: number }> = {
    "openai/gpt-4o": { input: 0.0025, output: 0.01 },
    "openai/gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "anthropic/claude-sonnet-4": { input: 0.003, output: 0.015 },
    "anthropic/claude-3.5-sonnet": { input: 0.003, output: 0.015 },
    "google/gemini-2.0-flash-001": { input: 0.0001, output: 0.0004 },
    "deepseek/deepseek-chat": { input: 0.00014, output: 0.00028 },
  };

  const modelCost = costs[model];
  if (!modelCost) return null;

  return (inputTokens / 1000) * modelCost.input + (outputTokens / 1000) * modelCost.output;
}