'use client';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import DashboardHeader from './DashboardHeader';
import WhatToFixFirst from './WhatToFixFirst';
import SentimentOverview from './SentimentOverview';
import CustomerIssuesList from './CustomerIssuesList';
import AIRecommendationsList from './AIRecommendationsList';
import RecentReviewsList from './RecentReviewsList';
import ConfidenceIndicator from './ConfidenceIndicator';
import ReviewsTab from './ReviewsTab';
import PerformanceScoreCard from './PerformanceScoreCard';
import TrendsTab from './TrendsTab';

export interface DashboardData {
  restaurantName: string;
  location: string;
  totalReviews: number;
  sentiment: { positive: number; neutral: number; negative: number };
  topIssue: {
    title: string;
    reviewCount: number;
    recommendedAction: string;
    expectedImpacts: string[];
  };
  issues: {
    id: string;
    text: string;
    category: string;
    impactLabel: string;
    impactLevel: 'high' | 'medium' | 'low';
  }[];
  recommendations: {
    id: string;
    action: string;
    why: string;
    impact: string;
    tags: string[];
  }[];
  reviews: {
    id: string;
    platform: 'google' | 'tripadvisor' | 'yelp';
    text: string;
    rating: number | null;
    date_iso: string | null;
    sentiment: 'positive' | 'neutral' | 'negative';
  }[];
  confidence: { level: 'High' | 'Medium' | 'Low'; percentage: number; note: string };
}

interface DashboardViewProps {
  data: DashboardData;
}

export default function DashboardView({ data }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'trends'>('overview');

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
        <DashboardHeader
          restaurantName={data.restaurantName}
          location={data.location}
          totalReviews={data.totalReviews}
        />

        {/* Tab nav */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'border-b-2 border-violet-600 text-violet-700 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'reviews'
                ? 'border-b-2 border-violet-600 text-violet-700 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Reviews{data.reviews.length > 0 ? ` (${data.reviews.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'trends'
                ? 'border-b-2 border-violet-600 text-violet-700 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Trends
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            <PerformanceScoreCard reviews={data.reviews} />

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
          </>
        ) : activeTab === 'reviews' ? (
          <ReviewsTab reviews={data.reviews} />
        ) : (
          <TrendsTab reviews={data.reviews} />
        )}
      </div>
    </AppShell>
  );
}
