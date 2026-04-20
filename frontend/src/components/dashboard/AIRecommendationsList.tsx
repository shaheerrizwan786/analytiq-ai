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
  'High Impact': 'bg-blue-50 text-blue-600',
  'Quick Win': 'bg-green-50 text-green-600',
  'Operational': 'bg-purple-50 text-purple-600',
  'Revenue': 'bg-orange-50 text-orange-600',
  'Operations': 'bg-purple-50 text-purple-600',
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="py-4 border-b border-gray-50 last:border-0">
      <p className="text-sm font-medium text-gray-900">{rec.action}</p>
      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{rec.why}</p>
      <p className="text-xs text-gray-600 mt-1.5 font-medium">{rec.impact}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {rec.tags.map((tag) => (
          <span
            key={tag}
            className={`text-xs rounded-md px-2 py-0.5 font-medium ${tagColors[tag] ?? 'bg-gray-100 text-gray-500'}`}
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">AI recommendations</p>
      <div>
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} />
        ))}
      </div>
    </div>
  );
}
