'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { buildWeeklyTimeSeries, type ReviewInput, type WeeklyPoint } from '@/lib/analytics';

interface TrendsTabProps {
  reviews: ReviewInput[];
}

type Period = '4w' | '3m' | 'all';

const periodLabels: Record<Period, string> = {
  '4w': 'Last 4 weeks',
  '3m': 'Last 3 months',
  'all': 'All time',
};

function filterByPeriod(reviews: ReviewInput[], period: Period): ReviewInput[] {
  if (period === 'all') return reviews;
  const days = period === '4w' ? 28 : 90;
  const dates = reviews.map((r) => r.date_iso).filter(Boolean) as string[];
  if (dates.length === 0) return reviews;
  const latest = new Date(dates.sort().at(-1)! + 'T23:59:59');
  const cutoff = new Date(latest.getTime() - days * 24 * 60 * 60 * 1000);
  return reviews.filter((r) => r.date_iso && new Date(r.date_iso) >= cutoff);
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[var(--dk-alt)] border border-gray-100 dark:border-[var(--dk-border)] rounded-xl shadow-lg px-3 py-2.5 text-xs space-y-1 min-w-[140px]">
      {label && (
        <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
      )}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold text-gray-800 dark:text-gray-100">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChartSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[var(--dk-card)] rounded-2xl border border-gray-100 dark:border-[var(--dk-border)] shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-4 leading-snug">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-40 flex items-center justify-center">
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center">{message}</p>
    </div>
  );
}

function InsightCallout({ weeks, totalReviews }: { weeks: WeeklyPoint[]; totalReviews: number }) {
  if (weeks.length === 0) return null;

  const lastWeek = weeks[weeks.length - 1];
  const prevWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
  const scoreChange = prevWeek ? lastWeek.score - prevWeek.score : null;
  const trending =
    scoreChange === null ? null : scoreChange > 5 ? 'up' : scoreChange < -5 ? 'down' : 'flat';
  const bestWeek = [...weeks].sort((a, b) => b.positive - a.positive)[0];
  const worstWeek = [...weeks].sort((a, b) => b.negative - a.negative)[0];

  return (
    <div className="bg-white dark:bg-[var(--dk-card)] rounded-2xl border border-gray-100 dark:border-[var(--dk-border)] shadow-sm p-5">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
        What the data says
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Last week</p>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{lastWeek.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            review{lastWeek.total !== 1 ? 's' : ''} —{' '}
            <span className="text-green-600 dark:text-green-400">{lastWeek.positive} great</span>
            {lastWeek.negative > 0 && (
              <>, <span className="text-red-500 dark:text-red-400">{lastWeek.negative} concern{lastWeek.negative !== 1 ? 's' : ''}</span></>
            )}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Trend vs previous week</p>
          {trending === null ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Not enough data yet</p>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {trending === 'up' ? '↑' : trending === 'down' ? '↓' : '→'}{' '}
                <span className={trending === 'up' ? 'text-green-600 dark:text-green-400' : trending === 'down' ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}>
                  {trending === 'flat' ? 'Steady' : `${Math.abs(scoreChange!)} pts`}
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {trending === 'up' ? 'Score is improving — keep it up' : trending === 'down' ? 'Score dipped — worth investigating' : 'Holding steady this week'}
              </p>
            </>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Across {totalReviews} reviews</p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
            Best week: <span className="font-medium">{bestWeek.weekLabel}</span> ({bestWeek.positive} great reviews)
          </p>
          {worstWeek.negative > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              Most complaints: <span className="font-medium">{worstWeek.weekLabel}</span> ({worstWeek.negative} concerns)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrendsTab({ reviews }: TrendsTabProps) {
  const [period, setPeriod] = useState<Period>('3m');

  const periodReviews = useMemo(() => filterByPeriod(reviews, period), [reviews, period]);
  const weeks = useMemo(() => buildWeeklyTimeSeries(periodReviews), [periodReviews]);
  const hasData = weeks.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Trends over time</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            See how your ratings and review volume change week by week
          </p>
        </div>
        <div className="flex gap-1 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-0.5">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                period === p
                  ? 'bg-white dark:bg-[var(--dk-card)] text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <InsightCallout weeks={weeks} totalReviews={periodReviews.length} />

      <ChartSection
        title="Your satisfaction score, week by week"
        subtitle="A score out of 100 based on the ratio of great vs problem reviews. Higher is better — aim for 70+."
      >
        {!hasData ? (
          <EmptyChart message="No dated reviews to show. Run the analysis to populate trends." />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={weeks} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                name="Score /100"
                stroke="#6C35E0"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6C35E0', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartSection>

      <ChartSection
        title="What customers are saying each week"
        subtitle="Green = great reviews, yellow = mixed feelings, red = complaints. More green means happy customers."
      >
        {!hasData ? (
          <EmptyChart message="No dated reviews to show." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeks} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#6b7280' }}
              />
              <Bar dataKey="positive" name="Great ✓" stackId="a" fill="#10b981" maxBarSize={40} />
              <Bar dataKey="neutral" name="Mixed ~" stackId="a" fill="#f59e0b" maxBarSize={40} />
              <Bar dataKey="negative" name="Concerns ✗" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartSection>

      <ChartSection
        title="How many reviews did you receive each week?"
        subtitle="More reviews means more visibility online. Quiet weeks can mean fewer new customers are finding you."
      >
        {!hasData ? (
          <EmptyChart message="No dated reviews to show." />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeks} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="total"
                name="Reviews"
                fill="#22D3EE"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartSection>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center pb-2">
        Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''} total.
        Each bar represents one calendar week (Mon – Sun).
      </p>
    </div>
  );
}