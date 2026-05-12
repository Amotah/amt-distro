import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  DollarSign,
  MapPin,
  Music,
  Play,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useDashboardWelcome } from '../../utils/dashboard-welcome';
import {
  getAnalyticsCatalogPerformance,
  getAnalyticsSummary,
  type AnalyticsCatalogPerformance,
  type AnalyticsSummary,
} from '../../utils/analytics-api';
import {
  getBillingHistory,
  getLabelArtistMonthlyTrends,
  getLabelArtistEarningsSummary,
  type BillingHistoryRecord,
  type LabelArtistMonthlyTrendsResponse,
  type LabelArtistEarningsSummary,
} from '../../utils/payment-api';
import { getLabelArtists, getUserReleases, type Release, type UserProfile } from '../../utils/user-api';

interface ComparisonChartPoint {
  month: string;
  labelRevenue: number;
  artistRevenue?: number;
}

interface PlatformDistributionItem {
  id: string;
  name: string;
  value: number;
  color: string;
  dotClassName: string;
}

interface TopSongItem {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  streams: string;
  revenue: string;
  change: string;
  trending: 'up' | 'down';
}

interface ActivityItem {
  action: string;
  time: string;
  type: 'success' | 'achievement' | 'info';
}

interface ArtistPerformanceItem {
  id: string;
  name: string;
  profileImage?: string;
  streams: number;
  revenue: number;
  createdAt: string;
}

interface QuickActionItem {
  label: string;
  description: string;
  to?: string;
  icon: typeof UserPlus;
  disabled?: boolean;
}

function getProfileInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getLabelStatus(profile: UserProfile | null, loading: boolean) {
  if (loading || !profile) {
    return 'Pending';
  }

  return profile.isVerified ? 'Active' : 'Suspended';
}

function getStatusBadgeClassName(status: string) {
  if (status === 'Active') {
    return 'border border-[#1DB954]/30 bg-[#1DB954]/15 text-[#7DFFAE]';
  }

  if (status === 'Suspended') {
    return 'border border-[#FF5C5C]/30 bg-[#FF5C5C]/15 text-[#FFB3B3]';
  }

  return 'border border-[#FFD600]/30 bg-[#FFD600]/15 text-[#FFE88A]';
}

function getAccountTypeLabel(subscriptionTier?: UserProfile['subscriptionTier']) {
  return subscriptionTier === 'partner' ? 'Enterprise' : 'Independent';
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number) {
  return `₦${value.toLocaleString('en-US')}`;
}

function formatCompactCurrency(value: number) {
  return `₦${formatCompactNumber(value)}`;
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Recently added';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTrendPercentage(currentValue: number, previousValue: number) {
  if (previousValue <= 0) {
    return '+0.0%';
  }

  const percentage = ((currentValue - previousValue) / previousValue) * 100;
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
}

function formatRelativeDate(value?: string | null) {
  if (!value) {
    return 'Recently';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Recently';
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonthLabel(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', { month: 'short' });
  }

  const fallback = new Date(`${value}-01T00:00:00Z`);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString('en-US', { month: 'short' });
  }

  return value;
}

function getPlatformPresentation(platformName: string) {
  const normalized = platformName.trim().toLowerCase();

  if (normalized.includes('spotify')) {
    return { color: '#1DB954', dotClassName: 'bg-[#1DB954]', label: 'Spotify' };
  }

  if (normalized.includes('apple')) {
    return { color: '#FA243C', dotClassName: 'bg-[#FA243C]', label: 'Apple Music' };
  }

  if (normalized.includes('youtube')) {
    return { color: '#FF0000', dotClassName: 'bg-[#FF0000]', label: 'YouTube Music' };
  }

  if (normalized.includes('audiomack')) {
    return { color: '#FFA200', dotClassName: 'bg-[#FFA200]', label: 'Audiomack' };
  }

  if (normalized.includes('boomplay')) {
    return { color: '#00C389', dotClassName: 'bg-[#00C389]', label: 'Boomplay' };
  }

  return { color: '#FF6B00', dotClassName: 'bg-[#FF6B00]', label: platformName || 'Others' };
}

function buildPlatformData(summary: LabelArtistEarningsSummary | null, analyticsSummary: AnalyticsSummary | null): PlatformDistributionItem[] {
  const royaltyEntries = Object.entries(summary?.platformBreakdown || {});
  const revenueTotal = royaltyEntries.reduce((sum, [, value]) => sum + value.revenue, 0);

  if (royaltyEntries.length > 0 && revenueTotal > 0) {
    return royaltyEntries
      .map(([name, value]) => {
        const presentation = getPlatformPresentation(name);
        return {
          id: name,
          name: presentation.label,
          value: Number(((value.revenue / revenueTotal) * 100).toFixed(1)),
          color: presentation.color,
          dotClassName: presentation.dotClassName,
        };
      })
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }

  const analyticsEntries = analyticsSummary?.platformBreakdown || [];
  const streamTotal = analyticsEntries.reduce((sum, item) => sum + item.streams, 0);

  if (analyticsEntries.length > 0 && streamTotal > 0) {
    return analyticsEntries
      .map((item) => {
        const presentation = getPlatformPresentation(item.name);
        return {
          id: item.name,
          name: presentation.label,
          value: Number(((item.streams / streamTotal) * 100).toFixed(1)),
          color: presentation.color,
          dotClassName: presentation.dotClassName,
        };
      })
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }

  return [];
}

function buildTopSongs(performance: AnalyticsCatalogPerformance | null, releases: Release[]): TopSongItem[] {
  const songs = performance?.topSongs || [];

  return songs.slice(0, 3).map((song, index) => {
    const matchingRelease = releases.find((release) => {
      return release.id === song.releaseId || release.title.toLowerCase() === song.songName.toLowerCase();
    });

    return {
      id: song.trackId || song.releaseId || `${song.songName}-${index}`,
      title: song.songName,
      artist: matchingRelease?.primaryArtist || song.platform,
      coverArt: matchingRelease?.artworkUrl || '',
      streams: formatCompactNumber(song.streams),
      revenue: formatCurrency(song.revenue),
      change: song.revenue >= 0 ? 'Live report' : 'Adjusted',
      trending: song.revenue >= 0 ? 'up' : 'down',
    };
  });
}

function buildRecentActivity(
  artists: UserProfile[],
  releases: Release[],
  billingHistory: BillingHistoryRecord[],
  analyticsSummary: AnalyticsSummary | null,
  labelSummary: LabelArtistEarningsSummary | null
): ActivityItem[] {
  const items: Array<ActivityItem & { createdAt: string }> = [];

  artists.forEach((artist) => {
    const artistName = artist.artistName || artist.username || artist.firstName || artist.email.split('@')[0] || 'Artist';
    items.push({
      action: `Artist "${artistName}" added to roster`,
      time: formatRelativeDate(artist.createdAt),
      type: 'success',
      createdAt: artist.createdAt,
    });
  });

  releases.forEach((release) => {
    const action = release.status === 'live'
      ? `Release "${release.title}" is now live`
      : `Release "${release.title}" updated`;
    const createdAt = release.updatedAt || release.createdAt;

    items.push({
      action,
      time: formatRelativeDate(createdAt),
      type: release.status === 'live' ? 'success' : 'info',
      createdAt,
    });
  });

  billingHistory.forEach((record) => {
    const createdAt = record.paidAt || record.updatedAt || record.createdAt;
    items.push({
      action: `${record.type === 'payout' ? 'Payout' : 'Payment'} ${record.status === 'completed' ? 'processed' : 'updated'} for ${formatCurrency(record.amount)}`,
      time: formatRelativeDate(createdAt),
      type: record.status === 'completed' ? 'success' : 'info',
      createdAt,
    });
  });

  if (analyticsSummary?.lastUpdated) {
    items.push({
      action: 'Analytics reports refreshed from the latest uploaded data',
      time: formatRelativeDate(analyticsSummary.lastUpdated),
      type: 'info',
      createdAt: analyticsSummary.lastUpdated,
    });
  }

  if ((labelSummary?.totalArtistStreams || 0) > 0) {
    items.push({
      action: `Label catalog reached ${formatCompactNumber(labelSummary?.totalArtistStreams || 0)} streams in live reporting`,
      time: formatRelativeDate(labelSummary?.updatedAt),
      type: 'achievement',
      createdAt: labelSummary?.updatedAt || new Date().toISOString(),
    });
  }

  return items
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 4)
    .map(({ createdAt, ...item }) => item);
}

function getArtistDisplayName(profile: UserProfile) {
  return profile.artistName || profile.username || profile.firstName || profile.email.split('@')[0] || 'Artist';
}

function buildArtistPerformanceItems(labelArtists: UserProfile[], summary: LabelArtistEarningsSummary | null) {
  return (summary?.topArtists || []).map((artist) => {
    const matchingProfile = labelArtists.find((profile) => {
      return profile.userId === artist.userId || profile.id === artist.artistId || getArtistDisplayName(profile) === artist.artistName;
    });

    return {
      id: artist.artistId || artist.userId,
      name: artist.artistName || matchingProfile?.artistName || matchingProfile?.username || 'Artist',
      profileImage: matchingProfile?.profileImage,
      streams: artist.totalStreams,
      revenue: artist.totalRevenue,
      createdAt: matchingProfile?.createdAt || artist.updatedAt,
    };
  });
}

function buildRecentlyAddedArtists(labelArtists: UserProfile[], summaryItems: ArtistPerformanceItem[]) {
  return labelArtists
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3)
    .map((artist) => {
      const matchingSummary = summaryItems.find((item) => item.name === getArtistDisplayName(artist) || item.id === artist.userId || item.id === artist.id);
      return {
        id: artist.userId || artist.id,
        name: getArtistDisplayName(artist),
        profileImage: artist.profileImage,
        streams: matchingSummary?.streams || 0,
        revenue: matchingSummary?.revenue || 0,
        createdAt: artist.createdAt,
      };
    });
}

export function LabelDashboardHome() {
  const welcome = useDashboardWelcome('partner');
  const [labelArtists, setLabelArtists] = useState<UserProfile[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [labelSummary, setLabelSummary] = useState<LabelArtistEarningsSummary | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [catalogPerformance, setCatalogPerformance] = useState<AnalyticsCatalogPerformance | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryRecord[]>([]);
  const [artistMonthlyTrends, setArtistMonthlyTrends] = useState<LabelArtistMonthlyTrendsResponse | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function loadLabelOverviewData() {
      const results = await Promise.allSettled([
        getLabelArtists(),
        getUserReleases(),
        getLabelArtistEarningsSummary(),
        getLabelArtistMonthlyTrends(),
        getAnalyticsSummary('year'),
        getAnalyticsCatalogPerformance('all'),
        getBillingHistory(),
      ]);

      if (!cancelled) {
        const [artistsResult, releasesResult, labelSummaryResult, artistMonthlyTrendsResult, analyticsSummaryResult, catalogResult, billingHistoryResult] = results;

        setLabelArtists(artistsResult.status === 'fulfilled' ? artistsResult.value : []);
        setReleases(releasesResult.status === 'fulfilled' ? releasesResult.value : []);
        setLabelSummary(labelSummaryResult.status === 'fulfilled' ? labelSummaryResult.value : null);
        setArtistMonthlyTrends(artistMonthlyTrendsResult.status === 'fulfilled' ? artistMonthlyTrendsResult.value : null);
        setAnalyticsSummary(analyticsSummaryResult.status === 'fulfilled' ? analyticsSummaryResult.value : null);
        setCatalogPerformance(catalogResult.status === 'fulfilled' ? catalogResult.value : null);
        setBillingHistory(billingHistoryResult.status === 'fulfilled' ? billingHistoryResult.value : []);

        const hasFailure = results.some((result) => result.status === 'rejected');
        setOverviewError(hasFailure ? 'Some live dashboard data could not be loaded. Showing the latest available report data.' : null);
      }
    }

    loadLabelOverviewData();

    return () => {
      cancelled = true;
    };
  }, []);

  const profileName = welcome.profile?.labelName || welcome.displayName || 'Label profile';
  const labelStatus = getLabelStatus(welcome.profile, welcome.loading);
  const accountType = getAccountTypeLabel(welcome.profile?.subscriptionTier);

  const selectedArtistTrend = useMemo(() => {
    if (!artistMonthlyTrends) {
      return null;
    }

    return artistMonthlyTrends.artists.find((artist) => {
      return artist.artistId === selectedArtistId || artist.userId === selectedArtistId;
    }) || artistMonthlyTrends.artists[0] || null;
  }, [artistMonthlyTrends, selectedArtistId]);

  const comparisonChartData = useMemo<ComparisonChartPoint[]>(() => {
    const labelTrend = artistMonthlyTrends?.labelMonthlyTrend || labelSummary?.monthlyTrend || [];
    const artistTrendMap = new Map((selectedArtistTrend?.monthlyTrend || []).map((entry) => [entry.month, entry]));

    return labelTrend.map((entry) => ({
      month: formatMonthLabel(entry.month),
      labelRevenue: entry.revenue,
      artistRevenue: artistTrendMap.get(entry.month)?.revenue ?? 0,
    }));
  }, [artistMonthlyTrends, labelSummary, selectedArtistTrend]);

  const totalRevenue = useMemo(() => {
    if (labelSummary) {
      return labelSummary.totalArtistEarnings;
    }

    return comparisonChartData.reduce((sum, item) => sum + item.labelRevenue, 0);
  }, [comparisonChartData, labelSummary]);

  const totalStreams = useMemo(() => labelSummary?.totalArtistStreams || analyticsSummary?.metrics.totalStreams || 0, [analyticsSummary, labelSummary]);
  const revenueTrend = useMemo(() => {
    const current = comparisonChartData[comparisonChartData.length - 1]?.labelRevenue ?? 0;
    const previous = comparisonChartData[comparisonChartData.length - 2]?.labelRevenue ?? 0;
    return getTrendPercentage(current, previous);
  }, [comparisonChartData]);
  const streamsTrend = useMemo(() => {
    const trend = labelSummary?.monthlyTrend || [];
    const current = trend[trend.length - 1]?.streams ?? 0;
    const previous = trend[trend.length - 2]?.streams ?? 0;
    return getTrendPercentage(current, previous);
  }, [labelSummary]);
  const activeReleaseCount = useMemo(() => releases.filter((release) => release.status === 'live').length, [releases]);

  const platformData = useMemo(() => buildPlatformData(labelSummary, analyticsSummary), [analyticsSummary, labelSummary]);
  const topSongs = useMemo(() => buildTopSongs(catalogPerformance, releases), [catalogPerformance, releases]);
  const recentActivity = useMemo(() => {
    return buildRecentActivity(labelArtists, releases, billingHistory, analyticsSummary, labelSummary);
  }, [analyticsSummary, billingHistory, labelArtists, labelSummary, releases]);
  const artistPerformanceItems = useMemo(() => buildArtistPerformanceItems(labelArtists, labelSummary), [labelArtists, labelSummary]);

  useEffect(() => {
    if (!selectedArtistId && artistPerformanceItems.length > 0) {
      setSelectedArtistId(artistPerformanceItems[0].id);
    }
  }, [artistPerformanceItems, selectedArtistId]);

  const selectedArtist = useMemo(() => {
    return artistPerformanceItems.find((artist) => artist.id === selectedArtistId) ?? artistPerformanceItems[0] ?? null;
  }, [artistPerformanceItems, selectedArtistId]);

  const selectedArtistRevenueTotal = useMemo(() => {
    if (selectedArtistTrend?.monthlyTrend?.length) {
      return selectedArtistTrend.monthlyTrend.reduce((sum, entry) => sum + entry.revenue, 0);
    }

    return selectedArtist?.revenue ?? 0;
  }, [selectedArtist, selectedArtistTrend]);

  const selectedArtistRevenueChange = useMemo(() => {
    const trend = selectedArtistTrend?.monthlyTrend || [];
    const current = trend[trend.length - 1]?.revenue ?? 0;
    const previous = trend[trend.length - 2]?.revenue ?? 0;
    return getTrendPercentage(current, previous);
  }, [selectedArtistTrend]);

  const topArtistsByStreams = useMemo(() => {
    return artistPerformanceItems.slice().sort((left, right) => right.streams - left.streams).slice(0, 3);
  }, [artistPerformanceItems]);

  const topArtistsByRevenue = useMemo(() => {
    return artistPerformanceItems.slice().sort((left, right) => right.revenue - left.revenue).slice(0, 3);
  }, [artistPerformanceItems]);

  const recentlyAddedArtists = useMemo(() => {
    return buildRecentlyAddedArtists(labelArtists, artistPerformanceItems);
  }, [artistPerformanceItems, labelArtists]);

  const lastDataRefresh = useMemo(() => {
    return analyticsSummary?.lastUpdated || labelSummary?.updatedAt || null;
  }, [analyticsSummary?.lastUpdated, labelSummary?.updatedAt]);

  const metrics = [
    {
      label: 'Total Artists',
      value: labelArtists.length.toString(),
      change: `${labelArtists.length} linked to label`,
      icon: Users,
      trend: 'neutral' as const,
      bgColor: 'bg-[#FFD600]/10',
      iconColor: 'text-[#FFD600]',
    },
    {
      label: 'Total Revenue',
      value: formatCompactCurrency(totalRevenue),
      change: revenueTrend,
      icon: DollarSign,
      trend: 'up' as const,
      bgColor: 'bg-[#1DB954]/10',
      iconColor: 'text-[#1DB954]',
    },
    {
      label: 'Total Streams',
      value: formatCompactNumber(totalStreams),
      change: streamsTrend,
      icon: Play,
      trend: 'up' as const,
      bgColor: 'bg-[#FF6B00]/10',
      iconColor: 'text-[#FF6B00]',
    },
    {
      label: 'Active Releases',
      value: activeReleaseCount.toString(),
      change: `${releases.length} total releases`,
      icon: Music,
      trend: 'neutral' as const,
      bgColor: 'bg-[#3EA6FF]/10',
      iconColor: 'text-[#3EA6FF]',
    },
  ];

  const quickActions: QuickActionItem[] = [
    {
      label: 'Upload New Release',
      description: 'Start a new distribution submission',
      icon: Music,
      to: '/label-dashboard/upload',
    },
    {
      label: 'Add New Artist',
      description: 'Create a new artist profile',
      icon: UserPlus,
      to: '/label-dashboard/artists/new',
    },
    {
      label: 'View All Artists',
      description: 'Open label artist roster',
      to: '/label-dashboard/artists',
      icon: Users,
    },
    {
      label: 'Request Payout',
      description: 'Open earnings and payout tools',
      to: '/label-dashboard/earnings',
      icon: DollarSign,
    },
    {
      label: 'View Analytics Dashboard',
      description: 'Jump to label analytics',
      to: '/label-dashboard/analytics',
      icon: TrendingUp,
    },
  ];

  const renderSongsPanel = () => (
    <Card className="border-[#FF6B00]/20 bg-[#161616] p-4">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white sm:text-xl">Top Performing Songs</h3>
        <Button asChild variant="ghost" size="sm" className="text-[#FF6B00] hover:bg-[#0A0A0A]">
          <Link to="/label-dashboard/catalog">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      {topSongs.length > 0 ? (
        <div className="space-y-3">
          {topSongs.map((song, index) => (
            <div key={song.id} className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-[#0A0A0A]">
              <div className="w-5 text-base font-semibold text-[#B3B3B3]">{index + 1}</div>
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                <ImageWithFallback src={song.coverArt} alt={song.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white sm:text-base">{song.title}</div>
                <div className="text-sm text-[#B3B3B3]">{song.artist} • {song.streams} streams</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white sm:text-base">{song.revenue}</div>
                <div className={`flex items-center gap-1 text-sm ${song.trending === 'up' ? 'text-[#1DB954]' : 'text-[#FF6B00]'}`}>
                  {song.trending === 'up' ? <TrendingUp className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {song.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-dashed border-[#FF6B00]/20 bg-[#0A0A0A]/40 p-4 text-sm text-[#B3B3B3]">
          <p>No uploaded song performance reports are available yet.</p>
          <Button asChild size="sm" variant="outline" className="border-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#0A0A0A]">
            <Link to="/label-dashboard/reports">Upload Analytics Report</Link>
          </Button>
        </div>
      )}
    </Card>
  );

  const renderActivityPanel = () => (
    <Card className="border-[#FF6B00]/20 bg-[#161616] p-4">
      <h3 className="mb-5 text-lg font-semibold text-white sm:text-xl">Recent Activity</h3>
      {recentActivity.length > 0 ? (
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={`${activity.action}-${index}`} className="flex items-start gap-2.5">
              <div
                className={`mt-1.5 h-2 w-2 rounded-full ${
                  activity.type === 'success'
                    ? 'bg-[#1DB954]'
                    : activity.type === 'achievement'
                      ? 'bg-[#FFD600]'
                      : 'bg-[#FF6B00]'
                }`}
              />
              <div className="flex-1">
                <p className="text-sm text-white/95">{activity.action}</p>
                <p className="mt-1 text-xs text-[#B3B3B3]">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-dashed border-[#FF6B00]/20 bg-[#0A0A0A]/40 p-4 text-sm text-[#B3B3B3]">
          <p>Activity will appear here as admin uploads, releases, and payouts are recorded.</p>
          <Button asChild size="sm" variant="outline" className="border-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#0A0A0A]">
            <Link to="/label-dashboard/reports">Go to Reports</Link>
          </Button>
        </div>
      )}
      <Button asChild variant="outline" className="mt-4 w-full border-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#0A0A0A]">
        <Link to="/label-dashboard/reports">View All Activity</Link>
      </Button>
    </Card>
  );

  const renderArtistSummaryPanel = (
    title: string,
    description: string,
    badgeClassName: string,
    badgeLabel: string,
    items: ArtistPerformanceItem[],
    formatter: (artist: ArtistPerformanceItem) => string,
    rankClassName: string,
    showRank: boolean
  ) => (
    <Card className="border-[#FF6B00]/20 bg-[#161616] p-4">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white sm:text-xl">{title}</h3>
          <p className="mt-1 text-sm text-[#B3B3B3]">{description}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClassName}`}>{badgeLabel}</div>
      </div>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((artist, index) => (
            <div key={artist.id} className="flex items-center gap-2.5 rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-2">
              {showRank ? (
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${rankClassName}`}>
                  {index + 1}
                </div>
              ) : null}
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#111111] text-sm font-semibold text-white">
                {artist.profileImage ? (
                  <ImageWithFallback src={artist.profileImage} alt={`${artist.name} profile`} className="h-full w-full object-cover" />
                ) : (
                  <span>{getProfileInitials(artist.name) || 'AR'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-white">{artist.name}</div>
                <div className="text-sm text-[#B3B3B3]">{formatter(artist)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#FF6B00]/20 bg-[#0A0A0A]/40 p-4 text-sm text-[#B3B3B3]">
          No live artist ranking data is available for this reporting window yet.
        </div>
      )}
    </Card>
  );

  return (
    <div className="mx-auto max-w-[1040px] space-y-3.5 p-3.5 lg:p-4">
      {overviewError ? (
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-4 text-sm text-[#FFD9BF]">
          {overviewError}
        </Card>
      ) : null}
      <Card className="overflow-hidden border border-[#FF6B00]/20 bg-[radial-gradient(circle_at_top_left,_rgba(255,107,0,0.22),_transparent_35%),linear-gradient(135deg,#141414,#090909)] text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="grid gap-3 p-3 lg:grid-cols-[1.22fr_0.86fr] lg:p-3.5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-[#FFD9BF]">
              <Sparkles className="h-3 w-3 text-[#FFD600]" />
              Label Briefing
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight sm:text-[1.35rem]">
                {welcome.loading ? 'Preparing your dashboard...' : welcome.heading}
              </h2>
              <p className="max-w-lg text-xs text-[#B3B3B3]">{welcome.subtitle}</p>
              <p className="max-w-lg text-xs text-[#D5D5D5]">Live snapshot of roster strength, release velocity, and revenue momentum.</p>
              {lastDataRefresh ? (
                <p className="text-[11px] text-[#FFD9BF]">Last sync {formatRelativeDate(lastDataRefresh)}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="rounded-full border border-[#FF6B00]/20 bg-[#0A0A0A]/70 px-3 py-1 text-white">
                {welcome.roleLabel} workspace
              </div>
              <div className="rounded-full border border-[#FF6B00]/20 bg-[#0A0A0A]/70 px-3 py-1 text-white">
                {welcome.planLabel}
              </div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-3">
              <div className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A]/70 px-2.5 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B3B3B3]">Label</div>
                <div className="mt-1 text-sm font-semibold text-white">{profileName}</div>
              </div>
              <div className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A]/70 px-2.5 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B3B3B3]">Verification</div>
                <div className="mt-1">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClassName(labelStatus)}`}>
                    {labelStatus}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A]/70 px-2.5 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B3B3B3]">Plan Tier</div>
                <div className="mt-1 text-sm font-semibold text-white">{accountType}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A]/70 px-2.5 py-2">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
                <MapPin className="h-3.5 w-3.5 text-[#FFD600]" />
                Location
              </div>
              <div className="text-sm font-semibold text-white">{welcome.locationLabel}</div>
              <p className="mt-0.5 text-xs text-[#B3B3B3]">Primary operating region</p>
            </div>
            <div className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A]/70 px-2.5 py-2">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
                <Clock3 className="h-3.5 w-3.5 text-[#FF6B00]" />
                Local Time
              </div>
              <div className="text-sm font-semibold text-white">{welcome.currentTimeLabel}</div>
              <p className="mt-0.5 text-xs text-[#B3B3B3]">{welcome.currentDateLabel}</p>
            </div>
            <div className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A]/70 px-2.5 py-2">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
                <Clock3 className="h-3.5 w-3.5 text-[#1DB954]" />
                Last Login
              </div>
              <div className="text-sm font-semibold text-white">{welcome.lastLoginLabel}</div>
              <p className="mt-0.5 text-xs text-[#B3B3B3]">{welcome.lastLoginLocationLabel}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-[#FF6B00]/20 bg-[#161616] p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {metric.trend === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 text-[#1DB954]" />
                  ) : null}
                  <span className={metric.trend === 'up' ? 'text-[#1DB954]' : 'text-[#B3B3B3]'}>
                    {metric.change}
                  </span>
                </div>
              </div>
              <div className="mb-1 text-[1.5rem] font-semibold text-white sm:text-[1.65rem]">{metric.value}</div>
              <div className="text-sm text-[#B3B3B3]">{metric.label}</div>
            </Card>
          );
        })}
      </div>

      <Card className="border-[#FF6B00]/20 bg-[#161616] p-4">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white sm:text-xl">Quick Actions</h3>
            <p className="mt-1 text-sm text-[#B3B3B3]">Jump to the most common label management tasks.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;

            if (action.disabled) {
              return (
                <button
                  key={action.label}
                  type="button"
                  disabled
                  className="flex min-h-[5.25rem] flex-col items-start justify-between rounded-xl border border-dashed border-[#FF6B00]/20 bg-[#0A0A0A]/60 p-3 text-left opacity-70"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B00]/10 text-[#FFD9BF]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{action.label}</div>
                    <div className="mt-1 text-sm text-[#B3B3B3]">{action.description}</div>
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={action.label}
                to={action.to!}
                className="flex min-h-[5.25rem] flex-col items-start justify-between rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A]/60 p-3 transition hover:border-[#FF6B00]/40 hover:bg-[#0A0A0A]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B00]/10 text-[#FFD9BF]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-white">{action.label}</div>
                  <div className="mt-1 text-sm text-[#B3B3B3]">{action.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-4 lg:col-span-2">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h3 className="mb-1 text-lg font-semibold text-white sm:text-xl">Revenue Overview</h3>
              <p className="text-sm text-[#B3B3B3]">Live monthly revenue from uploaded royalty reports, compared directly against the selected artist's live monthly earnings trend.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedArtist?.id ?? ''}
                onChange={(event) => setSelectedArtistId(event.target.value)}
                className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-4 py-2 text-sm text-white disabled:opacity-50"
                aria-label="Select artist earnings snapshot"
                title="Select artist earnings snapshot"
                disabled={artistPerformanceItems.length === 0}
              >
                {artistPerformanceItems.length === 0 ? (
                  <option value="" disabled>No artists available</option>
                ) : (
                  artistPerformanceItems.map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A]/70 p-3.5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">Label Revenue</div>
              <div className="mt-1.5 text-xl font-semibold text-white">{formatCurrency(totalRevenue)}</div>
              <p className="mt-1 text-sm text-[#1DB954]">{revenueTrend} vs previous month</p>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A]/70 p-3.5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">Selected Artist Revenue</div>
              <div className="mt-1.5 text-xl font-semibold text-white">{selectedArtist ? formatCurrency(selectedArtistRevenueTotal) : '₦0'}</div>
              <p className="mt-1 text-sm text-[#3EA6FF]">
                {selectedArtist ? `${selectedArtist.name} ${selectedArtistRevenueChange} vs previous month` : 'Select an artist to review'}
              </p>
            </div>
          </div>

          {comparisonChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={comparisonChartData}>
                <defs>
                  <linearGradient id="labelRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="artistRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3EA6FF" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#3EA6FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#FF6B00" opacity={0.12} />
                <XAxis dataKey="month" stroke="#B3B3B3" fontSize={12} />
                <YAxis stroke="#B3B3B3" fontSize={12} tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161616',
                    border: '1px solid rgba(255, 107, 0, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'labelRevenue') {
                      return [formatCurrency(value), 'Total Label Revenue'];
                    }

                    return [formatCurrency(value), selectedArtist ? `${selectedArtist.name} Revenue` : 'Selected Artist Revenue'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="labelRevenue"
                  name="labelRevenue"
                  stroke="#FF6B00"
                  strokeWidth={2.5}
                  fill="url(#labelRevenueFill)"
                />
                {selectedArtist ? (
                  <Area
                    type="monotone"
                    dataKey="artistRevenue"
                    name="artistRevenue"
                    stroke="#3EA6FF"
                    strokeWidth={2.5}
                    fill="url(#artistRevenueFill)"
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-xl border border-dashed border-[#FF6B00]/20 bg-[#0A0A0A]/40 p-4 text-sm text-[#B3B3B3]">
              Revenue comparison will appear after live royalty or analytics reports are available.
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2 text-[#B3B3B3]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B00]" />
              Total Label Revenue
            </div>
            <div className="flex items-center gap-2 text-[#B3B3B3]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3EA6FF]" />
              {selectedArtist ? `${selectedArtist.name} Revenue` : 'Selected Artist Revenue'}
            </div>
          </div>
        </Card>

        <Card className="border-[#FF6B00]/20 bg-[#161616] p-4">
          <h3 className="mb-5 text-lg font-semibold text-white sm:text-xl">Platform Distribution</h3>
          {platformData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {platformData.map((entry) => (
                      <Cell key={`label-dashboard-platform-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161616',
                      border: '1px solid rgba(255, 107, 0, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2.5">
                {platformData.map((platform) => (
                  <div key={platform.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${platform.dotClassName}`} />
                      <span className="text-sm text-[#B3B3B3]">{platform.name}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{platform.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[#FF6B00]/20 bg-[#0A0A0A]/40 p-4 text-sm text-[#B3B3B3]">
              Platform distribution will appear after royalty or analytics reports are in.
            </div>
          )}
        </Card>
      </div>

      <Tabs defaultValue="songs" className="lg:hidden">
        <TabsList className="grid w-full grid-cols-2 rounded-xl border border-[#FF6B00]/20 bg-[#111111] p-1">
          <TabsTrigger value="songs" className="rounded-lg data-[state=active]:border-[#FF6B00]/30 data-[state=active]:bg-[#FF6B00]/10 data-[state=active]:text-white">
            Songs
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg data-[state=active]:border-[#FF6B00]/30 data-[state=active]:bg-[#FF6B00]/10 data-[state=active]:text-white">
            Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent value="songs">{renderSongsPanel()}</TabsContent>
        <TabsContent value="activity">{renderActivityPanel()}</TabsContent>
      </Tabs>

      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        {renderSongsPanel()}
        {renderActivityPanel()}
      </div>

      <Tabs defaultValue="streams" className="xl:hidden">
        <TabsList className="grid w-full grid-cols-3 rounded-xl border border-[#FF6B00]/20 bg-[#111111] p-1">
          <TabsTrigger value="streams" className="rounded-lg data-[state=active]:border-[#FF6B00]/30 data-[state=active]:bg-[#FF6B00]/10 data-[state=active]:text-white">
            Streams
          </TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-lg data-[state=active]:border-[#FF6B00]/30 data-[state=active]:bg-[#FF6B00]/10 data-[state=active]:text-white">
            Revenue
          </TabsTrigger>
          <TabsTrigger value="recent" className="rounded-lg data-[state=active]:border-[#FF6B00]/30 data-[state=active]:bg-[#FF6B00]/10 data-[state=active]:text-white">
            Recent
          </TabsTrigger>
        </TabsList>
        <TabsContent value="streams">
          {renderArtistSummaryPanel(
            'Top 3 Artists by Streams',
            'Highest stream volume across your label roster.',
            'bg-[#FF6B00]/10 text-[#FFD9BF]',
            'Streams',
            topArtistsByStreams,
            (artist) => `${formatCompactNumber(artist.streams)} streams`,
            'bg-[#FF6B00]/15',
            true
          )}
        </TabsContent>
        <TabsContent value="revenue">
          {renderArtistSummaryPanel(
            'Top 3 Artists by Revenue',
            'Best earning artists in the current reporting window.',
            'bg-[#1DB954]/10 text-[#B8FFD0]',
            'Revenue',
            topArtistsByRevenue,
            (artist) => formatCurrency(artist.revenue),
            'bg-[#1DB954]/15',
            true
          )}
        </TabsContent>
        <TabsContent value="recent">
          {renderArtistSummaryPanel(
            'Recently Added Artists',
            'Latest artists added to the label workspace.',
            'bg-[#3EA6FF]/10 text-[#C5E6FF]',
            'Recent',
            recentlyAddedArtists,
            (artist) => `Added ${formatDateLabel(artist.createdAt)}`,
            'bg-[#3EA6FF]/15',
            false
          )}
        </TabsContent>
      </Tabs>

      <div className="hidden gap-4 xl:grid xl:grid-cols-3">
        {renderArtistSummaryPanel(
          'Top 3 Artists by Streams',
          'Highest stream volume across your label roster.',
          'bg-[#FF6B00]/10 text-[#FFD9BF]',
          'Streams',
          topArtistsByStreams,
          (artist) => `${formatCompactNumber(artist.streams)} streams`,
          'bg-[#FF6B00]/15',
          true
        )}
        {renderArtistSummaryPanel(
          'Top 3 Artists by Revenue',
          'Best earning artists in the current reporting window.',
          'bg-[#1DB954]/10 text-[#B8FFD0]',
          'Revenue',
          topArtistsByRevenue,
          (artist) => formatCurrency(artist.revenue),
          'bg-[#1DB954]/15',
          true
        )}
        {renderArtistSummaryPanel(
          'Recently Added Artists',
          'Latest artists added to the label workspace.',
          'bg-[#3EA6FF]/10 text-[#C5E6FF]',
          'Recent',
          recentlyAddedArtists,
          (artist) => `Added ${formatDateLabel(artist.createdAt)}`,
          'bg-[#3EA6FF]/15',
          false
        )}
      </div>
    </div>
  );
}
