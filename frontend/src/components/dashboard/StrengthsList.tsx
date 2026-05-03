import Card from '@/components/ui/Card';

interface Strength {
  id: string;
  text: string;
  category: string;
  impactLabel: string;
}

interface StrengthsListProps {
  strengths: Strength[];
}

export default function StrengthsList({ strengths }: StrengthsListProps) {
  if (strengths.length === 0) return null;

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-4">
        {/* Checkmark icon */}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          What you&apos;re doing well
        </h3>
      </div>

      <ul className="space-y-2.5">
        {strengths.map((s) => (
          <li
            key={s.id}
            className="flex items-start gap-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/10 px-3.5 py-3"
          >
            {/* Bullet dot */}
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{s.text}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  {s.category}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {s.impactLabel}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
