import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ElementType, SVGProps } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  GitMerge,
  Landmark,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Unlink,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  getAdminBankAccountRequests,
  getAdminPayments,
  getPayoutRequests,
  getRoyaltyUploadReports,
  reconcileAdminPayment,
  updatePayoutRequest,
  type AdminBankAccountRequest,
  type AdminPaymentRecord,
  type AdminRoyaltyUploadReport,
  type PayoutRequest,
} from '../../utils/admin-api';

type TxType = 'credit' | 'debit';
type MatchStatus = 'matched' | 'unmatched' | 'pending' | 'discrepancy';
type DiscrepancyKind =
  | 'timing_difference'
  | 'missing_transaction'
  | 'duplicate'
  | 'variance_amount'
  | 'outstanding_deposit'
  | 'pending_payout';
type Tab = 'overview' | 'import' | 'matching' | 'discrepancies' | 'reports' | 'accounts';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TxType;
  reference: string;
  status: MatchStatus;
  matchedPlatformId?: string;
  confidence?: number;
  discrepancyKind?: DiscrepancyKind;
  amountDifference?: number;
  notes?: string;
}

interface PlatformTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TxType;
  source: string;
  status: string;
  reference: string;
  payoutReference?: string;
  paymentReference?: string;
}

interface LiveAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: AdminBankAccountRequest['status'];
  owner: string;
  updatedAt: string;
}

function formatMoney(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusConfig(status: MatchStatus) {
  switch (status) {
    case 'matched':
      return { label: 'Matched', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
    case 'pending':
      return { label: 'Pending', className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
    case 'discrepancy':
      return { label: 'Discrepancy', className: 'text-orange-400 bg-orange-400/10 border-orange-400/20' };
    default:
      return { label: 'Unmatched', className: 'text-red-400 bg-red-400/10 border-red-400/20' };
  }
}

function getDiscrepancyLabel(kind?: DiscrepancyKind) {
  switch (kind) {
    case 'timing_difference': return 'Timing difference';
    case 'missing_transaction': return 'Missing in platform';
    case 'duplicate': return 'Duplicate';
    case 'variance_amount': return 'Amount variance';
    case 'outstanding_deposit': return 'Outstanding deposit';
    case 'pending_payout': return 'Pending payout';
    default: return 'Needs review';
  }
}

function calcConfidence(bankTx: BankTransaction, platformTx: PlatformTransaction) {
  let score = 0;
  if (bankTx.type === platformTx.type) score += 25;
  if (bankTx.amount === platformTx.amount) {
    score += 45;
  } else if (Math.abs(bankTx.amount - platformTx.amount) <= 500) {
    score += 25;
  }
  const br = bankTx.reference.toLowerCase();
  const pr = platformTx.reference.toLowerCase();
  if (br && pr && (br.includes(pr) || pr.includes(br))) score += 20;
  const daysDiff = Math.abs(new Date(bankTx.date).getTime() - new Date(platformTx.date).getTime()) / 86400000;
  if (daysDiff === 0) score += 10;
  else if (daysDiff <= 3) score += 5;
  return Math.min(score, 100);
}

function mapPayments(payments: AdminPaymentRecord[]): PlatformTransaction[] {
  return payments.map((p) => ({
    id: `payment-${p.id}`,
    date: (p.paidAt ?? p.createdAt).slice(0, 10),
    description: p.description || [p.releaseArtistName, p.releaseTitle].filter(Boolean).join(' - ') || `${p.type} payment`,
    amount: p.amount,
    type: p.type === 'payout' ? 'debit' : 'credit',
    source: p.provider === 'paystack' ? 'Paystack' : 'Internal',
    status: p.status,
    reference: p.reference,
    paymentReference: p.reference,
  }));
}

function mapPayouts(payouts: PayoutRequest[]): PlatformTransaction[] {
  return payouts.map((p) => ({
    id: `payout-${p.id}`,
    date: (p.paidAt ?? p.createdAt).slice(0, 10),
    description: p.description || `Payout to ${p.requesterName ?? p.email}`,
    amount: p.amount,
    type: 'debit',
    source: 'Payout Request',
    status: p.status,
    reference: p.reference,
    payoutReference: p.reference,
  }));
}

function mapRoyalties(royalties: AdminRoyaltyUploadReport[]): PlatformTransaction[] {
  return royalties
    .filter((r) => r.totalRevenue > 0)
    .map((r) => ({
      id: `royalty-${r.id}`,
      date: `${r.reportYear}-${r.reportMonth.padStart(2, '0')}-01`,
      description: `${r.platform} royalties — ${r.reportPeriodLabel}`,
      amount: Math.round(r.totalRevenue),
      type: 'credit',
      source: 'Royalty Upload',
      status: r.status,
      reference: `ROY-${r.id.slice(0, 8).toUpperCase()}`,
    }));
}

function parseCsv(text: string): BankTransaction[] {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];
  const sep = rows[0].includes('\t') ? '\t' : ',';
  const headers = rows[0].split(sep).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const col = (vals: string[], names: string[]) => {
    for (const n of names) {
      const idx = headers.indexOf(n);
      if (idx !== -1) return vals[idx]?.trim().replace(/^"|"$/g, '') ?? '';
    }
    return '';
  };
  return rows
    .slice(1)
    .map((row, i) => {
      const vals = row.split(sep);
      const rawAmt = col(vals, ['amount', 'value', 'credit', 'debit']).replace(/,/g, '');
      const amount = Math.abs(parseFloat(rawAmt) || 0);
      const rawType = col(vals, ['type', 'cr/dr', 'direction', 'transaction type']).toLowerCase();
      const type: TxType = rawType.includes('cr') || rawType === 'credit' ? 'credit' : 'debit';
      return {
        id: `bank-${Date.now()}-${i}`,
        date: col(vals, ['date', 'transaction date', 'value date']) || new Date().toISOString().slice(0, 10),
        description: col(vals, ['description', 'narration', 'details', 'remarks', 'memo']) || 'Bank entry',
        amount,
        type,
        reference: col(vals, ['reference', 'ref', 'transaction ref', 'txn ref']),
        status: 'unmatched' as MatchStatus,
      };
    })
    .filter((t) => t.amount > 0);
}

function autoMatch(
  bankTxs: BankTransaction[],
  platformTxs: PlatformTransaction[]
): BankTransaction[] {
  const taken = new Set(
    bankTxs.filter((t) => t.status === 'matched' && t.matchedPlatformId).map((t) => t.matchedPlatformId as string)
  );
  return bankTxs.map((bankTx) => {
    if (bankTx.status === 'matched') return bankTx;
    let best: { platformTx: PlatformTransaction; score: number } | null = null;
    for (const pt of platformTxs) {
      if (taken.has(pt.id) || pt.type !== bankTx.type) continue;
      const score = calcConfidence(bankTx, pt);
      if (!best || score > best.score) best = { platformTx: pt, score };
    }
    if (!best || best.score < 60) return bankTx;
    taken.add(best.platformTx.id);
    const variance = Math.abs(bankTx.amount - best.platformTx.amount);
    return {
      ...bankTx,
      status: variance > 0 ? 'discrepancy' : 'matched',
      matchedPlatformId: best.platformTx.id,
      confidence: best.score,
      amountDifference: variance > 0 ? variance : undefined,
      discrepancyKind: variance > 0 ? 'variance_amount' : undefined,
    };
  });
}

function StatusPill({ status }: { status: MatchStatus }) {
  const cfg = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function SummaryCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: ElementType; color: string;
}) {
  return (
    <Card className="border-[#FF6B00]/15 bg-[#161616] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs text-[#B3B3B3]">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub ? <p className="mt-1 text-xs text-[#555]">{sub}</p> : null}
        </div>
        <div className="rounded-lg bg-[#FF6B00]/10 p-2.5">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

export function BankReconciliation() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [platformTxs, setPlatformTxs] = useState<PlatformTransaction[]>([]);
  const [bankTxs, setBankTxs] = useState<BankTransaction[]>([]);
  const [accounts, setAccounts] = useState<LiveAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMatchId, setBulkMatchId] = useState('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedTx = useMemo(
    () => bankTxs.find((t) => t.id === selectedTxId) ?? null,
    [bankTxs, selectedTxId]
  );

  const loadData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [payments, payouts, royalties, bankReqs] = await Promise.all([
        getAdminPayments(),
        getPayoutRequests(),
        getRoyaltyUploadReports(),
        getAdminBankAccountRequests(),
      ]);
      const live = [
        ...mapPayments(payments),
        ...mapPayouts(payouts),
        ...mapRoyalties(royalties),
      ].sort((a, b) => b.date.localeCompare(a.date));
      setPlatformTxs(live);
      setAccounts(
        bankReqs
          .filter((r) => r.status === 'approved')
          .map((r) => ({
            id: r.id,
            bankName: r.bankName,
            accountName: r.accountName,
            accountNumber: r.accountNumber,
            status: r.status,
            owner: r.userName ?? r.userEmail,
            updatedAt: r.updatedAt,
          }))
      );
      setBankTxs((curr) => autoMatch(curr, live));
      setLastFetched(new Date().toISOString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => { setNotesDraft(selectedTx?.notes ?? ''); }, [selectedTx]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bankTxs.filter((t) => {
      const matchSearch = !q || t.description.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q) || String(t.amount).includes(q);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bankTxs, search, statusFilter]);

  const stats = useMemo(() => ({
    total: bankTxs.length,
    matched: bankTxs.filter((t) => t.status === 'matched').length,
    unmatched: bankTxs.filter((t) => t.status === 'unmatched').length,
    pending: bankTxs.filter((t) => t.status === 'pending').length,
    discrepancies: bankTxs.filter((t) => t.status === 'discrepancy').length,
    bankCredits: bankTxs.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
    bankDebits: bankTxs.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
    platformCredits: platformTxs.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
    platformDebits: platformTxs.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
  }), [bankTxs, platformTxs]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    await loadData();
    setSyncing(false);
  }, [loadData]);

  const handleAutoMatch = useCallback(() => {
    setBankTxs((curr) => autoMatch(curr, platformTxs));
    toast.success('Auto-match complete');
  }, [platformTxs]);

  const handleStatusChange = useCallback((id: string, status: MatchStatus) => {
    setBankTxs((curr) =>
      curr.map((t) => t.id === id ? { ...t, status, ...(status !== 'matched' ? { matchedPlatformId: undefined, confidence: undefined } : {}) } : t)
    );
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (!selectedTxId) return;
    setBankTxs((curr) => curr.map((t) => t.id === selectedTxId ? { ...t, notes: notesDraft } : t));
    toast.success('Notes saved');
  }, [notesDraft, selectedTxId]);

  const handleBulkMatch = useCallback(() => {
    if (!bulkMatchId || selectedIds.size === 0) return;
    setBankTxs((curr) => curr.map((t) => selectedIds.has(t.id) ? { ...t, status: 'matched', matchedPlatformId: bulkMatchId, confidence: 100 } : t));
    setSelectedIds(new Set());
    setBulkMatchId('');
    toast.success('Transactions matched');
  }, [bulkMatchId, selectedIds]);

  const handleReconcileBackend = useCallback(async (paymentRef: string) => {
    try {
      await reconcileAdminPayment(paymentRef);
      toast.success('Payment reconciled on backend');
      void loadData();
    } catch {
      toast.error('Failed to reconcile payment');
    }
  }, [loadData]);

  const handleCertify = useCallback(async () => {
    setCertifying(true);
    try {
      const pendingRefs = bankTxs
        .filter((t) => t.status === 'matched' && t.matchedPlatformId)
        .map((t) => platformTxs.find((p) => p.id === t.matchedPlatformId))
        .filter((p): p is PlatformTransaction => Boolean(p?.payoutReference && p.status === 'pending'))
        .map((p) => p.payoutReference as string);
      await Promise.allSettled(pendingRefs.map((ref) => updatePayoutRequest(ref, 'completed')));
      toast.success('Reconciliation certified');
      void loadData();
    } catch {
      toast.error('Failed to certify');
    } finally {
      setCertifying(false);
    }
  }, [bankTxs, loadData, platformTxs]);

  const handleImportCsv = useCallback((text: string) => {
    const parsed = parseCsv(text);
    if (parsed.length === 0) { toast.error('No valid transactions found'); return; }
    setBankTxs((curr) => autoMatch([...curr, ...parsed], platformTxs));
    setActiveTab('matching');
    toast.success(`${parsed.length} transactions imported`);
  }, [platformTxs]);

  const readFile = useCallback((file: File) => {
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (e) => { try { handleImportCsv(String(e.target?.result ?? '')); } finally { setImporting(false); } };
    reader.onerror = () => { setImporting(false); toast.error('Failed to read file'); };
    reader.readAsText(file);
  }, [handleImportCsv]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = '';
  }, [readFile]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }, [readFile]);

  const handleExport = useCallback(() => {
    const rows = [
      ['Date', 'Description', 'Amount', 'Type', 'Reference', 'Status', 'Matched To', 'Notes'],
      ...bankTxs.map((t) => {
        const pt = platformTxs.find((p) => p.id === t.matchedPlatformId);
        return [t.date, t.description, String(t.amount), t.type, t.reference, t.status, pt?.reference ?? '', t.notes ?? ''];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'bank-reconciliation.csv'; a.click();
    URL.revokeObjectURL(url);
  }, [bankTxs, platformTxs]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((curr) => { const n = new Set(curr); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Bank Transactions" value={stats.total} sub="From imported statements" icon={FileText} color="text-white" />
        <SummaryCard label="Matched" value={stats.matched} sub={stats.total ? `${Math.round((stats.matched / stats.total) * 100)}% match rate` : 'No bank data yet'} icon={CheckCircle2} color="text-emerald-400" />
        <SummaryCard label="Needs Attention" value={stats.unmatched + stats.pending} sub="Unmatched and pending" icon={AlertTriangle} color="text-amber-400" />
        <SummaryCard label="Discrepancies" value={stats.discrepancies} sub="Variance or missing" icon={Zap} color="text-red-400" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#FF6B00]/15 bg-[#161616] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Bank Statement Totals</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Credits', val: `+${formatMoney(stats.bankCredits)}`, color: 'text-emerald-400' },
              { label: 'Debits', val: `-${formatMoney(stats.bankDebits)}`, color: 'text-red-400' },
              { label: 'Net', val: formatMoney(stats.bankCredits - stats.bankDebits), color: 'text-white' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex justify-between border-b border-[#FF6B00]/10 pb-2 last:border-0">
                <span className="text-[#B3B3B3]">{label}</span>
                <span className={`font-semibold ${color}`}>{val}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-[#FF6B00]/15 bg-[#161616] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Live Platform Totals</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Credits', val: `+${formatMoney(stats.platformCredits)}`, color: 'text-emerald-400' },
              { label: 'Debits', val: `-${formatMoney(stats.platformDebits)}`, color: 'text-red-400' },
              { label: 'Records', val: String(platformTxs.length), color: 'text-white' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex justify-between border-b border-[#FF6B00]/10 pb-2 last:border-0">
                <span className="text-[#B3B3B3]">{label}</span>
                <span className={`font-semibold ${color}`}>{val}</span>
              </div>
            ))}
          </div>
          {lastFetched ? <p className="mt-3 text-[10px] text-[#555]">Synced {new Date(lastFetched).toLocaleString()}</p> : null}
        </Card>
      </div>
      <Card className="border-[#FF6B00]/15 bg-[#161616] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Live Platform Feed</h3>
        <div className="space-y-2">
          {platformTxs.slice(0, 8).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg bg-[#0A0A0A] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{t.description}</p>
                <p className="text-[10px] text-[#555]">{t.date} · {t.source} · {t.reference}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.type === 'credit' ? '+' : '-'}{formatMoney(t.amount)}
                </p>
                <p className="text-[10px] text-[#555]">{t.status}</p>
              </div>
            </div>
          ))}
          {platformTxs.length === 0 ? <p className="text-sm text-[#555]">No live data available. Click Sync.</p> : null}
        </div>
      </Card>
    </div>
  );

  const renderImport = () => (
    <div className="max-w-3xl space-y-6">
      <Card className="border-[#FF6B00]/15 bg-[#161616] p-6">
        <h3 className="mb-2 text-base font-semibold text-white">Import Bank Statement (CSV)</h3>
        <p className="mb-5 text-sm text-[#B3B3B3]">Platform-side transactions load automatically from Supabase. Only the bank statement needs to be imported here.</p>
        <div
          className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${dragOver ? 'border-[#FF6B00] bg-[#FF6B00]/5' : 'border-[#FF6B00]/20 hover:border-[#FF6B00]/40 hover:bg-[#FF6B00]/5'}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
          {importing
            ? <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-[#FF6B00]" />
            : <Upload className="mx-auto mb-3 h-10 w-10 text-[#FF6B00]/60" />}
          <p className="text-sm font-medium text-white">{importing ? 'Importing...' : 'Drop CSV here or click to browse'}</p>
          <p className="mt-1 text-xs text-[#555]">Required columns: Date, Description, Amount, Type (CR/DR), Reference</p>
        </div>
      </Card>
      <Card className="border-[#FF6B00]/15 bg-[#161616] p-6">
        <h3 className="mb-3 text-base font-semibold text-white">Manual Bank Entry</h3>
        <ManualEntry platformTxs={platformTxs} onAdd={(t) => { setBankTxs((curr) => autoMatch([...curr, t], platformTxs)); toast.success('Entry added'); }} />
      </Card>
    </div>
  );

  const renderMatching = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions"
            className="border-[#FF6B00]/20 bg-[#161616] pl-9 text-white placeholder-[#555]" />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'matched', 'pending', 'unmatched', 'discrepancy'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-[#FF6B00]/20 text-[#B3B3B3] hover:text-white'}`}>
              {s === 'all' ? 'All' : getStatusConfig(s).label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleAutoMatch} className="border border-[#FF6B00]/20 text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white">
            <Sparkles className="mr-1.5 h-4 w-4 text-yellow-400" /> Auto-match
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExport} className="border border-[#FF6B00]/20 text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white">
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
        </div>
      </div>
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#FF6B00]/25 bg-[#FF6B00]/5 px-4 py-3">
          <span className="text-sm text-[#FF6B00]">{selectedIds.size} selected</span>
          <select value={bulkMatchId} onChange={(e) => setBulkMatchId(e.target.value)}
            className="min-w-[280px] flex-1 rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white">
            <option value="">Select platform transaction</option>
            {platformTxs.map((t) => <option key={t.id} value={t.id}>{t.date} · {t.description} · {formatMoney(t.amount)}</option>)}
          </select>
          <Button size="sm" onClick={handleBulkMatch} disabled={!bulkMatchId} className="bg-[#FF6B00] text-white hover:bg-[#E55A00]">
            <GitMerge className="mr-1.5 h-4 w-4" /> Match
          </Button>
        </div>
      )}
      <Card className="overflow-hidden border-[#FF6B00]/15 bg-[#161616]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[#111] text-left text-xs uppercase tracking-wider text-[#555]">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={(e) => setSelectedIds(e.target.checked ? new Set(filtered.map((t) => t.id)) : new Set())} />
                </th>
                {['Date', 'Description', 'Amount', 'Status', 'Confidence', 'Matched To', ''].map((h) => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FF6B00]/10">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-[#555]">No transactions match the current filters.</td></tr>
              ) : filtered.map((t) => {
                const pt = platformTxs.find((p) => p.id === t.matchedPlatformId);
                return (
                  <tr key={t.id} className="hover:bg-[#FF6B00]/5">
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                    <td className="px-3 py-3 text-[#B3B3B3]">{t.date}</td>
                    <td className="px-3 py-3">
                      <p className="max-w-[260px] truncate text-white">{t.description}</p>
                      <p className="text-[10px] text-[#555]">{t.reference || 'No ref'}</p>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <span className={t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}>
                        {t.type === 'credit' ? '+' : '-'}{formatMoney(t.amount)}
                      </span>
                      {t.amountDifference ? <p className="text-[10px] text-orange-400">Δ {formatMoney(t.amountDifference)}</p> : null}
                    </td>
                    <td className="px-3 py-3"><StatusPill status={t.status} /></td>
                    <td className="px-3 py-3 text-[#B3B3B3]">{t.confidence ? `${t.confidence}%` : '—'}</td>
                    <td className="px-3 py-3">
                      {pt ? <div><p className="max-w-[200px] truncate text-white">{pt.description}</p><p className="text-[10px] text-[#555]">{pt.reference}</p></div> : <span className="text-[#555]">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => setSelectedTxId(t.id)}
                        className="rounded border border-[#FF6B00]/20 px-2 py-1 text-xs text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white">
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {selectedTx && (
        <Card className="border-[#FF6B00]/15 bg-[#161616] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">{selectedTx.description}</h3>
              <p className="text-xs text-[#555]">{selectedTx.reference || 'No reference'} · {selectedTx.date}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedTxId(null)} className="text-[#B3B3B3]"><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg bg-[#0A0A0A] p-4 space-y-2">
              <p className="text-xs text-[#555] uppercase tracking-wider">Bank side</p>
              <p className={`text-xl font-bold ${selectedTx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                {selectedTx.type === 'credit' ? '+' : '-'}{formatMoney(selectedTx.amount)}
              </p>
              <StatusPill status={selectedTx.status} />
              {selectedTx.discrepancyKind ? <p className="text-xs text-orange-400">{getDiscrepancyLabel(selectedTx.discrepancyKind)}</p> : null}
            </div>
            <div className="rounded-lg bg-[#0A0A0A] p-4 space-y-2">
              <p className="text-xs text-[#555] uppercase tracking-wider">Platform side</p>
              {(() => {
                const pt = platformTxs.find((p) => p.id === selectedTx.matchedPlatformId);
                if (!pt) return <p className="text-sm text-[#555]">Not linked yet.</p>;
                return (
                  <>
                    <p className="text-sm text-white">{pt.description}</p>
                    <p className="text-xs text-[#B3B3B3]">{pt.reference} · {pt.status} · {formatMoney(pt.amount)}</p>
                    {pt.paymentReference ? (
                      <button type="button" onClick={() => void handleReconcileBackend(pt.paymentReference as string)}
                        className="mt-2 w-full rounded border border-[#FF6B00]/20 px-3 py-1.5 text-xs text-[#FF6B00] hover:bg-[#FF6B00]/10">
                        Reconcile on backend
                      </button>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </div>
          {selectedTx.status !== 'matched' && (
            <div className="mt-4">
              <Label className="mb-2 block text-xs text-[#B3B3B3]">Link to platform transaction</Label>
              <select defaultValue="" onChange={(e) => {
                if (!e.target.value) return;
                setBankTxs((curr) => curr.map((t) => t.id === selectedTx.id ? { ...t, status: 'matched', matchedPlatformId: e.target.value, confidence: 100, discrepancyKind: undefined, amountDifference: undefined } : t));
                toast.success('Linked');
              }} className="w-full rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                <option value="">Select platform transaction</option>
                {platformTxs.filter((p) => p.type === selectedTx.type).map((p) => (
                  <option key={p.id} value={p.id}>{p.date} · {p.description} · {formatMoney(p.amount)}</option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-4">
            <Label className="mb-2 flex items-center gap-1 text-xs text-[#B3B3B3]">
              <MessageSquare className="h-3.5 w-3.5" /> Notes
            </Label>
            <textarea rows={3} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)}
              className="w-full resize-none rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#555]"
              placeholder="Add investigation notes" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={handleSaveNotes} className="bg-[#FF6B00] text-white hover:bg-[#E55A00]">Save notes</Button>
              <Button size="sm" variant="ghost" onClick={() => handleStatusChange(selectedTx.id, 'discrepancy')} className="border border-amber-400/20 text-amber-400 hover:bg-amber-400/10">Flag discrepancy</Button>
              <Button size="sm" variant="ghost" onClick={() => handleStatusChange(selectedTx.id, 'unmatched')} className="border border-[#FF6B00]/20 text-[#B3B3B3] hover:text-white">
                <Unlink className="mr-1.5 h-4 w-4" /> Remove match
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  const renderDiscrepancies = () => {
    const items = bankTxs.filter((t) => t.status === 'discrepancy' || t.status === 'unmatched');
    return (
      <div className="space-y-3">
        {items.length === 0 ? (
          <Card className="border-[#FF6B00]/15 bg-[#161616] p-10 text-center text-sm text-[#555]">
            No discrepancies. All imported bank items are reconciled.
          </Card>
        ) : items.map((t) => (
          <Card key={t.id} className="border-[#FF6B00]/15 bg-[#161616] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">{t.description}</p>
                <p className="mt-1 text-xs text-[#555]">{t.date} · {t.reference || 'No ref'}</p>
                <p className="mt-1 text-xs text-orange-400">{getDiscrepancyLabel(t.discrepancyKind)}</p>
                {t.notes ? <p className="mt-2 rounded bg-[#0A0A0A] px-2 py-1 text-xs text-[#B3B3B3]">{t.notes}</p> : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-base font-bold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.type === 'credit' ? '+' : '-'}{formatMoney(t.amount)}
                </span>
                <StatusPill status={t.status} />
                <button type="button" onClick={() => setSelectedTxId(t.id)}
                  className="rounded border border-[#FF6B00]/20 px-2 py-1 text-xs text-[#FF6B00] hover:bg-[#FF6B00]/10">Resolve</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderReports = () => (
    <div className="max-w-3xl space-y-6">
      <Card className="border-[#FF6B00]/15 bg-[#161616] p-6">
        <h3 className="mb-4 text-base font-semibold text-white">Reconciliation Summary</h3>
        <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A] p-5 space-y-3 text-sm">
          {[
            ['Bank transactions', stats.total, 'text-white'],
            ['Matched', stats.matched, 'text-emerald-400'],
            ['Unmatched + Pending', stats.unmatched + stats.pending, 'text-amber-400'],
            ['Discrepancies', stats.discrepancies, 'text-orange-400'],
          ].map(([label, val, color]) => (
            <div key={String(label)} className="flex justify-between">
              <span className="text-[#B3B3B3]">{label}</span>
              <span className={`font-semibold ${color}`}>{val}</span>
            </div>
          ))}
          <div className="border-t border-[#FF6B00]/10 pt-3 space-y-3">
            <div className="flex justify-between">
              <span className="text-[#B3B3B3]">Bank net</span>
              <span className="font-semibold text-white">{formatMoney(stats.bankCredits - stats.bankDebits)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B3B3B3]">Platform net</span>
              <span className="font-semibold text-white">{formatMoney(stats.platformCredits - stats.platformDebits)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B3B3B3]">Variance</span>
              <span className={`font-semibold ${Math.abs((stats.bankCredits - stats.bankDebits) - (stats.platformCredits - stats.platformDebits)) < 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatMoney(Math.abs((stats.bankCredits - stats.bankDebits) - (stats.platformCredits - stats.platformDebits)))}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={handleExport} className="bg-[#FF6B00] text-white hover:bg-[#E55A00]">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => void handleCertify()} disabled={certifying || stats.unmatched + stats.pending > 0}
            className="border border-[#FF6B00]/30 bg-transparent text-[#FF6B00] hover:bg-[#FF6B00]/10 disabled:opacity-40">
            {certifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Certify
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderAccounts = () => (
    <div className="max-w-3xl space-y-4">
      <Card className="border-[#FF6B00]/15 bg-[#161616]">
        <div className="border-b border-[#FF6B00]/10 px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Approved Bank Accounts (Live)</h3>
        </div>
        <div className="divide-y divide-[#FF6B00]/10">
          {accounts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[#555]">No approved bank accounts found.</p>
          ) : accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
              <div>
                <p className="font-medium text-white">{a.bankName}</p>
                <p className="text-xs text-[#555]">{a.accountName} · {a.accountNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-[#B3B3B3]">{a.owner}</p>
                <p className="text-xs text-[#555]">Updated {new Date(a.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const tabs: Array<{ id: Tab; label: string; icon: ElementType }> = [
    { id: 'overview', label: 'Overview', icon: GridIcon },
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'matching', label: 'Matching', icon: GitMerge },
    { id: 'discrepancies', label: 'Discrepancies', icon: AlertTriangle },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'accounts', label: 'Accounts', icon: Building2 },
  ];

  return (
    <div className="min-h-full bg-[#0A0A0A] p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <Landmark className="h-5 w-5 text-[#FF6B00]" /> Bank Reconciliation
          </h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">Live data from admin payments, payouts, royalty uploads, and approved bank accounts.</p>
          {loadError ? <p className="mt-1 text-xs text-red-400">{loadError}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => void handleSync()} disabled={syncing}
            className="border border-[#FF6B00]/20 text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white">
            {syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
            Sync
          </Button>
          <Button size="sm" onClick={handleExport} disabled={bankTxs.length === 0}
            className="border border-[#FF6B00]/30 bg-transparent text-[#FF6B00] hover:bg-[#FF6B00]/10 disabled:opacity-40">
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
        </div>
      </div>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[#FF6B00]/15 bg-[#161616] p-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const badge = id === 'matching' ? stats.unmatched + stats.pending : id === 'discrepancies' ? stats.discrepancies : 0;
          return (
            <button key={id} type="button" onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${activeTab === id ? 'bg-[#FF6B00] text-white' : 'text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white'}`}>
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              {badge > 0 ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${activeTab === id ? 'bg-white/20' : 'bg-red-500/20 text-red-400'}`}>{badge}</span> : null}
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' ? renderOverview() : null}
          {activeTab === 'import' ? renderImport() : null}
          {activeTab === 'matching' ? renderMatching() : null}
          {activeTab === 'discrepancies' ? renderDiscrepancies() : null}
          {activeTab === 'reports' ? renderReports() : null}
          {activeTab === 'accounts' ? renderAccounts() : null}
        </>
      )}
    </div>
  );
}

function ManualEntry({ platformTxs, onAdd }: { platformTxs: PlatformTransaction[]; onAdd: (t: BankTransaction) => void }) {
  const [form, setForm] = useState({ date: '', description: '', amount: '', type: 'credit' as TxType, reference: '' });
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.date || !form.description || !form.amount) { toast.error('Date, description and amount required'); return; }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { toast.error('Invalid amount'); return; }
    onAdd({ id: `manual-${Date.now()}`, date: form.date, description: form.description, amount, type: form.type, reference: form.reference, status: 'unmatched' });
    setForm({ date: '', description: '', amount: '', type: 'credit', reference: '' });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label className="mb-1 text-xs text-[#B3B3B3]">Date</Label><Input type="date" value={form.date} onChange={set('date')} className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white" /></div>
      <div><Label className="mb-1 text-xs text-[#B3B3B3]">Amount (₦)</Label><Input type="number" value={form.amount} onChange={set('amount')} className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white" /></div>
      <div className="sm:col-span-2"><Label className="mb-1 text-xs text-[#B3B3B3]">Description</Label><Input value={form.description} onChange={set('description')} className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white" /></div>
      <div>
        <Label className="mb-1 text-xs text-[#B3B3B3]">Type</Label>
        <select value={form.type} onChange={set('type')} className="w-full rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white">
          <option value="credit">Credit</option><option value="debit">Debit</option>
        </select>
      </div>
      <div><Label className="mb-1 text-xs text-[#B3B3B3]">Reference</Label><Input value={form.reference} onChange={set('reference')} className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white" /></div>
      <div className="sm:col-span-2">
        <Button onClick={handleSubmit} className="w-full bg-[#FF6B00] text-white hover:bg-[#E55A00]">
          <Plus className="mr-2 h-4 w-4" /> Add transaction
        </Button>
      </div>
    </div>
  );
}
