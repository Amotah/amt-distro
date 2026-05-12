import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as adminApi from '../../utils/admin-api';
import { getArtistVerificationState } from '../../utils/artist-verification';
import {
  AlertTriangle,
  ArrowUpDown,
  BadgeCheck,
  Ban,
  Building2,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  Filter,
  KeyRound,
  LayoutList,
  Loader2,
  Music,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(user: adminApi.User) {
  const n = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.artistName || user.labelName || user.email;
  return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function displayName(user: adminApi.User) {
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.artistName || user.labelName || user.email.split('@')[0];
}

function kycBadge(status?: string) {
  if (status === 'verified') return { label: 'Verified', cls: 'bg-[#1DB954]/15 text-[#7DFFAE] border-[#1DB954]/30' };
  if (status === 'pending') return { label: 'Pending', cls: 'bg-[#FFD600]/15 text-[#FFE88A] border-[#FFD600]/30' };
  return { label: 'Unverified', cls: 'bg-[#A0A7B8]/15 text-[#A0A7B8] border-[#A0A7B8]/30' };
}

function accountBadge(isActive: boolean) {
  return isActive
    ? { label: 'Active', cls: 'bg-[#1DB954]/15 text-[#7DFFAE] border-[#1DB954]/30' }
    : { label: 'Suspended', cls: 'bg-red-500/15 text-red-300 border-red-500/30' };
}

function releaseStatusBadge(s: string) {
  const map: Record<string, string> = {
    live: 'bg-[#1DB954]/15 text-[#7DFFAE] border-[#1DB954]/30',
    submitted: 'bg-[#7B61FF]/15 text-[#C4B5FD] border-[#7B61FF]/30',
    processing: 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/30',
    draft: 'bg-[#A0A7B8]/15 text-[#A0A7B8] border-[#A0A7B8]/30',
    failed: 'bg-red-500/15 text-red-300 border-red-500/30',
    rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
    takedown: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  };
  return map[s] || 'bg-[#A0A7B8]/15 text-[#A0A7B8] border-[#A0A7B8]/30';
}

function payoutStatusBadge(s: string) {
  const map: Record<string, string> = {
    completed: 'bg-[#1DB954]/15 text-[#7DFFAE] border-[#1DB954]/30',
    pending: 'bg-[#FFD600]/15 text-[#FFE88A] border-[#FFD600]/30',
    failed: 'bg-red-500/15 text-red-300 border-red-500/30',
  };
  return map[s] || 'bg-[#A0A7B8]/15 text-[#A0A7B8] border-[#A0A7B8]/30';
}

function getUserRevenueYTD(userId: string, payouts: adminApi.PayoutRequest[]) {
  const year = new Date().getFullYear();
  return payouts
    .filter(p => p.userId === userId && p.status === 'completed' && new Date(p.createdAt).getFullYear() === year)
    .reduce((s, p) => s + p.amount, 0);
}

function exportUsersCSV(users: adminApi.User[], releases: adminApi.Release[], payouts: adminApi.PayoutRequest[]) {
  const headers = ['Name', 'Stage/Label Name', 'Email', 'Role', 'Registered', 'KYC Status', 'Status', 'Releases', 'Revenue YTD (NGN)'];
  const rows = users.map(u => [
    displayName(u),
    u.artistName || u.labelName || '',
    u.email,
    u.role,
    fmtDate(u.createdAt),
    u.verificationStatus || 'unverified',
    u.isVerified ? 'active' : 'suspended',
    releases.filter(r => r.userId === u.id).length,
    getUserRevenueYTD(u.id, payouts),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── SortHeader ───────────────────────────────────────────────────────────────
function SortHeader({ field, label, sortField, sortDir, onSort }: {
  field: string; label: string; sortField: string; sortDir: 'asc' | 'desc';
  onSort: (f: string) => void;
}) {
  const active = sortField === field;
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8] hover:text-white"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}

// ─── ConfirmDialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel, isLoading }: {
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void; isLoading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#7B61FF]/20 bg-[#121826] p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-[#A0A7B8]">{message}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-[#7B61FF]/20 py-2 text-sm text-[#A0A7B8] hover:text-white transition">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#7B61FF] hover:bg-[#6B51EF]'}`}
          >
            {isLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ArtistDrawer ──────────────────────────────────────────────────────────────
function ArtistDrawer({ user, releases, payouts, onClose, onUpdate, onDelete }: {
  user: adminApi.User;
  releases: adminApi.Release[];
  payouts: adminApi.PayoutRequest[];
  onClose: () => void;
  onUpdate: (u: adminApi.User) => void;
  onDelete: (u: adminApi.User) => void;
}) {
  const [drawerTab, setDrawerTab] = useState<'overview' | 'releases' | 'payouts' | 'actions'>('overview');
  const [isActioning, setIsActioning] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [confirm, setConfirm] = useState<{ type: 'suspend' | 'activate' | 'delete' | 'reject_kyc' } | null>(null);

  const userReleases = useMemo(() => releases.filter(r => r.userId === user.id), [releases, user.id]);
  const userPayouts = useMemo(() => payouts.filter(p => p.userId === user.id), [payouts, user.id]);
  const revenueYTD = getUserRevenueYTD(user.id, payouts);
  const totalPaid = userPayouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const kyc = kycBadge(user.verificationStatus);
  const acct = accountBadge(user.isVerified);

  async function act(fn: () => Promise<adminApi.User | void>) {
    setIsActioning(true);
    setActionErr('');
    try {
      const updated = await fn();
      if (updated) onUpdate(updated as adminApi.User);
    } catch (e: any) {
      setActionErr(e.message || 'Action failed');
    } finally {
      setIsActioning(false);
      setConfirm(null);
    }
  }

  async function handleVerifyKYC() {
    await act(() => adminApi.updateUser(user.id, {
      verificationStatus: 'verified',
      isVerified: true,
      verification: {
        emailConfirmed: true,
        idVerified: true,
        idVerificationOptional: user.verification?.idVerificationOptional ?? false,
        profileReviewed: true,
        reviewedAt: new Date().toISOString(),
        reviewNotes: 'KYC verified by admin.',
      },
    }));
  }

  async function handleRejectKYC() {
    const reason = window.prompt('Rejection reason:', 'KYC rejected by admin.');
    if (reason === null) return;
    await act(() => adminApi.updateUser(user.id, {
      verificationStatus: 'unverified',
      verification: {
        emailConfirmed: user.verification?.emailConfirmed ?? false,
        idVerified: false,
        idVerificationOptional: user.verification?.idVerificationOptional ?? false,
        profileReviewed: true,
        reviewedAt: new Date().toISOString(),
        reviewNotes: reason || 'KYC rejected by admin.',
      },
    }));
  }

  async function handleToggleSuspend() {
    await act(() => adminApi.updateUser(user.id, { isVerified: !user.isVerified }));
  }

  async function handleDelete() {
    setIsActioning(true);
    setActionErr('');
    try {
      await adminApi.deleteUser(user.id);
      onDelete(user);
      onClose();
    } catch (e: any) {
      setActionErr(e.message || 'Delete failed');
      setIsActioning(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-[#7B61FF]/20 bg-[#0D1220] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#7B61FF]/10 bg-[#0B0F1A] px-6 py-4">
          <div className="flex items-center gap-3">
            {user.profileImage
              ? <img src={user.profileImage} alt="" className="h-10 w-10 rounded-full object-cover" />
              : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7B61FF]/20 text-sm font-bold text-[#C4B5FD]">{initials(user)}</div>
            }
            <div>
              <p className="font-bold text-white">{displayName(user)}</p>
              {user.artistName && <p className="text-xs text-[#A0A7B8]">@{user.artistName}</p>}
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-[#A0A7B8] hover:bg-white/10 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#7B61FF]/10 bg-[#0B0F1A]">
          {(['overview', 'releases', 'payouts', 'actions'] as const).map(t => (
            <button
              key={t}
              onClick={() => setDrawerTab(t)}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition ${drawerTab === t ? 'border-b-2 border-[#7B61FF] text-[#C4B5FD]' : 'text-[#A0A7B8] hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Error */}
        {actionErr && (
          <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {actionErr} <button onClick={() => setActionErr('')} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {drawerTab === 'overview' && (
            <>
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${kyc.cls}`}>
                  <ShieldCheck className="h-3 w-3" /> KYC: {kyc.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${acct.cls}`}>
                  <User className="h-3 w-3" /> {acct.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-3 py-1 text-xs font-semibold text-[#C4B5FD]">
                  {user.subscriptionTier}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Releases', value: userReleases.length, icon: Music },
                  { label: 'Revenue YTD', value: fmtCurrency(revenueYTD), icon: DollarSign },
                  { label: 'Total Paid', value: fmtCurrency(totalPaid), icon: CircleCheck },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-3 text-center">
                    <Icon className="mx-auto mb-1 h-4 w-4 text-[#7B61FF]" />
                    <p className="text-xs text-[#A0A7B8]">{label}</p>
                    <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Basic info */}
              <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] divide-y divide-[#7B61FF]/10">
                {[
                  { label: 'Email', value: user.email },
                  { label: 'Full Name', value: `${user.firstName || ''} ${user.lastName || ''}`.trim() || '—' },
                  { label: 'Stage Name', value: user.artistName || '—' },
                  { label: 'Country', value: user.country || '—' },
                  { label: 'Registered', value: fmtDate(user.createdAt) },
                  { label: 'User ID', value: user.id, mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-start gap-3 px-4 py-3">
                    <span className="w-28 shrink-0 text-xs text-[#A0A7B8]">{label}</span>
                    <span className={`text-sm text-white break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* KYC detail */}
              {user.verification && (
                <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A7B8] mb-3">KYC Verification Detail</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Email Confirmed', v: user.verification.emailConfirmed },
                      { label: 'ID Verified', v: user.verification.idVerified },
                      { label: 'Profile Reviewed', v: user.verification.profileReviewed },
                    ].map(({ label, v }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-[#A0A7B8]">{label}</span>
                        {v ? <CircleCheck className="h-4 w-4 text-[#1DB954]" /> : <XCircle className="h-4 w-4 text-red-400" />}
                      </div>
                    ))}
                    {user.verification.reviewNotes && (
                      <p className="mt-2 text-xs text-[#A0A7B8] bg-[#0B0F1A] rounded-lg p-3">
                        {user.verification.reviewNotes}
                      </p>
                    )}
                    {user.verification.idDocumentUrl && (
                      <a href={user.verification.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#7B61FF] hover:underline">
                        <ExternalLink className="h-3 w-3" /> View ID Document
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Payout account */}
              {userPayouts[0]?.payoutAccount && (
                <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A7B8] mb-3">Payout Account</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-white">{userPayouts[0].payoutAccount.accountName}</p>
                    <p className="font-mono text-[#A0A7B8]">{userPayouts[0].payoutAccount.accountNumber}</p>
                    <p className="text-[#A0A7B8]">{userPayouts[0].payoutAccount.bankName}</p>
                  </div>
                </div>
              )}

              {/* Social links */}
              {user.socialLinks && Object.values(user.socialLinks).some(Boolean) && (
                <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A7B8] mb-3">Social Links</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(user.socialLinks).filter(([, v]) => v).map(([k, v]) => (
                      <a key={k} href={v as string} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[#7B61FF]/20 bg-[#0B0F1A] px-3 py-1 text-xs text-[#C4B5FD] hover:bg-[#7B61FF]/10 transition capitalize">
                        <ExternalLink className="h-3 w-3" /> {k}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {drawerTab === 'releases' && (
            <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] overflow-hidden">
              <div className="border-b border-[#7B61FF]/10 bg-[#0B0F1A] px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Release History ({userReleases.length})</p>
              </div>
              {userReleases.length === 0
                ? <div className="py-12 text-center text-sm text-[#A0A7B8]">No releases found</div>
                : (
                  <table className="w-full">
                    <thead className="bg-[#0B0F1A]">
                      <tr>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Title</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Type</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Status</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#7B61FF]/10">
                      {userReleases.map(r => (
                        <tr key={r.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {r.artworkUrl
                                ? <img src={r.artworkUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                                : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#7B61FF]/20"><Music className="h-4 w-4 text-[#7B61FF]" /></div>
                              }
                              <span className="text-sm text-white">{r.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs capitalize text-[#A0A7B8]">{r.releaseType}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${releaseStatusBadge(r.status)}`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDate(r.releaseDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {drawerTab === 'payouts' && (
            <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] overflow-hidden">
              <div className="border-b border-[#7B61FF]/10 bg-[#0B0F1A] px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Payout History ({userPayouts.length})</p>
                <span className="text-xs text-[#A0A7B8]">Total: {fmtCurrency(totalPaid)}</span>
              </div>
              {userPayouts.length === 0
                ? <div className="py-12 text-center text-sm text-[#A0A7B8]">No payouts found</div>
                : (
                  <table className="w-full">
                    <thead className="bg-[#0B0F1A]">
                      <tr>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Amount</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Status</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Date</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#7B61FF]/10">
                      {userPayouts.map(p => (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-sm font-semibold text-white">{fmtCurrency(p.amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${payoutStatusBadge(p.status)}`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDate(p.createdAt)}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-[#A0A7B8]">{p.reference.slice(0, 12)}…</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {drawerTab === 'actions' && (
            <div className="space-y-3">
              {/* KYC Actions */}
              <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A7B8]">KYC Actions</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyKYC}
                    disabled={isActioning || user.verificationStatus === 'verified'}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#1DB954]/10 border border-[#1DB954]/30 py-2 text-sm font-medium text-[#7DFFAE] hover:bg-[#1DB954]/20 transition disabled:opacity-40"
                  >
                    {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Verify KYC
                  </button>
                  <button
                    onClick={handleRejectKYC}
                    disabled={isActioning}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 transition disabled:opacity-40"
                  >
                    {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                    Reject KYC
                  </button>
                </div>
              </div>

              {/* Account Actions */}
              <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A7B8]">Account Actions</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setConfirm({ type: user.isVerified ? 'suspend' : 'activate' })}
                    disabled={isActioning}
                    className={`w-full flex items-center gap-2 rounded-lg border py-2.5 px-4 text-sm font-medium transition disabled:opacity-40 ${
                      user.isVerified
                        ? 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
                        : 'border-[#1DB954]/30 bg-[#1DB954]/10 text-[#7DFFAE] hover:bg-[#1DB954]/20'
                    }`}
                  >
                    {user.isVerified ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    {user.isVerified ? 'Suspend Account' : 'Activate Account'}
                  </button>

                  <button
                    onClick={() => exportUsersCSV([user], [], [])}
                    className="w-full flex items-center gap-2 rounded-lg border border-[#7B61FF]/20 bg-[#7B61FF]/10 py-2.5 px-4 text-sm font-medium text-[#C4B5FD] hover:bg-[#7B61FF]/20 transition"
                  >
                    <Download className="h-4 w-4" /> Export Artist Data
                  </button>

                  <button
                    onClick={() => setConfirm({ type: 'delete' })}
                    disabled={isActioning}
                    className="w-full flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 px-4 text-sm font-medium text-red-300 hover:bg-red-500/20 transition disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Account
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#7B61FF]/10 bg-[#121826] p-4">
                <p className="text-xs text-[#A0A7B8]">
                  <strong className="text-white">Note:</strong> Account suspension will prevent login. KYC verification is required for payouts.
                  Deletion is permanent and cannot be undone.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <ConfirmDialog
          title={
            confirm.type === 'suspend' ? 'Suspend Account' :
            confirm.type === 'activate' ? 'Activate Account' :
            'Delete Account'
          }
          message={
            confirm.type === 'suspend' ? `Suspend ${displayName(user)}? They will no longer be able to log in.` :
            confirm.type === 'activate' ? `Reactivate ${displayName(user)}'s account?` :
            `Permanently delete ${displayName(user)}'s account? This action cannot be undone.`
          }
          confirmLabel={
            confirm.type === 'suspend' ? 'Suspend' :
            confirm.type === 'activate' ? 'Activate' :
            'Delete Permanently'
          }
          danger={confirm.type === 'delete' || confirm.type === 'suspend'}
          isLoading={isActioning}
          onCancel={() => setConfirm(null)}
          onConfirm={confirm.type === 'delete' ? handleDelete : handleToggleSuspend}
        />
      )}
    </>
  );
}

// ─── LabelDrawer ───────────────────────────────────────────────────────────────
function LabelDrawer({ user, releases, payouts, onClose, onUpdate, onDelete }: {
  user: adminApi.User;
  releases: adminApi.Release[];
  payouts: adminApi.PayoutRequest[];
  onClose: () => void;
  onUpdate: (u: adminApi.User) => void;
  onDelete: (u: adminApi.User) => void;
}) {
  const [drawerTab, setDrawerTab] = useState<'overview' | 'releases' | 'payouts' | 'actions'>('overview');
  const [isActioning, setIsActioning] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [confirm, setConfirm] = useState<{ type: 'suspend' | 'activate' | 'delete' } | null>(null);

  const labelReleases = useMemo(() => releases.filter(r => r.userId === user.id), [releases, user.id]);
  const labelPayouts = useMemo(() => payouts.filter(p => p.userId === user.id), [payouts, user.id]);
  const revenueYTD = getUserRevenueYTD(user.id, payouts);
  const totalPaid = labelPayouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const kyc = kycBadge(user.verificationStatus);
  const acct = accountBadge(user.isVerified);

  async function handleToggleSuspend() {
    setIsActioning(true);
    setActionErr('');
    try {
      const updated = await adminApi.updateUser(user.id, { isVerified: !user.isVerified });
      onUpdate(updated);
    } catch (e: any) {
      setActionErr(e.message || 'Action failed');
    } finally {
      setIsActioning(false);
      setConfirm(null);
    }
  }

  async function handleDelete() {
    setIsActioning(true);
    setActionErr('');
    try {
      await adminApi.deleteUser(user.id);
      onDelete(user);
      onClose();
    } catch (e: any) {
      setActionErr(e.message || 'Delete failed');
      setIsActioning(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-[#7B61FF]/20 bg-[#0D1220] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#7B61FF]/10 bg-[#0B0F1A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00E5FF]/20 text-sm font-bold text-[#00E5FF]">
              {initials(user)}
            </div>
            <div>
              <p className="font-bold text-white">{user.labelName || displayName(user)}</p>
              <p className="text-xs text-[#A0A7B8]">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[#A0A7B8] hover:bg-white/10 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#7B61FF]/10 bg-[#0B0F1A]">
          {(['overview', 'releases', 'payouts', 'actions'] as const).map(t => (
            <button
              key={t}
              onClick={() => setDrawerTab(t)}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition ${drawerTab === t ? 'border-b-2 border-[#00E5FF] text-[#00E5FF]' : 'text-[#A0A7B8] hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {actionErr && (
          <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {actionErr} <button onClick={() => setActionErr('')} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {drawerTab === 'overview' && (
            <>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${kyc.cls}`}>
                  <ShieldCheck className="h-3 w-3" /> KYC: {kyc.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${acct.cls}`}>
                  <Building2 className="h-3 w-3" /> {acct.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-3 py-1 text-xs font-semibold text-[#00E5FF]">
                  {user.subscriptionTier}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Releases', value: labelReleases.length, icon: Music },
                  { label: 'Revenue YTD', value: fmtCurrency(revenueYTD), icon: DollarSign },
                  { label: 'Total Paid Out', value: fmtCurrency(totalPaid), icon: CircleCheck },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl border border-[#00E5FF]/20 bg-[#121826] p-3 text-center">
                    <Icon className="mx-auto mb-1 h-4 w-4 text-[#00E5FF]" />
                    <p className="text-xs text-[#A0A7B8]">{label}</p>
                    <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] divide-y divide-[#7B61FF]/10">
                {[
                  { label: 'Label Name', value: user.labelName || '—' },
                  { label: 'Owner Name', value: `${user.firstName || ''} ${user.lastName || ''}`.trim() || '—' },
                  { label: 'Email', value: user.email },
                  { label: 'Country', value: user.country || '—' },
                  { label: 'Member Since', value: fmtDate(user.createdAt) },
                  { label: 'User ID', value: user.id, mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-start gap-3 px-4 py-3">
                    <span className="w-28 shrink-0 text-xs text-[#A0A7B8]">{label}</span>
                    <span className={`text-sm text-white break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {drawerTab === 'releases' && (
            <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] overflow-hidden">
              <div className="border-b border-[#7B61FF]/10 bg-[#0B0F1A] px-4 py-3">
                <p className="text-sm font-semibold text-white">Releases ({labelReleases.length})</p>
              </div>
              {labelReleases.length === 0
                ? <div className="py-12 text-center text-sm text-[#A0A7B8]">No releases found</div>
                : (
                  <table className="w-full">
                    <thead className="bg-[#0B0F1A]">
                      <tr>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Title</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Type</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Status</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#7B61FF]/10">
                      {labelReleases.map(r => (
                        <tr key={r.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {r.artworkUrl
                                ? <img src={r.artworkUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                                : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#00E5FF]/20"><Music className="h-4 w-4 text-[#00E5FF]" /></div>
                              }
                              <span className="text-sm text-white">{r.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs capitalize text-[#A0A7B8]">{r.releaseType}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${releaseStatusBadge(r.status)}`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDate(r.releaseDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {drawerTab === 'payouts' && (
            <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] overflow-hidden">
              <div className="border-b border-[#7B61FF]/10 bg-[#0B0F1A] px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Payout History ({labelPayouts.length})</p>
                <span className="text-xs text-[#A0A7B8]">Total: {fmtCurrency(totalPaid)}</span>
              </div>
              {labelPayouts.length === 0
                ? <div className="py-12 text-center text-sm text-[#A0A7B8]">No payouts found</div>
                : (
                  <table className="w-full">
                    <thead className="bg-[#0B0F1A]">
                      <tr>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Amount</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Status</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#7B61FF]/10">
                      {labelPayouts.map(p => (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-sm font-semibold text-white">{fmtCurrency(p.amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${payoutStatusBadge(p.status)}`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#A0A7B8]">{fmtDate(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {drawerTab === 'actions' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A7B8]">Account Actions</p>
                <button
                  onClick={() => setConfirm({ type: user.isVerified ? 'suspend' : 'activate' })}
                  disabled={isActioning}
                  className={`w-full flex items-center gap-2 rounded-lg border py-2.5 px-4 text-sm font-medium transition disabled:opacity-40 ${
                    user.isVerified
                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
                      : 'border-[#1DB954]/30 bg-[#1DB954]/10 text-[#7DFFAE] hover:bg-[#1DB954]/20'
                  }`}
                >
                  {user.isVerified ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  {user.isVerified ? 'Suspend Label Account' : 'Activate Label Account'}
                </button>
                <button
                  onClick={() => exportUsersCSV([user], labelReleases, labelPayouts)}
                  className="w-full flex items-center gap-2 rounded-lg border border-[#7B61FF]/20 bg-[#7B61FF]/10 py-2.5 px-4 text-sm font-medium text-[#C4B5FD] hover:bg-[#7B61FF]/20 transition"
                >
                  <Download className="h-4 w-4" /> Export Label Data
                </button>
                <button
                  onClick={() => setConfirm({ type: 'delete' })}
                  disabled={isActioning}
                  className="w-full flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 px-4 text-sm font-medium text-red-300 hover:bg-red-500/20 transition disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Delete Label Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'delete' ? 'Delete Label Account' : confirm.type === 'suspend' ? 'Suspend Account' : 'Activate Account'}
          message={confirm.type === 'delete' ? `Permanently delete ${user.labelName || displayName(user)}? This cannot be undone.` : confirm.type === 'suspend' ? `Suspend ${user.labelName || displayName(user)}?` : `Reactivate ${user.labelName || displayName(user)}?`}
          confirmLabel={confirm.type === 'delete' ? 'Delete Permanently' : confirm.type === 'suspend' ? 'Suspend' : 'Activate'}
          danger={confirm.type !== 'activate'}
          isLoading={isActioning}
          onCancel={() => setConfirm(null)}
          onConfirm={confirm.type === 'delete' ? handleDelete : handleToggleSuspend}
        />
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ArtistLabelManagement() {
  const [tab, setTab] = useState<'artists' | 'labels'>('artists');

  // Data
  const [users, setUsers] = useState<adminApi.User[]>([]);
  const [releases, setReleases] = useState<adminApi.Release[]>([]);
  const [payouts, setPayouts] = useState<adminApi.PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Artist tab state
  const [artistSearch, setArtistSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [artistPage, setArtistPage] = useState(1);
  const [selectedArtist, setSelectedArtist] = useState<adminApi.User | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);

  // Label tab state
  const [labelSearch, setLabelSearch] = useState('');
  const [labelPage, setLabelPage] = useState(1);
  const [selectedLabel, setSelectedLabel] = useState<adminApi.User | null>(null);

  async function loadData(quiet = false) {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    setError('');
    try {
      const [u, r, p] = await Promise.all([
        adminApi.getAllUsers(),
        adminApi.getAllReleases(),
        adminApi.getPayoutRequests(),
      ]);
      setUsers(u);
      setReleases(r);
      setPayouts(p);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // A user is a label account if role === 'partner' OR subscriptionTier === 'partner'
  // (mirrors server-side isLabelAccount / hasPartnerAccess logic)
  const isLabelUser = (u: User) => u.role === 'partner' || u.subscriptionTier === 'partner';
  const artists = useMemo(() => users.filter(u => !isLabelUser(u) && u.role === 'artist'), [users]);
  const labels = useMemo(() => users.filter(isLabelUser), [users]);

  function handleSort(field: string) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setArtistPage(1);
  }

  const filteredArtists = useMemo(() => {
    let result = artists;
    const q = artistSearch.toLowerCase();
    if (q) {
      result = result.filter(a =>
        (`${a.firstName || ''} ${a.lastName || ''}`).toLowerCase().includes(q) ||
        (a.artistName || '').toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      );
    }
    if (kycFilter !== 'all') result = result.filter(a => (a.verificationStatus || 'unverified') === kycFilter);
    if (statusFilter === 'active') result = result.filter(a => a.isVerified);
    if (statusFilter === 'suspended') result = result.filter(a => !a.isVerified);

    return [...result].sort((a, b) => {
      let av: any, bv: any;
      switch (sortField) {
        case 'name': av = a.artistName || displayName(a); bv = b.artistName || displayName(b); break;
        case 'releases': av = releases.filter(r => r.userId === a.id).length; bv = releases.filter(r => r.userId === b.id).length; break;
        case 'revenue': av = getUserRevenueYTD(a.id, payouts); bv = getUserRevenueYTD(b.id, payouts); break;
        default: av = (a as any)[sortField] || ''; bv = (b as any)[sortField] || '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [artists, artistSearch, kycFilter, statusFilter, sortField, sortDir, releases, payouts]);

  const artistPageCount = Math.max(1, Math.ceil(filteredArtists.length / PAGE_SIZE));
  const pagedArtists = filteredArtists.slice((artistPage - 1) * PAGE_SIZE, artistPage * PAGE_SIZE);

  const filteredLabels = useMemo(() => {
    let result = labels;
    const q = labelSearch.toLowerCase();
    if (q) {
      result = result.filter(l =>
        (l.labelName || '').toLowerCase().includes(q) ||
        (`${l.firstName || ''} ${l.lastName || ''}`).toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [labels, labelSearch]);

  const labelPageCount = Math.max(1, Math.ceil(filteredLabels.length / PAGE_SIZE));
  const pagedLabels = filteredLabels.slice((labelPage - 1) * PAGE_SIZE, labelPage * PAGE_SIZE);

  // Bulk actions
  function toggleRow(id: string) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllRows() {
    if (selectedRows.size === pagedArtists.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(pagedArtists.map(a => a.id)));
    }
  }

  async function handleBulkAction(action: 'suspend' | 'activate') {
    setBulkActioning(true);
    try {
      const promises = Array.from(selectedRows).map(id => {
        const user = users.find(u => u.id === id);
        if (!user) return Promise.resolve();
        if (action === 'suspend' && user.isVerified) return adminApi.updateUser(id, { isVerified: false });
        if (action === 'activate' && !user.isVerified) return adminApi.updateUser(id, { isVerified: true });
        return Promise.resolve();
      });
      await Promise.all(promises);
      await loadData(true);
      setSelectedRows(new Set());
    } catch (e: any) {
      setError(e.message || 'Bulk action failed');
    } finally {
      setBulkActioning(false);
    }
  }

  // Stats
  const artistStats = useMemo(() => ({
    total: artists.length,
    active: artists.filter(a => a.isVerified).length,
    suspended: artists.filter(a => !a.isVerified).length,
    kycPending: artists.filter(a => a.verificationStatus === 'pending').length,
    kycVerified: artists.filter(a => a.verificationStatus === 'verified').length,
  }), [artists]);

  const labelStats = useMemo(() => ({
    total: labels.length,
    active: labels.filter(l => l.isVerified).length,
    suspended: labels.filter(l => !l.isVerified).length,
    totalReleases: labels.reduce((s, l) => s + releases.filter(r => r.userId === l.id).length, 0),
  }), [labels, releases]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B0F1A] border-t-[#7B61FF]" />
          <p className="text-sm text-[#A0A7B8]">Loading artist & label data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Artist & Label Management</h1>
          <p className="mt-0.5 text-sm text-[#A0A7B8]">Manage all artists and labels on the platform.</p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg border border-[#7B61FF]/20 bg-[#121826] px-4 py-2 text-sm text-[#A0A7B8] hover:text-white transition"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-1 w-fit">
        <button
          onClick={() => setTab('artists')}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === 'artists' ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white'}`}
        >
          <User className="h-4 w-4" /> Artists <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === 'artists' ? 'bg-white/20' : 'bg-[#7B61FF]/20 text-[#C4B5FD]'}`}>{artists.length}</span>
        </button>
        <button
          onClick={() => setTab('labels')}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === 'labels' ? 'bg-[#00E5FF] text-[#0B0F1A]' : 'text-[#A0A7B8] hover:text-white'}`}
        >
          <Building2 className="h-4 w-4" /> Labels <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === 'labels' ? 'bg-[#0B0F1A]/20' : 'bg-[#00E5FF]/20 text-[#00E5FF]'}`}>{labels.length}</span>
        </button>
      </div>

      {/* ── ARTISTS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'artists' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: 'Total Artists', value: artistStats.total, color: 'text-white' },
              { label: 'Active', value: artistStats.active, color: 'text-[#1DB954]' },
              { label: 'Suspended', value: artistStats.suspended, color: 'text-red-400' },
              { label: 'KYC Pending', value: artistStats.kycPending, color: 'text-[#FFE88A]' },
              { label: 'KYC Verified', value: artistStats.kycVerified, color: 'text-[#7DFFAE]' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
                <p className="text-xs text-[#A0A7B8]">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0A7B8]" />
                <input
                  type="text"
                  placeholder="Search by name, stage name, email…"
                  value={artistSearch}
                  onChange={e => { setArtistSearch(e.target.value); setArtistPage(1); }}
                  className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] py-2 pl-9 pr-4 text-sm text-white placeholder-[#6D7385] outline-none focus:ring-2 focus:ring-[#7B61FF]"
                />
              </div>
              <select
                value={kycFilter}
                onChange={e => { setKycFilter(e.target.value); setArtistPage(1); }}
                title="KYC filter"
                className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#7B61FF]"
              >
                <option value="all">All KYC</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="unverified">Unverified</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setArtistPage(1); }}
                title="Status filter"
                className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#7B61FF]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <button
                onClick={() => exportUsersCSV(filteredArtists, releases, payouts)}
                className="flex items-center gap-2 rounded-lg border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-4 py-2 text-sm text-[#C4B5FD] hover:bg-[#7B61FF]/20 transition"
              >
                <Download className="h-4 w-4" /> Export
              </button>
            </div>

            {/* Bulk actions */}
            {selectedRows.size > 0 && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#7B61FF]/20 bg-[#7B61FF]/5 px-4 py-2.5">
                <span className="text-sm text-[#C4B5FD]">{selectedRows.size} selected</span>
                <button onClick={() => handleBulkAction('suspend')} disabled={bulkActioning} className="flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/20 transition disabled:opacity-40">
                  {bulkActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />} Suspend
                </button>
                <button onClick={() => handleBulkAction('activate')} disabled={bulkActioning} className="flex items-center gap-1 rounded-lg border border-[#1DB954]/30 bg-[#1DB954]/10 px-3 py-1.5 text-xs font-medium text-[#7DFFAE] hover:bg-[#1DB954]/20 transition disabled:opacity-40">
                  {bulkActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />} Reactivate
                </button>
                <button onClick={() => exportUsersCSV(filteredArtists.filter(a => selectedRows.has(a.id)), releases, payouts)} className="flex items-center gap-1 rounded-lg border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-3 py-1.5 text-xs font-medium text-[#C4B5FD] hover:bg-[#7B61FF]/20 transition">
                  <Download className="h-3 w-3" /> Export Selected
                </button>
                <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-xs text-[#A0A7B8] hover:text-white transition">Clear</button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-[#7B61FF]/20 bg-[#121826]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#7B61FF]/10 bg-[#0B0F1A]">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === pagedArtists.length && pagedArtists.length > 0}
                        onChange={toggleAllRows}
                        aria-label="Select all"
                        className="rounded border-[#7B61FF]/40 bg-[#0B0F1A] accent-[#7B61FF]"
                      />
                    </th>
                    <SortHeader field="name" label="Artist" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Email</th>
                    <SortHeader field="createdAt" label="Registered" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader field="releases" label="Releases" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader field="revenue" label="Revenue YTD" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">KYC</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7B61FF]/10">
                  {pagedArtists.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-sm text-[#A0A7B8]">No artists match your filters</td>
                    </tr>
                  ) : pagedArtists.map(artist => {
                    const kyc = kycBadge(artist.verificationStatus);
                    const acct = accountBadge(artist.isVerified);
                    const rev = getUserRevenueYTD(artist.id, payouts);
                    const relCount = releases.filter(r => r.userId === artist.id).length;
                    return (
                      <tr key={artist.id} className={`transition-colors hover:bg-white/[0.025] ${selectedRows.has(artist.id) ? 'bg-[#7B61FF]/5' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(artist.id)}
                            onChange={() => toggleRow(artist.id)}
                            aria-label={`Select ${displayName(artist)}`}
                            className="rounded border-[#7B61FF]/40 bg-[#0B0F1A] accent-[#7B61FF]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {artist.profileImage
                              ? <img src={artist.profileImage} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                              : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7B61FF]/20 text-xs font-bold text-[#C4B5FD]">{initials(artist)}</div>
                            }
                            <div>
                              <p className="text-sm font-medium text-white">{displayName(artist)}</p>
                              {artist.artistName && <p className="text-[11px] text-[#A0A7B8]">@{artist.artistName}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#A0A7B8]">{artist.email}</td>
                        <td className="px-4 py-3 text-sm text-[#A0A7B8]">{fmtDate(artist.createdAt)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">{relCount}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">{rev > 0 ? fmtCurrency(rev) : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${kyc.cls}`}>{kyc.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${acct.cls}`}>{acct.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedArtist(artist)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-3 py-1.5 text-xs font-medium text-[#C4B5FD] hover:bg-[#7B61FF]/20 transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-[#7B61FF]/10 bg-[#0B0F1A] px-5 py-3">
              <span className="text-sm text-[#A0A7B8]">
                {filteredArtists.length === 0 ? 'No results' : `${(artistPage - 1) * PAGE_SIZE + 1}–${Math.min(artistPage * PAGE_SIZE, filteredArtists.length)} of ${filteredArtists.length}`}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setArtistPage(p => Math.max(p - 1, 1))} disabled={artistPage === 1} className="rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-sm text-[#A0A7B8] hover:text-white disabled:opacity-30 transition">Prev</button>
                <span className="text-sm text-[#A0A7B8]">{artistPage} / {artistPageCount}</span>
                <button onClick={() => setArtistPage(p => Math.min(p + 1, artistPageCount))} disabled={artistPage === artistPageCount} className="rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-sm text-[#A0A7B8] hover:text-white disabled:opacity-30 transition">Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── LABELS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'labels' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Labels', value: labelStats.total, color: 'text-white' },
              { label: 'Active', value: labelStats.active, color: 'text-[#00E5FF]' },
              { label: 'Suspended', value: labelStats.suspended, color: 'text-red-400' },
              { label: 'Total Releases', value: labelStats.totalReleases, color: 'text-[#C4B5FD]' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#00E5FF]/20 bg-[#121826] p-4">
                <p className="text-xs text-[#A0A7B8]">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0A7B8]" />
                <input
                  type="text"
                  placeholder="Search by label name, owner, email…"
                  value={labelSearch}
                  onChange={e => { setLabelSearch(e.target.value); setLabelPage(1); }}
                  className="w-full rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] py-2 pl-9 pr-4 text-sm text-white placeholder-[#6D7385] outline-none focus:ring-2 focus:ring-[#00E5FF]"
                />
              </div>
              <button
                onClick={() => exportUsersCSV(filteredLabels, releases, payouts)}
                className="flex items-center gap-2 rounded-lg border border-[#00E5FF]/20 bg-[#00E5FF]/10 px-4 py-2 text-sm text-[#00E5FF] hover:bg-[#00E5FF]/20 transition"
              >
                <Download className="h-4 w-4" /> Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-[#00E5FF]/20 bg-[#121826]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#00E5FF]/10 bg-[#0B0F1A]">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Label</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Owner</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Email</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Total Releases</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Revenue YTD</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Plan</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">Status</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#A0A7B8]">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00E5FF]/10">
                  {pagedLabels.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-sm text-[#A0A7B8]">No labels found</td>
                    </tr>
                  ) : pagedLabels.map(label => {
                    const acct = accountBadge(label.isVerified);
                    const relCount = releases.filter(r => r.userId === label.id).length;
                    const rev = getUserRevenueYTD(label.id, payouts);
                    return (
                      <tr key={label.id} className="transition-colors hover:bg-white/[0.025]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00E5FF]/20 text-xs font-bold text-[#00E5FF]">
                              {initials(label)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{label.labelName || displayName(label)}</p>
                              <p className="text-[11px] text-[#A0A7B8]">{fmtDate(label.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-white">{displayName(label)}</td>
                        <td className="px-5 py-4 text-sm text-[#A0A7B8]">{label.email}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-white">{relCount}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-white">{rev > 0 ? fmtCurrency(rev) : '—'}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-[#00E5FF]">
                            {label.subscriptionTier}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${acct.cls}`}>{acct.label}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedLabel(label)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#00E5FF]/20 bg-[#00E5FF]/10 px-3 py-1.5 text-xs font-medium text-[#00E5FF] hover:bg-[#00E5FF]/20 transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-[#00E5FF]/10 bg-[#0B0F1A] px-5 py-3">
              <span className="text-sm text-[#A0A7B8]">
                {filteredLabels.length === 0 ? 'No results' : `${(labelPage - 1) * PAGE_SIZE + 1}–${Math.min(labelPage * PAGE_SIZE, filteredLabels.length)} of ${filteredLabels.length}`}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setLabelPage(p => Math.max(p - 1, 1))} disabled={labelPage === 1} className="rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-sm text-[#A0A7B8] hover:text-white disabled:opacity-30 transition">Prev</button>
                <span className="text-sm text-[#A0A7B8]">{labelPage} / {labelPageCount}</span>
                <button onClick={() => setLabelPage(p => Math.min(p + 1, labelPageCount))} disabled={labelPage === labelPageCount} className="rounded-lg border border-[#7B61FF]/20 px-3 py-1.5 text-sm text-[#A0A7B8] hover:text-white disabled:opacity-30 transition">Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Drawers */}
      {selectedArtist && (
        <ArtistDrawer
          user={selectedArtist}
          releases={releases}
          payouts={payouts}
          onClose={() => setSelectedArtist(null)}
          onUpdate={updated => {
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
            setSelectedArtist(updated);
          }}
          onDelete={deleted => {
            setUsers(prev => prev.filter(u => u.id !== deleted.id));
            setSelectedArtist(null);
          }}
        />
      )}

      {selectedLabel && (
        <LabelDrawer
          user={selectedLabel}
          releases={releases}
          payouts={payouts}
          onClose={() => setSelectedLabel(null)}
          onUpdate={updated => {
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
            setSelectedLabel(updated);
          }}
          onDelete={deleted => {
            setUsers(prev => prev.filter(u => u.id !== deleted.id));
            setSelectedLabel(null);
          }}
        />
      )}
    </div>
  );
}
