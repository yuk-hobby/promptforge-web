interface Props {
    score: number;
    label: string;
    tips: string[];
  }
  
  export function QualityScore({ score, label, tips }: Props) {
    const getColor = () => {
      if (score >= 86) return "bg-green-500";
      if (score >= 71) return "bg-green-600";
      if (score >= 51) return "bg-yellow-500";
      if (score >= 31) return "bg-yellow-600";
      return "bg-red-500";
    };
  
    const getTextColor = () => {
      if (score >= 71) return "text-green-400";
      if (score >= 51) return "text-yellow-400";
      return "text-red-400";
    };
  
    return (
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Prompt Strength</span>
          <span className={`text-sm font-semibold ${getTextColor()}`}>
            {score}/100 — {label}
          </span>
        </div>
  
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
            style={{ width: `${score}%` }}
          />
        </div>
  
        {/* Tips */}
        {tips.length > 0 && (
          <div className="mt-3 space-y-1">
            {tips.map((tip, i) => (
              <p key={i} className="text-xs text-gray-500">
                💡 {tip}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }