import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { NotFound } from './components/NotFound';
import { RouteTransitionLoader } from './components/RouteTransitionLoader';
const AdminLogin = lazy(() => import('./components/admin/AdminLogin').then((module) => ({ default: module.AdminLogin })));
import { ForceChangePassword } from './components/admin/ForceChangePassword';
import { AdminLayout } from './components/admin/AdminLayout';
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const UserManagement = lazy(() => import('./components/admin/UserManagement').then((module) => ({ default: module.UserManagement })));
const ReleaseManagement = lazy(() => import('./components/admin/ReleaseManagement').then((module) => ({ default: module.ReleaseManagement })));
const ContentModeration = lazy(() => import('./components/admin/ContentModeration').then((module) => ({ default: module.ContentModeration })));
const Analytics = lazy(() => import('./components/admin/Analytics').then((module) => ({ default: module.Analytics })));
const RoyaltyManagement = lazy(() => import('./components/admin/RoyaltyManagement').then((module) => ({ default: module.RoyaltyManagement })));
const FraudMonitoring = lazy(() => import('./components/admin/FraudMonitoring').then((module) => ({ default: module.FraudMonitoring })));
const AdminUserManagement = lazy(() => import('./components/admin/AdminUserManagement').then((module) => ({ default: module.AdminUserManagement })));
const AuditLogs = lazy(() => import('./components/admin/AuditLogs').then((module) => ({ default: module.AuditLogs })));
const AdminSettings = lazy(() => import('./components/admin/AdminSettings').then((module) => ({ default: module.AdminSettings })));
const AdminBlogPosts = lazy(() => import('./components/admin/AdminBlogPosts'));
const RoyaltyUpload = lazy(() => import('./components/admin/RoyaltyUpload').then((module) => ({ default: module.RoyaltyUpload })));
const TrackUpload = lazy(() => import('./components/admin/TrackUpload').then((module) => ({ default: module.TrackUpload })));
const UnmatchedRecords = lazy(() => import('./components/admin/UnmatchedRecords').then((module) => ({ default: module.UnmatchedRecords })));
const AnalyticsUpload = lazy(() => import('./components/admin/AnalyticsUpload'));
const AdminContractsView = lazy(() => import('./components/contracts/AdminContractsView').then((module) => ({ default: module.AdminContractsView })));
const AdminPromotions = lazy(() => import('./components/admin/AdminPromotions').then((module) => ({ default: module.AdminPromotions })));
const AdminPayments = lazy(() => import('./components/admin/AdminPayments').then((module) => ({ default: module.AdminPayments })));
const AdminSubscriptions = lazy(() => import('./components/admin/AdminSubscriptions').then((module) => ({ default: module.AdminSubscriptions })));
const AdminCoupons = lazy(() => import('./components/admin/AdminCoupons').then((module) => ({ default: module.AdminCoupons })));
const AdminCopyright = lazy(() => import('./components/admin/AdminCopyright').then((module) => ({ default: module.AdminCopyright })));
const AdminDisputes = lazy(() => import('./components/admin/AdminDisputes').then((module) => ({ default: module.AdminDisputes })));
const AdminSupport = lazy(() => import('./components/admin/AdminSupport').then((module) => ({ default: module.AdminSupport })));
const AdminBankAccounts = lazy(() => import('./components/admin/AdminBankAccounts').then((module) => ({ default: module.AdminBankAccounts })));
const ArtistLabelManagement = lazy(() => import('./components/admin/ArtistLabelManagement').then((module) => ({ default: module.ArtistLabelManagement })));
const UserActivityLog = lazy(() => import('./components/admin/UserActivityLog').then((module) => ({ default: module.UserActivityLog })));
const RevenuePaymentPanel = lazy(() => import('./components/admin/RevenuePaymentPanel').then((module) => ({ default: module.RevenuePaymentPanel })));
const AdvancedAnalyticsDashboard = lazy(() => import('./components/admin/AdvancedAnalyticsDashboard').then((module) => ({ default: module.AdvancedAnalyticsDashboard })));
const ContentModerationPanel = lazy(() => import('./components/admin/ContentModerationPanel').then((module) => ({ default: module.ContentModerationPanel })));
const AdminSecurityPanel = lazy(() => import('./components/admin/AdminSecurityPanel').then((module) => ({ default: module.AdminSecurityPanel })));
const SystemConfigPanel = lazy(() => import('./components/admin/SystemConfigPanel').then((module) => ({ default: module.SystemConfigPanel })));
const FinancialDashboard = lazy(() => import('./components/admin/FinancialDashboard').then((module) => ({ default: module.FinancialDashboard })));
const BankReconciliation = lazy(() => import('./components/admin/BankReconciliation').then((module) => ({ default: module.BankReconciliation })));
const AccountingLedger = lazy(() => import('./components/admin/AccountingLedger').then((module) => ({ default: module.AccountingLedger })));
const TrialBalanceReport = lazy(() => import('./components/admin/TrialBalanceReport').then((module) => ({ default: module.TrialBalanceReport })));
const BalanceSheetReport = lazy(() => import('./components/admin/BalanceSheetReport').then((module) => ({ default: module.BalanceSheetReport })));
const IncomeStatementReport = lazy(() => import('./components/admin/IncomeStatementReport').then((module) => ({ default: module.IncomeStatementReport })));
const PayrollManagement = lazy(() => import('./components/admin/PayrollManagement').then((module) => ({ default: module.PayrollManagement })));
const ExpenseManagement = lazy(() => import('./components/admin/ExpenseManagement').then((module) => ({ default: module.ExpenseManagement })));
const HRDashboard = lazy(() => import('./components/admin/HRDashboard').then((module) => ({ default: module.HRDashboard })));
const AdminInternalUsers = lazy(() => import('./components/admin/AdminInternalUsers').then((module) => ({ default: module.AdminInternalUsers })));
const AdminAccessControl = lazy(() => import('./components/admin/AdminAccessControl').then((module) => ({ default: module.AdminAccessControl })));
const StaffPortal = lazy(() => import('./components/staff/StaffPortal').then((module) => ({ default: module.StaffPortal })));
const StaffPortalManagement = lazy(() => import('./components/admin/StaffPortalManagement').then((module) => ({ default: module.StaffPortalManagement })));
import { AdminProvider } from './contexts/AdminContext';
import { useAdmin } from './contexts/AdminContext';

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteTransitionLoader />}>{element}</Suspense>;
}

// Protected Route Component
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { adminUser, isLoading } = useAdmin();

  if (isLoading) {
    return <RouteTransitionLoader />;
  }

  if (!adminUser) {
    return <Navigate to="/admin/login" replace />;
  }

  const mustChange = sessionStorage.getItem('mustChangePassword') === 'true';
  if (mustChange) {
    return <Navigate to="/admin/change-password" replace />;
  }
  return <>{children}</>;
}

export const createAdminRouter = () => {
  return createBrowserRouter([
    {
      path: '/',
      element: <Navigate to="/admin" replace />,
    },
    {
      path: '/admin/login',
      element: (
        <AdminProvider>
          {withSuspense(<AdminLogin />)}
        </AdminProvider>
      ),
    },
    {
      path: '/admin/change-password',
      element: (
        <AdminProvider>
          <ForceChangePassword />
        </AdminProvider>
      ),
    },
    {
      path: '/admin',
      element: (
        <AdminProvider>
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        </AdminProvider>
      ),
      children: [
        {
          index: true,
          element: withSuspense(<AdminDashboard />),
        },
        {
          path: 'users',
          element: withSuspense(<UserManagement />),
        },
        {
          path: 'releases',
          element: withSuspense(<ReleaseManagement />),
        },
        {
          path: 'track-upload',
          element: withSuspense(<TrackUpload />),
        },
        {
          path: 'content-moderation',
          element: withSuspense(<ContentModeration />),
        },
        {
          path: 'analytics',
          element: withSuspense(<Analytics />),
        },
        {
          path: 'advanced-analytics',
          element: withSuspense(<AdvancedAnalyticsDashboard />),
        },
        {
          path: 'content-moderation-panel',
          element: withSuspense(<ContentModerationPanel />),
        },
        {
          path: 'royalties',
          element: withSuspense(<RoyaltyManagement />),
        },
        {
          path: 'fraud',
          element: withSuspense(<FraudMonitoring />),
        },
        {
          path: 'admins',
          element: withSuspense(<AdminUserManagement />),
        },
        {
          path: 'audit-logs',
          element: withSuspense(<AuditLogs />),
        },
        {
          path: 'settings',
          element: withSuspense(<AdminSettings />),
        },
        {
          path: 'contracts',
          element: withSuspense(<AdminContractsView />),
        },
        {
          path: 'blog-posts',
          element: withSuspense(<AdminBlogPosts />),
        },
        {
          path: 'royalty-upload',
          element: withSuspense(<RoyaltyUpload />),
        },
        {
          path: 'unmatched-records',
          element: withSuspense(<UnmatchedRecords />),
        },
        {
          path: 'analytics-upload',
          element: withSuspense(<AnalyticsUpload />),
        },
        {
          path: 'promotions',
          element: withSuspense(<AdminPromotions />),
        },
        {
          path: 'payments',
          element: withSuspense(<AdminPayments />),
        },
        {
          path: 'subscriptions',
          element: withSuspense(<AdminSubscriptions />),
        },
        {
          path: 'coupons',
          element: withSuspense(<AdminCoupons />),
        },
        {
          path: 'copyright',
          element: withSuspense(<AdminCopyright />),
        },
        {
          path: 'disputes',
          element: withSuspense(<AdminDisputes />),
        },
        {
          path: 'support',
          element: withSuspense(<AdminSupport />),
        },
        {
          path: 'bank-accounts',
          element: withSuspense(<AdminBankAccounts />),
        },
        {
          path: 'artist-label',
          element: withSuspense(<ArtistLabelManagement />),
        },
        {
          path: 'user-activity',
          element: withSuspense(<UserActivityLog />),
        },
        {
          path: 'revenue',
          element: withSuspense(<RevenuePaymentPanel />),
        },
        {
          path: 'security',
          element: withSuspense(<AdminSecurityPanel />),
        },
        {
          path: 'system-config',
          element: withSuspense(<SystemConfigPanel />),
        },
        {
          path: 'financial-dashboard',
          element: withSuspense(<FinancialDashboard />),
        },
        {
          path: 'bank-reconciliation',
          element: withSuspense(<BankReconciliation />),
        },
        {
          path: 'accounting-ledger',
          element: withSuspense(<AccountingLedger />),
        },
        {
          path: 'trial-balance',
          element: withSuspense(<TrialBalanceReport />),
        },
        {
          path: 'balance-sheet',
          element: withSuspense(<BalanceSheetReport />),
        },
        {
          path: 'income-statement',
          element: withSuspense(<IncomeStatementReport />),
        },
        {
          path: 'payroll',
          element: withSuspense(<PayrollManagement />),
        },
        {
          path: 'hr-dashboard',
          element: withSuspense(<HRDashboard />),
        },
        {
          path: 'expenses',
          element: withSuspense(<ExpenseManagement />),
        },
        {
          path: 'internal-users',
          element: withSuspense(<AdminInternalUsers />),
        },
        {
          path: 'access-control',
          element: withSuspense(<AdminAccessControl />),
        },
        {
          path: 'staff-portal-management',
          element: withSuspense(<StaffPortalManagement />),
        },
      ],
    },
    {
      path: '/staff-portal',
      element: (
        <AdminProvider>
          <ProtectedAdminRoute>
            {withSuspense(<StaffPortal />)}
          </ProtectedAdminRoute>
        </AdminProvider>
      ),
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ]);
};