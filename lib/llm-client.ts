import { Provider } from "./types";
import { PROVIDERS } from "./providers";

interface LLMCallOptions {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  provider?: Provider;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface LLMResponse {
  text: string;
  tokensInput: number;
  tokensOutput: number;
}

function getApiKey(provider: Provider): string {
  switch (provider) {
    case "openrouter":
      return process.env.OPENROUTER_API_KEY || "";
    case "openai":
      return process.env.OPENAI_API_KEY || "";
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || "";
    case "google":
      return process.env.GOOGLE_API_KEY || "";
    case "custom":
      return process.env.CUSTOM_API_KEY || "not-needed";
    default:
      return "";
  }
}

function getApiBase(provider: Provider): string {
  switch (provider) {
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "openai":
      return "https://api.openai.com/v1";
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "google":
      return "https://generativelanguage.googleapis.com/v1beta";
    case "custom":
      return process.env.CUSTOM_API_BASE || "http://localhost:1234/v1";
    default:
      return "";
  }
}

function resolveProvider(model?: string, provider?: Provider): Provider {
  if (provider) return provider;
  if (!model) return (process.env.DEFAULT_PROVIDER as Provider) || "openrouter";

  // Auto-detect from model name
  if (model.includes("/")) return "openrouter";
  if (model.startsWith("gpt") || model.startsWith("o1")) return "openai";
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gemini")) return "google";

  return "openrouter";
}

function resolveModel(model?: string): string {
  return model || process.env.DEFAULT_MODEL || "openai/gpt-4o";
}

export async function callLLM(options: LLMCallOptions): Promise<LLMResponse> {
  const provider = resolveProvider(options.model, options.provider);
  const model = resolveModel(options.model);
  const apiKey = getApiKey(provider);
  const apiBase = getApiBase(provider);
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 4096;

  if (!apiKey && provider !== "custom") {
    throw new Error(`No API key configured for ${provider}. Set the environment variable.`);
  }

  const protocol = PROVIDERS[provider]?.protocol || "openai";

  switch (protocol) {
    case "openai":
      return callOpenAI(apiBase, apiKey, model, options.systemPrompt, options.userMessage, temperature, maxTokens, provider);
    case "anthropic":
      return callAnthropic(apiBase, apiKey, model, options.systemPrompt, options.userMessage, temperature, maxTokens);
    case "google":
      return callGoogle(apiBase, apiKey, model, options.systemPrompt, options.userMessage, temperature, maxTokens);
    default:
      return callOpenAI(apiBase, apiKey, model, options.systemPrompt, options.userMessage, temperature, maxTokens, provider);
  }
}

async function callOpenAI(
  apiBase: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  maxTokens: number,
  provider: Provider
): Promise<LLMResponse> {
  const url = `${apiBase}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter-specific headers
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://promptforge.vercel.app";
    headers["X-Title"] = "PromptForge";
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const msg = error?.error?.message || error?.message || `HTTP ${response.status}`;
    throw new Error(`${PROVIDERS[provider]?.name || provider} error: ${msg}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  const usage = data.usage || {};

  return {
    text,
    tokensInput: usage.prompt_tokens || 0,
    tokensOutput: usage.completion_tokens || 0,
  };
}

async function callAnthropic(
  apiBase: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  const url = `${apiBase}/messages`;

  const response = await fetch(url, {
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
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Anthropic error: ${error?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.content[0].text,
    tokensInput: data.usage?.input_tokens || 0,
    tokensOutput: data.usage?.output_tokens || 0,
  };
}

async function callGoogle(
  apiBase: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  const url = `${apiBase}/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Google error: ${error?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  const usage = data.usageMetadata || {};

  return {
    text,
    tokensInput: usage.promptTokenCount || 0,
    tokensOutput: usage.candidatesTokenCount || 0,
  };
}

// Streaming version for real-time output
export async function callLLMStream(options: LLMCallOptions): Promise<ReadableStream> {
  const provider = resolveProvider(options.model, options.provider);
  const model = resolveModel(options.model);
  const apiKey = getApiKey(provider);
  const apiBase = getApiBase(provider);
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 4096;

  if (!apiKey && provider !== "custom") {
    throw new Error(`No API key for ${provider}`);
  }

  // For streaming, use OpenAI protocol (works with OpenRouter too)
  const url = `${apiBase}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://promptforge.vercel.app";
    headers["X-Title"] = "PromptForge";
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API error: ${error?.error?.message || response.statusText}`);
  }

  return response.body!;
}