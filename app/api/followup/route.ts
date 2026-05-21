import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm-client";
import { FOLLOWUP_META_PROMPT } from "@/lib/meta-prompts";
import { FollowUpRequest } from "@/lib/types";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body: FollowUpRequest = await request.json();
    const { intent, model, provider } = body;

    if (!intent || intent.trim().length < 5) {
      return NextResponse.json({ questions: [] });
    }

    const systemPrompt = FOLLOWUP_META_PROMPT.replace("{intent}", intent);

    const result = await callLLM({
      systemPrompt,
      userMessage: intent,
      model,
      provider,
      temperature: 0.5,
      maxTokens: 500,
    });

    // Parse JSON array from response
    let questions: string[] = [];
    const text = result.text.trim();

    try {
      // Try direct JSON parse
      let jsonText = text;
      if (text.includes("```")) {
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]") + 1;
        if (start >= 0 && end > start) {
          jsonText = text.substring(start, end);
        }
      }
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        questions = parsed.filter((q) => typeof q === "string").slice(0, 4);
      }
    } catch {
      // Fallback: extract lines with question marks
      questions = text
        .split("\n")
        .filter((l) => l.includes("?"))
        .map((l) => l.replace(/^[\d\-\*\.\)]+\s*/, "").trim())
        .filter((l) => l.length > 10)
        .slice(0, 3);
    }

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error("Follow-up error:", error);
    // Return heuristic questions as fallback
    return NextResponse.json({
      questions: [
        "Who is the target audience?",
        "Any preference for tone or style?",
        "How should the output be structured?",
      ],
    });
  }
}