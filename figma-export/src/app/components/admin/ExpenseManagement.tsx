import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, Download, RefreshCw, Receipt,
  TrendingDown, Tag, Calendar,
} from 'lucide-react';
import {
  getFinanceExpenses, createFinanceExpense, deleteFinanceExpense,
  type FinanceExpense,
} from '../../utils/admin-api';

// ── Helpers ────────────────────────────────────────────────────────────────
function formatNGN(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const CATEGORIES: FinanceExpense['category'][] = [
  'salaries', 'dsp_fees', 'infrastructure', 'marketing', 'legal', 'other',
];

const CATEGORY_LABELS: Record<FinanceExpense['category'], string> = {
  salaries: 'Salaries', dsp_fees: 'DSP Fees', infrastructure: 'Infrastructure',
  marketing: 'Marketing', legal: 'Legal', other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  salaries: 'bg-[#7B61FF]/20 text-[#7B61FF] border-[#7B61FF]/30',
  dsp_fees: 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/25',
  infrastructure: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25',
  marketing: 'bg-[#22D3A1]/10 text-[#22D3A1] border-[#22D3A1]/25',
  legal: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
  other: 'bg-[#A0A7B8]/10 text-[#A0A7B8] border-[#A0A7B8]/25',
};

const DOT_COLORS: Record<string, string> = {
  salaries: 'bg-[#7B61FF]', dsp_fees: 'bg-[#00E5FF]', infrastructure: 'bg-[#F59E0B]',
  marketing: 'bg-[#22D3A1]', legal: 'bg-rose-400', other: 'bg-[#A0A7B8]',
};

type Draft = { category: FinanceExpense['category']; description: string; amount: string; date: string };

// ── Spinner ───────────────────────────────────────────────────────────────
function Spinner() {
  return <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0F1A] border-t-[#7B61FF]" />;
}

// ── Main Component ─────────────────────────────────────────────────────────
export function ExpenseManagement() {
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formErr, setFormErr] = useState('');

  const [filterCat, setFilterCat] = useState<FinanceExpense['category'] | 'all'>('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');

  const [draft, setDraft] = useState<Draft>({
    category: 'other', description: '', amount: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setExpenses(await getFinanceExpenses()); }
    catch (e: any) { setError(e.message ?? 'Failed to load expenses'); }
    finally { setLoading(false); }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!draft.description.trim() || !draft.amount) return;
    setSaving(true); setFormErr('');
    try {
      const exp = await createFinanceExpense({
        category: draft.category,
        description: draft.description.trim(),
        amount: Number(draft.amount),
        date: draft.date,
      });
      setExpenses(prev => [exp, ...prev]);
      setDraft({ category: 'other', description: '', amount: '', date: new Date().toISOString().slice(0, 10) });
      setAdding(false);
    } catch (e: any) { setFormErr(e.message ?? 'Failed to save expense'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try { await deleteFinanceExpense(id); setExpenses(prev => prev.filter(e => e.id !== id)); }
    catch (e: any) { setError(e.message ?? 'Delete failed'); }
    finally { setDeletingId(null); }
  }

  const filtered = useMemo(() => expenses.filter(e => {
    if (filterCat !== 'all' && e.category !== filterCat) return false;
    if (filterFrom && e.date < filterFrom) return false;
    if (filterTo && e.date > filterTo) return false;
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [expenses, filterCat, filterFrom, filterTo, search]);

  const totalFiltered = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);
  const totalAll = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const byCategory = useMemo(() => CATEGORIES.map(cat => ({
    cat,
    label: CATEGORY_LABELS[cat],
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    count: expenses.filter(e => e.category === cat).length,
  })).filter(c => c.count > 0), [expenses]);

  function handleExport() {
    downloadCSV(
      [
        ['Date', 'Category', 'Description', 'Amount (NGN)', 'Recorded By'],
        ...filtered.map(e => [e.date, CATEGORY_LABELS[e.category], e.description, String(e.amount), e.createdBy ?? '']),
      ],
      `expenses-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="text-[#F59E0B]" size={22} />
            Expense Management
          </h1>
          <p className="text-sm text-[#A0A7B8] mt-1">Record and track operating costs — all data is live</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white hover:border-[#7B61FF]/50 text-xs transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white hover:border-[#7B61FF]/50 text-xs transition-colors disabled:opacity-40"
          >
            <Download size={13} />Export CSV
          </button>
          <button
            onClick={() => setAdding(a => !a)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-semibold transition-colors"
          >
            <Plus size={13} />{adding ? 'Cancel' : 'Add Expense'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-4">
          <p className="text-xs text-[#A0A7B8]">Total Expenses</p>
          <p className="mt-1 text-xl font-bold text-white">{formatNGN(totalAll)}</p>
          <p className="text-[10px] text-[#A0A7B8] mt-0.5">{expenses.length} records</p>
        </div>
        <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-4">
          <p className="text-xs text-[#A0A7B8]">Filtered Total</p>
          <p className="mt-1 text-xl font-bold text-[#F59E0B]">{formatNGN(totalFiltered)}</p>
          <p className="text-[10px] text-[#A0A7B8] mt-0.5">{filtered.length} shown</p>
        </div>
        <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-4">
          <p className="text-xs text-[#A0A7B8]">Categories</p>
          <p className="mt-1 text-xl font-bold text-[#00E5FF]">{byCategory.length}</p>
          <p className="text-[10px] text-[#A0A7B8] mt-0.5">active categories</p>
        </div>
        <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-4">
          <p className="text-xs text-[#A0A7B8]">Top Category</p>
          {byCategory.length > 0 ? (
            <>
              <p className="mt-1 text-xl font-bold text-[#22D3A1]">
                {CATEGORY_LABELS[byCategory.sort((a, b) => b.total - a.total)[0].cat]}
              </p>
              <p className="text-[10px] text-[#A0A7B8] mt-0.5">
                {formatNGN(byCategory[0].total)}
              </p>
            </>
          ) : <p className="mt-1 text-xl font-bold text-[#A0A7B8]">—</p>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {/* Add Expense Form */}
          {adding && (
            <div className="rounded-xl border border-[#7B61FF]/30 bg-[#0B0F1A] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">New Expense Entry</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[#A0A7B8] block mb-1">Category</label>
                  <select
                    value={draft.category}
                    onChange={e => setDraft(d => ({ ...d, category: e.target.value as FinanceExpense['category'] }))}
                    aria-label="Expense category"
                    className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs px-3 py-2 focus:outline-none focus:border-[#7B61FF]/60"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#A0A7B8] block mb-1">Date</label>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                    aria-label="Expense date"
                    className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs px-3 py-2 focus:outline-none focus:border-[#7B61FF]/60"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#A0A7B8] block mb-1">Description</label>
                <input
                  type="text"
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="e.g. AWS monthly server costs"
                  aria-label="Expense description"
                  className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs px-3 py-2 focus:outline-none focus:border-[#7B61FF]/60"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#A0A7B8] block mb-1">Amount (₦)</label>
                <input
                  type="number"
                  value={draft.amount}
                  onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
                  placeholder="0"
                  min={0}
                  aria-label="Expense amount in NGN"
                  className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs px-3 py-2 focus:outline-none focus:border-[#7B61FF]/60"
                />
              </div>
              {formErr && <p className="text-xs text-rose-400">{formErr}</p>}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setAdding(false); setFormErr(''); }}
                  className="px-4 py-2 rounded-lg border border-[#7B61FF]/20 text-[#A0A7B8] text-xs hover:text-white transition-colors"
                >Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !draft.description.trim() || !draft.amount}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  {saving ? <Spinner /> : null}Save Expense
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search description…"
              aria-label="Search expenses"
              className="rounded-lg border border-[#7B61FF]/20 bg-[#121826] text-[#E2E8F0] text-xs px-3 py-2 w-48 focus:outline-none focus:border-[#7B61FF]/50"
            />
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value as FinanceExpense['category'] | 'all')}
              aria-label="Filter by category"
              className="rounded-lg border border-[#7B61FF]/20 bg-[#121826] text-[#E2E8F0] text-xs px-3 py-2 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-[#A0A7B8]" />
              <input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                aria-label="From date"
                className="rounded-lg border border-[#7B61FF]/20 bg-[#121826] text-[#E2E8F0] text-xs px-2 py-2 focus:outline-none"
              />
              <span className="text-[#A0A7B8] text-xs">–</span>
              <input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                aria-label="To date"
                className="rounded-lg border border-[#7B61FF]/20 bg-[#121826] text-[#E2E8F0] text-xs px-2 py-2 focus:outline-none"
              />
            </div>
            {(search || filterCat !== 'all' || filterFrom || filterTo) && (
              <button
                onClick={() => { setSearch(''); setFilterCat('all'); setFilterFrom(''); setFilterTo(''); }}
                className="text-xs text-[#A0A7B8] hover:text-white transition-colors"
              >Clear filters</button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#A0A7B8]">
                {expenses.length === 0 ? 'No expenses recorded yet. Add your first entry above.' : 'No expenses match the current filters.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#7B61FF]/10">
                      {['Date', 'Category', 'Description', 'Amount', 'Recorded By', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#A0A7B8]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#7B61FF]/10">
                    {filtered.map(e => (
                      <tr key={e.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3 text-xs text-[#A0A7B8] whitespace-nowrap">{fmtDate(e.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.other}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[e.category] ?? 'bg-[#A0A7B8]'}`} />
                            {CATEGORY_LABELS[e.category] ?? e.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#E2E8F0] max-w-xs truncate">{e.description}</td>
                        <td className="px-4 py-3 text-sm font-bold text-rose-400 whitespace-nowrap">{formatNGN(e.amount)}</td>
                        <td className="px-4 py-3 text-xs text-[#A0A7B8]">{e.createdBy ?? '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={deletingId === e.id}
                            aria-label={`Delete expense: ${e.description}`}
                            className="text-[#A0A7B8] hover:text-rose-400 transition-colors disabled:opacity-40"
                          >
                            {deletingId === e.id ? <Spinner /> : <Trash2 size={14} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#7B61FF]/20 bg-[#0B0F1A]">
                      <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-[#A0A7B8]">
                        {filtered.length} records shown
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-rose-400 whitespace-nowrap">
                        {formatNGN(totalFiltered)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar – category breakdown */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Tag size={14} className="text-[#7B61FF]" />Breakdown by Category
            </h3>
            {loading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : byCategory.length === 0 ? (
              <p className="text-xs text-[#A0A7B8] text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-3">
                {byCategory.sort((a, b) => b.total - a.total).map(c => {
                  const pct = totalAll > 0 ? (c.total / totalAll) * 100 : 0;
                  return (
                    <div key={c.cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${DOT_COLORS[c.cat] ?? 'bg-[#A0A7B8]'}`} />
                          <span className="text-xs text-[#E2E8F0]">{c.label}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{formatNGN(c.total)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#0B0F1A] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${DOT_COLORS[c.cat] ?? 'bg-[#A0A7B8]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[10px] text-[#A0A7B8]">{c.count} entries</span>
                        <span className="text-[10px] text-[#A0A7B8]">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#7B61FF]/15 bg-[#121826] p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <TrendingDown size={14} className="text-rose-400" />Total Spend
            </h3>
            <p className="text-2xl font-bold text-rose-400">{formatNGN(totalAll)}</p>
            <p className="text-xs text-[#A0A7B8] mt-1">across all recorded expenses</p>
          </div>
        </div>
      </div>
    </div>
  );
}
