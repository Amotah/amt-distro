import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../utils/supabase/client';
import {
  createArtistProfileWithToken,
  createLabelProfileWithToken,
  updateUserProfile,
} from '../utils/user-api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { AuthLayout } from './AuthLayout';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Upload,
  User,
  X,
} from 'lucide-react';

type SignupPlan = {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
};

type BackendRegisterUser = {
  _id?: string;
  id?: string;
  role: string;
};

type BackendRegisterResponse = {
  token: string;
  dashboardPath?: string;
  user: BackendRegisterUser;
};

type GetStartedProps = {
  initialPlanId: string;
  onComplete: (plan: { id: string; name: string; price: string; period: string }) => void;
};

const ACCOUNT_TYPES = [
  {
    id: 'artist',
    label: "I'm an Artist",
    description: 'Distribute your music and grow your audience worldwide.',
    icon: User,
  },
  {
    id: 'label',
    label: "I'm a Label / Manager",
    description: 'Manage multiple artists, releases, and royalties in one place.',
    icon: Building,
  },
] as const;

const PLAN_OPTIONS: SignupPlan[] = [
  {
    id: 'artist',
    name: 'Go-Artist',
    price: 'NGN 15,000',
    period: 'release',
    features: ['150+ platforms', 'Basic analytics', 'Keep 100% royalties', 'ISRC + UPC included'],
  },
  {
    id: 'super_artist',
    name: 'Super Artist',
    price: 'NGN 25,000',
    period: 'release',
    features: ['All Go-Artist features', 'Advanced analytics', 'Priority support', 'Smart links'],
    recommended: true,
  },
  {
    id: 'partner',
    name: 'Label / Partner',
    price: 'NGN 40,000',
    period: 'month',
    features: ['All Super Artist features', 'Label dashboard', 'Multi-artist management', 'Revenue split tools'],
  },
];

const GENRES = [
  'Afrobeats',
  'Afropop',
  'Amapiano',
  'R&B / Soul',
  'Hip-Hop / Rap',
  'Pop',
  'Gospel',
  'Highlife',
  'Dancehall / Reggae',
  'Electronic / Dance',
  'Jazz',
  'Classical',
  'Country',
  'Rock',
  'Alternative',
  'Other',
];

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  artistName: string;
  country: string;
};

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
const configuredApiBaseUrl = (((import.meta as any).env?.VITE_AMT_DISTRO_API_BASE_URL as string) || '').trim().replace(/\/$/, '');
const usesDeprecatedSupabaseAuth = configuredApiBaseUrl.includes('supabase.co');

const BACKEND_API_BASE_URL = configuredApiBaseUrl && !usesDeprecatedSupabaseAuth
  ? configuredApiBaseUrl
  : 'https://amt-distro-api.vercel.app';

function calcStrength(password: string) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function isNetworkFetchError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes('failed to fetch')
    || normalizedMessage.includes('networkerror')
    || normalizedMessage.includes('network error')
    || normalizedMessage.includes('cors')
    || normalizedMessage.includes('fetch failed')
  );
}

export function GetStarted({ initialPlanId, onComplete }: GetStartedProps) {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<'artist' | 'label'>('artist');
  const [selectedPlan, setSelectedPlan] = useState(initialPlanId || 'artist');

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    artistName: '',
    country: '',
  });

  const [bio, setBio] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [genreOpen, setGenreOpen] = useState(false);
  const [labelContactEmail, setLabelContactEmail] = useState('');

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const [submitError, setSubmitError] = useState('');
  const [confirmationNotice, setConfirmationNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const pwStrength = calcStrength(formData.password);

  useEffect(() => {
    setSelectedPlan(initialPlanId || 'artist');
  }, [initialPlanId]);

  useEffect(() => {
    if (selectedPlan === 'partner') {
      setAccountType('label');
    }
  }, [selectedPlan]);

  const filteredPlans = useMemo(
    () => PLAN_OPTIONS.filter((p) => (accountType === 'label' ? p.id === 'partner' : p.id !== 'partner')),
    [accountType],
  );

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [resendCooldownSeconds]);

  const startResendCooldown = (seconds = 60) => {
    setResendCooldownSeconds(seconds);
  };

  const isEmailRateLimited = (message: string) => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('rate limit')
      || normalized.includes('too many requests')
      || normalized.includes('over_email_send_rate_limit')
      || normalized.includes('security purposes')
    );
  };

  const getRetryDelaySeconds = (message: string) => {
    const lower = message.toLowerCase();
    const minutesMatch = lower.match(/(\d+)\s*minute/);
    if (minutesMatch?.[1]) {
      return Math.max(60, Number(minutesMatch[1]) * 60);
    }

    const secondsMatch = lower.match(/(\d+)\s*second/);
    if (secondsMatch?.[1]) {
      return Math.max(30, Number(secondsMatch[1]));
    }

    return 60;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (submitError) setSubmitError('');
    if (confirmationNotice) setConfirmationNotice('');
  };

  const handleResendConfirmation = async () => {
    if (!formData.email.trim()) {
      setSubmitError('Enter your email address to resend the confirmation email.');
      return;
    }

    if (resendCooldownSeconds > 0) {
      setConfirmationNotice(`Please wait ${resendCooldownSeconds}s before requesting another verification email.`);
      return;
    }

    setSubmitError('');
    setIsResendingConfirmation(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      startResendCooldown(60);
      setConfirmationNotice('A new confirmation email has been sent. Verify your email, then log in to continue.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resend confirmation email.';
      if (isEmailRateLimited(message)) {
        const retryAfter = getRetryDelaySeconds(message);
        startResendCooldown(retryAfter);
        setConfirmationNotice(`Email rate limit reached. Please wait ${retryAfter}s, then try again.`);
        return;
      }
      setSubmitError(message);
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  const handleProfilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const validateStep3 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password.trim()) {
      setSubmitError('Complete all required account details before continuing.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setSubmitError('Passwords do not match.');
      return false;
    }
    if (pwStrength < 2) {
      setSubmitError('Use a stronger password (8+ chars, uppercase and number).');
      return false;
    }
    setSubmitError('');
    return true;
  };

  const handleReview = () => {
    if (!formData.artistName.trim() || !formData.country.trim()) {
      setSubmitError('Complete all required profile fields before review.');
      return;
    }
    if (!profileFile && !profilePreview) {
      setSubmitError('Upload a profile image or label logo before review.');
      return;
    }
    if (!bio.trim()) {
      setSubmitError('Bio is required.');
      return;
    }
    if (genres.length === 0) {
      setSubmitError('Select at least one genre.');
      return;
    }
    setSubmitError('');
    setStep(5);
  };

  const handleCreateAccount = async () => {
    setSubmitError('');
    setConfirmationNotice('');

    if (!agreeTerms) {
      setSubmitError('You must agree to the Terms of Service to continue.');
      return;
    }

    const isLabelPlan = selectedPlan === 'partner' || accountType === 'label';
    const subscriptionTier = isLabelPlan
      ? 'partner'
      : selectedPlan === 'super_artist'
      ? 'super_artist'
      : 'artist';

    const pendingSignupProfile: PendingSignupProfile = {
      email: formData.email.trim(),
      accountType: isLabelPlan ? 'label' : 'artist',
      selectedPlan,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      artistName: formData.artistName.trim(),
      country: formData.country,
      bio: bio.trim(),
      genres,
      labelContactEmail: labelContactEmail.trim() || undefined,
    };

    setIsSubmitting(true);

    try {
      const registerResponse = await fetch(`${BACKEND_API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: isLabelPlan ? 'label' : 'artist',
        }),
      });

      if (!registerResponse.ok) {
        const backendError = await registerResponse.json().catch(() => null) as { message?: string } | null;
        const backendMessage = (backendError?.message || '').toLowerCase();

        if (registerResponse.status === 409 || backendMessage.includes('duplicate')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        throw new Error(backendError?.message || 'Unable to create your account.');
      }

      const registerData = await registerResponse.json() as BackendRegisterResponse;
      const backendUserId = registerData.user?._id || registerData.user?.id;

      if (!registerData.token || !backendUserId) {
        throw new Error('Account created, but authentication data is incomplete. Please sign in.');
      }

      const normalizedRole = registerData.user.role === 'partner' ? 'label' : registerData.user.role;
      sessionStorage.setItem('access_token', registerData.token);
      sessionStorage.setItem('user_id', backendUserId);
      sessionStorage.setItem('user_role', normalizedRole);
      sessionStorage.setItem('user_subscription_tier', subscriptionTier);
      sessionStorage.removeItem(PENDING_SIGNUP_PROFILE_KEY);

      const selectedPlanData = PLAN_OPTIONS.find((p) => p.id === selectedPlan) ?? PLAN_OPTIONS[0];
      onComplete({
        id: selectedPlanData.id,
        name: selectedPlanData.name,
        price: selectedPlanData.price,
        period: selectedPlanData.period,
      });

      setIsConfirmed(true);

      setTimeout(() => {
        const nextPath = registerData.dashboardPath || (isLabelPlan ? '/label-dashboard' : '/dashboard');
        window.history.pushState({}, '', nextPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 900);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create your account.';
      if (isNetworkFetchError(message)) {
        sessionStorage.setItem(PENDING_SIGNUP_PROFILE_KEY, JSON.stringify(pendingSignupProfile));
      }
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    '',
    'Create your account',
    'Choose your plan',
    'Account details',
    accountType === 'label' ? 'Label profile' : 'Artist profile',
    'Review and create',
  ];

  const stepSubs = [
    '',
    'Choose the role that matches your workflow.',
    'Pick a plan that fits your goals.',
    'Add your login details.',
    accountType === 'label'
      ? 'Add your logo, label name, bio, genres, and country.'
      : 'Add your profile photo, artist name, bio, genres, and country.',
    'Confirm everything, then create your account.',
  ];

  if (isConfirmed) {
    return (
      <AuthLayout title="You are all set" subtitle="Your account has been created successfully." testimonialIndex={2}>
        <div className="text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <p className="text-[#B3B3B3] text-sm">Redirecting you to your dashboard...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={stepTitles[step]} subtitle={stepSubs[step]} testimonialIndex={step - 1}>
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  done
                    ? 'bg-[#FF6B00] text-white'
                    : active
                    ? 'bg-[#FF6B00]/20 border border-[#FF6B00] text-[#FF6B00]'
                    : 'bg-[#1a1a1a] border border-white/10 text-[#555]'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              {i < 4 && <div className={`h-px w-7 ${step > n ? 'bg-[#FF6B00]' : 'bg-white/10'}`} />}
            </div>
          );
        })}
      </div>

      {submitError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{submitError}</p>
        </div>
      )}

      {confirmationNotice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-4 space-y-3">
          <p className="text-sm text-amber-200">{confirmationNotice}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResendConfirmation}
              disabled={isResendingConfirmation || resendCooldownSeconds > 0}
              className="h-9 border-amber-400/30 text-amber-100 hover:bg-amber-500/10"
            >
              {isResendingConfirmation
                ? 'Sending...'
                : resendCooldownSeconds > 0
                ? `Resend in ${resendCooldownSeconds}s`
                : 'Resend verification email'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="h-9 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white"
            >
              Go to Login
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {ACCOUNT_TYPES.map((t) => {
            const selected = accountType === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setAccountType(t.id);
                  setSelectedPlan(t.id === 'label' ? 'partner' : 'artist');
                }}
                className={`w-full text-left rounded-xl border p-4 flex items-start gap-4 transition-all ${
                  selected ? 'border-[#FF6B00] bg-[#FF6B00]/8' : 'border-white/10 bg-[#111] hover:border-[#FF6B00]/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? 'bg-[#FF6B00]' : 'bg-[#1a1a1a]'}`}>
                  <Icon className={`w-5 h-5 ${selected ? 'text-white' : 'text-[#B3B3B3]'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{t.label}</p>
                  <p className="text-xs text-[#777] mt-1">{t.description}</p>
                </div>
              </button>
            );
          })}

          <Button
            onClick={() => setStep(2)}
            className="w-full h-11 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {filteredPlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                selectedPlan === plan.id ? 'border-[#FF6B00] bg-[#FF6B00]/8' : 'border-white/10 bg-[#111] hover:border-[#FF6B00]/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{plan.name}</p>
                  <p className="text-xs text-[#777]">per {plan.period}</p>
                </div>
                <p className="text-lg font-bold text-[#FFD600]">{plan.price}</p>
              </div>
              <ul className="space-y-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-xs text-[#B3B3B3] flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          ))}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="flex-1 h-11 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-[#B3B3B3] text-xs">First Name *</Label>
              <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} className="h-11 bg-[#111] border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-[#B3B3B3] text-xs">Last Name *</Label>
              <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} className="h-11 bg-[#111] border-white/10 text-white" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[#B3B3B3] text-xs">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="pl-10 h-11 bg-[#111] border-white/10 text-white" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[#B3B3B3] text-xs">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                className="pl-10 pr-10 h-11 bg-[#111] border-white/10 text-white"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[#B3B3B3] text-xs">Confirm Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="pl-10 pr-10 h-11 bg-[#111] border-white/10 text-white"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777]">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-[#B3B3B3]">Password strength: {pwStrength}/4</p>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={() => {
                if (!validateStep3()) return;
                setStep(4);
              }}
              className="flex-1 h-11 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer bg-[#111]"
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fileRef.current?.click();
              }}
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-[#666]" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{accountType === 'label' ? 'Label logo' : 'Profile picture'}</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-[#FF6B00] hover:text-[#FFD600] underline mt-1">
                {profilePreview ? 'Change image' : 'Upload image'}
              </button>
              {profilePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setProfilePreview('');
                    setProfileFile(null);
                  }}
                  className="ml-3 text-xs text-red-400"
                >
                  <X className="w-3 h-3 inline mr-1" /> Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfilePick}
              title={accountType === 'label' ? 'Upload label logo' : 'Upload profile picture'}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="artistName" className="text-[#B3B3B3] text-xs">
              {accountType === 'label' ? 'Label Name' : 'Artist Name'} *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
              <Input
                id="artistName"
                name="artistName"
                value={formData.artistName}
                onChange={handleInputChange}
                className="pl-10 h-11 bg-[#111] border-white/10 text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-[#B3B3B3] text-xs">Bio *</Label>
            <textarea
              id="bio"
              rows={3}
              maxLength={200}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              title="Bio"
              placeholder={accountType === 'label' ? 'Tell us about your label' : 'Tell us about your artistry'}
              className="w-full rounded-lg border border-white/10 bg-[#111] text-white px-3 py-2.5 text-sm resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#B3B3B3] text-xs">Genre(s) *</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setGenreOpen((o) => !o)}
                className="w-full h-11 rounded-lg border border-white/10 bg-[#111] text-left px-3.5 text-sm flex items-center justify-between text-white"
              >
                <span>{genres.length ? genres.join(', ') : 'Select genres'}</span>
                <ChevronDown className="w-4 h-4 text-[#777]" />
              </button>
              {genreOpen && (
                <div className="absolute top-12 left-0 right-0 z-20 rounded-xl border border-white/10 bg-[#161616] max-h-48 overflow-y-auto p-2">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                        genres.includes(g) ? 'bg-[#FF6B00]/15 text-[#FF6B00]' : 'text-[#B3B3B3] hover:bg-white/5'
                      }`}
                    >
                      {g}
                      {genres.includes(g) && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {accountType === 'label' && (
            <div className="space-y-1.5">
              <Label htmlFor="labelContact" className="text-[#B3B3B3] text-xs">Label Contact Email</Label>
              <Input
                id="labelContact"
                type="email"
                value={labelContactEmail}
                onChange={(e) => setLabelContactEmail(e.target.value)}
                className="h-11 bg-[#111] border-white/10 text-white"
                placeholder="contact@label.com"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="country" className="text-[#B3B3B3] text-xs">Country *</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
              <select
                id="country"
                name="country"
                title="Country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-white/10 bg-[#111] text-white text-sm"
              >
                <option value="">Select country</option>
                <option value="NG">Nigeria</option>
                <option value="GH">Ghana</option>
                <option value="KE">Kenya</option>
                <option value="ZA">South Africa</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-11 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={handleReview}
              className="flex-1 h-11 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold"
            >
              Review <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#111] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">Review your details</h3>
            <p className="text-xs text-[#B3B3B3]"><span className="text-[#777]">Role:</span> {accountType === 'label' ? 'Label / Manager' : 'Artist'}</p>
            <p className="text-xs text-[#B3B3B3]"><span className="text-[#777]">Plan:</span> {(PLAN_OPTIONS.find((p) => p.id === selectedPlan) || PLAN_OPTIONS[0]).name}</p>
            <p className="text-xs text-[#B3B3B3]"><span className="text-[#777]">Name:</span> {formData.firstName} {formData.lastName}</p>
            <p className="text-xs text-[#B3B3B3]"><span className="text-[#777]">Email:</span> {formData.email}</p>
            <p className="text-xs text-[#B3B3B3]"><span className="text-[#777]">{accountType === 'label' ? 'Label name' : 'Artist name'}:</span> {formData.artistName}</p>
            <p className="text-xs text-[#B3B3B3]"><span className="text-[#777]">Bio:</span> {bio}</p>
            <p className="text-xs text-[#B3B3B3]"><span className="text-[#777]">Genres:</span> {genres.join(', ')}</p>
            <p className="text-xs text-[#B3B3B3]"><span className="text-[#777]">Country:</span> {formData.country}</p>
            {accountType === 'label' && labelContactEmail && (
              <p className="text-xs text-[#B3B3B3]"><span className="text-[#777]">Label contact:</span> {labelContactEmail}</p>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5">
              <Checkbox id="agreeTerms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(Boolean(v))} />
              <label htmlFor="agreeTerms" className="text-xs text-[#B3B3B3] cursor-pointer leading-relaxed">
                I agree to the Terms of Service and Privacy Policy *
              </label>
            </div>
            <div className="flex items-start gap-2.5">
              <Checkbox id="agreeMarketing" checked={agreeMarketing} onCheckedChange={(v) => setAgreeMarketing(Boolean(v))} />
              <label htmlFor="agreeMarketing" className="text-xs text-[#777] cursor-pointer leading-relaxed">
                Send me updates and product tips
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(4)} className="flex-1 h-11 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]" disabled={isSubmitting}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={handleCreateAccount}
              disabled={isSubmitting || !agreeTerms}
              className="flex-1 h-11 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default GetStarted;
