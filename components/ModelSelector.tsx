"use client";

import { useState, useEffect } from "react";
import { Provider } from "@/lib/types";

interface Props {
  selectedModel: string;
  selectedProvider: Provider;
  onModelChange: (model: string) => void;
  onProviderChange: (provider: Provider) => void;
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

export function ModelSelector({ selectedModel, selectedProvider, onModelChange, onProviderChange }: Props) {
  const [providers, setProviders] = useState<Record<string, ProviderData>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [defaultModel, setDefaultModel] = useState("openai/gpt-4o");

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.providers || {});
        if (data.defaultModel) setDefaultModel(data.defaultModel);
        if (data.defaultProvider) onProviderChange(data.defaultProvider as Provider);
        if (data.defaultModel) onModelChange(data.defaultModel);
      })
      .catch(() => {});
  }, []);

  const currentModel = Object.values(providers)
    .flatMap((p) => p.models)
    .find((m) => m.id === selectedModel);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-all"
      >
        <span className="text-xs">🤖</span>
        <span>{currentModel?.displayName || selectedModel}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 animate-fade-in">
          {Object.entries(providers).map(([providerId, providerData]) => (
            <div key={providerId}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-800/50 sticky top-0">
                {providerData.name}
              </div>
              {providerData.models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    onProviderChange(providerId as Provider);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-gray-800 transition-colors ${
                    selectedModel === model.id ? "bg-brand-900/30 border-l-2 border-brand-500" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-200">{model.displayName}</div>
                      <div className="text-xs text-gray-500">{model.description}</div>
                    </div>
                    {model.costInput > 0 && (
                      <span className="text-[10px] text-gray-600 whitespace-nowrap ml-2">
                        ${model.costInput.toFixed(4)}/1K
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}