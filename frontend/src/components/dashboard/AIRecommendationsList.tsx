'use client';

import { useState } from 'react';

interface Recommendation {
  id: string;
  action: string;
  why: string;
  impact: string;
  tags: string[];
}

interface AIRecommendationsListProps {
  recommendations: Recommendation[];
}

const tagColors: Record<string, string> = {
  'High Impact': 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  'Quick Win': 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400',
  'Operational': 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
  'Revenue': 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
  'Operations': 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
};

function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const [open, setOpen] = useState(false);
  const hasDetail = rec.why || rec.impact;

  return (
    <div className="border-b border-gray-50 dark:border-gray-800 last:border-0">
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`w-full text-left py-3.5 flex items-start gap-3 group ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
        aria-expanded={open}
      >
        {/* Number bubble */}
        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-[10px] font-bold flex items-center justify-center">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{rec.action}</p>
          {rec.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {rec.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[10px] rounded-md px-1.5 py-0.5 font-medium ${tagColors[tag] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chevron */}
        {hasDetail && (
          <svg
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`flex-shrink-0 mt-1 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        )}
      </button>

      {/* Expanded detail */}
      {hasDetail && open && (
        <div className="pb-3.5 pl-8 pr-2 space-y-1.5">
          {rec.why && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <span className="font-medium text-gray-600 dark:text-gray-300">Why: </span>{rec.why}
            </p>
          )}
          {rec.impact && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <span className="font-medium text-gray-600 dark:text-gray-300">Expected impact: </span>{rec.impact}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIRecommendationsList({ recommendations }: AIRecommendationsListProps) {
  return (
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">AI recommendations</p>
        {recommendations.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">Click to expand</p>
        )}
      </div>
      <div>
        {recommendations.map((rec, i) => (
          <RecommendationCard key={rec.id} rec={rec} index={i} />
        ))}
      </div>
    </div>
  );
}
