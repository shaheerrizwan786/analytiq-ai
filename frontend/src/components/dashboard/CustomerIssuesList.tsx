type ImpactLevel = 'high' | 'medium' | 'low';

interface Issue {
  id: string;
  text: string;
  category: string;
  impactLabel: string;
  impactLevel: ImpactLevel;
}

interface CustomerIssuesListProps {
  issues: Issue[];
}

const impactBadgeColors: Record<ImpactLevel, string> = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-yellow-50 text-yellow-600',
  low: 'bg-gray-100 text-gray-500',
};

function IssueItem({ issue, rank }: { issue: Issue; rank: number }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center mt-0.5">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{issue.text}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs bg-gray-100 text-gray-500 rounded-md px-2 py-0.5">{issue.category}</span>
          <span className={`text-xs rounded-md px-2 py-0.5 font-medium ${impactBadgeColors[issue.impactLevel]}`}>
            {issue.impactLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CustomerIssuesList({ issues }: CustomerIssuesListProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Customer issues</p>
      <div>
        {issues.map((issue, i) => (
          <IssueItem key={issue.id} issue={issue} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
