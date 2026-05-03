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
  neutral: 'bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300',
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

const SENTIMENT_LABELS: Record<Review['sentiment'], string> = {
  positive: '✓ Great',
  neutral: '~ Mixed',
  negative: '✗ Concern',
};

export default function ReviewsTab({ reviews }: ReviewsTabProps) {
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<Review['platform'] | 'all'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<Review['sentiment'] | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low'>('newest');

  const stats = useMemo(() => {
    const total = reviews.length;
    const positive = reviews.filter((r) => r.sentiment === 'positive').length;
    const negative = reviews.filter((r) => r.sentiment === 'negative').length;
    const withRating = reviews.filter((r) => r.rating != null);
    const avgRating = withRating.length
      ? withRating.reduce((s, r) => s + r.rating!, 0) / withRating.length
      : null;
    return { total, positive, negative, avgRating };
  }, [reviews]);

  const sourceCounts = useMemo(() => {
    const counts: Record<Review['platform'], number> = { google: 0, tripadvisor: 0, yelp: 0 };
    reviews.forEach((r) => { counts[r.platform] = (counts[r.platform] ?? 0) + 1; });
    return counts;
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let result = reviews.filter((r) => {
      if (sourceFilter !== 'all' && r.platform !== sourceFilter) return false;
      if (sentimentFilter !== 'all' && r.sentiment !== sentimentFilter) return false;
      if (q && !r.text.toLowerCase().includes(q) && !r.platform.includes(q)) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      if (sortOrder === 'newest') return (b.date_iso ?? '').localeCompare(a.date_iso ?? '');
      if (sortOrder === 'oldest') return (a.date_iso ?? '').localeCompare(b.date_iso ?? '');
      if (sortOrder === 'rating-high') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortOrder === 'rating-low') return (a.rating ?? 0) - (b.rating ?? 0);
      return 0;
    });
    return result;
  }, [reviews, query, sourceFilter, sentimentFilter, sortOrder]);

  const resetFilters = () => {
    setQuery('');
    setSourceFilter('all');
    setSentimentFilter('all');
    setSortOrder('newest');
  };

  const isFiltered = query !== '' || sourceFilter !== 'all' || sentimentFilter !== 'all';

  return (
    <div className="space-y-5">

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total reviews', value: stats.total },
          { label: 'Great reviews', value: `${stats.positive} (${stats.total ? Math.round(stats.positive / stats.total * 100) : 0}%)` },
          { label: 'Concerns', value: `${stats.negative} (${stats.total ? Math.round(stats.negative / stats.total * 100) : 0}%)` },
          { label: 'Avg rating', value: stats.avgRating != null ? `★ ${stats.avgRating.toFixed(1)}` : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#13131F] border border-gray-100 dark:border-[#1E1E2E] rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{s.label}</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search review text…"
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#13131F] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Clear search">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Source pills */}
        <button
          onClick={() => setSourceFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sourceFilter === 'all' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-[#13131F] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'}`}
        >
          All sources
        </button>
        {(['google', 'tripadvisor', 'yelp'] as Review['platform'][]).map((src) => (
          <button
            key={src}
            onClick={() => setSourceFilter(src)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sourceFilter === src ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-[#13131F] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'}`}
          >
            {PLATFORM_LABELS[src]}{sourceCounts[src] > 0 ? ` (${sourceCounts[src]})` : ''}
          </button>
        ))}

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Sentiment pills */}
        {(['all', 'positive', 'neutral', 'negative'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSentimentFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sentimentFilter === s ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-[#13131F] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'}`}
          >
            {s === 'all' ? 'All' : SENTIMENT_LABELS[s]}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#13131F] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="rating-high">Rating: high → low</option>
            <option value="rating-low">Rating: low → high</option>
          </select>
        </div>
      </div>

      {/* Count + reset */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filtered.length === reviews.length
            ? `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`}
        </p>
        {isFiltered && (
          <button onClick={resetFilters} className="text-xs text-violet-500 hover:text-violet-400 underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Review cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No reviews match your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div key={review.id} className="bg-white dark:bg-[#13131F] border border-gray-100 dark:border-[#1E1E2E] rounded-xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[review.platform]}`}>
                    {PLATFORM_LABELS[review.platform]}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SENTIMENT_COLORS[review.sentiment]}`}>
                    {SENTIMENT_LABELS[review.sentiment]}
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
