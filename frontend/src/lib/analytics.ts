/**
 * analytics.ts
 * Derives performance metrics and trend data from raw review arrays.
 * No backend changes needed — all logic runs on the existing reviews payload.
 */

export type ReviewInput = {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  date_iso: string | null;
  rating: number | null;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Normalise any date string to YYYY-MM-DD, returns null if unparseable. */
function toDateKey(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

/** Clamp a number between min and max inclusive. */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ─── Performance Score ──────────────────────────────────────────────────────

/**
 * score = ((positive - negative) / total) * 100, clamped 0–100.
 * Returns 0 when there are no reviews.
 */
export function calcScore(reviews: ReviewInput[]): number {
  if (reviews.length === 0) return 0;
  const pos = reviews.filter((r) => r.sentiment === 'positive').length;
  const neg = reviews.filter((r) => r.sentiment === 'negative').length;
  const raw = ((pos - neg) / reviews.length) * 100;
  return Math.round(clamp(raw, 0, 100));
}

export type ScoreLabel = 'Excellent' | 'Good' | 'Needs Attention' | 'Critical';

export function scoreLabel(score: number): ScoreLabel {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Attention';
  return 'Critical';
}

export type TrendDirection = 'up' | 'down' | 'flat';

// ─── Star Rating ────────────────────────────────────────────────────────────

export type RatingLabel = 'Excellent' | 'Good' | 'Average' | 'Below Average' | 'Poor';

/**
 * Thresholds (inclusive lower, exclusive upper):
 *  4.5 – 5.0 → Excellent
 *  4.0 – 4.5 → Good
 *  3.5 – 4.0 → Average
 *  2.5 – 3.5 → Below Average
 *  1.0 – 2.5 → Poor
 */
export function ratingLabel(avg: number): RatingLabel {
  if (avg >= 4.5) return 'Excellent';
  if (avg >= 4.0) return 'Good';
  if (avg >= 3.5) return 'Average';
  if (avg >= 2.5) return 'Below Average';
  return 'Poor';
}

/** Returns the average star rating and how many reviews had a numeric rating. */
export function calcAvgRating(reviews: ReviewInput[]): { avg: number | null; count: number } {
  const rated = reviews.filter((r) => r.rating !== null && r.rating >= 1 && r.rating <= 5);
  if (rated.length === 0) return { avg: null, count: 0 };
  const sum = rated.reduce((acc, r) => acc + r.rating!, 0);
  return { avg: Math.round((sum / rated.length) * 10) / 10, count: rated.length };
}

export interface PerformanceMetrics {
  score: number;
  label: ScoreLabel;
  trend: TrendDirection;
  /** Score for the last 7-day window (undefined if no data). */
  last7Score: number | undefined;
  /** Score for the previous 7-day window (undefined if no data). */
  prev7Score: number | undefined;
  /** Human-readable trend description. */
  trendText: string;
  /** Average star rating (null if no numeric ratings present). */
  avgRating: number | null;
  /** Human label for the average rating. */
  ratingLabel: RatingLabel | null;
  /** Number of reviews that had a numeric rating. */
  ratedCount: number;
}

export function calcPerformanceMetrics(reviews: ReviewInput[]): PerformanceMetrics {
  const score = calcScore(reviews);
  const label = scoreLabel(score);
  const { avg: avgRating, count: ratedCount } = calcAvgRating(reviews);
  const rl = avgRating !== null ? ratingLabel(avgRating) : null;

  if (reviews.length === 0) {
    return { score, label, trend: 'flat', last7Score: undefined, prev7Score: undefined, trendText: 'No reviews yet.', avgRating: null, ratingLabel: null, ratedCount: 0 };
  }

  // ── Tier 1: 7-day rolling windows (ideal — requires recent activity) ─────
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const cutLast = new Date(now.getTime() - 7 * day);
  const cutPrev = new Date(now.getTime() - 14 * day);
  const withDates = reviews.filter((r) => r.date_iso != null);
  const last7 = withDates.filter((r) => new Date(r.date_iso!) >= cutLast);
  const prev7 = withDates.filter(
    (r) => new Date(r.date_iso!) >= cutPrev && new Date(r.date_iso!) < cutLast,
  );
  if (last7.length > 0 && prev7.length > 0) {
    const last7Score = calcScore(last7);
    const prev7Score = calcScore(prev7);
    const delta = last7Score - prev7Score;
    if (delta > 5)
      return { score, label, trend: 'up', last7Score, prev7Score, trendText: `Up ${delta} pts vs the previous week — improving.`, avgRating, ratingLabel: rl, ratedCount };
    if (delta < -5)
      return { score, label, trend: 'down', last7Score, prev7Score, trendText: `Down ${Math.abs(delta)} pts vs the previous week — performance dropped.`, avgRating, ratingLabel: rl, ratedCount };
    return { score, label, trend: 'flat', last7Score, prev7Score, trendText: 'Stable vs the previous week — holding steady.', avgRating, ratingLabel: rl, ratedCount };
  }

  // ── Tier 2: Split dated reviews by median date ───────────────────────────
  if (withDates.length >= 2) {
    const sorted = [...withDates].sort((a, b) => a.date_iso!.localeCompare(b.date_iso!));
    const mid = Math.floor(sorted.length / 2);
    const olderScore = calcScore(sorted.slice(0, mid));
    const newerScore = calcScore(sorted.slice(mid));
    const delta = newerScore - olderScore;
    if (delta > 5)
      return { score, label, trend: 'up', last7Score: newerScore, prev7Score: olderScore, trendText: `Improving — recent reviews score ${delta} pts higher than older ones.`, avgRating, ratingLabel: rl, ratedCount };
    if (delta < -5)
      return { score, label, trend: 'down', last7Score: newerScore, prev7Score: olderScore, trendText: `Declining — recent reviews score ${Math.abs(delta)} pts lower than older ones.`, avgRating, ratingLabel: rl, ratedCount };
    return { score, label, trend: 'flat', last7Score: newerScore, prev7Score: olderScore, trendText: 'Consistent across old and recent reviews — holding steady.', avgRating, ratingLabel: rl, ratedCount };
  }

  // ── Tier 3: No dates — split array in half (API returns newest-first) ────
  if (reviews.length >= 2) {
    const mid = Math.floor(reviews.length / 2);
    const newerScore = calcScore(reviews.slice(0, mid));
    const olderScore = calcScore(reviews.slice(mid));
    const delta = newerScore - olderScore;
    if (delta > 5)
      return { score, label, trend: 'up', last7Score: newerScore, prev7Score: olderScore, trendText: `Trending up — most recent reviews are more positive.`, avgRating, ratingLabel: rl, ratedCount };
    if (delta < -5)
      return { score, label, trend: 'down', last7Score: newerScore, prev7Score: olderScore, trendText: `Trending down — most recent reviews are less positive.`, avgRating, ratingLabel: rl, ratedCount };
    return { score, label, trend: 'flat', last7Score: newerScore, prev7Score: olderScore, trendText: 'Consistent across reviews — holding steady.', avgRating, ratingLabel: rl, ratedCount };
  }

  // ── Fallback: single review ───────────────────────────────────────────────
  return {
    score, label, trend: 'flat',
    last7Score: undefined, prev7Score: undefined,
    trendText: `Score based on 1 review — run another analysis to start tracking trends.`,
    avgRating, ratingLabel: rl, ratedCount,
  };
}

// ─── Daily Aggregation ──────────────────────────────────────────────────────

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  score: number;
}

/**
 * Groups reviews by calendar day and produces a sorted array of DailyPoint.
 * Reviews without a parseable date are silently dropped.
 */
export function buildDailyTimeSeries(reviews: ReviewInput[]): DailyPoint[] {
  const map = new Map<
    string,
    { positive: number; neutral: number; negative: number }
  >();

  for (const r of reviews) {
    const key = toDateKey(r.date_iso);
    if (!key) continue;
    if (!map.has(key)) map.set(key, { positive: 0, neutral: 0, negative: 0 });
    const bucket = map.get(key)!;
    bucket[r.sentiment] += 1;
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => {
      const total = counts.positive + counts.neutral + counts.negative;
      const rawScore = total > 0 ? ((counts.positive - counts.negative) / total) * 100 : 0;
      return {
        date,
        ...counts,
        total,
        score: Math.round(clamp(rawScore, 0, 100)),
      };
    });
}

/** Format YYYY-MM-DD as a short label like "Apr 26". */
export function formatDateLabel(dateStr: string): string {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
