'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import RestaurantAutocomplete from '@/components/ui/RestaurantAutocomplete';
import AppShell from '@/components/layout/AppShell';
import AuthModal from '@/components/auth/AuthModal';
import DashboardView, { DashboardData } from '@/components/dashboard/DashboardView';
import AnalysisProgressBar, { ProgressStage, StageStatus } from '@/components/ui/AnalysisProgressBar';
import { analyzeRestaurantStream, AnalyzeResponse, ProgressUpdate } from '@/lib/api';
import { getSession, getSavedRestaurant, saveRestaurant } from '@/lib/auth';
import { useAppMode } from '@/lib/modeContext';
import { demoDashboardData } from '@/lib/demoData';

function mapToUi(api: AnalyzeResponse, name: string, location: string): DashboardData {
  const insights = api.insights ?? {};
  const sentiment = insights.sentiment ?? { positive: 0, neutral: 1, negative: 0 };
  const sources = insights.sources ?? { google: 0, yelp: 0, tripadvisor: 0 };
  const totalReviews = sources.google + sources.yelp + sources.tripadvisor || api.new_reviews_count || 0;

  // Parse pipe-separated issue strings: "TITLE | COUNT | WHY"
  const parseIssue = (raw: string) => {
    const p = raw.split(' | ');
    const count = parseInt(p[1] ?? '0', 10) || 0;
    return { title: p[0]?.trim() ?? raw, count, why: p[2]?.trim() ?? '' };
  };
  // Parse pipe-separated rec strings: "ACTION | COST | IMPACT | WHY | TAGS_CSV"
  const parseRec = (raw: string) => {
    const p = raw.split(' | ');
    return {
      action: p[0]?.trim() ?? raw,
      cost: (p[1]?.trim() ?? 'medium').toLowerCase(),
      impact: p[2]?.trim() ?? '',
      why: p[3]?.trim() ?? '',
      tags: p[4] ? p[4].split(',').map((t) => t.trim()).filter(Boolean) : ([] as string[]),
    };
  };
  // Parse pipe-separated strength strings: "TITLE | COUNT | WHY"
  const parseStrength = (raw: string) => {
    const p = raw.split(' | ');
    return { title: p[0]?.trim() ?? raw, count: parseInt(p[1] ?? '0', 10) || 0, why: p[2]?.trim() ?? '' };
  };

  const rawIssues = (insights.top_issues ?? []).filter(Boolean);
  const rawRecs = (insights.recommendations ?? []).filter(Boolean);
  const rawStrengths = (insights.strengths ?? []).filter(Boolean);

  const issues = rawIssues.map((raw, i) => {
    const { title, count } = parseIssue(raw);
    const impactLevel: 'high' | 'medium' | 'low' = count >= 10 ? 'high' : count >= 4 ? 'medium' : 'low';
    return {
      id: String(i + 1),
      text: title,
      category: 'General',
      impactLabel: impactLevel === 'high' ? 'High impact' : impactLevel === 'medium' ? 'Medium impact' : 'Low impact',
      impactLevel,
    };
  });

  const recommendations = rawRecs.map((raw, i) => {
    const { action, cost, impact, why, tags } = parseRec(raw);
    const impactLevel: 'high' | 'medium' | 'low' = cost === 'high' ? 'high' : cost === 'low' ? 'low' : 'medium';
    return { id: String(i + 1), action, why, impact, tags, impactLevel };
  });

  const strengths = rawStrengths.map((raw, i) => {
    const { title } = parseStrength(raw);
    return { id: `s${i + 1}`, text: title, category: 'General', impactLabel: 'Core strength' };
  });

  const firstIssue = rawIssues[0] ? parseIssue(rawIssues[0]) : null;
  const firstRec = rawRecs[0] ? parseRec(rawRecs[0]) : null;

  const topIssue = firstIssue
    ? {
        title: firstIssue.title,
        reviewCount: firstIssue.count,
        recommendedAction: firstRec?.action ?? 'No action available yet.',
        expectedImpacts: firstRec?.impact ? [firstRec.impact] : [],
      }
    : {
        title: 'No priority issues identified',
        reviewCount: 0,
        recommendedAction: firstRec?.action ?? 'Review your strengths and explore growth opportunities with the AI Advisor.',
        expectedImpacts: firstRec?.impact ? [firstRec.impact] : [],
      };

  // Floor at 40% for any successful LLM analysis (even with few reviews), scale up to 90%
  const basePct = totalReviews > 0 ? Math.min(90, 40 + Math.round((totalReviews / 50) * 50)) : 0;
  const pct = basePct;
  const level: 'High' | 'Medium' | 'Low' = pct >= 60 ? 'High' : pct >= 30 ? 'Medium' : 'Low';

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
    strengths,
    topIssue,
    issues,
    recommendations,
    reviews,
    confidence: {
      level,
      percentage: pct,
      note: `Based on ${totalReviews} reviews across Google and TripAdvisor.`,
    },
  };
}

// ---------------------------------------------------------------------------
// Logo (reused from Navbar, larger variant for landing page)
// ---------------------------------------------------------------------------
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="landing-logo-grad" x1="0" y1="0" x2="28" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C35E0" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect x="2" y="18" width="4.5" height="7" rx="1.5" fill="url(#landing-logo-grad)" />
      <rect x="8" y="13" width="4.5" height="12" rx="1.5" fill="url(#landing-logo-grad)" />
      <rect x="14" y="8" width="4.5" height="17" rx="1.5" fill="url(#landing-logo-grad)" />
      <rect x="20" y="3" width="4.5" height="22" rx="1.5" fill="url(#landing-logo-grad)" />
      <circle cx="22.25" cy="1.5" r="1.5" fill="#F97316" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Landing page — marketing splash, no Navbar
// ---------------------------------------------------------------------------
function LandingPage({
  onDemo,
  onAnalyze,
  onSignInSuccess,
}: {
  onDemo: () => void;
  onAnalyze: () => void;
  onSignInSuccess: (email: string) => void;
}) {
  const [showAuth, setShowAuth] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  function handleAuthSuccess(email: string) {
    setShowAuth(false);
    onSignInSuccess(email);
  }

  return (
    <div className="relative min-h-screen bg-[#0C0C18] overflow-hidden flex flex-col">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-float-blob absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="animate-float-blob-delay absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="animate-float-blob absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="text-base font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Analytiq</span>
            <span className="text-gray-200"> AI</span>
          </span>
        </div>
        <button
          onClick={() => setShowAuth(true)}
          className="text-sm font-medium text-gray-400 hover:text-gray-100 transition-colors"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4">
        <div
          className={`w-full max-w-2xl text-center transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 mb-8 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-gray-400 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time review intelligence for restaurants
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15]">
            Turn customer reviews into
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              your competitive edge
            </span>
          </h1>

          {/* Subtext */}
          <p className="mt-6 text-base sm:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Analytiq aggregates reviews from Google and TripAdvisor &mdash; then surfaces
            exactly what to fix and what to celebrate.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-semibold px-7 py-3.5 text-sm transition-all duration-150 hover:scale-[1.03] shadow-lg shadow-orange-500/25"
            >
              View live demo
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button
              onClick={onAnalyze}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-gray-100 font-semibold px-7 py-3.5 text-sm transition-all duration-150 hover:scale-[1.03] backdrop-blur-sm"
            >
              Start analysis
            </button>
          </div>

          {/* Social proof */}
          <p className="mt-10 text-xs text-gray-600">
            Trusted by independent restaurants &middot; No credit card required &middot; Results in under 2 minutes
          </p>
        </div>
      </main>

      {/* Feature strip */}
      <div className="relative z-10 border-t border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: '📊', label: 'Sentiment trends', desc: 'Track how guest mood shifts over time' },
            { icon: '✅', label: 'Strengths spotlight', desc: 'See exactly what keeps guests coming back' },
            { icon: '🎯', label: 'Prioritised fixes', desc: 'Know which issues drive the most impact' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="space-y-1">
              <div className="text-xl">{icon}</div>
              <p className="text-sm font-medium text-gray-300">{label}</p>
              <p className="text-xs text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {showAuth && (
        <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analyse form (live mode)
// ---------------------------------------------------------------------------
function AnalyzeForm({
  onBack,
  onDone,
  onDemo,
}: {
  onBack: () => void;
  onDone: (data: DashboardData) => void;
  onDemo?: () => void;
}) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeDetails, setPlaceDetails] = useState<{
    place_id: string;
    name: string;
    location: string;
  } | null>(null);

  // Progress tracking
  const [currentStage, setCurrentStage] = useState<ProgressStage>('google');
  const [stageStatuses, setStageStatuses] = useState<Record<ProgressStage, StageStatus>>({
    google: 'pending',
    tripadvisor: 'pending',
    yelp: 'pending',
    insights: 'pending',
    complete: 'pending',
  });
  const [stageMessages, setStageMessages] = useState<Record<ProgressStage, string>>({
    google: '',
    tripadvisor: '',
    yelp: '',
    insights: '',
    complete: '',
  });

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

  // Check if current input matches the selected place details
  const hasValidPlaceId = placeDetails &&
    placeDetails.name === name.trim() &&
    placeDetails.location === location.trim();

  // Process location to keep only last 3 segments (comma-separated)
  function processLocation(loc: string): string {
    const segments = loc.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (segments.length <= 3) {
      return loc.trim();
    }
    // Keep only last 3 segments
    return segments.slice(-3).join(', ');
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);

    // Reset progress
    setCurrentStage('google');
    setStageStatuses({
      google: 'pending',
      tripadvisor: 'pending',
      yelp: 'pending',
      insights: 'pending',
      complete: 'pending',
    });
    setStageMessages({
      google: '',
      tripadvisor: '',
      yelp: '',
      insights: '',
      complete: '',
    });

    // Process location to keep only last 3 segments
    const processedLocation = processLocation(location);

    try {
      const res = await analyzeRestaurantStream(
        name.trim(),
        processedLocation,
        hasValidPlaceId ? {
          place_id: placeDetails.place_id,
        } : undefined,
        (update: ProgressUpdate) => {
          // Update progress based on SSE events
          if (update.stage === 'error') {
            setError(update.message || 'An error occurred');
            return;
          }

          setCurrentStage(update.stage);

          // Update stage status
          setStageStatuses(prev => ({
            ...prev,
            [update.stage]: update.status,
          }));

          // Update stage message
          if (update.message) {
            setStageMessages(prev => ({
              ...prev,
              [update.stage]: update.message,
            }));
          }
        }
      );

      const uiData = mapToUi(res, name.trim(), processedLocation);
      const email = getSession();
      if (email) saveRestaurant(email, name.trim(), processedLocation);
      onDone(uiData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Handle manual input changes - clear place_id if user modifies the input
  function handleNameChange(value: string) {
    setName(value);
    // Clear place details if user manually changes the name
    if (placeDetails && value.trim() !== placeDetails.name) {
      setPlaceDetails(null);
    }
  }

  function handleLocationChange(value: string) {
    setLocation(value);
    // Clear place details if user manually changes the location
    if (placeDetails && value.trim() !== placeDetails.location) {
      setPlaceDetails(null);
    }
  }

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float-blob absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-500/20 dark:bg-violet-600/15 blur-3xl" />
          <div className="animate-float-blob-delay absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-400/20 dark:bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <button
            onClick={onBack}
            className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            Back
          </button>

          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-[#13131F]/80 backdrop-blur-sm border border-gray-100 dark:border-[#1E1E2E] rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Analysing reviews from Google &middot; TripAdvisor
            </div>
          </div>

          <Card padding="lg" className="shadow-xl dark:shadow-violet-950/20">
            <div className="mb-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent leading-tight">
                Know what to fix.<br />Before guests leave.
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enter your restaurant to get AI-powered insights from customer reviews in seconds.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <RestaurantAutocomplete
                label="Restaurant Name"
                placeholder="e.g. Boost Juice"
                value={name}
                onChange={handleNameChange}
                contextQuery={location}
                dropdownDirection="up"
                onPlaceSelect={(details) => {
                  setName(details.name);
                  setLocation(details.formatted_address);
                  setPlaceDetails({
                    place_id: details.place_id,
                    name: details.name,
                    location: details.formatted_address,
                  });
                }}
                isDisabled={isLoading}
              />
              <RestaurantAutocomplete
                label="Location / Address"
                placeholder="e.g. Monash Clayton"
                value={location}
                onChange={handleLocationChange}
                contextQuery={name}
                onPlaceSelect={(details) => {
                  setName(details.name);
                  setLocation(details.formatted_address);
                  setPlaceDetails({
                    place_id: details.place_id,
                    name: details.name,
                    location: details.formatted_address,
                  });
                }}
                isDisabled={isLoading}
              />

              {/* Progress bar - shown when loading */}
              {isLoading && (
                <div className="pt-4 pb-2">
                  <AnalysisProgressBar
                    currentStage={currentStage}
                    stageStatuses={stageStatuses}
                    stageMessages={stageMessages}
                  />
                </div>
              )}

              <div className="pt-2">
                <Button onClick={handleSubmit} isDisabled={!canSubmit} isLoading={isLoading} size="lg" fullWidth>
                  Connect &amp; Analyse
                </Button>
                {onDemo && (
                  <button
                    type="button"
                    onClick={onDemo}
                    className="mt-3 w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                  >
                    Or try with demo data →
                  </button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Root page — state machine
// ---------------------------------------------------------------------------
type View = 'landing' | 'analyze' | 'dashboard';

export default function Home() {
  const [view, setView] = useState<View>('landing');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const { setMode } = useAppMode();

  function handleViewDemo() {
    setMode('demo', 'The Meridian Kitchen');
    setDashboardData(demoDashboardData);
    setView('dashboard');
  }

  function handleStartAnalysis() {
    setMode('live');
    setView('analyze');
  }

  function handleSignInSuccess() {
    setMode('live');
    setView('analyze');
  }

  function handleAnalysisDone(data: DashboardData) {
    setDashboardData(data);
    setView('dashboard');
  }

  function handleBack() {
    setMode('live');
    setDashboardData(null);
    setView('analyze');
  }

  if (view === 'dashboard' && dashboardData) {
    return <DashboardView data={dashboardData} onBack={handleBack} />;
  }

  if (view === 'analyze') {
    return <AnalyzeForm onBack={() => setView('landing')} onDone={handleAnalysisDone} onDemo={handleViewDemo} />;
  }

  return (
    <LandingPage
      onDemo={handleViewDemo}
      onAnalyze={handleStartAnalysis}
      onSignInSuccess={handleSignInSuccess}
    />
  );
}
