import { NextResponse } from "next/server";

export async function GET() {
  const models = [
    { id: "openai/gpt-4o", name: "GPT-4o (Recommended)" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (Fast)" },
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "anthropic/claude-3-opus", name: "Claude 3 Opus" },
    { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
    { id: "google/gemini-pro-1.5", name: "Gemini 1.5 Pro" },
    { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B" },
    { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B" },
    { id: "mistralai/mistral-large", name: "Mistral Large" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3" },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (Reasoning)" },
    { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B" },
    { id: "openrouter/auto", name: "Auto (Best Available)" },
  ];

  return NextResponse.json({
    models,
    defaultModel: process.env.DEFAULT_MODEL || "openai/gpt-4o",
  });
}