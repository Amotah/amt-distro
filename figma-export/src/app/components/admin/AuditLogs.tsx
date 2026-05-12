import { useEffect, useMemo, useRef, useState } from 'react';
import * as adminApi from '../../utils/admin-api';
import {
  Activity,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Search,
  Shield,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PAGE_SIZE = 15;
const POLL_INTERVAL = 8000;

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}\u2026${id.slice(-4)}` : id;
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function actionBadge(action: string) {
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('add') || a.includes('approve'))
    return { bg: 'bg-[#1DB954]/15 text-[#7DFFAE] border-[#1DB954]/30', dot: 'bg-[#1DB954]' };
  if (a.includes('delete') || a.includes('reject') || a.includes('remove'))
    return { bg: 'bg-red-500/15 text-red-300 border-red-500/30', dot: 'bg-red-400' };
  if (a.includes('update') || a.includes('edit') || a.includes('change'))
    return { bg: 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/30', dot: 'bg-[#00E5FF]' };
  if (a.includes('login') || a.includes('logout') || a.includes('auth'))
    return { bg: 'bg-[#FFD600]/15 text-[#FFE88A] border-[#FFD600]/30', dot: 'bg-[#FFD600]' };
  return { bg: 'bg-[#7B61FF]/15 text-[#C4B5FD] border-[#7B61FF]/30', dot: 'bg-[#7B61FF]' };
}

function resourceIcon(resource: string) {
  const r = resource.toLowerCase();
  if (r.includes('user')) return User;
  if (r.includes('release') || r.includes('track')) return FileText;
  if (r.includes('admin')) return Shield;
  return Activity;
}

function buildSummary(log: adminApi.AuditLog): string {
  const action = log.action.replace(/_/g, ' ');
  const resource = log.resource.replace(/_/g, ' ');
  return `${action} on ${resource}`;
}

function exportCsv(logs: adminApi.AuditLog[]) {
  const headers = ['Timestamp','User ID','Action','Resource','Resource ID','IP Address','User Agent'];
  const rows = logs.map((l) => [
    new Date(l.timestamp).toISOString(),
    l.adminUserId,
    l.action,
    l.resource,
    l.resourceId,
    l.ipAddress || '',
    (l.userAgent || '').replace(/,/g, ';'),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditLogs() {
  const [logs, setLogs] = useState<adminApi.AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLivePulsing, setIsLivePulsing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [userEmailSearch, setUserEmailSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<adminApi.AuditLog | null>(null);

  const prevCountRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval>;

    async function fetchLogs() {
      try {
        const data = await adminApi.getAuditLogs({});
        if (!mounted) return;
        if (data.length !== prevCountRef.current) {
          setIsLivePulsing(true);
          setTimeout(() => setIsLivePulsing(false), 1200);
          prevCountRef.current = data.length;
        }
        setLogs(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setLastUpdated(new Date());
        setError('');
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load audit logs.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchLogs();
    timer = setInterval(fetchLogs, POLL_INTERVAL);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const uniqueActions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const uniqueResources = useMemo(() => Array.from(new Set(logs.map((l) => l.resource))).sort(), [logs]);
  const uniqueUsers = useMemo(() => Array.from(new Set(logs.map((l) => l.adminUserId))).sort(), [logs]);

  const filtered = useMemo(() => {
    let result = logs;
    const q = search.toLowerCase();
    if (q) {
      result = result.filter((l) =>
        l.action.toLowerCase().includes(q) ||
        l.resource.toLowerCase().includes(q) ||
        l.adminUserId.toLowerCase().includes(q) ||
        l.resourceId.toLowerCase().includes(q) ||
        (l.ipAddress || '').toLowerCase().includes(q)
      );
    }
    if (actionFilter !== 'all') result = result.filter((l) => l.action === actionFilter);
    if (resourceFilter !== 'all') result = result.filter((l) => l.resource === resourceFilter);
    if (userFilter !== 'all') result = result.filter((l) => l.adminUserId === userFilter);
    if (userEmailSearch.trim()) {
      const eq = userEmailSearch.trim().toLowerCase();
      result = result.filter((l) =>
        (l.adminUserEmail || '').toLowerCase().includes(eq) ||
        l.adminUserId.toLowerCase().includes(eq)
      );
    }
    if (dateFrom) result = result.filter((l) => new Date(l.timestamp) >= new Date(dateFrom));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      result = result.filter((l) => new Date(l.timestamp) <= end);
    }
    return result;
  }, [logs, search, actionFilter, resourceFilter, userFilter, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [search, actionFilter, resourceFilter, userFilter, userEmailSearch, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chartByDate = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((l) => {
      const d = new Date(l.timestamp).toISOString().slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .map(([date, count]) => ({ date: date.slice(5), count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [filtered]);

  const chartByHour = useMemo(() => {
    const map: Record<number, number> = {};
    filtered.forEach((l) => {
      const h = new Date(l.timestamp).getHours();
      map[h] = (map[h] || 0) + 1;
    });
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}h`,
      count: map[i] || 0,
    }));
  }, [filtered]);

  const todayCount = useMemo(() => filtered.filter((l) => new Date(l.timestamp).toDateString() === new Date().toDateString()).length, [filtered]);
  const weekCount = useMemo(() => filtered.filter((l) => (Date.now() - new Date(l.timestamp).getTime()) < 7 * 86_400_000).length, [filtered]);
  const monthCount = useMemo(() => filtered.filter((l) => {
    const d = new Date(l.timestamp); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length, [filtered]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B0F1A] border-t-[#7B61FF]" />
          <p className="text-sm text-[#A0A7B8]">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#1DB954]/30 bg-[#1DB954]/10 px-2.5 py-0.5 text-xs font-semibold text-[#7DFFAE] transition-all ${isLivePulsing ? 'scale-110' : ''}`}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1DB954]" />
              LIVE
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[#A0A7B8]">
            Real-time log of all admin actions — who did what, when.
            {lastUpdated && <span className="ml-2 text-[#7B61FF]">Updated {relativeTime(lastUpdated.toISOString())}</span>}
          </p>
        </div>
        <button
          onClick={() => exportCsv(filtered)}
          className="flex items-center gap-2 rounded-lg border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-4 py-2 text-sm font-medium text-[#C4B5FD] transition hover:bg-[#7B61FF]/20"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Logs', value: filtered.length, color: 'text-white', icon: Activity },
          { label: 'Today', value: todayCount, color: 'text-[#7B61FF]', icon: Zap },
          { label: 'This Week', value: weekCount, color: 'text-[#00E5FF]', icon: Clock },
          { label: 'This Month', value: monthCount, color: 'text-[#1DB954]', icon: Filter },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-[#A0A7B8]">{stat.label}</p>
                <Icon className="h-4 w-4 text-[#A0A7B8]" />
              </div>
              <p className={`mt-2 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Daily Activity (last 30 days)</h3>
            <span className="text-xs text-[#A0A7B8]">{chartByDate.length} days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartByDate} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="auditDaily" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A0A7B8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#A0A7B8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.3)', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="count" stroke="#7B61FF" strokeWidth={2} fill="url(#auditDaily)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Hourly Volume (24-hour window)</h3>
            <span className="text-xs text-[#A0A7B8]">All filtered logs</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartByHour} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="auditHourly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#A0A7B8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#A0A7B8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="count" stroke="#00E5FF" strokeWidth={2} fill="url(#auditHourly)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0A7B8]" />
            <input
              type="text"
              placeholder="Search by user, action, resource, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] py-2 pl-9 pr-4 text-sm text-white placeholder-[#6D7385] outline-none focus:ring-2 focus:ring-[#7B61FF]"
            />
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0A7B8]" />
            <input
              type="text"
              placeholder="Filter by email or username…"
              value={userEmailSearch}
              onChange={(e) => setUserEmailSearch(e.target.value)}
              className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] py-2 pl-9 pr-4 text-sm text-white placeholder-[#6D7385] outline-none focus:ring-2 focus:ring-[#7B61FF]"
            />
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} title="Filter by action" className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#7B61FF]">
            <option value="all">All Actions</option>
            {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)} title="Filter by resource" className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#7B61FF]">
            <option value="all">All Resources</option>
            {uniqueResources.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex gap-1.5">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-2 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#7B61FF]" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-2 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#7B61FF]" />
          </div>
        </div>

        {(search || userEmailSearch || actionFilter !== 'all' || resourceFilter !== 'all' || dateFrom || dateTo) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {search && <span className="inline-flex items-center gap-1 rounded-full border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-2.5 py-0.5 text-xs text-[#C4B5FD]">"{search}" <button aria-label="Clear search" onClick={() => setSearch('')}><X className="h-3 w-3" /></button></span>}
            {userEmailSearch && <span className="inline-flex items-center gap-1 rounded-full border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-2.5 py-0.5 text-xs text-[#C4B5FD]">User: "{userEmailSearch}" <button aria-label="Clear user search" onClick={() => setUserEmailSearch('')}><X className="h-3 w-3" /></button></span>}
            {actionFilter !== 'all' && <span className="inline-flex items-center gap-1 rounded-full border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-2.5 py-0.5 text-xs text-[#C4B5FD]">Action: {actionFilter} <button aria-label="Clear action filter" onClick={() => setActionFilter('all')}><X className="h-3 w-3" /></button></span>}
            {resourceFilter !== 'all' && <span className="inline-flex items-center gap-1 rounded-full border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-2.5 py-0.5 text-xs text-[#C4B5FD]">Resource: {resourceFilter} <button aria-label="Clear resource filter" onClick={() => setResourceFilter('all')}><X className="h-3 w-3" /></button></span>}
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-xl border border-[#7B61FF]/20 bg-[#121826]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[#7B61FF]/10 bg-[#0B0F1A]">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">When</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Who</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Action</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Resource</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Resource ID</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">IP</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7B61FF]/10">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-[#A0A7B8]/30" />
                    <p className="text-sm text-[#A0A7B8]">No logs match your filters</p>
                  </td>
                </tr>
              ) : paged.map((log) => {
                const badge = actionBadge(log.action);
                const ResourceIcon = resourceIcon(log.resource);
                return (
                  <tr key={log.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-white">{relativeTime(log.timestamp)}</div>
                      <div className="text-[11px] text-[#A0A7B8]">{new Date(log.timestamp).toLocaleString()}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7B61FF]/20 text-xs font-semibold text-[#C4B5FD]">
                          {(log.adminUserEmail ?? log.adminUserId).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          {log.adminUserEmail
                            ? <div className="text-xs text-white">{log.adminUserEmail}</div>
                            : <div className="font-mono text-xs text-white">{shortId(log.adminUserId)}</div>
                          }
                          <button
                            onClick={() => setUserEmailSearch(log.adminUserEmail ?? log.adminUserId)}
                            className="text-[10px] text-[#7B61FF] hover:underline"
                          >
                            filter by user
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <ResourceIcon className="h-4 w-4 shrink-0 text-[#A0A7B8]" />
                        <span className="text-sm capitalize text-white">{log.resource.replace(/_/g, ' ')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-[#A0A7B8]">{shortId(log.resourceId)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-[#A0A7B8]">{log.ipAddress || '\u2014'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-3 py-1.5 text-xs font-medium text-[#C4B5FD] transition hover:bg-[#7B61FF]/20"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#7B61FF]/10 bg-[#0B0F1A] px-5 py-3">
          <span className="text-sm text-[#A0A7B8]">
            {filtered.length === 0 ? 'No results' : `${(page - 1) * PAGE_SIZE + 1}\u2013${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-sm text-[#A0A7B8] transition hover:border-[#7B61FF]/40 hover:text-white disabled:opacity-30">Prev</button>
            <span className="text-sm text-[#A0A7B8]">{page} / {pageCount}</span>
            <button onClick={() => setPage((p) => Math.min(p + 1, pageCount))} disabled={page === pageCount} className="rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-sm text-[#A0A7B8] transition hover:border-[#7B61FF]/40 hover:text-white disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#7B61FF]/20 bg-[#121826] shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#7B61FF]/10 bg-[#0B0F1A] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${actionBadge(selectedLog.action).bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${actionBadge(selectedLog.action).dot}`} />
                  {selectedLog.action}
                </span>
                <span className="text-sm text-[#A0A7B8]">Audit Log Detail</span>
              </div>
              <button aria-label="Close detail" onClick={() => setSelectedLog(null)} className="rounded-lg p-1.5 text-[#A0A7B8] transition hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-[#7B61FF]/20 bg-[#0B0F1A] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A7B8]">Summary</p>
                <p className="mt-2 text-base font-semibold capitalize text-white">{buildSummary(selectedLog)}</p>
                <p className="mt-1 text-sm text-[#A0A7B8]">{new Date(selectedLog.timestamp).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: 'Action', value: selectedLog.action, mono: false },
                  { label: 'Resource Type', value: selectedLog.resource, mono: false },
                  { label: 'Resource ID', value: selectedLog.resourceId, mono: true },
                  { label: 'Performed By (User ID)', value: selectedLog.adminUserId, mono: true },
                  ...(selectedLog.ipAddress ? [{ label: 'IP Address', value: selectedLog.ipAddress, mono: true }] : []),
                ] as { label: string; value: string; mono: boolean }[]).map(({ label, value, mono }) => (
                  <div key={label} className="rounded-lg border border-[#7B61FF]/10 bg-[#0B0F1A] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">{label}</p>
                    <p className={`mt-1 break-all text-sm text-white ${mono ? 'font-mono' : ''}`}>{value}</p>
                  </div>
                ))}
              </div>

              {selectedLog.userAgent && (
                <div className="rounded-lg border border-[#7B61FF]/10 bg-[#0B0F1A] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">User Agent</p>
                  <p className="mt-1 break-all text-xs text-[#A0A7B8]">{selectedLog.userAgent}</p>
                </div>
              )}

              {selectedLog.changes && (
                <div className="rounded-lg border border-[#7B61FF]/10 bg-[#0B0F1A] p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Changes / Payload</p>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-[#060A12] p-3 text-xs text-[#C4B5FD]">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setUserFilter(selectedLog.adminUserId); setSelectedLog(null); }}
                  className="flex-1 rounded-lg border border-[#7B61FF]/20 bg-[#7B61FF]/10 py-2 text-sm font-medium text-[#C4B5FD] transition hover:bg-[#7B61FF]/20"
                >
                  Filter by this user
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="flex-1 rounded-lg border border-[#7B61FF]/10 bg-[#0B0F1A] py-2 text-sm font-medium text-[#A0A7B8] transition hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
