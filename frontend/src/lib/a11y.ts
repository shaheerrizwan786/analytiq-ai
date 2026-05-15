'use client';

export type FontSize = 'normal' | 'large';

const KEYS = {
  font:     'a11y:font',
  contrast: 'a11y:contrast',
  motion:   'a11y:motion',
  demo:     'a11y:demo',
} as const;

function applyFont(size: FontSize) {
  if (size === 'large') {
    document.documentElement.setAttribute('data-font', 'large');
  } else {
    document.documentElement.removeAttribute('data-font');
  }
}

function applyContrast(on: boolean) {
  if (on) document.documentElement.setAttribute('data-contrast', 'high');
  else    document.documentElement.removeAttribute('data-contrast');
}

function applyMotion(reduced: boolean) {
  if (reduced) document.documentElement.setAttribute('data-motion', 'reduced');
  else         document.documentElement.removeAttribute('data-motion');
}

function applyDemo(on: boolean) {
  if (on) document.documentElement.setAttribute('data-demo', 'on');
  else    document.documentElement.removeAttribute('data-demo');
}

// ── Getters ──────────────────────────────────────────────────────────────────

export function getFontSize(): FontSize {
  if (typeof window === 'undefined') return 'normal';
  return (localStorage.getItem(KEYS.font) as FontSize) ?? 'normal';
}

export function getHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEYS.contrast) === 'true';
}

export function getReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEYS.motion) === 'true';
}

export function getDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEYS.demo) === 'true';
}

// ── Setters ──────────────────────────────────────────────────────────────────

export function setFontSize(size: FontSize) {
  localStorage.setItem(KEYS.font, size);
  applyFont(size);
}

export function setHighContrast(on: boolean) {
  localStorage.setItem(KEYS.contrast, String(on));
  applyContrast(on);
}

export function setReduceMotion(on: boolean) {
  localStorage.setItem(KEYS.motion, String(on));
  applyMotion(on);
}

export function setDemoMode(on: boolean) {
  localStorage.setItem(KEYS.demo, String(on));
  applyDemo(on);
}

// ── Init (call once on mount to restore persisted settings) ──────────────────

export function initA11y() {
  if (typeof window === 'undefined') return;
  applyFont(getFontSize());
  applyContrast(getHighContrast());
  applyMotion(getReduceMotion());
  applyDemo(getDemoMode());
}
