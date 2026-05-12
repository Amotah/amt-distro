import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, AlertOctagon, CheckCircle2, XCircle, Flag, ShieldAlert,
  Copyright, Copy, FileWarning, ClipboardList, RefreshCw, Plus, Search,
  ChevronDown, MoreHorizontal, Music2, Gavel, Scale, Eye, Download,
  ArrowUpRight, Clock, CheckCheck, Ban, Filter,
} from 'lucide-react';
import {
  getModerationFlags, createModerationFlag, updateModerationFlag,
  getCopyrightClaims, createCopyrightClaim, updateCopyrightClaim,
  getModerationDuplicates, decideDuplicate,
  getExplicitContentQueue, reviewExplicitContent,
  getMetadataAlerts, resolveMetadataAlert,
  getModerationAuditLogs, getComplianceReport,
  type ModerationFlag, type CopyrightClaim, type DuplicateRecord,
  type ExplicitContentItem, type MetadataAlert, type ModerationAuditLog,
  type ComplianceReport, type FlagReason, type FlagSeverity, type FlagStatus,
} from '../../utils/admin-api';

// ── Palette / classes ─────────────────────────────────────────────────────────
const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30',
  high:     'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
  low:      'bg-[#A0A7B8]/15 text-[#A0A7B8] border border-[#A0A7B8]/30',
};
const STATUS_BADGE: Record<string, string> = {
  pending:              'bg-[#F59E0B]/15 text-[#F59E0B]',
  pending_review:       'bg-[#F59E0B]/15 text-[#F59E0B]',
  resolved:             'bg-[#22D3A1]/15 text-[#22D3A1]',
  confirmed:            'bg-[#22D3A1]/15 text-[#22D3A1]',
  compliant:            'bg-[#22D3A1]/15 text-[#22D3A1]',
  cleared:              'bg-[#22D3A1]/15 text-[#22D3A1]',
  taken_down:           'bg-[#F43F5E]/15 text-[#F43F5E]',
  confirmed_duplicate:  'bg-[#F43F5E]/15 text-[#F43F5E]',
  flag_removed:         'bg-[#7B61FF]/15 text-[#7B61FF]',
  label_update_required:'bg-[#F59E0B]/15 text-[#F59E0B]',
  escalated:            'bg-[#F43F5E]/15 text-[#F43F5E]',
  approved:             'bg-[#F43F5E]/15 text-[#F43F5E]',
  disputed:             'bg-[#F59E0B]/15 text-[#F59E0B]',
  fix_requested:        'bg-[#F59E0B]/15 text-[#F59E0B]',
};
const REASON_LABEL: Record<string, string> = {
  copyright:           'Copyright',
  explicit_content:    'Explicit Content',
  metadata_incomplete: 'Metadata Incomplete',
  duplicate:           'Duplicate',
  malicious_content:   'Malicious Content',
};

// ── Shared helpers ────────────────────────────────────────────────────────────
function Badge({ text, cls = '' }: { text: string; cls?: string }) {
  const base = STATUS_BADGE[text] ?? 'bg-[#A0A7B8]/15 text-[#A0A7B8]';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize whitespace-nowrap ${base} ${cls}`}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_BADGE[severity] ?? SEVERITY_BADGE.low;
  const icons: Record<string, React.ElementType> = { critical: AlertOctagon, high: AlertTriangle, low: Flag };
  const Icon = icons[severity] ?? Flag;
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${cls}`}>
      <Icon size={10} />
      {severity}
    </span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[#7B61FF]/20 bg-[#121826] ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-[#A0A7B8] uppercase tracking-wider mb-3">{children}</h3>;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Icon size={28} className="text-[#7B61FF]/40" />
      <p className="text-sm text-[#A0A7B8]">{message}</p>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent = '#7B61FF', sub }: { label: string; value: string | number; icon: React.ElementType; accent?: string; sub?: string }) {
  const ACCENT_BG: Record<string, string> = {
    '#7B61FF': 'bg-[#7B61FF]/20', '#F43F5E': 'bg-[#F43F5E]/20',
    '#22D3A1': 'bg-[#22D3A1]/20', '#F59E0B': 'bg-[#F59E0B]/20',
  };
  const ACCENT_TEXT: Record<string, string> = {
    '#7B61FF': 'text-[#7B61FF]', '#F43F5E': 'text-[#F43F5E]',
    '#22D3A1': 'text-[#22D3A1]', '#F59E0B': 'text-[#F59E0B]',
  };
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#A0A7B8] uppercase tracking-wider">{label}</span>
        <div className={`rounded-lg p-1.5 ${ACCENT_BG[accent] ?? 'bg-[#7B61FF]/20'}`}>
          <Icon size={14} className={ACCENT_TEXT[accent] ?? 'text-[#7B61FF]'} />
        </div>
      </div>
      <span className="text-xl font-bold text-white">{value}</span>
      {sub && <span className="text-[10px] text-[#A0A7B8]">{sub}</span>}
    </Card>
  );
}

// ── Confirmation Modal ────────────────────────────────────────────────────────
interface ModalState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmCls: string;
  notesLabel?: string;
  onConfirm: (notes: string) => void;
}
const CLOSED_MODAL: ModalState = { open: false, title: '', message: '', confirmLabel: '', confirmCls: '', onConfirm: () => {} };

function ActionModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  useEffect(() => { if (state.open) setNotes(''); }, [state.open]);
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">{state.title}</h2>
        <p className="text-sm text-[#A0A7B8]">{state.message}</p>
        {state.notesLabel && (
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">{state.notesLabel}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2.5 focus:outline-none focus:border-[#7B61FF]/60 resize-none"
            />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { state.onConfirm(notes); onClose(); }}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${state.confirmCls}`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ── Create Flag Modal ─────────────────────────────────────────────────────────
function CreateFlagModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ releaseId: '', releaseTitle: '', artistName: '', reason: 'copyright' as FlagReason, severity: 'high' as FlagSeverity, notes: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.releaseTitle && !form.releaseId) { setErr('Release title or ID is required'); return; }
    setSaving(true);
    try {
      await createModerationFlag({ ...form, userId: 'manual' });
      onCreated();
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed to create flag');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="w-full max-w-lg p-6">
        <h2 className="text-base font-semibold text-white mb-4">Flag Content</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Release ID</label>
              <input value={form.releaseId} onChange={e => setForm(f => ({ ...f, releaseId: e.target.value }))}
                placeholder="UUID..." className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none focus:border-[#7B61FF]/60" />
            </div>
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Release Title *</label>
              <input value={form.releaseTitle} onChange={e => setForm(f => ({ ...f, releaseTitle: e.target.value }))}
                placeholder="Title..." className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none focus:border-[#7B61FF]/60" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">Artist Name</label>
            <input value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} title="Artist name" placeholder="Artist name…"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none focus:border-[#7B61FF]/60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Reason</label>
              <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value as FlagReason }))} aria-label="Flag reason" title="Flag reason"
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none">
                {(Object.keys(REASON_LABEL) as FlagReason[]).map(k => <option key={k} value={k}>{REASON_LABEL[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as FlagSeverity }))} aria-label="Flag severity" title="Flag severity"
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} title="Notes" placeholder="Optional notes…"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none resize-none" />
          </div>
          {err && <p className="text-xs text-[#F43F5E]">{err}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Flagging…' : 'Flag Content'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Add Copyright Claim Modal ─────────────────────────────────────────────────
function AddClaimModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ releaseId: '', releaseTitle: '', artistName: '', claimant: '', claimType: 'DMCA' as CopyrightClaim['claimType'], evidence: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.claimant) { setErr('Claimant is required'); return; }
    setSaving(true);
    try {
      await createCopyrightClaim(form);
      onCreated();
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="w-full max-w-lg p-6">
        <h2 className="text-base font-semibold text-white mb-4">File Copyright Claim</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Release ID</label>
              <input value={form.releaseId} onChange={e => setForm(f => ({ ...f, releaseId: e.target.value }))} title="Release ID" placeholder="Release ID…"
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none focus:border-[#7B61FF]/60" />
            </div>
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Release Title</label>
              <input value={form.releaseTitle} onChange={e => setForm(f => ({ ...f, releaseTitle: e.target.value }))} title="Release title" placeholder="Release title…"
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none focus:border-[#7B61FF]/60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Claimant *</label>
              <input value={form.claimant} onChange={e => setForm(f => ({ ...f, claimant: e.target.value }))} required title="Claimant" placeholder="Claimant name…"
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none focus:border-[#7B61FF]/60" />
            </div>
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Claim Type</label>
              <select value={form.claimType} onChange={e => setForm(f => ({ ...f, claimType: e.target.value as CopyrightClaim['claimType'] }))} aria-label="Claim type" title="Claim type"
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none">
                <option value="DMCA">DMCA</option>
                <option value="copyright">Copyright</option>
                <option value="trademark">Trademark</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">Evidence / URL</label>
            <input value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} title="Evidence URL" placeholder="https://…"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none focus:border-[#7B61FF]/60" />
          </div>
          {err && <p className="text-xs text-[#F43F5E]">{err}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#F43F5E] hover:bg-[#E03354] text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Filing…' : 'File Claim'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Tab: Flagged Content Queue ────────────────────────────────────────────────
function FlaggedQueueTab({ onRefreshNeeded }: { onRefreshNeeded: () => void }) {
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setFlags(await getModerationFlags()); }
    catch (ex) { setError(ex instanceof Error ? ex.message : 'Failed to load flags'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => flags.filter(f => {
    if (filterReason !== 'all' && f.reason !== filterReason) return false;
    if (filterSeverity !== 'all' && f.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (f.releaseTitle || '').toLowerCase().includes(q) || (f.artistName || '').toLowerCase().includes(q) || (f.notes || '').toLowerCase().includes(q);
    }
    return true;
  }), [flags, filterReason, filterSeverity, filterStatus, search]);

  function promptAction(flag: ModerationFlag, action: 'resolved' | 'taken_down' | 'cleared' | 'escalated') {
    const labels: Record<string, string> = { resolved: 'Resolve Flag', taken_down: 'Take Down Content', cleared: 'Clear Flag', escalated: 'Escalate Flag' };
    const clsMap: Record<string, string> = { resolved: 'bg-[#22D3A1] hover:bg-[#1AB08B]', taken_down: 'bg-[#F43F5E] hover:bg-[#E03354]', cleared: 'bg-[#7B61FF] hover:bg-[#6B51EF]', escalated: 'bg-[#F59E0B] hover:bg-[#D97706]' };
    const msgs: Record<string, string> = {
      resolved: `Mark "${flag.releaseTitle || flag.id}" flag as resolved?`,
      taken_down: `This will set the release status to "rejected" and mark the flag as taken down. Proceed?`,
      cleared: `Clear this flag (no action needed)?`,
      escalated: `Escalate this flag for legal review?`,
    };
    setModal({ open: true, title: labels[action], message: msgs[action], confirmLabel: labels[action], confirmCls: clsMap[action], notesLabel: 'Resolution Notes', onConfirm: async (notes) => {
      setBusy(flag.id);
      try { await updateModerationFlag(flag.id, { status: action, action, resolution: notes }); await load(); onRefreshNeeded(); }
      finally { setBusy(null); }
    }});
  }

  const pending = flags.filter(f => f.status === 'pending').length;
  const critical = flags.filter(f => f.severity === 'critical').length;

  return (
    <div className="space-y-5">
      <ActionModal state={modal} onClose={() => setModal(CLOSED_MODAL)} />
      {showCreate && <CreateFlagModal onClose={() => setShowCreate(false)} onCreated={load} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Flags" value={flags.length} icon={Flag} />
        <KpiCard label="Pending Review" value={pending} icon={Clock} accent="#F59E0B" />
        <KpiCard label="Critical" value={critical} icon={AlertOctagon} accent="#F43F5E" sub="Immediate action needed" />
        <KpiCard label="Taken Down" value={flags.filter(f => f.status === 'taken_down').length} icon={Ban} accent="#F43F5E" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end justify-between mb-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A0A7B8]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs focus:outline-none focus:border-[#7B61FF]/60 w-44" />
            </div>
            <select value={filterReason} onChange={e => setFilterReason(e.target.value)} aria-label="Filter by reason" title="Filter by reason"
              className="rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs px-2.5 py-1.5 focus:outline-none">
              <option value="all">All Reasons</option>
              {(Object.keys(REASON_LABEL) as FlagReason[]).map(k => <option key={k} value={k}>{REASON_LABEL[k]}</option>)}
            </select>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} aria-label="Filter by severity" title="Filter by severity"
              className="rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs px-2.5 py-1.5 focus:outline-none">
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status" title="Filter by status"
              className="rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs px-2.5 py-1.5 focus:outline-none">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="taken_down">Taken Down</option>
              <option value="cleared">Cleared</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-medium transition-colors">
            <Plus size={12} /> Flag Content
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
        ) : error ? (
          <p className="text-xs text-[#F43F5E] py-4 text-center">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckCircle2} message="No flags match the current filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-[#7B61FF]/15">
                  {['Artist', 'Release', 'Reason', 'Severity', 'Flagged', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`py-2 text-[#A0A7B8] font-medium ${h === 'Actions' ? 'text-right pr-1' : 'text-left pr-3'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5 group">
                    <td className="py-2 pr-3 text-[#E2E8F0] font-medium max-w-[100px] truncate">{f.artistName || '—'}</td>
                    <td className="py-2 pr-3 max-w-[140px]">
                      <div className="text-[#E2E8F0] truncate">{f.releaseTitle || f.releaseId || '—'}</div>
                      {f.notes && <div className="text-[#A0A7B8] truncate max-w-[130px]">{f.notes}</div>}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-[#A0A7B8]">{REASON_LABEL[f.reason] || f.reason}</td>
                    <td className="py-2 pr-3"><SeverityBadge severity={f.severity} /></td>
                    <td className="py-2 pr-3 text-[#A0A7B8] whitespace-nowrap">{new Date(f.flaggedAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-3"><Badge text={f.status} /></td>
                    <td className="py-2 text-right">
                      {f.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          {f.severity === 'critical' && (
                            <button onClick={() => promptAction(f, 'taken_down')} disabled={busy === f.id}
                              className="px-2 py-1 rounded text-[10px] bg-[#F43F5E]/15 text-[#F43F5E] hover:bg-[#F43F5E]/25 font-medium transition-colors">
                              Take Down
                            </button>
                          )}
                          <button onClick={() => promptAction(f, 'resolved')} disabled={busy === f.id}
                            className="px-2 py-1 rounded text-[10px] bg-[#22D3A1]/15 text-[#22D3A1] hover:bg-[#22D3A1]/25 font-medium transition-colors">
                            Resolve
                          </button>
                          <button onClick={() => promptAction(f, 'cleared')} disabled={busy === f.id}
                            className="px-2 py-1 rounded text-[10px] bg-[#7B61FF]/15 text-[#7B61FF] hover:bg-[#7B61FF]/25 font-medium transition-colors">
                            Clear
                          </button>
                          <button onClick={() => promptAction(f, 'escalated')} disabled={busy === f.id}
                            className="px-2 py-1 rounded text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25 font-medium transition-colors">
                            Escalate
                          </button>
                        </div>
                      )}
                      {f.status !== 'pending' && (
                        <span className="text-[10px] text-[#A0A7B8]">{f.resolvedAt ? new Date(f.resolvedAt).toLocaleDateString() : '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: Copyright Management ─────────────────────────────────────────────────
function CopyrightTab({ onRefreshNeeded }: { onRefreshNeeded: () => void }) {
  const [claims, setClaims] = useState<CopyrightClaim[]>([]);
  const [dupes, setDupes] = useState<DuplicateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);
  const [showAdd, setShowAdd] = useState(false);
  const [section, setSection] = useState<'claims' | 'duplicates'>('claims');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([getCopyrightClaims(), getModerationDuplicates()]);
      setClaims(c); setDupes(d);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function promptClaim(claim: CopyrightClaim, action: 'approve' | 'dispute' | 'escalated' | 'resolved') {
    const labels: Record<string, string> = { approve: 'Approve & Remove Content', dispute: 'Dispute Claim', escalated: 'Escalate to Legal', resolved: 'Mark Resolved' };
    const clsMap: Record<string, string> = { approve: 'bg-[#F43F5E] hover:bg-[#E03354]', dispute: 'bg-[#F59E0B] hover:bg-[#D97706]', escalated: 'bg-[#7B61FF] hover:bg-[#6B51EF]', resolved: 'bg-[#22D3A1] hover:bg-[#1AB08B]' };
    const msgs: Record<string, string> = {
      approve: `Approving will remove content for "${claim.releaseTitle || claim.releaseId}". This cannot be undone.`,
      dispute: `Mark claim from ${claim.claimant} as disputed and request evidence?`,
      escalated: `Escalate this claim to the legal team?`,
      resolved: `Mark this claim as resolved?`,
    };
    setModal({ open: true, title: labels[action], message: msgs[action], confirmLabel: labels[action], confirmCls: clsMap[action], notesLabel: 'Admin Notes', onConfirm: async (notes) => {
      setBusy(claim.id);
      try { await updateCopyrightClaim(claim.id, { status: action === 'approve' ? 'approved' : action as CopyrightClaim['status'], action, adminNotes: notes }); await load(); onRefreshNeeded(); }
      finally { setBusy(null); }
    }});
  }

  async function handleDupeDecision(dupe: DuplicateRecord, action: 'confirm_duplicate' | 'clear') {
    setBusy(dupe.id);
    try { await decideDuplicate(dupe.id, action); await load(); onRefreshNeeded(); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-5">
      <ActionModal state={modal} onClose={() => setModal(CLOSED_MODAL)} />
      {showAdd && <AddClaimModal onClose={() => setShowAdd(false)} onCreated={load} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Claims" value={claims.length} icon={Copyright} accent="#F43F5E" />
        <KpiCard label="Pending Review" value={claims.filter(c => c.status === 'pending').length} icon={Clock} accent="#F59E0B" />
        <KpiCard label="Approved (Takedowns)" value={claims.filter(c => c.status === 'approved').length} icon={Ban} accent="#F43F5E" />
        <KpiCard label="Potential Duplicates" value={dupes.filter(d => d.status === 'pending').length} icon={Copy} accent="#F59E0B" sub="Awaiting decision" />
      </div>

      <div className="flex gap-1 rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-1 w-fit">
        {(['claims', 'duplicates'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${section === s ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white'}`}>
            {s === 'claims' ? `Copyright Claims (${claims.length})` : `Duplicate Detection (${dupes.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
      ) : section === 'claims' ? (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <SectionTitle>Copyright / DMCA Claims</SectionTitle>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F43F5E] hover:bg-[#E03354] text-white text-xs font-medium transition-colors">
              <Plus size={12} /> File Claim
            </button>
          </div>
          {claims.length === 0 ? (
            <EmptyState icon={Copyright} message="No copyright claims on file" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#7B61FF]/15">
                    {['Release', 'Claimant', 'Type', 'Filed', 'Status', 'Evidence', 'Actions'].map(h => (
                      <th key={h} className={`py-2 text-[#A0A7B8] font-medium ${h === 'Actions' ? 'text-right pr-1' : 'text-left pr-3'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {claims.map(c => (
                    <tr key={c.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                      <td className="py-2 pr-3">
                        <div className="text-[#E2E8F0] font-medium max-w-[120px] truncate">{c.releaseTitle || c.releaseId}</div>
                        {c.artistName && <div className="text-[#A0A7B8]">{c.artistName}</div>}
                      </td>
                      <td className="py-2 pr-3 text-[#E2E8F0] max-w-[100px] truncate">{c.claimant}</td>
                      <td className="py-2 pr-3"><span className="px-1.5 py-0.5 rounded bg-[#7B61FF]/15 text-[#7B61FF] text-[10px]">{c.claimType}</span></td>
                      <td className="py-2 pr-3 text-[#A0A7B8] whitespace-nowrap">{new Date(c.dateFiled).toLocaleDateString()}</td>
                      <td className="py-2 pr-3"><Badge text={c.status} /></td>
                      <td className="py-2 pr-3 text-[#A0A7B8] max-w-[100px] truncate">
                        {c.evidence ? <a href={c.evidence} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[#7B61FF] hover:underline"><ArrowUpRight size={10} />View</a> : '—'}
                      </td>
                      <td className="py-2 text-right">
                        {c.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => promptClaim(c, 'approve')} disabled={busy === c.id} className="px-2 py-1 rounded text-[10px] bg-[#F43F5E]/15 text-[#F43F5E] hover:bg-[#F43F5E]/25 font-medium">Approve</button>
                            <button onClick={() => promptClaim(c, 'dispute')} disabled={busy === c.id} className="px-2 py-1 rounded text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25 font-medium">Dispute</button>
                            <button onClick={() => promptClaim(c, 'escalated')} disabled={busy === c.id} className="px-2 py-1 rounded text-[10px] bg-[#7B61FF]/15 text-[#7B61FF] hover:bg-[#7B61FF]/25 font-medium">Escalate</button>
                          </div>
                        )}
                        {c.status !== 'pending' && <span className="text-[10px] text-[#A0A7B8]">{c.adminNotes || '—'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-4">
          <SectionTitle>AI-Flagged Duplicate Releases</SectionTitle>
          {dupes.length === 0 ? (
            <EmptyState icon={Copy} message="No potential duplicates detected" />
          ) : (
            <div className="space-y-3">
              {dupes.map(d => (
                <div key={d.id} className="rounded-lg border border-[#7B61FF]/15 bg-[#0B0F1A] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.confidenceScore >= 95 ? 'bg-[#F43F5E]/15 text-[#F43F5E]' : d.confidenceScore >= 80 ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'bg-[#A0A7B8]/15 text-[#A0A7B8]'}`}>
                          {d.confidenceScore}% match
                        </span>
                        <span className="text-[10px] text-[#A0A7B8] capitalize">{d.source.replace('_', ' ')}</span>
                        <Badge text={d.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[#A0A7B8] text-[10px] mb-0.5">Original</p>
                          <p className="text-[#E2E8F0] font-medium truncate">{d.releaseTitle}</p>
                          <p className="text-[#A0A7B8]">{d.artistName}</p>
                        </div>
                        <div>
                          <p className="text-[#A0A7B8] text-[10px] mb-0.5">Similar Release</p>
                          <p className="text-[#E2E8F0] font-medium truncate">{d.similarReleaseTitle}</p>
                          <p className="text-[#A0A7B8]">{d.similarArtistName}</p>
                        </div>
                      </div>
                    </div>
                    {d.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleDupeDecision(d, 'confirm_duplicate')} disabled={busy === d.id}
                          className="px-3 py-1.5 rounded-lg text-xs bg-[#F43F5E]/15 text-[#F43F5E] hover:bg-[#F43F5E]/25 font-medium transition-colors">
                          Confirm Duplicate
                        </button>
                        <button onClick={() => handleDupeDecision(d, 'clear')} disabled={busy === d.id}
                          className="px-3 py-1.5 rounded-lg text-xs bg-[#22D3A1]/15 text-[#22D3A1] hover:bg-[#22D3A1]/25 font-medium transition-colors">
                          Clear
                        </button>
                      </div>
                    )}
                    {d.status !== 'pending' && d.decidedAt && (
                      <span className="text-[10px] text-[#A0A7B8]">Decided {new Date(d.decidedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Tab: Explicit Content ─────────────────────────────────────────────────────
function ExplicitTab({ onRefreshNeeded }: { onRefreshNeeded: () => void }) {
  const [items, setItems] = useState<ExplicitContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending_review');
  const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getExplicitContentQueue()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => items.filter(i => filterStatus === 'all' || i.status === filterStatus), [items, filterStatus]);

  function promptReview(item: ExplicitContentItem, action: 'confirm' | 'remove_flag' | 'require_update') {
    const labels: Record<string, string> = { confirm: 'Confirm Explicit', remove_flag: 'Remove Explicit Flag', require_update: 'Require Label Update' };
    const clsMap: Record<string, string> = { confirm: 'bg-[#F43F5E] hover:bg-[#E03354]', remove_flag: 'bg-[#22D3A1] hover:bg-[#1AB08B]', require_update: 'bg-[#F59E0B] hover:bg-[#D97706]' };
    const msgs: Record<string, string> = {
      confirm: `Confirm "${item.trackTitle || item.id}" is correctly marked as explicit?`,
      remove_flag: `Remove the explicit flag from "${item.trackTitle || item.id}"?`,
      require_update: `Request the artist to update the content label for "${item.trackTitle || item.id}"?`,
    };
    setModal({ open: true, title: labels[action], message: msgs[action], confirmLabel: labels[action], confirmCls: clsMap[action], notesLabel: 'Review Notes', onConfirm: async (notes) => {
      setBusy(item.id);
      try { await reviewExplicitContent(item.id, action, notes); await load(); onRefreshNeeded(); }
      finally { setBusy(null); }
    }});
  }

  return (
    <div className="space-y-5">
      <ActionModal state={modal} onClose={() => setModal(CLOSED_MODAL)} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="In Review Queue" value={items.filter(i => i.status === 'pending_review').length} icon={Eye} accent="#F59E0B" />
        <KpiCard label="Confirmed Explicit" value={items.filter(i => i.status === 'confirmed').length} icon={CheckCheck} accent="#F43F5E" />
        <KpiCard label="Flag Removed" value={items.filter(i => i.status === 'flag_removed').length} icon={CheckCircle2} accent="#22D3A1" />
        <KpiCard label="Label Update Required" value={items.filter(i => i.status === 'label_update_required').length} icon={FileWarning} accent="#F59E0B" />
      </div>

      <Card className="p-4">
        <div className="flex gap-2 mb-4">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status" title="Filter by status"
            className="rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs px-2.5 py-1.5 focus:outline-none">
            <option value="all">All</option>
            <option value="pending_review">Pending Review</option>
            <option value="confirmed">Confirmed</option>
            <option value="flag_removed">Flag Removed</option>
            <option value="label_update_required">Label Update Required</option>
          </select>
          <span className="text-xs text-[#A0A7B8] self-center">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckCircle2} message="No explicit content items in this queue" />
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div key={item.id} className="rounded-lg border border-[#7B61FF]/15 bg-[#0B0F1A] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1 min-w-[200px]">
                    {/* Artwork thumbnail */}
                    <div className="w-14 h-14 rounded-lg bg-[#7B61FF]/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.artworkUrl
                        ? <img src={item.artworkUrl} alt="artwork" className="w-full h-full object-cover rounded-lg" />
                        : <Music2 size={20} className="text-[#7B61FF]/60" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-white">{item.trackTitle || item.id}</span>
                        <Badge text={item.status} />
                        {item.explicitFlaggedBySystem && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F59E0B]/15 text-[#F59E0B]">Auto-detected</span>
                        )}
                        {item.explicitSetByArtist && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#A0A7B8]/15 text-[#A0A7B8]">Artist-flagged</span>
                        )}
                      </div>
                      <p className="text-xs text-[#A0A7B8]">{item.artistName} · {item.releaseTitle}</p>
                      {item.notes && <p className="text-xs text-[#A0A7B8] mt-1 italic">{item.notes}</p>}
                      {item.audioUrl && (
                        <a href={item.audioUrl} target="_blank" rel="noopener noreferrer"
                          className="mt-1.5 flex items-center gap-1 text-[10px] text-[#7B61FF] hover:underline w-fit">
                          <ArrowUpRight size={10} />Audio Preview
                        </a>
                      )}
                    </div>
                  </div>
                  {item.status === 'pending_review' && (
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => promptReview(item, 'confirm')} disabled={busy === item.id}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[#F43F5E]/15 text-[#F43F5E] hover:bg-[#F43F5E]/25 font-medium transition-colors">
                        Confirm Explicit
                      </button>
                      <button onClick={() => promptReview(item, 'remove_flag')} disabled={busy === item.id}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[#22D3A1]/15 text-[#22D3A1] hover:bg-[#22D3A1]/25 font-medium transition-colors">
                        Remove Flag
                      </button>
                      <button onClick={() => promptReview(item, 'require_update')} disabled={busy === item.id}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25 font-medium transition-colors">
                        Require Update
                      </button>
                    </div>
                  )}
                  {item.status !== 'pending_review' && item.reviewedAt && (
                    <span className="text-[10px] text-[#A0A7B8]">Reviewed {new Date(item.reviewedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: Metadata Compliance ──────────────────────────────────────────────────
function MetadataTab({ onRefreshNeeded }: { onRefreshNeeded: () => void }) {
  const [alerts, setAlerts] = useState<MetadataAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAlerts(await getMetadataAlerts()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => alerts.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.releaseTitle.toLowerCase().includes(q) || a.artistName.toLowerCase().includes(q);
    }
    return true;
  }), [alerts, filterStatus, search]);

  function promptAction(alert: MetadataAlert, action: 'mark_compliant' | 'request_fix') {
    const labels: Record<string, string> = { mark_compliant: 'Mark Compliant', request_fix: 'Request Fix from Artist' };
    const clsMap: Record<string, string> = { mark_compliant: 'bg-[#22D3A1] hover:bg-[#1AB08B]', request_fix: 'bg-[#F59E0B] hover:bg-[#D97706]' };
    const msgs: Record<string, string> = {
      mark_compliant: `Mark "${alert.releaseTitle}" as metadata-compliant? This overrides automated checks.`,
      request_fix: `Send a fix request to the artist for "${alert.releaseTitle}"?`,
    };
    setModal({ open: true, title: labels[action], message: msgs[action], confirmLabel: labels[action], confirmCls: clsMap[action], notesLabel: 'Notes to Artist / Admin', onConfirm: async (notes) => {
      setBusy(alert.id);
      try { await resolveMetadataAlert(alert.releaseId, action, notes); await load(); onRefreshNeeded(); }
      finally { setBusy(null); }
    }});
  }

  const passedCount = alerts.length; // total with issues already filtered
  const fixReqCount = alerts.filter(a => a.status === 'fix_requested').length;

  return (
    <div className="space-y-5">
      <ActionModal state={modal} onClose={() => setModal(CLOSED_MODAL)} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Alerts Total" value={alerts.length} icon={FileWarning} accent="#F59E0B" />
        <KpiCard label="Pending Review" value={alerts.filter(a => a.status === 'pending').length} icon={Clock} accent="#F59E0B" />
        <KpiCard label="Fix Requested" value={fixReqCount} icon={ArrowUpRight} accent="#7B61FF" />
        <KpiCard label="Marked Compliant" value={alerts.filter(a => a.status === 'compliant').length} icon={CheckCircle2} accent="#22D3A1" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A0A7B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search releases…"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs focus:outline-none focus:border-[#7B61FF]/60 w-44" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status" title="Filter by status"
            className="rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs px-2.5 py-1.5 focus:outline-none">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="compliant">Compliant</option>
            <option value="fix_requested">Fix Requested</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckCircle2} message="No metadata alerts for this filter" />
        ) : (
          <div className="space-y-3">
            {filtered.map(a => (
              <div key={a.id} className={`rounded-lg border p-4 ${a.totalIssues >= 4 ? 'border-[#F43F5E]/25 bg-[#F43F5E]/5' : a.totalIssues >= 2 ? 'border-[#F59E0B]/25 bg-[#F59E0B]/5' : 'border-[#7B61FF]/15 bg-[#0B0F1A]'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-white">{a.releaseTitle}</span>
                      <Badge text={a.releaseStatus} />
                      <Badge text={a.status} />
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.totalIssues >= 4 ? 'bg-[#F43F5E]/20 text-[#F43F5E]' : a.totalIssues >= 2 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#A0A7B8]/20 text-[#A0A7B8]'}`}>
                        {a.totalIssues} issue{a.totalIssues !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-[#A0A7B8] mb-2">{a.artistName}</p>
                    <div className="flex flex-wrap gap-3">
                      {a.missingFields.length > 0 && (
                        <div>
                          <p className="text-[10px] text-[#F59E0B] font-semibold mb-1">Missing Fields</p>
                          <div className="flex flex-wrap gap-1">
                            {a.missingFields.map(f => (
                              <span key={f} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {a.validationErrors.length > 0 && (
                        <div>
                          <p className="text-[10px] text-[#F43F5E] font-semibold mb-1">Validation Errors</p>
                          <div className="flex flex-wrap gap-1">
                            {a.validationErrors.map(e => (
                              <span key={e} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20">{e}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {a.status === 'pending' && (
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <button onClick={() => promptAction(a, 'mark_compliant')} disabled={busy === a.id}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[#22D3A1]/15 text-[#22D3A1] hover:bg-[#22D3A1]/25 font-medium transition-colors">
                        Mark Compliant
                      </button>
                      <button onClick={() => promptAction(a, 'request_fix')} disabled={busy === a.id}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25 font-medium transition-colors">
                        Request Fix
                      </button>
                    </div>
                  )}
                  {a.status !== 'pending' && (
                    <span className="text-[10px] text-[#A0A7B8]">
                      {a.resolvedAt ? `Resolved ${new Date(a.resolvedAt).toLocaleDateString()}` : a.requestedAt ? `Requested ${new Date(a.requestedAt).toLocaleDateString()}` : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: Audit Trail & Reports ────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs] = useState<ModerationAuditLog[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [view, setView] = useState<'log' | 'report'>('log');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, r] = await Promise.all([getModerationAuditLogs(), getComplianceReport(reportMonth)]);
      setLogs(l); setReport(r);
    } finally { setLoading(false); }
  }, [reportMonth]);

  useEffect(() => { load(); }, [load]);

  function exportReport() {
    if (!report) return;
    const lines = [
      `Compliance Report — ${report.month}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      '== Summary ==',
      `Total Flags: ${report.summary.totalFlags}`,
      `Flags This Month: ${report.summary.flagsThisMonth}`,
      `Takedowns This Month: ${report.summary.takedownsThisMonth}`,
      `Copyright Claims: ${report.summary.copyrightClaims}`,
      `Claims This Month: ${report.summary.claimsThisMonth}`,
      `Duplicates Confirmed: ${report.summary.duplicatesConfirmed}`,
      `Moderation Actions: ${report.summary.moderationActions}`,
      '',
      '== Flag Status Breakdown ==',
      ...Object.entries(report.summary.flagsByStatus).map(([k, v]) => `  ${k}: ${v}`),
      '',
      '== Flag Severity Breakdown ==',
      ...Object.entries(report.summary.flagsBySeverity).map(([k, v]) => `  ${k}: ${v}`),
      '',
      '== Action Breakdown ==',
      ...Object.entries(report.summary.actionBreakdown).map(([k, v]) => `  ${k}: ${v}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${report.month}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ACTION_BADGE: Record<string, string> = {
    takedown: 'bg-[#F43F5E]/15 text-[#F43F5E]',
    resolve: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    cleared: 'bg-[#7B61FF]/15 text-[#7B61FF]',
    escalated: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    approve: 'bg-[#F43F5E]/15 text-[#F43F5E]',
    confirm: 'bg-[#F43F5E]/15 text-[#F43F5E]',
    dispute: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    mark_compliant: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    request_fix: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    create: 'bg-[#7B61FF]/15 text-[#7B61FF]',
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-1 w-fit">
        <button onClick={() => setView('log')} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'log' ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white'}`}>
          Action Log
        </button>
        <button onClick={() => setView('report')} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'report' ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white'}`}>
          Compliance Report
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'log' ? (
        <Card className="p-4">
          <SectionTitle>Moderation Action History</SectionTitle>
          {logs.length === 0 ? (
            <EmptyState icon={ClipboardList} message="No moderation actions recorded yet" />
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#121826]">
                  <tr className="border-b border-[#7B61FF]/15">
                    {['When', 'Admin', 'Action', 'Resource', 'Resource ID', 'Details'].map(h => (
                      <th key={h} className="py-2 text-left pr-3 text-[#A0A7B8] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                      <td className="py-2 pr-3 text-[#A0A7B8] whitespace-nowrap">{new Date(log.timestamp).toLocaleDateString()}</td>
                      <td className="py-2 pr-3 text-[#E2E8F0] max-w-[120px] truncate">{log.adminUserEmail || log.adminUserId.slice(0, 8) + '…'}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${ACTION_BADGE[log.action] ?? 'bg-[#A0A7B8]/15 text-[#A0A7B8]'}`}>
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[#A0A7B8] capitalize">{log.resource.replace('moderation:', '')}</td>
                      <td className="py-2 pr-3 text-[#A0A7B8] font-mono max-w-[100px] truncate">{log.resourceId.slice(0, 12)}…</td>
                      <td className="py-2 text-[#A0A7B8] max-w-[160px] truncate">
                        {log.changes ? JSON.stringify(log.changes).slice(0, 80) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : report ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#A0A7B8]">Report Month</label>
              <input type="text" value={reportMonth} onChange={e => setReportMonth(e.target.value)} title="Report month (YYYY-MM)" placeholder="YYYY-MM"
                className="rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm px-3 py-1.5 focus:outline-none focus:border-[#7B61FF]/60 w-28" />
            </div>
            <button onClick={exportReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#7B61FF]/30 bg-[#121826] text-[#A0A7B8] hover:text-white text-xs transition-colors">
              <Download size={13} />Export Report
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Flags This Month" value={report.summary.flagsThisMonth} icon={Flag} accent="#F59E0B" />
            <KpiCard label="Takedowns" value={report.summary.takedownsThisMonth} icon={Ban} accent="#F43F5E" />
            <KpiCard label="Claims This Month" value={report.summary.claimsThisMonth} icon={Copyright} accent="#F43F5E" />
            <KpiCard label="Mod Actions" value={report.summary.moderationActions} icon={Gavel} accent="#7B61FF" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <SectionTitle>Flags by Status</SectionTitle>
              <div className="space-y-2">
                {Object.entries(report.summary.flagsByStatus).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <Badge text={k} />
                    <span className="text-sm font-bold text-white">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <SectionTitle>Flags by Severity</SectionTitle>
              <div className="space-y-2">
                {Object.entries(report.summary.flagsBySeverity).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <SeverityBadge severity={k} />
                    <span className="text-sm font-bold text-white">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <SectionTitle>Claims by Status</SectionTitle>
              <div className="space-y-2">
                {Object.entries(report.summary.claimsByStatus).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <Badge text={k} />
                    <span className="text-sm font-bold text-white">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {Object.keys(report.summary.actionBreakdown).length > 0 && (
            <Card className="p-4">
              <SectionTitle>Moderation Actions This Month</SectionTitle>
              <div className="flex flex-wrap gap-3">
                {Object.entries(report.summary.actionBreakdown).sort(([, a], [, b]) => b - a).map(([k, v]) => (
                  <div key={k} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${ACTION_BADGE[k] ?? 'bg-[#A0A7B8]/15 text-[#A0A7B8]'} font-medium`}>
                    <span className="capitalize">{k.replace('_', ' ')}</span>
                    <span className="font-bold">{v}×</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
type TabKey = 'queue' | 'copyright' | 'explicit' | 'metadata' | 'audit';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'queue', label: 'Flagged Queue', icon: Flag },
  { key: 'copyright', label: 'Copyright', icon: Copyright },
  { key: 'explicit', label: 'Explicit Content', icon: ShieldAlert },
  { key: 'metadata', label: 'Metadata Compliance', icon: FileWarning },
  { key: 'audit', label: 'Audit & Reports', icon: ClipboardList },
];

// Badge counts per tab — quick counts pulled from data
function useTabCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const refresh = useCallback(async () => {
    try {
      const [flags, claims, explicit, meta] = await Promise.all([
        getModerationFlags().catch(() => []),
        getCopyrightClaims().catch(() => []),
        getExplicitContentQueue().catch(() => []),
        getMetadataAlerts().catch(() => []),
      ]);
      setCounts({
        queue: flags.filter(f => f.status === 'pending').length,
        copyright: claims.filter(c => c.status === 'pending').length,
        explicit: explicit.filter(i => i.status === 'pending_review').length,
        metadata: meta.filter(a => a.status === 'pending').length,
      });
    } catch {}
  }, []);
  return { counts, refresh };
}

const ACTION_BADGE_AUDIT: Record<string, string> = {
  takedown: 'bg-[#F43F5E]/15 text-[#F43F5E]',
  resolve: 'bg-[#22D3A1]/15 text-[#22D3A1]',
  cleared: 'bg-[#7B61FF]/15 text-[#7B61FF]',
  escalated: 'bg-[#F59E0B]/15 text-[#F59E0B]',
  approve: 'bg-[#F43F5E]/15 text-[#F43F5E]',
};

export function ContentModerationPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('queue');
  const { counts, refresh } = useTabCounts();

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Content Moderation & Compliance</h1>
          <p className="text-xs text-[#A0A7B8] mt-0.5">Review flagged content, copyright claims, explicit material, and metadata compliance</p>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#7B61FF]/30 bg-[#121826] text-[#A0A7B8] hover:text-white transition-colors text-sm">
          <RefreshCw size={13} />Refresh Counts
        </button>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 flex-wrap rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          const count = counts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white hover:bg-[#7B61FF]/15'}`}
            >
              <Icon size={13} />
              {t.label}
              {count != null && count > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${active ? 'bg-white/25 text-white' : 'bg-[#F43F5E] text-white'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'queue' && <FlaggedQueueTab onRefreshNeeded={refresh} />}
      {activeTab === 'copyright' && <CopyrightTab onRefreshNeeded={refresh} />}
      {activeTab === 'explicit' && <ExplicitTab onRefreshNeeded={refresh} />}
      {activeTab === 'metadata' && <MetadataTab onRefreshNeeded={refresh} />}
      {activeTab === 'audit' && <AuditTab />}
    </div>
  );
}
