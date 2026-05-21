export function Banner() {
    return (
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          🔨 PromptForge
        </h1>
        <p className="text-gray-400 text-lg">
          AI-Powered Prompt Engineer
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Describe what you need. I&apos;ll craft the perfect prompt.
        </p>
      </div>
    );
  }