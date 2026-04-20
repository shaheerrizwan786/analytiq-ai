import AppShell from '@/components/layout/AppShell';
import { MockData } from '@/lib/mockData';
import DashboardHeader from './DashboardHeader';
import WhatToFixFirst from './WhatToFixFirst';
import SentimentOverview from './SentimentOverview';
import CustomerIssuesList from './CustomerIssuesList';
import AIRecommendationsList from './AIRecommendationsList';
import RecentReviewsList from './RecentReviewsList';
import ConfidenceIndicator from './ConfidenceIndicator';

interface DashboardViewProps {
  data: MockData;
}

export default function DashboardView({ data }: DashboardViewProps) {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
        <DashboardHeader
          restaurantName={data.restaurantName}
          location={data.location}
          totalReviews={data.totalReviews}
        />

        <WhatToFixFirst issue={data.topIssue} />

        <SentimentOverview sentiment={data.sentiment} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerIssuesList issues={data.issues} />
          <AIRecommendationsList recommendations={data.recommendations} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentReviewsList reviews={data.reviews} />
          </div>
          <div>
            <ConfidenceIndicator confidence={data.confidence} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
