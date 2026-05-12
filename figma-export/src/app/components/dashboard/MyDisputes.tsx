import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  X,
  Flag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  FileText,
  Plus,
  MessageSquare,
  User,
  Shield,
  Zap,
  Send,
} from 'lucide-react';
import { getUserDisputes, getDisputeTimeline, submitDispute } from '../../utils/payment-api';
import type { PaymentDispute, DisputeUpdate, DisputeType, SubmitDisputeInput } from '../../utils/payment-api';

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  failed_debit: 'Failed Debit',
  duplicate: 'Duplicate Charge',
  wrong_amount: 'Wrong Amount',
  unauthorized: 'Unauthorized',
  other: 'Other',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; step: number; desc: string }> = {
  open: {
    label: 'Open',
    color: '#F87171',
    bg: 'rgba(239,68,68,0.1)',
    icon: AlertTriangle,
    step: 1,
    desc: 'Your dispute has been filed and is awaiting review.',
  },
  under_review: {
    label: 'Under Review',
    color: '#FCD34D',
    bg: 'rgba(251,191,36,0.1)',
    icon: Clock,
    step: 2,
    desc: 'Our team is actively investigating your dispute.',
  },
  escalated: {
    label: 'Escalated',
    color: '#C084FC',
    bg: 'rgba(168,85,247,0.1)',
    icon: Flag,
    step: 2,
    desc: 'Your dispute has been escalated to senior review.',
  },
  resolved: {
    label: 'Resolved',
    color: '#4ADE80',
    bg: 'rgba(34,197,94,0.1)',
    icon: CheckCircle,
    step: 3,
    desc: 'Your dispute has been resolved. Check the resolution message below.',
  },
  rejected: {
    label: 'Rejected',
    color: '#9CA3AF',
    bg: 'rgba(107,114,128,0.1)',
    icon: X,
    step: 3,
    desc: 'Your dispute was reviewed and could not be upheld.',
  },
};

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  submitted:        { icon: FileText,     color: '#FF6B00', label: 'Dispute Submitted' },
  status_changed:   { icon: Zap,          color: '#FCD34D', label: 'Status Updated' },
  priority_changed: { icon: Flag,         color: '#C084FC', label: 'Priority Changed' },
  notes_updated:    { icon: MessageSquare, color: '#60A5FA', label: 'Notes Updated' },
  resolution_added: { icon: CheckCircle,  color: '#4ADE80', label: 'Resolution Provided' },
  default:          { icon: Clock,        color: '#6D7385', label: 'Activity' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function ProgressTracker({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const currentStep = cfg.step;
  const steps = [
    { step: 1, label: 'Filed', icon: FileText },
    { step: 2, label: 'In Review', icon: Clock },
    { step: 3, label: status === 'resolved' ? 'Resolved' : status === 'rejected' ? 'Rejected' : 'Closed', icon: status === 'resolved' ? CheckCircle : status === 'rejected' ? X : CheckCircle },
  ];

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((s, i) => {
        const done = currentStep > s.step;
        const active = currentStep === s.step;
        const Icon = s.icon;
        return (
          <div key={s.step} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  backgroundColor: done ? '#4ADE80' : active ? '#FF6B00' : 'rgba(255,255,255,0.06)',
                  color: done || active ? '#FFF' : '#6D7385',
                  border: active ? '2px solid #FF6B00' : done ? '2px solid #4ADE80' : '2px solid rgba(255,255,255,0.1)',
                }}>
                {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-xs whitespace-nowrap" style={{ color: active ? '#FF6B00' : done ? '#4ADE80' : '#6D7385' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 mb-5 transition-all"
                style={{ backgroundColor: done ? '#4ADE80' : 'rgba(255,255,255,0.07)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ disputeId }: { disputeId: string }) {
  const [events, setEvents] = useState<DisputeUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDisputeTimeline(disputeId)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [disputeId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4" style={{ color: '#6D7385' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading activity...
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-xs py-2" style={{ color: '#6D7385' }}>No activity recorded yet.</p>;
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-3 bottom-3 w-px" style={{ backgroundColor: 'rgba(255,107,0,0.12)' }} />

      <div className="space-y-4">
        {events.map((ev, i) => {
          const cfg = EVENT_CONFIG[ev.eventType] ?? EVENT_CONFIG.default;
          const Icon = cfg.icon;
          const isUser = ev.actorType === 'user';
          const isAdmin = ev.actorType === 'admin';
          return (
            <div key={ev.id} className="flex gap-3 relative">
              {/* Icon dot */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{ backgroundColor: `${cfg.color}18`, border: `1.5px solid ${cfg.color}40` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>{cfg.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#D1D5DB' }}>{ev.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: '#6D7385' }}>
                      {new Date(ev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#6D7385' }}>
                      {new Date(ev.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {/* Actor badge */}
                <div className="flex items-center gap-1 mt-1">
                  {isAdmin
                    ? <><Shield className="w-3 h-3" style={{ color: '#7B61FF' }} /><span className="text-xs" style={{ color: '#7B61FF' }}>Admin</span></>
                    : isUser
                    ? <><User className="w-3 h-3" style={{ color: '#FF6B00' }} /><span className="text-xs" style={{ color: '#FF6B00' }}>You</span></>
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

function DisputeCard({ dispute }: { dispute: PaymentDispute }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[dispute.status] ?? STATUS_CONFIG.open;

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ backgroundColor: '#161616', border: `1px solid ${expanded ? 'rgba(255,107,0,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
      {/* Header row */}
      <button
        className="w-full text-left p-5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <StatusBadge status={dispute.status} />
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(255,107,0,0.08)', color: '#FF9800' }}>
                {DISPUTE_TYPE_LABELS[dispute.disputeType] ?? dispute.disputeType}
              </span>
            </div>
            <p className="text-sm font-semibold truncate" style={{ color: '#FFFFFF' }}>
              Transaction Dispute - NGN {dispute.transactionAmount.toLocaleString()}
            </p>
            <p className="text-xs mt-0.5 font-mono" style={{ color: '#6D7385' }}>{dispute.transactionReference}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs mb-1" style={{ color: '#6D7385' }}>
              Filed {new Date(dispute.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            {expanded
              ? <ChevronUp className="w-4 h-4 ml-auto" style={{ color: '#FF6B00' }} />
              : <ChevronDown className="w-4 h-4 ml-auto" style={{ color: '#6D7385' }} />
            }
          </div>
        </div>

        {/* Progress tracker */}
        <div className="mt-4">
          <ProgressTracker status={dispute.status} />
        </div>

        {/* Status description */}
        <p className="mt-3 text-xs" style={{ color: '#A0A7B8' }}>{cfg.desc}</p>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,107,0,0.08)' }}>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: case details */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6D7385' }}>Case Details</h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs" style={{ color: '#6D7385' }}>Dispute ID</p>
                  <code className="text-xs font-mono mt-0.5 block" style={{ color: '#A0A7B8' }}>{dispute.id.slice(0, 8)}...</code>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#6D7385' }}>Amount</p>
                  <p className="font-bold" style={{ color: '#FFFFFF' }}>NGN {dispute.transactionAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#6D7385' }}>Type</p>
                  <p className="text-sm" style={{ color: '#D1D5DB' }}>{DISPUTE_TYPE_LABELS[dispute.disputeType] ?? dispute.disputeType}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#6D7385' }}>Filed On</p>
                  <p className="text-xs" style={{ color: '#D1D5DB' }}>
                    {new Date(dispute.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: '#6D7385' }}>Your Description</p>
                <p className="text-sm p-3 rounded-lg whitespace-pre-wrap" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {dispute.description}
                </p>
              </div>

              {dispute.resolution && (
                <div>
                  <p className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#4ADE80' }}>
                    <CheckCircle className="w-3.5 h-3.5" /> Resolution from our team
                  </p>
                  <p className="text-sm p-3 rounded-lg whitespace-pre-wrap"
                    style={{ backgroundColor: 'rgba(34,197,94,0.05)', color: '#D1D5DB', border: '1px solid rgba(34,197,94,0.15)' }}>
                    {dispute.resolution}
                  </p>
                </div>
              )}
            </div>

            {/* Right: activity timeline */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#6D7385' }}>Activity Log</h3>
              <Timeline disputeId={dispute.id} />

              {/* Expected timeline for in-flight disputes */}
              {(dispute.status === 'open' || dispute.status === 'under_review') && (
                <div className="mt-4 p-3 rounded-xl text-xs"
                  style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: '#93C5FD' }}>
                  <p className="font-semibold mb-1">â± What to expect</p>
                  <p>Most disputes are resolved within <strong>2â€“5 business days</strong>. You will see status updates here as our team reviews your case.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewDisputeForm({
    prefill,
    onSuccess,
    onCancel,
  }: {
    prefill?: Partial<SubmitDisputeInput>;
    onSuccess: () => void;
    onCancel: () => void;
  }) {
    const [form, setForm] = useState<SubmitDisputeInput>({
      transactionReference: prefill?.transactionReference ?? '',
      transactionAmount: prefill?.transactionAmount ?? 0,
      transactionDate: prefill?.transactionDate,
      disputeType: prefill?.disputeType ?? 'failed_debit',
      description: prefill?.description ?? '',
      bankStatementNote: prefill?.bankStatementNote ?? '',
      contactPhone: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const disputeTypes: { value: DisputeType; label: string }[] = [
      { value: 'failed_debit', label: 'Failed Debit (charged but payment failed)' },
      { value: 'duplicate', label: 'Duplicate Charge' },
      { value: 'wrong_amount', label: 'Wrong Amount Charged' },
      { value: 'unauthorized', label: 'Unauthorized Transaction' },
      { value: 'other', label: 'Other' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.transactionReference.trim() || !form.description.trim()) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        await submitDispute(form);
        onSuccess();
      } catch (err: any) {
        setSubmitError(err?.message ?? 'Failed to submit dispute. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: '#161616', border: '1px solid rgba(255,107,0,0.2)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>File a Dispute</h3>
          <button type="button" onClick={onCancel} className="text-[#6D7385] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#B3B3B3' }}>Transaction Reference <span style={{ color: '#FF6B00' }}>*</span></label>
            <input required value={form.transactionReference} onChange={e => setForm(f => ({ ...f, transactionReference: e.target.value }))}
              placeholder="e.g. PAY_xxxxxxxx" className="w-full px-3 py-2.5 rounded-xl text-sm font-mono outline-none"
              style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#B3B3B3' }}>Amount Charged (NGN) <span style={{ color: '#FF6B00' }}>*</span></label>
            <input required type="number" min={0} value={form.transactionAmount || ''} onChange={e => setForm(f => ({ ...f, transactionAmount: Number(e.target.value) }))}
              placeholder="e.g. 15000" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#B3B3B3' }}>Dispute Type</label>
            <select value={form.disputeType} onChange={e => setForm(f => ({ ...f, disputeType: e.target.value as DisputeType }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}>
              {disputeTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#B3B3B3' }}>Transaction Date</label>
            <input type="date" value={form.transactionDate ? form.transactionDate.slice(0, 10) : ''} onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value || undefined }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#B3B3B3' }}>Describe the Issue <span style={{ color: '#FF6B00' }}>*</span></label>
          <textarea required rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe what happened - when the charge occurred, what you were paying for, and what went wrong."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#B3B3B3' }}>Bank Statement Note (optional)</label>
            <input value={form.bankStatementNote ?? ''} onChange={e => setForm(f => ({ ...f, bankStatementNote: e.target.value || undefined }))}
              placeholder="How does it appear on your statement?" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#B3B3B3' }}>Contact Phone (optional)</label>
            <input value={form.contactPhone ?? ''} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value || undefined }))}
              placeholder="+234 xxx xxxx" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }} />
          </div>
        </div>
        {submitError && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{submitError}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-60"
            style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit Dispute'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm font-medium transition"
            style={{ color: '#6D7385', border: '1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
        </div>
      </form>
    );
  }

export function MyDisputes() {
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formPrefill, setFormPrefill] = useState<Partial<SubmitDisputeInput> | undefined>();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const basePath = location.pathname.startsWith('/label-dashboard') ? '/label-dashboard' : '/dashboard';

  useEffect(() => {
    const state = location.state as {
      openDisputeForm?: boolean;
      disputeType?: DisputeType;
      transactionReference?: string;
      transactionAmount?: number;
      transactionDate?: string;
      description?: string;
    } | null;

    if (!state?.openDisputeForm) {
      return;
    }

    setFormPrefill({
      disputeType: state.disputeType ?? 'failed_debit',
      transactionReference: state.transactionReference ?? '',
      transactionAmount: state.transactionAmount ?? 0,
      transactionDate: state.transactionDate,
      description: state.description ?? '',
    });
    setShowForm(true);

    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }, [location.state]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserDisputes();
      setDisputes(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    open: disputes.filter((d) => d.status === 'open').length,
    underReview: disputes.filter((d) => d.status === 'under_review' || d.status === 'escalated').length,
    resolved: disputes.filter((d) => d.status === 'resolved' || d.status === 'rejected').length,
  };

  return (
    <div className="space-y-6 p-4 md:p-6" style={{ minHeight: '100vh', backgroundColor: '#0A0A0A' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>My Disputes</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            Track all payment disputes you have filed with us
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
          style={{ backgroundColor: 'rgba(255,107,0,0.1)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.2)' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={() => {
            setSubmitSuccess(false);
            setFormPrefill(undefined);
            setShowForm(true);
            window.setTimeout(() => {
              formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition"
          style={{ backgroundColor: '#FF6B00', color: '#FFFFFF', border: '1px solid rgba(255,107,0,0.3)' }}
        >
          <Plus className="w-4 h-4" />
          New Dispute
        </button>
      </div>

      {submitSuccess && (
        <div className="flex items-center gap-2 p-4 rounded-xl"
          style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#86EFAC' }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">Your dispute has been submitted successfully and is now under review.</p>
        </div>
      )}

      {showForm && (
        <div ref={formRef}>
          <NewDisputeForm
            prefill={formPrefill}
            onCancel={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              setSubmitSuccess(true);
              setFormPrefill(undefined);
              void load();
            }}
          />
        </div>
      )}

      {/* Summary stats */}
      {disputes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Open', value: counts.open, color: '#F87171', bg: 'rgba(239,68,68,0.07)' },
            { label: 'In Review', value: counts.underReview, color: '#FCD34D', bg: 'rgba(251,191,36,0.07)' },
            { label: 'Closed', value: counts.resolved, color: '#4ADE80', bg: 'rgba(34,197,94,0.07)' },
          ].map((card) => (
            <div key={card.label} className="rounded-xl p-4 text-center"
              style={{ backgroundColor: card.bg, border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
              <p className="text-xs mt-1" style={{ color: '#888' }}>{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* How disputes work banner */}
      {!loading && disputes.length === 0 && !error && (
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,107,0,0.08)' }}>
            <AlertTriangle className="w-7 h-7" style={{ color: '#FF6B00' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#FFFFFF' }}>No Disputes Filed</h2>
          <p className="text-sm mb-5 max-w-sm mx-auto" style={{ color: '#888' }}>
            If you were debited for a failed, duplicate, or unauthorized transaction, you can file a dispute directly here or from your Payment History page.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition"
              style={{ backgroundColor: '#FF6B00', color: '#FFFFFF', border: '1px solid rgba(255,107,0,0.3)' }}
            >
              <Plus className="w-4 h-4" />
              File a Dispute
            </button>
            <a
              href={`${basePath}/payment-history`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition"
              style={{ backgroundColor: 'rgba(255,107,0,0.15)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.3)' }}
            >
              <Plus className="w-4 h-4" />
              Go to Payment History
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={load} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-16 gap-3" style={{ color: '#555' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FF6B00' }} />
          <p className="text-sm">Loading your disputes...</p>
        </div>
      )}

      {/* Disputes list */}
      {!loading && disputes.length > 0 && (
        <div className="space-y-4">
          {disputes.map((d) => (
            <DisputeCard key={d.id} dispute={d} />
          ))}
        </div>
      )}

      {/* Info footer */}
      {!loading && disputes.length > 0 && (
        <div className="p-4 rounded-xl text-xs" style={{ backgroundColor: '#161616', color: '#6D7385', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="font-semibold mb-1" style={{ color: '#888' }}>Need help?</p>
          <p>For urgent issues or if your dispute has not been resolved within 7 business days, contact our support team directly.</p>
        </div>
      )}
    </div>
  );
}
