'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getFontSize, setFontSize, type FontSize,
  getHighContrast, setHighContrast,
  getReduceMotion, setReduceMotion,
} from '@/lib/a11y';

// ── Reusable toggle row ───────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
          value ? 'bg-[var(--accent)]' : 'bg-gray-200 dark:bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function AccessibilityPanel({ onClose }: { onClose: () => void }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('normal');
  const [highContrast, setHighContrastState] = useState(false);
  const [reduceMotion, setReduceMotionState] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFontSizeState(getFontSize());
    setHighContrastState(getHighContrast());
    setReduceMotionState(getReduceMotion());
  }, []);

  const handleClose = useCallback(onClose, [onClose]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handleClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [handleClose]);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [handleClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Accessibility and display settings"
      className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-gray-200 dark:border-[var(--dk-border)] bg-white dark:bg-[var(--dk-card)] shadow-xl shadow-black/10 dark:shadow-black/40 p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-0.5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Accessibility &amp; display</p>

      {/* Accessibility toggles */}
      <div className="divide-y divide-gray-100 dark:divide-white/5">
        <ToggleRow
          label="Large text"
          description="Increases base font size"
          value={fontSize === 'large'}
          onChange={(v) => {
            const next: FontSize = v ? 'large' : 'normal';
            setFontSize(next);
            setFontSizeState(next);
          }}
        />
        <ToggleRow
          label="High contrast"
          description="Stronger colour contrast"
          value={highContrast}
          onChange={(v) => { setHighContrast(v); setHighContrastState(v); }}
        />
        <ToggleRow
          label="Reduce motion"
          description="Disables animations and transitions"
          value={reduceMotion}
          onChange={(v) => { setReduceMotion(v); setReduceMotionState(v); }}
        />
      </div>


    </div>
  );
}
