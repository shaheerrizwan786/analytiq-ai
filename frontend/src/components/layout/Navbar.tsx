'use client';

import { useState, useEffect } from 'react';
import { getSession, clearSession } from '@/lib/auth';
import { toggleTheme, getTheme, type Theme } from '@/lib/theme';
import AuthModal from '@/components/auth/AuthModal';
import { useAppMode } from '@/lib/modeContext';

export default function Navbar() {
  const [session, setSession] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>('light');
  const [showModal, setShowModal] = useState(false);
  const { mode, restaurantName } = useAppMode();

  useEffect(() => {
    setSession(getSession());
    setThemeState(getTheme());
  }, []);

  function handleSignOut() {
    clearSession();
    setSession(null);
    // Reload so page.tsx re-checks session and clears auto-fill
    window.location.reload();
  }

  function handleThemeToggle() {
    const next = toggleTheme();
    setThemeState(next);
  }

  function handleAuthSuccess(email: string) {
    setSession(email);
    setShowModal(false);
  }

  return (
    <>
      <header className="w-full border-b border-gray-200/70 dark:border-[#3D1C20] bg-white/90 dark:bg-[#1A0C0E]/95 backdrop-blur-sm transition-colors">
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
              {/* 4 ascending bars */}
              <rect x="2" y="18" width="4.5" height="7" rx="1.5" fill="url(#logo-grad)"/>
              <rect x="8" y="13" width="4.5" height="12" rx="1.5" fill="url(#logo-grad)"/>
              <rect x="14" y="8" width="4.5" height="17" rx="1.5" fill="url(#logo-grad)"/>
              <rect x="20" y="3" width="4.5" height="22" rx="1.5" fill="url(#logo-grad)"/>
              {/* Spark above tallest bar */}
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

          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={handleThemeToggle}
              aria-label="Toggle dark mode"
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === 'dark' ? (
                /* Sun icon */
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              ) : (
                /* Moon icon */
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

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
