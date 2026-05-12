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
import ChatButton from '@/components/chat/ChatButton';
import ChatPanel from '@/components/chat/ChatPanel';
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
  const [chatOpen, setChatOpen] = useState(false);
  const { mode } = useAppMode();

  const topIssues = data.issues.map((i) => i.text);
  const recTexts = data.recommendations.map((r) => r.action);

  // Height offset for sticky chat column: navbar (56px) + demo ribbon (36px) when present
  const stickyTop = mode === 'demo' ? 92 : 56;

  return (
    <AppShell mainClassName="flex-1 flex flex-col w-full overflow-hidden">
      {/* Demo mode ribbon */}
      {mode === 'demo' && (
        <div className="w-full shrink-0 bg-amber-500/10 border-b border-amber-400/30">
          <div className="px-6 h-9 flex items-center justify-between">
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

      {/* Split content area — fills remaining viewport height */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: scrollable dashboard column ── */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
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

            {/* Tab nav + AI Advisor pill toggle */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <div className="flex gap-1">
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

              {/* AI Advisor pill toggle — desktop only */}
              <button
                onClick={() => setChatOpen((o) => !o)}
                className={`hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  chatOpen
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                    : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/35 hover:scale-105 active:scale-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {chatOpen ? 'Close Advisor' : '✦ AI Advisor'}
              </button>
            </div>

            {activeTab === 'overview' ? (
              <>
                <PerformanceScoreCard reviews={data.reviews} />
                {data.totalReviews === 0 ? (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-5 text-sm text-amber-800 dark:text-amber-300">
                    <strong>Restaurant not found.</strong> No reviews were found on Google Maps or TripAdvisor for &ldquo;{data.restaurantName}&rdquo; in {data.location}. Please check the spelling and try again.
                  </div>
                ) : (
                  <>
                <WhatToFixFirst issue={data.topIssue} onAskAdvisor={() => setChatOpen(true)} />
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
                )}
              </>
            ) : activeTab === 'reviews' ? (
              <ReviewsTab reviews={data.reviews} />
            ) : (
              <TrendsTab reviews={data.reviews} />
            )}
          </div>
        </div>

        {/* ── Right: animated chat column (desktop only) ── */}
        <aside
          className={`hidden lg:flex flex-col shrink-0 border-l overflow-hidden transition-all duration-300 ease-in-out ${
            chatOpen
              ? 'w-[380px] xl:w-[420px] border-gray-200 dark:border-[#1E1E2E] opacity-100'
              : 'w-0 border-transparent opacity-0'
          }`}
        >
          <ChatPanel
            variant="inline"
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            restaurantName={data.restaurantName}
            location={data.location}
            topIssues={topIssues}
            recommendations={recTexts}
          />
        </aside>
      </div>

      {/* ── Mobile: floating button + drawer (hidden on lg+) ── */}
      <div className="lg:hidden">
        <ChatButton onClick={() => setChatOpen(true)} />
        <ChatPanel
          variant="drawer"
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          restaurantName={data.restaurantName}
          location={data.location}
          topIssues={topIssues}
          recommendations={recTexts}
        />
      </div>
    </AppShell>
  );
}
