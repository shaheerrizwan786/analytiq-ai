'use client';

import { useState, useMemo } from 'react';


type Platform = 'google' | 'tripadvisor' | 'yelp';
type Sentiment = 'positive' | 'neutral' | 'negative';
type TimeRange = 'week' | 'month';

interface Review {
  id: string;
  platform: Platform;
  text: string;
  sentiment: Sentiment;
  rating?: number | null;
  date_iso?: string | null;
}

interface RecentReviewsListProps {
  reviews: Review[];
  onViewAll?: () => void;
}

const platformColors: Record<Platform, string> = {
  google: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  tripadvisor: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400',
  yelp: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
};

const sentimentColors: Record<Sentiment, string> = {
  positive: 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400',
  neutral: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400',
  negative: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
};


const timeRangeLabels: Record<TimeRange, string> = {
  week: 'This week',
  month: 'This month',
};

/** Local calendar YYYY-MM-DD (matches how users read "this week / this month"). */
function localTodayKey(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD as a local calendar date at noon (stable for comparisons). */
function parseLocalYmd(ymd: string): Date {
  const [y, mo, d] = ymd.split('-').map((x) => parseInt(x, 10));
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

/** Same calendar day the user sees in the UI (not UTC `toISOString` slice). */
function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local calendar date for a review timestamp — matches list date display & week/month bounds. */
function reviewLocalDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return formatLocalYmd(d);
  } catch {
    return null;
  }
}

/** Monday 00:00 – Sunday 23:59:59.999 local, week containing `ref`. */
function localWeekRange(ref: Date): { start: Date; end: Date } {
  const cal = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
  const day = cal.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(cal);
  start.setDate(cal.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function ReviewItem({ review }: { review: Review }) {
  const formattedDate = review.date_iso
    ? (() => {
        try {
          return new Date(review.date_iso!).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });
        } catch {
          return review.date_iso;
        }
      })()
    : null;

  return (
    <div className="py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className={`text-xs font-medium rounded-md px-2 py-0.5 capitalize ${platformColors[review.platform]}`}>
          {review.platform}
        </span>
        <span className={`text-xs font-medium rounded-md px-2 py-0.5 capitalize ${sentimentColors[review.sentiment]}`}>
          {review.sentiment === 'positive' ? '✓ Great' : review.sentiment === 'negative' ? '✗ Concern' : '~ Mixed'}
        </span>
        {review.rating != null && (
          <span className="text-xs text-gray-400 dark:text-gray-500">★ {review.rating.toFixed(1)}</span>
        )}
        {formattedDate && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{formattedDate}</span>
        )}
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">{review.text}</p>
    </div>
  );
}

export default function RecentReviewsList({ reviews, onViewAll }: RecentReviewsListProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  /**
   * "This week / this month" = calendar week / calendar month that contain **today** (local).
   * Bounds are [lo, hi] as local YYYY-MM-DD strings so filters stay within 7 days vs ~28–31 days.
   */
  const { lo, hi } = useMemo(() => {
    const todayKey = localTodayKey();
    const ref = parseLocalYmd(todayKey);
    if (timeRange === 'week') {
      const { start, end } = localWeekRange(ref);
      let weekLo = formatLocalYmd(start);
      let weekHi = formatLocalYmd(end);
      if (weekHi > todayKey) weekHi = todayKey;
      return { lo: weekLo, hi: weekHi };
    }
    const yStart = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const lastDom = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 12, 0, 0, 0);
    const monthEndKey = formatLocalYmd(lastDom);
    /** Cap month at today so we never treat future days as in-range. */
    const hiKey = monthEndKey > todayKey ? todayKey : monthEndKey;
    return { lo: formatLocalYmd(yStart), hi: hiKey };
  }, [timeRange]);

  const filtered = useMemo(() => {
    const inRange = reviews.filter((r) => {
      const k = reviewLocalDateKey(r.date_iso);
      if (!k) return false;
      return k >= lo && k <= hi;
    });

    return inRange.sort((a, b) => {
      const ka = reviewLocalDateKey(a.date_iso);
      const kb = reviewLocalDateKey(b.date_iso);
      if (!ka && !kb) return 0;
      if (!ka) return 1;
      if (!kb) return -1;
      return kb.localeCompare(ka);
    });
  }, [reviews, lo, hi]);

  const timeRanges: TimeRange[] = ['week', 'month'];

  const headingLabel = timeRange === 'week'
    ? `${filtered.length} review${filtered.length !== 1 ? 's' : ''} this week`
    : `${filtered.length} review${filtered.length !== 1 ? 's' : ''} this month`;

  return (
    <div className="bg-white dark:bg-[var(--dk-card)] rounded-2xl border border-gray-100 dark:border-[var(--dk-border)] shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
            Recent reviews
          </p>
          <span className="text-xs text-gray-400 dark:text-gray-500">{headingLabel}</span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-2)] transition-colors"
          >
            View all →
          </button>
        )}
      </div>

      {/* Time range tabs */}
      <div className="flex gap-1 mb-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-0.5 w-fit">
        {timeRanges.map((tr) => (
          <button
            key={tr}
            onClick={() => setTimeRange(tr)}
            className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
              timeRange === tr
                ? 'bg-white dark:bg-[var(--dk-card)] text-gray-800 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {timeRangeLabels[tr]}
          </button>
        ))}
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto max-h-[420px] pr-1">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-600">No reviews in this period.</p>
          </div>
        ) : (
          filtered.map((review) => <ReviewItem key={review.id} review={review} />)
        )}
      </div>
    </div>
  );
}
