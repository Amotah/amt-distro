import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, Users, Key, Lock, Activity, AlertTriangle, AlertOctagon,
  Plus, Trash2, RefreshCw, Search, CheckCircle2, XCircle, Clock,
  Eye, EyeOff, Copy, Settings, UserPlus, UserMinus, UserCheck,
  ChevronDown, MoreHorizontal, Terminal, Globe, Zap, Check, X,
} from 'lucide-react';
import {
  getSecurityAdmins, createSecurityAdmin, updateAdminPermissions,
  deactivateSecurityAdmin, activateSecurityAdmin,
  getSecurityAccessLogs, getSecurityAlerts,
  getPermissionsMatrix, updatePermissionsMatrix,
  getApiKeys, createApiKey, revokeApiKey,
  getSecuritySettings, updateSecuritySettings,
  type SecurityAdmin, type SecurityAccessLog, type SecurityAlert,
  type ApiKey, type SecuritySettings,
  type SecurityAdminRole, ALL_PERMISSIONS_LIST, ROLE_LABELS,
} from '../../utils/admin-api';

// ── Palette ──────────────────────────────────────────────────────────────────
const ROLE_CLS: Record<string, string> = {
  superadmin:        'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30',
  system_admin:      'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
  admin_operations:  'bg-[#7B61FF]/15 text-[#7B61FF] border border-[#7B61FF]/30',
  admin_finance:     'bg-[#22D3A1]/15 text-[#22D3A1] border border-[#22D3A1]/30',
  admin_content:     'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30',
  admin_support:     'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
  admin_fraud:       'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30',
  admin_analytics:   'bg-[#A0A7B8]/15 text-[#A0A7B8] border border-[#A0A7B8]/30',
  hr_manager:        'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30',
  hr_specialist:     'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30',
  hr_coordinator:    'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30',
  payroll_manager:   'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30',
  recruitment_officer: 'bg-[#EC4899]/15 text-[#EC4899] border border-[#EC4899]/30',
};
const STATUS_CLS: Record<string, string> = {
  active:   'bg-[#22D3A1]/15 text-[#22D3A1]',
  inactive: 'bg-[#A0A7B8]/15 text-[#A0A7B8]',
  suspended:'bg-[#F43F5E]/15 text-[#F43F5E]',
};
const ALERT_SEV_CLS: Record<string, string> = {
  critical: 'border-[#F43F5E]/40 bg-[#F43F5E]/8',
  high:     'border-[#F59E0B]/40 bg-[#F59E0B]/8',
  medium:   'border-[#7B61FF]/40 bg-[#7B61FF]/8',
  low:      'border-[#A0A7B8]/40 bg-[#A0A7B8]/8',
};
const ALERT_ICON_CLS: Record<string, string> = {
  critical: 'text-[#F43F5E]', high: 'text-[#F59E0B]', medium: 'text-[#7B61FF]', low: 'text-[#A0A7B8]',
};
const PERM_MODULE_CLS: Record<string, string> = {
  users: 'text-[#7B61FF] border-[#7B61FF]/30',
  artists: 'text-[#00E5FF] border-[#00E5FF]/30',
  releases: 'text-[#22D3A1] border-[#22D3A1]/30',
  distributions: 'text-[#F59E0B] border-[#F59E0B]/30',
  royalties: 'text-[#F43F5E] border-[#F43F5E]/30',
  payments: 'text-[#F43F5E] border-[#F43F5E]/30',
  reports: 'text-[#A0A7B8] border-[#A0A7B8]/30',
  fraud: 'text-[#F43F5E] border-[#F43F5E]/30',
  admins: 'text-[#7B61FF] border-[#7B61FF]/30',
  system: 'text-[#F59E0B] border-[#F59E0B]/30',
};

// ── Shared helpers ────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[#7B61FF]/20 bg-[#121826] ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-[#A0A7B8] uppercase tracking-wider mb-3">{children}</h3>;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <Icon size={26} className="text-[#7B61FF]/40" />
      <p className="text-sm text-[#A0A7B8]">{message}</p>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent = '#7B61FF', sub }: { label: string; value: string | number; icon: React.ElementType; accent?: string; sub?: string }) {
  const BG: Record<string, string> = { '#7B61FF': 'bg-[#7B61FF]/20', '#F43F5E': 'bg-[#F43F5E]/20', '#22D3A1': 'bg-[#22D3A1]/20', '#F59E0B': 'bg-[#F59E0B]/20', '#00E5FF': 'bg-[#00E5FF]/20' };
  const TX: Record<string, string> = { '#7B61FF': 'text-[#7B61FF]', '#F43F5E': 'text-[#F43F5E]', '#22D3A1': 'text-[#22D3A1]', '#F59E0B': 'text-[#F59E0B]', '#00E5FF': 'text-[#00E5FF]' };
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#A0A7B8] uppercase tracking-wider">{label}</span>
        <div className={`rounded-lg p-1.5 ${BG[accent] ?? 'bg-[#7B61FF]/20'}`}>
          <Icon size={14} className={TX[accent] ?? 'text-[#7B61FF]'} />
        </div>
      </div>
      <span className="text-xl font-bold text-white">{value}</span>
      {sub && <span className="text-[10px] text-[#A0A7B8]">{sub}</span>}
    </Card>
  );
}

function Toggle({ checked, onChange, disabled = false, label = 'Toggle' }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked="true"
      aria-label={label}
      title={checked ? `${label} — On` : `${label} — Off`}
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#7B61FF]' : 'bg-[#A0A7B8]/30'} disabled:opacity-40`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// Confirmation Modal
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmCls: string;
  onConfirm: () => void;
}
const CLOSED: ConfirmState = { open: false, title: '', message: '', confirmLabel: '', confirmCls: '', onConfirm: () => {} };

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">{state.title}</h2>
        <p className="text-sm text-[#A0A7B8]">{state.message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-sm transition-colors">Cancel</button>
          <button onClick={() => { state.onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${state.confirmCls}`}>
            {state.confirmLabel}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ── Permission group helper ───────────────────────────────────────────────────
const PERM_GROUPS: { module: string; perms: string[] }[] = [
  { module: 'users', perms: ['users.view','users.create','users.edit','users.delete','users.ban','users.verify'] },
  { module: 'artists', perms: ['artists.view','artists.edit','artists.delete','artists.verify'] },
  { module: 'releases', perms: ['releases.view','releases.edit','releases.delete','releases.approve','releases.takedown'] },
  { module: 'distributions', perms: ['distributions.view','distributions.retry','distributions.cancel'] },
  { module: 'royalties', perms: ['royalties.view','royalties.edit','royalties.approve','royalties.dispute','royalties.manage'] },
  { module: 'payments', perms: ['payments.view','payments.approve','payments.cancel','payments.refund'] },
  { module: 'reports', perms: ['reports.view','reports.upload'] },
  { module: 'fraud', perms: ['fraud.view','fraud.investigate','fraud.resolve','fraud.flag_users'] },
  { module: 'admins', perms: ['admins.view','admins.create','admins.edit','admins.delete'] },
  { module: 'system', perms: ['system.settings','system.logs','system.analytics'] },
];

// ── Tab: Admin Directory ──────────────────────────────────────────────────────
function EditPermissionsModal({ admin, onClose, onSaved }: { admin: SecurityAdmin; onClose: () => void; onSaved: () => void }) {
  const [perms, setPerms] = useState<Set<string>>(new Set(admin.permissions));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function toggle(p: string) {
    setPerms(prev => { const s = new Set(prev); s.has(p) ? s.delete(p) : s.add(p); return s; });
  }

  async function save() {
    setSaving(true); setErr('');
    try {
      await updateAdminPermissions(admin.id, Array.from(perms));
      onSaved(); onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Edit Permissions — {admin.name || admin.email}</h2>
            <p className="text-xs text-[#A0A7B8] mt-0.5">Role: {ROLE_LABELS[admin.role]}</p>
          </div>
          <button onClick={onClose} title="Close" className="text-[#A0A7B8] hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {PERM_GROUPS.map(g => (
            <div key={g.module}>
              <p className="text-[11px] font-bold text-[#A0A7B8] uppercase tracking-wider mb-2 capitalize">{g.module}</p>
              <div className="flex flex-wrap gap-2">
                {g.perms.map(p => {
                  const on = perms.has(p);
                  return (
                    <button key={p} onClick={() => toggle(p)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${on ? 'bg-[#7B61FF]/20 border-[#7B61FF]/40 text-[#7B61FF]' : 'border-[#7B61FF]/15 bg-[#0B0F1A] text-[#A0A7B8] hover:text-white'}`}>
                      {on ? <Check size={11} /> : <X size={11} />}
                      {p.split('.')[1]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {err && <p className="text-xs text-[#F43F5E] mt-3">{err}</p>}
        <div className="flex justify-between items-center mt-4">
          <span className="text-xs text-[#A0A7B8]">{perms.size} of {ALL_PERMISSIONS_LIST.length} permissions selected</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-sm transition-colors">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CreateAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ email: '', role: 'admin_operations' as SecurityAdminRole, department: '' });
  const [customPerms, setCustomPerms] = useState(false);
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function togglePerm(p: string) {
    setPerms(prev => { const s = new Set(prev); s.has(p) ? s.delete(p) : s.add(p); return s; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email) { setErr('Email is required'); return; }
    setSaving(true); setErr('');
    try {
      await createSecurityAdmin({ ...form, customPermissions: customPerms ? Array.from(perms) : undefined });
      onCreated(); onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Create Admin Account</h2>
          <button onClick={onClose} title="Close" className="text-[#A0A7B8] hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">Email Address *</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required type="email" title="Admin email" placeholder="admin@example.com"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2.5 focus:outline-none focus:border-[#7B61FF]/60" />
            <p className="text-[10px] text-[#A0A7B8] mt-1">User must already be registered on the platform</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Role *</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as SecurityAdminRole }))} aria-label="Admin role" title="Admin role"
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none">
                {(Object.keys(ROLE_LABELS) as SecurityAdminRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Department</label>
              <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} title="Department" placeholder="e.g. Legal"
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none focus:border-[#7B61FF]/60" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked={customPerms} onChange={setCustomPerms} />
            <span className="text-xs text-[#A0A7B8]">Set custom permissions (overrides role defaults)</span>
          </div>
          {customPerms && (
            <div className="space-y-3 rounded-lg border border-[#7B61FF]/20 p-3 max-h-48 overflow-y-auto">
              {PERM_GROUPS.map(g => (
                <div key={g.module}>
                  <p className="text-[10px] font-bold text-[#A0A7B8] uppercase tracking-wider mb-1 capitalize">{g.module}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.perms.map(p => {
                      const on = perms.has(p);
                      return (
                        <button key={p} type="button" onClick={() => togglePerm(p)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${on ? 'bg-[#7B61FF]/20 border-[#7B61FF]/40 text-[#7B61FF]' : 'border-[#7B61FF]/15 bg-[#0B0F1A] text-[#A0A7B8]'}`}>
                          {p.split('.')[1]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {err && <p className="text-xs text-[#F43F5E]">{err}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function AdminDirectoryTab() {
  const [admins, setAdmins] = useState<SecurityAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editTarget, setEditTarget] = useState<SecurityAdmin | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAdmins(await getSecurityAdmins()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => admins.filter(a => {
    if (filterRole !== 'all' && a.role !== filterRole) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.email.toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q) || (a.department || '').toLowerCase().includes(q);
    }
    return true;
  }), [admins, filterRole, filterStatus, search]);

  function promptDeactivate(a: SecurityAdmin) {
    setConfirm({ open: true, title: 'Deactivate Admin', message: `Remove access for ${a.email}? The audit trail will be preserved.`, confirmLabel: 'Deactivate', confirmCls: 'bg-[#F43F5E] hover:bg-[#E03354]', onConfirm: async () => {
      setBusy(a.id);
      try { await deactivateSecurityAdmin(a.id); await load(); } finally { setBusy(null); }
    }});
  }

  function promptActivate(a: SecurityAdmin) {
    setConfirm({ open: true, title: 'Reactivate Admin', message: `Restore access for ${a.email}?`, confirmLabel: 'Activate', confirmCls: 'bg-[#22D3A1] hover:bg-[#1AB08B]', onConfirm: async () => {
      setBusy(a.id);
      try { await activateSecurityAdmin(a.id); await load(); } finally { setBusy(null); }
    }});
  }

  const active = admins.filter(a => a.status === 'active').length;
  const supers = admins.filter(a => a.role === 'superadmin').length;

  return (
    <div className="space-y-5">
      <ConfirmModal state={confirm} onClose={() => setConfirm(CLOSED)} />
      {showCreate && <CreateAdminModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {editTarget && <EditPermissionsModal admin={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Admins" value={admins.length} icon={Users} />
        <KpiCard label="Active" value={active} icon={UserCheck} accent="#22D3A1" />
        <KpiCard label="Inactive" value={admins.length - active} icon={UserMinus} accent="#F43F5E" />
        <KpiCard label="Super Admins" value={supers} icon={ShieldCheck} accent="#F43F5E" sub="Full access" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A0A7B8]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search admins…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs focus:outline-none focus:border-[#7B61FF]/60 w-44" />
            </div>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} aria-label="Filter by role" title="Filter by role"
              className="rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs px-2.5 py-1.5 focus:outline-none">
              <option value="all">All Roles</option>
              {(Object.keys(ROLE_LABELS) as SecurityAdminRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status" title="Filter by status"
              className="rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs px-2.5 py-1.5 focus:outline-none">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-medium transition-colors">
            <UserPlus size={12} />Add Admin
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} message="No admins match the current filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-[#7B61FF]/15">
                  {['Name / Email', 'Role', 'Department', 'Last Login', 'Permissions', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`py-2 text-[#A0A7B8] font-medium ${h === 'Actions' ? 'text-right pr-1' : 'text-left pr-3'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold text-[#E2E8F0]">{a.name || '—'}</div>
                      <div className="text-[#A0A7B8]">{a.email}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${ROLE_CLS[a.role] ?? 'bg-[#A0A7B8]/15 text-[#A0A7B8]'}`}>
                        {ROLE_LABELS[a.role] || a.role}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[#A0A7B8]">{a.department || '—'}</td>
                    <td className="py-2.5 pr-3 text-[#A0A7B8] whitespace-nowrap">
                      {a.lastLogin ? new Date(a.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="text-[#A0A7B8]">{a.permissions.length} perms</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_CLS[a.status] ?? ''}`}>{a.status}</span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditTarget(a)} title="Edit permissions"
                          className="px-2 py-1 rounded text-[10px] bg-[#7B61FF]/15 text-[#7B61FF] hover:bg-[#7B61FF]/25 font-medium transition-colors">
                          Permissions
                        </button>
                        {a.status === 'active'
                          ? <button onClick={() => promptDeactivate(a)} disabled={busy === a.id} title="Deactivate admin"
                              className="px-2 py-1 rounded text-[10px] bg-[#F43F5E]/15 text-[#F43F5E] hover:bg-[#F43F5E]/25 font-medium transition-colors">
                              Deactivate
                            </button>
                          : <button onClick={() => promptActivate(a)} disabled={busy === a.id} title="Activate admin"
                              className="px-2 py-1 rounded text-[10px] bg-[#22D3A1]/15 text-[#22D3A1] hover:bg-[#22D3A1]/25 font-medium transition-colors">
                              Activate
                            </button>
                        }
                      </div>
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

// ── Tab: Access Logs ──────────────────────────────────────────────────────────
function AccessLogsTab() {
  const [logs, setLogs] = useState<SecurityAccessLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [section, setSection] = useState<'log' | 'alerts'>('log');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, a] = await Promise.all([
        getSecurityAccessLogs({ action: filterAction || undefined, resource: filterResource || undefined, adminId: filterAdmin || undefined, startDate: startDate || undefined, endDate: endDate || undefined }),
        getSecurityAlerts(),
      ]);
      setLogs(l); setAlerts(a);
    } finally { setLoading(false); }
  }, [filterAction, filterResource, filterAdmin, startDate, endDate]);

  useEffect(() => { load(); }, []); // Initial load only; manual refresh

  const ACTION_BADGE: Record<string, string> = {
    create: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    update: 'bg-[#7B61FF]/15 text-[#7B61FF]',
    delete: 'bg-[#F43F5E]/15 text-[#F43F5E]',
    view: 'bg-[#A0A7B8]/15 text-[#A0A7B8]',
    approve: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    deactivate: 'bg-[#F43F5E]/15 text-[#F43F5E]',
    activate: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    revoke: 'bg-[#F43F5E]/15 text-[#F43F5E]',
  };

  return (
    <div className="space-y-5">
      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map(a => (
            <div key={a.id} className={`rounded-xl border p-4 flex items-start gap-3 ${ALERT_SEV_CLS[a.severity] ?? ALERT_SEV_CLS.low}`}>
              <AlertOctagon size={16} className={`flex-shrink-0 mt-0.5 ${ALERT_ICON_CLS[a.severity] ?? ''}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold capitalize ${ALERT_ICON_CLS[a.severity]}`}>{a.severity.toUpperCase()} — {a.type.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-[#A0A7B8]">{new Date(a.detectedAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-[#E2E8F0] mt-0.5">{a.message}</p>
                {a.adminEmail && <p className="text-[10px] text-[#A0A7B8]">{a.adminEmail}</p>}
              </div>
            </div>
          ))}
          {alerts.length > 3 && <p className="text-xs text-[#7B61FF] cursor-pointer hover:underline" onClick={() => setSection('alerts')}>+{alerts.length - 3} more alerts — view all</p>}
        </div>
      )}

      <div className="flex gap-1 rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-1 w-fit">
        <button onClick={() => setSection('log')} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${section === 'log' ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white'}`}>
          Activity Log ({logs.length})
        </button>
        <button onClick={() => setSection('alerts')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${section === 'alerts' ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white'}`}>
          Security Alerts
          {alerts.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F43F5E] text-white leading-none">{alerts.length}</span>}
        </button>
      </div>

      {section === 'log' && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <input value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)} title="Filter by admin email" placeholder="Admin email/ID…"
              className="px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs focus:outline-none focus:border-[#7B61FF]/60 w-40" />
            <input value={filterAction} onChange={e => setFilterAction(e.target.value)} title="Filter by action" placeholder="Action…"
              className="px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs focus:outline-none focus:border-[#7B61FF]/60 w-28" />
            <input value={filterResource} onChange={e => setFilterResource(e.target.value)} title="Filter by resource" placeholder="Resource…"
              className="px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs focus:outline-none focus:border-[#7B61FF]/60 w-28" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} title="Start date" aria-label="Start date"
              className="px-2.5 py-1.5 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs focus:outline-none" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} title="End date" aria-label="End date"
              className="px-2.5 py-1.5 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs focus:outline-none" />
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#A0A7B8] hover:text-white text-xs transition-colors">
              <RefreshCw size={11} />Apply
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
          ) : logs.length === 0 ? (
            <EmptyState icon={Activity} message="No activity logs match the filters" />
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead className="sticky top-0 bg-[#121826]">
                  <tr className="border-b border-[#7B61FF]/15">
                    {['Admin', 'Action', 'Resource', 'Resource ID', 'IP', 'Timestamp'].map(h => (
                      <th key={h} className="py-2 text-left pr-3 text-[#A0A7B8] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                      <td className="py-2 pr-3">
                        <div className="text-[#E2E8F0] max-w-[130px] truncate">{l.adminUserEmail || l.adminUserId.slice(0, 10) + '…'}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${ACTION_BADGE[l.action] ?? 'bg-[#A0A7B8]/15 text-[#A0A7B8]'}`}>
                          {l.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[#A0A7B8] capitalize max-w-[100px] truncate">{l.resource}</td>
                      <td className="py-2 pr-3 text-[#A0A7B8] font-mono max-w-[90px] truncate">{l.resourceId.slice(0, 12)}…</td>
                      <td className="py-2 pr-3 text-[#A0A7B8]">{l.ipAddress || '—'}</td>
                      <td className="py-2 text-[#A0A7B8] whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {section === 'alerts' && (
        <Card className="p-4">
          <SectionTitle>Security Alerts</SectionTitle>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
          ) : alerts.length === 0 ? (
            <EmptyState icon={ShieldCheck} message="No suspicious activity detected" />
          ) : (
            <div className="space-y-3">
              {alerts.map(a => (
                <div key={a.id} className={`rounded-xl border p-4 ${ALERT_SEV_CLS[a.severity] ?? ''}`}>
                  <div className="flex items-start gap-3">
                    <AlertOctagon size={16} className={`flex-shrink-0 mt-0.5 ${ALERT_ICON_CLS[a.severity]}`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold capitalize ${ALERT_ICON_CLS[a.severity]}`}>
                          {a.severity.toUpperCase()} — {a.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-[#A0A7B8]">{new Date(a.detectedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[#E2E8F0]">{a.message}</p>
                      {a.adminEmail && <p className="text-xs text-[#A0A7B8] mt-0.5">{a.adminEmail}</p>}
                    </div>
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

// ── Tab: Permissions Matrix ───────────────────────────────────────────────────
function PermissionsMatrixTab() {
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { matrix: m, allPermissions } = await getPermissionsMatrix();
      setMatrix(m); setAllPerms(allPermissions); setDirty(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(role: string, perm: string) {
    setMatrix(prev => {
      const perms = new Set(prev[role] || []);
      perms.has(perm) ? perms.delete(perm) : perms.add(perm);
      return { ...prev, [role]: Array.from(perms) };
    });
    setDirty(true); setSaved(false);
  }

  async function saveMatrix() {
    setSaving(true); setErr('');
    try { await updatePermissionsMatrix(matrix); setDirty(false); setSaved(true); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'Failed to save'); }
    finally { setSaving(false); }
  }

  const roles = Object.keys(ROLE_LABELS) as SecurityAdminRole[];

  // Group permissions by module for the header
  const permModules = PERM_GROUPS.map(g => ({ module: g.module, perms: g.perms.filter(p => allPerms.includes(p)) })).filter(g => g.perms.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Role × Permission Matrix</h3>
          <p className="text-xs text-[#A0A7B8] mt-0.5">Click cells to grant/revoke permissions. Superadmin changes require caution.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && !dirty && <span className="text-xs text-[#22D3A1] flex items-center gap-1"><Check size={12} />Saved</span>}
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-xs transition-colors">
            <RefreshCw size={11} />Reset
          </button>
          <button onClick={saveMatrix} disabled={!dirty || saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-medium transition-colors disabled:opacity-40">
            {saving ? 'Saving…' : 'Save Matrix'}
          </button>
        </div>
      </div>
      {err && <p className="text-xs text-[#F43F5E]">{err}</p>}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-[11px] min-w-max border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[#0B0F1A] py-2 px-3 text-left text-[#A0A7B8] font-semibold min-w-[140px]">Role / Permission</th>
                {permModules.map(g => (
                  <React.Fragment key={g.module}>
                    <th colSpan={g.perms.length} className={`px-1 py-1.5 text-center font-bold capitalize text-[10px] border-b ${PERM_MODULE_CLS[g.module] ?? 'text-[#A0A7B8] border-[#7B61FF]/30'}`}>
                      {g.module}
                    </th>
                  </React.Fragment>
                ))}
              </tr>
              <tr className="border-b border-[#7B61FF]/15">
                <th className="sticky left-0 z-10 bg-[#0B0F1A]" />
                {permModules.flatMap(g => g.perms.map(p => (
                  <th key={p} className="px-1 py-1.5 text-center text-[#A0A7B8] font-medium whitespace-nowrap min-w-[52px]">
                    <span className="inline-block -rotate-45 origin-bottom-left ml-3.5 mb-0.5">
                      {p.split('.')[1]}
                    </span>
                  </th>
                )))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role, ri) => (
                <tr key={role} className={`border-b border-[#7B61FF]/10 ${ri % 2 === 0 ? '' : 'bg-[#7B61FF]/3'}`}>
                  <td className="sticky left-0 z-10 bg-[#0B0F1A] py-2 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_CLS[role] ?? ''}`}>{ROLE_LABELS[role]}</span>
                  </td>
                  {permModules.flatMap(g => g.perms.map(perm => {
                    const has = (matrix[role] || []).includes(perm);
                    return (
                      <td key={perm} className="text-center py-2 px-1">
                        <button onClick={() => toggle(role, perm)} title={`${has ? 'Revoke' : 'Grant'} ${perm} for ${role}`}
                          className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${has ? 'bg-[#7B61FF] text-white' : 'bg-[#7B61FF]/10 text-[#7B61FF]/30 hover:bg-[#7B61FF]/20'}`}>
                          {has ? <Check size={11} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </button>
                      </td>
                    );
                  }))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: API Key Management ───────────────────────────────────────────────────
function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED);

  const load = useCallback(async () => {
    setLoading(true);
    try { setKeys(await getApiKeys()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function promptRevoke(k: ApiKey) {
    setConfirm({ open: true, title: 'Revoke API Key', message: `Revoke "${k.name}"? All systems using this key will lose access immediately.`, confirmLabel: 'Revoke Key', confirmCls: 'bg-[#F43F5E] hover:bg-[#E03354]', onConfirm: async () => {
      await revokeApiKey(k.id); await load();
    }});
  }

  function copyKey(val: string) {
    navigator.clipboard.writeText(val).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  const active = keys.filter(k => k.status === 'active').length;

  return (
    <div className="space-y-5">
      <ConfirmModal state={confirm} onClose={() => setConfirm(CLOSED)} />

      {/* Newly generated key — show once */}
      {newKey?.keyValue && (
        <div className="rounded-xl border border-[#22D3A1]/40 bg-[#22D3A1]/8 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key size={14} className="text-[#22D3A1]" />
            <span className="text-xs font-bold text-[#22D3A1]">API Key Generated — Copy Now (shown once only)</span>
          </div>
          <div className="flex items-center gap-2 bg-[#0B0F1A] rounded-lg px-3 py-2">
            <code className="flex-1 text-xs text-[#E2E8F0] font-mono break-all">{newKey.keyValue}</code>
            <button onClick={() => copyKey(newKey.keyValue!)} title="Copy key"
              className="flex items-center gap-1 text-xs text-[#7B61FF] hover:text-white transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-[#A0A7B8] hover:text-white mt-2 transition-colors">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Keys" value={keys.length} icon={Key} />
        <KpiCard label="Active Keys" value={active} icon={CheckCircle2} accent="#22D3A1" />
        <KpiCard label="Revoked" value={keys.length - active} icon={XCircle} accent="#F43F5E" />
        <KpiCard label="Expiring Soon" value={keys.filter(k => k.expiresAt && new Date(k.expiresAt).getTime() - Date.now() < 7 * 24 * 3600_000 && k.status === 'active').length} icon={Clock} accent="#F59E0B" sub="Within 7 days" />
      </div>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <SectionTitle>API Keys</SectionTitle>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-medium transition-colors">
            <Plus size={12} />Generate Key
          </button>
        </div>

        {showCreate && <CreateApiKeyForm onClose={() => setShowCreate(false)} onCreated={k => { setNewKey(k); setShowCreate(false); load(); }} />}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>
        ) : keys.length === 0 ? (
          <EmptyState icon={Key} message="No API keys created yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-[#7B61FF]/15">
                  {['Name', 'Key (masked)', 'Scopes', 'Rate Limit', 'Usage', 'Expires', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`py-2 text-[#A0A7B8] font-medium ${h === 'Actions' ? 'text-right pr-1' : 'text-left pr-3'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map(k => {
                  const expiring = k.expiresAt && k.status === 'active' && new Date(k.expiresAt).getTime() - Date.now() < 7 * 24 * 3600_000;
                  return (
                    <tr key={k.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5">
                      <td className="py-2.5 pr-3">
                        <div className="text-[#E2E8F0] font-medium">{k.name}</div>
                        {k.description && <div className="text-[#A0A7B8] max-w-[100px] truncate">{k.description}</div>}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[#A0A7B8]">{k.keyValue || '—'}</td>
                      <td className="py-2.5 pr-3">
                        {k.scopes.length > 0
                          ? <div className="flex flex-wrap gap-1">{k.scopes.slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 rounded bg-[#7B61FF]/15 text-[#7B61FF] text-[10px]">{s}</span>)}{k.scopes.length > 3 && <span className="text-[#A0A7B8] text-[10px]">+{k.scopes.length - 3}</span>}</div>
                          : <span className="text-[#A0A7B8]">All</span>
                        }
                      </td>
                      <td className="py-2.5 pr-3 text-[#A0A7B8]">{k.rateLimit.toLocaleString()}/hr</td>
                      <td className="py-2.5 pr-3 text-[#A0A7B8]">{k.usageCount.toLocaleString()}</td>
                      <td className="py-2.5 pr-3">
                        {k.expiresAt
                          ? <span className={expiring ? 'text-[#F59E0B] font-semibold' : 'text-[#A0A7B8]'}>{new Date(k.expiresAt).toLocaleDateString()}</span>
                          : <span className="text-[#A0A7B8]">Never</span>
                        }
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${k.status === 'active' ? STATUS_CLS.active : STATUS_CLS.inactive}`}>{k.status}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        {k.status === 'active' && (
                          <button onClick={() => promptRevoke(k)} className="px-2 py-1 rounded text-[10px] bg-[#F43F5E]/15 text-[#F43F5E] hover:bg-[#F43F5E]/25 font-medium transition-colors">
                            Revoke
                          </button>
                        )}
                        {k.status === 'revoked' && <span className="text-[10px] text-[#A0A7B8]">{k.revokedAt ? new Date(k.revokedAt).toLocaleDateString() : 'Revoked'}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function CreateApiKeyForm({ onClose, onCreated }: { onClose: () => void; onCreated: (k: ApiKey) => void }) {
  const [form, setForm] = useState({ name: '', description: '', expiresInDays: '365', rateLimit: '1000', scopes: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { setErr('Name is required'); return; }
    setSaving(true); setErr('');
    try {
      const scopeList = form.scopes.split(',').map(s => s.trim()).filter(Boolean);
      const k = await createApiKey({
        name: form.name,
        description: form.description,
        expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : undefined,
        rateLimit: Number(form.rateLimit) || 1000,
        scopes: scopeList,
      });
      onCreated(k);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-[#7B61FF]/30 bg-[#0B0F1A] p-4 mb-4">
      <h3 className="text-sm font-semibold text-white mb-3">Generate New API Key</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">Key Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required title="Key name" placeholder="e.g. DSP Sync Service"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs p-2 focus:outline-none focus:border-[#7B61FF]/60" />
          </div>
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} title="Description" placeholder="Purpose…"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs p-2 focus:outline-none focus:border-[#7B61FF]/60" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">Expires in Days</label>
            <input value={form.expiresInDays} onChange={e => setForm(f => ({ ...f, expiresInDays: e.target.value }))} type="number" min="1" title="Expiry days" placeholder="365"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs p-2 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">Rate Limit (req/hr)</label>
            <input value={form.rateLimit} onChange={e => setForm(f => ({ ...f, rateLimit: e.target.value }))} type="number" min="1" title="Rate limit" placeholder="1000"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs p-2 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1 block">Scopes (comma-sep)</label>
            <input value={form.scopes} onChange={e => setForm(f => ({ ...f, scopes: e.target.value }))} title="Scopes" placeholder="read, write"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#121826] text-[#E2E8F0] text-xs p-2 focus:outline-none" />
          </div>
        </div>
        {err && <p className="text-xs text-[#F43F5E]">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-xs transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-medium transition-colors disabled:opacity-50">
            {saving ? 'Generating…' : 'Generate Key'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Tab: Security Settings ────────────────────────────────────────────────────
function SecuritySettingsTab() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [newIp, setNewIp] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setSettings(await getSecuritySettings()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true); setErr(''); setSaved(false);
    try { const s = await updateSecuritySettings(settings); setSettings(s); setSaved(true); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'Failed'); }
    finally { setSaving(false); }
  }

  function addIp() {
    if (!newIp.trim() || !settings) return;
    setSettings(s => s ? { ...s, ipWhitelist: [...(s.ipWhitelist || []), newIp.trim()] } : s);
    setNewIp(''); setSaved(false);
  }

  function removeIp(ip: string) {
    setSettings(s => s ? { ...s, ipWhitelist: (s.ipWhitelist || []).filter(i => i !== ip) } : s);
    setSaved(false);
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>;
  if (!settings) return <p className="text-xs text-[#F43F5E]">Failed to load settings</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Security Settings</h3>
          <p className="text-xs text-[#A0A7B8] mt-0.5">Platform-wide access control configuration</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-[#22D3A1] flex items-center gap-1"><Check size={12} />Saved</span>}
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
      {err && <p className="text-xs text-[#F43F5E]">{err}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Authentication */}
        <Card className="p-5 space-y-4">
          <SectionTitle>Authentication</SectionTitle>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#E2E8F0] font-medium">Require 2FA for all admins</p>
              <p className="text-xs text-[#A0A7B8]">Enforce two-factor authentication on every login</p>
            </div>
            <Toggle checked={settings.twoFactorRequired} onChange={v => setSettings(s => s ? { ...s, twoFactorRequired: v } : s)} />
          </div>
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1.5 block">Session Timeout (minutes)</label>
            <input type="number" min="5" value={settings.sessionTimeoutMinutes} title="Session timeout minutes"
              onChange={e => setSettings(s => s ? { ...s, sessionTimeoutMinutes: Number(e.target.value) } : s)}
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2.5 focus:outline-none focus:border-[#7B61FF]/60" />
            <p className="text-[10px] text-[#A0A7B8] mt-1">Auto-logout inactive sessions after this many minutes</p>
          </div>
        </Card>

        {/* Login Attempts */}
        <Card className="p-5 space-y-4">
          <SectionTitle>Login Attempt Lockout</SectionTitle>
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1.5 block">Max Login Attempts</label>
            <input type="number" min="1" value={settings.loginAttempts.maxAttempts} title="Max login attempts"
              onChange={e => setSettings(s => s ? { ...s, loginAttempts: { ...s.loginAttempts, maxAttempts: Number(e.target.value) } } : s)}
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2.5 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-[#A0A7B8] mb-1.5 block">Lockout Duration (minutes)</label>
            <input type="number" min="1" value={settings.loginAttempts.lockoutMinutes} title="Lockout duration minutes"
              onChange={e => setSettings(s => s ? { ...s, loginAttempts: { ...s.loginAttempts, lockoutMinutes: Number(e.target.value) } } : s)}
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2.5 focus:outline-none" />
          </div>
        </Card>

        {/* Password Policy */}
        <Card className="p-5 space-y-4">
          <SectionTitle>Password Policy</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Min Length</label>
              <input type="number" min="6" value={settings.passwordPolicy.minLength} title="Min password length"
                onChange={e => setSettings(s => s ? { ...s, passwordPolicy: { ...s.passwordPolicy, minLength: Number(e.target.value) } } : s)}
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Expiry (days)</label>
              <input type="number" min="0" value={settings.passwordPolicy.expiryDays} title="Password expiry days"
                onChange={e => setSettings(s => s ? { ...s, passwordPolicy: { ...s.passwordPolicy, expiryDays: Number(e.target.value) } } : s)}
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#A0A7B8] mb-1 block">Prevent Reuse (last N)</label>
              <input type="number" min="0" value={settings.passwordPolicy.preventReuse} title="Prevent password reuse count"
                onChange={e => setSettings(s => s ? { ...s, passwordPolicy: { ...s.passwordPolicy, preventReuse: Number(e.target.value) } } : s)}
                className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2 focus:outline-none" />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            {[
              { key: 'requireUppercase', label: 'Require uppercase letter' },
              { key: 'requireNumbers', label: 'Require numbers' },
              { key: 'requireSpecial', label: 'Require special character' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-[#E2E8F0]">{label}</span>
                <Toggle checked={(settings.passwordPolicy as any)[key]}
                  onChange={v => setSettings(s => s ? { ...s, passwordPolicy: { ...s.passwordPolicy, [key]: v } } : s)} />
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts */}
        <Card className="p-5 space-y-4">
          <SectionTitle>Security Alerts</SectionTitle>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#E2E8F0] font-medium">Enable Security Alerts</p>
              <p className="text-xs text-[#A0A7B8]">Detect suspicious patterns (mass deletes, high volume)</p>
            </div>
            <Toggle checked={settings.alertsEnabled} onChange={v => setSettings(s => s ? { ...s, alertsEnabled: v } : s)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#E2E8F0] font-medium">After-hours Access Alert</p>
              <p className="text-xs text-[#A0A7B8]">Alert when admin accesses panel outside 06:00–22:00 UTC</p>
            </div>
            <Toggle checked={settings.afterHoursAlertEnabled} onChange={v => setSettings(s => s ? { ...s, afterHoursAlertEnabled: v } : s)} />
          </div>
        </Card>
      </div>

      {/* IP Whitelist */}
      <Card className="p-5">
        <SectionTitle>IP Whitelist</SectionTitle>
        <p className="text-xs text-[#A0A7B8] mb-4">Only allow admin panel access from these IPs. Leave empty to allow all IPs.</p>
        <div className="flex gap-2 mb-3">
          <input value={newIp} onChange={e => setNewIp(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIp()} title="IP address" placeholder="e.g. 192.168.1.1"
            className="flex-1 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2.5 focus:outline-none focus:border-[#7B61FF]/60 max-w-xs" />
          <button onClick={addIp} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#7B61FF]/30 text-[#7B61FF] hover:bg-[#7B61FF]/15 text-sm font-medium transition-colors">
            <Plus size={14} />Add IP
          </button>
        </div>
        {settings.ipWhitelist.length === 0 ? (
          <p className="text-xs text-[#A0A7B8] italic">No IPs whitelisted — all IPs are allowed</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {settings.ipWhitelist.map(ip => (
              <div key={ip} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-xs">
                <Globe size={11} className="text-[#7B61FF]" />
                <span className="text-[#E2E8F0] font-mono">{ip}</span>
                <button onClick={() => removeIp(ip)} title="Remove IP" className="text-[#A0A7B8] hover:text-[#F43F5E] transition-colors"><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
type TabKey = 'admins' | 'logs' | 'matrix' | 'keys' | 'settings';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'admins',   label: 'Admin Directory',       icon: Users },
  { key: 'logs',     label: 'Access Logs',            icon: Activity },
  { key: 'matrix',   label: 'Permissions Matrix',     icon: ShieldCheck },
  { key: 'keys',     label: 'API Keys',               icon: Key },
  { key: 'settings', label: 'Security Settings',      icon: Settings },
];

export function AdminSecurityPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('admins');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    getSecurityAlerts().then(a => setAlertCount(a.length)).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Access Control & Security</h1>
          <p className="text-xs text-[#A0A7B8] mt-0.5">Manage admin accounts, permissions, API keys, and platform security policies</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#7B61FF]/20 bg-[#121826]">
          <ShieldCheck size={14} className="text-[#7B61FF]" />
          <span className="text-xs text-[#A0A7B8]">Security Dashboard</span>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 flex-wrap rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          const badge = t.key === 'logs' && alertCount > 0 ? alertCount : 0;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white hover:bg-[#7B61FF]/15'}`}>
              <Icon size={13} />
              {t.label}
              {badge > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${active ? 'bg-white/25 text-white' : 'bg-[#F43F5E] text-white'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'admins'   && <AdminDirectoryTab />}
      {activeTab === 'logs'     && <AccessLogsTab />}
      {activeTab === 'matrix'   && <PermissionsMatrixTab />}
      {activeTab === 'keys'     && <ApiKeysTab />}
      {activeTab === 'settings' && <SecuritySettingsTab />}
    </div>
  );
}
