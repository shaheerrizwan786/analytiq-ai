import PriorityCard from './PriorityCard';

interface PriorityIssuesProps {
  title: string;
  items: string[];
}

export default function PriorityIssues({ title, items }: PriorityIssuesProps) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <PriorityCard key={i} text={item} index={i} />
        ))}
      </div>
    </div>
  );
}
