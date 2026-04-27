interface Recommendation {
  id: string;
  action: string;
  why: string;
  impact: string;
  tags: string[];
}

interface AIRecommendationsListProps {
  recommendations: Recommendation[];
}

const tagColors: Record<string, string> = {
  'High Impact': 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  'Quick Win': 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400',
  'Operational': 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
  'Revenue': 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
  'Operations': 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="py-4 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rec.action}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{rec.why}</p>
      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 font-medium">{rec.impact}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {rec.tags.map((tag) => (
          <span
            key={tag}
            className={`text-xs rounded-md px-2 py-0.5 font-medium ${tagColors[tag] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AIRecommendationsList({ recommendations }: AIRecommendationsListProps) {
  return (
    <div className="bg-white dark:bg-[#13131F] rounded-2xl border border-gray-100 dark:border-[#1E1E2E] shadow-sm p-5">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">AI recommendations</p>
      <div>
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} />
        ))}
      </div>
    </div>
  );
}
