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

const SESSION_KEY = 'auth:session';

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
  const user: StoredUser = JSON.parse(raw);
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { ok: false, error: 'Incorrect password.' };
  }
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
