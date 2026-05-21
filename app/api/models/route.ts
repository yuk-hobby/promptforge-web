import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODELS_REGISTRY: Record<string, { name: string; models: any[] }> = {
  openrouter: {
    name: "OpenRouter",
    models: [
      { id: "openai/gpt-4o", displayName: "GPT-4o", description: "Best flagship model", costInput: 0.0025, costOutput: 0.01 },
      { id: "openai/gpt-4o-mini", displayName: "GPT-4o Mini", description: "Fast & affordable", costInput: 0.00015, costOutput: 0.0006 },
      { id: "anthropic/claude-sonnet-4", displayName: "Claude Sonnet 4", description: "Latest Anthropic model", costInput: 0.003, costOutput: 0.015 },
      { id: "anthropic/claude-3.5-sonnet", displayName: "Claude 3.5 Sonnet", description: "Fast & intelligent", costInput: 0.003, costOutput: 0.015 },
      { id: "anthropic/claude-3-opus", displayName: "Claude 3 Opus", description: "Complex analysis", costInput: 0.015, costOutput: 0.075 },
      { id: "google/gemini-2.0-flash-001", displayName: "Gemini 2.0 Flash", description: "Google fast model", costInput: 0.0001, costOutput: 0.0004 },
      { id: "google/gemini-pro-1.5", displayName: "Gemini 1.5 Pro", description: "1M context", costInput: 0.00125, costOutput: 0.005 },
      { id: "meta-llama/llama-3.1-405b-instruct", displayName: "Llama 3.1 405B", description: "Largest open model", costInput: 0.003, costOutput: 0.003 },
      { id: "meta-llama/llama-3.1-70b-instruct", displayName: "Llama 3.1 70B", description: "Strong open model", costInput: 0.0008, costOutput: 0.0008 },
      { id: "mistralai/mistral-large", displayName: "Mistral Large", description: "Mistral flagship", costInput: 0.002, costOutput: 0.006 },
      { id: "deepseek/deepseek-chat", displayName: "DeepSeek V3", description: "Great at coding", costInput: 0.00014, costOutput: 0.00028 },
      { id: "deepseek/deepseek-r1", displayName: "DeepSeek R1", description: "Reasoning model", costInput: 0.00055, costOutput: 0.0022 },
      { id: "openrouter/auto", displayName: "Auto (Best Available)", description: "OpenRouter picks best", costInput: 0, costOutput: 0 },
    ],
  },
  openai: {
    name: "OpenAI (Direct)",
    models: [
      { id: "gpt-4o", displayName: "GPT-4o", description: "Flagship", costInput: 0.0025, costOutput: 0.01 },
      { id: "gpt-4o-mini", displayName: "GPT-4o Mini", description: "Fast", costInput: 0.00015, costOutput: 0.0006 },
    ],
  },
  anthropic: {
    name: "Anthropic (Direct)",
    models: [
      { id: "claude-sonnet-4-20250514", displayName: "Claude Sonnet 4", description: "Latest", costInput: 0.003, costOutput: 0.015 },
      { id: "claude-3-5-sonnet-20241022", displayName: "Claude 3.5 Sonnet", description: "Fast", costInput: 0.003, costOutput: 0.015 },
    ],
  },
};

export async function GET() {
  const available: Record<string, any> = {};

  if (process.env.OPENROUTER_API_KEY) available["openrouter"] = MODELS_REGISTRY["openrouter"];
  if (process.env.OPENAI_API_KEY) available["openai"] = MODELS_REGISTRY["openai"];
  if (process.env.ANTHROPIC_API_KEY) available["anthropic"] = MODELS_REGISTRY["anthropic"];

  // If nothing configured, show OpenRouter as option anyway (will fail gracefully)
  if (Object.keys(available).length === 0) {
    available["openrouter"] = MODELS_REGISTRY["openrouter"];
  }

  return NextResponse.json({
    providers: available,
    defaultProvider: process.env.DEFAULT_PROVIDER || "openrouter",
    defaultModel: process.env.DEFAULT_MODEL || "openai/gpt-4o",
  });
}