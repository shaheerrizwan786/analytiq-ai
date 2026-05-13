/**
 * Theme management — light / dark mode + warm / cool palette variant.
 * Persists choices in localStorage, applies `dark` class and `data-vt` attr to <html>.
 */

const THEME_KEY = 'ui:theme';
const VARIANT_KEY = 'ui:variant';

export type Theme = 'light' | 'dark';
export type Variant = 'warm' | 'cool';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem(THEME_KEY) as Theme) ?? 'light';
}

export function getVariant(): Variant {
  if (typeof window === 'undefined') return 'warm';
  return (localStorage.getItem(VARIANT_KEY) as Variant) ?? 'warm';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function setVariant(variant: Variant): void {
  localStorage.setItem(VARIANT_KEY, variant);
  if (variant === 'cool') {
    document.documentElement.setAttribute('data-vt', 'cool');
  } else {
    document.documentElement.removeAttribute('data-vt');
  }
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function applyPersistedTheme(): void {
  const theme = (localStorage.getItem(THEME_KEY) as Theme) ?? 'light';
  const variant = (localStorage.getItem(VARIANT_KEY) as Variant) ?? 'warm';
  if (theme === 'dark') document.documentElement.classList.add('dark');
  if (variant === 'cool') document.documentElement.setAttribute('data-vt', 'cool');
}
