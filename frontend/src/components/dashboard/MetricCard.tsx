interface MetricCardProps {
  label: string;
  value: string;
  color?: 'green' | 'yellow' | 'red' | 'default';
}

export default function MetricCard({ label, value, color = 'default' }: MetricCardProps) {
  const valueColors = {
    green: 'text-green-600',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
    default: 'text-gray-900',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-semibold ${valueColors[color]}`}>{value}</p>
    </div>
  );
}
