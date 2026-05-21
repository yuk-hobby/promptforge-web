"use client";

import { useState } from "react";

interface Props {
  onSubmit: (feedback: string) => void;
  isLoading: boolean;
}

export function RefinementPanel({ onSubmit, isLoading }: Props) {
  const [feedback, setFeedback] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      onSubmit(feedback.trim());
      setFeedback("");
    }
  };

  const suggestions = [
    "Make it more specific about output format",
    "Add constraints about what to avoid",
    "Make it shorter and more concise",
    "Add examples of expected input/output",
    "Make the tone more professional",
    "Add step-by-step instructions",
  ];

  return (
    <div className="animate-slide-up bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        📝 What would you like to change?
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="e.g., make it more specific about the output format..."
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={isLoading}
          autoFocus
        />

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFeedback(s)}
              className="text-[11px] px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-full transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!feedback.trim() || isLoading}
          className="w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Refining...
            </>
          ) : (
            "Apply Refinement"
          )}
        </button>
      </form>
    </div>
  );
}