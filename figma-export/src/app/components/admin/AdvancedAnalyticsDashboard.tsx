import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  Users, TrendingUp, Music2, Globe, DollarSign, BarChart3,
  AlertTriangle, RefreshCw, Download, Layers, Activity,
  ChevronUp, ChevronDown, Star, Radio,
} from 'lucide-react';
import {
  getAdvancedAnalytics,
  type AdvancedAnalyticsData,
  type AdvancedAnalyticsTopRelease,
  type AdvancedAnalyticsTopEarner,
} from '../../utils/admin-api';

// ── Palette ───────────────────────────────────────────────────────────────────
const PURPLE = '#7B61FF';
const CYAN = '#00E5FF';
const GREEN = '#22D3A1';
const AMBER = '#F59E0B';
const ROSE = '#F43F5E';
const PIE_COLORS = [PURPLE, CYAN, GREEN, AMBER, ROSE, '#818CF8', '#34D399', '#FB923C', '#A78BFA', '#6EE7B7'];

// Pre-declared Tailwind class maps (no inline styles allowed)
const PIE_DOT_CLS = [
  'bg-[#7B61FF]', 'bg-[#00E5FF]', 'bg-[#22D3A1]', 'bg-[#F59E0B]', 'bg-[#F43F5E]',
  'bg-[#818CF8]', 'bg-[#34D399]', 'bg-[#FB923C]', 'bg-[#A78BFA]', 'bg-[#6EE7B7]',
];

const ACCENT_ICON_BG: Record<string, string> = {
  [PURPLE]: 'bg-[#7B61FF]/20',
  [CYAN]: 'bg-[#00E5FF]/20',
  [GREEN]: 'bg-[#22D3A1]/20',
  [AMBER]: 'bg-[#F59E0B]/20',
  [ROSE]: 'bg-[#F43F5E]/20',
};

const ACCENT_ICON_TEXT: Record<string, string> = {
  [PURPLE]: 'text-[#7B61FF]',
  [CYAN]: 'text-[#00E5FF]',
  [GREEN]: 'text-[#22D3A1]',
  [AMBER]: 'text-[#F59E0B]',
  [ROSE]: 'text-[#F43F5E]',
};

const CHART_STYLE = { fontSize: 11 };
const TOOLTIP_STYLE = {
  contentStyle: { background: '#121826', border: '1px solid rgba(123,97,255,0.25)', borderRadius: 8 },
  labelStyle: { color: '#A0A7B8' },
  itemStyle: { color: '#E2E8F0' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtCurrency(n: number, digits = 0): string {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function fmtMonthLabel(m: string): string {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = PURPLE,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? ChevronUp : trend === 'down' ? ChevronDown : null;
  return (
    <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#A0A7B8] uppercase tracking-wider">{label}</span>
        <div className={`rounded-lg p-2 ${ACCENT_ICON_BG[accent] ?? 'bg-[#7B61FF]/20'}`}>
          <Icon size={16} className={ACCENT_ICON_TEXT[accent] ?? 'text-[#7B61FF]'} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {TrendIcon && (
          <TrendIcon size={16} className={trend === 'up' ? 'text-[#22D3A1] mb-1' : 'text-[#F43F5E] mb-1'} />
        )}
      </div>
      {sub && <span className="text-xs text-[#A0A7B8]">{sub}</span>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-[#A0A7B8] uppercase tracking-wider mb-3">{children}</h3>;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-5 ${className}`}>{children}</div>
  );
}

// ── Tab: User Analytics ───────────────────────────────────────────────────────
function UserAnalyticsTab({ d }: { d: AdvancedAnalyticsData['userAnalytics'] }) {
  const growthData = d.monthlyGrowth.map(m => ({ ...m, month: fmtMonthLabel(m.month) }));

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={fmtNumber(d.totalUsers)} icon={Users} accent={PURPLE} />
        <KpiCard label="Artists" value={fmtNumber(d.artists)} icon={Radio} accent={CYAN} />
        <KpiCard label="Labels / Partners" value={fmtNumber(d.labels)} icon={Layers} accent={GREEN} />
        <KpiCard
          label="At-Risk Artists"
          value={fmtNumber(d.churnedCount)}
          sub="No upload in 90+ days"
          icon={AlertTriangle}
          accent={AMBER}
          trend={d.churnedCount > 0 ? 'down' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Growth */}
        <Card>
          <SectionTitle>Monthly User Growth</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthData} style={CHART_STYLE}>
              <defs>
                <linearGradient id="gCumul" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PURPLE} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" />
              <XAxis dataKey="month" tick={{ fill: '#A0A7B8' }} />
              <YAxis tick={{ fill: '#A0A7B8' }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend />
              <Area type="monotone" dataKey="cumulative" name="Total Users" stroke={PURPLE} fill="url(#gCumul)" strokeWidth={2} />
              <Area type="monotone" dataKey="new" name="New Users" stroke={CYAN} fill="url(#gNew)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Subscription Breakdown */}
        <Card>
          <SectionTitle>Subscription Tiers</SectionTitle>
          <div className="flex items-center gap-5">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={d.subscriptionBreakdown}
                  dataKey="count"
                  nameKey="tier"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {d.subscriptionBreakdown.map((entry, i) => (
                    <Cell key={entry.tier} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {d.subscriptionBreakdown.map((s, i) => (
                <div key={s.tier} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${PIE_DOT_CLS[i % PIE_DOT_CLS.length]}`} />
                    <span className="text-xs text-[#A0A7B8] capitalize">{s.tier.replace('_', ' ')}</span>
                  </div>
                  <span className="text-xs font-semibold text-white">{fmtNumber(s.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Genre Distribution */}
        <Card>
          <SectionTitle>Top Artist Genres</SectionTitle>
          {d.genreDistribution.length === 0 ? (
            <p className="text-xs text-[#A0A7B8] py-8 text-center">No genre data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.genreDistribution} layout="vertical" style={CHART_STYLE}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#A0A7B8' }} />
                <YAxis dataKey="genre" type="category" tick={{ fill: '#A0A7B8' }} width={85} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill={PURPLE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Country Distribution */}
        <Card>
          <SectionTitle>Users by Country</SectionTitle>
          <div className="max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#7B61FF]/15">
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Country</th>
                  <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Users</th>
                  <th className="text-right py-1.5 text-[#A0A7B8] font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {d.countryDistribution.map(c => (
                  <tr key={c.country} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                    <td className="py-1.5 text-[#E2E8F0]">{c.country}</td>
                    <td className="py-1.5 text-right text-white font-medium">{fmtNumber(c.count)}</td>
                    <td className="py-1.5 text-right text-[#A0A7B8]">
                      {d.totalUsers > 0 ? ((c.count / d.totalUsers) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* At-Risk Users Table */}
      {d.atRiskUsers.length > 0 && (
        <Card>
          <SectionTitle>At-Risk Artists (No upload in 90+ days)</SectionTitle>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#7B61FF]/15">
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Artist</th>
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Email</th>
                  <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Last Release</th>
                  <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Days Inactive</th>
                </tr>
              </thead>
              <tbody>
                {d.atRiskUsers.map(u => (
                  <tr key={u.userId} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                    <td className="py-1.5 text-[#E2E8F0] font-medium">{u.artistName || '(no name)'}</td>
                    <td className="py-1.5 text-[#A0A7B8]">{u.email}</td>
                    <td className="py-1.5 text-right text-[#A0A7B8]">
                      {u.lastRelease ? new Date(u.lastRelease).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-1.5 text-right">
                      <span className={u.daysSince != null && u.daysSince > 180 ? 'text-[#F43F5E] font-semibold' : 'text-[#F59E0B]'}>
                        {u.daysSince != null ? `${u.daysSince}d` : 'Never uploaded'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Release Analytics ─────────────────────────────────────────────────────
function ReleaseAnalyticsTab({ d }: { d: AdvancedAnalyticsData['releaseAnalytics'] }) {
  const monthlyData = d.monthlyReleases.map(m => ({ ...m, month: fmtMonthLabel(m.month) }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Releases" value={fmtNumber(d.totalReleases)} icon={Music2} accent={PURPLE} />
        {d.byType.map((t, i) => (
          <KpiCard
            key={t.type}
            label={t.type.charAt(0).toUpperCase() + t.type.slice(1) + 's'}
            value={fmtNumber(t.count)}
            sub={`${fmtNumber(t.streams)} streams`}
            icon={Music2}
            accent={PIE_COLORS[i + 1]}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Releases */}
        <Card>
          <SectionTitle>Releases per Month</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} style={CHART_STYLE}>
              <defs>
                <linearGradient id="gRel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" />
              <XAxis dataKey="month" tick={{ fill: '#A0A7B8' }} />
              <YAxis tick={{ fill: '#A0A7B8' }} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="count" name="Releases" stroke={CYAN} fill="url(#gRel)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Release Status Breakdown */}
        <Card>
          <SectionTitle>By Status</SectionTitle>
          <div className="flex items-center gap-5">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={d.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3}>
                  {d.byStatus.map((entry, i) => (
                    <Cell key={entry.status} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {d.byStatus.map((s, i) => (
                <div key={s.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${PIE_DOT_CLS[i % PIE_DOT_CLS.length]}`} />
                    <span className="text-xs text-[#A0A7B8] capitalize">{s.status}</span>
                  </div>
                  <span className="text-xs font-semibold text-white">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Genre Performance */}
      {d.byGenre.length > 0 && (
        <Card>
          <SectionTitle>Genre Performance (streams)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.byGenre} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" />
              <XAxis dataKey="genre" tick={{ fill: '#A0A7B8' }} />
              <YAxis tick={{ fill: '#A0A7B8' }} tickFormatter={fmtNumber} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [fmtNumber(v)]} />
              <Legend />
              <Bar dataKey="streams" name="Streams" fill={PURPLE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="count" name="Releases" fill={CYAN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top Releases Leaderboard */}
      <Card>
        <SectionTitle>Top Releases Leaderboard</SectionTitle>
        {d.topReleases.length === 0 ? (
          <p className="text-xs text-[#A0A7B8] py-8 text-center">No release analytics data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-[#7B61FF]/15">
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium w-6">#</th>
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Title</th>
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Artist</th>
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Type</th>
                  <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Streams</th>
                  <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Revenue</th>
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.topReleases.map((r: AdvancedAnalyticsTopRelease, idx) => (
                  <tr key={r.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                    <td className="py-1.5">
                      {idx < 3 ? (
                        <Star size={12} className="text-[#F59E0B]" />
                      ) : (
                        <span className="text-[#A0A7B8]">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-[#E2E8F0] font-medium max-w-[140px] truncate">{r.title}</td>
                    <td className="py-1.5 text-[#A0A7B8] max-w-[100px] truncate">{r.artist}</td>
                    <td className="py-1.5 text-[#A0A7B8] capitalize">{r.type}</td>
                    <td className="py-1.5 text-right text-white font-medium">{fmtNumber(r.streams)}</td>
                    <td className="py-1.5 text-right text-[#22D3A1]">{fmtCurrency(r.revenue)}</td>
                    <td className="py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] capitalize ${
                        r.status === 'live' ? 'bg-[#22D3A1]/15 text-[#22D3A1]' :
                        r.status === 'submitted' ? 'bg-[#7B61FF]/15 text-[#7B61FF]' :
                        r.status === 'rejected' ? 'bg-[#F43F5E]/15 text-[#F43F5E]' :
                        'bg-[#A0A7B8]/15 text-[#A0A7B8]'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: Platform Analytics ───────────────────────────────────────────────────
function PlatformAnalyticsTab({ d }: { d: AdvancedAnalyticsData['platformAnalytics'] }) {
  const monthlyData = d.monthlyTrends.map(m => ({ ...m, month: fmtMonthLabel(m.month) }));
  const totalStreams = d.dspBreakdown.reduce((s, p) => s + p.streams, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Total Streams" value={fmtNumber(totalStreams)} icon={Activity} accent={PURPLE} />
        <KpiCard label="Platforms Tracked" value={String(d.dspBreakdown.length)} icon={Globe} accent={CYAN} />
        <KpiCard label="Analytics Records" value={fmtNumber(d.totalAnalyticsRecords)} sub={`${d.totalRoyaltyBatches} royalty batches`} icon={BarChart3} accent={GREEN} />
      </div>

      {/* Monthly Trends */}
      <Card>
        <SectionTitle>Monthly Platform Trends</SectionTitle>
        {monthlyData.length === 0 ? (
          <p className="text-xs text-[#A0A7B8] py-8 text-center">No analytics data uploaded yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData} style={CHART_STYLE}>
              <defs>
                <linearGradient id="gStr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PURPLE} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gList" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" />
              <XAxis dataKey="month" tick={{ fill: '#A0A7B8' }} />
              <YAxis tick={{ fill: '#A0A7B8' }} tickFormatter={fmtNumber} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [fmtNumber(v)]} />
              <Legend />
              <Area type="monotone" dataKey="streams" name="Streams" stroke={PURPLE} fill="url(#gStr)" strokeWidth={2} />
              <Area type="monotone" dataKey="listeners" name="Listeners" stroke={CYAN} fill="url(#gList)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* DSP Breakdown Table */}
        <Card>
          <SectionTitle>DSP Performance</SectionTitle>
          {d.dspBreakdown.length === 0 ? (
            <p className="text-xs text-[#A0A7B8] py-8 text-center">No DSP data yet</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#7B61FF]/15">
                    <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Platform</th>
                    <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Streams</th>
                    <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Revenue</th>
                    <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Listeners</th>
                  </tr>
                </thead>
                <tbody>
                  {d.dspBreakdown.map((p, i) => (
                    <tr key={p.platform} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                      <td className="py-1.5 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${PIE_DOT_CLS[i % PIE_DOT_CLS.length]}`} />
                        <span className="text-[#E2E8F0]">{p.platform}</span>
                      </td>
                      <td className="py-1.5 text-right text-white font-medium">{fmtNumber(p.streams)}</td>
                      <td className="py-1.5 text-right text-[#22D3A1]">{fmtCurrency(p.revenue)}</td>
                      <td className="py-1.5 text-right text-[#A0A7B8]">{fmtNumber(p.listeners)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Geography */}
        <Card>
          <SectionTitle>Top Territories by Streams</SectionTitle>
          {d.geographyBreakdown.length === 0 ? (
            <p className="text-xs text-[#A0A7B8] py-8 text-center">No territory data yet</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#7B61FF]/15">
                    <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Country</th>
                    <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Streams</th>
                    <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Revenue</th>
                    <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {d.geographyBreakdown.map(g => (
                    <tr key={g.country} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                      <td className="py-1.5 text-[#E2E8F0]">{g.country}</td>
                      <td className="py-1.5 text-right text-white font-medium">{fmtNumber(g.streams)}</td>
                      <td className="py-1.5 text-right text-[#22D3A1]">{fmtCurrency(g.revenue)}</td>
                      <td className="py-1.5 text-right text-[#A0A7B8]">
                        {totalStreams > 0 ? ((g.streams / totalStreams) * 100).toFixed(1) : '0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Demographics */}
      {d.demographics.length > 0 && (
        <Card>
          <SectionTitle>Listener Demographics (Age × Gender)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.demographics} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" />
              <XAxis dataKey="ageGroup" tick={{ fill: '#A0A7B8' }} />
              <YAxis tick={{ fill: '#A0A7B8' }} tickFormatter={fmtNumber} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [fmtNumber(v)]} />
              <Legend />
              <Bar dataKey="male" name="Male" stackId="demo" fill={PURPLE} />
              <Bar dataKey="female" name="Female" stackId="demo" fill={CYAN} />
              <Bar dataKey="other" name="Other" stackId="demo" fill={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Financial Analytics ──────────────────────────────────────────────────
function FinancialAnalyticsTab({ d }: { d: AdvancedAnalyticsData['financialAnalytics'] }) {
  const monthlyData = d.monthlyRevenue.map(m => ({ ...m, month: fmtMonthLabel(m.month) }));
  const lastMonth = d.monthlyRevenue[d.monthlyRevenue.length - 1]?.revenue ?? 0;
  const forecastDelta = d.forecastNextMonth - lastMonth;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={fmtCurrency(d.totalRevenue)} icon={DollarSign} accent={GREEN} />
        <KpiCard label="Subscription Revenue" value={fmtCurrency(d.subscriptionRevenue)} icon={TrendingUp} accent={PURPLE} />
        <KpiCard label="Royalty Revenue" value={fmtCurrency(d.royaltyRevenue)} icon={Music2} accent={CYAN} />
        <KpiCard label="Pending Payouts" value={fmtCurrency(d.pendingPayouts)} icon={AlertTriangle} accent={AMBER} trend={d.pendingPayouts > 0 ? 'down' : 'neutral'} />
      </div>

      {/* Revenue forecast card */}
      <div className="rounded-xl border border-[#22D3A1]/30 bg-[#121826] p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#A0A7B8] uppercase tracking-wider mb-1">Next Month Forecast</p>
            <p className="text-3xl font-bold text-white">{fmtCurrency(d.forecastNextMonth)}</p>
          </div>
          <div className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${forecastDelta >= 0 ? 'bg-[#22D3A1]/15 text-[#22D3A1]' : 'bg-[#F43F5E]/15 text-[#F43F5E]'}`}>
            {forecastDelta >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {fmtCurrency(Math.abs(forecastDelta))}
          </div>
        </div>
        <p className="text-xs text-[#A0A7B8] mt-2">Linear regression on last 3 months of payment data</p>
      </div>

      {/* Monthly Revenue Chart */}
      <Card>
        <SectionTitle>Monthly Revenue Breakdown</SectionTitle>
        {monthlyData.length === 0 ? (
          <p className="text-xs text-[#A0A7B8] py-8 text-center">No revenue data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthlyData} style={CHART_STYLE}>
              <defs>
                <linearGradient id="gSubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PURPLE} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPayouts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ROSE} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={ROSE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" />
              <XAxis dataKey="month" tick={{ fill: '#A0A7B8' }} />
              <YAxis tick={{ fill: '#A0A7B8' }} tickFormatter={(v) => `₦${fmtNumber(v)}`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [fmtCurrency(v)]} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke={GREEN} fill="url(#gRev)" strokeWidth={2} />
              <Area type="monotone" dataKey="subscriptions" name="Subscriptions" stroke={PURPLE} fill="url(#gSubs)" strokeWidth={2} />
              <Area type="monotone" dataKey="payouts" name="Payouts" stroke={ROSE} fill="url(#gPayouts)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Top Earners */}
      <Card>
        <SectionTitle>Top Earning Artists</SectionTitle>
        {d.topEarners.length === 0 ? (
          <p className="text-xs text-[#A0A7B8] py-8 text-center">No earning data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-[#7B61FF]/15">
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">#</th>
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Artist</th>
                  <th className="text-left py-1.5 text-[#A0A7B8] font-medium">Email</th>
                  <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Total Earnings</th>
                  <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Available</th>
                  <th className="text-right py-1.5 text-[#A0A7B8] font-medium">Pending</th>
                </tr>
              </thead>
              <tbody>
                {d.topEarners.map((e: AdvancedAnalyticsTopEarner, i) => (
                  <tr key={e.userId} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                    <td className="py-1.5 text-[#A0A7B8]">
                      {i < 3 ? <Star size={12} className="text-[#F59E0B]" /> : i + 1}
                    </td>
                    <td className="py-1.5 text-[#E2E8F0] font-medium">{e.name}</td>
                    <td className="py-1.5 text-[#A0A7B8]">{e.email}</td>
                    <td className="py-1.5 text-right text-[#22D3A1] font-semibold">{fmtCurrency(e.earnings)}</td>
                    <td className="py-1.5 text-right text-white">{fmtCurrency(e.availableBalance)}</td>
                    <td className="py-1.5 text-right text-[#F59E0B]">{fmtCurrency(e.pendingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: Custom Reports ───────────────────────────────────────────────────────
type ReportDimension = 'users' | 'releases' | 'platforms' | 'financials' | 'top-earners' | 'at-risk';

const REPORT_DIMENSIONS: { value: ReportDimension; label: string }[] = [
  { value: 'users', label: 'User Growth' },
  { value: 'releases', label: 'Releases' },
  { value: 'platforms', label: 'DSP Breakdown' },
  { value: 'financials', label: 'Monthly Revenue' },
  { value: 'top-earners', label: 'Top Earners' },
  { value: 'at-risk', label: 'At-Risk Artists' },
];

function CustomReportsTab({ data }: { data: AdvancedAnalyticsData }) {
  const [dimension, setDimension] = useState<ReportDimension>('users');

  const previewRows = useMemo<Record<string, string | number>[]>(() => {
    switch (dimension) {
      case 'users':
        return data.userAnalytics.monthlyGrowth.map(m => ({ Month: m.month, 'New Users': m.new, 'Cumulative Users': m.cumulative }));
      case 'releases':
        return data.releaseAnalytics.topReleases.map(r => ({
          Title: r.title, Artist: r.artist, Type: r.type, Genre: r.genre,
          Streams: r.streams, Revenue: r.revenue, Status: r.status, 'Release Date': r.releaseDate,
        }));
      case 'platforms':
        return data.platformAnalytics.dspBreakdown.map(p => ({
          Platform: p.platform, Streams: p.streams, Listeners: p.listeners,
          Revenue: p.revenue, Records: p.records,
        }));
      case 'financials':
        return data.financialAnalytics.monthlyRevenue.map(m => ({
          Month: m.month, 'Total Revenue': m.revenue, Subscriptions: m.subscriptions, Payouts: m.payouts,
        }));
      case 'top-earners':
        return data.financialAnalytics.topEarners.map(e => ({
          Name: e.name, Email: e.email, 'Total Earnings': e.earnings,
          'Available Balance': e.availableBalance, 'Pending Balance': e.pendingBalance,
        }));
      case 'at-risk':
        return data.userAnalytics.atRiskUsers.map(u => ({
          'Artist Name': u.artistName ?? '', Email: u.email,
          'Joined': u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
          'Last Release': u.lastRelease ? new Date(u.lastRelease).toLocaleDateString() : 'Never',
          'Days Inactive': u.daysSince ?? 'N/A',
        }));
      default:
        return [];
    }
  }, [dimension, data]);

  const columns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  function handleExport() {
    if (previewRows.length === 0) return;
    const header = columns.join(',');
    const rows = previewRows.map(row =>
      columns.map(col => {
        const v = String(row[col] ?? '');
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `advanced-analytics-${dimension}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle>Custom Report Builder</SectionTitle>
        <div className="flex flex-wrap gap-3 items-end mb-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#A0A7B8]">Dataset</label>
            <select
              value={dimension}
              onChange={e => setDimension(e.target.value as ReportDimension)}
              aria-label="Select dataset"
              title="Select dataset"
              className="rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm px-3 py-2 focus:outline-none focus:border-[#7B61FF]/60"
            >
              {REPORT_DIMENSIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-medium transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto max-h-96">
          {previewRows.length === 0 ? (
            <p className="text-xs text-[#A0A7B8] py-8 text-center">No data available for this dataset</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#7B61FF]/15">
                  {columns.map(col => (
                    <th key={col} className="text-left py-1.5 pr-3 text-[#A0A7B8] font-medium whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                    {columns.map(col => (
                      <td key={col} className="py-1.5 pr-3 text-[#E2E8F0] whitespace-nowrap">
                        {typeof row[col] === 'number' && String(col).toLowerCase().includes('revenue')
                          ? fmtCurrency(row[col] as number)
                          : typeof row[col] === 'number'
                          ? fmtNumber(row[col] as number)
                          : String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {previewRows.length > 50 && (
          <p className="text-xs text-[#A0A7B8] mt-2">Showing 50 of {previewRows.length} rows. Export CSV for full dataset.</p>
        )}
      </Card>

      {/* Meta info */}
      <Card>
        <SectionTitle>Data Snapshot Info</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Generated At', value: new Date(data.meta.generatedAt).toLocaleString() },
            { label: 'Users Loaded', value: fmtNumber(data.meta.usersLoaded) },
            { label: 'Releases Loaded', value: fmtNumber(data.meta.releasesLoaded) },
            { label: 'Analytics Records', value: fmtNumber(data.meta.analyticsRecordsLoaded) },
            { label: 'Royalty Batches', value: fmtNumber(data.meta.royaltyBatchesLoaded) },
          ].map(item => (
            <div key={item.label} className="rounded-lg border border-[#7B61FF]/15 p-3">
              <p className="text-xs text-[#A0A7B8] mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
type TabKey = 'users' | 'releases' | 'platform' | 'financial' | 'reports';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'users', label: 'User Analytics', icon: Users },
  { key: 'releases', label: 'Release Analytics', icon: Music2 },
  { key: 'platform', label: 'Platform & DSP', icon: Globe },
  { key: 'financial', label: 'Financial', icon: DollarSign },
  { key: 'reports', label: 'Custom Reports', icon: Download },
];

export function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState<AdvancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const result = await getAdvancedAnalytics();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#A0A7B8]">Aggregating analytics data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle size={32} className="text-[#F43F5E]" />
        <p className="text-sm text-[#A0A7B8]">{error ?? 'No data returned'}</p>
        <button onClick={() => load()} className="px-4 py-2 rounded-lg bg-[#7B61FF] text-white text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Advanced Analytics & Reporting</h1>
          <p className="text-xs text-[#A0A7B8] mt-0.5">
            Live data from all platform sources · Last updated {new Date(data.meta.generatedAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#7B61FF]/30 bg-[#121826] text-[#A0A7B8] hover:text-white hover:border-[#7B61FF]/60 transition-colors text-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 flex-wrap rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#7B61FF] text-white'
                  : 'text-[#A0A7B8] hover:text-white hover:bg-[#7B61FF]/15'
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UserAnalyticsTab d={data.userAnalytics} />}
      {activeTab === 'releases' && <ReleaseAnalyticsTab d={data.releaseAnalytics} />}
      {activeTab === 'platform' && <PlatformAnalyticsTab d={data.platformAnalytics} />}
      {activeTab === 'financial' && <FinancialAnalyticsTab d={data.financialAnalytics} />}
      {activeTab === 'reports' && <CustomReportsTab data={data} />}
    </div>
  );
}
