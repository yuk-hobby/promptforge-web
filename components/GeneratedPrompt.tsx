"use client";

import { useState } from "react";
import { QualityScore } from "./QualityScore";
import { RefinementPanel } from "./RefinementPanel";
import { calculateQualityScore } from "@/lib/quality-score";
import { Provider } from "@/lib/types";

interface Props {
  prompt: string;
  tokenInfo: { input: number; output: number; cost: number | null } | null;
  model: string;
  provider: Provider;
  hasContext: boolean;
  hasFollowUps: boolean;
  isLoading: boolean;
  onRefine: (feedback: string) => void;
  onRegenerate: () => void;
  onReset: () => void;
}

export function GeneratedPrompt({
  prompt,
  tokenInfo,
  model,
  provider,
  hasContext,
  hasFollowUps,
  isLoading,
  onRefine,
  onRegenerate,
  onReset,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [showRefine, setShowRefine] = useState(false);

  const quality = calculateQualityScore(prompt, hasContext, hasFollowUps);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-slide-up space-y-4">
      {/* Generated Prompt Box */}
      <div className="bg-gray-900/50 border border-green-800/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-green-900/20 border-b border-green-800/30">
          <span className="text-sm font-medium text-green-300">✨ Generated Prompt</span>
          <span className="text-xs text-gray-500">{model}</span>
        </div>
        <div className="p-5">
          <pre className="whitespace-pre-wrap text-gray-200 text-sm leading-relaxed font-sans">
            {prompt}
          </pre>
        </div>
      </div>

      {/* Quality Score */}
      <QualityScore score={quality.score} label={quality.label} tips={quality.tips} />

      {/* Token Info */}
      {tokenInfo && (tokenInfo.input > 0 || tokenInfo.output > 0) && (
        <div className="text-xs text-gray-500 text-center">
          Tokens: ~{tokenInfo.input} in, ~{tokenInfo.output} out
          {tokenInfo.cost !== null && ` | Est. cost: $${tokenInfo.cost.toFixed(4)}`}
          {" | "}
          {provider}/{model}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleCopy}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
            copied
              ? "bg-green-600 text-white"
              : "bg-brand-600 hover:bg-brand-500 text-white"
          }`}
        >
          {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
        </button>

        <button
          onClick={() => setShowRefine(!showRefine)}
          disabled={isLoading}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg font-medium text-sm transition-all border border-gray-700"
        >
          📝 Refine
        </button>

        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg font-medium text-sm transition-all border border-gray-700"
        >
          {isLoading ? "⏳" : "🔄"} Regenerate
        </button>

        <button
          onClick={handleDownload}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg font-medium text-sm transition-all border border-gray-700"
        >
          💾 Download
        </button>

        <button
          onClick={onReset}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg font-medium text-sm transition-all border border-gray-700"
        >
          🔄 New Prompt
        </button>
      </div>

      {/* Refinement Panel */}
      {showRefine && (
        <RefinementPanel onSubmit={onRefine} isLoading={isLoading} />
      )}
    </div>
  );
}