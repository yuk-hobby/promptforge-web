"use client";

import { useState, useCallback, useEffect } from "react";
import { Banner } from "@/components/Banner";
import { IntentInput } from "@/components/IntentInput";
import { FollowUpQuestions } from "@/components/FollowUpQuestions";
import { ContextInput } from "@/components/ContextInput";
import { GeneratedPrompt } from "@/components/GeneratedPrompt";
import { ModelSelector } from "@/components/ModelSelector";
import { HistoryPanel } from "@/components/HistoryPanel";
import { HistoryEntry, Provider } from "@/lib/types";

type Step = "intent" | "followup" | "context" | "generating" | "result";

export default function Home() {
  const [step, setStep] = useState<Step>("intent");
  const [intent, setIntent] = useState("");
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [context, setContext] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o");
  const [selectedProvider, setSelectedProvider] = useState<Provider>("openrouter");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ input: number; output: number; cost: number | null } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("promptforge_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback(
    (prompt: string) => {
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        intent,
        generatedPrompt: prompt,
        model: selectedModel,
        provider: selectedProvider,
        refinementCount: 0,
      };
      const updated = [entry, ...history].slice(0, 50);
      setHistory(updated);
      localStorage.setItem("promptforge_history", JSON.stringify(updated));
    },
    [intent, selectedModel, selectedProvider, history]
  );

  // Phase 1: Submit intent → get follow-up questions
  const handleIntentSubmit = useCallback(
    async (userIntent: string) => {
      setIntent(userIntent);
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: userIntent,
            model: selectedModel,
            provider: selectedProvider,
          }),
        });

        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setFollowUpQuestions(data.questions);
          setStep("followup");
        } else {
          // Skip follow-ups, go to context
          setStep("context");
        }
      } catch (err: any) {
        // Fallback: skip to context on error
        setStep("context");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModel, selectedProvider]
  );

  // Phase 2: Submit follow-up answers
  const handleFollowUpSubmit = useCallback((answers: Record<string, string>) => {
    setFollowUpAnswers(answers);
    setStep("context");
  }, []);

  // Phase 3: Submit context → generate prompt
  const handleContextSubmit = useCallback(
    async (userContext: string) => {
      setContext(userContext);
      setStep("generating");
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            followUpQA: followUpAnswers,
            context: userContext,
            model: selectedModel,
            provider: selectedProvider,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Generation failed");
        }

        const data = await res.json();
        setGeneratedPrompt(data.prompt);
        setTokenInfo({
          input: data.tokensInput,
          output: data.tokensOutput,
          cost: data.estimatedCost,
        });
        saveToHistory(data.prompt);
        setStep("result");
      } catch (err: any) {
        setError(err.message);
        setStep("intent");
      } finally {
        setIsLoading(false);
      }
    },
    [intent, followUpAnswers, selectedModel, selectedProvider, saveToHistory]
  );

  // Refine the generated prompt
  const handleRefine = useCallback(
    async (feedback: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previousPrompt: generatedPrompt,
            feedback,
            model: selectedModel,
            provider: selectedProvider,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Refinement failed");
        }

        const data = await res.json();
        setGeneratedPrompt(data.prompt);
        setTokenInfo({
          input: data.tokensInput,
          output: data.tokensOutput,
          cost: null,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [generatedPrompt, selectedModel, selectedProvider]
  );

  // Regenerate
  const handleRegenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          followUpQA: followUpAnswers,
          context,
          model: selectedModel,
          provider: selectedProvider,
          temperature: 0.9, // Higher for variety
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Regeneration failed");
      }

      const data = await res.json();
      setGeneratedPrompt(data.prompt);
      setTokenInfo({
        input: data.tokensInput,
        output: data.tokensOutput,
        cost: data.estimatedCost,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [intent, followUpAnswers, context, selectedModel, selectedProvider]);

  // Start over
  const handleReset = useCallback(() => {
    setStep("intent");
    setIntent("");
    setFollowUpQuestions([]);
    setFollowUpAnswers({});
    setContext("");
    setGeneratedPrompt("");
    setError(null);
    setTokenInfo(null);
  }, []);

  // Load from history
  const handleLoadHistory = useCallback((entry: HistoryEntry) => {
    setGeneratedPrompt(entry.generatedPrompt);
    setIntent(entry.intent);
    setStep("result");
    setShowHistory(false);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <Banner />

        {/* Model Selector */}
        <div className="mb-6 flex items-center justify-between">
          <ModelSelector
            selectedModel={selectedModel}
            selectedProvider={selectedProvider}
            onModelChange={setSelectedModel}
            onProviderChange={setSelectedProvider}
          />
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-gray-400 hover:text-brand-400 transition-colors"
          >
            {showHistory ? "Hide History" : "📜 History"}
          </button>
        </div>

        {/* History Panel */}
        {showHistory && (
          <HistoryPanel history={history} onLoad={handleLoadHistory} onClose={() => setShowHistory(false)} />
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg animate-fade-in">
            <p className="text-red-300 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Step: Intent Input */}
        {step === "intent" && (
          <IntentInput onSubmit={handleIntentSubmit} isLoading={isLoading} />
        )}

        {/* Step: Follow-up Questions */}
        {step === "followup" && (
          <FollowUpQuestions
            questions={followUpQuestions}
            onSubmit={handleFollowUpSubmit}
            onSkip={() => setStep("context")}
          />
        )}

        {/* Step: Context Input */}
        {step === "context" && (
          <ContextInput onSubmit={handleContextSubmit} isLoading={isLoading} />
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-300 text-lg">🔨 Crafting your prompt...</p>
            <p className="text-gray-500 text-sm mt-2">Using {selectedModel}</p>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && (
          <GeneratedPrompt
            prompt={generatedPrompt}
            tokenInfo={tokenInfo}
            model={selectedModel}
            provider={selectedProvider}
            hasContext={!!context}
            hasFollowUps={Object.keys(followUpAnswers).length > 0}
            isLoading={isLoading}
            onRefine={handleRefine}
            onRegenerate={handleRegenerate}
            onReset={handleReset}
          />
        )}
      </div>
    </main>
  );
}