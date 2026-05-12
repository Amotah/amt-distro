import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';
import {
  Users,
  Music,
  TrendingUp,
  AlertTriangle,
  Clock,
  Activity,
  Zap,
  CheckCircle,
  DollarSign,
  UserCheck,
  Building2,
  RefreshCw,
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
  Cell,
} from 'recharts';

export function AdminDashboard() {
  const { adminUser } = useAdmin();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<adminApi.User[]>([]);
  const [releases, setReleases] = useState<adminApi.Release[]>([]);
  const [alerts, setAlerts] = useState<adminApi.FraudAlert[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<adminApi.PayoutRequest[]>([]);
  const [payments, setPayments] = useState<adminApi.AdminPaymentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<adminApi.AuditLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<adminApi.Release['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPayoutReference, setIsUpdatingPayoutReference] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setIsLoading(true);
      
      const [statsData, usersData, releasesData, alertsData] = await Promise.allSettled([
        adminApi.getAdminStatistics(),
        adminApi.getAllUsers().catch(() => []),
        adminApi.getAllReleases().catch(() => []),
        adminApi.getAllFraudAlerts().catch(() => []),
      ]);

      const [payoutData, paymentsData, auditData] = await Promise.all([
        adminApi.getPayoutRequests().catch(() => []),
        adminApi.getAdminPayments().catch(() => []),
        adminApi.getAuditLogs({}).catch(() => []),
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (usersData.status === 'fulfilled') setUsers(usersData.value);
      if (releasesData.status === 'fulfilled') setReleases(releasesData.value);
      if (alertsData.status === 'fulfilled') setAlerts(alertsData.value);
      setPayoutRequests(payoutData);
      setPayments(paymentsData);
      setAuditLogs(auditData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdatePayout(reference: string, status: 'completed' | 'failed') {
    try {
      setIsUpdatingPayoutReference(reference);
      const updated = await adminApi.updatePayoutRequest(reference, status);
      setPayoutRequests((current) => current.map((request) => request.reference === reference ? updated : request));
    } catch (error) {
      console.error('Error updating payout request:', error);
    } finally {
      setIsUpdatingPayoutReference(null);
    }
  }

  const totalUsers = users.length;
  const totalTracks = releases.length;
  const totalStreams = releases.reduce((sum, r) => sum + ((r as any).totalStreams || 0), 0);
  const pendingApprovals = releases.filter(r => r.status === 'submitted').length;

  // New derived stats
  const totalArtists = users.filter((u) => u.role === 'artist').length;
  const totalPartners = users.filter((u) => u.role === 'partner').length;
  const completedPayments = payments.filter((p) => p.status === 'completed');
  const platformRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Platform Revenue chart data — group completed payments by plan type
  const platformRevenueData = useMemo(() => {
    const groups: Record<string, number> = {};
    completedPayments.forEach((p) => {
      const label =
        p.plan === 'artist' ? 'Artist Sub' :
        p.plan === 'label'  ? 'Partner Sub' :
        p.plan === 'promotion' ? 'Promotion' :
        p.purpose === 'release' ? 'Release Fee' :
        p.purpose === 'payout' ? 'Payout' : 'Other';
      groups[label] = (groups[label] || 0) + (p.amount || 0);
    });
    return Object.entries(groups)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [completedPayments]);

  // Per-user track counts
  const trackCountByArtist = useMemo(() => {
    const map: Record<string, number> = {};
    releases.forEach((r) => {
      const key = r.primaryArtist?.toLowerCase() || '';
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [releases]);

  // Recent Activity Log — built from audit logs + recent payment events
  const activityItems = useMemo(() => {
    const items: { id: string; time: string; text: string; type: 'payment' | 'user' | 'release' | 'system' }[] = [];
    auditLogs.slice(0, 20).forEach((log) => {
      items.push({
        id: log.id,
        time: log.timestamp,
        text: `${log.action} on ${log.resource}${log.resourceId ? ` (${log.resourceId.slice(0, 8)}…)` : ''}`,
        type: log.resource?.toLowerCase().includes('payment') ? 'payment' :
              log.resource?.toLowerCase().includes('user') ? 'user' :
              log.resource?.toLowerCase().includes('release') ? 'release' : 'system',
      });
    });
    // Supplement with recent completed payments if audit log is thin
    completedPayments.slice(0, 10).forEach((p) => {
      if (items.length < 20) {
        items.push({
          id: `pay-${p.id}`,
          time: p.createdAt,
          text: `Payment of ₦${p.amount.toLocaleString()} received from ${p.email} (${p.plan || p.purpose || 'subscription'})`,
          type: 'payment',
        });
      }
    });
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 15);
  }, [auditLogs, completedPayments]);

  const filteredReleases = useMemo(() => {
    return releases
      .filter((release) =>
        statusFilter === 'all' ? true : release.status === statusFilter
      )
      .filter((release) => {
        const term = searchQuery.trim().toLowerCase();
        if (!term) return true;
        return (
          release.title.toLowerCase().includes(term) ||
          release.primaryArtist.toLowerCase().includes(term) ||
          release.upc?.toLowerCase().includes(term)
        );
      });
  }, [releases, statusFilter, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredReleases.length / PAGE_SIZE));

  const pagedReleases = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReleases.slice(start, start + PAGE_SIZE);
  }, [filteredReleases, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const streamsData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const key = date.toISOString().split('T')[0];

    const streamsForDay = releases
      .filter((release) => {
        const releaseDate = new Date(release.releaseDate || release.createdAt || '');
        return releaseDate.toISOString().split('T')[0] === key;
      })
      .reduce((sum, release) => sum + ((release as any).totalStreams || 0), 0);

    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      streams: streamsForDay,
    };
  });

  const uploadsData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const key = date.toISOString().split('T')[0];

    const dayReleases = releases.filter((r) => {
      const releaseDate = new Date(r.createdAt || '');
      return releaseDate.toISOString().split('T')[0] === key;
    }).length;

    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      uploads: dayReleases || 0,
    };
  });

  const recentUploads = pagedReleases;
  const flaggedContent = releases.filter((r) => r.status === 'rejected' || r.status === 'failed');
  const pendingPayoutRequests = payoutRequests.filter((request) => request.status === 'pending');
  const canManagePayouts = Boolean(adminUser?.role === 'superadmin' || adminUser?.permissions.includes('payments.approve'));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#0B0F1A' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#00E5FF' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-8 h-8" style={{ color: '#00E5FF' }} />
          <h1 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
            Dashboard Overview
          </h1>
        </div>
        <p style={{ color: '#A0A7B8' }}>
          Real-time platform monitoring and analytics
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="rounded-xl p-6 border relative overflow-hidden" style={{ backgroundColor: '#121826', borderColor: 'rgba(0, 229, 255, 0.2)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background: 'radial-gradient(circle, #00E5FF 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)' }}>
                <Users className="w-6 h-6" style={{ color: '#00E5FF' }} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 255, 163, 0.1)', color: '#00FFA3' }}>
                <TrendingUp className="w-3 h-3" />
                Live
              </div>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#A0A7B8' }}>Total Users</p>
            <h3 className="text-4xl font-bold" style={{ color: '#FFFFFF' }}>{totalUsers.toLocaleString()}</h3>
          </div>
        </div>

        {/* Total Artists */}
        <div className="rounded-xl p-6 border relative overflow-hidden" style={{ backgroundColor: '#121826', borderColor: 'rgba(123, 97, 255, 0.2)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background: 'radial-gradient(circle, #7B61FF 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(123, 97, 255, 0.1)' }}>
                <UserCheck className="w-6 h-6" style={{ color: '#7B61FF' }} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 255, 163, 0.1)', color: '#00FFA3' }}>
                <TrendingUp className="w-3 h-3" />
                Live
              </div>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#A0A7B8' }}>Total Artists</p>
            <h3 className="text-4xl font-bold" style={{ color: '#FFFFFF' }}>{totalArtists.toLocaleString()}</h3>
          </div>
        </div>

        {/* Total Partners */}
        <div className="rounded-xl p-6 border relative overflow-hidden" style={{ backgroundColor: '#121826', borderColor: 'rgba(0, 255, 163, 0.2)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background: 'radial-gradient(circle, #00FFA3 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(0, 255, 163, 0.1)' }}>
                <Building2 className="w-6 h-6" style={{ color: '#00FFA3' }} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 255, 163, 0.1)', color: '#00FFA3' }}>
                <TrendingUp className="w-3 h-3" />
                Live
              </div>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#A0A7B8' }}>Total Partners</p>
            <h3 className="text-4xl font-bold" style={{ color: '#FFFFFF' }}>{totalPartners.toLocaleString()}</h3>
          </div>
        </div>

        {/* Platform Revenue */}
        <div className="rounded-xl p-6 border relative overflow-hidden" style={{ backgroundColor: 'rgba(255, 152, 0, 0.05)', borderColor: 'rgba(255, 152, 0, 0.3)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background: 'radial-gradient(circle, #FF9800 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)' }}>
                <DollarSign className="w-6 h-6" style={{ color: '#FF9800' }} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' }}>
                <Activity className="w-3 h-3" />
                Revenue
              </div>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#FF9800' }}>Platform Revenue</p>
            <h3 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>₦{platformRevenue.toLocaleString()}</h3>
            <p className="text-xs mt-1" style={{ color: '#A0A7B8' }}>{completedPayments.length} completed payments</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streams Over Time */}
        <div className="rounded-xl p-6 border" style={{ backgroundColor: '#121826', borderColor: 'rgba(123, 97, 255, 0.1)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>Streams Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={streamsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 97, 255, 0.1)" />
              <XAxis dataKey="date" stroke="#A0A7B8" />
              <YAxis stroke="#A0A7B8" />
              <Tooltip contentStyle={{ backgroundColor: '#121826', border: '1px solid rgba(123, 97, 255, 0.2)', borderRadius: '8px', color: '#fff' }} />
              <Line type="monotone" dataKey="streams" stroke="#00E5FF" strokeWidth={3} dot={{ fill: '#00E5FF', r: 5, strokeWidth: 2, stroke: '#0B0F1A' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Revenue Chart */}
        <div className="rounded-xl p-6 border" style={{ backgroundColor: '#121826', borderColor: 'rgba(123, 97, 255, 0.1)' }}>
          <h3 className="text-lg font-semibold mb-1" style={{ color: '#FFFFFF' }}>Platform Revenue by Type</h3>
          <p className="text-xs mb-4" style={{ color: '#A0A7B8' }}>Completed payments grouped by plan / purpose</p>
          {platformRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformRevenueData} layout="vertical" margin={{ left: 16, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 97, 255, 0.1)" horizontal={false} />
                <XAxis type="number" stroke="#A0A7B8" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#A0A7B8" width={88} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#121826', border: '1px solid rgba(123, 97, 255, 0.2)', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {platformRevenueData.map((_, i) => (
                    <Cell key={i} fill={['#7B61FF', '#00E5FF', '#00FFA3', '#FF9800', '#FF5252'][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] gap-2" style={{ color: '#A0A7B8' }}>
              <DollarSign className="w-10 h-10 opacity-20" />
              <p className="text-sm">No completed payment data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#121826', borderColor: 'rgba(123, 97, 255, 0.1)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.1)' }}>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Users</h3>
            <p className="text-sm" style={{ color: '#A0A7B8' }}>{totalUsers} registered accounts — live from database</p>
          </div>
          <button onClick={loadDashboardData} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(123, 97, 255, 0.1)', color: '#7B61FF' }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgba(123, 97, 255, 0.03)' }}>
              <tr>
                {['User', 'Role', 'Joined', 'Label', 'Tracks', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6D7385' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid rgba(123, 97, 255, 0.1)' }}>
              {users.length > 0 ? users.slice(0, 20).map((u) => {
                const displayName = u.artistName || u.labelName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0];
                const artistKey = (u.artistName || displayName).toLowerCase();
                const trackCount = trackCountByArtist[artistKey] || 0;
                const isActive = u.isVerified;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.05)' }} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>{displayName}</p>
                      <p className="text-xs" style={{ color: '#6D7385' }}>{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={
                        u.role === 'partner'
                          ? { backgroundColor: 'rgba(0, 229, 255, 0.08)', color: '#00E5FF', borderColor: 'rgba(0,229,255,0.25)' }
                          : u.role === 'admin'
                          ? { backgroundColor: 'rgba(255,152,0,0.08)', color: '#FF9800', borderColor: 'rgba(255,152,0,0.25)' }
                          : { backgroundColor: 'rgba(123,97,255,0.08)', color: '#7B61FF', borderColor: 'rgba(123,97,255,0.25)' }
                      }>
                        {(u.role || 'artist').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: '#A0A7B8' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: '#A0A7B8' }}>
                      {u.labelName || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono" style={{ color: '#FFFFFF' }}>
                      {trackCount}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={
                        isActive
                          ? { backgroundColor: 'rgba(0,255,163,0.1)', color: '#00FFA3' }
                          : { backgroundColor: 'rgba(160,167,184,0.1)', color: '#A0A7B8' }
                      }>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? '#00FFA3' : '#6D7385' }} />
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm" style={{ color: '#A0A7B8' }}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {users.length > 20 && (
          <div className="px-6 py-3 text-xs" style={{ color: '#6D7385', borderTop: '1px solid rgba(123,97,255,0.1)' }}>
            Showing 20 of {users.length} users
          </div>
        )}
      </div>

      {/* Recent Activity Log + Uploads Per Day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Activity Log */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#121826', borderColor: 'rgba(123, 97, 255, 0.1)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.1)' }}>
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
              <Activity className="w-5 h-5" style={{ color: '#00E5FF' }} />
              Recent Activity
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#A0A7B8' }}>Latest platform events from audit log and payments</p>
          </div>
          <div className="divide-y" style={{ divideColor: 'rgba(123,97,255,0.07)' }}>
            {activityItems.length > 0 ? activityItems.map((item) => (
              <div key={item.id} className="px-6 py-3 flex items-start gap-3">
                <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{
                  backgroundColor:
                    item.type === 'payment' ? '#00FFA3' :
                    item.type === 'user'    ? '#00E5FF' :
                    item.type === 'release' ? '#7B61FF' : '#FF9800',
                }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: '#D1D5DB' }}>{item.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6D7385' }}>
                    {new Date(item.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold" style={{
                  backgroundColor:
                    item.type === 'payment' ? 'rgba(0,255,163,0.1)' :
                    item.type === 'user'    ? 'rgba(0,229,255,0.1)' :
                    item.type === 'release' ? 'rgba(123,97,255,0.1)' : 'rgba(255,152,0,0.1)',
                  color:
                    item.type === 'payment' ? '#00FFA3' :
                    item.type === 'user'    ? '#00E5FF' :
                    item.type === 'release' ? '#7B61FF' : '#FF9800',
                }}>
                  {item.type}
                </span>
              </div>
            )) : (
              <div className="px-6 py-12 text-center" style={{ color: '#A0A7B8' }}>
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Uploads Per Day */}
        <div className="rounded-xl p-6 border" style={{ backgroundColor: '#121826', borderColor: 'rgba(123, 97, 255, 0.1)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>Uploads Per Day</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={uploadsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 97, 255, 0.1)" />
              <XAxis dataKey="date" stroke="#A0A7B8" />
              <YAxis stroke="#A0A7B8" allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#121826', border: '1px solid rgba(123, 97, 255, 0.2)', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="uploads" fill="#7B61FF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <div className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(123, 97, 255, 0.1)',
          }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.1)' }}>
            <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
              Recent Uploads
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium" style={{ color: '#A0A7B8' }}>
                Status:
                <select
                  className="ml-2 rounded px-2 py-1 bg-slate-900 text-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as adminApi.Release['status'] | 'all')}
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="processing">Processing</option>
                  <option value="live">Live</option>
                  <option value="takedown">Takedown</option>
                  <option value="failed">Failed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <input
                type="text"
                placeholder="Search track, artist, UPC"
                className="rounded px-3 py-2 bg-slate-800 text-white w-full sm:w-72 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ backgroundColor: '#1e293b' }}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'rgba(123, 97, 255, 0.03)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: '#A0A7B8' }}
                  >
                    Track
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: '#A0A7B8' }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid rgba(123, 97, 255, 0.1)' }}>
                {recentUploads.length > 0 ? (
                  recentUploads.map((release) => (
                    <tr key={release.id}
                      className="transition"
                      style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.05)' }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded flex-shrink-0"
                            style={{ backgroundColor: 'rgba(123, 97, 255, 0.1)' }}
                          >
                            {release.artworkUrl && (
                              <img
                                src={release.artworkUrl}
                                alt={release.title}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]"
                              style={{ color: '#FFFFFF' }}
                            >
                              {release.title}
                            </p>
                            <p className="text-xs" style={{ color: '#A0A7B8' }}>
                              {release.primaryArtist}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor:
                              release.status === 'live'
                                ? 'rgba(0, 255, 163, 0.1)'
                                : release.status === 'submitted'
                                ? 'rgba(255, 152, 0, 0.1)'
                                : release.status === 'processing'
                                ? 'rgba(0, 229, 255, 0.1)'
                                : release.status === 'rejected'
                                ? 'rgba(255, 82, 82, 0.1)'
                                : 'rgba(160, 167, 184, 0.1)',
                            color:
                              release.status === 'live'
                                ? '#00FFA3'
                                : release.status === 'submitted'
                                ? '#FF9800'
                                : release.status === 'processing'
                                ? '#00E5FF'
                                : release.status === 'rejected'
                                ? '#FF5252'
                                : '#A0A7B8',
                          }}
                        >
                          {release.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center" style={{ color: '#A0A7B8' }}>
                      No recent uploads
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 flex items-center justify-between border-t" style={{ borderColor: 'rgba(123, 97, 255, 0.1)' }}>
            <div className="text-sm" style={{ color: '#A0A7B8' }}>
              Showing {pagedReleases.length} of {filteredReleases.length} releases
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded bg-slate-700 disabled:opacity-40"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-sm" style={{ color: '#A0A7B8' }}>
                {currentPage}/{pageCount}
              </span>
              <button
                className="px-3 py-1 rounded bg-slate-700 disabled:opacity-40"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, pageCount))}
                disabled={currentPage === pageCount}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Flagged Content */}
        <div className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(123, 97, 255, 0.1)',
          }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.1)' }}>
            <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
              Flagged Content
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'rgba(123, 97, 255, 0.03)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: '#A0A7B8' }}
                  >
                    Track
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: '#A0A7B8' }}
                  >
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid rgba(123, 97, 255, 0.1)' }}>
                {flaggedContent.length > 0 ? (
                  flaggedContent.slice(0, 10).map((release) => (
                    <tr key={release.id}
                      className="transition"
                      style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.05)' }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded flex-shrink-0"
                            style={{ backgroundColor: 'rgba(123, 97, 255, 0.1)' }}
                          >
                            {release.artworkUrl && (
                              <img
                                src={release.artworkUrl}
                                alt={release.title}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]"
                              style={{ color: '#FFFFFF' }}
                            >
                              {release.title}
                            </p>
                            <p className="text-xs" style={{ color: '#A0A7B8' }}>
                              {release.primaryArtist}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs" style={{ color: '#FF5252' }}>
                          {release.status === 'rejected' ? 'Quality issues' : 'Processing failed'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2" style={{ color: '#00FFA3' }} />
                      <p style={{ color: '#A0A7B8' }}>No flagged content</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: '#121826',
          borderColor: 'rgba(123, 97, 255, 0.1)',
        }}
      >
        <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.1)' }}>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
              Revenue Payout Requests
            </h3>
            <p className="text-sm" style={{ color: '#A0A7B8' }}>
              Pending requests from artist and label accounts waiting for finance review.
            </p>
          </div>
          <div className="text-sm font-medium" style={{ color: pendingPayoutRequests.length > 0 ? '#FF9800' : '#00FFA3' }}>
            {pendingPayoutRequests.length} pending
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgba(123, 97, 255, 0.03)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#A0A7B8' }}>Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#A0A7B8' }}>Account Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#A0A7B8' }}>Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#A0A7B8' }}>Requested</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#A0A7B8' }}>Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#A0A7B8' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid rgba(123, 97, 255, 0.1)' }}>
              {payoutRequests.length > 0 ? (
                payoutRequests.slice(0, 8).map((request) => (
                  <tr key={request.reference} style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.05)' }}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{request.requesterName || request.email}</p>
                        <p className="text-xs" style={{ color: '#A0A7B8' }}>{request.requesterRole || 'artist'} · {request.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{request.payoutAccount?.bankName || 'Bank not provided'}</p>
                        <p className="text-xs" style={{ color: '#A0A7B8' }}>{request.payoutAccount?.accountName || 'No account name'} · {request.payoutAccount?.accountNumber || 'No account number'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: '#FFFFFF' }}>
                      ₦{request.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: '#A0A7B8' }}>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor:
                            request.status === 'pending'
                              ? 'rgba(255, 152, 0, 0.15)'
                              : request.status === 'completed'
                                ? 'rgba(0, 255, 163, 0.12)'
                                : 'rgba(255, 82, 82, 0.12)',
                          color:
                            request.status === 'pending'
                              ? '#FF9800'
                              : request.status === 'completed'
                                ? '#00FFA3'
                                : '#FF5252',
                        }}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canManagePayouts && request.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            className="px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                            style={{ backgroundColor: 'rgba(0, 255, 163, 0.12)', color: '#00FFA3' }}
                            onClick={() => handleUpdatePayout(request.reference, 'completed')}
                            disabled={isUpdatingPayoutReference === request.reference}
                          >
                            Mark Paid
                          </button>
                          <button
                            className="px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                            style={{ backgroundColor: 'rgba(255, 82, 82, 0.12)', color: '#FF5252' }}
                            onClick={() => handleUpdatePayout(request.reference, 'failed')}
                            disabled={isUpdatingPayoutReference === request.reference}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#A0A7B8' }}>
                          {request.status === 'pending' ? 'Finance approval required' : 'Updated'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center" style={{ color: '#A0A7B8' }}>
                    No payout requests yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
