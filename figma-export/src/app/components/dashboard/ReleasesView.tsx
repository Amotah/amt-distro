import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import MusicPlatformLogos, { PlatformLogo } from './MusicPlatformLogos';
import * as userApi from '../../utils/user-api';
import {
  getAnalyticsSummary,
  type AnalyticsSummary,
} from '../../utils/analytics-api';
import {
  Search,
  Music,
  Play,
  Pause,
  MoreVertical,
  Calendar,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Plus,
  Link2,
  Clock3,
  AlertCircle,
  LayoutGrid,
  LayoutList,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Archive,
  CheckSquare,
  Square,
  TrendingUp,
  Users,
  Globe,
  BarChart2,
  X,
  Copy,
  RefreshCw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Mic2,
  Headphones,
  Radio,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;
const PLATFORM_COLORS = ['#1DB954', '#FA243C', '#FF0000', '#FF9900', '#2563EB', '#9333EA', '#FF5500', '#18A64A'];

type SortKey = 'title' | 'primaryArtist' | 'type' | 'releaseDate' | 'status';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';
type StatusFilter = 'all' | 'draft' | 'validated' | 'submitted' | 'live' | 'rejected' | 'processing';
type TypeFilter = 'all' | 'single' | 'ep' | 'album';
type DateRangeFilter = '30' | '90' | 'all';
type DetailTab = 'overview' | 'tracks' | 'analytics' | 'collaborators' | 'history';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Draft',
    validated: 'Validated',
    submitted: 'In Review',
    live: 'Live',
    rejected: 'Rejected',
    processing: 'Processing',
  };
  return map[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'live':      return 'bg-green-600 text-white';
    case 'submitted': return 'bg-blue-600 text-white';
    case 'validated': return 'bg-indigo-500 text-white';
    case 'processing':return 'bg-sky-500 text-white';
    case 'draft':     return 'bg-zinc-600 text-white';
    case 'rejected':  return 'bg-red-600 text-white';
    default:          return 'bg-amber-600 text-white';
  }
}

function deliveryStatusClass(status: string) {
  switch (status) {
    case 'live':      return 'text-green-400';
    case 'ingested':  return 'text-green-300';
    case 'delivered': return 'text-blue-400';
    case 'processing':return 'text-sky-400';
    case 'pending':   return 'text-amber-400';
    case 'failed':
    case 'rejected':  return 'text-red-400';
    case 'takedown':  return 'text-zinc-400';
    default:          return 'text-zinc-400';
  }
}

function deliveryStatusIcon(status: string) {
  switch (status) {
    case 'live':      return '✓';
    case 'ingested':  return '✓';
    case 'delivered': return '⏳';
    case 'processing':return '⟳';
    case 'pending':   return '◌';
    case 'failed':    return '✗';
    case 'rejected':  return '✗';
    case 'takedown':  return '⊘';
    default:          return '·';
  }
}

function typeLabel(type: string) {
  return type.toUpperCase();
}

function releaseArtwork(release: userApi.Release) {
  return release.artworkUrl || release.artworkPath || '';
}

function releaseArtist(release: userApi.Release) {
  return release.primaryArtist || release.label || 'Unknown Artist';
}

function releaseCode(release: userApi.Release) {
  return `REL-${new Date(release.createdAt).getFullYear()}-${release.id.slice(0, 6).toUpperCase()}`;
}

function releasePlatforms(release: userApi.Release) {
  return release.selectedPlatforms || [];
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatCompact(n: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }).format(n);
}

function formatCurrency(n: number) {
  return `₦${n.toLocaleString('en-US')}`;
}

function exportReleasesCSV(releases: userApi.Release[]) {
  const header = ['ID', 'Title', 'Artist', 'Type', 'Status', 'Release Date', 'UPC', 'Platforms', 'Created'];
  const rows = releases.map((r) => [
    r.id,
    `"${r.title.replace(/"/g, '""')}"`,
    `"${releaseArtist(r).replace(/"/g, '""')}"`,
    r.type,
    r.status,
    r.releaseDate,
    r.upc || '',
    `"${releasePlatforms(r).join(', ')}"`,
    r.createdAt,
  ]);
  const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `releases-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-[#FF6B00]" />
    : <ChevronDown className="w-3.5 h-3.5 text-[#FF6B00]" />;
}

function EmptyState({ query, dashboardBasePath }: { query: string; dashboardBasePath: string }) {
  return (
    <Card className="p-12 text-center border-[#FF6B00]/20 bg-[#111111] text-white">
      <Music className="w-16 h-16 text-[#B3B3B3] mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">No releases found</h3>
      <p className="text-[#B3B3B3] mb-6">
        {query ? 'Try adjusting your search or filters' : 'Start by uploading your first release'}
      </p>
      <Link to={`${dashboardBasePath}/upload`}>
        <Button className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]">
          <Plus className="w-4 h-4 mr-2" />
          Upload New Release
        </Button>
      </Link>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Tabs
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({
  release,
  tracks,
  deliveries,
  releaseTimeline,
  playingId,
  onTogglePreview,
  dashboardBasePath,
  onOpenDeliveryLinks,
}: {
  release: userApi.Release;
  tracks: userApi.ReleaseTrack[];
  deliveries: userApi.DSPDelivery[];
  releaseTimeline: { label: string; value: string }[];
  playingId: string | null;
  onTogglePreview: (release: userApi.Release) => void;
  dashboardBasePath: string;
  onOpenDeliveryLinks: () => void;
}) {
  const platformStatuses = useMemo(() => {
    if (deliveries.length > 0) {
      return deliveries.map((d) => ({
        platform: d.platform,
        code: d.platformReleaseId || `${d.platform.slice(0, 3).toUpperCase()}-${release.id.slice(0, 6)}`,
        status: d.status,
        url: d.platformUrl,
        updatedAt: d.updatedAt,
      }));
    }
    return releasePlatforms(release).map((platform, i) => ({
      platform,
      code: `${platform.slice(0, 3).toUpperCase()}-${release.id.slice(0, 6)}-${i + 1}`,
      status:
        release.status === 'draft' ? 'pending'
        : (release.status === 'processing' || release.status === 'submitted' || release.status === 'validated') ? 'processing'
        : 'live',
      url: undefined,
      updatedAt: release.updatedAt,
    }));
  }, [deliveries, release]);

  return (
    <div className="space-y-5">
      {/* Key info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Release Code', value: releaseCode(release) },
          { label: 'UPC', value: release.upc || 'Pending' },
          { label: 'Release Date', value: release.releaseDate },
          { label: 'Genre', value: release.genre },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-3">
            <p className="text-xs text-[#B3B3B3] uppercase tracking-wider mb-1">{item.label}</p>
            <p className="font-medium text-sm truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Distribution */}
      <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">Distribution Status</h4>
          <Badge variant="outline" className="border-[#FFD600]/30 text-[#FFD600] text-xs">
            {platformStatuses.length} Platforms
          </Badge>
        </div>
        <div className="space-y-2">
          {platformStatuses.map((item) => (
            <div key={item.code} className="flex items-center justify-between rounded-lg bg-black/30 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <PlatformLogo platform={item.platform} size={32} />
                <span className="text-xs text-[#B3B3B3]">{item.code}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer"
                    className="text-xs text-[#FF6B00] hover:underline flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    View
                  </a>
                )}
                <span className={`text-sm font-medium ${deliveryStatusClass(item.status)}`}>
                  {deliveryStatusIcon(item.status)} {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-4">
        <h4 className="font-semibold mb-3">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm"
            className="border-[#FF6B00]/30 bg-transparent text-white hover:bg-[#FF6B00]/10"
            onClick={() => onTogglePreview(release)}
            disabled={!release.audioPreviewUrl}>
            {playingId === release.id ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
            {playingId === release.id ? 'Pause' : 'Preview'}
          </Button>
          <Link to={`${dashboardBasePath}/upload?releaseId=${release.id}`}>
            <Button variant="outline" size="sm" className="border-[#FF6B00]/30 bg-transparent text-white hover:bg-[#FF6B00]/10">
              <Edit className="w-4 h-4 mr-1.5" />
              Edit Release
            </Button>
          </Link>
          <Button variant="outline" size="sm"
            className="border-[#FF6B00]/30 bg-transparent text-white hover:bg-[#FF6B00]/10"
            onClick={onOpenDeliveryLinks}
            disabled={platformStatuses.every((p) => !p.url)}>
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Open Links
          </Button>
        </div>
      </div>

      {/* Track listing */}
      {tracks.length > 0 && (
        <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-4">
          <h4 className="font-semibold mb-3">Track Listing</h4>
          <div className="space-y-2">
            {tracks.map((track, i) => (
              <div key={track.id} className="flex items-center justify-between rounded-lg bg-black/30 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#B3B3B3] w-5 text-right">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{track.title}</p>
                    <p className="text-xs text-[#B3B3B3]">{track.isrc || 'ISRC pending'}</p>
                  </div>
                </div>
                <span className="text-xs text-[#B3B3B3]">{formatDuration(track.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock3 className="w-4 h-4 text-[#FFD600]" />
          <h4 className="font-semibold">Timeline</h4>
        </div>
        <ol className="relative border-l border-[#FF6B00]/20 ml-3 space-y-3">
          {releaseTimeline.map((item) => (
            <li key={`${item.label}-${item.value}`} className="pl-4">
              <span className="absolute -left-1.5 w-3 h-3 rounded-full border border-[#FF6B00]/40 bg-[#161616]" />
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-[#B3B3B3]">{item.value}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function TracksTab({
  tracks,
  playingId,
  onToggleTrackPreview,
}: {
  tracks: userApi.ReleaseTrack[];
  playingId: string | null;
  onToggleTrackPreview: (trackId: string, url?: string) => void;
}) {
  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-[#B3B3B3]">
        <Disc3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No track details available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#FF6B00]/10 text-[#B3B3B3] text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-8">#</th>
            <th className="px-4 py-3 text-left">Track Title</th>
            <th className="px-4 py-3 text-left hidden md:table-cell">Duration</th>
            <th className="px-4 py-3 text-left hidden lg:table-cell">ISRC</th>
            <th className="px-4 py-3 text-left hidden lg:table-cell">Genre</th>
            <th className="px-4 py-3 text-center">Preview</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#FF6B00]/10">
          {tracks.map((track, i) => (
            <tr key={track.id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 text-[#B3B3B3]">{i + 1}</td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium">{track.title}</p>
                  {track.version && <p className="text-xs text-[#B3B3B3]">{track.version}</p>}
                  {track.explicit && <Badge className="text-xs bg-zinc-700 text-zinc-100 mt-0.5">E</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-[#B3B3B3]">{formatDuration(track.duration)}</td>
              <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs text-[#B3B3B3]">{track.isrc || '—'}</td>
              <td className="px-4 py-3 hidden lg:table-cell text-[#B3B3B3]">{track.genre}</td>
              <td className="px-4 py-3 text-center">
                <button
                  className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  disabled={!track.audioFileUrl}
                  onClick={() => onToggleTrackPreview(track.id, track.audioFileUrl)}
                  aria-label={playingId === track.id ? 'Pause' : 'Play preview'}
                  title={playingId === track.id ? 'Pause' : 'Play preview'}>
                  {playingId === track.id
                    ? <Pause className="w-4 h-4 text-[#FF6B00]" />
                    : <Play className="w-4 h-4 text-[#B3B3B3]" />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsTab({
  analytics,
  analyticsLoading,
  analyticsError,
  range,
  onRangeChange,
}: {
  analytics: AnalyticsSummary | null;
  analyticsLoading: boolean;
  analyticsError: string;
  range: string;
  onRangeChange: (r: string) => void;
}) {
  if (analyticsLoading) {
    return (
      <div className="py-16 text-center text-[#B3B3B3] flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
        <p>Loading analytics…</p>
      </div>
    );
  }

  if (analyticsError || !analytics) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm">{analyticsError || 'Analytics data unavailable.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Range selector */}
      <div className="flex gap-2">
        {[{ label: 'Last 30 days', value: '30d' }, { label: 'Last 90 days', value: '90d' }, { label: 'All time', value: 'all' }].map((opt) => (
          <button
            key={opt.value}
            onClick={() => onRangeChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${range === opt.value ? 'bg-[#FF6B00] text-white' : 'bg-[#0A0A0A] border border-[#FF6B00]/20 text-[#B3B3B3] hover:text-white'}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Streams', value: formatCompact(analytics.metrics.totalStreams), icon: <Play className="w-4 h-4" /> },
          { label: 'Listeners', value: formatCompact(analytics.metrics.reportedListeners), icon: <Headphones className="w-4 h-4" /> },
          { label: 'Countries', value: analytics.metrics.countries, icon: <Globe className="w-4 h-4" /> },
          { label: 'Revenue', value: formatCurrency(analytics.metrics.totalRevenue), icon: <TrendingUp className="w-4 h-4" /> },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-3">
            <div className="flex items-center gap-2 text-[#B3B3B3] mb-1">{m.icon}<span className="text-xs uppercase tracking-wider">{m.label}</span></div>
            <p className="text-xl font-semibold">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Streams trend */}
      {analytics.trend.length > 0 && (
        <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-4">
          <h4 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#FF6B00]" />Streams Trend</h4>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analytics.trend}>
              <defs>
                <linearGradient id="streamsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="label" tick={{ fill: '#777', fontSize: 11 }} />
              <YAxis tick={{ fill: '#777', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #FF6B00', borderRadius: 8 }} />
              <Area type="monotone" dataKey="streams" stroke="#FF6B00" fill="url(#streamsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Platform breakdown */}
      {analytics.platformBreakdown.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-4">
            <h4 className="font-semibold mb-4 flex items-center gap-2"><Radio className="w-4 h-4 text-[#FF6B00]" />Streams by Platform</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={analytics.platformBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#777', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#ccc', fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ background: '#111', border: '1px solid #FF6B00', borderRadius: 8 }} />
                <Bar dataKey="streams" radius={4}>
                  {analytics.platformBreakdown.map((_, i) => (
                    <Cell key={i} fill={PLATFORM_COLORS[i % PLATFORM_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-4">
            <h4 className="font-semibold mb-4 flex items-center gap-2"><PieIcon className="w-4 h-4 text-[#FF6B00]" />Revenue by Platform</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={analytics.platformBreakdown} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {analytics.platformBreakdown.map((_, i) => (
                    <Cell key={i} fill={PLATFORM_COLORS[i % PLATFORM_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#111', border: '1px solid #FF6B00', borderRadius: 8 }}
                  formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#999' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top countries */}
      {analytics.geographyBreakdown.length > 0 && (
        <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-[#FF6B00]" />Top Countries</h4>
          <div className="space-y-2">
            {analytics.geographyBreakdown.slice(0, 8).map((geo) => (
              <div key={geo.country} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate">{geo.country}</span>
                <div className="flex-1">
                  <Progress value={geo.percentage} className="h-1.5 bg-[#222]" />
                </div>
                <span className="text-xs text-[#B3B3B3] w-24 text-right">{formatCompact(geo.streams)} ({geo.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({
  release,
  deliveries,
}: {
  release: userApi.Release;
  deliveries: userApi.DSPDelivery[];
}) {
  const events = useMemo(() => {
    const items: { label: string; value: string; type: 'info' | 'success' | 'warn' }[] = [
      { label: 'Release created', value: new Date(release.createdAt).toLocaleString(), type: 'info' },
      { label: 'Last updated', value: new Date(release.updatedAt).toLocaleString(), type: 'info' },
      { label: 'Scheduled release date', value: new Date(release.releaseDate).toLocaleDateString(), type: 'info' },
    ];
    deliveries.forEach((d) => {
      if (d.submittedAt) items.push({ label: `${d.platform} — submitted`, value: new Date(d.submittedAt).toLocaleString(), type: 'info' });
      if (d.deliveredAt) items.push({ label: `${d.platform} — delivered`, value: new Date(d.deliveredAt).toLocaleString(), type: 'success' });
      if (d.goLiveDate) items.push({ label: `${d.platform} — went live`, value: new Date(d.goLiveDate).toLocaleString(), type: 'success' });
      if (d.errorMessage) items.push({ label: `${d.platform} — error: ${d.errorMessage}`, value: new Date(d.updatedAt).toLocaleString(), type: 'warn' });
    });
    items.sort((a, b) => new Date(a.value).getTime() - new Date(b.value).getTime());
    return items;
  }, [release, deliveries]);

  const dot = (type: string) =>
    type === 'success' ? 'bg-green-500' : type === 'warn' ? 'bg-amber-500' : 'bg-[#FF6B00]';

  return (
    <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-5">
      <h4 className="font-semibold mb-4 flex items-center gap-2"><Clock3 className="w-4 h-4 text-[#FFD600]" />Release History</h4>
      <ol className="relative border-l border-[#FF6B00]/20 ml-3 space-y-4">
        {events.map((ev, i) => (
          <li key={i} className="pl-5 relative">
            <span className={`absolute -left-1.5 w-3 h-3 rounded-full ${dot(ev.type)}`} />
            <p className="text-sm font-medium">{ev.label}</p>
            <p className="text-xs text-[#B3B3B3]">{ev.value}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Release Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

function ReleaseDetailModal({
  release,
  onClose,
  dashboardBasePath,
  playingId,
  onTogglePreview,
}: {
  release: userApi.Release;
  onClose: () => void;
  dashboardBasePath: string;
  playingId: string | null;
  onTogglePreview: (release: userApi.Release) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [tracks, setTracks] = useState<userApi.ReleaseTrack[]>([]);
  const [deliveries, setDeliveries] = useState<userApi.DSPDelivery[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsRange, setAnalyticsRange] = useState('30d');

  // track-level audio preview
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const trackAudioRef = useRef<HTMLAudioElement | null>(null);

  // load release details
  useEffect(() => {
    let mounted = true;
    async function load() {
      setDetailLoading(true);
      const [detailResult, deliveryResult] = await Promise.allSettled([
        userApi.getReleaseById(release.id),
        userApi.getReleaseDeliveries(release.id),
      ]);
      if (!mounted) return;
      if (detailResult.status === 'fulfilled') {
        setTracks(detailResult.value.tracks);
      } else {
        const cached = userApi.getCachedReleaseDetails(release.id);
        setTracks(cached.tracks);
      }
      if (deliveryResult.status === 'fulfilled') {
        setDeliveries(deliveryResult.value);
      } else {
        setDeliveries(userApi.getCachedReleaseDeliveries(release.id));
      }
      setDetailLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [release.id]);

  // load analytics when tab active
  useEffect(() => {
    if (activeTab !== 'analytics') return;
    let mounted = true;
    async function load() {
      setAnalyticsLoading(true);
      setAnalyticsError('');
      try {
        const data = await getAnalyticsSummary(analyticsRange);
        if (mounted) setAnalytics(data);
      } catch (e: any) {
        if (mounted) setAnalyticsError(e.message || 'Failed to load analytics');
      } finally {
        if (mounted) setAnalyticsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [activeTab, analyticsRange]);

  useEffect(() => {
    return () => { trackAudioRef.current?.pause(); };
  }, []);

  function toggleTrackPreview(trackId: string, url?: string) {
    if (playingTrackId === trackId) {
      trackAudioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }
    if (!url) return;
    trackAudioRef.current?.pause();
    const audio = new Audio(url);
    audio.onended = () => setPlayingTrackId(null);
    audio.play().catch(() => setPlayingTrackId(null));
    trackAudioRef.current = audio;
    setPlayingTrackId(trackId);
  }

  const releaseTimeline = useMemo(() => {
    const items: { label: string; value: string }[] = [
      { label: 'Created', value: new Date(release.createdAt).toLocaleString() },
      { label: 'Updated', value: new Date(release.updatedAt).toLocaleString() },
      { label: 'Scheduled Release', value: new Date(release.releaseDate).toLocaleDateString() },
    ];
    deliveries.forEach((d) => {
      if (d.submittedAt) items.push({ label: `${d.platform} submitted`, value: new Date(d.submittedAt).toLocaleString() });
      if (d.deliveredAt) items.push({ label: `${d.platform} delivered`, value: new Date(d.deliveredAt).toLocaleString() });
      if (d.goLiveDate) items.push({ label: `${d.platform} go-live`, value: new Date(d.goLiveDate).toLocaleString() });
    });
    return items;
  }, [deliveries, release]);

  function openDeliveryLinks() {
    deliveries
      .filter((d) => d.platformUrl)
      .forEach((d) => window.open(d.platformUrl!, '_blank', 'noopener,noreferrer'));
  }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'tracks', label: `Tracks${tracks.length > 0 ? ` (${tracks.length})` : ''}` },
    { id: 'analytics', label: 'Analytics' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4">
      <div className="w-full sm:max-w-5xl max-h-screen sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-2xl border border-[#FF6B00]/20 bg-[#111111] text-white shadow-2xl overflow-hidden">
        {/* Header strip */}
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[#FF6B00]/20 bg-[#0D0D0D] shrink-0">
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <ImageWithFallback src={releaseArtwork(release)} alt={release.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{release.title}</h3>
              <Badge className={`${statusBadgeClass(release.status)} text-xs shrink-0`}>{statusLabel(release.status)}</Badge>
              <Badge variant="outline" className="border-white/20 text-xs shrink-0">{typeLabel(release.type)}</Badge>
            </div>
            <p className="text-sm text-[#B3B3B3] truncate">{releaseArtist(release)} · {release.releaseDate}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0" aria-label="Close" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#FF6B00]/20 bg-[#0D0D0D] overflow-x-auto shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#FF6B00] text-[#FF6B00]'
                  : 'border-transparent text-[#B3B3B3] hover:text-white'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {detailLoading && activeTab === 'overview' && (
            <div className="flex items-center gap-2 text-[#B3B3B3] text-sm mb-4">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading details…
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewTab
              release={release}
              tracks={tracks}
              deliveries={deliveries}
              releaseTimeline={releaseTimeline}
              playingId={playingId}
              onTogglePreview={onTogglePreview}
              dashboardBasePath={dashboardBasePath}
              onOpenDeliveryLinks={openDeliveryLinks}
            />
          )}
          {activeTab === 'tracks' && (
            <TracksTab tracks={tracks} playingId={playingTrackId} onToggleTrackPreview={toggleTrackPreview} />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab
              analytics={analytics}
              analyticsLoading={analyticsLoading}
              analyticsError={analyticsError}
              range={analyticsRange}
              onRangeChange={setAnalyticsRange}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab release={release} deliveries={deliveries} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Action Bar
// ─────────────────────────────────────────────────────────────────────────────

function BulkActionBar({
  selectedIds,
  releases,
  onClear,
}: {
  selectedIds: Set<string>;
  releases: userApi.Release[];
  onClear: () => void;
}) {
  const selected = releases.filter((r) => selectedIds.has(r.id));

  function handleExport() {
    exportReleasesCSV(selected);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-xl text-sm">
      <span className="font-medium">{selectedIds.size} selected</span>
      <div className="flex-1" />
      <Button variant="outline" size="sm"
        className="border-[#FF6B00]/30 bg-transparent text-white hover:bg-[#FF6B00]/10"
        onClick={handleExport}>
        <Download className="w-4 h-4 mr-1.5" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm"
        className="border-white/20 bg-transparent text-[#B3B3B3] hover:text-white"
        onClick={onClear}>
        <X className="w-4 h-4 mr-1.5" />
        Clear
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ReleasesView() {
  const location = useLocation();
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const dashboardBasePath = isLabelDashboard ? '/label-dashboard' : '/dashboard';

  // ── Data ──
  const [releases, setReleases] = useState<userApi.Release[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [releaseError, setReleaseError] = useState('');

  // ── View state ──
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('releaseDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Detail modal ──
  const [selectedRelease, setSelectedRelease] = useState<userApi.Release | null>(null);

  // ── Audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingReleaseId, setPlayingReleaseId] = useState<string | null>(null);

  // ─── Load releases ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingReleases(true);
      setReleaseError('');
      try {
        const data = await userApi.getUserReleases();
        if (mounted) setReleases(data);
      } catch {
        if (mounted) {
          const cached = userApi.getCachedUserReleases();
          if (cached.length > 0) {
            setReleaseError('Showing cached releases. Live sync is temporarily unavailable.');
            setReleases(cached);
          } else {
            setReleaseError('Unable to load releases. Please check your connection and try again.');
          }
        }
      } finally {
        if (mounted) setLoadingReleases(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  // ─── Filtering & sorting ─────────────────────────────────────────────────
  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    releases.forEach((r) => releasePlatforms(r).forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [releases]);

  const dateThreshold = useMemo(() => {
    if (dateRange === 'all') return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(dateRange));
    return d;
  }, [dateRange]);

  const filtered = useMemo(() => {
    return releases.filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchArtist = releaseArtist(r).toLowerCase().includes(q);
        const matchUpc = (r.upc || '').toLowerCase().includes(q);
        if (!matchTitle && !matchArtist && !matchUpc) return false;
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (dateThreshold) {
        const releaseD = new Date(r.releaseDate);
        if (releaseD < dateThreshold) return false;
      }
      if (platformFilter !== 'all') {
        if (!releasePlatforms(r).includes(platformFilter)) return false;
      }
      return true;
    });
  }, [releases, searchQuery, statusFilter, typeFilter, dateThreshold, platformFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'title':         cmp = a.title.localeCompare(b.title); break;
        case 'primaryArtist': cmp = releaseArtist(a).localeCompare(releaseArtist(b)); break;
        case 'type':          cmp = a.type.localeCompare(b.type); break;
        case 'releaseDate':   cmp = new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(); break;
        case 'status':        cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, typeFilter, dateRange, platformFilter]);

  // ─── Selection ────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((r) => r.id)));
    }
  }

  // ─── Audio preview ────────────────────────────────────────────────────────
  function togglePreview(release: userApi.Release) {
    if (playingReleaseId === release.id) {
      audioRef.current?.pause();
      setPlayingReleaseId(null);
      return;
    }
    if (!release.audioPreviewUrl) return;
    audioRef.current?.pause();
    const audio = new Audio(release.audioPreviewUrl);
    audio.onended = () => setPlayingReleaseId(null);
    audio.play().catch(() => setPlayingReleaseId(null));
    audioRef.current = audio;
    setPlayingReleaseId(release.id);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      releases.length,
    live:       releases.filter((r) => r.status === 'live').length,
    inReview:   releases.filter((r) => ['submitted', 'validated', 'processing'].includes(r.status)).length,
    draft:      releases.filter((r) => r.status === 'draft').length,
  }), [releases]);

  // ─── Table header cell ────────────────────────────────────────────────────
  const Th = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`px-4 py-3 text-left text-xs uppercase tracking-wider text-[#B3B3B3] cursor-pointer select-none hover:text-white whitespace-nowrap ${className}`}
      onClick={() => handleSort(col)}>
      <div className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </div>
    </th>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Releases</h2>
          <p className="text-sm text-[#B3B3B3] mt-0.5">Manage, distribute and track all your music releases</p>
        </div>
        <Link to={`${dashboardBasePath}/upload`}>
          <Button className="bg-[#FF6B00] hover:bg-[#ff7f26] text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Release
          </Button>
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Live', value: stats.live, color: 'text-green-400' },
          { label: 'In Review', value: stats.inReview, color: 'text-blue-400' },
          { label: 'Draft', value: stats.draft, color: 'text-zinc-400' },
        ].map((s) => (
          <Card key={s.label} className="border-[#FF6B00]/20 bg-[#111111] px-4 py-3 text-white">
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#B3B3B3] mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* ── Error banner ── */}
      {releaseError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{releaseError}</p>
        </div>
      )}

      {/* ── Filters + view toggle ── */}
      <Card className="border-[#FF6B00]/20 bg-[#111111] p-4 text-white">
        <div className="flex flex-col gap-3">
          {/* Row 1: search + view toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, artist, UPC…"
                className="pl-9 bg-[#0A0A0A] border-[#FF6B00]/20 text-white placeholder:text-[#666]"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-lg border transition-colors ${viewMode === 'table' ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-[#FF6B00]/20 text-[#666] hover:text-white'}`}
                aria-label="Table view" title="Table view">
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg border transition-colors ${viewMode === 'grid' ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-[#FF6B00]/20 text-[#666] hover:text-white'}`}
                aria-label="Grid view" title="Grid view">
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: filter dropdowns */}
          <div className="flex flex-wrap gap-2">
            {[
              {
                value: statusFilter,
                onChange: (v: string) => setStatusFilter(v as StatusFilter),
                label: 'Status',
                options: [
                  { value: 'all', label: 'All Status' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'submitted', label: 'In Review' },
                  { value: 'validated', label: 'Validated' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'live', label: 'Live' },
                  { value: 'rejected', label: 'Rejected' },
                ],
              },
              {
                value: typeFilter,
                onChange: (v: string) => setTypeFilter(v as TypeFilter),
                label: 'Type',
                options: [
                  { value: 'all', label: 'All Types' },
                  { value: 'single', label: 'Single' },
                  { value: 'ep', label: 'EP' },
                  { value: 'album', label: 'Album' },
                ],
              },
              {
                value: dateRange,
                onChange: (v: string) => setDateRange(v as DateRangeFilter),
                label: 'Date',
                options: [
                  { value: 'all', label: 'All Time' },
                  { value: '30', label: 'Last 30 Days' },
                  { value: '90', label: 'Last 90 Days' },
                ],
              },
              {
                value: platformFilter,
                onChange: (v: string) => setPlatformFilter(v),
                label: 'Platform',
                options: [
                  { value: 'all', label: 'All Platforms' },
                  ...allPlatforms.map((p) => ({ value: p, label: p })),
                ],
              },
            ].map((f) => (
              <select
                key={f.label}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                aria-label={`Filter by ${f.label}`}
                title={`Filter by ${f.label}`}
                className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF6B00]">
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ))}

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              aria-label="Releases per page"
              title="Releases per page"
              className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF6B00] ml-auto">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ── Bulk actions ── */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          releases={releases}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* ── Loading ── */}
      {loadingReleases && (
        <Card className="border-[#FF6B00]/20 bg-[#111111] p-10 text-center text-[#B3B3B3]">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" />
          <p className="text-sm">Loading your releases…</p>
        </Card>
      )}

      {/* ── Table view ── */}
      {!loadingReleases && viewMode === 'table' && (
        sorted.length === 0 ? (
          <EmptyState query={searchQuery} dashboardBasePath={dashboardBasePath} />
        ) : (
          <Card className="border-[#FF6B00]/20 bg-[#111111] text-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[#FF6B00]/10 bg-[#0D0D0D]">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleSelectAll} aria-label="Select all" title="Select all">
                        {selectedIds.size > 0 && selectedIds.size === paginated.length
                          ? <CheckSquare className="w-4 h-4 text-[#FF6B00]" />
                          : <Square className="w-4 h-4 text-[#666]" />}
                      </button>
                    </th>
                    <th className="px-4 py-3 w-14" />
                    <Th col="title" label="Title" />
                    <Th col="primaryArtist" label="Artist" className="hidden md:table-cell" />
                    <Th col="type" label="Type" className="hidden sm:table-cell" />
                    <Th col="releaseDate" label="Release Date" className="hidden lg:table-cell" />
                    <Th col="status" label="Status" />
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[#B3B3B3] hidden xl:table-cell">Platforms</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FF6B00]/10">
                  {paginated.map((release) => (
                    <tr
                      key={release.id}
                      className={`hover:bg-white/3 transition-colors cursor-pointer ${selectedIds.has(release.id) ? 'bg-[#FF6B00]/5' : ''}`}
                      onClick={() => setSelectedRelease(release)}>
                      <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(release.id); }}>
                        {selectedIds.has(release.id)
                          ? <CheckSquare className="w-4 h-4 text-[#FF6B00]" />
                          : <Square className="w-4 h-4 text-[#555]" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          <ImageWithFallback src={releaseArtwork(release)} alt={release.title} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[180px]">{release.title}</p>
                        <p className="text-xs text-[#B3B3B3] mt-0.5">{release.upc ? `UPC ${release.upc}` : releaseCode(release)}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-[#B3B3B3] text-sm">{releaseArtist(release)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant="outline" className="border-white/20 text-xs">{typeLabel(release.type)}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-[#B3B3B3] text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {release.releaseDate}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${statusBadgeClass(release.status)} text-xs`}>{statusLabel(release.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <MusicPlatformLogos platforms={releasePlatforms(release).slice(0, 4)} size={16} hideLabels compact className="gap-1" />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
                            disabled={!release.audioPreviewUrl}
                            onClick={() => togglePreview(release)}
                            aria-label={playingReleaseId === release.id ? 'Pause' : 'Preview'}
                            title={playingReleaseId === release.id ? 'Pause' : 'Preview'}>
                            {playingReleaseId === release.id
                              ? <Pause className="w-4 h-4 text-[#FF6B00]" />
                              : <Play className="w-4 h-4 text-[#B3B3B3]" />}
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            onClick={() => setSelectedRelease(release)}
                            aria-label="View details"
                            title="View details">
                            <Eye className="w-4 h-4 text-[#B3B3B3]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {/* ── Grid view ── */}
      {!loadingReleases && viewMode === 'grid' && (
        sorted.length === 0 ? (
          <EmptyState query={searchQuery} dashboardBasePath={dashboardBasePath} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginated.map((release) => (
              <Card
                key={release.id}
                className="border-[#FF6B00]/20 bg-[#111111] text-white overflow-hidden group cursor-pointer hover:-translate-y-0.5 transition-transform"
                onClick={() => setSelectedRelease(release)}>
                <div className="aspect-square relative">
                  <ImageWithFallback src={releaseArtwork(release)} alt={release.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors disabled:opacity-40"
                      disabled={!release.audioPreviewUrl}
                      onClick={(e) => { e.stopPropagation(); togglePreview(release); }}
                      aria-label={playingReleaseId === release.id ? 'Pause' : 'Preview'}
                      title={playingReleaseId === release.id ? 'Pause' : 'Preview'}>
                      {playingReleaseId === release.id
                        ? <Pause className="w-4 h-4" />
                        : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                      aria-label="Details" title="Details">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <Badge className={`absolute top-2 right-2 ${statusBadgeClass(release.status)} text-xs`}>{statusLabel(release.status)}</Badge>
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="font-semibold truncate text-sm">{release.title}</p>
                  <p className="text-xs text-[#B3B3B3] truncate">{releaseArtist(release)}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-white/20 text-xs">{typeLabel(release.type)}</Badge>
                    <span className="text-xs text-[#B3B3B3]">{release.releaseDate}</span>
                  </div>
                  <MusicPlatformLogos platforms={releasePlatforms(release).slice(0, 3)} size={14} hideLabels compact className="gap-1 mt-1" />
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── Pagination ── */}
      {!loadingReleases && sorted.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[#B3B3B3]">
          <span>
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length} releases
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page" title="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === pageNum ? 'bg-[#FF6B00] text-white' : 'hover:bg-white/10'}`}>
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page" title="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Release detail modal ── */}
      {selectedRelease && (
        <ReleaseDetailModal
          release={selectedRelease}
          onClose={() => setSelectedRelease(null)}
          dashboardBasePath={dashboardBasePath}
          playingId={playingReleaseId}
          onTogglePreview={togglePreview}
        />
      )}
    </div>
  );
}
