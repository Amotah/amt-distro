import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Activity, RefreshCw, Download, Search, Filter, User,
  Music, DollarSign, Unlock, LogIn, Upload, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import * as adminApi from '../../utils/admin-api';

const POLL_INTERVAL = 10_000;
const PAGE_SIZE = 25;

type UserActivityLog = adminApi.UserActivityLog;
type UserActivityAction = adminApi.UserActivityAction;

// ── helpers ────────────────────────────────────────────────────────────────

function fmtDate(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function actionBadge(action: UserActivityAction) {
  const map: Record<UserActivityAction, { label: string; cls: string }> = {
    profile_updated:       { label: 'Profile Updated',       cls: 'bg-blue-500/15 text-blue-300 border border-blue-500/30' },
    release_created:       { label: 'Release Created',       cls: 'bg-[#7B61FF]/15 text-[#C4B5FD] border border-[#7B61FF]/30' },
    release_updated:       { label: 'Release Updated',       cls: 'bg-[#7B61FF]/10 text-[#A78BFA] border border-[#7B61FF]/20' },
    release_submitted:     { label: 'Release Submitted',     cls: 'bg-green-500/15 text-green-300 border border-green-500/30' },
    release_distributed:   { label: 'Distributed',           cls: 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30' },
    track_added:           { label: 'Track Added',           cls: 'bg-purple-500/15 text-purple-300 border border-purple-500/30' },
    payout_requested:      { label: 'Payout Requested',      cls: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' },
    payment_initialized:   { label: 'Payment Init',          cls: 'bg-orange-500/15 text-orange-300 border border-orange-500/30' },
    payment_verified:      { label: 'Payment Verified',      cls: 'bg-green-500/15 text-green-300 border border-green-500/30' },
    subscription_cancelled:{ label: 'Sub Cancelled',         cls: 'bg-red-500/15 text-red-300 border border-red-500/30' },
    password_changed:      { label: 'Password Changed',      cls: 'bg-gray-500/15 text-gray-300 border border-gray-500/30' },
    login:                 { label: 'Login',                 cls: 'bg-teal-500/15 text-teal-300 border border-teal-500/30' },
  };
  const { label, cls } = map[action] ?? { label: action, cls: 'bg-gray-500/15 text-gray-300 border border-gray-500/30' };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function resourceIcon(resource: string) {
  const cls = 'h-3.5 w-3.5';
  if (resource === 'release') return <Music className={cls} />;
  if (resource === 'payout') return <DollarSign className={cls} />;
  if (resource === 'profile') return <User className={cls} />;
  if (resource === 'track') return <Upload className={cls} />;
  if (resource === 'payment') return <DollarSign className={cls} />;
  if (resource === 'subscription') return <Settings className={cls} />;
  if (resource === 'auth') return <LogIn className={cls} />;
  return <Activity className={cls} />;
}

const ACTION_GROUPS: { label: string; actions: UserActivityAction[] }[] = [
  { label: 'Releases', actions: ['release_created', 'release_updated', 'release_submitted', 'release_distributed', 'track_added'] },
  { label: 'Payments', actions: ['payout_requested', 'payment_initialized', 'payment_verified', 'subscription_cancelled'] },
  { label: 'Account', actions: ['profile_updated', 'password_changed', 'login'] },
];

function exportCSV(logs: UserActivityLog[]) {
  const header = ['ID', 'User Email', 'User ID', 'Action', 'Resource', 'Resource ID', 'Details', 'Timestamp'];
  const rows = logs.map(l => [
    l.id, l.userEmail ?? '', l.userId, l.action, l.resource, l.resourceId ?? '',
    l.details ? JSON.stringify(l.details) : '', l.timestamp,
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `user-activity-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ── component ──────────────────────────────────────────────────────────────

export function UserActivityLog() {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserActivityLog | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.getUserActivityLogs();
      setLogs(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isLive) {
      timerRef.current = setInterval(load, POLL_INTERVAL);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLive, load]);

  // Unique resources for filter
  const resources = Array.from(new Set(logs.map(l => l.resource))).sort();

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.userEmail?.toLowerCase().includes(q) ||
      l.userId.toLowerCase().includes(q) ||
      l.resourceId?.toLowerCase().includes(q) ||
      l.action.includes(q);
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    const matchResource = resourceFilter === 'all' || l.resource === resourceFilter;
    return matchSearch && matchAction && matchResource;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const stats = {
    total: logs.length,
    today: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    releases: logs.filter(l => l.resource === 'release').length,
    payouts: logs.filter(l => l.resource === 'payout').length,
    uniqueUsers: new Set(logs.map(l => l.userId)).size,
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Activity Log</h1>
          <p className="mt-0.5 text-sm text-[#A0A7B8]">Real-time activity trail for artists &amp; partners</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live toggle */}
          <button
            onClick={() => setIsLive(v => !v)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              isLive
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-[#7B61FF]/20 bg-[#121826] text-[#A0A7B8] hover:text-white'
            }`}
          >
            {isLive && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span>}
            {isLive ? 'LIVE' : 'Paused'}
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-[#7B61FF]/20 bg-[#121826] px-4 py-2 text-sm text-[#A0A7B8] transition hover:text-white"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-2 rounded-lg bg-[#7B61FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6D51EF]"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Total Events', value: stats.total, color: 'text-white' },
          { label: 'Today', value: stats.today, color: 'text-green-400' },
          { label: 'Release Events', value: stats.releases, color: 'text-[#C4B5FD]' },
          { label: 'Payout Requests', value: stats.payouts, color: 'text-yellow-300' },
          { label: 'Unique Users', value: stats.uniqueUsers, color: 'text-[#00E5FF]' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-4">
            <p className="text-xs text-[#A0A7B8]">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0A7B8]" />
          <input
            type="text"
            placeholder="Search email, user ID, resource ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] py-2 pl-9 pr-4 text-sm text-white placeholder-[#A0A7B8] outline-none focus:ring-2 focus:ring-[#7B61FF]"
          />
        </div>
        <select
          title="Filter by action"
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#7B61FF]"
        >
          <option value="all">All Actions</option>
          {ACTION_GROUPS.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.actions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </optgroup>
          ))}
        </select>
        <select
          title="Filter by resource"
          value={resourceFilter}
          onChange={e => { setResourceFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#7B61FF]"
        >
          <option value="all">All Resources</option>
          {resources.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-[#A0A7B8]">{filtered.length} events</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#7B61FF]/15 bg-[#121826]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-[#7B61FF]" />
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#A0A7B8]">No activity events found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#7B61FF]/15">
                  {['Time', 'User', 'Action', 'Resource', 'Details'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#A0A7B8]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((log, i) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className={`cursor-pointer border-b border-[#7B61FF]/10 transition hover:bg-[#7B61FF]/5 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] text-[#A0A7B8]">{fmtDate(log.timestamp)}</td>
                    <td className="px-5 py-3">
                      <div className="text-white font-medium">{log.userEmail ?? '—'}</div>
                      <div className="text-[10px] text-[#A0A7B8] font-mono">{log.userId.slice(0, 12)}…</div>
                    </td>
                    <td className="px-5 py-3">{actionBadge(log.action)}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 text-[#A0A7B8]">
                        {resourceIcon(log.resource)}
                        <span className="capitalize">{log.resource}</span>
                        {log.resourceId && <span className="font-mono text-[10px] text-[#6B7280]">{log.resourceId.slice(0, 8)}</span>}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-3 font-mono text-[11px] text-[#A0A7B8]">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#A0A7B8]">
          <span>Page {page} of {totalPages} ({filtered.length} total)</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 disabled:opacity-40 hover:text-white transition">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 disabled:opacity-40 hover:text-white transition">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-[#7B61FF]/20 bg-[#121826] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-white">Activity Detail</h3>
            <dl className="space-y-2 text-sm">
              {[
                ['ID', selected.id],
                ['Time', fmtDate(selected.timestamp)],
                ['User Email', selected.userEmail ?? '—'],
                ['User ID', selected.userId],
                ['Action', selected.action],
                ['Resource', selected.resource],
                ['Resource ID', selected.resourceId ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-28 shrink-0 text-[#A0A7B8]">{k}</dt>
                  <dd className="font-mono text-white break-all">{v}</dd>
                </div>
              ))}
              {selected.details && (
                <div>
                  <dt className="mb-1 text-[#A0A7B8]">Details</dt>
                  <dd>
                    <pre className="overflow-auto rounded-lg bg-[#0B0F1A] p-3 text-xs text-[#C4B5FD]">
                      {JSON.stringify(selected.details, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
            <button
              onClick={() => setSelected(null)}
              className="mt-5 w-full rounded-lg bg-[#7B61FF] py-2 text-sm font-semibold text-white hover:bg-[#6D51EF] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
