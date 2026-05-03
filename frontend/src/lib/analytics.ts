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
}

export function calcPerformanceMetrics(reviews: ReviewInput[]): PerformanceMetrics {
  const score = calcScore(reviews);
  const label = scoreLabel(score);

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const cutLast = new Date(now.getTime() - 7 * day);
  const cutPrev = new Date(now.getTime() - 14 * day);

  const withDates = reviews.filter((r) => r.date_iso != null);
  const last7 = withDates.filter((r) => new Date(r.date_iso!) >= cutLast);
  const prev7 = withDates.filter(
    (r) => new Date(r.date_iso!) >= cutPrev && new Date(r.date_iso!) < cutLast,
  );

  const last7Score = last7.length > 0 ? calcScore(last7) : undefined;
  const prev7Score = prev7.length > 0 ? calcScore(prev7) : undefined;

  let trend: TrendDirection = 'flat';
  let trendText = 'Not enough recent data to compare periods.';

  if (last7Score !== undefined && prev7Score !== undefined) {
    const delta = last7Score - prev7Score;
    if (delta > 5) {
      trend = 'up';
      trendText = `Up ${delta} pts vs previous 7 days — you are improving.`;
    } else if (delta < -5) {
      trend = 'down';
      trendText = `Down ${Math.abs(delta)} pts vs previous 7 days — performance dropped.`;
    } else {
      trend = 'flat';
      trendText = 'Stable vs previous 7 days — holding steady.';
    }
  } else if (last7Score !== undefined) {
    trendText = 'Based on last 7 days (no prior period to compare).';
  }

  return { score, label, trend, last7Score, prev7Score, trendText };
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
