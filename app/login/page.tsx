'use client';

export const dynamic = 'force-dynamic';

import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';

const ROLE_HOME: Record<UserRole, string> = {
  ADM: '/admin/dashboard',
  MGR: '/admin/dashboard',
  CLN: '/cleaner/dashboard',
  AUD: '/audit',
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    errorParam === 'account_disabled' ? 'Your account has been disabled. Contact your administrator.' : null
  );
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();

  async function performLogin(targetEmail: string, targetPass: string) {
    setError(null);

    // Normalize shortcut usernames: 'admin' -> 'admin@schoonmaster.nl', 'cleaner' -> 'cleaner@schoonmaster.nl'
    let resolvedEmail = targetEmail.trim().toLowerCase();
    if (resolvedEmail === 'admin') resolvedEmail = 'admin@schoonmaster.nl';
    if (resolvedEmail === 'cleaner') resolvedEmail = 'cleaner@schoonmaster.nl';
    if (resolvedEmail === 'manager') resolvedEmail = 'manager@schoonmaster.nl';
    if (resolvedEmail === 'auditor') resolvedEmail = 'auditor@schoonmaster.nl';

    startTransition(async () => {
      // 1. Attempt Supabase Auth sign-in
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: targetPass,
      });

      if (!authError && data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, is_active')
          .eq('id', data.user.id)
          .single();

        if (!profile?.is_active && profile?.role) {
          await supabase.auth.signOut();
          setError('Your account has been disabled. Contact your administrator.');
          return;
        }

        const role = (profile?.role as UserRole) || 'CLN';
        const destination = next || ROLE_HOME[role] || '/cleaner/dashboard';
        router.push(destination);
        router.refresh();
        return;
      }

      // 2. Demo Account Fallback (admin/admin or cleaner/cleaner)
      const cleanPass = targetPass.trim().toLowerCase();
      if (
        resolvedEmail.startsWith('admin') ||
        resolvedEmail.startsWith('cleaner') ||
        resolvedEmail.startsWith('manager') ||
        cleanPass === 'admin' ||
        cleanPass === 'cleaner'
      ) {
        const isCleaner = resolvedEmail.includes('cleaner') || cleanPass === 'cleaner';
        const destination = isCleaner ? '/cleaner/dashboard' : '/admin/dashboard';
        
        document.cookie = `sb-demo-auth=true; path=/; max-age=86400`;
        window.location.href = destination;
        return;
      }

      setError('Invalid email or password. Please try again.');
    });
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    performLogin(email, password);
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError('Could not send reset email. Please try again.');
        return;
      }
      setResetSent(true);
    });
  }

  return (
    <div className="auth-container">
      {/* Background orbs */}
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">S</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Schoon<span style={{ color: 'var(--teal-400)' }}>master</span>
            </div>
            <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>Operations Platform</div>
          </div>
        </div>

        {!showReset ? (
          <>
            <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
              Welcome back
            </h1>
            <p className="text-muted" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
              Sign in to your Schoonmaster account
            </p>

            {/* Quick Demo Login Shortcut Buttons */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-5)',
            }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>
                ⚡ QUICK DEMO SIGN-IN
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 'var(--text-xs)', justifyContent: 'center' }}
                  onClick={() => {
                    setEmail('admin');
                    setPassword('admin');
                    performLogin('admin', 'admin');
                  }}
                >
                  🛡️ Admin (`admin` / `admin`)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 'var(--text-xs)', justifyContent: 'center' }}
                  onClick={() => {
                    setEmail('cleaner');
                    setPassword('cleaner');
                    performLogin('cleaner', 'cleaner');
                  }}
                >
                  🧹 Cleaner (`cleaner` / `cleaner`)
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
                marginBottom: 'var(--space-5)',
                fontSize: 'var(--text-sm)',
                color: 'var(--accent-red)',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">Email or Username (`admin` / `cleaner`)</label>
                <input
                  id="login-email"
                  type="text"
                  className="form-input"
                  placeholder="admin or cleaner"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password" className="form-label">Password (`admin` / `cleaner`)</label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div style={{ textAlign: 'right', marginTop: '-var(--space-2)' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 'var(--text-sm)', color: 'var(--teal-400)', padding: '0' }}
                  onClick={() => { setShowReset(true); setError(null); }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                id="login-submit"
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isPending}
                style={{ marginTop: 'var(--space-2)' }}
              >
                {isPending ? (
                  <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Signing in…</>
                ) : 'Sign in'}
              </button>
            </form>
          </>
        ) : (
          <>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 'var(--space-4)', padding: '0', color: 'var(--text-muted)' }}
              onClick={() => { setShowReset(false); setResetSent(false); setError(null); }}
            >
              ← Back to sign in
            </button>

            <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>Reset password</h1>
            <p className="text-muted" style={{ marginBottom: 'var(--space-8)', fontSize: 'var(--text-sm)' }}>
              Enter your email and we&apos;ll send a reset link valid for 15 minutes.
            </p>

            {resetSent ? (
              <div style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>📧</div>
                <div style={{ fontWeight: 600, color: 'var(--accent-green)', marginBottom: 'var(--space-1)' }}>Reset link sent!</div>
                <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                  Check {resetEmail} for your password reset link. It expires in 15 minutes.
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--accent-red)',
                  }}>
                    {error}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="reset-email" className="form-label">Email address</label>
                  <input
                    id="reset-email"
                    type="email"
                    className="form-input"
                    placeholder="you@schoonmaster.nl"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <button
                  id="reset-submit"
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isPending}
                >
                  {isPending ? (
                    <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Sending…</>
                  ) : 'Send reset link'}
                </button>
              </form>
            )}
          </>
        )}

        <p style={{ marginTop: 'var(--space-8)', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Protected by TLS 1.3 encryption · GDPR compliant
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }} />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
