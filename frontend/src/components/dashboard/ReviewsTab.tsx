'use client';

import { useState, useMemo } from 'react';

type Review = {
  id: string;
  platform: 'google' | 'tripadvisor' | 'yelp';
  text: string;
  rating: number | null;
  date_iso: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
};

interface ReviewsTabProps {
  reviews: Review[];
}

const PLATFORM_LABELS: Record<Review['platform'], string> = {
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  yelp: 'Yelp',
};

const PLATFORM_COLORS: Record<Review['platform'], string> = {
  google: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300',
  tripadvisor: 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300',
  yelp: 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300',
};

const SENTIMENT_COLORS: Record<Review['sentiment'], string> = {
  positive: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
  neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  negative: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300',
};

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  const full = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={`w-3.5 h-3.5 ${n <= full ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.951.69h4.163c.969 0 1.372 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.449a1 1 0 00-1.175 0l-3.37 2.449c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.06 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.951-.69l1.287-3.957z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function ReviewsTab({ reviews }: ReviewsTabProps) {
  const [sourceFilter, setSourceFilter] = useState<Review['platform'] | 'all'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<Review['sentiment'] | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low'>('newest');

  const sourceCounts = useMemo(() => {
    const counts: Record<Review['platform'], number> = { google: 0, tripadvisor: 0, yelp: 0 };
    reviews.forEach((r) => { counts[r.platform] = (counts[r.platform] ?? 0) + 1; });
    return counts;
  }, [reviews]);

  const filtered = useMemo(() => {
    let result = reviews;
    if (sourceFilter !== 'all') result = result.filter((r) => r.platform === sourceFilter);
    if (sentimentFilter !== 'all') result = result.filter((r) => r.sentiment === sentimentFilter);

    result = [...result].sort((a, b) => {
      if (sortOrder === 'newest') return (b.date_iso ?? '').localeCompare(a.date_iso ?? '');
      if (sortOrder === 'oldest') return (a.date_iso ?? '').localeCompare(b.date_iso ?? '');
      if (sortOrder === 'rating-high') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortOrder === 'rating-low') return (a.rating ?? 0) - (b.rating ?? 0);
      return 0;
    });
    return result;
  }, [reviews, sourceFilter, sentimentFilter, sortOrder]);

  const resetFilters = () => {
    setSourceFilter('all');
    setSentimentFilter('all');
    setSortOrder('newest');
  };

  const isFiltered = sourceFilter !== 'all' || sentimentFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Source pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              sourceFilter === 'all'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white dark:bg-[#13131F] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'
            }`}
          >
            All sources
          </button>
          {(['google', 'tripadvisor', 'yelp'] as Review['platform'][]).map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                sourceFilter === src
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-[#13131F] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'
              }`}
            >
              {PLATFORM_LABELS[src]} {sourceCounts[src] > 0 && `(${sourceCounts[src]})`}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-200" />

        {/* Sentiment pills */}
        <div className="flex items-center gap-1.5">
          {(['all', 'positive', 'neutral', 'negative'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSentimentFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                sentimentFilter === s
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-[#13131F] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'
              }`}
            >
              {s === 'all' ? 'All sentiment' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 bg-white dark:bg-[#13131F] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="rating-high">Rating: high to low</option>
            <option value="rating-low">Rating: low to high</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filtered.length} of {reviews.length} review{reviews.length !== 1 ? 's' : ''}
      </p>

      {/* Review cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No reviews match the current filters.</p>
          {isFiltered && (
            <button onClick={resetFilters} className="text-sm text-violet-600 dark:text-violet-400 underline hover:text-violet-800">
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div key={review.id} className="bg-white dark:bg-[#13131F] border border-gray-100 dark:border-[#1E1E2E] rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[review.platform]}`}>
                    {PLATFORM_LABELS[review.platform]}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SENTIMENT_COLORS[review.sentiment]}`}>
                    {review.sentiment.charAt(0).toUpperCase() + review.sentiment.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                  <StarRating rating={review.rating} />
                  {review.date_iso && <span>{formatDate(review.date_iso)}</span>}
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{review.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
