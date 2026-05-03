'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AppShell from '@/components/layout/AppShell';
import DashboardView, { DashboardData } from '@/components/dashboard/DashboardView';
import { analyzeRestaurant, AnalyzeResponse } from '@/lib/api';
import { getSession, getSavedRestaurant, saveRestaurant } from '@/lib/auth';

function mapToUi(api: AnalyzeResponse, name: string, location: string): DashboardData {
  const insights = api.insights ?? {};
  const sentiment = insights.sentiment ?? { positive: 0, neutral: 1, negative: 0 };
  const sources = insights.sources ?? { google: 0, yelp: 0, tripadvisor: 0 };
  const totalReviews = sources.google + sources.yelp + sources.tripadvisor || api.new_reviews_count || 0;

  const issues = (insights.top_issues ?? [])
    .filter(Boolean)
    .map((text, i) => ({
      id: String(i + 1),
      text,
      category: 'General',
      impactLabel: 'Medium impact',
      impactLevel: 'medium' as const,
    }));

  const recommendations = (insights.recommendations ?? [])
    .filter(Boolean)
    .map((action, i) => ({
      id: String(i + 1),
      action,
      why: '',
      impact: '',
      tags: [] as string[],
    }));

  const topIssue = issues[0]
    ? {
        title: issues[0].text,
        reviewCount: 0,
        recommendedAction: recommendations[0]?.action ?? 'No action available yet.',
        expectedImpacts: [],
      }
    : {
        title: 'No priority issues identified yet',
        reviewCount: 0,
        recommendedAction: 'Run the analysis again once more reviews are collected.',
        expectedImpacts: [],
      };

  const pct = Math.min(90, totalReviews > 0 ? Math.round(totalReviews / 3) : 0);
  const level: 'High' | 'Medium' | 'Low' = pct >= 60 ? 'High' : pct >= 35 ? 'Medium' : 'Low';

  const reviews = (api.reviews ?? []).map((r) => ({
    id: r.id,
    platform: r.source as 'google' | 'tripadvisor' | 'yelp',
    text: r.text,
    rating: r.rating ?? null,
    date_iso: r.date_iso ?? null,
    sentiment: (
      r.rating == null ? 'neutral' : r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'neutral'
    ) as 'positive' | 'neutral' | 'negative',
  }));

  return {
    restaurantName: api.restaurant_name ?? name,
    location: api.restaurant_location ?? location,
    totalReviews,
    sentiment,
    topIssue,
    issues,
    recommendations,
    reviews,
    confidence: {
      level,
      percentage: pct,
      note: `Based on ${totalReviews} reviews across Google, TripAdvisor, and Yelp.`,
    },
  };
}

export default function Home() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // On mount: check session → auto-fill saved restaurant
  useEffect(() => {
    const email = getSession();
    if (email) {
      const saved = getSavedRestaurant(email);
      if (saved) {
        setName(saved.name);
        setLocation(saved.location);
      }
    }
  }, []);

  const canSubmit = name.trim().length > 0 && location.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyzeRestaurant(name.trim(), location.trim());
      const uiData = mapToUi(res, name.trim(), location.trim());
      setDashboardData(uiData);
      // Save restaurant for logged-in users
      const email = getSession();
      if (email) saveRestaurant(email, name.trim(), location.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (dashboardData) {
    return <DashboardView data={dashboardData} />;
  }

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float-blob absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-500/20 dark:bg-violet-600/15 blur-3xl" />
          <div className="animate-float-blob-delay absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-400/20 dark:bg-cyan-500/10 blur-3xl" />
          <div className="animate-float-blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-orange-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Trust badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-[#13131F]/80 backdrop-blur-sm border border-gray-100 dark:border-[#1E1E2E] rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Analysing reviews from Google · TripAdvisor · Yelp
            </div>
          </div>

          <Card padding="lg" className="shadow-xl dark:shadow-violet-950/20">
            <div className="mb-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent leading-tight">
                Know what to fix.<br />Before guests leave.
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enter a restaurant to get AI-powered insights from customer reviews in seconds.
              </p>
            </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Restaurant Name"
              placeholder="e.g. Nobu Melbourne"
              value={name}
              onChange={setName}
              isDisabled={isLoading}
            />
            <Input
              label="Location"
              placeholder="e.g. Melbourne, VIC"
              value={location}
              onChange={setLocation}
              isDisabled={isLoading}
            />
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                isDisabled={!canSubmit}
                isLoading={isLoading}
                size="lg"
                fullWidth
              >
                Connect &amp; Analyse
              </Button>
            </div>
          </div>
        </Card>
        </div>
      </div>
    </AppShell>
  );
}
