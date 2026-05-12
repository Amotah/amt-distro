import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ArrowDownRight, ArrowUpRight,
  Wallet, CreditCard, RefreshCw, AlertTriangle, BarChart3,
  Download, FileText, CheckCircle2, Banknote, Building2,
  Users, Plus, Trash2, X, ChevronDown, Activity,
} from 'lucide-react';
import {
  getFinanceDashboard, getFinanceExpenses, createFinanceExpense, deleteFinanceExpense,
  downloadFinanceStatements,
  type FinanceDashboardData, type FinanceExpense,
} from '../../utils/admin-api';

// ── Design constants ──────────────────────────────────────────────────────────
const CHART_STYLE = { fontSize: 11 };
const TOOLTIP_STYLE = { backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.3)', borderRadius: 8, fontSize: 11 };
const TOOLTIP_CURSOR = { fill: 'rgba(123,97,255,0.08)' };

const DSP_COLORS: Record<string, string> = {
  spotify:       '#22D3A1',
  apple_music:   '#F43F5E',
  apple:         '#F43F5E',
  youtube_music: '#F59E0B',
  youtube:       '#F59E0B',
  deezer:        '#7B61FF',
  tidal:         '#00E5FF',
  amazon_music:  '#F59E0B',
  amazon:        '#F59E0B',
  subscriptions: '#A78BFA',
};

const EXP_COLORS: Record<string, string> = {
  salaries:       '#7B61FF',
  dsp_fees:       '#00E5FF',
  infrastructure: '#F59E0B',
  marketing:      '#22D3A1',
  legal:          '#F43F5E',
  other:          '#A0A7B8',
};

const PIE_FALLBACK = ['#7B61FF', '#00E5FF', '#22D3A1', '#F59E0B', '#F43F5E', '#A78BFA', '#38BDF8', '#34D399'];

// Pre-declared Tailwind class maps (no inline styles)
const DSP_DOT_CLS: Record<string, string> = {
  spotify:       'bg-[#22D3A1]',
  apple_music:   'bg-[#F43F5E]',
  apple:         'bg-[#F43F5E]',
  youtube_music: 'bg-[#F59E0B]',
  youtube:       'bg-[#F59E0B]',
  deezer:        'bg-[#7B61FF]',
  tidal:         'bg-[#00E5FF]',
  amazon_music:  'bg-[#F59E0B]',
  amazon:        'bg-[#F59E0B]',
  subscriptions: 'bg-[#A78BFA]',
};

const EXP_DOT_CLS: Record<string, string> = {
  salaries:       'bg-[#7B61FF]',
  dsp_fees:       'bg-[#00E5FF]',
  infrastructure: 'bg-[#F59E0B]',
  marketing:      'bg-[#22D3A1]',
  legal:          'bg-[#F43F5E]',
  other:          'bg-[#A0A7B8]',
};

const EXP_CATEGORY_LABELS: Record<string, string> = {
  salaries: 'Salaries', dsp_fees: 'DSP Fees', infrastructure: 'Infrastructure',
  marketing: 'Marketing', legal: 'Legal', other: 'Other',
};
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatNGN(v: number, compact = false): string {
  if (compact) {
    if (Math.abs(v) >= 1_000_000_000) return `₦${(v / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(v) >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `₦${(v / 1_000).toFixed(0)}K`;
    return `₦${Math.round(v).toLocaleString()}`;
  }
  return `₦${Math.round(v).toLocaleString()}`;
}

function pct(v: number): string {
  const sign = v >= 0 ? '' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function shortMonth(m: string): string {
  // m could be "2025-01" or "01"
  const idx = parseInt(m.slice(-2), 10) - 1;
  return MONTH_LABELS[idx] ?? m;
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[#7B61FF]/20 bg-[#121826] ${className}`}>{children}</div>;
}

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-7 h-7';
  return <div className={`${cls} border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin`} />;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/8 px-4 py-3 text-sm text-[#F43F5E]">
      <AlertTriangle size={14} className="flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="text-xs underline hover:no-underline">Retry</button>}
    </div>
  );
}

function PeriodBadge({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${active ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white'}`}>
      {label}
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
type KPIPeriod = 'mtd' | 'ytd' | 'allTime';

interface KPICardProps {
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  values: { mtd?: number; ytd?: number; allTime?: number } | { single: number };
  subLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'pct';
}

function KPICard({ title, icon: Icon, color, bgColor, values, subLabel, trend }: KPICardProps) {
  const [period, setPeriod] = useState<KPIPeriod>('ytd');
  const hasPeriods = 'mtd' in values;
  const raw = hasPeriods
    ? (values as any)[period] ?? 0
    : (values as any).single ?? 0;
  const isNeg = raw < 0;

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`rounded-xl p-2 ${bgColor}`}>
          <Icon size={16} className={color} />
        </div>
        {hasPeriods && (
          <div className="flex items-center gap-0.5">
            <PeriodBadge label="MTD" active={period === 'mtd'} onClick={() => setPeriod('mtd')} />
            <PeriodBadge label="YTD" active={period === 'ytd'} onClick={() => setPeriod('ytd')} />
            {(values as any).allTime !== undefined && <PeriodBadge label="All" active={period === 'allTime'} onClick={() => setPeriod('allTime')} />}
          </div>
        )}
      </div>
      <div>
        <div className={`text-2xl font-bold tracking-tight ${isNeg ? 'text-[#F43F5E]' : 'text-white'}`}>
          {formatNGN(raw, true)}
        </div>
        <div className="text-xs text-[#A0A7B8] mt-0.5 flex items-center gap-1">
          {trend === 'up' && <ArrowUpRight size={11} className="text-[#22D3A1]" />}
          {trend === 'down' && <ArrowDownRight size={11} className="text-[#F43F5E]" />}
          {title}
        </div>
        {subLabel && <div className="text-[10px] text-[#A0A7B8] mt-0.5">{subLabel}</div>}
      </div>
    </Card>
  );
}

// ── Quick Metric ──────────────────────────────────────────────────────────────
function QuickMetric({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-[#0B0F1A] border border-[#7B61FF]/15">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-medium text-[#E2E8F0]">{label}</div>
      <div className="text-[10px] text-[#A0A7B8]">{sub}</div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#7B61FF]/30 bg-[#0B0F1A] p-3 text-[10px] shadow-2xl min-w-[160px]">
      <div className="font-semibold text-white mb-1.5">{shortMonth(label || '')} {String(label || '').slice(0, 4)}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5 text-[#A0A7B8]">
            <svg width="8" height="8"><circle cx="4" cy="4" r="4" fill={p.color} /></svg>
            <span className="capitalize">{p.name}</span>
          </span>
          <span className="font-semibold text-white">{formatNGN(p.value, true)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-[#7B61FF]/30 bg-[#0B0F1A] p-3 text-[10px] shadow-2xl">
      <div className="font-semibold text-white capitalize mb-0.5">{(p.name as string).replace(/_/g, ' ')}</div>
      <div className="text-[#A0A7B8]">{formatNGN(p.value, true)} <span className="text-[#7B61FF]">({p.payload.pct}%)</span></div>
    </div>
  );
}

function WaterfallTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="rounded-xl border border-[#7B61FF]/30 bg-[#0B0F1A] p-3 text-[10px] shadow-2xl">
      <div className="font-semibold text-white mb-0.5">{label}</div>
      <div className={item.type === 'negative' ? 'text-[#F43F5E]' : item.type === 'total' ? 'text-[#7B61FF]' : 'text-[#22D3A1]'}>
        {item.type === 'negative' ? '−' : '+'}{formatNGN(Math.abs(item.value), true)}
      </div>
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────
function RevenueTrendChart({ data }: { data: FinanceDashboardData['charts']['revenueTrend'] }) {
  const [view, setView] = useState<'all' | 'net'>('all');
  const formatted = data.map(d => ({ ...d, label: shortMonth(d.month) }));
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Revenue Trend</h3>
          <p className="text-xs text-[#A0A7B8] mt-0.5">Last 12 months</p>
        </div>
        <div className="flex gap-1">
          {(['all', 'net'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${view === v ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white border border-[#7B61FF]/20'}`}>
              {v === 'all' ? 'Full View' : 'Net Income'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} style={CHART_STYLE}>
          <defs>
            <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22D3A1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22D3A1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gPay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#A0A7B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => formatNGN(v, true)} tick={{ fill: '#A0A7B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<RevenueTooltip />} cursor={TOOLTIP_CURSOR} />
          <Legend wrapperStyle={{ fontSize: 10, color: '#A0A7B8' }} />
          {view === 'all' ? (
            <>
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7B61FF" strokeWidth={2} fill="url(#gRev)" dot={false} />
              <Area type="monotone" dataKey="payouts" name="Payouts" stroke="#F43F5E" strokeWidth={1.5} fill="url(#gPay)" dot={false} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#F59E0B" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
            </>
          ) : (
            <Area type="monotone" dataKey="netIncome" name="Net Income" stroke="#22D3A1" strokeWidth={2} fill="url(#gNet)" dot={false} />
          )}
          {view === 'net' && <ReferenceLine y={0} stroke="rgba(244,63,94,0.5)" strokeDasharray="3 3" />}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

function RevCompositionChart({ data }: { data: FinanceDashboardData['charts']['revenueComposition'] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const enriched = data.map(d => ({ ...d, name: d.platform, pct: total > 0 ? ((d.revenue / total) * 100).toFixed(1) : '0' }));
  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-white mb-1">Revenue Composition</h3>
      <p className="text-xs text-[#A0A7B8] mb-4">By source (all-time)</p>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-xs text-[#A0A7B8]">No DSP revenue data yet</div>
      ) : (
        <div className="flex items-center gap-4 flex-wrap">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={enriched} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="revenue">
                {enriched.map((entry, i) => (
                  <Cell key={entry.platform} fill={DSP_COLORS[entry.platform] ?? PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 min-w-[120px] space-y-1.5">
            {enriched.slice(0, 8).map((d, i) => (
              <div key={d.platform} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DSP_DOT_CLS[d.platform] ?? 'bg-[#A0A7B8]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] text-[#E2E8F0] capitalize truncate">{d.platform.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-[#A0A7B8] whitespace-nowrap">{d.pct}%</span>
                  </div>
                  <svg className="w-full mt-0.5" height="4">
                    <rect x="0" y="0" width="100%" height="4" rx="2" fill="rgba(123,97,255,0.15)" />
                    <rect x="0" y="0" width={`${d.pct}%`} height="4" rx="2" fill={DSP_COLORS[d.platform] ?? PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function ExpenseBreakdownChart({ data }: { data: FinanceDashboardData['charts']['expenseBreakdown'] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  const enriched = data.map(d => ({ ...d, name: d.category, pct: total > 0 ? ((d.amount / total) * 100).toFixed(1) : '0' }));
  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-white mb-1">Expense Breakdown</h3>
      <p className="text-xs text-[#A0A7B8] mb-4">Operating cost distribution</p>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-xs text-[#A0A7B8]">No expense data recorded yet</div>
      ) : (
        <div className="flex items-center gap-4 flex-wrap">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={enriched} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="amount">
                {enriched.map((entry, i) => (
                  <Cell key={entry.category} fill={EXP_COLORS[entry.category] ?? PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 min-w-[120px] space-y-1.5">
            {enriched.map((d, i) => (
              <div key={d.category} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${EXP_DOT_CLS[d.category] ?? 'bg-[#A0A7B8]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] text-[#E2E8F0] capitalize truncate">{EXP_CATEGORY_LABELS[d.category] ?? d.category}</span>
                    <span className="text-[10px] text-[#A0A7B8] whitespace-nowrap">{d.pct}%</span>
                  </div>
                  <svg className="w-full mt-0.5" height="4">
                    <rect x="0" y="0" width="100%" height="4" rx="2" fill="rgba(123,97,255,0.15)" />
                    <rect x="0" y="0" width={`${d.pct}%`} height="4" rx="2" fill={EXP_COLORS[d.category] ?? PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function CashFlowWaterfall({ data }: { data: FinanceDashboardData['charts']['cashFlowWaterfall'] }) {
  const chartData = data.map(d => ({
    ...d,
    invisible: d.type === 'total' ? 0 : d.base,
    barValue: d.type === 'total' ? Math.abs(d.value) : d.value,
    fill: d.type === 'total' ? '#7B61FF' : d.type === 'positive' ? '#22D3A1' : '#F43F5E',
  }));

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-white mb-1">Cash Flow Waterfall</h3>
      <p className="text-xs text-[#A0A7B8] mb-4">YTD: inflows → outflows → net balance</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} style={CHART_STYLE} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#A0A7B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => formatNGN(v, true)} tick={{ fill: '#A0A7B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<WaterfallTooltip />} cursor={TOOLTIP_CURSOR} />
          {/* Invisible spacer bar to create waterfall effect */}
          <Bar dataKey="invisible" stackId="wf" fill="transparent" legendType="none" />
          <Bar dataKey="barValue" name="Amount" stackId="wf" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#22D3A1]" /><span className="text-[10px] text-[#A0A7B8]">Inflow</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#F43F5E]" /><span className="text-[10px] text-[#A0A7B8]">Outflow</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#7B61FF]" /><span className="text-[10px] text-[#A0A7B8]">Net</span></div>
      </div>
    </Card>
  );
}

function YoYChart({ data }: { data: FinanceDashboardData['charts']['yoyComparison'] }) {
  const formatted = data.map(d => ({ ...d, label: MONTH_LABELS[parseInt(d.month, 10) - 1] ?? d.month }));
  const year = new Date().getFullYear();
  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-white mb-1">Year-over-Year Revenue</h3>
      <p className="text-xs text-[#A0A7B8] mb-4">{year} vs {year - 1}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} style={CHART_STYLE} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,97,255,0.1)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#A0A7B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => formatNGN(v, true)} tick={{ fill: '#A0A7B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<RevenueTooltip />} cursor={TOOLTIP_CURSOR} />
          <Legend wrapperStyle={{ fontSize: 10, color: '#A0A7B8' }} />
          <Bar dataKey="current" name={String(year)} fill="#7B61FF" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="previous" name={String(year - 1)} fill="rgba(123,97,255,0.35)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Expense Manager ───────────────────────────────────────────────────────────
type ExpenseDraft = { category: FinanceExpense['category']; description: string; amount: string; date: string };

function ExpenseManager({ onRefresh }: { onRefresh: () => void }) {
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft>({ category: 'other', description: '', amount: '', date: new Date().toISOString().slice(0, 10) });
  const [err, setErr] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setExpenses(await getFinanceExpenses()); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!draft.description || !draft.amount) return;
    setSaving(true); setErr('');
    try {
      const exp = await createFinanceExpense({ category: draft.category, description: draft.description, amount: Number(draft.amount), date: draft.date });
      setExpenses(prev => [exp, ...prev]);
      setDraft({ category: 'other', description: '', amount: '', date: new Date().toISOString().slice(0, 10) });
      setAdding(false);
      onRefresh();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try { await deleteFinanceExpense(id); setExpenses(prev => prev.filter(e => e.id !== id)); onRefresh(); }
    catch (e) { setErr((e as Error).message); }
    finally { setDeletingId(null); }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Operating Expenses</h3>
          <p className="text-xs text-[#A0A7B8] mt-0.5">Record salaries, infrastructure, DSP fees and other costs</p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#7B61FF]/15 border border-[#7B61FF]/30 text-[#7B61FF] hover:bg-[#7B61FF]/25 text-xs font-semibold transition-colors">
          <Plus size={13} />{adding ? 'Cancel' : 'Add Expense'}
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-[#7B61FF]/20 bg-[#0B0F1A] p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#A0A7B8] block mb-1">Category</label>
              <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value as FinanceExpense['category'] }))}
                aria-label="Expense category" title="Expense category"
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs px-2.5 py-2 focus:outline-none">
                {Object.entries(EXP_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#A0A7B8] block mb-1">Date</label>
              <input type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                title="Expense date" className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs px-2.5 py-2 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#A0A7B8] block mb-1">Description</label>
            <input type="text" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="e.g. Monthly server costs" title="Expense description"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs px-2.5 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-[#A0A7B8] block mb-1">Amount (NGN)</label>
            <input type="number" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
              placeholder="0" min={0} title="Expense amount in NGN"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs px-2.5 py-2 focus:outline-none" />
          </div>
          {err && <p className="text-xs text-[#F43F5E]">{err}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg border border-[#7B61FF]/20 text-[#A0A7B8] text-xs hover:text-white transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !draft.description || !draft.amount}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-semibold disabled:opacity-50 transition-colors">
              {saving ? <Spinner size="sm" /> : null}Save Expense
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-8 text-xs text-[#A0A7B8]">No expenses recorded yet. Add your first expense above.</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {expenses.map(e => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/10 px-3 py-2.5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${EXP_DOT_CLS[e.category] ?? 'bg-[#A0A7B8]'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#E2E8F0] font-medium truncate">{e.description}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7B61FF]/10 text-[#A0A7B8] capitalize whitespace-nowrap">{EXP_CATEGORY_LABELS[e.category] ?? e.category}</span>
                </div>
                <div className="text-[10px] text-[#A0A7B8] mt-0.5">{e.date} · by {e.createdBy}</div>
              </div>
              <div className="text-sm font-bold text-[#F43F5E] whitespace-nowrap">{formatNGN(e.amount, true)}</div>
              <button onClick={() => handleDelete(e.id)} disabled={deletingId === e.id} title="Delete expense"
                className="text-[#A0A7B8] hover:text-[#F43F5E] transition-colors disabled:opacity-40 flex-shrink-0">
                {deletingId === e.id ? <Spinner size="sm" /> : <Trash2 size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions() {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadFinanceStatements();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  }

  const actions = [
    { icon: Download, label: 'Download Trial Balance', sub: 'Export as CSV', onClick: handleDownload, loading: downloading, color: 'text-[#7B61FF]', bg: 'bg-[#7B61FF]/10 border-[#7B61FF]/25' },
    { icon: FileText, label: 'Financial Statements', sub: 'P&L, Balance Sheet', onClick: () => { window.open('/admin/revenue', '_self'); }, color: 'text-[#00E5FF]', bg: 'bg-[#00E5FF]/10 border-[#00E5FF]/25' },
    { icon: Building2, label: 'Bank Reconciliation', sub: 'Match transactions', onClick: () => { window.open('/admin/bank-reconciliation', '_self'); }, color: 'text-[#22D3A1]', bg: 'bg-[#22D3A1]/10 border-[#22D3A1]/25' },
    { icon: CheckCircle2, label: 'Expense Approvals', sub: 'View all expenses', onClick: () => { window.open('/admin/expenses', '_self'); }, color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/25' },
    { icon: Users, label: 'Payroll', sub: 'Staff salary management', onClick: () => { window.open('/admin/payroll', '_self'); }, color: 'text-[#F43F5E]', bg: 'bg-[#F43F5E]/10 border-[#F43F5E]/25' },
  ];

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-white mb-4">Quick Actions</h3>
      <div className="space-y-2">
        {actions.map(a => (
          <button key={a.label} onClick={a.onClick}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border ${a.bg} hover:opacity-90 transition-all text-left`}>
            <div className={`flex-shrink-0 ${a.color}`}>
              {a.loading ? <RefreshCw size={16} className="animate-spin" /> : <a.icon size={16} />}
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${a.color}`}>{a.label}</div>
              <div className="text-[10px] text-[#A0A7B8] mt-0.5">{a.sub}</div>
            </div>
            <ChevronDown size={12} className="ml-auto text-[#A0A7B8] -rotate-90" />
          </button>
        ))}
      </div>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function FinancialDashboard() {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setErr('');
    try {
      const d = await getFinanceDashboard();
      setData(d);
      setLastRefreshed(new Date());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 5 minutes
    intervalRef.current = setInterval(() => load(true), 5 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner />
        <p className="text-xs text-[#A0A7B8]">Loading financial data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Financial Dashboard</h1>
          <p className="text-xs text-[#A0A7B8] mt-0.5">
            Real-time revenue, payouts, and business health metrics
            {lastRefreshed && (
              <span className="ml-2 text-[#7B61FF]">· Updated {lastRefreshed.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.meta && (
            <div className="hidden md:flex items-center gap-1 text-[10px] text-[#A0A7B8] px-3 py-1.5 rounded-lg border border-[#7B61FF]/15 bg-[#121826]">
              <Activity size={11} className="text-[#7B61FF]" />
              {data.meta.dataRange.billingRecords} subs · {data.meta.dataRange.royaltyBatches} batches · {data.meta.dataRange.payouts} payouts
            </div>
          )}
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#A0A7B8] hover:text-white text-xs transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {err && <ErrorBanner message={err} onRetry={() => load()} />}

      {data && (
        <>
          {/* ── KPI Cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard title="Total Revenue" icon={TrendingUp} color="text-[#7B61FF]" bgColor="bg-[#7B61FF]/20"
              values={{ mtd: data.kpis.totalRevenue.mtd, ytd: data.kpis.totalRevenue.ytd, allTime: data.kpis.totalRevenue.allTime }}
              subLabel="DSP + subscription income" trend="up" />
            <KPICard title="Artist Payouts" icon={Wallet} color="text-[#F43F5E]" bgColor="bg-[#F43F5E]/20"
              values={{ mtd: data.kpis.artistPayouts.mtd, ytd: data.kpis.artistPayouts.ytd, allTime: data.kpis.artistPayouts.allTime }}
              subLabel="Distributed to artists" trend="down" />
            <KPICard title="Platform Net Revenue" icon={DollarSign} color="text-[#22D3A1]" bgColor="bg-[#22D3A1]/20"
              values={{ mtd: data.kpis.platformNetRevenue.mtd, ytd: data.kpis.platformNetRevenue.ytd }}
              subLabel="Revenue minus artist payouts" trend="up" />
            <KPICard title="Operating Expenses" icon={CreditCard} color="text-[#F59E0B]" bgColor="bg-[#F59E0B]/20"
              values={{ mtd: data.kpis.operatingExpenses.mtd, ytd: data.kpis.operatingExpenses.ytd, allTime: data.kpis.operatingExpenses.allTime }}
              subLabel="Staff, DSP fees, infra" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard title="Net Income / Profit" icon={BarChart3} color="text-[#00E5FF]" bgColor="bg-[#00E5FF]/20"
              values={{ mtd: data.kpis.netIncome.mtd, ytd: data.kpis.netIncome.ytd, allTime: data.kpis.netIncome.allTime }}
              subLabel="Revenue minus all costs" trend={data.kpis.netIncome.ytd >= 0 ? 'up' : 'down'} />
            <Card className="p-4 flex flex-col gap-3">
              <div className="rounded-xl p-2 bg-[#7B61FF]/20 w-fit">
                <Activity size={16} className="text-[#7B61FF]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{formatNGN(data.kpis.cashFlow.net, true)}</div>
                <div className="text-xs text-[#A0A7B8] mt-0.5">Cash Flow (YTD Net)</div>
                <div className="flex gap-3 mt-1.5">
                  <div className="text-[10px]"><span className="text-[#22D3A1]">↑ {formatNGN(data.kpis.cashFlow.inflows, true)}</span><span className="text-[#A0A7B8] ml-1">in</span></div>
                  <div className="text-[10px]"><span className="text-[#F43F5E]">↓ {formatNGN(data.kpis.cashFlow.outflows, true)}</span><span className="text-[#A0A7B8] ml-1">out</span></div>
                </div>
              </div>
            </Card>
            <Card className="p-4 flex flex-col gap-3">
              <div className="rounded-xl p-2 bg-[#00E5FF]/20 w-fit">
                <ArrowUpRight size={16} className="text-[#00E5FF]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{formatNGN(data.kpis.accountsReceivable, true)}</div>
                <div className="text-xs text-[#A0A7B8] mt-0.5">Accounts Receivable</div>
                <div className="text-[10px] text-[#A0A7B8] mt-0.5">Pending from DSPs</div>
              </div>
            </Card>
            <Card className="p-4 flex flex-col gap-3">
              <div className="rounded-xl p-2 bg-[#F59E0B]/20 w-fit">
                <Banknote size={16} className="text-[#F59E0B]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{formatNGN(data.kpis.accountsPayable, true)}</div>
                <div className="text-xs text-[#A0A7B8] mt-0.5">Accounts Payable</div>
                <div className="text-[10px] text-[#A0A7B8] mt-0.5">Pending artist payouts</div>
              </div>
            </Card>
          </div>

          {/* ── Quick Metrics ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickMetric label="Gross Margin" value={pct(data.quickMetrics.grossMarginPct)}
              sub="(Revenue − Payouts) / Revenue"
              color={data.quickMetrics.grossMarginPct >= 30 ? 'text-[#22D3A1]' : data.quickMetrics.grossMarginPct >= 10 ? 'text-[#F59E0B]' : 'text-[#F43F5E]'} />
            <QuickMetric label="Operating Margin" value={pct(data.quickMetrics.operatingMarginPct)}
              sub="(Revenue − All Costs) / Revenue"
              color={data.quickMetrics.operatingMarginPct >= 15 ? 'text-[#22D3A1]' : data.quickMetrics.operatingMarginPct >= 0 ? 'text-[#F59E0B]' : 'text-[#F43F5E]'} />
            <QuickMetric label="Avg Transaction Value" value={formatNGN(data.quickMetrics.avgTransactionValue, true)}
              sub="Total Revenue / Total Transactions" color="text-[#7B61FF]" />
            <QuickMetric label="Artist Payout Ratio" value={pct(data.quickMetrics.payoutRatioPct)}
              sub="Total Payouts / Total Revenue"
              color={data.quickMetrics.payoutRatioPct <= 80 ? 'text-[#22D3A1]' : 'text-[#F43F5E]'} />
          </div>

          {/* ── Revenue Trend + Composition ────────────────────────── */}
          <RevenueTrendChart data={data.charts.revenueTrend} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RevCompositionChart data={data.charts.revenueComposition} />
            <ExpenseBreakdownChart data={data.charts.expenseBreakdown} />
          </div>

          {/* ── Waterfall + YoY ────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <CashFlowWaterfall data={data.charts.cashFlowWaterfall} />
            <YoYChart data={data.charts.yoyComparison} />
          </div>

          {/* ── Expense Manager + Quick Actions ───────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <ExpenseManager onRefresh={() => load(true)} />
            </div>
            <QuickActions />
          </div>

          {/* Footer metadata */}
          <div className="flex items-center justify-between text-[10px] text-[#A0A7B8] px-1 pb-4">
            <span>Data as of {new Date(data.meta.generatedAt).toLocaleString()} · Currency: {data.meta.currency}</span>
            <span>Auto-refresh every 5 min</span>
          </div>
        </>
      )}
    </div>
  );
}
