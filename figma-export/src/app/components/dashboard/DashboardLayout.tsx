import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router';
import { useDashboardWelcome } from '../../utils/dashboard-welcome';
import { useContractStatusSummary } from '../../hooks/useContractStatusSummary';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useNotifications } from '../../hooks/useNotifications';
import { FloatingHelp } from '../FloatingHelp';
import { KeyboardShortcuts } from '../KeyboardShortcuts';
import { SkipLink } from '../SkipLink';
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
  Megaphone,
  ChevronRight,
  Link2,
  BarChart3,
  Rocket,
  AlertTriangle,
  Search,
  CheckCircle2,
  DollarSign as PayoutIcon,
  Disc3 as ReleaseIcon,
  Clock,
  TrendingUp as TrendIcon,
  Sparkles,
  Music2,
} from 'lucide-react';

// ─── Notification type → icon & colour mapping ────────────────────────────────

function notifIcon(type: string): { Icon: typeof CheckCircle2; color: string } {
  switch (type) {
    case 'release':  return { Icon: ReleaseIcon,  color: 'text-[#FF6B00]' };
    case 'earnings': return { Icon: PayoutIcon,   color: 'text-[#FFD600]' };
    case 'promo':    return { Icon: Sparkles,     color: 'text-[#9333EA]' };
    case 'alert':    return { Icon: AlertTriangle, color: 'text-amber-400' };
    case 'news':     return { Icon: TrendIcon,    color: 'text-[#3B82F6]' };
    default:         return { Icon: CheckCircle2, color: 'text-[#1DB954]' };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Search quick-nav items for the dashboard search dropdown
const SEARCH_QUICK_NAV = [
  { label: 'Upload a Release', icon: Music2, path: '/dashboard/upload' },
  { label: 'View Analytics', icon: TrendIcon, path: '/dashboard/analytics' },
  { label: 'Earnings & Payouts', icon: PayoutIcon, path: '/dashboard/earnings' },
  { label: 'Smart Links', icon: Sparkles, path: '/dashboard/smart-links' },
];

const DASH_SEARCH_STORAGE = 'amt-dash-recent-searches';

function readDashRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(DASH_SEARCH_STORAGE) || '[]'); } catch { return []; }
}

function saveDashRecent(q: string) {
  if (!q.trim()) return;
  const prev = readDashRecent().filter((s) => s !== q.trim());
  try { localStorage.setItem(DASH_SEARCH_STORAGE, JSON.stringify([q.trim(), ...prev].slice(0, 6))); } catch { /* ignore */ }
}

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
  { icon: Disc3, label: 'Releases', path: '/dashboard/releases' },
  { icon: Music, label: 'Catalog', path: '/dashboard/catalog' },
  {
    icon: Upload,
    label: 'Upload',
    path: '/dashboard/upload',
    submenu: [
      { label: 'Audio Release', path: '/dashboard/upload/audio' },
      { label: 'Video Distribution', path: '/dashboard/upload/video' },
      { label: 'Transfer Catalog', path: '/dashboard/upload/transfer' },
    ],
  },
  { icon: TrendingUp, label: 'Analytics', path: '/dashboard/analytics' },
  { icon: DollarSign, label: 'Earnings', path: '/dashboard/earnings' },
  { icon: CreditCard, label: 'Payment History', path: '/dashboard/payment-history' },
  { icon: CreditCard, label: 'Subscription', path: '/dashboard/subscription' },
  { icon: AlertTriangle, label: 'My Disputes', path: '/dashboard/disputes' },
  { icon: LifeBuoy, label: 'Support', path: '/dashboard/support' },
  { icon: FileText, label: 'Reports', path: '/dashboard/reports' },
  {
    icon: Link2,
    label: 'Smart Links',
    path: '/dashboard/smart-links',
    submenu: [
      { label: 'All Links', path: '/dashboard/smart-links' },
      { label: 'Link Analytics', path: '/dashboard/smart-links/analytics' },
    ]
  },
  {
    icon: Megaphone,
    label: 'Marketing',
    path: '/dashboard/marketing',
    submenu: [
      { label: 'Marketing Hub', path: '/dashboard/marketing' },
      { label: 'Client Offerings', path: '/dashboard/marketing/client-offerings' },
      { label: 'YouTube Artist Channel', path: '/dashboard/marketing/youtube-artist-channel' },
    ]
  },
  { icon: Rocket, label: 'Promotion', path: '/dashboard/promotion' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

interface DashboardLayoutProps {
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

export function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, unreadCount: liveUnreadCount, markRead, markAllRead } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const welcome = useDashboardWelcome('artist');
  const profileInitials = getProfileInitials(welcome.displayName || 'User') || 'U';
  const location = useLocation();
  const navigate = useNavigate();
  const contractSummary = useContractStatusSummary();

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const unreadCount = liveUnreadCount;

  useEffect(() => { setRecentSearches(readDashRecent()); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMenuOpen]);

  const handleDashSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveDashRecent(trimmed);
    setRecentSearches(readDashRecent());
    setSearchQuery('');
    setSearchOpen(false);
    navigate(`/dashboard/releases?search=${encodeURIComponent(trimmed)}`);
  };

  const handleMarkAllRead = () => { void markAllRead(); };
  const handleMarkRead = (id: string) => { void markRead(id); };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useKeyboardShortcuts({
    onToggleShortcuts: () => setShortcutsOpen((o) => !o),
    onEscape: () => {
      setShortcutsOpen(false);
      setNotifOpen(false);
      setUserMenuOpen(false);
      setSidebarOpen(false);
      setSearchOpen(false);
    },
    onNavigate: navigate,
    searchInputRef,
  });

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const isSubmenuActive = (item: typeof navItems[number]) => {
    return item.submenu?.some((sub) => location.pathname === sub.path) || location.pathname.startsWith(item.path);
  };

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <SkipLink targetId="main-content" />
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
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
                        : 'text-[#B3B3B3] hover:bg-[#161616]/5'
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
                              : 'text-[#B3B3B3] hover:bg-[#161616]/5'
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
                    : 'text-[#B3B3B3] hover:bg-[#161616]/5'
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
            to="/dashboard/support"
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[#B3B3B3] transition-colors hover:bg-[#161616]/5 hover:text-white"
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
                aria-label="Close dashboard menu"
                title="Close dashboard menu"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <nav className="max-h-[calc(100vh-88px)] space-y-1 overflow-y-auto p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
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
                            : 'text-[#B3B3B3] hover:bg-[#161616]/5'
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
                                  : 'text-[#B3B3B3] hover:bg-[#161616]/5'
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
                        : 'text-[#B3B3B3] hover:bg-[#161616]/5'
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-[#FF6B00]/20 bg-[#161616] px-4 py-3 lg:px-6 print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <button
                className="rounded-lg p-2 hover:bg-[#161616]/5 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open dashboard menu"
                title="Open dashboard menu"
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
              {/* Search bar */}
              <div ref={searchRef} className="relative hidden md:block">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleDashSearch(searchQuery); }}
                  className={`flex items-center gap-2 rounded-full border transition-all px-3 py-1.5 ${
                    searchOpen
                      ? 'border-[#FF6B00]/60 bg-[#0A0A0A] w-56 lg:w-72'
                      : 'border-[#FF6B00]/20 bg-[#0A0A0A] w-44 lg:w-52'
                  }`}
                >
                  <Search className="h-4 w-4 text-[#B3B3B3] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Search releases, tracks… (/)"
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#555] focus:outline-none min-w-0"
                    aria-label="Search releases and tracks"
                    data-search-input
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }} className="text-[#555] hover:text-[#B3B3B3]" aria-label="Clear">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </form>

                {/* Search dropdown */}
                {searchOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-72 lg:w-80 rounded-xl border border-[#FF6B00]/20 bg-[#161616] shadow-2xl overflow-hidden">
                    {/* Recent searches */}
                    {recentSearches.length > 0 && !searchQuery && (
                      <div>
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#B3B3B3]">Recent</span>
                          <button
                            onClick={() => { try { localStorage.removeItem(DASH_SEARCH_STORAGE); } catch { /* ignore */ } setRecentSearches([]); }}
                            className="text-[10px] text-[#FF6B00] hover:underline"
                          >Clear</button>
                        </div>
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => handleDashSearch(term)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-[#FF6B00]/8 transition-colors"
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0 text-[#555]" />
                            <span className="flex-1 text-left text-sm text-[#D6D6D6] truncate">{term}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Quick nav when no query */}
                    {!searchQuery && (
                      <div className="border-t border-[#FF6B00]/10">
                        <div className="px-4 pt-3 pb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#B3B3B3]">Quick Nav</span>
                        </div>
                        {SEARCH_QUICK_NAV.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => { setSearchOpen(false); navigate(item.path); }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-[#FF6B00]/8 transition-colors"
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]/70" />
                            <span className="text-sm text-[#D6D6D6]">{item.label}</span>
                            <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#555]" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Search action when typing */}
                    {searchQuery && (
                      <div>
                        {SEARCH_QUICK_NAV
                          .filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((item) => (
                            <button
                              key={item.path}
                              onClick={() => { setSearchOpen(false); navigate(item.path); }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-[#FF6B00]/8 transition-colors"
                            >
                              <item.icon className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]/70" />
                              <span className="text-sm text-[#D6D6D6]">{item.label}</span>
                            </button>
                          ))}
                        <button
                          onClick={() => handleDashSearch(searchQuery)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-[#FF6B00]/8 transition-colors border-t border-[#FF6B00]/10"
                        >
                          <Search className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
                          <span className="text-sm text-[#FF6B00]">Search for &ldquo;{searchQuery}&rdquo;</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button
                  className="relative rounded-lg p-2 hover:bg-[#FF6B00]/10 transition-colors"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  title="View notifications"
                  onClick={() => { setNotifOpen((o) => !o); setUserMenuOpen(false); setSearchOpen(false); }}
                >
                  <Bell className="w-5 h-5 text-[#B3B3B3]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-[#161616]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[22rem] rounded-xl border border-[#FF6B00]/20 bg-[#161616] shadow-2xl">
                    {/* Notif header */}
                    <div className="flex items-center justify-between border-b border-[#FF6B00]/10 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white text-sm">Notifications</h4>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-[10px] font-medium text-[#FF6B00] hover:underline mr-1">Mark all read</button>
                        )}
                        <Link
                          to="/dashboard/settings"
                          onClick={() => setNotifOpen(false)}
                          className="rounded p-1.5 text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white transition-colors"
                          title="Notification settings"
                          aria-label="Notification settings"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Link>
                        <button onClick={() => setNotifOpen(false)} className="rounded p-1.5 text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white transition-colors" aria-label="Close">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Notification items — max 5 */}
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                          <Bell className="h-7 w-7 text-[#555]" />
                          <p className="text-sm text-[#B3B3B3]">No notifications yet</p>
                          <p className="text-xs text-[#555]">We'll alert you about releases, earnings & more</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((n) => {
                          const { Icon, color } = notifIcon(n.type);
                          return (
                            <div
                              key={n.id}
                              className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#0A0A0A] ${
                                !n.read ? 'bg-[#FF6B00]/5' : ''
                              }`}
                            >
                              <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${!n.read ? 'bg-[#FF6B00]' : 'bg-transparent'}`} />
                              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                              <button
                                onClick={() => {
                                  handleMarkRead(n.id);
                                  setNotifOpen(false);
                                  navigate(`/dashboard/notifications?notification=${encodeURIComponent(n.id)}`);
                                }}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-white' : 'text-[#D6D6D6]'}`}>{n.title}</p>
                                <p className="mt-0.5 text-xs text-[#B3B3B3] leading-relaxed">{n.body}</p>
                                <p className="mt-1 text-[10px] text-[#555]">{timeAgo(n.created_at)}</p>
                              </button>
                              <button
                                onClick={() => {
                                  handleMarkRead(n.id);
                                  setNotifOpen(false);
                                }}
                                className="rounded p-1.5 text-[#777] transition-colors hover:bg-[#FF6B00]/10 hover:text-white"
                                title="Read and close"
                                aria-label="Read and close"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-[#FF6B00]/10 px-4 py-2.5">
                      <Link
                        to="/dashboard/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-center gap-1 text-xs font-medium text-[#FF6B00] hover:underline"
                      >
                        View All <ChevronRight className="h-3 w-3" />
                      </Link>
                      <Link
                        to="/dashboard/settings"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-center gap-1 text-xs text-[#B3B3B3] hover:text-white transition-colors"
                      >
                        <Settings className="h-3 w-3" /> Settings
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg p-2 hover:bg-[#161616]/5 sm:gap-3"
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
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-[#FF6B00]/20 bg-[#161616] py-2 shadow-lg">
                    <div className="border-b border-[#FF6B00]/10 px-4 py-2 mb-1">
                      <p className="text-sm font-medium text-white">{welcome.displayName}</p>
                      <p className="text-xs text-[#B3B3B3] truncate">{welcome.profile?.bio ? welcome.profile.bio.slice(0, 40) : 'Artist'}</p>
                    </div>
                    <Link
                      to="/dashboard/profile"
                      className="flex items-center gap-3 px-4 py-2 text-[#B3B3B3] hover:bg-[#FF6B00]/5 hover:text-white"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      to="/dashboard/settings"
                      className="flex items-center gap-3 px-4 py-2 text-[#B3B3B3] hover:bg-[#FF6B00]/5 hover:text-white"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-[#FF6B00] hover:bg-[#161616]/5"
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
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-[#0A0A0A] print:overflow-visible print:bg-[#161616] focus:outline-none"
        >
          <Outlet />
        </main>
      </div>

      {/* Floating Help button */}
      <FloatingHelp />
    </div>
    </>
  );
}
