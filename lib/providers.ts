import { ModelInfo, Provider, ProviderConfig } from "./types";

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  openrouter: {
    name: "OpenRouter",
    apiBase: "https://openrouter.ai/api/v1",
    protocol: "openai",
    models: [
      {
        id: "openai/gpt-4o",
        displayName: "GPT-4o",
        description: "Most capable flagship model",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0.0025,
        costOutput: 0.01,
      },
      {
        id: "openai/gpt-4o-mini",
        displayName: "GPT-4o Mini",
        description: "Fast and affordable",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0.00015,
        costOutput: 0.0006,
      },
      {
        id: "anthropic/claude-sonnet-4",
        displayName: "Claude Sonnet 4",
        description: "Best balance of speed & intelligence",
        provider: "openrouter",
        maxTokens: 8192,
        costInput: 0.003,
        costOutput: 0.015,
      },
      {
        id: "anthropic/claude-3.5-sonnet",
        displayName: "Claude 3.5 Sonnet",
        description: "Strong all-around performance",
        provider: "openrouter",
        maxTokens: 8192,
        costInput: 0.003,
        costOutput: 0.015,
      },
      {
        id: "anthropic/claude-3-opus",
        displayName: "Claude 3 Opus",
        description: "Most capable for complex analysis",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0.015,
        costOutput: 0.075,
      },
      {
        id: "google/gemini-2.0-flash-001",
        displayName: "Gemini 2.0 Flash",
        description: "Google's latest fast model",
        provider: "openrouter",
        maxTokens: 8192,
        costInput: 0.0001,
        costOutput: 0.0004,
      },
      {
        id: "google/gemini-pro-1.5",
        displayName: "Gemini 1.5 Pro",
        description: "1M context window",
        provider: "openrouter",
        maxTokens: 8192,
        costInput: 0.00125,
        costOutput: 0.005,
      },
      {
        id: "meta-llama/llama-3.1-405b-instruct",
        displayName: "Llama 3.1 405B",
        description: "Largest open model",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0.003,
        costOutput: 0.003,
      },
      {
        id: "meta-llama/llama-3.1-70b-instruct",
        displayName: "Llama 3.1 70B",
        description: "Great mid-size open model",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0.0008,
        costOutput: 0.0008,
      },
      {
        id: "mistralai/mistral-large",
        displayName: "Mistral Large",
        description: "Mistral's flagship",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0.002,
        costOutput: 0.006,
      },
      {
        id: "deepseek/deepseek-chat",
        displayName: "DeepSeek V3",
        description: "Strong at coding tasks",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0.00014,
        costOutput: 0.00028,
      },
      {
        id: "deepseek/deepseek-r1",
        displayName: "DeepSeek R1",
        description: "Reasoning model for logic",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0.00055,
        costOutput: 0.0022,
      },
      {
        id: "qwen/qwen-2.5-72b-instruct",
        displayName: "Qwen 2.5 72B",
        description: "Strong multilingual model",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0.0006,
        costOutput: 0.0006,
      },
      {
        id: "openrouter/auto",
        displayName: "Auto (Best Available)",
        description: "OpenRouter picks the best model",
        provider: "openrouter",
        maxTokens: 4096,
        costInput: 0,
        costOutput: 0,
      },
    ],
  },
  openai: {
    name: "OpenAI",
    apiBase: "https://api.openai.com/v1",
    protocol: "openai",
    models: [
      {
        id: "gpt-4o",
        displayName: "GPT-4o",
        description: "Most capable flagship",
        provider: "openai",
        maxTokens: 4096,
        costInput: 0.0025,
        costOutput: 0.01,
      },
      {
        id: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
        description: "Fast and affordable",
        provider: "openai",
        maxTokens: 4096,
        costInput: 0.00015,
        costOutput: 0.0006,
      },
      {
        id: "gpt-4-turbo",
        displayName: "GPT-4 Turbo",
        description: "Previous flagship",
        provider: "openai",
        maxTokens: 4096,
        costInput: 0.01,
        costOutput: 0.03,
      },
    ],
  },
  anthropic: {
    name: "Anthropic",
    apiBase: "https://api.anthropic.com/v1",
    protocol: "anthropic",
    models: [
      {
        id: "claude-sonnet-4-20250514",
        displayName: "Claude Sonnet 4",
        description: "Latest and most capable",
        provider: "anthropic",
        maxTokens: 8192,
        costInput: 0.003,
        costOutput: 0.015,
      },
      {
        id: "claude-3-5-sonnet-20241022",
        displayName: "Claude 3.5 Sonnet",
        description: "Fast and intelligent",
        provider: "anthropic",
        maxTokens: 8192,
        costInput: 0.003,
        costOutput: 0.015,
      },
      {
        id: "claude-3-opus-20240229",
        displayName: "Claude 3 Opus",
        description: "Complex analysis",
        provider: "anthropic",
        maxTokens: 4096,
        costInput: 0.015,
        costOutput: 0.075,
      },
    ],
  },
  google: {
    name: "Google",
    apiBase: "https://generativelanguage.googleapis.com/v1beta",
    protocol: "google",
    models: [
      {
        id: "gemini-1.5-pro",
        displayName: "Gemini 1.5 Pro",
        description: "1M token context",
        provider: "google",
        maxTokens: 8192,
        costInput: 0.00125,
        costOutput: 0.005,
      },
      {
        id: "gemini-2.0-flash",
        displayName: "Gemini 2.0 Flash",
        description: "Fast and capable",
        provider: "google",
        maxTokens: 8192,
        costInput: 0.0001,
        costOutput: 0.0004,
      },
    ],
  },
  custom: {
    name: "Custom",
    apiBase: "",
    protocol: "openai",
    models: [],
  },
};

export function getAllModels(): ModelInfo[] {
  const models: ModelInfo[] = [];
  for (const provider of Object.values(PROVIDERS)) {
    models.push(...provider.models);
  }
  return models;
}

export function getModelById(id: string): ModelInfo | undefined {
  return getAllModels().find((m) => m.id === id);
}

export function getAvailableProviders(): Provider[] {
  const available: Provider[] = [];
  if (process.env.OPENROUTER_API_KEY) available.push("openrouter");
  if (process.env.OPENAI_API_KEY) available.push("openai");
  if (process.env.ANTHROPIC_API_KEY) available.push("anthropic");
  if (process.env.GOOGLE_API_KEY) available.push("google");
  if (process.env.CUSTOM_API_BASE) available.push("custom");
  return available;
}