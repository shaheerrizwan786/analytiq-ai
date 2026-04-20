import MetricCard from './MetricCard';

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
}

interface HeroMetricsProps {
  sentiment: SentimentData;
}

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function HeroMetrics({ sentiment }: HeroMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard label="Positive" value={toPercent(sentiment.positive)} color="green" />
      <MetricCard label="Neutral" value={toPercent(sentiment.neutral)} color="yellow" />
      <MetricCard label="Negative" value={toPercent(sentiment.negative)} color="red" />
    </div>
  );
}
