import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { NotFound } from './components/NotFound';
import { RouteTransitionLoader } from './components/RouteTransitionLoader';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
const DashboardHome = lazy(() => import('./components/dashboard/DashboardHome').then((module) => ({ default: module.DashboardHome })));
const UploadRelease = lazy(() => import('./components/dashboard/UploadRelease').then((module) => ({ default: module.UploadRelease })));
const AnalyticsView = lazy(() => import('./components/dashboard/AnalyticsView').then((module) => ({ default: module.AnalyticsView })));
const EarningsView = lazy(() => import('./components/dashboard/EarningsView').then((module) => ({ default: module.EarningsView })));
const CatalogView = lazy(() => import('./components/dashboard/CatalogView').then((module) => ({ default: module.CatalogView })));
const ReleasesView = lazy(() => import('./components/dashboard/ReleasesView').then((module) => ({ default: module.ReleasesView })));
import { Settings } from './components/Settings';
import { ArtistProfile } from './components/ArtistProfile';
import { BankAccountSettings } from './components/BankAccountSettings';
const ArtistMarketingHub = lazy(() => import('./components/dashboard/ArtistMarketingHub').then((module) => ({ default: module.ArtistMarketingHub })));
const ArtistClientOfferings = lazy(() => import('./components/dashboard/ArtistClientOfferings').then((module) => ({ default: module.ArtistClientOfferings })));
const ArtistYouTubeChannel = lazy(() => import('./components/dashboard/ArtistYouTubeChannel').then((module) => ({ default: module.ArtistYouTubeChannel })));
const UpgradePlan = lazy(() => import('./components/dashboard/UpgradePlan').then((module) => ({ default: module.UpgradePlan })));
const PaymentPage = lazy(() => import('./components/dashboard/PaymentPage').then((module) => ({ default: module.PaymentPage })));
const PaymentCallback = lazy(() => import('./components/dashboard/PaymentCallback').then((module) => ({ default: module.PaymentCallback })));
const DashboardPaymentHistoryPage = lazy(() => import('./components/dashboard/DashboardPaymentHistoryPage').then((module) => ({ default: module.DashboardPaymentHistoryPage })));
const NotificationsCenter = lazy(() => import('./components/dashboard/NotificationsCenter').then((module) => ({ default: module.NotificationsCenter })));
const MyDisputes = lazy(() => import('./components/dashboard/MyDisputes').then((module) => ({ default: module.MyDisputes })));
const ReportingDashboard = lazy(() => import('./components/dashboard/ReportingDashboard').then((module) => ({ default: module.ReportingDashboard })));
const ContractSigningCenter = lazy(() => import('./components/contracts/ContractSigningCenter').then((module) => ({ default: module.ContractSigningCenter })));
const SmartLinksView = lazy(() => import('./components/dashboard/SmartLinksView').then((module) => ({ default: module.SmartLinksView })));
const SmartLinkAnalyticsView = lazy(() => import('./components/dashboard/SmartLinkAnalyticsView').then((module) => ({ default: module.SmartLinkAnalyticsView })));
const PromotionView = lazy(() => import('./components/dashboard/PromotionDashboard').then((module) => ({ default: module.PromotionDashboard })));
const BankReconciliation = lazy(() => import('./components/admin/BankReconciliation').then((module) => ({ default: module.BankReconciliation })));
import { ForceChangePassword } from './components/admin/ForceChangePassword';

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteTransitionLoader />}>{element}</Suspense>;
}

function ProtectedDashboardRoute({ children }: { children: React.ReactNode }) {
  const mustChange = sessionStorage.getItem('mustChangePassword') === 'true';
  if (mustChange) {
    return <Navigate to="/dashboard/change-password" replace />;
  }

  return <>{children}</>;
}

export const createDashboardRouter = (onLogout: () => void) => {
  return createBrowserRouter([
    {
      path: '/',
      element: <Navigate to="/dashboard" replace />,
    },
    {
      path: '/dashboard/change-password',
      element: <ForceChangePassword />,
    },
    {
      path: '/dashboard',
      element: (
        <ProtectedDashboardRoute>
          <DashboardLayout onLogout={onLogout} />
        </ProtectedDashboardRoute>
      ),
      children: [
        {
          index: true,
          element: withSuspense(<DashboardHome />),
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
          element: withSuspense(<UploadRelease />),
        },
        {
          path: 'upload/audio',
          element: withSuspense(<UploadRelease />),
        },
        {
          path: 'upload/video',
          element: withSuspense(<UploadRelease />),
        },
        {
          path: 'upload/transfer',
          element: withSuspense(<UploadRelease />),
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
          path: 'marketing',
          element: withSuspense(<ArtistMarketingHub />),
        },
        {
          path: 'marketing/client-offerings',
          element: withSuspense(<ArtistClientOfferings />),
        },
        {
          path: 'marketing/youtube-artist-channel',
          element: withSuspense(<ArtistYouTubeChannel />),
        },
        {
          path: 'settings',
          element: <Settings />,
        },
        {
          path: 'bank-settings',
          element: <BankAccountSettings onBack={() => window.history.back()} />,
        },
        {
          path: 'bank-reconciliation',
          element: withSuspense(<BankReconciliation />),
        },
        {
          path: 'artist-profile',
          element: <ArtistProfile />,
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
          path: 'reports',
          element: withSuspense(<ReportingDashboard />),
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