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
  'week': 'This week',
  'month': 'This month',
};

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

  // Derive cutoff relative to the latest review date (so demo data always has "recent" items)
  const latestDate = useMemo(() => {
    const dates = reviews
      .map((r) => r.date_iso)
      .filter(Boolean)
      .sort() as string[];
    return dates.length > 0 ? new Date(dates[dates.length - 1] + 'T23:59:59') : new Date();
  }, [reviews]);

  const filtered = useMemo(() => {
    // Compute calendar start for the selected range (relative to latestDate)
    let rangeStart: Date;
    if (timeRange === 'week') {
      // Monday of the week containing latestDate
      const day = latestDate.getDay(); // 0=Sun…6=Sat
      const diff = day === 0 ? -6 : 1 - day;
      rangeStart = new Date(latestDate);
      rangeStart.setDate(latestDate.getDate() + diff);
      rangeStart.setHours(0, 0, 0, 0);
    } else {
      // 1st of the month containing latestDate
      rangeStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1, 0, 0, 0, 0);
    }

    return reviews.filter((r) => {
      if (r.date_iso && new Date(r.date_iso) < rangeStart) return false;
      return true;
    });
  }, [reviews, timeRange, latestDate]);

  const timeRanges: TimeRange[] = ['week', 'month'];

  const headingLabel = timeRange === 'week'
    ? `${filtered.length} review${filtered.length !== 1 ? 's' : ''} this week`
    : `${filtered.length} review${filtered.length !== 1 ? 's' : ''} this month`;

  return (
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-5">
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
            className="text-xs font-medium text-violet-500 hover:text-violet-400 transition-colors"
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
                ? 'bg-white dark:bg-[#13131F] text-gray-800 dark:text-gray-100 shadow-sm'
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
