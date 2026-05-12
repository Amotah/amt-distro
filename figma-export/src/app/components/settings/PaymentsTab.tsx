import { useState, useEffect } from 'react';
import {
  Building2, CreditCard, Plus, Clock, Check, CheckCircle, XCircle,
  AlertCircle, Loader2, Download, Filter, Trash2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  getUserBankAccount, submitBankAccountRequest, getBillingHistory,
  type UserBankAccount, type BillingHistoryRecord,
} from '../../utils/payment-api';

const NIGERIAN_BANKS = [
  'Access Bank', 'Citibank', 'Ecobank Nigeria', 'Fidelity Bank', 'First Bank of Nigeria',
  'First City Monument Bank (FCMB)', 'Guaranty Trust Bank (GTBank)', 'Heritage Bank',
  'Keystone Bank', 'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Sterling Bank', 'Union Bank of Nigeria', 'United Bank for Africa (UBA)', 'Unity Bank',
  'Wema Bank', 'Zenith Bank', 'Kuda Bank', 'Opay', 'PalmPay', 'Moniepoint',
];

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
    approved: { label: 'Approved', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
    completed: { label: 'Paid', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    failed: { label: 'Failed', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  };
  const c = cfg[status] ?? { label: status, cls: 'bg-white/5 text-[#B3B3B3] border-white/10' };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${c.cls}`}>{c.label}</span>
  );
}

export function PaymentsTab() {
  const [account, setAccount] = useState<UserBankAccount | null>(null);
  const [history, setHistory] = useState<BillingHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const [form, setForm] = useState({
    bankName: '', accountName: '', accountNumber: '',
  });

  useEffect(() => {
    getUserBankAccount().then(setAccount).catch(() => {}).finally(() => setLoading(false));
    getBillingHistory().then(setHistory).catch(() => {}).finally(() => setHistLoading(false));
  }, []);

  const handleAddBank = async () => {
    if (!form.bankName || !form.accountName || form.accountNumber.length < 10) {
      setSaveError('Please fill all fields correctly.');
      return;
    }
    setSaving(true); setSaveError('');
    try {
      await submitBankAccountRequest({ bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber });
      const updated = await getUserBankAccount();
      setAccount(updated);
      setShowAddForm(false);
      setSaved(true);
      setForm({ bankName: '', accountName: '', accountNumber: '' });
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaveError(e.message ?? 'Failed to submit bank account.');
    } finally { setSaving(false); }
  };

  const filteredHistory = filterStatus === 'all' ? history : history.filter((h) => h.status === filterStatus);

  const exportCSV = () => {
    const rows = [
      ['Date', 'Description', 'Amount (NGN)', 'Method', 'Status', 'Reference'],
      ...filteredHistory.map((r) => [
        new Date(r.createdAt).toLocaleDateString(),
        r.description,
        r.amount.toLocaleString(),
        r.method,
        r.status,
        r.reference,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payment-history.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Payment Methods</h2>
        <p className="text-sm text-[#555] mt-0.5">Manage your bank account and payout settings</p>
      </div>

      {/* Bank Account */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Bank Account for Payouts</p>
              <p className="text-xs text-[#555]">Direct deposit destination for your royalties</p>
            </div>
          </div>
          {!showAddForm && (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}
              className="h-8 text-xs border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> {account?.approved || account?.pending ? 'Update' : 'Add Account'}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[#555] text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {account?.approved && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-sm font-semibold text-emerald-300">Active Account</p>
                </div>
                <p className="text-white text-sm font-medium">{account.approved.bankName}</p>
                <p className="text-[#B3B3B3] text-xs mt-0.5">{account.approved.accountName} · ••••{account.approved.accountNumber.slice(-4)}</p>
              </div>
            )}
            {account?.pending && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-sm font-semibold text-amber-300">Pending Review</p>
                </div>
                <p className="text-white text-sm font-medium">{account.pending.bankName}</p>
                <p className="text-[#B3B3B3] text-xs mt-0.5">{account.pending.accountName} · ••••{account.pending.accountNumber.slice(-4)}</p>
                <p className="text-xs text-[#555] mt-2">Submitted {new Date(account.pending.createdAt).toLocaleDateString()} — under review by our team.</p>
              </div>
            )}
            {!account?.approved && !account?.pending && !showAddForm && (
              <p className="text-sm text-[#555] py-2">No bank account on file. Add one to receive payouts.</p>
            )}
          </>
        )}

        {saved && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <Check className="w-4 h-4" /> Bank account submitted for review.
          </div>
        )}

        {showAddForm && (
          <div className="rounded-xl border border-white/8 bg-[#0d0d0d] p-5 space-y-4">
            <p className="text-sm font-semibold text-white">Add Bank Account</p>

            {saveError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {saveError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[#B3B3B3] text-sm">Bank Name</Label>
              <select
                title="Bank Name"
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                className="w-full h-10 rounded-lg bg-[#111] border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-[#FF6B00]/60"
              >
                <option value="">Select bank…</option>
                {NIGERIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#B3B3B3] text-sm">Account Holder Name</Label>
              <Input value={form.accountName} onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                placeholder="As it appears on bank records"
                className="h-10 bg-[#111] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#B3B3B3] text-sm">Account Number (10 digits)</Label>
              <Input
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="••••••••••"
                className="h-10 bg-[#111] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60 font-mono tracking-widest"
              />
            </div>

            <div className="flex items-center gap-2 text-[10px] text-[#555]">
              <CreditCard className="w-3 h-3" />
              Your account details are securely encrypted and never shared.
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAddForm(false)}
                className="flex-1 h-10 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-sm">
                Cancel
              </Button>
              <Button onClick={handleAddBank} disabled={saving}
                className="flex-1 h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Account'}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Payment History */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Payment History</p>
              <p className="text-xs text-[#555]">{history.length} records</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              title="Filter by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 text-xs rounded-lg bg-[#0d0d0d] border border-white/10 text-[#B3B3B3] px-2 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="completed">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <Button size="sm" variant="outline" onClick={exportCSV}
              className="h-8 text-xs border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>
          </div>
        </div>

        {histLoading ? (
          <div className="flex items-center gap-2 text-[#555] text-sm py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
          </div>
        ) : filteredHistory.length === 0 ? (
          <p className="text-sm text-[#555] py-4">No payment records found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-[#0d0d0d]">
                  {['Date', 'Description', 'Amount', 'Method', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#555] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-3 text-xs text-[#B3B3B3] whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs text-white max-w-[200px] truncate">{r.description}</td>
                    <td className="px-4 py-3 text-xs text-white font-mono whitespace-nowrap">₦{r.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-[#B3B3B3] whitespace-nowrap">{r.method}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
