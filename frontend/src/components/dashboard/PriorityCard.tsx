interface PriorityCardProps {
  text: string;
  index: number;
}

export default function PriorityCard({ text, index }: PriorityCardProps) {
  return (
    <div className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center">
        {index + 1}
      </span>
      <p className="text-sm text-gray-800">{text}</p>
    </div>
  );
}
