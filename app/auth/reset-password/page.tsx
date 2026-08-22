'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // Supabase sends the token via URL hash fragment — listen for auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User has clicked the reset link — form is now active
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Failed to update password. The link may have expired.');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    });
  }

  return (
    <div className="auth-container">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">S</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Schoon<span style={{ color: 'var(--teal-400)' }}>master</span>
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>✅</div>
            <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>Password updated!</h1>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>Set new password</h1>
            <p className="text-muted" style={{ marginBottom: 'var(--space-8)', fontSize: 'var(--text-sm)' }}>
              Choose a strong password for your account.
            </p>

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

            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label htmlFor="new-password" className="form-label">New password</label>
                <input
                  id="new-password"
                  type="password"
                  className="form-input"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password" className="form-label">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="form-input"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                id="set-password-submit"
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isPending}
                style={{ marginTop: 'var(--space-2)' }}
              >
                {isPending ? (
                  <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Updating…</>
                ) : 'Set new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
