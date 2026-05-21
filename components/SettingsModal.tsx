"use client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-300 mb-2">API Keys</p>
            <p className="text-xs text-gray-500">
              API keys are configured via environment variables in your Vercel dashboard.
              They are never exposed to the browser.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 font-mono">
              OPENROUTER_API_KEY=sk-or-v1-...<br />
              OPENAI_API_KEY=sk-proj-...<br />
              ANTHROPIC_API_KEY=sk-ant-...<br />
              GOOGLE_API_KEY=AIzaSy...<br />
            </p>
          </div>

          <p className="text-xs text-gray-500">
            Set these in your Vercel project settings under Environment Variables.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-all text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}