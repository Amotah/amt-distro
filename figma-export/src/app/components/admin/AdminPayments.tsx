import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, RefreshCw, Search } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';

function statusBadgeClass(status: adminApi.AdminPaymentRecord['status']) {
  if (status === 'completed') {
    return 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30';
  }

  if (status === 'failed') {
    return 'bg-rose-400/15 text-rose-300 border-rose-400/30';
  }

  return 'bg-amber-400/15 text-amber-300 border-amber-400/30';
}

function purposeLabel(purpose: adminApi.AdminPaymentRecord['purpose']) {
  if (purpose === 'marketing') {
    return 'Marketing / Promotion';
  }

  if (purpose === 'release') {
    return 'Release / Distribution';
  }

  return 'Revenue Payout';
}

function gatewayStateLabel(payment: adminApi.AdminPaymentRecord) {
  if (payment.gatewayStatus && payment.gatewayStatus.trim()) {
    return payment.gatewayStatus;
  }

  if (payment.checkoutStatus && payment.checkoutStatus.trim()) {
    return payment.checkoutStatus;
  }

  if (payment.provider === 'internal') {
    return payment.status === 'completed' ? 'processed' : payment.status;
  }

  if (payment.status === 'completed') {
    return 'success';
  }

  if (payment.status === 'failed') {
    return 'failed';
  }

  return 'pending';
}

export function AdminPayments() {
  const { hasPermission } = useAdmin();
  const canView = hasPermission('payments.view');
  const canReconcile = hasPermission('payments.approve');

  const [payments, setPayments] = useState<adminApi.AdminPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [purposeFilter, setPurposeFilter] = useState<'all' | 'release' | 'marketing' | 'payout'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [query, setQuery] = useState('');
  const [busyReference, setBusyReference] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) {
      setIsLoading(false);
      return;
    }

    loadPayments();
  }, [canView]);

  async function loadPayments() {
    try {
      setIsLoading(true);
      setPageError(null);
      const data = await adminApi.getAdminPayments();
      setPayments(data);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load payments.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReconcile(reference: string) {
    try {
      setBusyReference(reference);
      const updated = await adminApi.reconcileAdminPayment(reference);
      setPayments((current) => current.map((payment) => (payment.reference === reference ? updated : payment)));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to reconcile payment.');
    } finally {
      setBusyReference(null);
    }
  }

  function paymentDate(payment: adminApi.AdminPaymentRecord) {
    return new Date(payment.paidAt || payment.createdAt);
  }

  function isWithinDateRange(payment: adminApi.AdminPaymentRecord) {
    if (dateRange === 'all') {
      return true;
    }

    const now = new Date();
    const candidate = paymentDate(payment);

    if (dateRange === 'today') {
      return candidate.getFullYear() === now.getFullYear()
        && candidate.getMonth() === now.getMonth()
        && candidate.getDate() === now.getDate();
    }

    const days = dateRange === '7d' ? 7 : 30;
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - days);
    return candidate.getTime() >= threshold.getTime();
  }

  function downloadCsv() {
    const rows = filteredPayments.map((payment) => [
      payment.reference,
      payment.accountName || payment.email,
      payment.accountRole || 'unknown',
      payment.email,
      payment.releaseArtistName || '',
      payment.releaseTitle || '',
      purposeLabel(payment.purpose),
      payment.type,
      payment.plan || '',
      payment.status,
      gatewayStateLabel(payment),
      payment.amount.toString(),
      payment.currency,
      payment.paidAt || '',
      payment.createdAt,
      payment.updatedAt,
    ]);

    const csv = [
      ['Summary', 'Value'],
      ['Date Range', dateRange],
      ['Status Filter', statusFilter],
      ['Purpose Filter', purposeFilter],
      ['Query', query || '(none)'],
      ['Visible Amount (Filtered)', totalAmount.toString()],
      ['Total Inflow', totalInflow.toString()],
      ['Total Outflow', totalOutflow.toString()],
      ['Net Flow', netFlow.toString()],
      ['Completed Inflow', completedInflow.toString()],
      ['Completed Outflow', completedOutflow.toString()],
      [],
      ['Reference', 'Account Name', 'Account Type', 'Email', 'Release Artist', 'Release', 'Purpose', 'Type', 'Plan', 'Status', 'Gateway', 'Amount', 'Currency', 'Paid At', 'Created At', 'Updated At'],
      ...rows,
    ]
      .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const filteredPayments = useMemo(() => {
    const term = query.trim().toLowerCase();

    return payments.filter((payment) => {
      if (!isWithinDateRange(payment)) {
        return false;
      }

      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }

      if (purposeFilter !== 'all' && payment.purpose !== purposeFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        payment.reference.toLowerCase().includes(term)
        || payment.email.toLowerCase().includes(term)
        || payment.description.toLowerCase().includes(term)
      );
    });
  }, [payments, statusFilter, purposeFilter, query, dateRange]);

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalInflow = filteredPayments
    .filter((payment) => payment.type !== 'payout')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalOutflow = filteredPayments
    .filter((payment) => payment.type === 'payout')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const netFlow = totalInflow - totalOutflow;
  const completedInflow = filteredPayments
    .filter((payment) => payment.status === 'completed' && payment.type !== 'payout')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const completedOutflow = filteredPayments
    .filter((payment) => payment.status === 'completed' && payment.type === 'payout')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingCount = filteredPayments.filter((payment) => payment.status === 'pending').length;
  const completedCount = filteredPayments.filter((payment) => payment.status === 'completed').length;
  const failedCount = filteredPayments.filter((payment) => payment.status === 'failed').length;
  const paystackCount = filteredPayments.filter((payment) => payment.provider === 'paystack').length;
  const internalCount = filteredPayments.filter((payment) => payment.provider === 'internal').length;
  const settledRate = filteredPayments.length > 0
    ? Math.round((completedCount / filteredPayments.length) * 100)
    : 0;

  if (!canView) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
        You do not have permission to view payments.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Payments</h1>
        <p className="mt-2 text-sm text-[#A0A7B8]">
          Live payment records from Paystack and payout requests. Use Reconcile when a user was debited but the payment remains pending or failed in the dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-200">Total Inflow</p>
          <p className="mt-2 text-2xl font-bold text-cyan-100">N{totalInflow.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-orange-400/20 bg-orange-400/10 p-4">
          <p className="text-xs uppercase tracking-wide text-orange-200">Total Outflow</p>
          <p className="mt-2 text-2xl font-bold text-orange-100">N{totalOutflow.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-4">
          <p className="text-xs uppercase tracking-wide text-sky-200">Net Flow</p>
          <p className="mt-2 text-2xl font-bold text-sky-100">N{netFlow.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-200">Settled Rate</p>
          <p className="mt-2 text-2xl font-bold text-emerald-100">{settledRate}%</p>
          <p className="mt-1 text-xs text-emerald-200/80">{completedCount} of {filteredPayments.length} completed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
          <p className="text-xs uppercase tracking-wide text-[#A0A7B8]">Status Breakdown</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-amber-200">Pending: {pendingCount}</span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-200">Completed: {completedCount}</span>
            <span className="rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-1 text-rose-200">Failed: {failedCount}</span>
          </div>
        </div>
        <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
          <p className="text-xs uppercase tracking-wide text-[#A0A7B8]">Gateway Breakdown</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-cyan-200">Paystack: {paystackCount}</span>
            <span className="rounded-full border border-indigo-400/40 bg-indigo-400/10 px-3 py-1 text-indigo-200">Internal: {internalCount}</span>
            <span className="rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 text-teal-200">Completed Inflow: N{completedInflow.toLocaleString()}</span>
            <span className="rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 text-red-200">Completed Outflow: N{completedOutflow.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <label className="flex items-center gap-2 rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2 lg:col-span-2">
            <Search className="h-4 w-4 text-[#A0A7B8]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by reference, email, or description"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6D7385]"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            aria-label="Filter payments by status"
            className="rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={purposeFilter}
            onChange={(event) => setPurposeFilter(event.target.value as typeof purposeFilter)}
            aria-label="Filter payments by purpose"
            className="rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="all">All Purposes</option>
            <option value="release">Release / Distribution</option>
            <option value="marketing">Marketing / Promotion</option>
            <option value="payout">Payout</option>
          </select>

          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value as typeof dateRange)}
            aria-label="Filter payments by date range"
            className="rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button
            onClick={downloadCsv}
            className="rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-3 py-2 text-sm font-medium text-[#7DEFFF] transition hover:bg-[#00E5FF]/20"
          >
            Export CSV
          </button>
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {pageError}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#7B61FF]/20 bg-[#121826]">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#A0A7B8]">Reference</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#A0A7B8]">Account</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#A0A7B8]">Release Artist</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#A0A7B8]">Purpose</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#A0A7B8]">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#A0A7B8]">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#A0A7B8]">Gateway</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#A0A7B8]">Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#A0A7B8]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#A0A7B8]">Loading payments...</td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center">
                  <CreditCard className="mx-auto mb-2 h-8 w-8 text-[#6D7385]" />
                  <p className="text-sm text-[#A0A7B8]">No payments match the current filters.</p>
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.reference} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-xs text-[#DDE3F0]">{payment.reference}</td>
                  <td className="px-4 py-3 text-sm text-white">
                    <div className="flex flex-col gap-1">
                      <span>{payment.accountName || payment.email}</span>
                      <span className="text-xs uppercase tracking-wide text-[#A0A7B8]">{payment.accountRole || 'unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#DDE3F0]">
                    <div className="flex flex-col gap-1">
                      <span>{payment.releaseArtistName || '-'}</span>
                      <span className="text-xs text-[#A0A7B8]">{payment.releaseTitle || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#DDE3F0]">{purposeLabel(payment.purpose)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">N{payment.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${statusBadgeClass(payment.status)}`}>
                      {payment.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : payment.status === 'failed' ? <AlertTriangle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#A0A7B8]">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold uppercase tracking-wide text-[#DDE3F0]">{payment.provider}</span>
                      <span>{gatewayStateLabel(payment)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#A0A7B8]">{new Date(payment.paidAt || payment.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {canReconcile && payment.type === 'subscription' && payment.provider === 'paystack' && payment.status !== 'completed' ? (
                      <button
                        onClick={() => handleReconcile(payment.reference)}
                        disabled={busyReference === payment.reference}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-3 py-1.5 text-xs font-medium text-[#7DEFFF] transition hover:bg-[#00E5FF]/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${busyReference === payment.reference ? 'animate-spin' : ''}`} />
                        Reconcile
                      </button>
                    ) : (
                      <span className="text-xs text-[#6D7385]">No action</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
