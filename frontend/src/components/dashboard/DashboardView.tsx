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
import StrengthsList from './StrengthsList';
import { useAppMode } from '@/lib/modeContext';

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
  strengths: { id: string; text: string; category: string; impactLabel: string }[];
}

interface DashboardViewProps {
  data: DashboardData;
  onBack?: () => void;
}

export default function DashboardView({ data, onBack }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'trends'>('overview');
  const { mode } = useAppMode();

  return (
    <AppShell>
      {/* Demo mode ribbon */}
      {mode === 'demo' && (
        <div className="w-full bg-amber-500/10 border-b border-amber-400/30">
          <div className="max-w-6xl mx-auto px-4 h-9 flex items-center justify-between">
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Demo mode &mdash; viewing sample data for The Meridian Kitchen
            </span>
            {onBack && (
              <button
                onClick={onBack}
                className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
              >
                Exit demo
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            New analysis
          </button>
        )}
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
              <StrengthsList strengths={data.strengths} />
              <CustomerIssuesList issues={data.issues} />
            </div>

            <AIRecommendationsList recommendations={data.recommendations} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RecentReviewsList reviews={data.reviews} onViewAll={() => setActiveTab('reviews')} />
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
