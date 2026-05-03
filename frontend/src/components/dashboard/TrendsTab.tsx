'use client';

import { useMemo } from 'react';
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
import { buildDailyTimeSeries, formatDateLabel, type ReviewInput } from '@/lib/analytics';

interface TrendsTabProps {
  reviews: ReviewInput[];
}

// ─── Shared tooltip style ───────────────────────────────────────────────────

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
    <div className="bg-white dark:bg-[#1A1A2E] border border-gray-100 dark:border-[#1E1E2E] rounded-xl shadow-lg px-3 py-2.5 text-xs space-y-1 min-w-[120px]">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1.5">
        {label ? formatDateLabel(label) : ''}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold text-gray-800 dark:text-gray-100">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

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
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-4">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-40 flex items-center justify-center">
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function TrendsTab({ reviews }: TrendsTabProps) {
  const series = useMemo(() => buildDailyTimeSeries(reviews), [reviews]);

  const tickFormatter = (val: string) => formatDateLabel(val);

  const hasData = series.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Sentiment over time */}
      <ChartSection
        title="Customer sentiment over time"
        subtitle="How positive, neutral, and negative reviews are distributed day by day"
      >
        {!hasData ? (
          <EmptyChart message="No dated reviews to show. Run the analysis to populate trends." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
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
              <Line
                type="monotone"
                dataKey="positive"
                name="Positive"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="neutral"
                name="Neutral"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="negative"
                name="Negative"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartSection>

      {/* 2. Performance score over time */}
      <ChartSection
        title="Performance score over time"
        subtitle="Daily score (0–100) derived from positive vs negative sentiment"
      >
        {!hasData ? (
          <EmptyChart message="No dated reviews to show." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
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
                name="Score"
                stroke="#6C35E0"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6C35E0', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartSection>

      {/* 3. Review volume */}
      <ChartSection
        title="Review volume"
        subtitle="Number of reviews received per day"
      >
        {!hasData ? (
          <EmptyChart message="No dated reviews to show." />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
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

      {/* Footer note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center pb-2">
        Trends are derived from {reviews.length} review{reviews.length !== 1 ? 's' : ''} across all sources.
        Run a fresh analysis to update.
      </p>
    </div>
  );
}
