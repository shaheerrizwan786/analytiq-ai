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
  High: 'text-green-600',
  Medium: 'text-yellow-500',
  Low: 'text-red-500',
};

const barColors: Record<ConfidenceLevel, string> = {
  High: 'bg-green-400',
  Medium: 'bg-yellow-400',
  Low: 'bg-red-400',
};

export default function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between h-full">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Analysis confidence</p>

      <div className="flex items-end justify-between mb-3">
        <p className={`text-3xl font-semibold ${levelColors[confidence.level]}`}>{confidence.level}</p>
        <p className="text-2xl font-semibold text-gray-900">{confidence.percentage}%</p>
      </div>

      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full ${barColors[confidence.level]}`}
          style={{ width: `${confidence.percentage}%` }}
        />
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">{confidence.note}</p>
    </div>
  );
}
