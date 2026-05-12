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
  const noIssues = issue.title === 'No priority issues identified';

  if (noIssues) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/20 dark:to-[#13131F] rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm p-6 border-l-4 border-l-emerald-400">
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-4">✦ What to do next</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</p>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">You're running well — no critical issues</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customers are happy. Focus on growth.</p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Growth opportunity</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{issue.recommendedAction}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Expected benefit</p>
            <ul className="space-y-1.5">
              {issue.expectedImpacts.length > 0
                ? issue.expectedImpacts.map((impact, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      {impact}
                    </li>
                  ))
                : (
                  <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    Extend your lead over competitors
                  </li>
                )}
            </ul>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-emerald-100 dark:border-emerald-900/30">
          <button className="text-sm font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
            Explore Growth Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/30 dark:to-[#13131F] rounded-2xl border border-orange-100 dark:border-orange-900/30 shadow-sm p-6 border-l-4 border-l-orange-400">
      <p className="text-xs font-medium text-orange-500 dark:text-orange-400 uppercase tracking-wide mb-4">🔥 What to fix first</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority issue</p>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{issue.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{issue.reviewCount} reviews mention this</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Recommended action</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{issue.recommendedAction}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Expected impact</p>
          <ul className="space-y-1.5">
            {issue.expectedImpacts.map((impact, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                {impact}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-orange-100 dark:border-orange-900/30">
        <button className="text-sm font-medium text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors">
          Get Detailed Plan
        </button>
      </div>
    </div>
  );
}
