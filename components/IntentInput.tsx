"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onSubmit: (intent: string) => void;
  isLoading: boolean;
}

export function IntentInput({ onSubmit, isLoading }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length >= 10) {
      onSubmit(text.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
        <label className="block text-lg font-semibold text-white mb-2">
          What do you need an AI to help you with?
        </label>
        <p className="text-gray-400 text-sm mb-4">
          Describe it naturally — rough ideas are perfectly fine. The AI will craft an optimized prompt for you.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., I need to write a blog post about kubernetes for beginners, make it engaging and not too technical, maybe 1000 words..."
            className="w-full h-40 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-500">
              {text.length} characters {text.length < 10 && text.length > 0 ? "(min 10)" : ""}
            </span>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500">Ctrl+Enter to submit</span>
              <button
                type="submit"
                disabled={text.trim().length < 10 || isLoading}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>Craft Prompt →</>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick examples */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">Quick examples (click to use):</p>
          <div className="flex flex-wrap gap-2">
            {[
              "Write a Python function that validates email addresses",
              "Summarize meeting notes into action items",
              "Create a marketing email for a new product launch",
              "Debug this React component that's re-rendering too much",
              "Analyze customer reviews and categorize feedback",
            ].map((example) => (
              <button
                key={example}
                onClick={() => setText(example)}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-full transition-colors"
              >
                {example.length > 45 ? example.slice(0, 45) + "..." : example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}