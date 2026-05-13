const VT_KEY = 'ui:visual-theme';

export type VisualTheme = 'midnight' | 'bistro' | 'fresh';

export const VISUAL_THEMES: { id: VisualTheme; label: string; dot: string; desc: string }[] = [
  { id: 'midnight', label: 'Midnight', dot: '#7C3AED', desc: 'Violet & cyan' },
  { id: 'bistro',   label: 'Bistro',   dot: '#D97706', desc: 'Amber & rose' },
  { id: 'fresh',    label: 'Fresh',    dot: '#10B981', desc: 'Emerald & sky' },
];

export function getVisualTheme(): VisualTheme {
  if (typeof window === 'undefined') return 'midnight';
  const stored = localStorage.getItem(VT_KEY) as VisualTheme | null;
  return stored ?? 'midnight';
}

export function applyVisualTheme(vt: VisualTheme): void {
  if (typeof document === 'undefined') return;
  if (vt === 'midnight') {
    document.documentElement.removeAttribute('data-vt');
  } else {
    document.documentElement.setAttribute('data-vt', vt);
  }
}

export function setVisualTheme(vt: VisualTheme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VT_KEY, vt);
  applyVisualTheme(vt);
}
