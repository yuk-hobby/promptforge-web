import { NextResponse } from "next/server";
import { PROVIDERS } from "@/lib/providers";
import { Provider } from "@/lib/types";

export const runtime = "edge";

export async function GET() {
  // Return available models based on configured API keys
  const available: Record<string, any> = {};

  const providerKeys: Record<Provider, string | undefined> = {
    openrouter: process.env.OPENROUTER_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    custom: process.env.CUSTOM_API_BASE,
  };

  for (const [providerId, config] of Object.entries(PROVIDERS)) {
    const key = providerKeys[providerId as Provider];
    if (key) {
      available[providerId] = {
        name: config.name,
        models: config.models.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          description: m.description,
          costInput: m.costInput,
          costOutput: m.costOutput,
        })),
      };
    }
  }

  return NextResponse.json({
    providers: available,
    defaultProvider: process.env.DEFAULT_PROVIDER || "openrouter",
    defaultModel: process.env.DEFAULT_MODEL || "openai/gpt-4o",
  });
}