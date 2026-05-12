import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase/client';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Music, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ResetPasswordProps {
  onDone?: () => void;
}

export function ResetPassword({ onDone }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    // Supabase embeds the recovery token in the URL hash.
    // onAuthStateChange fires PASSWORD_RECOVERY once it parses the hash.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if already in an active recovery session (page refresh edge case)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      }
    });

    // If after 5 s there's still no session, the link is invalid/expired
    const timeout = setTimeout(() => {
      setSessionReady((prev) => {
        if (!prev) {
          setSessionError('This reset link has expired or is invalid. Please request a new one.');
        }
        return prev;
      });
    }, 5000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const navigateToLogin = () => {
    if (onDone) {
      onDone();
    } else {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      // Auto-redirect after 3 s
      setTimeout(navigateToLogin, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FFD600] shadow-[0_8px_32px_rgba(255,107,0,0.35)]">
          <Music className="h-7 w-7 text-white" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF6B00]">AMT DISTRO</p>
      </div>

      <Card className="w-full max-w-md border border-[#FF6B00]/20 bg-[#161616] p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        {done ? (
          /* -- Success -- */
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#00FFA3]/12">
              <CheckCircle2 className="h-8 w-8 text-[#00FFA3]" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold text-white">Password updated!</h1>
            <p className="mb-6 text-sm text-[#B3B3B3]">
              Your password has been changed successfully. Redirecting you to sign in…
            </p>
            <Button
              type="button"
              className="w-full bg-[#FF6B00] text-white hover:bg-[#ff7f26]"
              onClick={navigateToLogin}
            >
              Go to Sign In
            </Button>
          </div>
        ) : sessionError ? (
          /* -- Expired / invalid link -- */
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/12">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold text-white">Link expired</h1>
            <p className="mb-6 text-sm text-[#B3B3B3]">{sessionError}</p>
            <Button
              type="button"
              className="w-full bg-[#FF6B00] text-white hover:bg-[#ff7f26]"
              onClick={() => {
                window.history.pushState({}, '', '/forgot-password');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            >
              Request a new link
            </Button>
          </div>
        ) : !sessionReady ? (
          /* -- Verifying token -- */
          <div className="flex flex-col items-center py-6 text-center">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#FF6B00]" />
            <p className="text-sm text-[#B3B3B3]">Verifying your reset link…</p>
          </div>
        ) : (
          /* -- New password form -- */
          <>
            <div className="mb-7">
              <h1 className="mb-1.5 text-2xl font-semibold text-white">Set a new password</h1>
              <p className="text-sm text-[#B3B3B3]">
                Choose a strong password for your AMT DISTRO account.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[#B3B3B3]">
                  New password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 pr-10 text-white placeholder:text-[#444] focus:border-[#FF6B00]/60 focus:ring-[#FF6B00]/20"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#B3B3B3] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm font-medium text-[#B3B3B3]">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
                  <Input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 pr-10 text-white placeholder:text-[#444] focus:border-[#FF6B00]/60 focus:ring-[#FF6B00]/20"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#B3B3B3] transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Strength hint */}
              {password.length > 0 && (
                <p className={`text-xs ${password.length >= 8 ? 'text-[#00FFA3]' : 'text-red-400'}`}>
                  {password.length >= 8 ? '? Strong enough' : `${8 - password.length} more character${8 - password.length !== 1 ? 's' : ''} needed`}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full bg-[#FF6B00] text-white hover:bg-[#ff7f26] disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          </>
        )}
      </Card>
    </section>
  );
}
