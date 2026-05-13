type ConfidenceLevel = 'High' | 'Medium' | 'Low';

interface ConfidenceData {
  level: ConfidenceLevel;
  percentage: number;
  note: string;
}

interface ConfidenceIndicatorProps {
  confidence: ConfidenceData;
}

const levelColors: Record<ConfidenceLevel, { text: string; bar: string; badge: string }> = {
  High:   { text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  Medium: { text: 'text-amber-500 dark:text-amber-400',   bar: 'bg-amber-400',   badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'     },
  Low:    { text: 'text-rose-500 dark:text-rose-400',     bar: 'bg-rose-400',    badge: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'           },
};

export default function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const c = levelColors[confidence.level];
  return (
    <div className="bg-white dark:bg-[var(--dk-card)] rounded-2xl border border-gray-100 dark:border-[var(--dk-border)] shadow-sm px-4 py-3.5">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2.5">Analysis confidence</p>

      {/* Badge + percentage on one row */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`text-xs font-semibold rounded-full border px-2.5 py-0.5 ${c.badge}`}>
          {confidence.level}
        </span>
        <span className={`text-sm font-bold ${c.text}`}>{confidence.percentage}%</span>
      </div>

      {/* Bar */}
      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2.5">
        <div className={`h-full rounded-full transition-all duration-500 ${c.bar}`} style={{ width: `${confidence.percentage}%` }} />
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 leading-snug">{confidence.note}</p>
    </div>
  );
}
