import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAdmin } from '../../contexts/AdminContext';
import {
  LayoutDashboard,
  Users,
  Music,
  DollarSign,
  UserCog,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Upload,
  Link2,
  TrendingUp,
  Disc3,
  Newspaper,
  Megaphone,
  BadgePercent,
  CreditCard,
  Shield,
  Copyright,
  MessageSquareWarning,
  Building2,
  Activity,
  BarChart2,
  LineChart,
  ShieldAlert,
  Lock,
  Settings2,
  Briefcase,
  Receipt,
  UserCircle2,
} from 'lucide-react';

export function AdminLayout() {
  const { adminUser, logout, isSuperAdmin } = useAdmin();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navGroups: Array<{
    label: string;
    items: Array<{ path: string; label: string; icon: React.ElementType; exact?: boolean; permission?: string; superAdminOnly?: boolean }>;
  }> = [
    {
      label: 'Overview',
      items: [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      ],
    },
    {
      label: 'Users & Content',
      items: [
        { path: '/admin/users', label: 'Users', icon: Users, permission: 'users.view' },
        { path: '/admin/artist-label', label: 'Artists & Labels', icon: UserCog, permission: 'users.view' },
        { path: '/admin/user-activity', label: 'User Activity', icon: Activity, permission: 'users.view' },
        { path: '/admin/releases', label: 'Releases', icon: Music, permission: 'releases.view' },
        { path: '/admin/track-upload', label: 'Track Upload', icon: Disc3, permission: 'releases.edit' },
        { path: '/admin/content-moderation', label: 'Moderation', icon: CheckCircle, permission: 'releases.approve' },
        { path: '/admin/content-moderation-panel', label: 'Moderation Panel', icon: ShieldAlert, permission: 'releases.approve' },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { path: '/admin/analytics', label: 'Analytics', icon: BarChart3, permission: 'system.analytics' },
        { path: '/admin/advanced-analytics', label: 'Advanced Analytics', icon: LineChart, permission: 'system.analytics' },
        { path: '/admin/analytics-upload', label: 'Analytics Upload', icon: TrendingUp },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { path: '/admin/promotions', label: 'Promotions', icon: Megaphone },
      ],
    },
    {
      label: 'Finance',
      items: [
        { path: '/admin/revenue', label: 'Revenue & Payments', icon: BarChart2, permission: 'payments.view' },
        { path: '/admin/financial-dashboard', label: 'Financial Dashboard', icon: DollarSign, permission: 'payments.view' },
        { path: '/admin/expenses', label: 'Expenses', icon: Receipt, permission: 'payments.view' },
        { path: '/admin/accounting-ledger', label: 'Accounting Ledger', icon: FileText, permission: 'payments.view' },
        { path: '/admin/payments', label: 'Payments', icon: CreditCard, permission: 'payments.view' },
        { path: '/admin/subscriptions', label: 'Subscriptions', icon: DollarSign, permission: 'payments.view' },
        { path: '/admin/coupons', label: 'Coupons', icon: BadgePercent, permission: 'payments.approve' },
        { path: '/admin/bank-accounts', label: 'Bank Accounts', icon: Building2, permission: 'payments.view' },
        { path: '/admin/bank-reconciliation', label: 'Bank Reconciliation', icon: Building2, permission: 'payments.view' },
        { path: '/admin/unmatched-records', label: 'Unmatched Records', icon: Link2, permission: 'royalties.view' },
        { path: '/admin/disputes', label: 'Disputes', icon: MessageSquareWarning, permission: 'payments.view' },
      ],
    },
    {
      label: 'HR',
      items: [
        { path: '/admin/hr-dashboard', label: 'HR Dashboard', icon: UserCog, permission: 'users.view' },
        { path: '/admin/payroll', label: 'Payroll Management', icon: Briefcase, permission: 'payments.view' },
        { path: '/admin/admins', label: 'Team Members', icon: UserCircle2, permission: 'admins.view' },
      ],
    },
    {
      label: 'Security',
      items: [
        { path: '/admin/fraud', label: 'Fraud Alerts', icon: AlertTriangle, permission: 'fraud.view' },
        { path: '/admin/copyright', label: 'Copyright', icon: Copyright, permission: 'releases.approve' },
        { path: '/admin/audit-logs', label: 'Audit Logs', icon: Shield, permission: 'system.logs' },
        { path: '/admin/security', label: 'Access Control', icon: Lock, permission: 'admins.view' },
        { path: '/admin/system-config', label: 'System Config', icon: Settings2, permission: 'system.settings' },
      ],
    },
    {
      label: 'Publishing',
      items: [
        { path: '/admin/blog-posts', label: 'Blog Posts', icon: Newspaper },
        { path: '/admin/contracts', label: 'Contracts', icon: FileText },
      ],
    },
    {
      label: 'Administration',
      items: [
        { path: '/admin/settings', label: 'Settings', icon: Settings, superAdminOnly: true },
      ],
    },
  ];

  const visibleNavGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.superAdminOnly && !isSuperAdmin) return false;
      if (!item.permission) return true;
      if (isSuperAdmin) return true;
      return adminUser?.permissions.includes(item.permission);
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 transition-transform duration-300 z-30 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-[#7B61FF]/10 bg-[#121826] lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-[#7B61FF]/10 px-6">
          <img
            src="/brand/amt-distro-wordmark.svg"
            alt="AMTDISTRO logo"
            className="h-9 w-auto object-contain"
          />
          <span className="ml-2 rounded bg-[#00E5FF]/10 px-2 py-0.5 text-xs font-medium text-[#00E5FF]">
            Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="h-[calc(100vh-12rem)] overflow-y-auto p-4 lg:h-[calc(100vh-16rem)]">
          {visibleNavGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#A0A7B8]/50">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg border px-4 py-2.5 transition ${
                        isActive
                          ? 'border-[#7B61FF]/30 bg-[#7B61FF]/15 text-[#7B61FF]'
                          : 'border-transparent bg-transparent text-[#A0A7B8] hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={`h-4 w-4 flex-shrink-0 ${
                          isActive ? 'text-[#7B61FF]' : 'text-[#A0A7B8] group-hover:text-white'
                        }`} />
                        <span className="text-sm font-medium">{item.label}</span>
                        {isActive && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#00E5FF]" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Admin Info */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[#7B61FF]/10 bg-[#121826] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF] to-[#7B61FF] text-sm font-semibold text-[#0B0F1A]">
              {adminUser?.role === 'superadmin' ? 'SA' : 
               adminUser?.role?.split('_')[1]?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {adminUser?.role === 'superadmin' ? 'Super Admin' :
                 adminUser?.role === 'admin_finance' ? 'Finance' :
                 adminUser?.role === 'admin_content' ? 'Content' :
                 adminUser?.role === 'admin_support' ? 'Support' :
                 adminUser?.role === 'admin_fraud' ? 'Fraud' :
                 adminUser?.role === 'admin_analytics' ? 'Analytics' : 'Admin'}
              </p>
              <p className="text-xs text-[#A0A7B8]">
                {adminUser?.permissions.length || 0} permissions
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-[#A0A7B8] transition hover:opacity-80"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}
      >
        {/* Top Bar (Mobile) */}
        <header className="flex h-16 items-center justify-between border-b border-[#7B61FF]/10 bg-[#121826] px-6 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg bg-white/5 p-2 text-[#A0A7B8] transition"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <img
              src="/brand/amt-distro-wordmark.svg"
              alt="AMTDISTRO logo"
              className="h-8 w-auto object-contain"
            />
            <span className="rounded bg-[#00E5FF]/10 px-2 py-0.5 text-[10px] font-medium text-[#00E5FF]">Admin</span>
          </div>
          
          <div className="w-9" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/70 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}