import { Suspense, lazy, useState, useEffect } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { NotFound } from './components/NotFound';
import { RouteTransitionLoader } from './components/RouteTransitionLoader';
import { LabelDashboardLayout } from './components/label-dashboard/LabelDashboardLayout';
import { hasActivePartnerSubscription } from './utils/subscription-utils';
import { getCurrentUserProfile } from './utils/user-api';

const LabelDashboardHome = lazy(() => import('./components/label-dashboard/LabelDashboardHome').then((module) => ({ default: module.LabelDashboardHome })));
const AllArtists = lazy(() => import('./components/label-dashboard/AllArtists').then((module) => ({ default: module.AllArtists })));
const UploadRelease = lazy(() => import('./components/dashboard/UploadRelease').then((module) => ({ default: module.UploadRelease })));
const PartnerSubscription = lazy(() => import('./components/label-dashboard/PartnerSubscription').then((module) => ({ default: module.PartnerSubscription })));
const AnalyticsView = lazy(() => import('./components/dashboard/AnalyticsView').then((module) => ({ default: module.AnalyticsView })));
const EarningsView = lazy(() => import('./components/dashboard/EarningsView').then((module) => ({ default: module.EarningsView })));
const CatalogView = lazy(() => import('./components/dashboard/CatalogView').then((module) => ({ default: module.CatalogView })));
const ReleasesView = lazy(() => import('./components/dashboard/ReleasesView').then((module) => ({ default: module.ReleasesView })));
import { Settings } from './components/Settings';
import { ArtistProfile } from './components/ArtistProfile';
import { BankAccountSettings } from './components/BankAccountSettings';
const SplitShare = lazy(() => import('./components/label-dashboard/SplitShare').then((module) => ({ default: module.SplitShare })));
const RevenueManagement = lazy(() => import('./components/label-dashboard/RevenueManagement').then((module) => ({ default: module.RevenueManagement })));
const ReportingDashboard = lazy(() => import('./components/dashboard/ReportingDashboard').then((module) => ({ default: module.ReportingDashboard })));
const MarketingHub = lazy(() => import('./components/label-dashboard/MarketingHub').then((module) => ({ default: module.MarketingHub })));
const ClientOfferings = lazy(() => import('./components/label-dashboard/ClientOfferings').then((module) => ({ default: module.ClientOfferings })));
const YouTubeArtistChannel = lazy(() => import('./components/label-dashboard/YouTubeArtistChannel').then((module) => ({ default: module.YouTubeArtistChannel })));
const AddNewArtist = lazy(() => import('./components/label-dashboard/AddNewArtist').then((module) => ({ default: module.AddNewArtist })));
const ArtistManagementDetail = lazy(() => import('./components/label-dashboard/ArtistManagementDetail').then((module) => ({ default: module.ArtistManagementDetail })));
const UpgradePlan = lazy(() => import('./components/dashboard/UpgradePlan').then((module) => ({ default: module.UpgradePlan })));
const PaymentPage = lazy(() => import('./components/dashboard/PaymentPage').then((module) => ({ default: module.PaymentPage })));
const PaymentCallback = lazy(() => import('./components/dashboard/PaymentCallback').then((module) => ({ default: module.PaymentCallback })));
const DashboardPaymentHistoryPage = lazy(() => import('./components/dashboard/DashboardPaymentHistoryPage').then((module) => ({ default: module.DashboardPaymentHistoryPage })));
const NotificationsCenter = lazy(() => import('./components/dashboard/NotificationsCenter').then((module) => ({ default: module.NotificationsCenter })));
const MyDisputes = lazy(() => import('./components/dashboard/MyDisputes').then((module) => ({ default: module.MyDisputes })));
const SupportCenter = lazy(() => import('./components/dashboard/SupportCenter').then((module) => ({ default: module.SupportCenter })));
const ContractSigningCenter = lazy(() => import('./components/contracts/ContractSigningCenter').then((module) => ({ default: module.ContractSigningCenter })));
const SmartLinksView = lazy(() => import('./components/dashboard/SmartLinksView').then((module) => ({ default: module.SmartLinksView })));
const SmartLinkAnalyticsView = lazy(() => import('./components/dashboard/SmartLinkAnalyticsView').then((module) => ({ default: module.SmartLinkAnalyticsView })));
const PromotionView = lazy(() => import('./components/dashboard/PromotionDashboard').then((module) => ({ default: module.PromotionDashboard })));
import { ForceChangePassword } from './components/admin/ForceChangePassword';

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteTransitionLoader />}>{element}</Suspense>;
}

function ProtectedLabelDashboardRoute({ children }: { children: React.ReactNode }) {
  const mustChange = sessionStorage.getItem('mustChangePassword') === 'true';
  if (mustChange) {
    return <Navigate to="/label-dashboard/change-password" replace />;
  }

  return <>{children}</>;
}

// Component to check partner subscription before allowing upload
function PartnerUploadGuard() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const profile = await getCurrentUserProfile();
        // Only partners need to check subscription
        if (profile.subscriptionTier === 'partner') {
          const hasActive = await hasActivePartnerSubscription();
          if (!hasActive) {
            setShouldRedirect(true);
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, []);

  if (isLoading) {
    return <div className="p-4 text-sm text-[#B3B3B3]">Checking access...</div>;
  }

  if (shouldRedirect) {
    return <Navigate to="/label-dashboard/subscription" replace />;
  }

  return withSuspense(<UploadRelease />);
}

export const createLabelDashboardRouter = (onLogout: () => void) => {
  return createBrowserRouter([
    {
      path: '/',
      element: <Navigate to="/label-dashboard" replace />,
    },
    {
      path: '/label-dashboard/change-password',
      element: <ForceChangePassword />,
    },
    {
      path: '/label-dashboard',
      element: (
        <ProtectedLabelDashboardRoute>
          <LabelDashboardLayout onLogout={onLogout} />
        </ProtectedLabelDashboardRoute>
      ),
      children: [
        {
          index: true,
          element: withSuspense(<LabelDashboardHome />),
        },
        {
          path: 'catalog',
          element: withSuspense(<CatalogView />),
        },
        {
          path: 'releases',
          element: withSuspense(<ReleasesView />),
        },
        {
          path: 'upload',
          element: <PartnerUploadGuard />,
        },
        {
          path: 'upload/audio',
          element: <PartnerUploadGuard />,
        },
        {
          path: 'upload/video',
          element: <PartnerUploadGuard />,
        },
        {
          path: 'upload/transfer',
          element: <PartnerUploadGuard />,
        },
        {
          path: 'subscription',
          element: withSuspense(<PartnerSubscription />),
        },
        {
          path: 'analytics',
          element: withSuspense(<AnalyticsView />),
        },
        {
          path: 'earnings',
          element: withSuspense(<EarningsView />),
        },
        {
          path: 'revenue-management',
          element: withSuspense(<RevenueManagement />),
        },
        {
          path: 'splitshare',
          element: <Navigate to="/label-dashboard/revenue-management" replace />,
        },
        {
          path: 'marketing',
          element: withSuspense(<MarketingHub />),
        },
        {
          path: 'marketing/client-offerings',
          element: withSuspense(<ClientOfferings />),
        },
        {
          path: 'marketing/youtube-artist-channel',
          element: withSuspense(<YouTubeArtistChannel />),
        },
        {
          path: 'artists',
          element: withSuspense(<AllArtists />),
        },
        {
          path: 'artists/new',
          element: withSuspense(<AddNewArtist />),
        },
        {
          path: 'artists/:artistId',
          element: withSuspense(<ArtistManagementDetail />),
        },
        {
          path: 'settings',
          element: <Settings />,
        },
        {
          path: 'artist-profile',
          element: <ArtistProfile />,
        },
        {
          path: 'profile-settings',
          element: <ArtistProfile />,
        },
        {
          path: 'smart-links',
          element: withSuspense(<SmartLinksView />),
        },
        {
          path: 'smart-links/analytics',
          element: withSuspense(<SmartLinkAnalyticsView />),
        },
        {
          path: 'promotion',
          element: withSuspense(<PromotionView />),
        },
        {
          path: 'contracts',
          element: withSuspense(<ContractSigningCenter />),
        },
        {
          path: 'upgrade-plan',
          element: withSuspense(<UpgradePlan />),
        },
        {
          path: 'payment',
          element: withSuspense(<PaymentPage />),
        },
        {
          path: 'payment-history',
          element: withSuspense(<DashboardPaymentHistoryPage />),
        },
        {
          path: 'notifications',
          element: withSuspense(<NotificationsCenter />),
        },
        {
          path: 'disputes',
          element: withSuspense(<MyDisputes />),
        },
        {
          path: 'support',
          element: withSuspense(<SupportCenter />),
        },
        {
          path: 'bank-settings',
          element: <BankAccountSettings onBack={() => window.history.back()} />,
        },
        {
          path: 'reports',
          element: withSuspense(<ReportingDashboard />),
        },
        {
          path: 'payment/callback',
          element: withSuspense(<PaymentCallback />),
        },
      ],
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ]);
};