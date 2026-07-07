import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router';
import { useDashboardWelcome } from '../../utils/dashboard-welcome';
import { useContractStatusSummary } from '../../hooks/useContractStatusSummary';
import { useNotifications } from '../../hooks/useNotifications';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  LayoutDashboard,
  Music,
  Disc3,
  Upload,
  TrendingUp,
  DollarSign,
  CreditCard,
  FileText,
  LifeBuoy,
  Settings,
  HelpCircle,
  Bell,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Users,
  Megaphone,
  ChevronRight,
  Link2,
  BarChart3,
  Rocket,
  AlertTriangle,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/label-dashboard' },
  { icon: Disc3, label: 'Releases', path: '/label-dashboard/releases' },
  { icon: Music, label: 'Catalog', path: '/label-dashboard/catalog' },
  { icon: Users, label: 'Artist Management', path: '/label-dashboard/artists' },
  {
    icon: Upload,
    label: 'Upload',
    path: '/label-dashboard/upload',
    submenu: [
      { label: 'Audio Release', path: '/label-dashboard/upload/audio' },
      { label: 'Video Distribution', path: '/label-dashboard/upload/video' },
      { label: 'Transfer Catalog', path: '/label-dashboard/upload/transfer' },
    ],
  },
  { icon: TrendingUp, label: 'Analytics', path: '/label-dashboard/analytics' },
  { icon: DollarSign, label: 'Earnings', path: '/label-dashboard/earnings' },
  { icon: CreditCard, label: 'Payment History', path: '/label-dashboard/payment-history' },
  { icon: AlertTriangle, label: 'My Disputes', path: '/label-dashboard/disputes' },
  { icon: LifeBuoy, label: 'Support', path: '/label-dashboard/support' },
  { icon: CreditCard, label: 'Subscription', path: '/label-dashboard/subscription' },
  { icon: FileText, label: 'Reports', path: '/label-dashboard/reports' },
  { icon: Users, label: 'Revenue Management', path: '/label-dashboard/revenue-management' },
  {
    icon: Link2,
    label: 'Smart Links',
    path: '/label-dashboard/smart-links',
    submenu: [
      { label: 'All Links', path: '/label-dashboard/smart-links' },
      { label: 'Link Analytics', path: '/label-dashboard/smart-links/analytics' },
    ]
  },
  { 
    icon: Megaphone, 
    label: 'Marketing', 
    path: '/label-dashboard/marketing',
    submenu: [
      { label: 'Marketing Hub', path: '/label-dashboard/marketing' },
      { label: 'Client Offerings', path: '/label-dashboard/marketing/client-offerings' },
      { label: 'YouTube Artist Channel', path: '/label-dashboard/marketing/youtube-artist-channel' },
    ]
  },
  { icon: Rocket, label: 'Promotion', path: '/label-dashboard/promotion' },
  { icon: Settings, label: 'Settings', path: '/label-dashboard/settings' },
];

interface LabelDashboardLayoutProps {
  onLogout?: () => void;
}

function getProfileInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function LabelDashboardLayout({ onLogout }: LabelDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const { unreadCount } = useNotifications();
  const welcome = useDashboardWelcome('partner');
  const profileInitials = getProfileInitials(welcome.displayName || 'User') || 'U';
  const location = useLocation();
  const navigate = useNavigate();
  const contractSummary = useContractStatusSummary();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (path === '/label-dashboard') {
      return location.pathname === '/label-dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const isSubmenuActive = (item: typeof navItems[number]) => {
    return item.submenu?.some((sub) => location.pathname === sub.path) || location.pathname.startsWith(item.path);
  };

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
    setSidebarOpen(false);

    // Keep active submenu sections expanded when route changes.
    setOpenSubmenus((prev) => {
      const next = { ...prev };
      navItems.forEach((item) => {
        if (item.submenu?.some((sub) => location.pathname.startsWith(sub.path))) {
          next[item.label] = true;
        }
      });
      return next;
    });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] lg:h-screen">
      {/* Sidebar - Desktop */}
      <aside className="hidden border-r border-[#FF6B00]/20 bg-[#161616] lg:flex lg:w-60 lg:flex-col print:!hidden">
        {/* Logo */}
        <div className="border-b border-[#FF6B00]/20 p-5">
          <div className="flex items-center gap-2">
            <img
              src="/brand/amt-distro-wordmark.svg"
              alt="AMTDISTRO logo"
              className="h-9 w-auto object-contain"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            // Marketing item with submenu
            if (item.submenu) {
              const menuKey = item.label;
              const isOpen = openSubmenus[menuKey] ?? false;
              return (
                <div key={item.path}>
                  <button
                    onClick={() => toggleSubmenu(menuKey)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors ${
                      isSubmenuActive(item)
                        ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                        : 'text-[#B3B3B3] hover:bg-white/5'
                    }`}
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.label} menu`}
                    title={`${isOpen ? 'Collapse' : 'Expand'} ${item.label} menu`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.submenu.map((subitem) => (
                        <Link
                          key={subitem.path}
                          to={subitem.path}
                          className={`flex items-center gap-3 rounded-lg px-3.5 py-2 text-sm transition-colors ${
                            location.pathname === subitem.path
                              ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                              : 'text-[#B3B3B3] hover:bg-white/5'
                          }`}
                        >
                          {subitem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors ${
                  active
                    ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'text-[#B3B3B3] hover:bg-white/5'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Help Section */}
        <div className="border-t border-[#FF6B00]/20 p-3">
          <Link
            to="/label-dashboard/support"
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[#B3B3B3] transition-colors hover:bg-white/5 hover:text-white"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
            Help &amp; Support
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-0 w-full max-w-60 bg-[#161616] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#FF6B00]/20 p-5">
              <div className="flex items-center gap-2">
                <img
                  src="/brand/amt-distro-wordmark.svg"
                  alt="AMTDISTRO logo"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close label dashboard menu"
                title="Close label dashboard menu"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <nav className="max-h-[calc(100vh-88px)] space-y-1 overflow-y-auto p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                // Marketing item with submenu
                if (item.submenu) {
                  const menuKey = item.label;
                  const isOpen = openSubmenus[menuKey] ?? false;
                  return (
                    <div key={item.path}>
                      <button
                        onClick={() => toggleSubmenu(menuKey)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors ${
                          isSubmenuActive(item)
                            ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                            : 'text-[#B3B3B3] hover:bg-white/5'
                        }`}
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.label} menu`}
                        title={`${isOpen ? 'Collapse' : 'Expand'} ${item.label} menu`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.path}
                              to={subitem.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-3 rounded-lg px-3.5 py-2 text-sm transition-colors ${
                                location.pathname === subitem.path
                                  ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                                  : 'text-[#B3B3B3] hover:bg-white/5'
                              }`}
                            >
                              {subitem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors ${
                      active
                        ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                        : 'text-[#B3B3B3] hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-[#FF6B00]/20 bg-[#161616] px-4 py-3 lg:px-6 print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-2.5 sm:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <button
                className="rounded-lg p-2 hover:bg-white/5 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open label dashboard menu"
                title="Open label dashboard menu"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-semibold text-white sm:text-lg">
                    {navItems.find((item) => isActive(item.path))?.label || 'Dashboard'}
                  </h1>
                  {contractSummary ? (
                    <Badge className={`hidden sm:inline-flex ${contractSummary.status === 'signed' ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15' : contractSummary.status === 'pending-counterparty' ? 'bg-sky-500/15 text-sky-200 hover:bg-sky-500/15' : 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/15'}`}>
                      {contractSummary.status === 'signed' ? 'Contract Locked' : contractSummary.status === 'pending-counterparty' ? 'Awaiting AMT Signature' : 'Contract Draft'}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-[#B3B3B3] sm:text-sm">{welcome.loading ? 'Loading your dashboard...' : welcome.heading}</p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              {/* Notifications */}
              <button
                onClick={() => navigate('/label-dashboard/notifications')}
                className="relative rounded-lg p-2 hover:bg-white/5"
                aria-label="View notifications"
                title="View notifications"
              >
                <Bell className="w-6 h-6 text-[#B3B3B3]" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-[#161616]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>

              {/* User Menu */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg sm:gap-3"
                  aria-label="Open account menu"
                  title="Open account menu"
                >
                  <Avatar className="h-9 w-9 border border-white/10 bg-gradient-to-br from-[#FF6B00] to-[#FFD600]">
                    {welcome.profile?.profileImage ? (
                      <AvatarImage src={welcome.profile.profileImage} alt={`${welcome.displayName} avatar`} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-[#FF6B00] to-[#FFD600] text-xs font-semibold text-white">
                      {profileInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-white">{welcome.displayName}</div>
                  </div>
                  <ChevronDown className="hidden w-4 h-4 text-[#B3B3B3] sm:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#161616] rounded-lg shadow-lg border border-[#FF6B00]/20 py-2 z-50">
                    <Link
                      to="/label-dashboard/settings"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-[#B3B3B3]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 w-full text-left text-[#FF6B00]"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-[#0A0A0A] print:overflow-visible print:bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
