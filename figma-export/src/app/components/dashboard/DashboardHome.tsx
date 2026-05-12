import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Link, useNavigate } from 'react-router';
import { useDashboardWelcome } from '../../utils/dashboard-welcome';
import {
  DollarSign,
  Music,
  TrendingUp,
  Eye,
  Play,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock3,
  MapPin,
  Sparkles,
  Upload,
  Plus,
  BarChart3,
  CreditCard,
  HelpCircle,
  Calendar,
  Download,
  Share2,
  Edit,
  ExternalLink,
  BarChart2,
  Loader2,
  AlertCircle,
  RefreshCw,
  PieChart as PieChartIcon,
  Zap,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  getAnalyticsCatalogPerformance,
  getAnalyticsSummary,
  type AnalyticsCatalogPerformance,
  type AnalyticsSummary,
} from '../../utils/analytics-api';
import {
  getBillingHistory,
  getRoyaltyBalance,
  getRoyaltyEarningsSummary,
  type BillingHistoryRecord,
  type RoyaltyBalance,
  type RoyaltyEarningsSummary,
} from '../../utils/payment-api';
import { getBillingPaymentDate, isPayoutHistoryRecord } from '../../utils/billing-downloads';
import { getUserReleases, type Release } from '../../utils/user-api';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORM_COLORS = ['#1DB954', '#FA243C', '#FF0000', '#9333EA', '#FF6B00', '#3B82F6'];
const PLATFORM_DOT_CLASSES = ['bg-[#1DB954]', 'bg-[#FA243C]', 'bg-[#FF0000]', 'bg-[#9333EA]', 'bg-[#FF6B00]', 'bg-[#3B82F6]'];

const DATE_RANGES = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'Year', value: 'year' },
] as const;

const CURRENCIES = [
  { symbol: '₦', code: 'NGN', rate: 1 },
  { symbol: '$', code: 'USD', rate: 1 / 1650 },
  { symbol: '€', code: 'EUR', rate: 1 / 1800 },
  { symbol: '£', code: 'GBP', rate: 1 / 2100 },
] as const;

type DateRange = typeof DATE_RANGES[number]['value'];
type CurrencyCode = typeof CURRENCIES[number]['code'];
type ActivityType = 'success' | 'achievement' | 'info' | 'warning';
type TrackSortKey = 'name' | 'streams' | 'revenue';

interface DashboardActivity {
  id: string;
  action: string;
  time: string;
  type: ActivityType;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function convertCurrency(nairaAmount: number, code: CurrencyCode): string {
  const entry = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
  if (code === 'NGN') return `₦${nairaAmount.toLocaleString('en-US')}`;
  const converted = nairaAmount * entry.rate;
  return `${entry.symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }).format(value);
}

function formatMonthLabel(value: string) {
  const parsed = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { month: 'short' });
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRelativeDate(value: string) {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return 'Recently';
  const diffH = Math.max(1, Math.round((Date.now() - ts) / 3_600_000));
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return `${Math.max(1, Math.round(diffD / 30))}mo ago`;
}

function getCountdown(releaseDate: string): string | null {
  const ms = new Date(releaseDate).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / 86_400_000);
  if (days === 1) return '1 day away';
  if (days < 30) return `${days} days away`;
  return `${Math.round(days / 30)}mo away`;
}

function getGrowthLabel(cur: number, prev: number) {
  if (prev <= 0) return '+0.0%';
  const g = ((cur - prev) / prev) * 100;
  return `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`;
}

function buildActivity(
  releases: Release[],
  billing: BillingHistoryRecord[],
  analytics: AnalyticsSummary | null,
): DashboardActivity[] {
  const items: DashboardActivity[] = [];
  const sorted = [...releases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  for (const r of sorted.slice(0, 3)) {
    items.push({
      id: `r-${r.id}`,
      action: `Release "${r.title}" is ${r.status}`,
      time: formatRelativeDate(r.updatedAt || r.createdAt),
      type: r.status === 'live' ? 'success' : r.status === 'rejected' ? 'warning' : 'info',
    });
  }
  const payouts = billing.filter(isPayoutHistoryRecord).slice().sort((a, b) => new Date(getBillingPaymentDate(b)).getTime() - new Date(getBillingPaymentDate(a)).getTime());
  for (const p of payouts.slice(0, 2)) {
    items.push({
      id: `b-${p.id}`,
      action: `Payout ₦${p.amount.toLocaleString()} is ${p.status}`,
      time: formatRelativeDate(getBillingPaymentDate(p)),
      type: p.status === 'completed' ? 'success' : 'info',
    });
  }
  if (analytics?.lastUpdated) {
    items.push({
      id: 'analytics',
      action: `Analytics refreshed — ${analytics.metrics.reports} report${analytics.metrics.reports === 1 ? '' : 's'} uploaded`,
      time: formatRelativeDate(analytics.lastUpdated),
      type: 'achievement',
    });
  }
  return items.slice(0, 10);
}

function exportCSV(rows: object[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? '')).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#FF6B00]/10 bg-[#161616] p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="h-11 w-11 rounded-lg bg-[#FF6B00]/10" />
        <div className="h-4 w-14 rounded bg-[#333]" />
      </div>
      <div className="mb-1 h-8 w-24 rounded bg-[#333]" />
      <div className="h-3.5 w-20 rounded bg-[#222]" />
      <div className="mt-2 h-6 w-full rounded-md bg-[#111]" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 rounded-lg bg-[#0A0A0A] p-3">
      <div className="h-10 w-10 rounded-lg bg-[#333]" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-40 rounded bg-[#333]" />
        <div className="h-3 w-24 rounded bg-[#222]" />
      </div>
      <div className="h-4 w-16 rounded bg-[#333]" />
      <div className="h-4 w-16 rounded bg-[#222]" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, message, action }: {
  icon: React.ElementType; title: string; message: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#FF6B00]/20 bg-[#0A0A0A] p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6B00]/10">
        <Icon className="h-6 w-6 text-[#FF6B00]/50" />
      </div>
      <p className="mb-1 font-semibold text-white text-sm">{title}</p>
      <p className="mb-4 text-xs text-[#B3B3B3] max-w-xs">{message}</p>
      {action && (
        <Button asChild size="sm" className="bg-[#FF6B00] text-white hover:bg-[#e05e00]">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Release['status'] }) {
  const map: Record<Release['status'], string> = {
    live: 'bg-green-500/15 text-green-300 border-green-500/20',
    submitted: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    processing: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    validated: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    draft: 'bg-[#444]/20 text-[#B3B3B3] border-[#444]/20',
    rejected: 'bg-red-500/15 text-red-300 border-red-500/20',
  };
  const labels: Record<Release['status'], string> = {
    live: 'Live', submitted: 'In Review', processing: 'Processing',
    validated: 'Approved', draft: 'Draft', rejected: 'Rejected',
  };
  return <Badge variant="outline" className={`text-[10px] ${map[status] ?? ''}`}>{labels[status] ?? status}</Badge>;
}

function SortBtn({ label, col, current, dir, onSort }: {
  label: string; col: TrackSortKey; current: TrackSortKey; dir: 'asc' | 'desc';
  onSort: (k: TrackSortKey) => void;
}) {
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-white transition-colors ${current === col ? 'text-[#FF6B00]' : 'text-[#B3B3B3]'}`}
    >
      {label}
      {current === col && <span className="text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardHome() {
  const welcome = useDashboardWelcome('artist');
  const navigate = useNavigate();

  // Data
  const [releases, setReleases] = useState<Release[]>([]);
  const [royaltyBalance, setRoyaltyBalance] = useState<RoyaltyBalance | null>(null);
  const [royaltySummary, setRoyaltySummary] = useState<RoyaltyEarningsSummary | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [catalogPerformance, setCatalogPerformance] = useState<AnalyticsCatalogPerformance>({ topSongs: [], topReleases: [] });
  const [billingHistory, setBillingHistory] = useState<BillingHistoryRecord[]>([]);
  const [dashboardError, setDashboardError] = useState('');
  const [liveLoading, setLiveLoading] = useState(true);

  // UI state
  const [dateRange, setDateRange] = useState<DateRange>('year');
  const [currency, setCurrency] = useState<CurrencyCode>('NGN');
  const [platformMode, setPlatformMode] = useState<'pie' | 'bar'>('pie');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [trackSort, setTrackSort] = useState<TrackSortKey>('streams');
  const [trackSortDir, setTrackSortDir] = useState<'asc' | 'desc'>('desc');
  const [trackPage, setTrackPage] = useState(5);
  const [activityPage, setActivityPage] = useState(4);

  const currencyEntry = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  // ── Initial load ──
  useEffect(() => {
    let active = true;
    async function load() {
      setLiveLoading(true);
      setDashboardError('');
      const [r, bal, roy, ana, cat, bill] = await Promise.allSettled([
        getUserReleases(),
        getRoyaltyBalance(),
        getRoyaltyEarningsSummary(),
        getAnalyticsSummary(dateRange),
        getAnalyticsCatalogPerformance('all'),
        getBillingHistory(),
      ]);
      if (!active) return;
      if (r.status === 'fulfilled') setReleases(r.value);
      if (bal.status === 'fulfilled') setRoyaltyBalance(bal.value);
      if (roy.status === 'fulfilled') setRoyaltySummary(roy.value);
      if (ana.status === 'fulfilled') setAnalyticsSummary(ana.value);
      if (cat.status === 'fulfilled') setCatalogPerformance(cat.value);
      if (bill.status === 'fulfilled') setBillingHistory(bill.value);
      if (bal.status === 'rejected' && roy.status === 'rejected' && ana.status === 'rejected') {
        setDashboardError('Unable to load live data right now. Check your connection.');
      }
      setLiveLoading(false);
    }
    load().catch((e) => {
      if (!active) return;
      setDashboardError(e instanceof Error ? e.message : 'Failed to load dashboard data.');
      setLiveLoading(false);
    });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-fetch analytics on date range change ──
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    let active = true;
    async function reload() {
      setAnalyticsLoading(true);
      try {
        const [ana, cat] = await Promise.allSettled([getAnalyticsSummary(dateRange), getAnalyticsCatalogPerformance('all')]);
        if (!active) return;
        if (ana.status === 'fulfilled') setAnalyticsSummary(ana.value);
        if (cat.status === 'fulfilled') setCatalogPerformance(cat.value);
      } finally { if (active) setAnalyticsLoading(false); }
    }
    reload();
    return () => { active = false; };
  }, [dateRange]);

  // ── Derived values ──

  const revenueTrend = useMemo(() => {
    const pts = royaltySummary?.stats.monthlyTrend || [];
    return getGrowthLabel(pts.at(-1)?.revenue || 0, pts.at(-2)?.revenue || 0);
  }, [royaltySummary]);

  const streamTrend = useMemo(() => {
    const pts = royaltySummary?.stats.monthlyTrend || [];
    return getGrowthLabel(pts.at(-1)?.streams || 0, pts.at(-2)?.streams || 0);
  }, [royaltySummary]);

  const mtdRevenue = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return royaltySummary?.stats.monthlyTrend.find((p) => p.month === key)?.revenue
      ?? royaltySummary?.stats.monthlyTrend.at(-1)?.revenue ?? 0;
  }, [royaltySummary]);

  const mtdStreams = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return royaltySummary?.stats.monthlyTrend.find((p) => p.month === key)?.streams
      ?? royaltySummary?.stats.monthlyTrend.at(-1)?.streams ?? 0;
  }, [royaltySummary]);

  const revenueData = useMemo(() => {
    const trend = analyticsSummary?.trend || [];
    const monthly = royaltySummary?.stats.monthlyTrend || [];
    const limit = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
    if (trend.length > 0) {
      return trend.slice(-limit).map((p) => ({ id: p.date, label: formatDateLabel(p.date), streams: p.streams, revenue: 0 }));
    }
    return monthly.slice(-6).map((p) => ({
      id: p.month, label: formatMonthLabel(p.month),
      streams: p.streams, revenue: p.revenue * currencyEntry.rate,
    }));
  }, [analyticsSummary, royaltySummary, dateRange, currencyEntry]);

  const platformData = useMemo(() => {
    const royaltyEntries = Object.entries(royaltySummary?.stats.platformBreakdown || {})
      .map(([name, v]) => ({ name, value: v.revenue })).filter((e) => e.value > 0);
    const fallback = (analyticsSummary?.platformBreakdown || [])
      .map((p) => ({ name: p.name, value: p.streams })).filter((e) => e.value > 0);
    const source = royaltyEntries.length > 0 ? royaltyEntries : fallback;
    const total = source.reduce((s, e) => s + e.value, 0);
    return source.slice(0, 6).map((e, i) => ({
      id: `${e.name}-${i}`, name: e.name,
      value: total > 0 ? Number(((e.value / total) * 100).toFixed(1)) : 0,
      color: PLATFORM_COLORS[i % PLATFORM_COLORS.length],
      dot: PLATFORM_DOT_CLASSES[i % PLATFORM_DOT_CLASSES.length],
    }));
  }, [analyticsSummary, royaltySummary]);

  const sortedTracks = useMemo(() => {
    return [...catalogPerformance.topSongs].sort((a, b) => {
      const av = trackSort === 'name' ? a.songName : trackSort === 'streams' ? a.streams : a.revenue;
      const bv = trackSort === 'name' ? b.songName : trackSort === 'streams' ? b.streams : b.revenue;
      if (typeof av === 'string') return trackSortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return trackSortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [catalogPerformance.topSongs, trackSort, trackSortDir]);

  const upcomingReleases = useMemo(() => {
    const now = new Date();
    return releases.filter((r) =>
      r.status !== 'live' && r.status !== 'rejected' && r.status !== 'draft' &&
      (r.status === 'submitted' || r.status === 'processing' || r.status === 'validated' ||
        (r.releaseDate && new Date(r.releaseDate) > now))
    ).slice(0, 6);
  }, [releases]);

  const recentActivity = useMemo(
    () => buildActivity(releases, billingHistory, analyticsSummary),
    [releases, billingHistory, analyticsSummary],
  );

  const topTrack = catalogPerformance.topSongs[0];

  const handleSortTrack = useCallback((key: TrackSortKey) => {
    if (trackSort === key) setTrackSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setTrackSort(key); setTrackSortDir('desc'); }
  }, [trackSort]);

  const handleExportEarnings = useCallback(() => {
    exportCSV(revenueData.map((d) => ({ date: d.id, label: d.label, streams: d.streams, revenue: d.revenue })), `earnings-${dateRange}.csv`);
  }, [revenueData, dateRange]);

  const handleExportTracks = useCallback(() => {
    exportCSV(sortedTracks.map((t, i) => ({ '#': i + 1, 'Track Name': t.songName, Streams: t.streams, Revenue: t.revenue, Platform: t.platform })), 'top-tracks.csv');
  }, [sortedTracks]);

  const kpis = [
    {
      label: 'Total Revenue',
      value: convertCurrency(royaltyBalance?.totalEarnings || royaltySummary?.stats.totalRevenue || 0, currency),
      mtd: convertCurrency(mtdRevenue, currency) + ' MTD',
      change: revenueTrend,
      positive: revenueTrend.startsWith('+'),
      icon: DollarSign, bg: 'bg-[#1DB954]/10', color: 'text-[#1DB954]',
    },
    {
      label: 'Total Streams',
      value: formatCompactNumber(royaltySummary?.stats.totalStreams || analyticsSummary?.metrics.totalStreams || 0),
      mtd: formatCompactNumber(mtdStreams) + ' MTD',
      change: streamTrend,
      positive: streamTrend.startsWith('+'),
      icon: Play, bg: 'bg-[#FF6B00]/10', color: 'text-[#FF6B00]',
    },
    {
      label: 'Top Track',
      value: topTrack?.songName || '—',
      mtd: topTrack ? `${formatCompactNumber(topTrack.streams)} plays` : 'No data yet',
      change: topTrack ? `${formatCompactNumber(topTrack.streams)} streams` : 'Upload a track',
      positive: true,
      icon: TrendingUp, bg: 'bg-[#FFD600]/10', color: 'text-[#FFD600]',
    },
    {
      label: 'Active Releases',
      value: String(releases.filter((r) => r.status === 'live').length),
      mtd: `${upcomingReleases.length} pending`,
      change: `${releases.length} total`,
      positive: true,
      icon: Music, bg: 'bg-[#3B82F6]/10', color: 'text-[#3B82F6]',
    },
  ] as const;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 lg:p-8">

      {/* Welcome Banner */}
      <Card className="overflow-hidden border border-[#FF6B00]/20 bg-gradient-to-br from-[#161616] via-[#1A120C] to-[#120D09] text-white shadow-[0_18px_48px_rgba(0,0,0,0.36)]">
        <div className="grid gap-2.5 p-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-center lg:gap-4">
          <div className="space-y-2.5">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-[#FFD79C]">
              <Sparkles className="h-3 w-3 text-[#FFD600]" /> Dashboard briefing
            </div>
            <h2 className="text-lg font-semibold leading-tight sm:text-2xl">
              {welcome.loading ? 'Preparing your dashboard...' : welcome.heading}
            </h2>
            <p className="max-w-md text-[11px] text-[#D1D5DB] sm:text-xs">{welcome.subtitle}</p>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-[#E5E7EB]">
              <span className="rounded-full border border-[#FF6B00]/20 bg-[#0A0A0A] px-2.5 py-0.5">{welcome.roleLabel} workspace</span>
              <span className="rounded-full border border-[#FF6B00]/20 bg-[#0A0A0A] px-2.5 py-0.5">{welcome.planLabel}</span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { icon: MapPin, color: 'text-[#FFD600]', label: 'Region', value: welcome.locationLabel, sub: 'Dashboard region' },
              { icon: Clock3, color: 'text-[#FF6B00]', label: 'Time', value: welcome.currentTimeLabel, sub: welcome.currentDateLabel },
              { icon: Clock3, color: 'text-[#3B82F6]', label: 'Last login', value: welcome.lastLoginLabel, sub: welcome.lastLoginLocationLabel },
            ].map(({ icon: Icon, color, label, value, sub }) => (
              <div key={label} className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A] px-3 py-2.5">
                <div className={`mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#B3B3B3]`}>
                  <Icon className={`h-3 w-3 ${color}`} /> {label}
                </div>
                <div className="text-xs font-semibold sm:text-sm">{value}</div>
                <p className="text-[10px] text-[#B3B3B3]">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Error */}
      {dashboardError && (
        <Card className="flex items-start gap-3 border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {dashboardError}
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {([
            { icon: Plus, label: 'New Release', to: '/dashboard/upload', primary: true },
            { icon: Upload, label: 'Upload Track', to: '/dashboard/upload' },
            { icon: BarChart3, label: 'Analytics', to: '/dashboard/analytics' },
            { icon: CreditCard, label: 'Request Payout', to: '/dashboard/earnings' },
            { icon: Music, label: 'My Catalog', to: '/dashboard/catalog' },
            { icon: HelpCircle, label: 'Support', to: '/contact' },
          ] as const).map((action) => {
            const Icon = action.icon;
            const primary = 'primary' in action && action.primary;
            return (
              <Button
                key={action.label}
                asChild
                size="sm"
                variant={primary ? 'default' : 'outline'}
                className={primary
                  ? 'bg-[#FF6B00] text-white hover:bg-[#e05e00]'
                  : 'border-[#FF6B00]/20 bg-[#161616] text-white hover:border-[#FF6B00]/50 hover:bg-[#0A0A0A]'}
              >
                <Link to={action.to}>
                  <Icon className="mr-1.5 h-3.5 w-3.5" />{action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {liveLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : kpis.map(({ label, value, mtd, change, positive, icon: Icon, bg, color }) => (
            <Card key={label} className="border border-[#FF6B00]/20 bg-[#161616] p-5 transition-all hover:border-[#FF6B00]/40 hover:shadow-lg">
              <div className="mb-3 flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {positive
                    ? <ArrowUpRight className="h-3.5 w-3.5 text-[#1DB954]" />
                    : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
                  <span className={positive ? 'text-[#1DB954]' : 'text-red-400'}>{change}</span>
                </div>
              </div>
              <div className="mb-0.5 truncate text-2xl font-bold text-white leading-tight">{value}</div>
              <div className="text-sm text-[#B3B3B3]">{label}</div>
              <div className="mt-2 rounded-md bg-[#0A0A0A] px-2 py-1 text-xs">
                <span className="text-[#FF6B00]">{mtd}</span>
              </div>
            </Card>
          ))}
      </div>

      {/* Earnings Chart + Platform Distribution */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Earnings Chart */}
        <Card className="border border-[#FF6B00]/20 bg-[#161616] p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Earnings Overview</h3>
              <p className="text-xs text-[#B3B3B3]">Live royalties from analytics reports</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Date range */}
              <div className="flex overflow-hidden rounded-lg border border-[#FF6B00]/20">
                {DATE_RANGES.map((dr) => (
                  <button
                    key={dr.value}
                    onClick={() => setDateRange(dr.value)}
                    className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${dateRange === dr.value ? 'bg-[#FF6B00] text-white' : 'bg-transparent text-[#B3B3B3] hover:text-white'}`}
                  >
                    {dr.label}
                  </button>
                ))}
              </div>
              {/* Currency */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white focus:outline-none"
                aria-label="Select currency"
              >
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
              {/* Export */}
              <Button
                size="sm" variant="outline"
                className="border-[#FF6B00]/20 bg-transparent text-[#B3B3B3] hover:border-[#FF6B00]/50 hover:text-white"
                onClick={handleExportEarnings}
              >
                <Download className="mr-1 h-3.5 w-3.5" /> Export
              </Button>
            </div>
          </div>

          {liveLoading || analyticsLoading ? (
            <div className="flex h-64 items-center justify-center gap-2 text-sm text-[#B3B3B3]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading chart data…
            </div>
          ) : revenueData.length === 0 ? (
            <EmptyState icon={BarChart3} title="No earnings data yet" message="Upload an analytics report to see your earnings trend." action={{ label: 'Go to Reports', to: '/dashboard/reports' }} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevHome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradStrHome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#555" fontSize={11} tickLine={false} />
                <YAxis stroke="#555" fontSize={11} tickLine={false} tickFormatter={(v) => formatCompactNumber(Number(v))} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161616', border: '1px solid rgba(255,107,0,0.25)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  formatter={(value: number, name: string) =>
                    name === 'revenue' ? [convertCurrency(value / currencyEntry.rate, currency), 'Revenue'] : [formatCompactNumber(value), 'Streams']
                  }
                />
                {revenueData.some((d) => d.revenue > 0) && (
                  <Area type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={2} fill="url(#gradRevHome)" />
                )}
                {revenueData.some((d) => d.streams > 0) && (
                  <Area type="monotone" dataKey="streams" stroke="#3B82F6" strokeWidth={2} fill="url(#gradStrHome)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Platform Distribution */}
        <Card className="border border-[#FF6B00]/20 bg-[#161616] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Platform Revenue</h3>
            <div className="flex overflow-hidden rounded-lg border border-[#FF6B00]/20">
              <button
                onClick={() => setPlatformMode('pie')}
                aria-label="Pie chart view"
                className={`flex items-center px-2 py-1.5 text-xs transition-colors ${platformMode === 'pie' ? 'bg-[#FF6B00] text-white' : 'text-[#B3B3B3] hover:text-white'}`}
              >
                <PieChartIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPlatformMode('bar')}
                aria-label="Bar chart view"
                className={`flex items-center px-2 py-1.5 text-xs transition-colors ${platformMode === 'bar' ? 'bg-[#FF6B00] text-white' : 'text-[#B3B3B3] hover:text-white'}`}
              >
                <BarChart2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {platformData.length === 0 ? (
            <EmptyState icon={BarChart3} title="No platform data" message="Revenue by platform will appear after analytics reports are in." />
          ) : platformMode === 'pie' ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                    {platformData.map((e) => <Cell key={e.id} fill={e.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161616', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {platformData.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
                      <span className="text-white">{p.name}</span>
                    </div>
                    <span className="font-medium text-white">{p.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={platformData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" stroke="#555" fontSize={11} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="name" stroke="#555" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161616', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, 'Share']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {platformData.map((e, i) => <Cell key={e.id} fill={PLATFORM_COLORS[i % PLATFORM_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top Tracks Table */}
      <Card className="border border-[#FF6B00]/20 bg-[#161616] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Top Tracks</h3>
            <p className="text-xs text-[#B3B3B3]">From uploaded analytics reports</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#B3B3B3] hover:border-[#FF6B00]/50 hover:text-white" onClick={handleExportTracks}>
              <Download className="mr-1 h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="ghost" className="text-[#FFD600] hover:bg-[#0A0A0A]" asChild>
              <Link to="/dashboard/catalog">View All <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </div>

        {liveLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : sortedTracks.length === 0 ? (
          <EmptyState icon={Music} title="No tracks yet" message="Upload your first release to see track performance data here." action={{ label: 'Upload Release', to: '/dashboard/upload' }} />
        ) : (
          <>
            {/* Header row (desktop) */}
            <div className="mb-2 hidden items-center gap-4 border-b border-[#FF6B00]/10 pb-2 sm:grid sm:grid-cols-[2rem_1fr_7rem_8rem_8rem_5rem]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">#</span>
              <SortBtn label="Track" col="name" current={trackSort} dir={trackSortDir} onSort={handleSortTrack} />
              <SortBtn label="Streams" col="streams" current={trackSort} dir={trackSortDir} onSort={handleSortTrack} />
              <SortBtn label="Revenue" col="revenue" current={trackSort} dir={trackSortDir} onSort={handleSortTrack} />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">Platform</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">Actions</span>
            </div>

            <div className="space-y-1.5">
              {sortedTracks.slice(0, trackPage).map((song, idx) => (
                <div
                  key={`${song.trackId || song.songName}-${song.platform}-${idx}`}
                  className="flex flex-col gap-2 rounded-lg bg-[#0A0A0A] p-3 transition-colors hover:bg-[#120D09] sm:grid sm:grid-cols-[2rem_1fr_7rem_8rem_8rem_5rem] sm:items-center sm:gap-4"
                >
                  <span className="hidden text-sm font-semibold text-[#666] sm:block">{idx + 1}</span>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF6B00]/10">
                      <Music className="h-4 w-4 text-[#FFD600]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{song.songName}</p>
                      <p className="truncate text-xs text-[#B3B3B3] sm:hidden">{formatCompactNumber(song.streams)} streams · {song.platform}</p>
                    </div>
                  </div>
                  <span className="hidden text-right text-sm text-white sm:block">{formatCompactNumber(song.streams)}</span>
                  <span className="hidden text-right text-sm font-medium text-[#1DB954] sm:block">{convertCurrency(song.revenue, currency)}</span>
                  <span className="hidden sm:block">
                    <Badge variant="outline" className="border-[#FF6B00]/20 text-xs text-[#B3B3B3]">{song.platform}</Badge>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded p-1 text-[#B3B3B3] hover:bg-[#161616] hover:text-white transition-colors"
                      title="View analytics"
                      onClick={() => navigate('/dashboard/analytics')}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-1 text-[#B3B3B3] hover:bg-[#161616] hover:text-white transition-colors"
                      title="Smart link / share"
                      onClick={() => navigate('/dashboard/smart-links')}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    {song.releaseId && (
                      <button
                        className="rounded p-1 text-[#B3B3B3] hover:bg-[#161616] hover:text-white transition-colors"
                        title="Edit metadata"
                        onClick={() => navigate(`/dashboard/upload?releaseId=${song.releaseId}`)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {trackPage < sortedTracks.length && (
              <Button
                variant="outline"
                className="mt-4 w-full border-[#FF6B00]/20 bg-transparent text-white hover:bg-[#0A0A0A]"
                onClick={() => setTrackPage((p) => p + 5)}
              >
                Load More ({sortedTracks.length - trackPage} remaining)
              </Button>
            )}
          </>
        )}
      </Card>

      {/* Upcoming Releases + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Upcoming Releases */}
        <Card className="border border-[#FF6B00]/20 bg-[#161616] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Upcoming Releases</h3>
              <p className="text-xs text-[#B3B3B3]">Scheduled, in review, or processing</p>
            </div>
            <Button size="sm" variant="ghost" className="text-[#FFD600] hover:bg-[#0A0A0A]" asChild>
              <Link to="/dashboard/releases">All <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>

          {liveLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 rounded-lg bg-[#0A0A0A] p-3">
                  <div className="h-12 w-12 rounded-lg bg-[#333]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 rounded bg-[#333]" />
                    <div className="h-3 w-20 rounded bg-[#222]" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-[#222]" />
                </div>
              ))}
            </div>
          ) : upcomingReleases.length === 0 ? (
            <EmptyState icon={Calendar} title="No upcoming releases" message="Submit a release to track its status here." action={{ label: 'Create Release', to: '/dashboard/upload' }} />
          ) : (
            <div className="space-y-2">
              {upcomingReleases.map((rel) => {
                const countdown = getCountdown(rel.releaseDate);
                return (
                  <div key={rel.id} className="flex items-center gap-3 rounded-lg bg-[#0A0A0A] p-3 transition-colors hover:bg-[#120D09]">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#FF6B00]/10 bg-[#161616]">
                      {rel.artworkUrl
                        ? <ImageWithFallback src={rel.artworkUrl} alt={rel.title} className="h-full w-full object-cover" />
                        : <div className="flex h-full w-full items-center justify-center"><Music className="h-5 w-5 text-[#FF6B00]/30" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">{rel.title}</p>
                      <p className="truncate text-xs text-[#B3B3B3]">{rel.primaryArtist}</p>
                      {countdown && (
                        <p className="flex items-center gap-1 text-xs text-[#FFD600]">
                          <Clock className="h-3 w-3" /> {countdown}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={rel.status} />
                      <div className="flex gap-1">
                        <button
                          className="rounded p-1 text-[#B3B3B3] hover:bg-[#161616] hover:text-white transition-colors"
                          title="Edit"
                          onClick={() => navigate(`/dashboard/upload?releaseId=${rel.id}`)}
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          className="rounded p-1 text-[#B3B3B3] hover:bg-[#161616] hover:text-white transition-colors"
                          title="View"
                          onClick={() => navigate('/dashboard/releases')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card className="border border-[#FF6B00]/20 bg-[#161616] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              <p className="text-xs text-[#B3B3B3]">Latest events from your account</p>
            </div>
            <button
              className="rounded-lg p-1.5 text-[#B3B3B3] hover:bg-[#0A0A0A] hover:text-white transition-colors"
              title="Refresh"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {liveLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-3">
                  <div className="mt-2 h-2 w-2 rounded-full bg-[#333]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-48 rounded bg-[#333]" />
                    <div className="h-3 w-16 rounded bg-[#222]" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <EmptyState icon={Zap} title="No activity yet" message="Your releases, payouts, and analytics events will appear here." />
          ) : (
            <>
              <div className="space-y-2">
                {recentActivity.slice(0, activityPage).map((a) => {
                  const dotCls = a.type === 'success' ? 'bg-[#1DB954]' : a.type === 'achievement' ? 'bg-[#FFD600]' : a.type === 'warning' ? 'bg-red-400' : 'bg-[#FF6B00]';
                  const badgeCls = a.type === 'success' ? 'border-green-500/20 text-green-300' : a.type === 'achievement' ? 'border-[#FFD600]/20 text-[#FFD600]' : a.type === 'warning' ? 'border-red-500/20 text-red-300' : 'border-[#FF6B00]/20 text-[#B3B3B3]';
                  const icon = a.type === 'success' ? '✓' : a.type === 'achievement' ? '🎉' : a.type === 'warning' ? '⚠' : 'ℹ';
                  return (
                    <div key={a.id} className="flex items-start gap-3 rounded-lg bg-[#0A0A0A] p-3 hover:bg-[#120D09] transition-colors">
                      <div className={`mt-2 h-2 w-2 shrink-0 rounded-full ${dotCls}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-snug">{a.action}</p>
                        <p className="mt-0.5 text-xs text-[#B3B3B3]">{a.time}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-xs ${badgeCls}`}>{icon}</Badge>
                    </div>
                  );
                })}
              </div>

              {activityPage < recentActivity.length ? (
                <Button
                  variant="outline"
                  className="mt-4 w-full border-[#FF6B00]/20 bg-transparent text-white hover:bg-[#0A0A0A]"
                  onClick={() => setActivityPage((p) => p + 4)}
                >
                  Load More
                </Button>
              ) : (
                <Button variant="outline" className="mt-4 w-full border-[#FF6B00]/20 bg-transparent text-white hover:bg-[#0A0A0A]" asChild>
                  <Link to="/dashboard/reports">View Live Reports</Link>
                </Button>
              )}
            </>
          )}
        </Card>
      </div>

    </div>
  );
}
