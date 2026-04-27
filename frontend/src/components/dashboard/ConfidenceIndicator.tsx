type ConfidenceLevel = 'High' | 'Medium' | 'Low';

interface ConfidenceData {
  level: ConfidenceLevel;
  percentage: number;
  note: string;
}

interface ConfidenceIndicatorProps {
  confidence: ConfidenceData;
}

const levelColors: Record<ConfidenceLevel, string> = {
  High: 'text-emerald-600 dark:text-emerald-400',
  Medium: 'text-amber-500 dark:text-amber-400',
  Low: 'text-rose-500 dark:text-rose-400',
};

const barColors: Record<ConfidenceLevel, string> = {
  High: 'bg-emerald-400',
  Medium: 'bg-amber-400',
  Low: 'bg-rose-400',
};

export default function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  return (
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-5 flex flex-col justify-between h-full">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Analysis confidence</p>

      <div className="flex items-end justify-between mb-3">
        <p className={`text-3xl font-semibold ${levelColors[confidence.level]}`}>{confidence.level}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{confidence.percentage}%</p>
      </div>

      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full ${barColors[confidence.level]}`}
          style={{ width: `${confidence.percentage}%` }}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{confidence.note}</p>
    </div>
  );
}
