import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  MousePointerClick,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  MapPin,
  Share2,
  Eye,
} from 'lucide-react';
import {
  LineChart,
  Line,
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
import {
  loadSmartLinkClickEvents,
  loadSmartLinks,
  type SmartLinkClickStorageRecord,
  type SmartLinkStorageRecord,
} from '../../utils/smart-links-storage';
import { BACKEND_API_BASE_URL } from '../../utils/backend-api-base';

const PLATFORM_COLORS = ['#1DB954', '#FA243C', '#FF0000', '#FF9900', '#A238FF', '#3B82F6', '#FFD600', '#B3B3B3'];

const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  'apple-music': 'Apple Music',
  'youtube-music': 'YouTube Music',
  'amazon-music': 'Amazon Music',
  deezer: 'Deezer',
  tidal: 'Tidal',
  soundcloud: 'SoundCloud',
  pandora: 'Pandora',
  boomplay: 'Boomplay',
  audiomack: 'Audiomack',
};

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(n);
}

function rangeToDays(range: string): number {
  if (range === '7days') return 7;
  if (range === '30days') return 30;
  if (range === '90days') return 90;
  return 14;
}

function normalizeReferrer(referrer?: string) {
  if (!referrer || referrer === 'direct') {
    return 'Direct';
  }

  const lower = referrer.toLowerCase();
  if (lower.includes('instagram')) return 'Instagram';
  if (lower.includes('twitter') || lower.includes('x.com')) return 'Twitter / X';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('facebook')) return 'Facebook';
  if (lower.includes('tiktok')) return 'TikTok';

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host || 'Other';
  } catch {
    return 'Other';
  }
}

function getTrendDirection(clickTrend: Array<{ clicks: number }>) {
  if (clickTrend.length < 2) {
    return { up: false, change: '0%' };
  }

  const midpoint = Math.floor(clickTrend.length / 2);
  const firstHalf = clickTrend.slice(0, midpoint).reduce((sum, entry) => sum + entry.clicks, 0);
  const secondHalf = clickTrend.slice(midpoint).reduce((sum, entry) => sum + entry.clicks, 0);

  if (firstHalf === 0 && secondHalf === 0) {
    return { up: false, change: '0%' };
  }

  if (firstHalf === 0) {
    return { up: true, change: '+100%' };
  }

  const delta = ((secondHalf - firstHalf) / firstHalf) * 100;
  const signed = delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
  return { up: delta >= 0, change: signed };
}

function exportCsv(clickTrend: Array<{ date: string; clicks: number; unique: number }>) {
  const rows = [
    'date,clicks,unique_clicks',
    ...clickTrend.map((entry) => `${entry.date},${entry.clicks},${entry.unique}`),
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'smart-link-analytics.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function SmartLinkAnalyticsView() {
  const location = useLocation();
  const selectedLinkId = useMemo(() => new URLSearchParams(location.search).get('link'), [location.search]);
  const [timeRange, setTimeRange] = useState('14days');
  const [activeTab, setActiveTab] = useState('overview');
  const [links, setLinks] = useState<SmartLinkStorageRecord[]>([]);
  const [events, setEvents] = useState<SmartLinkClickStorageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAnalytics, setApiAnalytics] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch from API if we have a selected link
        if (selectedLinkId) {
          const token = sessionStorage.getItem('access_token');
          if (token) {
            const rangeDays = rangeToDays(timeRange);
            const response = await fetch(
              `${BACKEND_API_BASE_URL}/smart-links/${encodeURIComponent(selectedLinkId)}/analytics?range=${rangeDays}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (response.ok) {
              const data = await response.json();
              setApiAnalytics(data);
            }
          }
        } else {
          // Fall back to localStorage if no specific link selected
          setApiAnalytics(null);
        }
      } catch (error) {
        console.debug('Failed to fetch API analytics:', error);
        setApiAnalytics(null);
      }

      // Also load from local storage as fallback
      setLinks(loadSmartLinks());
      setEvents(loadSmartLinkClickEvents());
      setLoading(false);
    };

    fetchAnalytics();

    const onStorage = () => {
      fetchAnalytics();
    };

    window.addEventListener('storage', onStorage);
    const timerId = window.setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds

    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(timerId);
    };
  }, [selectedLinkId, timeRange]);

  const rangeDays = useMemo(() => rangeToDays(timeRange), [timeRange]);

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const cutoff = now - rangeDays * 24 * 60 * 60 * 1000;

    return events.filter((event) => {
      if (selectedLinkId && event.linkId !== selectedLinkId) {
        return false;
      }
      return event.timestamp >= cutoff;
    });
  }, [events, rangeDays, selectedLinkId]);

  const clickTrend = useMemo(() => {
    // Use API data if available and we have a selected link
    if (apiAnalytics?.trend && Array.isArray(apiAnalytics.trend)) {
      return apiAnalytics.trend.map((item: any) => ({
        ...item,
        label: new Date(`${item.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
    }

    // Fall back to localStorage computation
    const byDay = new Map<string, { clicks: number; unique: Set<string> }>();

    for (let i = rangeDays - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      byDay.set(key, { clicks: 0, unique: new Set<string>() });
    }

    filteredEvents.forEach((event) => {
      const key = new Date(event.timestamp).toISOString().slice(0, 10);
      if (!byDay.has(key)) {
        byDay.set(key, { clicks: 0, unique: new Set<string>() });
      }

      const day = byDay.get(key);
      if (!day) return;

      day.clicks += 1;
      day.unique.add(`${event.linkId}-${event.device}-${event.os}-${event.country || 'unknown'}-${event.referrer || 'direct'}`);
    });

    return Array.from(byDay.entries()).map(([date, values]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      clicks: values.clicks,
      unique: values.unique.size,
    }));
  }, [filteredEvents, rangeDays, apiAnalytics]);

  const linksById = useMemo(() => {
    const map = new Map<string, SmartLinkStorageRecord>();
    links.forEach((link) => {
      map.set(link.id, link);
    });
    return map;
  }, [links]);

  const platformClicks = useMemo(() => {
    // Use API data if available
    if (apiAnalytics?.platforms && Array.isArray(apiAnalytics.platforms)) {
      return apiAnalytics.platforms.map((item: any) => ({
        name: item.name,
        clicks: item.clicks,
        pct: Math.round(item.percentage),
      }));
    }

    // Fall back to localStorage computation
    const counts = new Map<string, number>();
    filteredEvents.forEach((event) => {
      if (!event.platform) return;
      const label = PLATFORM_LABELS[event.platform] || event.platform;
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const total = filteredEvents.length;
    return Array.from(counts.entries())
      .map(([name, clicks]) => ({
        name,
        clicks,
        pct: total > 0 ? Math.round((clicks / total) * 100) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [filteredEvents, apiAnalytics]);

  const deviceData = useMemo(() => {
    // Use API data if available
    if (apiAnalytics?.devices && Array.isArray(apiAnalytics.devices)) {
      const deviceLabels: Record<string, string> = {
        mobile: 'Mobile',
        desktop: 'Desktop',
        tablet: 'Tablet',
      };
      const deviceColors: Record<string, string> = {
        mobile: '#FF6B00',
        desktop: '#FFD600',
        tablet: '#3B82F6',
      };

      return apiAnalytics.devices.map((item: any) => ({
        name: deviceLabels[item.device] || item.device,
        value: Math.round(item.percentage),
        color: deviceColors[item.device] || '#999',
      }));
    }

    // Fall back to localStorage computation
    const counts = filteredEvents.reduce((acc, event) => {
      const key = event.device || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = filteredEvents.length || 1;

    return [
      { name: 'Mobile', key: 'mobile', color: '#FF6B00' },
      { name: 'Desktop', key: 'desktop', color: '#FFD600' },
      { name: 'Tablet', key: 'tablet', color: '#3B82F6' },
    ].map((entry) => ({
      name: entry.name,
      value: Math.round(((counts[entry.key] || 0) / total) * 100),
      color: entry.color,
    }));
  }, [filteredEvents, apiAnalytics]);

  const countryData = useMemo(() => {
    // Use API data if available
    if (apiAnalytics?.countries && Array.isArray(apiAnalytics.countries)) {
      return apiAnalytics.countries.map((item: any) => ({
        country: item.country,
        clicks: item.clicks,
        pct: Math.round(item.percentage),
      }));
    }

    // Fall back to localStorage computation
    const counts = new Map<string, number>();
    filteredEvents.forEach((event) => {
      const country = event.country || 'Unknown';
      counts.set(country, (counts.get(country) || 0) + 1);
    });

    const total = filteredEvents.length || 1;
    return Array.from(counts.entries())
      .map(([country, clicks]) => ({
        country,
        clicks,
        pct: Number(((clicks / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8);
  }, [filteredEvents, apiAnalytics]);

  const referrerData = useMemo(() => {
    // Use API data if available
    if (apiAnalytics?.referrers && Array.isArray(apiAnalytics.referrers)) {
      return apiAnalytics.referrers.map((item: any) => ({
        source: item.referrer,
        clicks: item.clicks,
        pct: Math.round(item.percentage),
      }));
    }

    // Fall back to localStorage computation
    const counts = new Map<string, number>();
    filteredEvents.forEach((event) => {
      const source = normalizeReferrer(event.referrer);
      counts.set(source, (counts.get(source) || 0) + 1);
    });

    const total = filteredEvents.length || 1;
    return Array.from(counts.entries())
      .map(([source, clicks]) => ({
        source,
        clicks,
        pct: Number(((clicks / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8);
  }, [filteredEvents, apiAnalytics]);

  const topLinks = useMemo(() => {
    const counts = new Map<string, number>();
    filteredEvents.forEach((event) => {
      counts.set(event.linkId, (counts.get(event.linkId) || 0) + 1);
    });

    const sortedFromEvents = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([linkId, clicks]) => {
        const link = linksById.get(linkId);
        return {
          title: link?.title || 'Untitled Link',
          slug: link?.slug || linkId,
          clicks,
          trend: clicks > 0 ? ('up' as const) : ('neutral' as const),
        };
      });

    if (sortedFromEvents.length > 0) {
      return sortedFromEvents;
    }

    return links
      .filter((link) => !selectedLinkId || link.id === selectedLinkId)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 3)
      .map((link) => ({
        title: link.title,
        slug: link.slug,
        clicks: link.clicks,
        trend: link.clicks > 0 ? ('up' as const) : ('neutral' as const),
      }));
  }, [filteredEvents, linksById, links, selectedLinkId]);

  const totals = useMemo(() => {
    // Use API data if available
    if (apiAnalytics) {
      const avgDaily = clickTrend.length > 0 ? Math.round(apiAnalytics.totalClicks / clickTrend.length) : 0;
      return {
        clicks: apiAnalytics.totalClicks || 0,
        unique: apiAnalytics.uniqueDevices || 0,
        countries: apiAnalytics.countries?.length || 0,
        avgDaily,
      };
    }

    // Fall back to localStorage computation
    const clicks = filteredEvents.length;
    const unique = new Set(
      filteredEvents.map((event) => `${event.linkId}-${event.device}-${event.os}-${event.country || 'unknown'}-${event.referrer || 'direct'}`),
    ).size;

    const countries = new Set(filteredEvents.map((event) => event.country).filter(Boolean)).size;
    const avgDaily = clickTrend.length > 0 ? Math.round(clicks / clickTrend.length) : 0;

    return {
      clicks,
      unique,
      countries,
      avgDaily,
    };
  }, [filteredEvents, clickTrend, apiAnalytics]);

  const trend = useMemo(() => getTrendDirection(clickTrend), [clickTrend]);

  const hasData = filteredEvents.length > 0 || (apiAnalytics?.totalClicks ?? 0) > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Smart Link Analytics</h1>
          <p className="text-sm text-[#B3B3B3] mt-1">Track performance across all your smart links</p>
          {selectedLinkId && (
            <p className="text-xs text-[#FFD600] mt-1">Filtered to one smart link</p>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex bg-[#161616] rounded-lg border border-[#FF6B00]/20 p-0.5">
            {[
              { value: '7days', label: '7D' },
              { value: '14days', label: '14D' },
              { value: '30days', label: '30D' },
              { value: '90days', label: '90D' },
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  timeRange === range.value
                    ? 'bg-[#FF6B00] text-white'
                    : 'text-[#B3B3B3] hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => exportCsv(clickTrend.map((entry) => ({ date: entry.date, clicks: entry.clicks, unique: entry.unique })))}
            disabled={!hasData}
            className="gap-2 border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10"
          >
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clicks', value: totals.clicks, icon: MousePointerClick, change: trend.change, up: trend.up, bgClass: 'bg-[#FF6B00]/15', iconClass: 'text-[#FF6B00]' },
          { label: 'Unique Clicks', value: totals.unique, icon: Eye, change: trend.change, up: trend.up, bgClass: 'bg-[#FFD600]/15', iconClass: 'text-[#FFD600]' },
          { label: 'Avg. Daily Clicks', value: totals.avgDaily, icon: TrendingUp, change: `${clickTrend.length} days`, up: true, bgClass: 'bg-green-500/15', iconClass: 'text-green-400' },
          { label: 'Countries', value: totals.countries, icon: Globe, change: `${topLinks.length} top links`, up: true, bgClass: 'bg-blue-500/15', iconClass: 'text-blue-400' },
        ].map((metric) => (
          <Card key={metric.label} className="p-4 bg-[#161616] border-[#FF6B00]/10">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${metric.bgClass}`}>
                <metric.icon className={`w-5 h-5 ${metric.iconClass}`} />
              </div>
              <Badge variant="outline" className={`text-xs gap-1 ${metric.up ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                {metric.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {metric.change}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(metric.value)}</p>
            <p className="text-xs text-[#B3B3B3] mt-1">{metric.label}</p>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#161616] border border-[#FF6B00]/20">
          <TabsTrigger value="overview" className="text-xs sm:text-sm data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="platforms" className="text-xs sm:text-sm data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">Platforms</TabsTrigger>
          <TabsTrigger value="geography" className="text-xs sm:text-sm data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">Geography</TabsTrigger>
          <TabsTrigger value="referrers" className="text-xs sm:text-sm data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">Referrers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card className="p-6 bg-[#161616] border-[#FF6B00]/10">
            <h3 className="text-lg font-bold text-white mb-4">Click Trend</h3>
            {loading ? (
              <div className="h-72 flex items-center justify-center text-sm text-[#B3B3B3]">Loading analytics...</div>
            ) : !hasData ? (
              <div className="h-72 flex items-center justify-center text-sm text-[#B3B3B3]">No click events recorded for this period yet.</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clickTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" stroke="#666" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: '#161616', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 8, color: '#fff' }}
                      labelStyle={{ color: '#B3B3B3' }}
                    />
                    <Line type="monotone" dataKey="clicks" stroke="#FF6B00" strokeWidth={2} dot={{ r: 3, fill: '#FF6B00' }} name="Total Clicks" />
                    <Line type="monotone" dataKey="unique" stroke="#FFD600" strokeWidth={2} dot={{ r: 3, fill: '#FFD600' }} name="Unique Clicks" />
                    <Legend wrapperStyle={{ color: '#B3B3B3', fontSize: 12 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-[#161616] border-[#FF6B00]/10">
              <h3 className="text-lg font-bold text-white mb-4">Device Breakdown</h3>
              {!hasData ? (
                <div className="h-56 flex items-center justify-center text-sm text-[#B3B3B3]">No device data yet.</div>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                          {deviceData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#161616', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 8, color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#B3B3B3', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {deviceData.map((device) => (
                      <div key={device.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {device.name === 'Mobile' ? <Smartphone className="w-4 h-4 text-[#B3B3B3]" /> : device.name === 'Desktop' ? <Monitor className="w-4 h-4 text-[#B3B3B3]" /> : <Tablet className="w-4 h-4 text-[#B3B3B3]" />}
                          <span className="text-sm text-[#B3B3B3]">{device.name}</span>
                        </div>
                        <span className="text-sm font-medium text-white">{device.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card className="p-6 bg-[#161616] border-[#FF6B00]/10">
              <h3 className="text-lg font-bold text-white mb-4">Top Performing Links</h3>
              {topLinks.length === 0 ? (
                <div className="text-sm text-[#B3B3B3]">No smart links available yet.</div>
              ) : (
                <div className="space-y-3">
                  {topLinks.map((link, i) => (
                    <div key={`${link.slug}-${i}`} className="flex items-center gap-4 bg-[#0A0A0A] rounded-lg p-3 border border-[#FF6B00]/10">
                      <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] font-bold text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{link.title}</p>
                        <p className="text-xs text-[#666]">amtdistro.link/{link.slug}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-white">{formatNumber(link.clicks)}</p>
                        <p className="text-xs text-[#B3B3B3]">clicks</p>
                      </div>
                      {link.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-400 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6 mt-6">
          <Card className="p-6 bg-[#161616] border-[#FF6B00]/10">
            <h3 className="text-lg font-bold text-white mb-4">Clicks by Platform</h3>
            {!hasData || platformClicks.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-[#B3B3B3]">No platform click data yet.</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformClicks} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#666" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" stroke="#666" tick={{ fontSize: 12 }} width={120} />
                    <Tooltip contentStyle={{ background: '#161616', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="clicks" radius={[0, 6, 6, 0]}>
                      {platformClicks.map((_, index) => (
                        <Cell key={`platform-cell-${index}`} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-[#161616] border-[#FF6B00]/10">
            <h3 className="text-lg font-bold text-white mb-4">Platform Breakdown</h3>
            {platformClicks.length === 0 ? (
              <div className="text-sm text-[#B3B3B3]">No platform clicks recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {platformClicks.map((platform, index) => (
                  <div key={platform.name} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${index % 2 === 0 ? 'bg-[#FF6B00]' : 'bg-[#FFD600]'}`} />
                    <span className="text-sm text-[#B3B3B3] flex-1">{platform.name}</span>
                    <span className="text-sm font-medium text-white">{formatNumber(platform.clicks)}</span>
                    <progress
                      className="w-24 h-2 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#0A0A0A] [&::-webkit-progress-value]:bg-[#FF6B00]"
                      value={platform.pct}
                      max={100}
                    />
                    <span className="text-xs text-[#666] w-10 text-right">{platform.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-6 mt-6">
          <Card className="p-6 bg-[#161616] border-[#FF6B00]/10">
            <h3 className="text-lg font-bold text-white mb-4">Clicks by Country</h3>
            {!hasData || countryData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-[#B3B3B3]">No country data yet.</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="country" stroke="#666" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#161616', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="clicks" fill="#FF6B00" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-[#161616] border-[#FF6B00]/10">
            <h3 className="text-lg font-bold text-white mb-4">Top Countries</h3>
            {countryData.length === 0 ? (
              <div className="text-sm text-[#B3B3B3]">No country analytics available yet.</div>
            ) : (
              <div className="space-y-3">
                {countryData.map((country) => (
                  <div key={country.country} className="flex items-center gap-4 bg-[#0A0A0A] rounded-lg p-3 border border-[#FF6B00]/10">
                    <MapPin className="w-4 h-4 text-[#FF6B00] shrink-0" />
                    <span className="text-sm text-white flex-1">{country.country}</span>
                    <span className="text-sm font-medium text-white">{formatNumber(country.clicks)}</span>
                    <progress
                      className="w-20 h-2 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#161616] [&::-webkit-progress-value]:bg-[#FF6B00]"
                      value={country.pct}
                      max={100}
                    />
                    <span className="text-xs text-[#666] w-12 text-right">{country.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="referrers" className="space-y-6 mt-6">
          <Card className="p-6 bg-[#161616] border-[#FF6B00]/10">
            <h3 className="text-lg font-bold text-white mb-4">Click Sources</h3>
            {!hasData || referrerData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-[#B3B3B3]">No referrer data yet.</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={referrerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="source" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#161616', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="clicks" fill="#FFD600" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-[#161616] border-[#FF6B00]/10">
            <h3 className="text-lg font-bold text-white mb-4">Traffic Sources</h3>
            {referrerData.length === 0 ? (
              <div className="text-sm text-[#B3B3B3]">No traffic source analytics available yet.</div>
            ) : (
              <div className="space-y-3">
                {referrerData.map((referrer) => (
                  <div key={referrer.source} className="flex items-center gap-4 bg-[#0A0A0A] rounded-lg p-3 border border-[#FF6B00]/10">
                    <Share2 className="w-4 h-4 text-[#FFD600] shrink-0" />
                    <span className="text-sm text-white flex-1">{referrer.source}</span>
                    <span className="text-sm font-medium text-white">{formatNumber(referrer.clicks)}</span>
                    <progress
                      className="w-20 h-2 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#161616] [&::-webkit-progress-value]:bg-[#FFD600]"
                      value={referrer.pct}
                      max={100}
                    />
                    <span className="text-xs text-[#666] w-12 text-right">{referrer.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
