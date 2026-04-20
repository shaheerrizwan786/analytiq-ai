interface TopIssue {
  title: string;
  reviewCount: number;
  recommendedAction: string;
  expectedImpacts: string[];
}

interface WhatToFixFirstProps {
  issue: TopIssue;
}

export default function WhatToFixFirst({ issue }: WhatToFixFirstProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">What to fix first</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Priority issue</p>
          <p className="text-base font-semibold text-gray-900">{issue.title}</p>
          <p className="text-sm text-gray-500 mt-1">{issue.reviewCount} reviews mention this</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Recommended action</p>
          <p className="text-sm text-gray-700 leading-relaxed">{issue.recommendedAction}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Expected impact</p>
          <ul className="space-y-1.5">
            {issue.expectedImpacts.map((impact, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                {impact}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-gray-100">
        <button className="text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
          Get Detailed Plan
        </button>
      </div>
    </div>
  );
}
