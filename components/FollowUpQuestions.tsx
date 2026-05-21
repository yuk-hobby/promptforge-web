"use client";

import { useState } from "react";

interface Props {
  questions: string[];
  onSubmit: (answers: Record<string, string>) => void;
  onSkip: () => void;
}

export function FollowUpQuestions({ questions, onSubmit, onSkip }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🤔</span>
          <h2 className="text-lg font-semibold text-white">
            A few quick questions for a better prompt
          </h2>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          These will help the AI craft a more targeted prompt. Skip any that don&apos;t apply.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {questions.map((question, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {i + 1}. {question}
              </label>
              <input
                type="text"
                value={answers[question] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [question]: e.target.value }))
                }
                placeholder="Type your answer or leave blank to skip"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>
          ))}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Skip all →
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-all"
            >
              Continue →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}