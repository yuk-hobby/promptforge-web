export type Provider = "openrouter" | "openai" | "anthropic" | "google" | "custom";

export interface ModelInfo {
  id: string;
  displayName: string;
  description: string;
  provider: Provider;
  maxTokens: number;
  costInput: number;  // per 1K tokens
  costOutput: number; // per 1K tokens
}

export interface ProviderConfig {
  name: string;
  apiBase: string;
  protocol: "openai" | "anthropic" | "google";
  models: ModelInfo[];
}

export interface GenerateRequest {
  intent: string;
  followUpQA?: Record<string, string>;
  context?: string;
  model?: string;
  provider?: Provider;
  temperature?: number;
}

export interface RefineRequest {
  previousPrompt: string;
  feedback: string;
  model?: string;
  provider?: Provider;
}

export interface FollowUpRequest {
  intent: string;
  model?: string;
  provider?: Provider;
}

export interface GenerateResponse {
  prompt: string;
  model: string;
  provider: string;
  tokensInput: number;
  tokensOutput: number;
  estimatedCost: number | null;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  intent: string;
  generatedPrompt: string;
  model: string;
  provider: string;
  refinementCount: number;
}

export interface AppState {
  step: "intent" | "followup" | "context" | "generating" | "result";
  intent: string;
  followUpQuestions: string[];
  followUpAnswers: Record<string, string>;
  context: string;
  generatedPrompt: string;
  selectedModel: string;
  selectedProvider: Provider;
  isStreaming: boolean;
  error: string | null;
}