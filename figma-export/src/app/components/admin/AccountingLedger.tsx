import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ElementType, SVGProps } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Download,
  Filter,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  approveJournalEntry,
  createJournalEntry,
  generateAutoEntries,
  getChartOfAccounts,
  getGeneralLedger,
  getJournalEntryDetails,
  postJournalEntry,
  rejectJournalEntry,
  voidJournalEntry,
  type COAAccount,
  type CreateJournalEntryInput,
  type GLEntry,
} from '../../utils/admin-api';

type Tab = 'overview' | 'chart-of-accounts' | 'general-ledger' | 'journal-entries';
type EditHistoryItem = { timestamp: string; changes: string; changedBy: string };

function formatMoney(cents: number, withSign = false) {
  const amount = cents / 100;
  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  
  if (!withSign) return formatted;
  return amount >= 0 ? `+${formatted}` : formatted;
}

function getAccountCategoryColor(category: string) {
  switch (category) {
    case 'assets': return 'text-blue-400 bg-blue-400/10';
    case 'liabilities': return 'text-red-400 bg-red-400/10';
    case 'equity': return 'text-purple-400 bg-purple-400/10';
    case 'revenue': return 'text-emerald-400 bg-emerald-400/10';
    case 'expenses': return 'text-orange-400 bg-orange-400/10';
    default: return 'text-[#B3B3B3] bg-[#FF6B00]/10';
  }
}

function StatusBadge({ status, type }: { status: string; type?: 'entry' | 'approval' }) {
  if (type === 'approval') {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><Check className="h-3 w-3" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-400"><X className="h-3 w-3" /> Rejected</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-400"><Shield className="h-3 w-3" /> Pending Review</span>;
      default:
        return <span className="text-xs text-[#555]">N/A</span>;
    }
  }
  
  switch (status) {
    case 'posted':
      return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><Check className="h-3 w-3" /> Posted</span>;
    case 'draft':
      return <span className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-2.5 py-1 text-xs font-medium text-[#FF6B00]"><FileText className="h-3 w-3" /> Draft</span>;
    case 'voided':
      return <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-400"><X className="h-3 w-3" /> Voided</span>;
    default:
      return <span className="text-xs text-[#555]">{status}</span>;
  }
}

function SummaryCard({ label, value, trend, icon: Icon, color }: {
  label: string; value: string; trend?: 'up' | 'down'; icon: ElementType; color: string;
}) {
  return (
    <Card className="border-[#FF6B00]/15 bg-[#161616] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs text-[#B3B3B3] uppercase tracking-wider">{label}</p>
          <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          {trend && <p className="mt-1 flex items-center gap-1 text-xs text-[#555]">
            {trend === 'up' ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
            {trend === 'up' ? '+2.3%' : '-1.5%'} this period
          </p>}
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

export function AccountingLedger() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [coa, setCOA] = useState<COAAccount[]>([]);
  const [glEntries, setGLEntries] = useState<GLEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // COA Filters
  const [coaCategory, setCOACategory] = useState<'all' | string>('all');
  const [coaStatus, setCOAStatus] = useState('active');

  // GL Filters
  const [glSearch, setGLSearch] = useState('');
  const [glDateRange, setGLDateRange] = useState({ start: '', end: '' });
  const [glStatus, setGLStatus] = useState<'all' | string>('all');
  const [glApprovalStatus, setGLApprovalStatus] = useState<'all' | string>('all');

  // Journal Entry Form
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState<CreateJournalEntryInput>({
    entryDate: new Date().toISOString().split('T')[0],
    debitAccountCode: '',
    creditAccountCode: '',
    debitAmount: 0,
    creditAmount: 0,
    description: '',
    entryType: 'manual',
    requiresApproval: true,
  });

  // Selected Entry for Review
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const selectedEntry = useMemo(() => glEntries.find(e => e.id === selectedEntryId) ?? null, [glEntries, selectedEntryId]);
  const [reviewComments, setReviewComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const loadData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [accounts, entries] = await Promise.all([
        getChartOfAccounts('active'),
        getGeneralLedger(),
      ]);
      setCOA(accounts);
      setGLEntries(entries);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    await loadData();
    setSyncing(false);
  }, [loadData]);

  const handleGenerateAutoEntries = useCallback(async () => {
    try {
      setSyncing(true);
      const result = await generateAutoEntries({ forceReconciliation: true });
      toast.success(`Generated ${result.created} automatic entries`);
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate auto entries');
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  const handleCreateEntry = useCallback(async () => {
    if (!entryForm.debitAccountCode || !entryForm.creditAccountCode) {
      toast.error('Select both debit and credit accounts');
      return;
    }
    if (entryForm.debitAmount !== entryForm.creditAmount) {
      toast.error('Debit and credit amounts must be equal');
      return;
    }
    if (entryForm.debitAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      const entry = await createJournalEntry(entryForm);
      toast.success('Journal entry created');
      setShowEntryForm(false);
      setEntryForm({
        entryDate: new Date().toISOString().split('T')[0],
        debitAccountCode: '',
        creditAccountCode: '',
        debitAmount: 0,
        creditAmount: 0,
        description: '',
        entryType: 'manual',
        requiresApproval: true,
      });
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create entry');
    }
  }, [entryForm, loadData]);

  const handleApproveEntry = useCallback(async (entryId: string) => {
    try {
      await approveJournalEntry(entryId, reviewComments);
      toast.success('Entry approved');
      setSelectedEntryId(null);
      setReviewComments('');
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve entry');
    }
  }, [reviewComments, loadData]);

  const handleRejectEntry = useCallback(async (entryId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await rejectJournalEntry(entryId, rejectionReason);
      toast.success('Entry rejected');
      setSelectedEntryId(null);
      setRejectionReason('');
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject entry');
    }
  }, [rejectionReason, loadData]);

  const handlePostEntry = useCallback(async (entryId: string) => {
    try {
      await postJournalEntry(entryId);
      toast.success('Entry posted to ledger');
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post entry');
    }
  }, [loadData]);

  const handleVoidEntry = useCallback(async (entryId: string) => {
    if (!confirm('Are you sure you want to void this entry? This cannot be undone.')) return;
    try {
      await voidJournalEntry(entryId);
      toast.success('Entry voided');
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to void entry');
    }
  }, [loadData]);

  const filteredCOA = useMemo(() => {
    return coa.filter(a => {
      if (coaCategory !== 'all' && a.category !== coaCategory) return false;
      if (coaStatus !== 'all' && a.status !== coaStatus) return false;
      return true;
    });
  }, [coa, coaCategory, coaStatus]);

  const filteredGLEntries = useMemo(() => {
    let entries = glEntries;
    
    if (glSearch.trim()) {
      const q = glSearch.toLowerCase();
      entries = entries.filter(e => 
        e.description.toLowerCase().includes(q) ||
        e.reference?.toLowerCase().includes(q) ||
        e.entryNumber.toLowerCase().includes(q) ||
        e.debitAccountCode.includes(q) ||
        e.creditAccountCode.includes(q)
      );
    }

    if (glStatus !== 'all') {
      entries = entries.filter(e => e.status === glStatus);
    }

    if (glApprovalStatus !== 'all') {
      entries = entries.filter(e => e.approvalStatus === glApprovalStatus);
    }

    if (glDateRange.start) {
      entries = entries.filter(e => e.entryDate >= glDateRange.start);
    }

    if (glDateRange.end) {
      entries = entries.filter(e => e.entryDate <= glDateRange.end);
    }

    return entries.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  }, [glEntries, glSearch, glStatus, glApprovalStatus, glDateRange]);

  // Calculate totals
  const totals = useMemo(() => {
    const posted = glEntries.filter(e => e.status === 'posted');
    return {
      totalDebits: posted.reduce((s, e) => s + e.debitAmount, 0),
      totalCredits: posted.reduce((s, e) => s + e.creditAmount, 0),
      assetBalance: coa.find(a => a.code === '1000')?.balance ?? 0,
      liabilityBalance: coa.filter(a => a.category === 'liabilities').reduce((s, a) => s + a.balance, 0),
      revenueBalance: coa.filter(a => a.category === 'revenue').reduce((s, a) => s + a.balance, 0),
    };
  }, [glEntries, coa]);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard
          label="Total Debits (Posted)"
          value={formatMoney(totals.totalDebits)}
          icon={TrendingUp}
          color="text-blue-400"
        />
        <SummaryCard
          label="Total Credits (Posted)"
          value={formatMoney(totals.totalCredits)}
          icon={TrendingDown}
          color="text-red-400"
        />
        <SummaryCard
          label="Asset Balance"
          value={formatMoney(totals.assetBalance)}
          icon={BarChart3}
          color="text-emerald-400"
        />
        <SummaryCard
          label="Pending Approval"
          value={String(glEntries.filter(e => e.approvalStatus === 'pending').length)}
          icon={Shield}
          color="text-amber-400"
        />
      </div>

      <Card className="border-[#FF6B00]/15 bg-[#161616] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
          <AlertTriangle className="h-5 w-5 text-[#FF6B00]" /> Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowEntryForm(true)}
            className="bg-[#FF6B00] text-white hover:bg-[#E55A00]"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" /> New Journal Entry
          </Button>
          <Button
            onClick={() => void handleGenerateAutoEntries()}
            disabled={syncing}
            variant="ghost"
            className="border border-[#FF6B00]/20 text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white"
            size="sm"
          >
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Generate Auto Entries
          </Button>
          <Button
            onClick={() => void handleSync()}
            disabled={syncing}
            variant="ghost"
            className="border border-[#FF6B00]/20 text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white"
            size="sm"
          >
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Data
          </Button>
        </div>
      </Card>

      <Card className="border-[#FF6B00]/15 bg-[#161616] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Recent Journal Entries</h3>
        <div className="space-y-2">
          {glEntries.slice(0, 5).map(entry => (
            <div key={entry.id} className="flex items-center justify-between rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{entry.entryNumber} — {entry.description}</p>
                <p className="text-xs text-[#555]">{entry.entryDate} · {entry.debitAccountCode} → {entry.creditAccountCode}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#FF6B00]">{formatMoney(entry.debitAmount)}</p>
                <StatusBadge status={entry.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderCOA = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-[#B3B3B3]">Category:</Label>
          <select
            value={coaCategory}
            onChange={e => setCOACategory(e.target.value)}
            className="rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white"
          >
            <option value="all">All Categories</option>
            <option value="assets">Assets</option>
            <option value="liabilities">Liabilities</option>
            <option value="equity">Equity</option>
            <option value="revenue">Revenue</option>
            <option value="expenses">Expenses</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-[#B3B3B3]">Status:</Label>
          <select
            value={coaStatus}
            onChange={e => setCOAStatus(e.target.value)}
            className="rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white"
          >
            <option value="active">Active</option>
            <option value="all">All</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden border-[#FF6B00]/15 bg-[#161616]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[#111] text-left text-xs uppercase tracking-wider text-[#555]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Total Debits</th>
                <th className="px-4 py-3">Total Credits</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FF6B00]/10">
              {filteredCOA.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-[#555]">
                    No accounts found
                  </td>
                </tr>
              ) : filteredCOA.map(account => (
                <tr key={account.id} className="hover:bg-[#FF6B00]/5">
                  <td className="px-4 py-3 font-mono font-semibold text-white">{account.code}</td>
                  <td className="px-4 py-3">
                    <p className="text-white">{account.name}</p>
                    {account.description && <p className="text-xs text-[#555]">{account.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getAccountCategoryColor(account.category)}`}>
                      {account.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-400">{formatMoney(account.totalDebits)}</td>
                  <td className="px-4 py-3 font-mono text-red-400">{formatMoney(account.totalCredits)}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-white">{formatMoney(account.balance)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                      account.status === 'active' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#555]/10 text-[#B3B3B3]'
                    }`}>
                      {account.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderGeneralLedger = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
          <Input
            value={glSearch}
            onChange={e => setGLSearch(e.target.value)}
            placeholder="Search by description, reference, or account code..."
            className="border-[#FF6B00]/20 bg-[#161616] pl-9 text-white placeholder-[#555]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={glStatus}
            onChange={e => setGLStatus(e.target.value)}
            className="rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white"
          >
            <option value="all">All Status</option>
            <option value="posted">Posted</option>
            <option value="draft">Draft</option>
            <option value="voided">Voided</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={glApprovalStatus}
            onChange={e => setGLApprovalStatus(e.target.value)}
            className="rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white"
          >
            <option value="all">All Approval</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden border-[#FF6B00]/15 bg-[#161616]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-[#111] text-left text-xs uppercase tracking-wider text-[#555]">
              <tr>
                <th className="px-4 py-3">Entry #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Debit Account</th>
                <th className="px-4 py-3">Debit Amount</th>
                <th className="px-4 py-3">Credit Account</th>
                <th className="px-4 py-3">Credit Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Approval</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FF6B00]/10">
              {filteredGLEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-[#555]">
                    No entries found
                  </td>
                </tr>
              ) : filteredGLEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-[#FF6B00]/5">
                  <td className="px-4 py-3 font-mono font-semibold text-white">{entry.entryNumber}</td>
                  <td className="px-4 py-3 text-[#B3B3B3]">{entry.entryDate}</td>
                  <td className="px-4 py-3">
                    <p className="max-w-[180px] truncate text-white">{entry.description}</p>
                    {entry.reference && <p className="text-xs text-[#555]">Ref: {entry.reference}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-white">{entry.debitAccountCode}</p>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-400">{formatMoney(entry.debitAmount)}</td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-white">{entry.creditAccountCode}</p>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-red-400">{formatMoney(entry.creditAmount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={entry.approvalStatus} type="approval" />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedEntryId(entry.id)}
                      className="rounded border border-[#FF6B00]/20 px-2 py-1 text-xs text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedEntry && (
        <Card className="border-[#FF6B00]/15 bg-[#161616] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Entry Details: {selectedEntry.entryNumber}</h3>
              <p className="text-xs text-[#555]">Created {new Date(selectedEntry.createdAt).toLocaleString()}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedEntryId(null)} className="text-[#B3B3B3]">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg bg-[#0A0A0A] p-4">
              <p className="mb-2 text-xs text-[#555] uppercase tracking-wider">Debit Side</p>
              <p className="text-sm text-white">{selectedEntry.debitAccountCode}</p>
              <p className="text-xl font-bold text-blue-400">{formatMoney(selectedEntry.debitAmount)}</p>
            </div>
            <div className="rounded-lg bg-[#0A0A0A] p-4">
              <p className="mb-2 text-xs text-[#555] uppercase tracking-wider">Credit Side</p>
              <p className="text-sm text-white">{selectedEntry.creditAccountCode}</p>
              <p className="text-xl font-bold text-red-400">{formatMoney(selectedEntry.creditAmount)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A] p-4">
            <p className="mb-1 text-xs text-[#B3B3B3]">Description</p>
            <p className="text-sm text-white">{selectedEntry.description}</p>
            {selectedEntry.reference && <p className="mt-1 text-xs text-[#555]">Reference: {selectedEntry.reference}</p>}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div><p className="text-xs text-[#555]">Status</p><StatusBadge status={selectedEntry.status} /></div>
            <div><p className="text-xs text-[#555]">Approval</p><StatusBadge status={selectedEntry.approvalStatus} type="approval" /></div>
            <div><p className="text-xs text-[#555]">Type</p><span className="text-xs text-[#B3B3B3] capitalize">{selectedEntry.entryType}</span></div>
          </div>

          {selectedEntry.editHistory && selectedEntry.editHistory.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-[#B3B3B3] uppercase tracking-wider">Audit Trail</p>
              <div className="space-y-1 text-xs text-[#555]">
                {selectedEntry.editHistory.map((item: EditHistoryItem, i) => (
                  <div key={i} className="rounded bg-[#0A0A0A] px-2 py-1">
                    {item.timestamp} — {item.changes} (by {item.changedBy})
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEntry.status === 'draft' && selectedEntry.approvalStatus === 'pending' && (
            <div className="mt-4 space-y-3">
              <div>
                <Label className="mb-1 block text-xs text-[#B3B3B3]">Review Comments (Optional)</Label>
                <textarea
                  rows={2}
                  value={reviewComments}
                  onChange={e => setReviewComments(e.target.value)}
                  className="w-full resize-none rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#555]"
                  placeholder="Add any comments before approving..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleApproveEntry(selectedEntry.id)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
                <Button onClick={() => setSelectedEntryId(null)} variant="ghost" className="border border-[#FF6B00]/20">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {selectedEntry.status === 'draft' && selectedEntry.approvalStatus === 'pending' && (
            <div className="mt-3 space-y-2">
              <Label className="text-xs text-[#B3B3B3]">Reject Entry</Label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full resize-none rounded border border-red-400/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#555]"
                placeholder="Reason for rejection..."
              />
              <Button onClick={() => void handleRejectEntry(selectedEntry.id)} variant="ghost" className="w-full border border-red-400/20 text-red-400 hover:bg-red-400/10">
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
            </div>
          )}

          {selectedEntry.status === 'draft' && selectedEntry.approvalStatus === 'approved' && (
            <Button onClick={() => void handlePostEntry(selectedEntry.id)} className="mt-4 w-full bg-[#FF6B00] text-white hover:bg-[#E55A00]">
              <ArrowRight className="mr-2 h-4 w-4" /> Post to Ledger
            </Button>
          )}

          {selectedEntry.status === 'posted' && (
            <Button onClick={() => void handleVoidEntry(selectedEntry.id)} variant="ghost" className="mt-4 w-full border border-red-400/20 text-red-400 hover:bg-red-400/10">
              <X className="mr-2 h-4 w-4" /> Void Entry
            </Button>
          )}
        </Card>
      )}
    </div>
  );

  const renderJournalEntries = () => (
    <div className="max-w-2xl space-y-4">
      {showEntryForm ? (
        <Card className="border-[#FF6B00]/15 bg-[#161616] p-6">
          <h3 className="mb-4 text-base font-semibold text-white">New Journal Entry</h3>

          <div className="space-y-4">
            <div>
              <Label className="mb-1 block text-xs text-[#B3B3B3]">Entry Date</Label>
              <input
                type="date"
                value={entryForm.entryDate}
                onChange={e => setEntryForm(f => ({ ...f, entryDate: e.target.value }))}
                className="w-full rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-[#B3B3B3]">Debit Account</Label>
                <select
                  value={entryForm.debitAccountCode}
                  onChange={e => setEntryForm(f => ({ ...f, debitAccountCode: e.target.value }))}
                  className="w-full rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white"
                >
                  <option value="">Select account...</option>
                  {coa.map(a => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-[#B3B3B3]">Credit Account</Label>
                <select
                  value={entryForm.creditAccountCode}
                  onChange={e => setEntryForm(f => ({ ...f, creditAccountCode: e.target.value }))}
                  className="w-full rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white"
                >
                  <option value="">Select account...</option>
                  {coa.map(a => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-[#B3B3B3]">Debit Amount (₦)</Label>
                <input
                  type="number"
                  value={entryForm.debitAmount / 100}
                  onChange={e => setEntryForm(f => ({ ...f, debitAmount: Math.round(Number(e.target.value) * 100), creditAmount: Math.round(Number(e.target.value) * 100) }))}
                  className="w-full rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-[#B3B3B3]">Credit Amount (₦)</Label>
                <div className="rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-[#B3B3B3]">
                  {formatMoney(entryForm.creditAmount)}
                </div>
                {entryForm.debitAmount !== entryForm.creditAmount && (
                  <p className="mt-1 text-xs text-red-400">Must balance!</p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs text-[#B3B3B3]">Description</Label>
              <textarea
                rows={2}
                value={entryForm.description}
                onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))}
                className="w-full resize-none rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white placeholder-[#555]"
                placeholder="Description of the transaction..."
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs text-[#B3B3B3]">Reference (Optional)</Label>
              <input
                type="text"
                value={entryForm.reference || ''}
                onChange={e => setEntryForm(f => ({ ...f, reference: e.target.value }))}
                className="w-full rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white placeholder-[#555]"
                placeholder="Invoice #, payment ref, etc."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => void handleCreateEntry()} className="flex-1 bg-[#FF6B00] text-white hover:bg-[#E55A00]">
                <Plus className="mr-2 h-4 w-4" /> Create Entry
              </Button>
              <Button onClick={() => setShowEntryForm(false)} variant="ghost" className="border border-[#FF6B00]/20">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setShowEntryForm(true)} className="w-full bg-[#FF6B00] text-white hover:bg-[#E55A00]" size="lg">
          <Plus className="mr-2 h-4 w-4" /> Create New Journal Entry
        </Button>
      )}
    </div>
  );

  const tabs: Array<{ id: Tab; label: string; icon: ElementType }> = [
    { id: 'overview', label: 'Overview', icon: GridIcon },
    { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: BarChart3 },
    { id: 'general-ledger', label: 'General Ledger', icon: FileText },
    { id: 'journal-entries', label: 'Journal Entries', icon: Plus },
  ];

  if (loading) {
    return (
      <div className="min-h-full bg-[#0A0A0A] p-4 sm:p-6">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0A0A0A] p-4 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <BarChart3 className="h-6 w-6 text-[#FF6B00]" /> General Ledger & Chart of Accounts
          </h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">Complete accounting system with live data integration. Create, approve, and post journal entries.</p>
          {loadError && <p className="mt-1 text-xs text-red-400">{loadError}</p>}
        </div>
        <Button size="sm" onClick={() => void handleSync()} disabled={syncing} className="border border-[#FF6B00]/20">
          {syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
          Sync
        </Button>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[#FF6B00]/15 bg-[#161616] p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-[#FF6B00] text-white'
                : 'text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'chart-of-accounts' && renderCOA()}
      {activeTab === 'general-ledger' && renderGeneralLedger()}
      {activeTab === 'journal-entries' && renderJournalEntries()}
    </div>
  );
}
