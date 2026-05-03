'use client';

import { useMemo } from 'react';
import { calcPerformanceMetrics, type ReviewInput } from '@/lib/analytics';

interface PerformanceScoreCardProps {
  reviews: ReviewInput[];
}

// â”€â”€â”€ Sentiment score styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SCORE_STYLES = {
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
  up: { icon: 'â†‘', cls: 'text-emerald-600 dark:text-emerald-400' },
  down: { icon: 'â†“', cls: 'text-rose-500 dark:text-rose-400' },
  flat: { icon: 'â†’', cls: 'text-gray-400 dark:text-gray-500' },
} as const;

// â”€â”€â”€ Star rating legend config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each segment: label, the range it covers on a 1â€“5 scale, tailwind colours.

const RATING_SEGMENTS = [
  { label: 'Poor',         min: 1.0, max: 2.5, bar: 'bg-rose-400',   text: 'text-rose-600 dark:text-rose-400',   badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' },
  { label: 'Below Avg',    min: 2.5, max: 3.5, bar: 'bg-orange-400', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300' },
  { label: 'Average',      min: 3.5, max: 4.0, bar: 'bg-amber-400',  text: 'text-amber-600 dark:text-amber-400',  badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  { label: 'Good',         min: 4.0, max: 4.5, bar: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' },
  { label: 'Excellent',    min: 4.5, max: 5.0, bar: 'bg-emerald-500',text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
] as const;

/** Map a 1â€“5 avg to a 0â€“100% position along the legend bar. */
function ratingToPercent(avg: number): number {
  return Math.round(((avg - 1) / 4) * 100);
}

/** Find the segment object for a given avg. */
function segmentFor(avg: number) {
  return RATING_SEGMENTS.find((s) => avg >= s.min && avg < s.max) ?? RATING_SEGMENTS[RATING_SEGMENTS.length - 1];
}

// â”€â”€â”€ Star glyph helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Stars({ avg }: { avg: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${avg} stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = avg >= i;
        const half = !filled && avg >= i - 0.5;
        return (
          <svg key={i} viewBox="0 0 20 20" className="w-4 h-4">
            <defs>
              <linearGradient id={`star-grad-${i}`}>
                <stop offset={half ? '50%' : filled ? '100%' : '0%'} stopColor="#f59e0b" />
                <stop offset={half ? '50%' : filled ? '100%' : '0%'} stopColor="#e5e7eb" />
              </linearGradient>
            </defs>
            <path
              d="M10 1l2.4 5 5.6.8-4 3.8 1 5.4L10 13.4l-5 2.6 1-5.4L2 6.8l5.6-.8z"
              fill={filled ? '#f59e0b' : half ? `url(#star-grad-${i})` : '#e5e7eb'}
            />
          </svg>
        );
      })}
    </span>
  );
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function PerformanceScoreCard({ reviews }: PerformanceScoreCardProps) {
  const metrics = useMemo(() => calcPerformanceMetrics(reviews), [reviews]);
  const scoreStyles = SCORE_STYLES[metrics.label];
  const trendStyle = TREND_ICONS[metrics.trend];

  if (reviews.length === 0) {
    return (
      <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-6">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
          Performance
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No reviews yet â€” run an analysis to see your performance score.
        </p>
      </div>
    );
  }

  const seg = metrics.avgRating !== null ? segmentFor(metrics.avgRating) : null;
  const pointerPct = metrics.avgRating !== null ? ratingToPercent(metrics.avgRating) : null;

  return (
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-6 space-y-5">

      {/* â”€â”€ Row 1: Sentiment score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-start gap-5 flex-wrap">
        {/* Score ring */}
        <div
          className={`relative flex-shrink-0 w-20 h-20 rounded-full ring-4 ${scoreStyles.ring} flex items-center justify-center bg-gray-50 dark:bg-[#0C0C18]`}
        >
          <span className={`text-2xl font-bold ${scoreStyles.text}`}>{metrics.score}</span>
          <span className="absolute bottom-2 text-[9px] font-medium text-gray-400 dark:text-gray-500">/100</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
            Sentiment Score
          </p>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreStyles.badge}`}>
              {metrics.label}
            </span>
            <span className={`text-sm font-semibold ${trendStyle.cls} flex items-center gap-1`}>
              <span className="text-base leading-none">{trendStyle.icon}</span>
              {metrics.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {metrics.trendText}
          </p>
        </div>
      </div>

      {/* â”€â”€ Divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="border-t border-gray-100 dark:border-[#1E1E2E]" />

      {/* â”€â”€ Row 2: Star rating â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {metrics.avgRating !== null && seg !== null && pointerPct !== null ? (
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
            Star Rating Average
          </p>

          {/* Star display + label */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className={`text-3xl font-bold ${seg.text}`}>{metrics.avgRating}</span>
            <div>
              <Stars avg={metrics.avgRating} />
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${seg.badge}`}>
                  {seg.label}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  from {metrics.ratedCount} review{metrics.ratedCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Segmented legend bar */}
          <div className="relative">
            {/* Segments */}
            <div className="flex h-3 rounded-full overflow-hidden gap-px">
              {RATING_SEGMENTS.map((s) => {
                const width = ((s.max - s.min) / 4) * 100;
                const active = s.label === seg.label;
                return (
                  <div
                    key={s.label}
                    className={`${s.bar} transition-opacity ${active ? 'opacity-100' : 'opacity-25'}`}
                    style={{ width: `${width}%` }}
                  />
                );
              })}
            </div>

            {/* Pointer needle */}
            <div
              className="absolute -top-1 w-0.5 h-5 bg-gray-800 dark:bg-white rounded-full shadow"
              style={{ left: `calc(${pointerPct}% - 1px)` }}
            />
          </div>

          {/* Legend labels */}
          <div className="flex justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
            {RATING_SEGMENTS.map((s) => (
              <span
                key={s.label}
                className={s.label === seg.label ? `font-bold ${seg.text}` : ''}
              >
                {s.label}
              </span>
            ))}
          </div>

          {/* Scale ticks */}
          <div className="flex justify-between text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 px-px">
            <span>â˜…1</span>
            <span>â˜…2.5</span>
            <span>â˜…3.5</span>
            <span>â˜…4</span>
            <span>â˜…4.5</span>
            <span>â˜…5</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No numeric star ratings in these reviews â€” star average unavailable.
        </p>
      )}
    </div>
  );
}

