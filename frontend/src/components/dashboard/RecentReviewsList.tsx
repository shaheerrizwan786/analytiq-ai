'use client';

import { useState, useMemo } from 'react';

type Platform = 'google' | 'tripadvisor' | 'yelp';
type Sentiment = 'positive' | 'neutral' | 'negative';
type TimeRange = '7d' | '30d' | 'all';

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

const sentimentFilterColors: Record<string, string> = {
  all: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
  positive: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  neutral: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  negative: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
};

const timeRangeLabels: Record<TimeRange, string> = {
  '7d': 'This week',
  '30d': 'This month',
  'all': 'All time',
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

export default function RecentReviewsList({ reviews }: RecentReviewsListProps) {
  const [query, setQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | Sentiment>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // Derive cutoff relative to the latest review date (so demo data always has "recent" items)
  const latestDate = useMemo(() => {
    const dates = reviews
      .map((r) => r.date_iso)
      .filter(Boolean)
      .sort() as string[];
    return dates.length > 0 ? new Date(dates[dates.length - 1] + 'T23:59:59') : new Date();
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return reviews.filter((r) => {
      // Time range
      if (timeRange !== 'all' && r.date_iso) {
        const days = timeRange === '7d' ? 7 : 30;
        const cutoff = new Date(latestDate.getTime() - days * 24 * 60 * 60 * 1000);
        if (new Date(r.date_iso) < cutoff) return false;
      }
      // Sentiment
      if (sentimentFilter !== 'all' && r.sentiment !== sentimentFilter) return false;
      // Search
      if (q && !r.text.toLowerCase().includes(q) && !r.platform.includes(q)) return false;
      return true;
    });
  }, [reviews, query, sentimentFilter, timeRange, latestDate]);

  const sentimentFilters: Array<'all' | Sentiment> = ['all', 'positive', 'neutral', 'negative'];
  const timeRanges: TimeRange[] = ['7d', '30d', 'all'];

  const headingLabel = timeRange === '7d'
    ? `${filtered.length} review${filtered.length !== 1 ? 's' : ''} this week`
    : timeRange === '30d'
    ? `${filtered.length} review${filtered.length !== 1 ? 's' : ''} this month`
    : `${filtered.length} of ${reviews.length} reviews`;

  return (
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          Customer reviews
        </p>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{headingLabel}</span>
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

      {/* Search */}
      <div className="relative mb-3">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reviews…"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* Sentiment filter pills */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {sentimentFilters.map((f) => (
          <button
            key={f}
            onClick={() => setSentimentFilter(f)}
            className={`text-xs font-medium rounded-full px-2.5 py-0.5 capitalize transition-colors ${
              sentimentFilter === f
                ? sentimentFilterColors[f]
                : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
            }`}
          >
            {f === 'all' ? 'All' : f === 'positive' ? '✓ Great' : f === 'negative' ? '✗ Concerns' : '~ Mixed'}
          </button>
        ))}
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto max-h-[420px] pr-1">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-600">No reviews in this period.</p>
            {timeRange !== 'all' && (
              <button
                onClick={() => setTimeRange('all')}
                className="mt-2 text-xs text-violet-500 hover:text-violet-400 underline"
              >
                Show all reviews
              </button>
            )}
          </div>
        ) : (
          filtered.map((review) => <ReviewItem key={review.id} review={review} />)
        )}
      </div>
    </div>
  );
}
