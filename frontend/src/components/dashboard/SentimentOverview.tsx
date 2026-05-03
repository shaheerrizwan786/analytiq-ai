import SentimentCard from './SentimentCard';

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
}

interface SentimentOverviewProps {
  sentiment: SentimentData;
}

export default function SentimentOverview({ sentiment }: SentimentOverviewProps) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Sentiment overview</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SentimentCard label="Positive" percentage={Math.round(sentiment.positive * 100)} color="green" />
        <SentimentCard label="Neutral" percentage={Math.round(sentiment.neutral * 100)} color="yellow" />
        <SentimentCard label="Negative" percentage={Math.round(sentiment.negative * 100)} color="red" />
      </div>
    </div>
  );
}
