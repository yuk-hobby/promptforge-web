"use client";

import { HistoryEntry } from "@/lib/types";

interface Props {
  history: HistoryEntry[];
  onLoad: (entry: HistoryEntry) => void;
  onClose: () => void;
}

export function HistoryPanel({ history, onLoad, onClose }: Props) {
  if (history.length === 0) {
    return (
      <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-xl p-4 animate-fade-in">
        <p className="text-gray-500 text-sm text-center">No prompt history yet.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300">📜 Recent Prompts</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">
          ✕
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-800">
        {history.slice(0, 10).map((entry) => (
          <button
            key={entry.id}
            onClick={() => onLoad(entry)}
            className="w-full text-left px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 truncate">{entry.intent}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(entry.timestamp).toLocaleDateString()} ·{" "}
                  {entry.model}
                </p>
              </div>
              <span className="text-xs text-gray-600 ml-2">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}