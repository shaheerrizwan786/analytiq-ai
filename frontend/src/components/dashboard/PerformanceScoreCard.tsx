'use client';

import { useMemo } from 'react';
import { calcPerformanceMetrics, type ReviewInput } from '@/lib/analytics';

interface PerformanceScoreCardProps {
  reviews: ReviewInput[];
}

const LABEL_STYLES = {
  Excellent: {
    ring: 'ring-emerald-400 dark:ring-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
  },
  Good: {
    ring: 'ring-violet-400 dark:ring-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
    bar: 'bg-gradient-to-r from-violet-400 to-cyan-400',
  },
  'Needs Attention': {
    ring: 'ring-amber-400 dark:ring-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    bar: 'bg-gradient-to-r from-amber-400 to-orange-400',
  },
  Critical: {
    ring: 'ring-rose-400 dark:ring-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
    bar: 'bg-gradient-to-r from-rose-400 to-rose-600',
  },
} as const;

const TREND_ICONS = {
  up: { icon: '↑', text: 'text-emerald-600 dark:text-emerald-400' },
  down: { icon: '↓', text: 'text-rose-500 dark:text-rose-400' },
  flat: { icon: '→', text: 'text-gray-400 dark:text-gray-500' },
} as const;

export default function PerformanceScoreCard({ reviews }: PerformanceScoreCardProps) {
  const metrics = useMemo(() => calcPerformanceMetrics(reviews), [reviews]);
  const styles = LABEL_STYLES[metrics.label];
  const trendStyle = TREND_ICONS[metrics.trend];

  if (reviews.length === 0) {
    return (
      <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-6">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
          Performance Score
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No reviews yet — run an analysis to see your performance score.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: score ring + label */}
        <div className="flex items-center gap-5">
          {/* Score ring */}
          <div
            className={`relative flex-shrink-0 w-20 h-20 rounded-full ring-4 ${styles.ring} flex items-center justify-center bg-gray-50 dark:bg-[#0C0C18]`}
          >
            <span className={`text-2xl font-bold ${styles.text}`}>{metrics.score}</span>
            <span className="absolute bottom-2 text-[9px] font-medium text-gray-400 dark:text-gray-500">
              /100
            </span>
          </div>

          {/* Label + trend */}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              Performance Score
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles.badge}`}>
                {metrics.label}
              </span>
              {metrics.last7Score !== undefined && (
                <span className={`text-sm font-semibold ${trendStyle.text} flex items-center gap-1`}>
                  <span className="text-base leading-none">{trendStyle.icon}</span>
                  {metrics.last7Score}/100 last 7 days
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-xs leading-relaxed">
              {metrics.trendText}
            </p>
          </div>
        </div>

        {/* Right: score bar */}
        <div className="flex-1 min-w-[140px] max-w-xs self-center">
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">
            <span>Critical</span>
            <span>Excellent</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${styles.bar}`}
              style={{ width: `${metrics.score}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-300 dark:text-gray-600 mt-1">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Low confidence notice */}
      {reviews.length < 5 && (
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
          ⚠ Low confidence — score is based on fewer than 5 reviews. Collect more to improve accuracy.
        </p>
      )}
    </div>
  );
}
