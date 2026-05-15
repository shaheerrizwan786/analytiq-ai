'use client';

import { useState, useEffect } from 'react';
import { getSession, clearSession } from '@/lib/auth';
import { toggleTheme, getTheme, getVariant, setVariant, type Theme, type Variant } from '@/lib/theme';
import AuthModal from '@/components/auth/AuthModal';
import AccessibilityPanel from '@/components/ui/AccessibilityPanel';
import { useAppMode } from '@/lib/modeContext';

export default function Navbar() {
  const [session, setSession] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>('light');
  const [variant, setVariantState] = useState<Variant>('warm');
  const [showModal, setShowModal] = useState(false);
  const [showA11y, setShowA11y] = useState(false);
  const { mode, restaurantName } = useAppMode();

  useEffect(() => {
    setSession(getSession());
    setThemeState(getTheme());
    setVariantState(getVariant());
  }, []);

  function handleSignOut() {
    clearSession();
    setSession(null);
    window.location.reload();
  }

  function handleThemeToggle() {
    const next = toggleTheme();
    setThemeState(next);
  }

  function handleVariantToggle(v: Variant) {
    setVariant(v);
    setVariantState(v);
    // Warm theme is light-only — reflect that in state
    if (v === 'warm') setThemeState('light');
  }

  function handleAuthSuccess(email: string) {
    setSession(email);
    setShowModal(false);
  }

  return (
    <>
      <header className="relative z-20 w-full border-b border-gray-200/70 dark:border-[var(--dk-border)] bg-white/90 dark:bg-[var(--dk-bg)]/95 backdrop-blur-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo mark + wordmark */}
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" style={{ stopColor: 'var(--vt-from)' }}/>
                  <stop offset="100%" style={{ stopColor: 'var(--vt-to)' }}/>
                </linearGradient>
              </defs>
              <rect x="2" y="18" width="4.5" height="7" rx="1.5" fill="url(#logo-grad)"/>
              <rect x="8" y="13" width="4.5" height="12" rx="1.5" fill="url(#logo-grad)"/>
              <rect x="14" y="8" width="4.5" height="17" rx="1.5" fill="url(#logo-grad)"/>
              <rect x="20" y="3" width="4.5" height="22" rx="1.5" fill="url(#logo-grad)"/>
              <circle cx="22.25" cy="1.5" r="1.5" fill="var(--vt-spark)"/>
            </svg>
            <span className="text-sm font-semibold tracking-tight">
              <span className="vt-gradient-text">Analytiq</span>
              <span className="text-gray-900 dark:text-gray-100"> AI</span>
            </span>
            {restaurantName && (
              <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 truncate max-w-[140px]">
                {restaurantName}
              </span>
            )}
            {mode === 'demo' && (
              <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Demo
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Palette variant toggle — two coloured dots */}
            <div className="flex items-center gap-1.5" title="Switch colour palette">
              <button
                onClick={() => handleVariantToggle('warm')}
                aria-label="Warm palette"
                className={`w-3 h-3 rounded-full bg-[#9B2335] transition-all duration-200 ${variant === 'warm' ? 'ring-2 ring-offset-1 ring-[#9B2335] dark:ring-offset-[var(--dk-bg)] scale-110' : 'opacity-40 hover:opacity-70'}`}
              />
              <button
                onClick={() => handleVariantToggle('cool')}
                aria-label="Cool palette"
                className={`w-3 h-3 rounded-full bg-[#7C3AED] transition-all duration-200 ${variant === 'cool' ? 'ring-2 ring-offset-1 ring-[#7C3AED] dark:ring-offset-[var(--dk-bg)] scale-110' : 'opacity-40 hover:opacity-70'}`}
              />
            </div>

            {/* Dark mode toggle — only shown for cool palette */}
            {variant === 'cool' && (
            <button
              onClick={handleThemeToggle}
              aria-label="Toggle dark mode"
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            )}

            {/* Accessibility / settings */}
            <button
              onClick={() => setShowA11y((p) => !p)}
              aria-label="Open accessibility settings"
              aria-expanded={showA11y}
              className={`p-1.5 rounded-lg transition-colors ${showA11y ? 'bg-gray-100 dark:bg-[var(--dk-tint)] text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--dk-tint)] hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            </button>

            {/* Accessibility panel popover */}
            {showA11y && <AccessibilityPanel onClose={() => setShowA11y(false)} />}

            {/* Auth */}
            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate max-w-[160px]">
                  {session}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg btn-vt-cta text-white transition-all duration-150"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {showModal && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
