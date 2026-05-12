import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';
import { parseRoyaltyUploadFile } from '../../utils/royalty-import';

// ── Currency helpers ────────────────────────────────────────────────────────

function fmt(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function shortFmt(amount: number) {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
  return fmt(amount);
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  pending:   'bg-amber-400/15 text-amber-300 border border-amber-400/30',
  completed: 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30',
  failed:    'bg-rose-400/15 text-rose-300 border border-rose-400/30',
  processed: 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30',
  error:     'bg-rose-400/15 text-rose-300 border border-rose-400/30',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_CLS[status] ?? 'bg-gray-500/15 text-gray-300 border border-gray-500/30'}`}>
      {status}
    </span>
  );
}

// ── CSV export helpers ───────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

// ── DSP chart palette ────────────────────────────────────────────────────────

const DSP_COLORS: Record<string, string> = {
  Spotify:       '#1DB954',
  'Apple Music': '#FC3C44',
  YouTube:       '#FF0000',
  Tidal:         '#00E5FF',
  Deezer:        '#A238FF',
  Amazon:        '#FF9900',
  Other:         '#7B61FF',
};

// Tailwind-safe bg classes for DSP dots (JIT scans these literal strings)
const DSP_DOT_CLS: Record<string, string> = {
  Spotify:         'bg-[#1DB954]',
  'Apple Music':   'bg-[#FC3C44]',
  'YouTube Music': 'bg-[#FF0000]',
  YouTube:         'bg-[#FF0000]',
  Tidal:           'bg-[#00E5FF]',
  Deezer:          'bg-[#A238FF]',
  Amazon:          'bg-[#FF9900]',
  'Amazon Music':  'bg-[#FF9900]',
  Other:           'bg-[#7B61FF]',
};

function dspDotCls(dsp: string) {
  return DSP_DOT_CLS[dsp] ?? 'bg-[#7B61FF]';
}

// Bar width classes for DSP share percentages (values: 35,22,18,8,7,5)
const PCT_WIDTH: Record<number, string> = {
  35: 'w-[35%]', 22: 'w-[22%]', 18: 'w-[18%]', 8: 'w-[8%]', 7: 'w-[7%]', 5: 'w-[5%]',
};

const DSPS = Object.keys(DSP_COLORS);

// Derive pseudo DSP revenue from payout requests (evenly distributed as demo)
function buildDSPChart(payouts: adminApi.PayoutRequest[]) {
  const months: Record<string, Record<string, number>> = {};
  payouts.forEach(p => {
    const m = new Date(p.createdAt).toISOString().slice(0, 7);
    if (!months[m]) months[m] = {};
    // distribute across DSPs for demo
    DSPS.forEach((dsp, i) => {
      months[m][dsp] = (months[m][dsp] ?? 0) + p.amount * [0.35, 0.22, 0.18, 0.08, 0.07, 0.05, 0.05][i];
    });
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, vals]) => ({ month: month.slice(5) + '/' + month.slice(2, 4), ...vals }));
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'queue' | 'history' | 'issues' | 'reconciliation' | 'dsp-logs' | 'royalty-upload';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',       label: 'Revenue Overview',  icon: TrendingUp       },
  { id: 'queue',          label: 'Payout Queue',       icon: Clock            },
  { id: 'history',        label: 'Payout History',     icon: CreditCard       },
  { id: 'issues',         label: 'Payment Issues',     icon: AlertTriangle    },
  { id: 'reconciliation', label: 'Reconciliation',     icon: BarChart2        },
  { id: 'dsp-logs',       label: 'DSP Ingestion',      icon: Upload           },
  { id: 'royalty-upload', label: 'Royalty Upload',     icon: FileSpreadsheet  },
];

const PAGE_SIZE = 20;

// ── Main component ────────────────────────────────────────────────────────────

export function RevenuePaymentPanel() {
  const { hasPermission } = useAdmin();
  const canView       = hasPermission('payments.view');
  const canApprove    = hasPermission('payments.approve');
  const canViewRoyal  = hasPermission('royalties.view');

  const [tab, setTab] = useState<Tab>('overview');
  const [payouts,        setPayouts]        = useState<adminApi.PayoutRequest[]>([]);
  const [payments,       setPayments]       = useState<adminApi.AdminPaymentRecord[]>([]);
  const [royaltyReports, setRoyaltyReports] = useState<adminApi.AdminRoyaltyUploadReport[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [busy,           setBusy]           = useState<string | null>(null);

  // Royalty upload form state
  const [uploadFile,     setUploadFile]     = useState<File | null>(null);
  const [uploadPlatform, setUploadPlatform] = useState('All DSPs');
  const [uploadMonth,    setUploadMonth]    = useState('');
  const [uploadYear,     setUploadYear]     = useState('');
  const [isUploading,    setIsUploading]    = useState(false);
  const [uploadSuccess,  setUploadSuccess]  = useState(false);
  const [uploadErr,      setUploadErr]      = useState<string | null>(null);

  // Filters
  const [search,   setSearch]   = useState('');
  const [platform, setPlatform] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [page,     setPage]     = useState(1);

  // DSP ingestion logs derived from real royalty upload reports (live data)
  const dspLogs = useMemo(() => {
    // Group by platform, keep the latest upload per platform
    const byPlatform = new Map<string, adminApi.AdminRoyaltyUploadReport>();
    for (const r of royaltyReports) {
      const p = (r.platform || 'Unknown').trim();
      const existing = byPlatform.get(p);
      if (!existing || new Date(r.uploadedAt) > new Date(existing.uploadedAt)) {
        byPlatform.set(p, r);
      }
    }
    return Array.from(byPlatform.values()).map(r => ({
      id: r.id,
      dsp: r.platform || 'Unknown',
      syncedAt: r.uploadedAt,
      status: r.status,
      records: r.recordsProcessed ?? 0,
      errors: r.unmatchedRecords ?? 0,
      period: r.reportPeriodLabel || `${r.reportMonth ?? ''} ${r.reportYear ?? ''}`.trim(),
    }));
  }, [royaltyReports]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, pay, rr] = await Promise.all([
        canView || canViewRoyal ? adminApi.getPayoutRequests().catch(() => []) : Promise.resolve([]),
        canView ? adminApi.getAdminPayments().catch(() => []) : Promise.resolve([]),
        canViewRoyal ? adminApi.getRoyaltyUploadReports().catch(() => []) : Promise.resolve([]),
      ]);
      setPayouts(p);
      setPayments(pay);
      setRoyaltyReports(rr);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [canView, canViewRoyal]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab, search, platform, dateFrom, dateTo]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const pending   = useMemo(() => payouts.filter(p => p.status === 'pending'),   [payouts]);
  const completed = useMemo(() => payouts.filter(p => p.status === 'completed'), [payouts]);
  const failed    = useMemo(() => payouts.filter(p => p.status === 'failed'),    [payouts]);

  const totalPlatformRevenue = useMemo(() => payments
    .filter(p => p.status === 'completed')
    .reduce((s, p) => s + p.amount, 0), [payments]);

  const mtdRevenue = useMemo(() => {
    const now = new Date();
    return payments
      .filter(p => p.status === 'completed' && new Date(p.createdAt).getMonth() === now.getMonth() && new Date(p.createdAt).getFullYear() === now.getFullYear())
      .reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const ytdRevenue = useMemo(() => {
    const now = new Date();
    return payments
      .filter(p => p.status === 'completed' && new Date(p.createdAt).getFullYear() === now.getFullYear())
      .reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const avgPerRecord = payments.length > 0 ? totalPlatformRevenue / Math.max(1, payments.filter(p => p.status === 'completed').length) : 0;

  const dspChart = useMemo(() => buildDSPChart(payouts), [payouts]);

  // Revenue breakdown table (from payments)
  const revBreakdown = useMemo(() => {
    let rows = payments.filter(p => p.purpose === 'payout' || p.type === 'payout');
    if (search) rows = rows.filter(r => [r.email, r.reference, r.description, r.releaseTitle ?? '', r.releaseArtistName ?? ''].join(' ').toLowerCase().includes(search.toLowerCase()));
    if (dateFrom) rows = rows.filter(r => new Date(r.createdAt) >= new Date(dateFrom));
    if (dateTo) { const e = new Date(dateTo); e.setHours(23,59,59,999); rows = rows.filter(r => new Date(r.createdAt) <= e); }
    return rows;
  }, [payments, search, dateFrom, dateTo]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handlePayout(reference: string, status: 'completed' | 'failed') {
    if (!canApprove) return;
    setBusy(reference);
    try {
      const updated = await adminApi.updatePayoutRequest(reference, status);
      setPayouts(prev => prev.map(p => p.reference === reference ? updated : p));
    } catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  }

  async function handleBulkProcess() {
    if (!canApprove || pending.length === 0) return;
    if (!confirm(`Process all ${pending.length} pending payouts as completed?`)) return;
    for (const p of pending) {
      await handlePayout(p.reference, 'completed');
    }
  }

  async function handleRetryFailed() {
    if (!canApprove || failed.length === 0) return;
    if (!confirm(`Retry ${failed.length} failed payouts?`)) return;
    for (const p of failed) {
      await handlePayout(p.reference, 'pending');
    }
  }

  // ── Paginate helper ───────────────────────────────────────────────────────

  function paginate<T>(arr: T[]) {
    const total = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
    const items = arr.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return { total, items };
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function Pagination({ total }: { total: number }) {
    if (total <= 1) return null;
    return (
      <div className="flex items-center justify-between border-t border-[#7B61FF]/10 px-5 py-3 text-sm text-[#A0A7B8]">
        <span>Page {page} of {total}</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 rounded-lg border border-[#7B61FF]/20 px-3 py-1 disabled:opacity-40 hover:text-white transition"><ChevronLeft className="h-4 w-4" />Prev</button>
          <button disabled={page === total} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 rounded-lg border border-[#7B61FF]/20 px-3 py-1 disabled:opacity-40 hover:text-white transition">Next<ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  function TableHead({ cols }: { cols: string[] }) {
    return (
      <thead className="border-b border-[#7B61FF]/10 bg-[#0B0F1A]">
        <tr>{cols.map(c => <th key={c} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">{c}</th>)}</tr>
      </thead>
    );
  }

  // ── Tabs content ──────────────────────────────────────────────────────────

  function OverviewTab() {
    return (
      <div className="space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Platform Revenue',  value: shortFmt(totalPlatformRevenue), sub: 'All time',   color: 'text-white' },
            { label: 'Month-to-Date (MTD)',      value: shortFmt(mtdRevenue),           sub: 'This month', color: 'text-[#00E5FF]' },
            { label: 'Year-to-Date (YTD)',       value: shortFmt(ytdRevenue),           sub: 'This year',  color: 'text-[#7B61FF]' },
            { label: 'Avg per Transaction',      value: shortFmt(avgPerRecord),         sub: 'Completed',  color: 'text-[#1DB954]' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-5">
              <p className="text-xs text-[#A0A7B8]">{s.label}</p>
              <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-[#6B7280]">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* DSP share + bar chart */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* DSP share mini-cards */}
          <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Revenue by Platform</h3>
            <div className="space-y-3">
              {DSPS.map((dsp, i) => {
                const pct = [35, 22, 18, 8, 7, 5, 5][i];
                return (
                  <div key={dsp}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-[#A0A7B8]">{dsp}</span>
                      <span className="font-semibold text-white">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5">
                        <div className={`h-full rounded-full ${dspDotCls(dsp)} ${PCT_WIDTH[pct] ?? 'w-[5%]'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stacked bar chart */}
          <div className="lg:col-span-2 rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Revenue by DSP Over Time</h3>
            {dspChart.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-[#A0A7B8]">No revenue data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dspChart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#A0A7B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#A0A7B8' }} tickFormatter={v => shortFmt(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.3)', borderRadius: '8px', color: '#fff', fontSize: 12 }}
                    formatter={(val: number, name: string) => [fmt(val), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#A0A7B8' }} />
                  {DSPS.map(dsp => (
                    <Bar key={dsp} dataKey={dsp} stackId="a" fill={DSP_COLORS[dsp]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue breakdown table */}
        <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826]">
          <div className="flex items-center justify-between border-b border-[#7B61FF]/10 px-5 py-4">
            <h3 className="text-sm font-semibold text-white">Revenue Breakdown</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A0A7B8]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] py-1.5 pl-8 pr-3 text-xs text-white placeholder-[#A0A7B8] outline-none focus:ring-1 focus:ring-[#7B61FF]" />
              </div>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label="From date" className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#7B61FF]" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label="To date" className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#7B61FF]" />
              <button onClick={() => { const { items } = paginate(revBreakdown); downloadCSV([['Reference','Artist','Description','Amount','Status','Date'], ...items.map(r => [r.reference, r.releaseArtistName ?? r.email, r.description, String(r.amount), r.status, fmtDate(r.createdAt)])], 'revenue-breakdown.csv'); }} className="flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-xs text-[#A0A7B8] hover:text-white transition">
                <Download className="h-3.5 w-3.5" />CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={['Reference', 'Artist / Email', 'Description', 'Method', 'Amount', 'Status', 'Date']} />
              <tbody className="divide-y divide-[#7B61FF]/10">
                {revBreakdown.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-[#A0A7B8]">No revenue records match the current filters</td></tr>
                ) : paginate(revBreakdown).items.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono text-xs text-[#A0A7B8]">{r.reference}</td>
                    <td className="px-4 py-3"><div className="text-white">{r.releaseArtistName ?? r.requesterName ?? '—'}</div><div className="text-xs text-[#6B7280]">{r.email}</div></td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-[#A0A7B8]">{r.description}</td>
                    <td className="px-4 py-3 text-[#A0A7B8]">{r.method}</td>
                    <td className="px-4 py-3 font-semibold text-white">{fmt(r.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={paginate(revBreakdown).total} />
        </div>
      </div>
    );
  }

  function PayoutQueueTab() {
    const { total, items } = paginate(pending);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">{pending.length} Pending Payouts</h3>
            <p className="text-xs text-[#A0A7B8]">Total: {fmt(pending.reduce((s, p) => s + p.amount, 0))}</p>
          </div>
          <div className="flex gap-2">
            {canApprove && (
              <>
                <button onClick={handleBulkProcess} disabled={pending.length === 0} className="flex items-center gap-1.5 rounded-lg bg-[#1DB954] px-3 py-2 text-xs font-semibold text-white hover:bg-[#18a449] disabled:opacity-40 transition">
                  <CheckCircle2 className="h-3.5 w-3.5" />Process All
                </button>
                <button onClick={handleRetryFailed} disabled={failed.length === 0} className="flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-3 py-2 text-xs font-semibold text-[#C4B5FD] hover:bg-[#7B61FF]/20 disabled:opacity-40 transition">
                  <RefreshCw className="h-3.5 w-3.5" />Retry Failed ({failed.length})
                </button>
              </>
            )}
            <button onClick={() => downloadCSV([['Artist','Email','Amount','Currency','Method','Bank','Account','Requested','Status'], ...pending.map(p => [p.requesterName ?? '', p.email, String(p.amount), p.currency, p.method, p.payoutAccount?.bankName ?? '', p.payoutAccount?.accountNumber ?? '', fmtDate(p.createdAt), p.status])], 'payout-queue.csv')} className="flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/20 px-3 py-2 text-xs text-[#A0A7B8] hover:text-white transition">
              <Download className="h-3.5 w-3.5" />Download List
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#7B61FF]/15 bg-[#121826]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={['Artist', 'Amount', 'Currency', 'Payout Method', 'Bank Details', 'Date Requested', 'Status', 'Actions']} />
              <tbody className="divide-y divide-[#7B61FF]/10">
                {items.length === 0 ? (
                  <tr><td colSpan={8} className="py-14 text-center text-sm text-[#A0A7B8]">No pending payouts</td></tr>
                ) : items.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3"><div className="font-medium text-white">{p.requesterName ?? '—'}</div><div className="text-xs text-[#6B7280]">{p.email}</div></td>
                    <td className="px-4 py-3 font-semibold text-white">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-[#A0A7B8]">{p.currency}</td>
                    <td className="px-4 py-3 text-[#A0A7B8]">{p.method}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A7B8]">
                      {p.payoutAccount ? (
                        <><div className="font-medium text-white">{p.payoutAccount.bankName}</div><div>{p.payoutAccount.accountNumber}</div></>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDateTime(p.createdAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      {canApprove && (
                        <div className="flex gap-1.5">
                          <button disabled={!!busy} onClick={() => handlePayout(p.reference, 'completed')} className="rounded bg-[#1DB954]/15 px-2 py-1 text-[11px] font-semibold text-[#1DB954] hover:bg-[#1DB954]/25 disabled:opacity-40 transition">Approve</button>
                          <button disabled={!!busy} onClick={() => handlePayout(p.reference, 'failed')} className="rounded bg-rose-500/15 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-40 transition">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={total} />
        </div>
      </div>
    );
  }

  function HistoryTab() {
    const filtered = useMemo(() => {
      let rows = completed;
      if (search) rows = rows.filter(r => [r.email, r.reference, r.requesterName ?? ''].join(' ').toLowerCase().includes(search.toLowerCase()));
      if (dateFrom) rows = rows.filter(r => new Date(r.createdAt) >= new Date(dateFrom));
      if (dateTo) { const e = new Date(dateTo); e.setHours(23,59,59,999); rows = rows.filter(r => new Date(r.createdAt) <= e); }
      return rows;
    }, [completed, search, dateFrom, dateTo]);
    const { total, items } = paginate(filtered);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A0A7B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artist, email, reference…" className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] py-2 pl-8 pr-3 text-sm text-white placeholder-[#A0A7B8] outline-none focus:ring-1 focus:ring-[#7B61FF]" />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label="From date" className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#7B61FF]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label="To date" className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#7B61FF]" />
          <button onClick={() => downloadCSV([['Artist','Email','Amount','Method','Bank','Account','Processed Date','Reference'], ...filtered.map(p => [p.requesterName ?? '', p.email, String(p.amount), p.method, p.payoutAccount?.bankName ?? '', p.payoutAccount?.accountNumber ?? '', fmtDate(p.paidAt ?? p.updatedAt), p.reference])], 'payout-history.csv')} className="flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/20 px-3 py-2 text-sm text-[#A0A7B8] hover:text-white transition">
            <Download className="h-4 w-4" />Export CSV
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#7B61FF]/15 bg-[#121826]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={['Artist', 'Amount', 'Method', 'Bank / Account', 'Processed Date', 'Reference #', 'Status']} />
              <tbody className="divide-y divide-[#7B61FF]/10">
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-[#A0A7B8]">No completed payouts match filters</td></tr>
                ) : items.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3"><div className="font-medium text-white">{p.requesterName ?? '—'}</div><div className="text-xs text-[#6B7280]">{p.email}</div></td>
                    <td className="px-4 py-3 font-semibold text-[#1DB954]">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-[#A0A7B8]">{p.method}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A7B8]">{p.payoutAccount ? <><div className="font-medium text-white">{p.payoutAccount.bankName}</div><div>{p.payoutAccount.accountNumber}</div></> : '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDateTime(p.paidAt ?? p.updatedAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#A0A7B8]">{p.reference}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={total} />
        </div>
      </div>
    );
  }

  function IssuesTab() {
    const allFailed = useMemo(() => [
      ...failed.map(p => ({ ...p, errorMsg: p.description ?? 'Payout failed', type: 'payout' as const })),
      ...payments.filter(p => p.status === 'failed').map(p => ({ id: p.id, userId: p.userId, email: p.email, reference: p.reference, requesterName: p.requesterName, amount: p.amount, currency: p.currency as 'NGN', method: p.method, payoutAccount: p.payoutAccount, paidAt: p.paidAt, createdAt: p.createdAt, updatedAt: p.updatedAt, description: p.description, status: p.status as 'pending' | 'completed' | 'failed', type: 'payment' as const, requesterRole: p.requesterRole, errorMsg: p.failureReason ?? p.description ?? 'Payment failed' })),
    ], [failed, payments]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <h3 className="text-sm font-semibold text-white">{allFailed.length} Payment Issues</h3>
          </div>
          {canApprove && failed.length > 0 && (
            <button onClick={handleRetryFailed} className="flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-3 py-2 text-xs font-semibold text-[#C4B5FD] hover:bg-[#7B61FF]/20 transition">
              <RefreshCw className="h-3.5 w-3.5" />Retry All Failed Payouts
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-rose-500/20 bg-[#121826]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={['Artist / Email', 'Amount', 'Type', 'Error Details', 'Date', 'Actions']} />
              <tbody className="divide-y divide-[#7B61FF]/10">
                {allFailed.length === 0 ? (
                  <tr><td colSpan={6} className="py-14 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-[#1DB954]" />
                    <p className="text-sm text-[#A0A7B8]">No payment issues — all clear!</p>
                  </td></tr>
                ) : paginate(allFailed).items.map(p => (
                  <tr key={p.id} className="hover:bg-rose-500/5 transition">
                    <td className="px-4 py-3"><div className="font-medium text-white">{p.requesterName ?? '—'}</div><div className="text-xs text-[#6B7280]">{p.email}</div></td>
                    <td className="px-4 py-3 font-semibold text-rose-300">{fmt(p.amount)}</td>
                    <td className="px-4 py-3"><span className="rounded-full border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-2 py-0.5 text-xs text-[#C4B5FD] capitalize">{p.type}</span></td>
                    <td className="max-w-[220px] px-4 py-3 text-xs text-rose-300">{p.errorMsg}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDateTime(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      {canApprove && p.type === 'payout' && (
                        <button disabled={!!busy} onClick={() => handlePayout(p.reference, 'pending')} className="rounded bg-amber-400/15 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-400/25 disabled:opacity-40 transition">Retry</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={paginate(allFailed).total} />
        </div>
      </div>
    );
  }

  function ReconciliationTab() {
    const rows = useMemo(() => {
      const map: Record<string, { email: string; name: string; expected: number; actual: number }> = {};
      payouts.forEach(p => {
        if (!map[p.userId]) map[p.userId] = { email: p.email, name: p.requesterName ?? p.email, expected: 0, actual: 0 };
        map[p.userId].expected += p.amount;
        if (p.status === 'completed') map[p.userId].actual += p.amount;
      });
      return Object.entries(map).map(([id, v]) => ({ id, ...v, variance: v.actual - v.expected }));
    }, [payouts]);

    const totExpected = rows.reduce((s, r) => s + r.expected, 0);
    const totActual   = rows.reduce((s, r) => s + r.actual, 0);
    const totVariance = totActual - totExpected;

    return (
      <div className="space-y-5">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Expected (all payout requests)', value: fmt(totExpected), color: 'text-[#00E5FF]' },
            { label: 'Actual (completed payouts)',      value: fmt(totActual),   color: 'text-[#1DB954]' },
            { label: 'Variance',                        value: fmt(totVariance), color: totVariance >= 0 ? 'text-[#1DB954]' : 'text-rose-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-5">
              <p className="text-xs text-[#A0A7B8]">{s.label}</p>
              <p className={`mt-2 text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#7B61FF]/15 bg-[#121826]">
          <div className="flex items-center justify-between border-b border-[#7B61FF]/10 px-5 py-4">
            <h3 className="text-sm font-semibold text-white">Per-Artist Reconciliation</h3>
            <button onClick={() => downloadCSV([['Artist','Email','Expected','Actual','Variance'], ...rows.map(r => [r.name, r.email, String(r.expected), String(r.actual), String(r.variance)])], 'reconciliation.csv')} className="flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-xs text-[#A0A7B8] hover:text-white transition"><Download className="h-3.5 w-3.5" />CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={['Artist', 'Email', 'Expected', 'Actual Paid', 'Variance', 'Match']} />
              <tbody className="divide-y divide-[#7B61FF]/10">
                {rows.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-[#A0A7B8]">No reconciliation data yet</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A7B8]">{r.email}</td>
                    <td className="px-4 py-3 font-semibold text-[#00E5FF]">{fmt(r.expected)}</td>
                    <td className="px-4 py-3 font-semibold text-[#1DB954]">{fmt(r.actual)}</td>
                    <td className={`px-4 py-3 font-semibold ${r.variance < 0 ? 'text-rose-400' : 'text-[#1DB954]'}`}>{fmt(r.variance)}</td>
                    <td className="px-4 py-3">
                      {r.variance === 0
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-[#1DB954]/15 px-2 py-0.5 text-xs font-semibold text-[#1DB954]"><CheckCircle2 className="h-3 w-3" />Matched</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300"><AlertCircle className="h-3 w-3" />Gap</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const PLATFORMS = ['Spotify', 'Apple Music', 'YouTube Music', 'Tidal', 'Deezer', 'Amazon Music', 'Other'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const YEARS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

  async function handleRoyaltyUpload() {
    if (!uploadFile || !uploadMonth || !uploadYear) {
      setUploadErr('Please select a file, month and year before uploading.');
      return;
    }
    setIsUploading(true);
    setUploadErr(null);
    setUploadSuccess(false);
    try {
      const rows = await parseRoyaltyUploadFile(uploadFile);
      if (rows.length === 0) {
        setUploadErr('No valid rows found in the file. Ensure headers include: isrc, track_title, artist_name, streams, revenue.');
        return;
      }
      const report = await adminApi.uploadRoyaltyReport({
        fileName: uploadFile.name,
        platform: uploadPlatform,
        reportMonth: uploadMonth,
        reportYear: uploadYear,
        rows,
        fileSizeBytes: uploadFile.size,
      });
      setRoyaltyReports(prev => [report, ...prev]);
      setUploadFile(null);
      setUploadMonth('');
      setUploadYear('');
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (e: any) {
      setUploadErr(e.message ?? 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  function RoyaltyUploadTab() {
    const canUpload = hasPermission('reports.upload');
    const rrErrors  = royaltyReports.filter(r => r.status === 'error').length;
    const rrOk      = royaltyReports.filter(r => r.status === 'processed').length;
    const totalStreams = royaltyReports.reduce((s, r) => s + (r.totalStreams ?? 0), 0);
    const totalRevenue = royaltyReports.reduce((s, r) => s + (r.totalRevenue ?? 0), 0);

    return (
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Reports',    value: royaltyReports.length,             color: 'text-white'       },
            { label: 'Processed',        value: rrOk,                              color: 'text-[#1DB954]'   },
            { label: 'Errors',           value: rrErrors,                          color: 'text-rose-400'    },
            { label: 'Total Revenue',    value: fmt(totalRevenue),                 color: 'text-[#00E5FF]'   },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-4">
              <p className="text-xs text-[#A0A7B8]">{s.label}</p>
              <p className={`mt-1.5 text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Upload form */}
        {canUpload && (
          <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B61FF]/15">
                <FileSpreadsheet className="h-5 w-5 text-[#7B61FF]" />
              </div>
              <h2 className="text-base font-semibold text-white">Upload New Royalty Report</h2>
            </div>

            {uploadSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#1DB954]/30 bg-[#1DB954]/10 px-4 py-3 text-sm text-[#1DB954]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                File uploaded and processed successfully!
              </div>
            )}
            {uploadErr && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {uploadErr}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              {/* Drop zone */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A0A7B8]">CSV / Excel File</label>
                <label
                  htmlFor="royalty-file-input"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#7B61FF]/25 py-10 transition hover:border-[#7B61FF]/60 hover:bg-[#7B61FF]/5"
                >
                  <FileSpreadsheet className="mb-2 h-10 w-10 text-[#A0A7B8]" />
                  <p className="text-sm text-[#A0A7B8]">Click to browse or drag &amp; drop</p>
                  <p className="mt-1 text-xs text-[#6B7280]">.csv or .xlsx — required columns: isrc, track_title, artist_name, streams, revenue</p>
                </label>
                <input
                  id="royalty-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setUploadFile(f);
                    e.target.value = '';
                  }}
                />
                {uploadFile && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-[#7B61FF]" />
                    <span className="flex-1 truncate text-white">{uploadFile.name}</span>
                    <span className="text-xs text-[#A0A7B8]">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button onClick={() => setUploadFile(null)} title="Remove file" className="text-[#A0A7B8] hover:text-rose-400 transition"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                {/* Platform */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#A0A7B8]">Platform / DSP</label>
                  <select
                    value={uploadPlatform}
                    onChange={e => setUploadPlatform(e.target.value)}
                    className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#7B61FF]"
                    title="Platform"
                  >
                    <option value="All DSPs">All DSPs</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Report period */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#A0A7B8]">
                    <Calendar className="mb-0.5 mr-1 inline h-3.5 w-3.5" />Report Period
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={uploadMonth}
                      onChange={e => setUploadMonth(e.target.value)}
                      className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#7B61FF]"
                      title="Month"
                    >
                      <option value="">Month</option>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={uploadYear}
                      onChange={e => setUploadYear(e.target.value)}
                      className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#7B61FF]"
                      title="Year"
                    >
                      <option value="">Year</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleRoyaltyUpload}
                  disabled={!uploadFile || !uploadMonth || !uploadYear || isUploading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7B61FF] py-2.5 text-sm font-semibold text-white transition hover:bg-[#6B51EF] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isUploading ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Processing…</>
                  ) : (
                    <><Upload className="h-4 w-4" />Upload &amp; Process</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload history table */}
        <div className="overflow-hidden rounded-xl border border-[#7B61FF]/15 bg-[#121826]">
          <div className="flex items-center justify-between border-b border-[#7B61FF]/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[#7B61FF]" />
              <h3 className="text-sm font-semibold text-white">Upload History</h3>
              <span className="rounded-full border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-2 py-0.5 text-xs text-[#C4B5FD]">{royaltyReports.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A0A7B8]">Total streams: {totalStreams.toLocaleString()}</span>
              <button
                onClick={() => downloadCSV(
                  [['File', 'Platform', 'Period', 'Status', 'Records', 'Matched', 'Unmatched', 'Total Streams', 'Total Revenue', 'Uploaded At'],
                   ...royaltyReports.map(r => [r.fileName, r.platform, r.reportPeriodLabel, r.status, String(r.recordsProcessed), String(r.matchedRecords), String(r.unmatchedRecords), String(r.totalStreams), String(r.totalRevenue), fmtDateTime(r.uploadedAt)])],
                  'royalty-upload-reports.csv'
                )}
                className="flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-xs text-[#A0A7B8] transition hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={['File Name', 'Platform', 'Period', 'Status', 'Records', 'Matched', 'Unmatched', 'Streams', 'Revenue', 'Uploaded']} />
              <tbody className="divide-y divide-[#7B61FF]/10">
                {royaltyReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-[#A0A7B8]" />
                      <p className="text-sm text-[#A0A7B8]">No royalty reports uploaded yet</p>
                    </td>
                  </tr>
                ) : royaltyReports.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition">
                    <td className="max-w-[180px] truncate px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-[#A0A7B8]" />
                        <span className="truncate text-white" title={r.fileName}>{r.fileName}</span>
                      </div>
                      {r.errorMessage && <p className="mt-0.5 text-xs text-rose-400">{r.errorMessage}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${dspDotCls(r.platform)}`} />
                        <span className="text-[#A0A7B8]">{r.platform}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#A0A7B8]">{r.reportPeriodLabel}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 font-semibold text-white">{(r.recordsProcessed ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#1DB954]">{(r.matchedRecords ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-amber-300">{(r.unmatchedRecords ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#00E5FF]">{(r.totalStreams ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-white">{fmt(r.totalRevenue ?? 0)}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDateTime(r.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function DSPLogsTab() {
    if (dspLogs.length === 0) {
      return (
        <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-12 text-center">
          <p className="text-sm text-[#A0A7B8]">No DSP ingestion data yet.</p>
          <p className="text-xs text-[#A0A7B8] mt-1">Upload royalty reports via <strong className="text-[#7B61FF]">Royalty Upload</strong> to see per-platform sync history here.</p>
        </div>
      );
    }
    return (
      <div className="space-y-5">
        {/* Status summary */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'DSPs Connected', value: dspLogs.length,                                    color: 'text-white' },
            { label: 'Successful Syncs', value: dspLogs.filter(d => d.status === 'processed').length, color: 'text-[#1DB954]' },
            { label: 'Errors',          value: dspLogs.filter(d => d.status === 'error').length,      color: 'text-rose-400' },
            { label: 'Total Records',   value: dspLogs.reduce((s, d) => s + d.records, 0).toLocaleString(), color: 'text-[#00E5FF]' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-4">
              <p className="text-xs text-[#A0A7B8]">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* DSP cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dspLogs.map(d => (
            <div key={d.id} className={`rounded-xl border p-5 ${d.status === 'error' ? 'border-rose-500/30 bg-rose-500/5' : 'border-[#7B61FF]/15 bg-[#121826]'}`}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${dspDotCls(d.dsp)}`} />
                  <span className="font-semibold text-white">{d.dsp}</span>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between"><dt className="text-[#A0A7B8]">Period</dt><dd className="text-white">{d.period}</dd></div>
                <div className="flex justify-between"><dt className="text-[#A0A7B8]">Records</dt><dd className="text-white">{d.records.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt className="text-[#A0A7B8]">Errors</dt><dd className={d.errors > 0 ? 'text-rose-400 font-semibold' : 'text-[#1DB954]'}>{d.errors}</dd></div>
                <div className="flex justify-between"><dt className="text-[#A0A7B8]">Last Sync</dt><dd className="text-white">{fmtDateTime(d.syncedAt)}</dd></div>
              </dl>
              {d.status === 'error' && d.errors > 0 && (
                <div className="mt-3 rounded-lg bg-rose-500/10 p-2 text-xs text-rose-300">
                  {d.errors} record{d.errors > 1 ? 's' : ''} failed to ingest — check source file format
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Log table */}
        <div className="overflow-hidden rounded-xl border border-[#7B61FF]/15 bg-[#121826]">
          <div className="flex items-center justify-between border-b border-[#7B61FF]/10 px-5 py-4">
            <h3 className="text-sm font-semibold text-white">Sync History</h3>
            <button onClick={() => downloadCSV([['DSP','Period','Status','Records','Errors','Last Sync'], ...dspLogs.map(d => [d.dsp, d.period, d.status, String(d.records), String(d.errors), fmtDateTime(d.syncedAt)])], 'dsp-sync-logs.csv')} className="flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-xs text-[#A0A7B8] hover:text-white transition"><Download className="h-3.5 w-3.5" />CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={['DSP', 'Period', 'Status', 'Records Ingested', 'Errors', 'Last Sync']} />
              <tbody className="divide-y divide-[#7B61FF]/10">
                {dspLogs.map(d => (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${dspDotCls(d.dsp)}`} />
                        <span className="font-medium text-white">{d.dsp}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#A0A7B8]">{d.period}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 font-semibold text-white">{d.records.toLocaleString()}</td>
                    <td className={`px-4 py-3 font-semibold ${d.errors > 0 ? 'text-rose-400' : 'text-[#1DB954]'}`}>{d.errors}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDateTime(d.syncedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B0F1A] border-t-[#7B61FF]" />
          <p className="text-sm text-[#A0A7B8]">Loading financial data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue &amp; Payment Management</h1>
          <p className="mt-0.5 text-sm text-[#A0A7B8]">Platform revenue overview, payout processing, reconciliation and DSP ingestion logs</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 self-start rounded-lg border border-[#7B61FF]/20 bg-[#121826] px-4 py-2 text-sm text-[#A0A7B8] hover:text-white transition">
          <RefreshCw className="h-4 w-4" />Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total Revenue',   value: shortFmt(totalPlatformRevenue), color: 'text-white',       icon: TrendingUp   },
          { label: 'Pending Payouts', value: pending.length,                  color: 'text-amber-300',  icon: Clock        },
          { label: 'Pending Value',   value: shortFmt(pending.reduce((s,p) => s + p.amount, 0)), color: 'text-amber-300', icon: ArrowDownToLine },
          { label: 'Completed',       value: completed.length,               color: 'text-[#1DB954]',   icon: CheckCircle2 },
          { label: 'Failed',          value: failed.length,                  color: 'text-rose-400',    icon: AlertTriangle},
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#A0A7B8]">{s.label}</p>
                <Icon className="h-3.5 w-3.5 text-[#A0A7B8]" />
              </div>
              <p className={`mt-1.5 text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tab nav */}
      <div className="flex overflow-x-auto rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1); setSearch(''); }}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${active ? 'bg-[#7B61FF] text-white shadow' : 'text-[#A0A7B8] hover:text-white'}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t.label}
              {t.id === 'queue'         && pending.length > 0                                        && <span className="ml-0.5 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-black">{pending.length}</span>}
              {t.id === 'issues'        && failed.length  > 0                                        && <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{failed.length}</span>}
              {t.id === 'royalty-upload' && royaltyReports.filter(r => r.status === 'error').length > 0 && <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{royaltyReports.filter(r => r.status === 'error').length}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      {tab === 'overview'       && <OverviewTab />}
      {tab === 'queue'          && <PayoutQueueTab />}
      {tab === 'history'        && <HistoryTab />}
      {tab === 'issues'         && <IssuesTab />}
      {tab === 'reconciliation' && <ReconciliationTab />}
      {tab === 'dsp-logs'        && <DSPLogsTab />}
      {tab === 'royalty-upload'  && <RoyaltyUploadTab />}
    </div>
  );
}
