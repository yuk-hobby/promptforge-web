"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [step, setStep] = useState<"intent" | "followup" | "context" | "loading" | "result">("intent");
  const [intent, setIntent] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [context, setContext] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("openai/gpt-4o");
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [showCtx, setShowCtx] = useState(false);
  const [history, setHistory] = useState<{ id: string; intent: string; prompt: string; model: string; time: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        if (d.models) setModels(d.models);
        if (d.defaultModel) setModel(d.defaultModel);
      })
      .catch(() => {});
    try {
      const h = localStorage.getItem("pf_history");
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);

  function saveToHistory(p: string) {
    const entry = { id: Date.now().toString(), intent, prompt: p, model, time: new Date().toISOString() };
    const updated = [entry, ...history].slice(0, 30);
    setHistory(updated);
    localStorage.setItem("pf_history", JSON.stringify(updated));
  }

  async function submitIntent() {
    if (intent.trim().length < 10) return;
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, model }),
      });
      const d = await r.json();
      if (d.questions?.length > 0) {
        setQuestions(d.questions);
        setStep("followup");
      } else {
        setStep("context");
      }
    } catch {
      setStep("context");
    } finally {
      setLoading(false);
    }
  }

  async function generate(ctx: string) {
    setContext(ctx);
    setStep("loading");
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, followUpQA: answers, context: ctx, model }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Generation failed");
      setPrompt(d.prompt);
      setStep("result");
      saveToHistory(d.prompt);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setStep("context");
    } finally {
      setLoading(false);
    }
  }

  async function refine() {
    if (!refineText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previousPrompt: prompt, feedback: refineText, model }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Refinement failed");
      setPrompt(d.prompt);
      setRefineText("");
      setShowRefine(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, followUpQA: answers, context, model, temperature: 0.9 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setPrompt(d.prompt);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadPrompt() {
    const blob = new Blob([prompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompt_" + new Date().toISOString().slice(0, 10) + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setStep("intent");
    setIntent("");
    setQuestions([]);
    setAnswers({});
    setContext("");
    setPrompt("");
    setError("");
    setShowRefine(false);
    setShowCtx(false);
  }

  function getScore() {
    if (!prompt) return { score: 0, label: "N/A", color: "bg-gray-500", textColor: "text-gray-400" };
    let score = 0;
    const pl = prompt.toLowerCase();
    if (prompt.length > 500) score += 25;
    else if (prompt.length > 200) score += 15;
    else score += 5;
    if (["act as", "you are", "as a"].some((p) => pl.includes(p))) score += 15;
    if (["format", "structure", "output"].some((p) => pl.includes(p))) score += 15;
    if (["do not", "avoid", "must", "don't"].some((p) => pl.includes(p))) score += 10;
    if (prompt.includes("1.") || prompt.split("\n").length > 5) score += 10;
    if (context) score += 10;
    if (Object.keys(answers).length > 0) score += 10;
    score = Math.min(score, 100);
    const label = score >= 86 ? "Excellent" : score >= 71 ? "Strong" : score >= 51 ? "Good" : score >= 31 ? "Fair" : "Weak";
    const color = score >= 71 ? "bg-green-500" : score >= 51 ? "bg-yellow-500" : "bg-red-500";
    const textColor = score >= 71 ? "text-green-400" : score >= 51 ? "text-yellow-400" : "text-red-400";
    return { score, label, color, textColor };
  }

  const modelName = models.find((m) => m.id === model)?.name || model;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          PromptForge
        </h1>
        <p className="text-gray-400 mt-1">AI-Powered Prompt Engineer</p>
        <p className="text-gray-500 text-sm">Describe what you need. The AI crafts the perfect prompt.</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {models.length > 0 ? (
            models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))
          ) : (
            <option value="openai/gpt-4o">GPT-4o</option>
          )}
        </select>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm text-gray-400 hover:text-indigo-400 transition-colors"
        >
          {showHistory ? "Hide" : "History"}
        </button>
      </div>

      {showHistory && history.length > 0 && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 flex justify-between">
            <span className="text-sm text-gray-300 font-medium">Recent Prompts</span>
            <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white text-sm">
              x
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-800">
            {history.slice(0, 8).map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setPrompt(h.prompt);
                  setIntent(h.intent);
                  setStep("result");
                  setShowHistory(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-800/50 transition-colors"
              >
                <p className="text-sm text-gray-300 truncate">{h.intent}</p>
                <p className="text-xs text-gray-500">
                  {new Date(h.time).toLocaleDateString()} - {h.model}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">{error}</div>
      )}

      {step === "intent" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold mb-1">What do you need an AI to help with?</h2>
          <p className="text-gray-400 text-sm mb-4">
            Describe it roughly. The AI will craft an optimized prompt for you.
          </p>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitIntent();
            }}
            placeholder="e.g., Write a blog post about kubernetes for beginners, make it engaging..."
            className="w-full h-36 bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-500">
              {intent.length} chars {intent.length > 0 && intent.length < 10 ? "(min 10)" : ""}
            </span>
            <button
              onClick={submitIntent}
              disabled={intent.trim().length < 10 || loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-all"
            >
              {loading ? "Thinking..." : "Craft Prompt"}
            </button>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-2">Try these:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Write a Python email validator function",
                "Summarize meeting notes into action items",
                "Create a marketing email for product launch",
                "Analyze customer reviews and categorize them",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setIntent(ex)}
                  className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-full transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "followup" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Quick questions for a better prompt</h2>
          <p className="text-gray-400 text-sm mb-4">Skip any that do not apply.</p>
          {questions.map((q, i) => (
            <div key={i} className="mb-3">
              <label className="block text-sm text-gray-300 mb-1">
                {i + 1}. {q}
              </label>
              <input
                type="text"
                value={answers[q] || ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [q]: e.target.value }))}
                placeholder="Type answer or leave blank"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep("context")} className="text-gray-400 hover:text-white text-sm">
              Skip all
            </button>
            <button
              onClick={() => setStep("context")}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "context" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold mb-2">Any reference material?</h2>
          <p className="text-gray-400 text-sm mb-4">Optional: paste text, code, or data to include.</p>
          {!showCtx ? (
            <div className="flex gap-3">
              <button
                onClick={() => setShowCtx(true)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-all"
              >
                Paste context
              </button>
              <button
                onClick={() => generate("")}
                disabled={loading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-lg font-medium text-sm transition-all"
              >
                {loading ? "Generating..." : "Skip and Generate"}
              </button>
            </div>
          ) : (
            <div>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Paste reference text, code, data..."
                className="w-full h-28 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-100 placeholder-gray-500 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowCtx(false);
                    setContext("");
                  }}
                  className="px-4 py-2 text-gray-400 text-sm hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => generate(context)}
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium"
                >
                  {loading ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-300 text-lg">Crafting your prompt...</p>
          <p className="text-gray-500 text-sm mt-1">{modelName}</p>
        </div>
      )}

      {step === "result" && prompt && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-green-900/50 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-green-900/20 border-b border-green-900/30 flex justify-between items-center">
              <span className="text-sm text-green-300 font-medium">Generated Prompt</span>
              <span className="text-xs text-gray-500">{modelName}</span>
            </div>
            <pre className="p-5 whitespace-pre-wrap text-sm text-gray-200 leading-relaxed font-sans max-h-96 overflow-y-auto">
              {prompt}
            </pre>
          </div>

          {(() => {
            const s = getScore();
            return (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-400">Strength</span>
                  <span className={"text-sm font-semibold " + s.textColor}>
                    {s.score}/100 - {s.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={"h-full rounded-full transition-all duration-700 " + s.color}
                    style={{ width: s.score + "%" }}
                  />
                </div>
              </div>
            );
          })()}

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={copyPrompt}
              className={
                "px-4 py-2 rounded-lg text-sm font-medium transition-all " +
                (copied ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white")
              }
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={() => setShowRefine(!showRefine)}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-all"
            >
              Refine
            </button>
            <button
              onClick={regenerate}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-all"
            >
              {loading ? "..." : "Regenerate"}
            </button>
            <button
              onClick={downloadPrompt}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-all"
            >
              Download
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-all"
            >
              New
            </button>
          </div>

          {showRefine && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-300 mb-2 font-medium">What to change?</p>
              <input
                type="text"
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") refine();
                }}
                placeholder="e.g., make it shorter, add constraints..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["Make shorter", "Add constraints", "More professional", "Add examples", "Be more specific"].map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => setRefineText(s)}
                      className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-full transition-colors"
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={refine}
                disabled={!refineText.trim() || loading}
                className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-all"
              >
                {loading ? "Refining..." : "Apply Refinement"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-12 text-center text-xs text-gray-600">PromptForge v2.1 | Keys are server-side only</div>
    </div>
  );
}