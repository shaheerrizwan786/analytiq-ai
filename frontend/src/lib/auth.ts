/**
 * Frontend-only MVP authentication.
 * Passwords are hashed with bcryptjs — secure for demo use.
 * Session stored in sessionStorage (clears on browser close).
 * User data stored in localStorage.
 *
 * NOTE: This is NOT a replacement for backend auth in production.
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoredUser {
  email: string;
  passwordHash: string;
}

interface SavedRestaurant {
  name: string;
  location: string;
}

// ─── Keys ────────────────────────────────────────────────────────────────────

function userKey(email: string) {
  return `auth:user:${email.toLowerCase().trim()}`;
}

function restaurantKey(email: string) {
  return `auth:restaurant:${email.toLowerCase().trim()}`;
}

function attemptsKey(email: string) {
  return `auth:attempts:${email.toLowerCase().trim()}`;
}

const SESSION_KEY = 'auth:session';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000; // 30 seconds

interface AttemptsRecord {
  count: number;
  lockedUntil: number; // epoch ms
}

function getAttempts(email: string): AttemptsRecord {
  try {
    const raw = localStorage.getItem(attemptsKey(email));
    if (raw) return JSON.parse(raw) as AttemptsRecord;
  } catch { /* ignore */ }
  return { count: 0, lockedUntil: 0 };
}

function setAttempts(email: string, record: AttemptsRecord): void {
  localStorage.setItem(attemptsKey(email), JSON.stringify(record));
}

function clearAttempts(email: string): void {
  localStorage.removeItem(attemptsKey(email));
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function registerUser(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = userKey(email);
  if (localStorage.getItem(key)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user: StoredUser = { email: email.toLowerCase().trim(), passwordHash };
  localStorage.setItem(key, JSON.stringify(user));
  return { ok: true };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = userKey(email);
  const raw = localStorage.getItem(key);
  if (!raw) {
    return { ok: false, error: 'No account found with this email.' };
  }

  // Brute-force protection
  const attempts = getAttempts(email);
  if (attempts.lockedUntil > Date.now()) {
    const secsLeft = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    return { ok: false, error: `Too many failed attempts. Try again in ${secsLeft}s.` };
  }

  const user: StoredUser = JSON.parse(raw);
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    const newCount = attempts.count + 1;
    const lockedUntil = newCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
    setAttempts(email, { count: newCount, lockedUntil });
    return { ok: false, error: 'Incorrect password.' };
  }

  clearAttempts(email);
  return { ok: true };
}

// ─── Session ─────────────────────────────────────────────────────────────────

export function setSession(email: string): void {
  sessionStorage.setItem(SESSION_KEY, email.toLowerCase().trim());
}

export function getSession(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// ─── Saved restaurant (per user) ─────────────────────────────────────────────

export function saveRestaurant(email: string, name: string, location: string): void {
  const data: SavedRestaurant = { name, location };
  localStorage.setItem(restaurantKey(email), JSON.stringify(data));
}

export function getSavedRestaurant(email: string): SavedRestaurant | null {
  const raw = localStorage.getItem(restaurantKey(email));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedRestaurant;
  } catch {
    return null;
  }
}
