import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm-client";
import { REFINE_META_PROMPT, OPTIMIZE_META_PROMPT } from "@/lib/meta-prompts";
import { RefineRequest } from "@/lib/types";

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body: RefineRequest = await request.json();
    const { previousPrompt, feedback, model, provider } = body;

    if (!previousPrompt) {
      return NextResponse.json(
        { error: "No prompt to refine" },
        { status: 400 }
      );
    }

    let systemPrompt: string;

    if (feedback && feedback.trim()) {
      // Specific refinement
      systemPrompt = REFINE_META_PROMPT
        .replace("{previousPrompt}", previousPrompt)
        .replace("{feedback}", feedback);
    } else {
      // General optimization
      systemPrompt = OPTIMIZE_META_PROMPT
        .replace("{feedbackSection}", "")
        .replace("{originalPrompt}", previousPrompt);
    }

    const result = await callLLM({
      systemPrompt,
      userMessage: feedback || "Optimize this prompt for maximum effectiveness.",
      model,
      provider,
    });

    return NextResponse.json({
      prompt: result.text,
      model: model || process.env.DEFAULT_MODEL || "openai/gpt-4o",
      provider: provider || process.env.DEFAULT_PROVIDER || "openrouter",
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    });
  } catch (error: any) {
    console.error("Refine error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to refine prompt" },
      { status: 500 }
    );
  }
}