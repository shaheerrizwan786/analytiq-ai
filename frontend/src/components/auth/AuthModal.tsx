'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { registerUser, loginUser, setSession } from '@/lib/auth';

interface AuthModalProps {
  onSuccess: (email: string) => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function validate(): string | null {
    if (!email.includes('@') || !email.includes('.')) return 'Enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (mode === 'register' && password !== confirm) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setIsLoading(true);
    setError(null);

    const result = mode === 'register'
      ? await registerUser(email.trim(), password)
      : await loginUser(email.trim(), password);

    setIsLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSession(email.trim());
    onSuccess(email.trim());
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card padding="lg" className="w-full max-w-sm mx-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'signin'
              ? 'Welcome back — sign in to continue.'
              : 'Create an account to save your restaurants.'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            isDisabled={isLoading}
          />
          <Input
            type="password"
            label="Password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={setPassword}
            isDisabled={isLoading}
          />
          {mode === 'register' && (
            <Input
              type="password"
              label="Confirm password"
              placeholder="Repeat password"
              value={confirm}
              onChange={setConfirm}
              isDisabled={isLoading}
            />
          )}

          <div className="pt-1">
            <Button
              onClick={handleSubmit}
              isLoading={isLoading}
              isDisabled={!email || !password || (mode === 'register' && !confirm)}
              fullWidth
              size="lg"
            >
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </div>
        </div>

        {/* Toggle */}
        <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError(null); }}
            className="font-medium text-gray-900 dark:text-gray-100 underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            {mode === 'signin' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </Card>
    </div>
  );
}
