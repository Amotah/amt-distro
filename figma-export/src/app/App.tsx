import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster, toast } from 'sonner';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { RouteTransitionLoader } from './components/RouteTransitionLoader';
import { createDashboardRouter } from './dashboard-routes';
import { createLabelDashboardRouter } from './label-dashboard-routes';
import { createAdminRouter } from './admin-routes';
import { CURRENT_USER_PROFILE_UPDATED_EVENT, getCurrentUserProfile } from './utils/user-api';
import { getDashboardPathForMode, getEffectiveDashboardMode } from './utils/dashboard-access';
import { supabase } from '../../utils/supabase/client';

type EmailVerificationStatus = 'unknown' | 'verified' | 'unverified';

const LandingPage = lazy(() => import('./components/LandingPage').then((module) => ({ default: module.LandingPage })));
const GetStarted = lazy(() => import('./components/GetStarted').then((module) => ({ default: module.GetStarted })));
const Login = lazy(() => import('./components/Login').then((module) => ({ default: module.Login })));
const PaymentPage = lazy(() => import('./components/PaymentPage').then((module) => ({ default: module.PaymentPage })));
const PaymentSuccess = lazy(() => import('./components/PaymentSuccess').then((module) => ({ default: module.PaymentSuccess })));
const PaymentFailed = lazy(() => import('./components/PaymentFailed').then((module) => ({ default: module.PaymentFailed })));
const PaymentRejected = lazy(() => import('./components/PaymentRejected').then((module) => ({ default: module.PaymentRejected })));
const WhoWeAre = lazy(() => import('./components/WhoWeAre').then((module) => ({ default: module.WhoWeAre })));
const OurPartners = lazy(() => import('./components/OurPartners').then((module) => ({ default: module.OurPartners })));
const CEOMessage = lazy(() => import('./components/CEOMessage').then((module) => ({ default: module.CEOMessage })));
const Technology = lazy(() => import('./components/Technology').then((module) => ({ default: module.Technology })));
const Blog = lazy(() => import('./components/Blog').then((module) => ({ default: module.Blog })));
const MarketingSolutions = lazy(() => import('./components/MarketingSolutions').then((module) => ({ default: module.MarketingSolutions })));
const VideoDistribution = lazy(() => import('./components/VideoDistribution').then((module) => ({ default: module.VideoDistribution })));
const RightsManagement = lazy(() => import('./components/RightsManagement').then((module) => ({ default: module.RightsManagement })));
const RoyaltyAdvances = lazy(() => import('./components/RoyaltyAdvances').then((module) => ({ default: module.RoyaltyAdvances })));
const Promotion = lazy(() => import('./components/Promotion').then((module) => ({ default: module.Promotion })));
const FixAdmin = lazy(() => import('./components/FixAdmin').then((module) => ({ default: module.FixAdmin })));
const FreePlanDetails = lazy(() => import('./components/FreePlanDetails').then((module) => ({ default: module.FreePlanDetails })));
const PaidPlanDetails = lazy(() => import('./components/PaidPlanDetails').then((module) => ({ default: module.PaidPlanDetails })));
const PartnerPlanDetails = lazy(() => import('./components/PartnerPlanDetails').then((module) => ({ default: module.PartnerPlanDetails })));
const TermsConditions = lazy(() => import('./components/TermsConditions').then((module) => ({ default: module.TermsConditions })));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy').then((module) => ({ default: module.PrivacyPolicy })));
const CookiesPolicy = lazy(() => import('./components/CookiesPolicy').then((module) => ({ default: module.CookiesPolicy })));
const ContactUs = lazy(() => import('./components/ContactUs').then((module) => ({ default: module.ContactUs })));
const Careers = lazy(() => import('./components/Careers').then((module) => ({ default: module.Careers })));
const PricingPage = lazy(() => import('./components/PricingPage').then((module) => ({ default: module.PricingPage })));
const ForgotPassword = lazy(() => import('./components/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/ResetPassword').then((module) => ({ default: module.ResetPassword })));

type View = 'landing' | 'get-started' | 'login' | 'forgot-password' | 'reset-password' | 'payment' | 'payment-success' | 'payment-failed' | 'payment-rejected' | 'who-we-are' | 'our-partners' | 'ceo-message' | 'technology' | 'blog' | 'marketing-solutions' | 'video-distribution' | 'rights-management' | 'royalty-advances' | 'promotion' | 'pricing' | 'fix-admin' | 'free-plan-details' | 'paid-plan-details' | 'partner-plan-details' | 'terms-conditions' | 'privacy-policy' | 'cookies-policy' | 'contact' | 'careers';

const PUBLIC_VIEW_PATHS: Record<View, string> = {
  landing: '/',
  'get-started': '/get-started',
  login: '/login',
  'forgot-password': '/forgot-password',
  'reset-password': '/reset-password',
  payment: '/payment',
  'payment-success': '/payment/success',
  'payment-failed': '/payment/failed',
  'payment-rejected': '/payment/rejected',
  'who-we-are': '/who-we-are',
  'our-partners': '/our-partners',
  'ceo-message': '/ceo-message',
  technology: '/technology',
  'marketing-solutions': '/marketing-solutions',
  'video-distribution': '/video-distribution',
  'rights-management': '/rights-management',
  'royalty-advances': '/royalty-advances',
  promotion: '/promotion',
  pricing: '/pricing',
  blog: '/blog',
  'fix-admin': '/fix-admin',
  'free-plan-details': '/plans/free',
  'paid-plan-details': '/plans/artist',
  'partner-plan-details': '/plans/partner',
  'terms-conditions': '/terms-conditions',
  'privacy-policy': '/privacy-policy',
  'cookies-policy': '/cookies-policy',
  contact: '/contact',
  careers: '/careers',
};

const LEGACY_HASH_VIEW_MAP: Record<string, View> = {
  login: 'login',
  'get-started': 'get-started',
  'fix-admin': 'fix-admin',
  'free-plan-details': 'free-plan-details',
  'paid-plan-details': 'paid-plan-details',
  'partner-plan-details': 'partner-plan-details',
  'terms-conditions': 'terms-conditions',
  'privacy-policy': 'privacy-policy',
  'cookies-policy': 'cookies-policy',
  contact: 'contact',
  careers: 'careers',
  promotion: 'promotion',
  pricing: 'pricing',
};

function getViewFromPathname(pathname: string): View {
  const normalizedPath = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const matchedEntry = (Object.entries(PUBLIC_VIEW_PATHS) as Array<[View, string]>).find(([, path]) => path === normalizedPath);
  return matchedEntry?.[0] ?? 'landing';
}

function scrollToHashTarget(hash: string) {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!normalizedHash) {
    return false;
  }

  const target = document.getElementById(decodeURIComponent(normalizedHash));
  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: 'auto', block: 'start' });
  return true;
}

const PUBLIC_PLAN_STORAGE_KEY = 'amtdistro-public-selected-plan';

function getPublicPlanById(planId?: string | null) {
  const normalizedPlanId = planId === 'artist_monthly' || planId === 'artist_yearly'
    ? 'artist'
    : planId === 'label_monthly' || planId === 'label_yearly'
      ? 'partner'
      : planId;

  const planMap: Record<string, { id: string; name: string; price: string; period: string }> = {
    free: { id: 'free', name: 'Free Artist', price: '₦0', period: 'forever' },
    artist: { id: 'artist', name: 'Go-Artist', price: '₦15,000', period: 'release' },
    super_artist: { id: 'super_artist', name: 'Super Artist', price: '₦25,000', period: 'release' },
    partner: { id: 'partner', name: 'Partner', price: '₦40,000', period: 'month' },
  };

  return planMap[normalizedPlanId || ''] || planMap.artist;
}

function readStoredPublicPlanId() {
  if (typeof window === 'undefined') {
    return 'artist';
  }

  return window.sessionStorage.getItem(PUBLIC_PLAN_STORAGE_KEY) || 'artist';
}

function getStoredDashboardMode(nextRole?: string | null) {
  return getEffectiveDashboardMode({
    role: nextRole ?? window.sessionStorage.getItem('user_role'),
    subscriptionTier: window.sessionStorage.getItem('user_subscription_tier'),
  });
}

function withPublicSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteTransitionLoader />}>{element}</Suspense>;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return getStoredDashboardMode();
  });
  const [selectedPlan, setSelectedPlan] = useState({
    ...getPublicPlanById(readStoredPublicPlanId()),
  });
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<EmailVerificationStatus>('unknown');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationNotice, setVerificationNotice] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isRefreshingVerification, setIsRefreshingVerification] = useState(false);
  const previousRoleRef = useRef<string | null>(null);

  const checkEmailVerification = async () => {
    if (!window.sessionStorage.getItem('access_token')) {
      setEmailVerificationStatus('unknown');
      return;
    }

    setIsRefreshingVerification(true);
    setVerificationError('');

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = data.user;
      if (!user) {
        setEmailVerificationStatus('unknown');
        return;
      }

      setVerificationEmail(user.email ?? '');
      setEmailVerificationStatus(user.email_confirmed_at ? 'verified' : 'unverified');
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Unable to check verification status right now.');
    } finally {
      setIsRefreshingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) {
      setVerificationError('No email found for this account.');
      return;
    }

    setIsSendingVerification(true);
    setVerificationError('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      setVerificationNotice('Verification email sent. Check your inbox and spam folder.');
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Unable to resend verification email.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Check if current URL is admin route
  useEffect(() => {
    const checkAdminRoute = () => {
      if (window.location.pathname.startsWith('/admin')) {
        setIsAdminMode(true);
      }
    };
    checkAdminRoute();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyStoredRole = (nextRole?: string | null) => {
      const accessToken = window.sessionStorage.getItem('access_token');
      const role = getStoredDashboardMode(nextRole);
      const isAdmin = role === 'admin' || window.location.pathname.startsWith('/admin');

      setIsAuthenticated(Boolean(accessToken));
      setCurrentUserRole(role);
      setIsAdminMode(isAdmin);

      const nextPath = getDashboardPathForMode(role, window.location.pathname);
      if (nextPath !== window.location.pathname) {
        window.history.replaceState({}, '', nextPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    };

    const refreshCurrentProfile = async () => {
      if (!window.sessionStorage.getItem('access_token')) {
        return;
      }

      try {
        const profile = await getCurrentUserProfile();
        if (!cancelled) {
          applyStoredRole(profile.role);
        }
      } catch {
        if (!cancelled) {
          applyStoredRole();
        }
      }
    };

    const handleProfileChanged = () => {
      if (!cancelled) {
        applyStoredRole();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshCurrentProfile();
      }
    };

    const handleWindowFocus = () => {
      void refreshCurrentProfile();
    };

    applyStoredRole();
    void refreshCurrentProfile();

    window.addEventListener(CURRENT_USER_PROFILE_UPDATED_EVENT, handleProfileChanged as EventListener);
    window.addEventListener('storage', handleProfileChanged);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener(CURRENT_USER_PROFILE_UPDATED_EVENT, handleProfileChanged as EventListener);
      window.removeEventListener('storage', handleProfileChanged);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const previousRole = previousRoleRef.current;

    if (
      previousRole
      && previousRole !== currentUserRole
      && (previousRole === 'artist' || previousRole === 'label')
      && (currentUserRole === 'artist' || currentUserRole === 'label')
    ) {
      toast.success(
        currentUserRole === 'label'
          ? 'Your account is now using the partner dashboard.'
          : 'Your account is now using the artist dashboard.',
        {
          description: currentUserRole === 'label'
            ? 'Partner features are available immediately.'
            : 'Artist features are available immediately.',
        }
      );
    }

    previousRoleRef.current = currentUserRole;
  }, [currentUserRole]);

  useEffect(() => {
    if (!isAuthenticated) {
      setEmailVerificationStatus('unknown');
      setVerificationEmail('');
      setVerificationNotice('');
      setVerificationError('');
      return;
    }

    void checkEmailVerification();
  }, [isAuthenticated]);

  // Handle public URL navigation
  useEffect(() => {
    const resolveCurrentPublicView = () => {
      if (isAuthenticated) {
        return;
      }

      const legacyHash = window.location.hash.slice(1);
      const legacyView = LEGACY_HASH_VIEW_MAP[legacyHash];

      if (legacyView) {
        const targetPath = PUBLIC_VIEW_PATHS[legacyView];
        window.history.replaceState({}, '', targetPath);
      }

      const nextView = getViewFromPathname(window.location.pathname);
      if (nextView === 'get-started') {
        setSelectedPlan(getPublicPlanById(readStoredPublicPlanId()));
      }

      setCurrentView(nextView);
    };

    resolveCurrentPublicView();
    window.addEventListener('popstate', resolveCurrentPublicView);

    return () => window.removeEventListener('popstate', resolveCurrentPublicView);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated || currentView !== 'landing') {
      return;
    }

    let retryTimer: number | undefined;
    let retryCount = 0;
    const maxRetries = 20;

    const scrollWithRetry = () => {
      const didScroll = scrollToHashTarget(window.location.hash);
      if (didScroll || retryCount >= maxRetries) {
        return;
      }

      retryCount += 1;
      retryTimer = window.setTimeout(scrollWithRetry, 45);
    };

    const onHashChange = () => {
      retryCount = 0;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      scrollWithRetry();
    };

    onHashChange();
    window.addEventListener('hashchange', onHashChange);

    return () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [currentView, isAuthenticated]);

  const handleLogin = (userRole: string, userId: string) => {
    setIsAuthenticated(true);
    setVerificationNotice('');
    setVerificationError('');
    void checkEmailVerification();
    
    /**
     * Role-based routing:
     * - artist → /dashboard (normal dashboard)
     * - partner → /label-dashboard (partner dashboard)
     * - admin → /admin (admin dashboard)
     * - superadmin → /admin (admin dashboard with full control)
     */
    if (userRole === 'admin') {
      // Admin/SuperAdmin user - navigate to admin dashboard
      setIsAdminMode(true);
      setCurrentUserRole(userRole);
      window.history.pushState({}, '', '/admin');
    } else if (userRole === 'partner' || window.sessionStorage.getItem('user_subscription_tier') === 'partner') {
      setIsAdminMode(false);
      setCurrentUserRole('partner');
      window.history.pushState({}, '', '/label-dashboard');
    } else if (userRole === 'artist') {
      setIsAdminMode(false);
      setCurrentUserRole(userRole);
      window.history.pushState({}, '', '/dashboard');
    } else {
      // Default fallback to dashboard
      setIsAdminMode(false);
      setCurrentUserRole(userRole);
      window.history.pushState({}, '', '/dashboard');
    }
  };

  const handleSelectPublicPlan = (planId: string) => {
    window.sessionStorage.setItem(PUBLIC_PLAN_STORAGE_KEY, planId);
    setSelectedPlan(getPublicPlanById(planId));
    setCurrentView('get-started');
    window.history.pushState({}, '', PUBLIC_VIEW_PATHS['get-started']);
  };

  const handleSignupComplete = (plan: { id: string; name: string; price: string; period: string }) => {
    setSelectedPlan(plan);

    // Free plan bypasses payment and goes directly to dashboard/profile success
    if (plan.name.toLowerCase().includes('free')) {
      setIsAuthenticated(true);
      setCurrentView('landing');
      window.history.pushState({}, '', '/dashboard');
      return;
    }

    setCurrentView('payment');
  };

  const handlePaymentComplete = (status: 'success' | 'failed' | 'rejected') => {
    if (status === 'success') {
      setCurrentView('payment-success');
    } else if (status === 'failed') {
      setCurrentView('payment-failed');
    } else {
      setCurrentView('payment-rejected');
    }
  };

  const handlePaymentSuccess = () => {
    setIsAuthenticated(true);
    setCurrentView('landing');
    // Navigate to dashboard
    window.history.pushState({}, '', '/dashboard');
  };

  const handlePaymentRetry = () => {
    setCurrentView('payment');
  };

  const handlePaymentCancel = () => {
    setCurrentView('get-started');
  };

  const handleLogout = () => {
    // Clear all session-scoped auth values before switching to public pages.
    window.sessionStorage.removeItem('access_token');
    window.sessionStorage.removeItem('user_id');
    window.sessionStorage.removeItem('user_role');
    window.sessionStorage.removeItem('user_subscription_tier');
    window.sessionStorage.removeItem('admin_role');
    window.sessionStorage.removeItem('admin_permissions');
    window.sessionStorage.removeItem('mustChangePassword');

    // Best-effort Supabase auth cleanup to avoid automatic re-auth hydration.
    void supabase.auth.signOut();

    setIsAuthenticated(false);
    setCurrentView('landing');
    setCurrentUserRole(null);
    setIsAdminMode(false);
    setEmailVerificationStatus('unknown');
    setVerificationEmail('');
    setVerificationNotice('');
    setVerificationError('');

    // Navigate back to root
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handlePublicNavigate = (page: string) => {
    const nextView = page as View;
    const targetPath = PUBLIC_VIEW_PATHS[nextView];

    if (!targetPath) {
      return;
    }

    if (nextView === 'get-started') {
      setSelectedPlan(getPublicPlanById(readStoredPublicPlanId()));
    }

    setCurrentView(nextView);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  // Create router with useMemo to prevent recreation
  const router = useMemo(() => createDashboardRouter(handleLogout), []);
  const labelRouter = useMemo(() => createLabelDashboardRouter(handleLogout), []);
  
  // Create admin router with useMemo to prevent recreation
  const adminRouter = useMemo(() => createAdminRouter(), []);

  if (isAuthenticated && emailVerificationStatus === 'unverified') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#111] p-6 space-y-4">
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-sm text-[#B3B3B3]">
            You are signed in, but email verification is required before using the dashboard.
          </p>
          {verificationEmail && (
            <p className="text-sm text-amber-200">Signed in as: {verificationEmail}</p>
          )}
          {verificationNotice && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">{verificationNotice}</div>
          )}
          {verificationError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{verificationError}</div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isSendingVerification}
              className="h-10 px-4 rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white disabled:opacity-60"
            >
              {isSendingVerification ? 'Sending...' : 'Resend Verification Email'}
            </button>
            <button
              type="button"
              onClick={() => {
                void checkEmailVerification();
              }}
              disabled={isRefreshingVerification}
              className="h-10 px-4 rounded-lg border border-white/20 text-[#E5E5E5] hover:bg-white/5 disabled:opacity-60"
            >
              {isRefreshingVerification ? 'Checking...' : 'I Have Verified'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="h-10 px-4 rounded-lg border border-white/20 text-[#B3B3B3] hover:bg-white/5"
            >
              Log Out
            </button>
          </div>
        </div>
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  // Admin Panel - Render admin routes
  if (isAdminMode) {
    return (
      <>
        <RouterProvider router={adminRouter} />
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  // Authenticated View with React Router
  if (isAuthenticated) {
    return (
      <>
        <RouterProvider router={(currentUserRole === 'label' || currentUserRole === 'partner') ? labelRouter : router} />
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  // Public Views
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {withPublicSuspense(<Login onLogin={handleLogin} />)}
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  if (currentView === 'forgot-password') {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {withPublicSuspense(
          <ForgotPassword
            onBack={() => {
              setCurrentView('login');
              window.history.pushState({}, '', '/login');
            }}
          />
        )}
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  if (currentView === 'get-started') {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {withPublicSuspense(<GetStarted initialPlanId={selectedPlan.id} onComplete={handleSignupComplete} />)}
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  // Payment View
  if (currentView === 'payment') {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {withPublicSuspense(
          <PaymentPage
            selectedPlan={selectedPlan}
            onBack={() => setCurrentView('get-started')}
            onPaymentComplete={handlePaymentComplete}
          />,
        )}
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  // Payment Success
  if (currentView === 'payment-success') {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {withPublicSuspense(<PaymentSuccess selectedPlan={selectedPlan} onContinue={handlePaymentSuccess} />)}
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  // Payment Failed
  if (currentView === 'payment-failed') {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {withPublicSuspense(<PaymentFailed onRetry={handlePaymentRetry} onCancel={handlePaymentCancel} />)}
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  // Payment Rejected
  if (currentView === 'payment-rejected') {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {withPublicSuspense(<PaymentRejected onRetry={handlePaymentRetry} onCancel={handlePaymentCancel} />)}
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  // Landing Page
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header onNavigate={handlePublicNavigate} />
      <main>
        {currentView === 'landing' && withPublicSuspense(<LandingPage onSelectPlan={handleSelectPublicPlan} />)}
        {currentView === 'who-we-are' && withPublicSuspense(<WhoWeAre />)}
        {currentView === 'our-partners' && withPublicSuspense(<OurPartners />)}
        {currentView === 'ceo-message' && withPublicSuspense(<CEOMessage />)}
        {currentView === 'technology' && withPublicSuspense(<Technology />)}
        {currentView === 'blog' && withPublicSuspense(<Blog />)}
        {currentView === 'marketing-solutions' && withPublicSuspense(<MarketingSolutions />)}
        {currentView === 'video-distribution' && withPublicSuspense(<VideoDistribution />)}
        {currentView === 'rights-management' && withPublicSuspense(<RightsManagement />)}
        {currentView === 'royalty-advances' && withPublicSuspense(<RoyaltyAdvances />)}
        {currentView === 'promotion' && withPublicSuspense(<Promotion />)}
          {currentView === 'pricing' && withPublicSuspense(<PricingPage onSelectPlan={handleSelectPublicPlan} />)}
        {currentView === 'fix-admin' && withPublicSuspense(<FixAdmin />)}
        {currentView === 'free-plan-details' && withPublicSuspense(<FreePlanDetails />)}
        {currentView === 'paid-plan-details' && withPublicSuspense(<PaidPlanDetails />)}
        {currentView === 'partner-plan-details' && withPublicSuspense(<PartnerPlanDetails />)}
        {currentView === 'terms-conditions' && withPublicSuspense(<TermsConditions />)}
        {currentView === 'privacy-policy' && withPublicSuspense(<PrivacyPolicy />)}
        {currentView === 'cookies-policy' && withPublicSuspense(<CookiesPolicy />)}
        {currentView === 'contact' && withPublicSuspense(<ContactUs />)}
        {currentView === 'careers' && withPublicSuspense(<Careers />)}
      </main>
      <Footer />
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
