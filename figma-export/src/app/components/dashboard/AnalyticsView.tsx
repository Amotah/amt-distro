import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  TrendingUp,
  Users,
  Play,
  Globe,
  Download,
  ArrowUpRight,
  LoaderCircle,
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
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  getAnalyticsSummary,
  getArtistListenerMonetizationSummary,
  type AnalyticsSummary,
  type ArtistListenerMonetizationSummary,
} from '../../utils/analytics-api';

const PLATFORM_COLORS = ['#1DB954', '#FA243C', '#FF0000', '#FF9900', '#2563EB', '#9333EA'];
const PLATFORM_DOT_CLASSES = ['bg-[#1DB954]', 'bg-[#FA243C]', 'bg-[#FF0000]', 'bg-[#FF9900]', 'bg-[#2563EB]', 'bg-[#9333EA]'];

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatDuration(value: number | null) {
  if (!value || value <= 0) {
    return 'N/A';
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function exportAnalyticsSnapshot(summary: AnalyticsSummary) {
  const lines = [
    'section,label,value',
    `metrics,Total Streams,${summary.metrics.totalStreams}`,
    `metrics,Reported Listeners,${summary.metrics.reportedListeners}`,
    `metrics,Countries,${summary.metrics.countries}`,
    `metrics,Avg Stream Duration,${formatDuration(summary.metrics.avgStreamDurationSeconds)}`,
    `metrics,Reports,${summary.metrics.reports}`,
    ...summary.platformBreakdown.map((platform) => `platform,${platform.name},${platform.streams}`),
    ...summary.geographyBreakdown.map((country) => `country,${country.country},${country.streams}`),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'analytics-summary.csv';
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function AnalyticsView() {
  const location = useLocation();
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const [timeRange, setTimeRange] = useState('7days');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [listenerMonetization, setListenerMonetization] = useState<ArtistListenerMonetizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const [nextSummary, nextListenerMonetization] = await Promise.all([
          getAnalyticsSummary(timeRange),
          getArtistListenerMonetizationSummary().catch(() => null),
        ]);
        if (active) {
          setSummary(nextSummary);
          setListenerMonetization(nextListenerMonetization);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load analytics summary.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      active = false;
    };
  }, [timeRange]);

  const metrics = useMemo(() => [
    {
      label: 'Total Streams',
      value: formatCompactNumber(summary?.metrics.totalStreams || 0),
      change: `${summary?.metrics.records || 0} records`,
      icon: Play,
      color: 'purple',
    },
    {
      label: 'Reported Listeners',
      value: formatCompactNumber(summary?.metrics.reportedListeners || 0),
      change: `${summary?.metrics.reports || 0} reports`,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Countries',
      value: String(summary?.metrics.countries || 0),
      change: `${summary?.platformBreakdown.length || 0} platforms`,
      icon: Globe,
      color: 'green',
    },
    {
      label: 'Avg. Stream Duration',
      value: formatDuration(summary?.metrics.avgStreamDurationSeconds || null),
      change: summary?.lastUpdated ? `Updated ${new Date(summary.lastUpdated).toLocaleDateString()}` : 'No uploads yet',
      icon: TrendingUp,
      color: 'pink',
    },
  ], [summary]);

  const platformData = useMemo(() => (
    (summary?.platformBreakdown || []).map((platform, index) => ({
      ...platform,
      color: PLATFORM_COLORS[index % PLATFORM_COLORS.length],
      dotClassName: PLATFORM_DOT_CLASSES[index % PLATFORM_DOT_CLASSES.length],
    }))
  ), [summary]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="mb-2 text-3xl font-semibold text-white">Analytics</h2>
          <p className="text-[#B3B3B3]">Track your music performance from uploaded analytics matched to your catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            aria-label="Select analytics time range"
            title="Select analytics time range"
            className="rounded-lg border border-[#FF6B00]/20 bg-[#161616] px-4 py-2 text-sm text-white"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="year">Last year</option>
            <option value="all">All time</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            disabled={!summary || summary.metrics.records === 0}
            onClick={() => summary && exportAnalyticsSnapshot(summary)}
            className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#161616]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const bgColors = {
            purple: 'bg-[#FF6B00]/12',
            blue: 'bg-sky-500/12',
            green: 'bg-green-500/12',
            pink: 'bg-[#FFD600]/12',
          };
          const iconColors = {
            purple: 'text-[#FF6B00]',
            blue: 'text-sky-300',
            green: 'text-green-300',
            pink: 'text-[#FFD600]',
          };

          return (
            <Card key={metric.label} className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${bgColors[metric.color as keyof typeof bgColors]} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${iconColors[metric.color as keyof typeof iconColors]}`} />
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{metric.change}</span>
                </div>
              </div>
              <div className="text-3xl font-semibold mb-1">{metric.value}</div>
              <div className="text-sm text-[#B3B3B3]">{metric.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-[#00E5FF]/20 bg-[#161616] p-5 text-white">
          <div className="text-sm text-[#B3B3B3] mb-2">Qualified listener streams</div>
          <div className="text-2xl font-semibold">{formatCompactNumber(listenerMonetization?.qualifiedStreams || 0)}</div>
        </Card>
        <Card className="border-[#FFD600]/20 bg-[#161616] p-5 text-white">
          <div className="text-sm text-[#B3B3B3] mb-2">Qualified downloads</div>
          <div className="text-2xl font-semibold">{formatCompactNumber(listenerMonetization?.qualifiedDownloads || 0)}</div>
        </Card>
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="text-sm text-[#B3B3B3] mb-2">Net listener revenue</div>
          <div className="text-2xl font-semibold">₦{(listenerMonetization?.netArtistRevenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="border-[#9333EA]/20 bg-[#161616] p-5 text-white">
          <div className="text-sm text-[#B3B3B3] mb-2">Listener rewards funded</div>
          <div className="text-2xl font-semibold">₦{(listenerMonetization?.listenerRewardsFunded || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
        </Card>
      </div>

      {/* Streams Over Time */}
      <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold mb-1">Streams & Listeners</h3>
            <p className="text-sm text-[#B3B3B3]">Derived from uploaded analytics rows matched to your tracks</p>
          </div>
        </div>
        {loading ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-[#B3B3B3]">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Loading analytics...
          </div>
        ) : error ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-red-400">{error}</div>
        ) : summary && summary.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={summary.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" stroke="#B3B3B3" fontSize={12} />
              <YAxis stroke="#B3B3B3" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#161616', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '12px', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="streams" stroke="#FF6B00" strokeWidth={3} dot={{ fill: '#FF6B00', r: 4 }} activeDot={{ r: 6 }} name="Streams" />
              <Line type="monotone" dataKey="listeners" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} name="Listeners" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[350px] items-center justify-center text-sm text-[#B3B3B3]">No analytics uploads available for this range.</div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Platform Distribution */}
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
          <h3 className="text-xl font-semibold mb-6">Platform Distribution</h3>
          {platformData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="streams"
                  >
                    {platformData.map((entry) => (
                      <Cell key={`analytics-platform-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 mt-6">
                {platformData.map((platform) => (
                  <div key={platform.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${platform.dotClassName}`} />
                      <span className="text-sm">{platform.name}</span>
                    </div>
                    <span className="text-sm font-medium">{platform.streams.toLocaleString()} streams</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-[#B3B3B3]">No platform analytics uploaded yet.</div>
          )}
        </Card>

        {/* Geography */}
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
          <h3 className="text-xl font-semibold mb-6">Top Countries</h3>
          <div className="space-y-4">
            {(summary?.geographyBreakdown || []).length === 0 ? (
              <div className="text-sm text-[#B3B3B3]">No territory data available in the uploaded analytics.</div>
            ) : (summary?.geographyBreakdown || []).map((country, index) => (
              <div key={country.country} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[#B3B3B3] font-medium w-6">{index + 1}</span>
                    <span className="font-medium">{country.country}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#B3B3B3]">{country.streams.toLocaleString()}</span>
                    <Badge variant="secondary">{country.percentage}%</Badge>
                  </div>
                </div>
                <progress className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#161616]/10 [&::-webkit-progress-value]:bg-[#FF6B00]" max={100} value={country.percentage} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Audience Demographics */}
      <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
        <h3 className="text-xl font-semibold mb-6">Audience Demographics</h3>
        {(summary?.demographics || []).length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary?.demographics || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="age" stroke="#B3B3B3" fontSize={12} />
              <YAxis stroke="#B3B3B3" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#161616', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '12px', color: '#fff' }} />
              <Legend />
              <Bar dataKey="male" fill="#3B82F6" name="Male" radius={[4, 4, 0, 0]} />
              <Bar dataKey="female" fill="#EC4899" name="Female" radius={[4, 4, 0, 0]} />
              <Bar dataKey="other" fill="#9333EA" name="Other" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-[#B3B3B3]">No age or gender fields were present in the uploaded analytics.</div>
        )}
      </Card>
    </div>
  );
}