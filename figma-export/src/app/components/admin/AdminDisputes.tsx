import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  X,
  Flag,
  MessageSquare,
  User,
  CreditCard,
  Calendar,
  Phone,
  FileText,
  Loader2,
  BarChart3,
  Zap,
  Shield,
} from 'lucide-react';
import * as adminApi from '../../utils/admin-api';

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  failed_debit: 'Failed Debit',
  duplicate: 'Duplicate Charge',
  wrong_amount: 'Wrong Amount',
  unauthorized: 'Unauthorized',
  other: 'Other',
};

const STATUS_CONFIG: Record<adminApi.DisputeStatus, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  open:         { label: 'Open',         bg: 'rgba(239,68,68,0.1)',   color: '#F87171', icon: AlertTriangle },
  under_review: { label: 'Under Review', bg: 'rgba(251,191,36,0.1)', color: '#FCD34D', icon: Clock },
  resolved:     { label: 'Resolved',     bg: 'rgba(34,197,94,0.1)',  color: '#4ADE80', icon: CheckCircle },
  rejected:     { label: 'Rejected',     bg: 'rgba(107,114,128,0.1)',color: '#9CA3AF', icon: X },
  escalated:    { label: 'Escalated',    bg: 'rgba(168,85,247,0.1)', color: '#C084FC', icon: Flag },
};

const PRIORITY_CONFIG: Record<adminApi.AdminDispute['priority'], { label: string; color: string; dot: string }> = {
  low:      { label: 'Low',      color: '#6B7280', dot: '#6B7280' },
  medium:   { label: 'Medium',   color: '#FCD34D', dot: '#F59E0B' },
  high:     { label: 'High',     color: '#FB923C', dot: '#F97316' },
  critical: { label: 'Critical', color: '#F87171', dot: '#EF4444' },
};

const TIMELINE_EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  submitted:        { icon: FileText,     color: '#FF6B00', label: 'Dispute Submitted' },
  status_changed:   { icon: Zap,          color: '#FCD34D', label: 'Status Updated' },
  priority_changed: { icon: Flag,         color: '#C084FC', label: 'Priority Changed' },
  notes_updated:    { icon: MessageSquare, color: '#60A5FA', label: 'Notes Updated' },
  resolution_added: { icon: CheckCircle,  color: '#4ADE80', label: 'Resolution Provided' },
};

function RelativeTime({ dateStr }: { dateStr: string }) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return <span>Just now</span>;
  if (hrs < 1) return <span>{mins}m ago</span>;
  if (days < 1) return <span>{hrs}h ago</span>;
  if (days < 7) return <span>{days}d ago</span>;
  return <span>{new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>;
}

function StatusBadge({ status }: { status: adminApi.DisputeStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: adminApi.AdminDispute['priority'] }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: cfg.color }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function DisputeTimeline({ disputeId }: { disputeId: string }) {
  const [events, setEvents] = useState<adminApi.AdminDisputeUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAdminDisputeTimeline(disputeId)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [disputeId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs py-3" style={{ color: '#6D7385' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading activity…
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-xs py-2" style={{ color: '#6D7385' }}>No activity recorded yet.</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-3 bottom-3 w-px" style={{ backgroundColor: 'rgba(123,97,255,0.12)' }} />
      <div className="space-y-3">
        {events.map((ev) => {
          const cfg = TIMELINE_EVENT_CONFIG[ev.eventType] ?? { icon: Clock, color: '#6D7385', label: 'Activity' };
          const Icon = cfg.icon;
          return (
            <div key={ev.id} className="flex gap-2.5 relative">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{ backgroundColor: `${cfg.color}18`, border: `1.5px solid ${cfg.color}40` }}>
                <Icon className="w-3 h-3" style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#D1D5DB' }}>{cfg.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#A0A7B8' }}>{ev.description}</p>
                  </div>
                  <p className="text-xs flex-shrink-0" style={{ color: '#6D7385' }}>
                    <RelativeTime dateStr={ev.createdAt} />
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {ev.actorType === 'admin'
                    ? <><Shield className="w-2.5 h-2.5" style={{ color: '#7B61FF' }} /><span className="text-[10px]" style={{ color: '#7B61FF' }}>Admin</span></>
                    : ev.actorType === 'user'
                    ? <><User className="w-2.5 h-2.5" style={{ color: '#FF9800' }} /><span className="text-[10px]" style={{ color: '#FF9800' }}>User</span></>
                    : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Detail panel shown when a row is expanded
function DisputeDetailPanel({
  dispute,
  onUpdate,
  updating,
}: {
  dispute: adminApi.AdminDispute;
  onUpdate: (updates: { status?: adminApi.DisputeStatus; adminNotes?: string; resolution?: string; priority?: adminApi.AdminDispute['priority'] }) => Promise<void>;
  updating: boolean;
}) {
  const [status, setStatus] = useState<adminApi.DisputeStatus>(dispute.status);
  const [priority, setPriority] = useState<adminApi.AdminDispute['priority']>(dispute.priority);
  const [adminNotes, setAdminNotes] = useState(dispute.adminNotes ?? '');
  const [resolution, setResolution] = useState(dispute.resolution ?? '');
  const [dirty, setDirty] = useState(false);

  function mark<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (v: T) => { setter(v); setDirty(true); };
  }

  async function save() {
    await onUpdate({ status, priority, adminNotes, resolution });
    setDirty(false);
  }

  return (
    <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ backgroundColor: '#090D16', borderTop: '1px solid rgba(123,97,255,0.08)' }}>
      {/* Left: case info */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6D7385' }}>Case Details</h4>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p style={{ color: '#6D7385' }}>User</p>
            <p className="font-medium mt-0.5 flex items-center gap-1" style={{ color: '#D1D5DB' }}>
              <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7B61FF' }} />
              {dispute.userName ?? dispute.userEmail.split('@')[0]}
            </p>
            <p className="text-xs" style={{ color: '#6D7385' }}>{dispute.userEmail}</p>
          </div>
          <div>
            <p style={{ color: '#6D7385' }}>Transaction Ref</p>
            <code className="text-xs font-mono mt-0.5 block" style={{ color: '#FF9800' }}>{dispute.transactionReference}</code>
          </div>
          <div>
            <p style={{ color: '#6D7385' }}>Amount Disputed</p>
            <p className="font-bold text-base mt-0.5" style={{ color: '#FFFFFF' }}>₦{dispute.transactionAmount.toLocaleString()}</p>
          </div>
          <div>
            <p style={{ color: '#6D7385' }}>Dispute Type</p>
            <p className="font-medium mt-0.5" style={{ color: '#D1D5DB' }}>{DISPUTE_TYPE_LABELS[dispute.disputeType] ?? dispute.disputeType}</p>
          </div>
          {dispute.transactionDate && (
            <div>
              <p style={{ color: '#6D7385' }}>Transaction Date</p>
              <p className="text-xs mt-0.5" style={{ color: '#D1D5DB' }}>
                {new Date(dispute.transactionDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}
          {dispute.contactPhone && (
            <div>
              <p style={{ color: '#6D7385' }}>Contact Phone</p>
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#D1D5DB' }}>
                <Phone className="w-3 h-3" /> {dispute.contactPhone}
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#6D7385' }}>
            <MessageSquare className="w-3.5 h-3.5" /> User Description
          </p>
          <p className="text-sm p-3 rounded-lg whitespace-pre-wrap" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.06)' }}>
            {dispute.description}
          </p>
        </div>

        {dispute.bankStatementNote && (
          <div>
            <p className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#6D7385' }}>
              <FileText className="w-3.5 h-3.5" /> Bank Statement Note
            </p>
            <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#A0A7B8', border: '1px solid rgba(255,255,255,0.06)' }}>
              {dispute.bankStatementNote}
            </p>
          </div>
        )}

        {dispute.resolvedAt && (
          <p className="text-xs" style={{ color: '#6D7385' }}>
            Resolved {new Date(dispute.resolvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {dispute.resolvedBy ? ` by ${dispute.resolvedBy.slice(0, 8)}…` : ''}
          </p>
        )}

        {/* Activity Timeline */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6D7385' }}>Activity Log</h4>
          <DisputeTimeline disputeId={dispute.id} />
        </div>
      </div>

      {/* Right: admin actions */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6D7385' }}>Admin Actions</h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A7B8' }}>Status</label>
            <select
              value={status}
              onChange={(e) => mark(setStatus)(e.target.value as adminApi.DisputeStatus)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.25)', color: '#FFFFFF' }}
            >
              {(Object.keys(STATUS_CONFIG) as adminApi.DisputeStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A7B8' }}>Priority</label>
            <select
              value={priority}
              onChange={(e) => mark(setPriority)(e.target.value as adminApi.AdminDispute['priority'])}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.25)', color: '#FFFFFF' }}
            >
              {(Object.keys(PRIORITY_CONFIG) as adminApi.AdminDispute['priority'][]).map((p) => (
                <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#A0A7B8' }}>Internal Admin Notes</label>
          <textarea
            value={adminNotes}
            onChange={(e) => { setAdminNotes(e.target.value); setDirty(true); }}
            rows={3}
            placeholder="Add internal notes visible only to admins..."
            className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none"
            style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.15)', color: '#FFFFFF' }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#A0A7B8' }}>
            Resolution Message <span style={{ color: '#6D7385', fontWeight: 'normal' }}>(sent to user)</span>
          </label>
          <textarea
            value={resolution}
            onChange={(e) => { setResolution(e.target.value); setDirty(true); }}
            rows={3}
            placeholder="Explain the outcome to the user, e.g. 'We have verified the duplicate charge and a refund of ₦5,000 will be processed within 5 business days...'"
            className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none"
            style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.15)', color: '#FFFFFF' }}
          />
        </div>

        {/* Quick status buttons */}
        <div className="flex flex-wrap gap-2">
          {(['under_review', 'resolved', 'rejected', 'escalated'] as adminApi.DisputeStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => mark(setStatus)(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={{
                  backgroundColor: status === s ? cfg.bg : 'rgba(255,255,255,0.04)',
                  color: status === s ? cfg.color : '#6D7385',
                  border: `1px solid ${status === s ? cfg.color + '40' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <button
          disabled={!dirty || updating}
          onClick={save}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: dirty ? '#7B61FF' : 'rgba(123,97,255,0.3)', color: '#FFF' }}
        >
          {updating ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export function AdminDisputes() {
  const [disputes, setDisputes] = useState<adminApi.AdminDispute[]>([]);
  const [stats, setStats] = useState<adminApi.DisputeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dis, st] = await Promise.all([
        adminApi.getAdminDisputes({ status: statusFilter !== 'all' ? statusFilter : undefined, priority: priorityFilter !== 'all' ? priorityFilter : undefined, search: search.trim() || undefined }),
        adminApi.getAdminDisputeStats(),
      ]);
      setDisputes(dis);
      setStats(st);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => { load(); }, [load]);

  async function handleUpdate(id: string, updates: Parameters<typeof adminApi.updateAdminDispute>[1]) {
    setUpdatingId(id);
    try {
      const updated = await adminApi.updateAdminDispute(id, updates);
      setDisputes((prev) => prev.map((d) => d.id === id ? updated : d));
      // Refresh stats
      adminApi.getAdminDisputeStats().then(setStats).catch(() => {});
    } catch (err: any) {
      alert(`Failed to update dispute: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return disputes;
    const q = search.toLowerCase();
    return disputes.filter((d) =>
      d.transactionReference.toLowerCase().includes(q) ||
      d.userEmail.toLowerCase().includes(q) ||
      (d.userName ?? '').toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q)
    );
  }, [disputes, search]);

  const statCards = stats ? [
    { label: 'Total',         value: stats.total,        color: '#A0A7B8', bg: 'rgba(160,167,184,0.1)' },
    { label: 'Open',          value: stats.open,         color: '#F87171', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Under Review',  value: stats.under_review, color: '#FCD34D', bg: 'rgba(251,191,36,0.1)' },
    { label: 'Resolved',      value: stats.resolved,     color: '#4ADE80', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Escalated',     value: stats.escalated,    color: '#C084FC', bg: 'rgba(168,85,247,0.1)' },
    { label: 'Critical',      value: stats.critical,     color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  ] : [];

  return (
    <div className="space-y-6 p-6" style={{ minHeight: '100vh', backgroundColor: '#0B0F1A' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: '#F87171' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Payment Disputes</h1>
            <p className="text-sm" style={{ color: '#A0A7B8' }}>Review, investigate, and resolve user transaction disputes</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50" style={{ backgroundColor: 'rgba(123,97,255,0.1)', color: '#7B61FF', border: '1px solid rgba(123,97,255,0.25)' }}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: '#121826', border: '1px solid rgba(123,97,255,0.08)' }}>
            <div className="text-2xl font-bold mb-1" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs" style={{ color: '#6D7385' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 flex flex-wrap gap-3 items-center" style={{ backgroundColor: '#121826', border: '1px solid rgba(123,97,255,0.08)' }}>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6D7385' }} />
          <input
            type="text"
            placeholder="Search by reference, email, or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1"
            style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.15)', color: '#FFFFFF' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: '#6D7385' }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.15)', color: '#FFFFFF' }}>
            <option value="all">All Statuses</option>
            {(Object.keys(STATUS_CONFIG) as adminApi.DisputeStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(123,97,255,0.15)', color: '#FFFFFF' }}>
            <option value="all">All Priorities</option>
            {(Object.keys(PRIORITY_CONFIG) as adminApi.AdminDispute['priority'][]).map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </div>
        <span className="text-xs ml-auto" style={{ color: '#6D7385' }}>
          {filtered.length} dispute{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={load} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#121826', border: '1px solid rgba(123,97,255,0.08)' }}>
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3" style={{ color: '#6D7385' }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7B61FF' }} />
            <p className="text-sm">Loading disputes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#A0A7B8' }} />
            <p className="font-semibold" style={{ color: '#A0A7B8' }}>No disputes found</p>
            <p className="text-sm mt-1" style={{ color: '#6D7385' }}>
              {search || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No disputes have been filed yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6D7385', borderBottom: '1px solid rgba(123,97,255,0.08)', backgroundColor: 'rgba(123,97,255,0.03)' }}>
              <div className="col-span-2">User</div>
              <div className="col-span-2">Reference</div>
              <div className="col-span-1">Amount</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Filed</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {filtered.map((d) => {
              const expanded = expandedId === d.id;
              return (
                <React.Fragment key={d.id}>
                  {/* Row */}
                  <div
                    className="grid grid-cols-12 gap-2 px-5 py-4 items-center transition cursor-pointer"
                    style={{
                      borderBottom: '1px solid rgba(123,97,255,0.06)',
                      backgroundColor: expanded ? 'rgba(123,97,255,0.04)' : 'transparent',
                    }}
                    onClick={() => setExpandedId(expanded ? null : d.id)}
                  >
                    <div className="col-span-2 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#FFFFFF' }}>{d.userName ?? d.userEmail.split('@')[0]}</p>
                      <p className="text-xs truncate" style={{ color: '#6D7385' }}>{d.userEmail}</p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <code className="text-xs font-mono truncate block" style={{ color: '#FF9800' }}>{d.transactionReference}</code>
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm font-bold" style={{ color: '#FFFFFF' }}>₦{d.transactionAmount.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs" style={{ color: '#A0A7B8' }}>{DISPUTE_TYPE_LABELS[d.disputeType] ?? d.disputeType}</span>
                    </div>
                    <div className="col-span-1">
                      <PriorityBadge priority={d.priority} />
                    </div>
                    <div className="col-span-1">
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="col-span-2 text-xs" style={{ color: '#6D7385' }}>
                      <RelativeTime dateStr={d.createdAt} />
                      <p className="text-[10px] mt-0.5">{new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedId(expanded ? null : d.id); }}
                        className="p-1.5 rounded-lg transition"
                        style={{ backgroundColor: expanded ? 'rgba(123,97,255,0.2)' : 'rgba(255,255,255,0.04)', color: expanded ? '#7B61FF' : '#6D7385' }}
                        aria-label={expanded ? 'Collapse' : 'Expand'}
                      >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {expanded && (
                    <DisputeDetailPanel
                      dispute={d}
                      onUpdate={(updates) => handleUpdate(d.id, updates)}
                      updating={updatingId === d.id}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
