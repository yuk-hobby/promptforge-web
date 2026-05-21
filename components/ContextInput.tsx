"use client";

import { useState } from "react";

interface Props {
  onSubmit: (context: string) => void;
  isLoading: boolean;
}

export function ContextInput({ onSubmit, isLoading }: Props) {
  const [context, setContext] = useState("");
  const [showTextarea, setShowTextarea] = useState(false);

  return (
    <div className="animate-slide-up">
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white mb-2">
          Any reference material to include?
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Optional: Paste text, code, or data the AI should consider when crafting your prompt.
        </p>

        {!showTextarea ? (
          <div className="flex gap-3">
            <button
              onClick={() => setShowTextarea(true)}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-all text-sm"
            >
              📝 Paste text/code
            </button>
            <button
              onClick={() => onSubmit("")}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-all text-sm"
            >
              Skip — Generate prompt →
            </button>
          </div>
        ) : (
          <div>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Paste your reference material here..."
              className="w-full h-32 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-gray-100 placeholder-gray-500 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-mono text-sm"
              autoFocus
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-500">{context.length} characters</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowTextarea(false);
                    setContext("");
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onSubmit(context)}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-all text-sm flex items-center gap-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Generate Prompt →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}