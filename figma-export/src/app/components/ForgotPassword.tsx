import { useState } from 'react';
import { supabase } from '../../../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AuthLayout } from './AuthLayout';
import { Mail, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface ForgotPasswordProps {
  onBack?: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (resetError) {
        throw resetError;
      }

      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={sent ? 'Check your inbox' : 'Forgot password?'}
      subtitle={sent ? `We sent a reset link to ${email.trim().toLowerCase()}` : "Enter your email and we'll send you a reset link."}
      testimonialIndex={1}
    >
      {sent ? (
        /* â”€â”€ Success â”€â”€ */
        <div className="text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div className="rounded-xl border border-white/8 bg-[#111] px-4 py-3 text-sm text-[#B3B3B3] text-left space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              Check your email for a reset link
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              The link expires in 24 hours
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10"
            onClick={() => { setSent(false); setError(''); }}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Try a different email
          </Button>
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-[#555] hover:text-[#B3B3B3] underline"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        /* â”€â”€ Form â”€â”€ */
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fp-email" className="text-[#B3B3B3] text-sm">
              Email Address <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
              <Input
                id="fp-email"
                type="email"
                autoFocus
                placeholder="you@example.com"
                className="pl-10 h-11 bg-[#111] border-white/10 text-white placeholder:text-[#555] focus:border-[#FF6B00]/60"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Send Reset Link <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>

          <button
            type="button"
            onClick={handleBack}
            className="w-full flex items-center justify-center gap-2 text-sm text-[#555] hover:text-[#B3B3B3] transition-colors py-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
