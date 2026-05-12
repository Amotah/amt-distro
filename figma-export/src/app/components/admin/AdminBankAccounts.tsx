import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Loader2,
  RefreshCw,
  User,
  CreditCard,
  CalendarDays,
  StickyNote,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  getAdminBankAccountRequests,
  reviewBankAccountRequest,
  type AdminBankAccountRequest,
} from '../../utils/admin-api';

type Tab = 'all' | 'pending' | 'approved' | 'rejected';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: '#FCD34D',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.3)',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: '#4ADE80',
    bg: 'rgba(74,222,128,0.10)',
    border: 'rgba(74,222,128,0.3)',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: '#F87171',
    bg: 'rgba(248,113,113,0.10)',
    border: 'rgba(248,113,113,0.3)',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.10)',
    border: 'rgba(107,114,128,0.3)',
    icon: XCircle,
  },
};

function mask(num: string) {
  if (num.length < 4) return num;
  return '•'.repeat(num.length - 4) + num.slice(-4);
}

function fmt(dateStr: string | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface RequestCardProps {
  request: AdminBankAccountRequest;
  onReviewed: () => void;
}

function RequestCard({ request, onReviewed }: RequestCardProps) {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [acting, setActing] = useState<'approved' | 'rejected' | null>(null);

  const handleReview = async (status: 'approved' | 'rejected') => {
    setActing(status);
    try {
      await reviewBankAccountRequest(request.id, { status, adminNotes: notes || undefined });
      onReviewed();
    } catch {
      // silent – caller will refresh anyway
    } finally {
      setActing(null);
    }
  };

  const cfg = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <Card
      className="p-5"
      style={{ background: '#121826', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: user + account */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 flex-shrink-0" style={{ color: '#A0A7B8' }} />
            <span className="font-medium text-white truncate">{request.userName || '—'}</span>
            <span className="text-xs truncate" style={{ color: '#A0A7B8' }}>{request.userEmail}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: '#7B61FF' }} />
            <span style={{ color: '#E2E8F0' }}>{request.bankName}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <CreditCard className="w-4 h-4 flex-shrink-0" style={{ color: '#00E5FF' }} />
            <span style={{ color: '#E2E8F0' }}>{mask(request.accountNumber)}</span>
            <span style={{ color: '#A0A7B8' }}>—</span>
            <span style={{ color: '#E2E8F0' }}>{request.accountName}</span>
          </div>

          <div className="flex items-center gap-2 text-xs" style={{ color: '#A0A7B8' }}>
            <CalendarDays className="w-3.5 h-3.5" />
            Submitted: {fmt(request.createdAt)}
          </div>

          {request.adminNotes && (
            <div className="flex items-start gap-2 text-xs mt-1" style={{ color: '#A0A7B8' }}>
              <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{request.adminNotes}</span>
            </div>
          )}

          {request.reviewedBy && (
            <p className="text-xs" style={{ color: '#A0A7B8' }}>
              Reviewed by {request.reviewedBy} · {fmt(request.reviewedAt)}
            </p>
          )}
        </div>

        {/* Right: status + actions */}
        <div className="flex flex-col items-end gap-3">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>

          {request.status === 'pending' && (
            <div className="flex flex-col items-end gap-2">
              <button
                className="text-xs flex items-center gap-1"
                style={{ color: '#A0A7B8' }}
                onClick={() => setShowNotes(v => !v)}
              >
                <StickyNote className="w-3.5 h-3.5" />
                {showNotes ? 'Hide notes' : 'Add notes'}
                <ChevronDown className="w-3 h-3" style={{ transform: showNotes ? 'rotate(180deg)' : 'none' }} />
              </button>

              {showNotes && (
                <textarea
                  rows={2}
                  placeholder="Optional admin notes…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-56 text-xs rounded-lg px-3 py-2 resize-none"
                  style={{ background: '#0B0F1A', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.12)' }}
                />
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleReview('rejected')}
                  disabled={!!acting}
                  style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}
                >
                  {acting === 'rejected' ? <Loader2 className="w-3 h-3 animate-spin" /> : <>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </>}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleReview('approved')}
                  disabled={!!acting}
                  style={{ background: 'rgba(74,222,128,0.15)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.3)' }}
                >
                  {acting === 'approved' ? <Loader2 className="w-3 h-3 animate-spin" /> : <>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                  </>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function AdminBankAccounts() {
  const [requests, setRequests] = useState<AdminBankAccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminBankAccountRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab);

  return (
    <div className="p-6 space-y-6" style={{ background: '#0B0F1A', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Bank Account Requests</h1>
          <p className="text-sm mt-1" style={{ color: '#A0A7B8' }}>Review and approve user bank account change requests</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#A0A7B8' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</>}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.all, color: '#7B61FF', icon: Building2 },
          { label: 'Pending', value: counts.pending, color: '#FCD34D', icon: Clock },
          { label: 'Approved', value: counts.approved, color: '#4ADE80', icon: CheckCircle },
          { label: 'Rejected', value: counts.rejected, color: '#F87171', icon: XCircle },
        ].map(stat => {
          const StatIcon = stat.icon;
          return (
            <Card key={stat.label} className="p-4" style={{ background: '#121826', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <StatIcon className="w-5 h-5" style={{ color: stat.color }} />
                <div>
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs" style={{ color: '#A0A7B8' }}>{stat.label}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#121826' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={
              tab === t.key
                ? { background: '#7B61FF', color: '#fff' }
                : { color: '#A0A7B8' }
            }
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)' }}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: '#A0A7B8' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading requests…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={load} className="ml-auto underline">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: '#A0A7B8' }}>
          <Building2 className="w-10 h-10 opacity-40" />
          <p className="text-sm">No {tab === 'all' ? '' : tab} requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(req => (
            <RequestCard key={req.id} request={req} onReviewed={load} />
          ))}
        </div>
      )}
    </div>
  );
}
