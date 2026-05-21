"use client";

import { useState, useCallback, useEffect } from "react";

type Step = "intent" | "followup" | "context" | "generating" | "result";
type Provider = "openrouter" | "openai" | "anthropic" | "google";

interface HistoryEntry {
  id: string;
  timestamp: string;
  intent: string;
  prompt: string;
  model: string;
}

interface ModelOption {
  id: string;
  displayName: string;
  description: string;
  costInput: number;
  costOutput: number;
}

interface ProviderData {
  name: string;
  models: ModelOption[];
}

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
  const [tokenInfo, setTokenInfo] = useState<{
    input: number;
    output: number;
    cost: number | null;
  } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [providers, setProviders] = useState<Record<string, ProviderData>>({});
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showContextInput, setShowContextInput] = useState(false);

  // Load available models
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (data.providers) setProviders(data.providers);
        if (data.defaultModel) setSelectedModel(data.defaultModel);
        if (data.defaultProvider) setSelectedProvider(data.defaultProvider as Provider);
      })
      .catch(() => {});
  }, []);

  // Load history
  useEffect(() => {
    try {
      const saved = localStorage.getItem("promptforge_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const saveHistory = useCallback(
    (prompt: string) => {
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        intent,
        prompt,
        model: selectedModel,
      };
      const updated = [entry, ...history].slice(0, 50);
      setHistory(updated);
      localStorage.setItem("promptforge_history", JSON.stringify(updated));
    },
    [intent, selectedModel, history]
  );

  // Submit intent → get follow-ups
  const handleIntentSubmit = async () => {
    if (intent.trim().length < 10) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, model: selectedModel, provider: selectedProvider }),
      });
      const data = await res.json();
      if (data.questions?.length > 0) {
        setFollowUpQuestions(data.questions);
        setStep("followup");
      } else {
        setStep("context");
      }
    } catch {
      setStep("context");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit follow-ups
  const handleFollowUpSubmit = () => {
    setStep("context");
  };

  // Generate prompt
  const handleGenerate = async (userContext: string) => {
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

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Generation failed");

      setGeneratedPrompt(data.prompt);
      setTokenInfo({ input: data.tokensInput, output: data.tokensOutput, cost: data.estimatedCost });
      saveHistory(data.prompt);
      setStep("result");
    } catch (err: any) {
      setError(err.message);
      setStep("context");
    } finally {
      setIsLoading(false);
    }
  };

  // Refine
  const handleRefine = async () => {
    if (!refineFeedback.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousPrompt: generatedPrompt,
          feedback: refineFeedback,
          model: selectedModel,
          provider: selectedProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refinement failed");

      setGeneratedPrompt(data.prompt);
      setRefineFeedback("");
      setShowRefine(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate
  const handleRegenerate = async () => {
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
          temperature: 0.9,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setGeneratedPrompt(data.prompt);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
    } catch {
      const t = document.createElement("textarea");
      t.value = generatedPrompt;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download
  const handleDownload = () => {
    const blob = new Blob([generatedPrompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset
  const handleReset = () => {
    setStep("intent");
    setIntent("");
    setFollowUpQuestions([]);
    setFollowUpAnswers({});
    setContext("");
    setGeneratedPrompt("");
    setError(null);
    setTokenInfo(null);
    setShowRefine(false);
  };

  // Quality score
  const getQualityScore = () => {
    if (!generatedPrompt) return { score: 0, label: "N/A", tips: [] };
    let score = 0;
    const tips: string[] = [];
    const pl = generatedPrompt.toLowerCase();

    if (generatedPrompt.length > 500) score += 25;
    else if (generatedPrompt.length > 200) score += 15;
    else score += 5;

    if (["act as", "you are", "as a"].some((p) => pl.includes(p))) score += 15;
    else tips.push("Add a role/persona for better results");

    if (["format", "structure", "output"].some((p) => pl.includes(p))) score += 15;
    else tips.push("Specify output format for consistency");

    if (["do not", "avoid", "must", "don't"].some((p) => pl.includes(p))) score += 10;
    else tips.push("Add constraints to reduce unwanted output");

    if (generatedPrompt.includes("1.") || generatedPrompt.split("\n").length > 5) score += 10;
    if (context) score += 10;
    if (Object.keys(followUpAnswers).length > 0) score += 10;
    if (["audience", "tone", "style"].some((p) => pl.includes(p))) score += 5;

    score = Math.min(score, 100);
    let label = "Weak";
    if (score >= 86) label = "Excellent";
    else if (score >= 71) label = "Strong";
    else if (score >= 51) label = "Good";
    else if (score >= 31) label = "Fair";

    return { score, label, tips: tips.slice(0, 2) };
  };

  const currentModelDisplay =
    Object.values(providers)
      .flatMap((p) => p.models)
      .find((m) => m.id === selectedModel)?.displayName || selectedModel;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Banner */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            🔨 PromptForge
          </h1>
          <p className="text-gray-400 mt-1">AI-Powered Prompt Engineer</p>
          <p className="text-gray-500 text-sm mt-0.5">
            Describe what you need — I&apos;ll craft the perfect prompt.
          </p>
        </div>

        {/* Model Selector + History */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-all"
            >
              <span>🤖</span>
              <span className="max-w-[160px] truncate">{currentModelDisplay}</span>
              <svg
                className={`w-3 h-3 transition-transform ${showModelPicker ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showModelPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
                <div className="absolute top-full left-0 mt-2 w-80 max-h-80 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 animate-fade-in">
                  {Object.entries(providers).map(([pid, pdata]) => (
                    <div key={pid}>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-800/50 sticky top-0">
                        {pdata.name}
                      </div>
                      {pdata.models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m.id);
                            setSelectedProvider(pid as Provider);
                            setShowModelPicker(false);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors ${
                            selectedModel === m.id ? "bg-brand-900/30 border-l-2 border-brand-500" : ""
                          }`}
                        >
                          <div className="text-sm text-gray-200">{m.displayName}</div>
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>{m.description}</span>
                            {m.costInput > 0 && (
                              <span className="text-gray-600">${m.costInput.toFixed(4)}/1K</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-gray-400 hover:text-indigo-400 transition-colors"
          >
            📜 History
          </button>
        </div>

        {/* History */}
        {showHistory && history.length > 0 && (
          <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
              <span className="text-sm text-gray-300 font-medium">Recent Prompts</span>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">
                ✕
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-800">
              {history.slice(0, 8).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setGeneratedPrompt(entry.prompt);
                    setIntent(entry.intent);
                    setStep("result");
                    setShowHistory(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-800/50 transition-colors"
                >
                  <p className="text-sm text-gray-300 truncate">{entry.intent}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleDateString()} · {entry.model}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg animate-fade-in">
            <p className="text-red-300 text-sm">❌ {error}</p>
          </div>
        )}

        {/* ═══ STEP: INTENT ═══ */}
        {step === "intent" && (
          <div className="animate-slide-up">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 sm:p-6">
              <label className="block text-lg font-semibold text-white mb-1">
                What do you need an AI to help you with?
              </label>
              <p className="text-gray-400 text-sm mb-4">
                Describe it naturally — rough ideas are fine. The AI will craft an optimized prompt.
              </p>
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleIntentSubmit();
                }}
                placeholder="e.g., I need to write a blog post about kubernetes for beginners..."
                className="w-full h-36 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                autoFocus
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-500">
                  {intent.length} chars {intent.length > 0 && intent.length < 10 ? "(min 10)" : ""}
                </span>
                <button
                  onClick={handleIntentSubmit}
                  disabled={intent.trim().length < 10 || isLoading}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  {isLoading ? "Thinking..." : "Craft Prompt →"}
                </button>
              </div>

              {/* Examples */}
              <div className="mt-5 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Quick examples:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Write a Python function that validates emails",
                    "Summarize meeting notes into action items",
                    "Create a marketing email for a product launch",
                    "Analyze customer reviews and categorize feedback",
                  ].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setIntent(ex)}
                      className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-full transition-colors"
                    >
                      {ex.length > 42 ? ex.slice(0, 42) + "..." : ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP: FOLLOW-UP ═══ */}
        {step === "followup" && (
          <div className="animate-slide-up">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <span>🤔</span>
                <h2 className="text-lg font-semibold text-white">Quick questions for a better prompt</h2>
              </div>
              <p className="text-gray-400 text-sm mb-5">Skip any that don&apos;t apply.</p>

              <div className="space-y-4">
                {followUpQuestions.map((q, i) => (
                  <div key={i}>
                    <label className="block text-sm text-gray-300 mb-1">
                      {i + 1}. {q}
                    </label>
                    <input
                      type="text"
                      value={followUpAnswers[q] || ""}
                      onChange={(e) => setFollowUpAnswers((p) => ({ ...p, [q]: e.target.value }))}
                      placeholder="Type answer or leave blank"
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-5">
                <button
                  onClick={() => setStep("context")}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Skip all →
                </button>
                <button
                  onClick={handleFollowUpSubmit}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-all text-sm"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP: CONTEXT ═══ */}
        {step === "context" && (
          <div className="animate-slide-up">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Reference material?</h2>
              <p className="text-gray-400 text-sm mb-5">
                Optional: paste text, code, or data the AI should consider.
              </p>

              {!showContextInput ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowContextInput(true)}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm transition-all"
                  >
                    📝 Paste context
                  </button>
                  <button
                    onClick={() => handleGenerate("")}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Skip → Generate
                  </button>
                </div>
              ) : (
                <div>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Paste reference material..."
                    className="w-full h-28 bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-gray-100 placeholder-gray-500 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => {
                        setShowContextInput(false);
                        setContext("");
                      }}
                      className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleGenerate(context)}
                      disabled={isLoading}
                      className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      {isLoading && (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      Generate →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP: GENERATING ═══ */}
        {step === "generating" && (
          <div className="flex flex-col items-center py-16 animate-fade-in">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-300 text-lg">🔨 Crafting your prompt...</p>
            <p className="text-gray-500 text-sm mt-1">Using {currentModelDisplay}</p>
          </div>
        )}

        {/* ═══ STEP: RESULT ═══ */}
        {step === "result" && generatedPrompt && (
          <div className="space-y-4 animate-slide-up">
            {/* Prompt box */}
            <div className="bg-gray-900/50 border border-green-900/40 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-green-900/20 border-b border-green-900/30">
                <span className="text-sm font-medium text-green-300">✨ Generated Prompt</span>
                <span className="text-xs text-gray-500">{currentModelDisplay}</span>
              </div>
              <div className="p-4 sm:p-5">
                <pre className="whitespace-pre-wrap text-gray-200 text-sm leading-relaxed font-sans">
                  {generatedPrompt}
                </pre>
              </div>
            </div>

            {/* Quality */}
            {(() => {
              const q = getQualityScore();
              const color =
                q.score >= 71 ? "bg-green-500" : q.score >= 51 ? "bg-yellow-500" : "bg-red-500";
              const textColor =
                q.score >= 71
                  ? "text-green-400"
                  : q.score >= 51
                  ? "text-yellow-400"
                  : "text-red-400";
              return (
                <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-400">Prompt Strength</span>
                    <span className={`text-sm font-semibold ${textColor}`}>
                      {q.score}/100 — {q.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${color}`}
                      style={{ width: `${q.score}%` }}
                    />
                  </div>
                  {q.tips.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {q.tips.map((t, i) => (
                        <p key={i} className="text-xs text-gray-500">
                          💡 {t}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Token info */}
            {tokenInfo && (tokenInfo.input > 0 || tokenInfo.output > 0) && (
              <p className="text-xs text-gray-500 text-center">
                ~{tokenInfo.input} in / ~{tokenInfo.output} out
                {tokenInfo.cost != null && ` · $${tokenInfo.cost.toFixed(4)}`} · {selectedModel}
              </p>
            )}

            {/* Buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  copied ? "bg-green-600 text-white" : "bg-brand-600 hover:bg-brand-500 text-white"
                }`}
              >
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
              <button
                onClick={() => setShowRefine(!showRefine)}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-all"
              >
                📝 Refine
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-all"
              >
                🔄 Regenerate
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-all"
              >
                💾 Download
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-all"
              >
                ✨ New
              </button>
            </div>

            {/* Refine panel */}
            {showRefine && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 animate-slide-up">
                <h3 className="text-sm font-medium text-gray-300 mb-2">What to change?</h3>
                <input
                  type="text"
                  value={refineFeedback}
                  onChange={(e) => setRefineFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRefine();
                  }}
                  placeholder="e.g., make it more specific about output format..."
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "More specific format",
                    "Add constraints",
                    "Make shorter",
                    "More professional tone",
                    "Add examples",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRefineFeedback(s)}
                      className="text-[11px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-full transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleRefine}
                  disabled={!refineFeedback.trim() || isLoading}
                  className="w-full mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {isLoading ? "Refining..." : "Apply"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-600">
          PromptForge v2.1 · API keys are server-side only
        </div>
      </div>
    </main>
  );
}