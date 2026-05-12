interface SentimentCardProps {
  label: string;
  percentage: number;
  color: 'green' | 'yellow' | 'red';
}

const barColors = {
  green: 'bg-green-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
};

const textColors = {
  green: 'text-green-600 dark:text-green-400',
  yellow: 'text-yellow-500 dark:text-yellow-400',
  red: 'text-red-500 dark:text-red-400',
};

export default function SentimentCard({ label, percentage, color }: SentimentCardProps) {
  return (
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-2xl font-semibold ${textColors[color]}`}>{percentage}%</p>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
