import { useState } from 'react';
import { useLanguage } from '../utils/i18n';
import { supabase } from '../../../utils/supabase/client';
import { projectId } from '../../../utils/supabase/info';
import { getProfileLocation, recordDashboardLogin } from '../utils/dashboard-welcome';
import { createArtistProfileWithToken, createLabelProfileWithToken, getCurrentUserProfileWithToken, updateUserProfile } from '../utils/user-api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { AuthLayout } from './AuthLayout';
import { Music, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (userRole: string, userId: string) => void;
}

type PendingSignupProfile = {
  email: string;
  accountType: 'artist' | 'label';
  selectedPlan: string;
  firstName: string;
  lastName: string;
  artistName: string;
  country: string;
  bio: string;
  genres: string[];
  labelContactEmail?: string;
};

const PENDING_SIGNUP_PROFILE_KEY = 'pending_signup_profile';

function readPendingSignupProfile(): PendingSignupProfile | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSignupProfile;
  } catch {
    return null;
  }
}

function buildFallbackArtistName(value: string) {
  const normalized = value
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 'New Artist';
  }

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function Login({ onLogin }: LoginProps) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
    rememberMe: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let email = formData.emailOrUsername;
      
      // Check if input is username (not an email)
      if (!formData.emailOrUsername.includes('@')) {
        // For usernames, convert to email format
        // Special case for admin username
        if (formData.emailOrUsername === 'admin') {
          email = 'admin@amtmusik.com';
        } else {
          // For other usernames, append domain
          email = `${formData.emailOrUsername}@amtmusik.com`;
        }
      }

      // Sign in with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      });

      if (authError) {
        setError('Invalid email or password. Please check your credentials and try again.');
        setIsLoading(false);
        return;
      }

      if (!data.session || !data.user) {
        setError('Login failed: no session/user returned.');
        setIsLoading(false);
        return;
      }

      // Store session token
      sessionStorage.setItem('access_token', data.session.access_token);
      sessionStorage.setItem('user_id', data.user.id);

      // Fetch user profile to determine role
      let user;
      try {
        user = await getCurrentUserProfileWithToken(data.session.access_token);
      } catch (profileError: any) {
        const profileMessage = String(profileError?.message || '');
        const missingProfile = profileMessage.toLowerCase().includes('profile not found');

        if (!missingProfile) {
          console.error('Profile fetch error:', profileError);
          setError(profileMessage || 'Profile fetch failed.');
          setIsLoading(false);
          return;
        }

        try {
          const pendingSignup = readPendingSignupProfile();
          const normalizedLoginEmail = (data.user.email || email || '').trim().toLowerCase();
          const pendingMatchesLogin = pendingSignup && pendingSignup.email.trim().toLowerCase() === normalizedLoginEmail;

          if (pendingMatchesLogin && pendingSignup.accountType === 'label') {
            user = await createLabelProfileWithToken(data.session.access_token, {
              email: pendingSignup.email,
              labelName: pendingSignup.artistName,
              firstName: pendingSignup.firstName,
              lastName: pendingSignup.lastName,
              description: pendingSignup.bio,
            });
          } else {
            user = await createArtistProfileWithToken(data.session.access_token, {
              email: pendingMatchesLogin ? pendingSignup.email : (data.user.email || email),
              artistName: pendingMatchesLogin
                ? pendingSignup.artistName
                : buildFallbackArtistName(formData.emailOrUsername || data.user.email || email),
              firstName: pendingMatchesLogin ? pendingSignup.firstName : undefined,
              lastName: pendingMatchesLogin ? pendingSignup.lastName : undefined,
              subscriptionTier: pendingMatchesLogin
                ? (pendingSignup.selectedPlan === 'super_artist' ? 'super_artist' : pendingSignup.selectedPlan === 'partner' ? 'partner' : 'artist')
                : 'artist',
            });
          }

          if (pendingMatchesLogin) {
            await updateUserProfile({
              country: pendingSignup.country,
              bio: pendingSignup.bio,
              genres: pendingSignup.genres,
            });

            if (pendingSignup.accountType === 'label' && pendingSignup.labelContactEmail) {
              await updateUserProfile({
                socialLinks: {
                  website: `mailto:${pendingSignup.labelContactEmail}`,
                },
              });
            }

            sessionStorage.removeItem(PENDING_SIGNUP_PROFILE_KEY);
          }
        } catch (bootstrapError: any) {
          console.error('Profile bootstrap error:', bootstrapError);
          setError(bootstrapError?.message || 'We could not create your artist profile automatically.');
          setIsLoading(false);
          return;
        }
      }

      if (!user) {
        setError('Profile not found. Please complete signup first.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem('user_role', user.role);
      sessionStorage.setItem('user_subscription_tier', user.subscriptionTier || 'artist');
      recordDashboardLogin({
        userId: data.user.id,
        location: getProfileLocation(user),
      });

      if (data.user.user_metadata?.mustChangePassword === true) {
        sessionStorage.setItem('mustChangePassword', 'true');
        alert('This account is using a temporary password. You must change it before continuing.');
      } else {
        sessionStorage.removeItem('mustChangePassword');
      }

      // If user role is 'admin', fetch admin details
      if (user.role === 'admin') {
        try {
          const adminResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-79198001/admin/me`, {
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`,
            },
          });

          if (adminResponse.ok) {
            const { admin } = await adminResponse.json();
            if (admin) {
              sessionStorage.setItem('admin_role', admin.role);
              sessionStorage.setItem('admin_permissions', JSON.stringify(admin.permissions));
            }
          }
        } catch (adminError) {
          console.error('Admin details fetch error:', adminError);
        }
      }

      onLogin(user.role, data.user.id);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email/username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your dashboard"
      testimonialIndex={0}
    >
      {/* Error Banner */}
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="emailOrUsername" className="text-[#B3B3B3] text-sm">
            {t('login.email', 'Email or Username')} <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
            <Input
              id="emailOrUsername"
              name="emailOrUsername"
              type="text"
              autoFocus
              placeholder="you@example.com"
              className="pl-10 h-11 bg-[#111] border-white/10 text-white placeholder:text-[#555] focus:border-[#FF6B00]/60 transition-colors"
              value={formData.emailOrUsername}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[#B3B3B3] text-sm">
            {t('login.password', 'Password')} <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              className="pl-10 pr-11 h-11 bg-[#111] border-white/10 text-white placeholder:text-[#555] focus:border-[#FF6B00]/60 transition-colors"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#FF6B00] transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me + Forgot */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={formData.rememberMe}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, rememberMe: checked as boolean })
              }
            />
            <label htmlFor="rememberMe" className="text-xs cursor-pointer text-[#B3B3B3] select-none">
              {t('login.rememberMe', 'Remember me')}
            </label>
          </div>
          <a
            href="/forgot-password"
            className="text-xs text-[#FF6B00] hover:text-[#FFD600] transition-colors underline underline-offset-2"
          >
            {t('login.forgotPassword', 'Forgot password?')}
          </a>
        </div>

        {/* Sign In Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold transition-all"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {t('login.signIn', 'Sign In')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-[#555] text-xs">or continue with</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* Social Login */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 border-white/10 bg-[#111] text-[#B3B3B3] hover:bg-[#1a1a1a] hover:text-white hover:border-white/20 transition-all"
          onClick={handleGoogleSignIn}
        >
          <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled
          className="w-full h-11 border-white/10 bg-[#111] text-[#555] cursor-not-allowed transition-all"
        >
          <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Continue with Apple <span className="text-xs ml-1 opacity-50">(coming soon)</span>
        </Button>
      </div>

      {/* Sign Up */}
      <p className="mt-6 text-center text-sm text-[#B3B3B3]">
        {t('login.noAccount', "Don't have an account?")}{' '}
        <a href="/get-started" className="text-[#FF6B00] hover:text-[#FFD600] font-medium underline underline-offset-2 transition-colors">
          {t('login.signUp', 'Create an account')}
        </a>
      </p>

      {/* Terms */}
      <p className="mt-3 text-center text-xs text-[#555]">
        By signing in, you agree to our{' '}
        <a href="/terms-conditions" className="text-[#FF6B00]/80 hover:text-[#FF6B00] underline underline-offset-2">Terms</a>
        {' '}and{' '}
        <a href="/privacy-policy" className="text-[#FF6B00]/80 hover:text-[#FF6B00] underline underline-offset-2">Privacy Policy</a>.
      </p>
    </AuthLayout>
  );
}
