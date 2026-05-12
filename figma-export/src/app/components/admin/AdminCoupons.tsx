import React, { useEffect, useState } from 'react';
import {
  BadgePercent,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  Copy,
  ToggleLeft,
  ToggleRight,
  Loader,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';
import * as adminApi from '../../utils/admin-api';
import type { Coupon, CouponScope, CouponStatus, CreateCouponInput, CouponUsage } from '../../utils/admin-api';
import { useAdmin } from '../../contexts/AdminContext';

const SCOPE_LABELS: Record<CouponScope, string> = {
  subscription: 'Subscription',
  release: 'Release',
  promotion: 'Promotion',
  marketing: 'Marketing',
  all: 'All payments',
};

const ALL_SCOPES: CouponScope[] = ['subscription', 'release', 'promotion', 'marketing'];

function statusBadge(status: CouponStatus, expiresAt?: string) {
  const expired = expiresAt && new Date(expiresAt) < new Date();
  if (expired || status === 'expired') {
    return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-red-900/30 text-red-300 border border-red-800/50">Expired</span>;
  }
  if (status === 'inactive') {
    return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-700">Inactive</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50"><Check className="h-3 w-3" />Active</span>;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const EMPTY_FORM: CreateCouponInput & { status?: CouponStatus } = {
  code: '',
  description: '',
  discountPercent: 10,
  scopes: ['all'],
  maxUses: undefined,
  expiresAt: '',
  status: 'active',
};

export function AdminCoupons() {
  const { hasPermission } = useAdmin();
  const canEdit = hasPermission('payments.approve');

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCouponInput & { status?: CouponStatus }>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Usage tracking state
  const [expandedCouponId, setExpandedCouponId] = useState<string | null>(null);
  const [usagesMap, setUsagesMap] = useState<Record<string, CouponUsage[]>>({});
  const [usagesLoading, setUsagesLoading] = useState<Record<string, boolean>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAdminCoupons();
      setCoupons(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(c: Coupon) {
    setForm({
      code: c.code,
      description: c.description ?? '',
      discountPercent: c.discountPercent,
      scopes: c.scopes,
      maxUses: c.maxUses,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      status: c.status,
    });
    setEditingId(c.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function toggleScope(scope: CouponScope) {
    const current = form.scopes ?? [];
    if (scope === 'all') {
      setForm((f) => ({ ...f, scopes: ['all'] }));
      return;
    }
    // Remove 'all' when a specific scope is chosen
    const without = current.filter((s) => s !== 'all' && s !== scope);
    const newScopes = current.includes(scope) ? without : [...without, scope];
    setForm((f) => ({ ...f, scopes: newScopes.length ? newScopes : ['all'] }));
  }

  async function handleSave() {
    if (!form.code.trim()) { setError('Coupon code is required'); return; }
    if (form.discountPercent < 1 || form.discountPercent > 100) { setError('Discount must be between 1 and 100'); return; }
    if (!form.scopes || form.scopes.length === 0) { setError('Select at least one scope'); return; }

    try {
      setSaving(true);
      setError(null);
      const payload: CreateCouponInput & { status?: CouponStatus } = {
        code: form.code.trim().toUpperCase(),
        description: form.description || undefined,
        discountPercent: Number(form.discountPercent),
        scopes: form.scopes,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
        status: form.status,
      };

      if (editingId) {
        const updated = await adminApi.updateAdminCoupon(editingId, payload);
        setCoupons((cs) => cs.map((c) => (c.id === editingId ? updated : c)));
        flash('Coupon updated successfully.');
      } else {
        const created = await adminApi.createAdminCoupon(payload);
        setCoupons((cs) => [created, ...cs]);
        flash('Coupon created successfully.');
      }
      closeForm();
    } catch (e: any) {
      setError(e.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(coupon: Coupon) {
    const next: CouponStatus = coupon.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await adminApi.updateAdminCoupon(coupon.id, { status: next });
      setCoupons((cs) => cs.map((c) => (c.id === coupon.id ? updated : c)));
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    }
  }

  async function handleDelete(id: string) {
    try {
      await adminApi.deleteAdminCoupon(id);
      setCoupons((cs) => cs.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      flash('Coupon deleted.');
    } catch (e: any) {
      setError(e.message || 'Failed to delete coupon');
    }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  async function toggleUsages(coupon: Coupon) {
    if (expandedCouponId === coupon.id) {
      setExpandedCouponId(null);
      return;
    }
    setExpandedCouponId(coupon.id);
    if (usagesMap[coupon.id]) return; // already loaded
    setUsagesLoading((prev) => ({ ...prev, [coupon.id]: true }));
    try {
      const data = await adminApi.getAdminCouponUsages(coupon.id);
      setUsagesMap((prev) => ({ ...prev, [coupon.id]: data }));
    } catch (e: any) {
      setUsagesMap((prev) => ({ ...prev, [coupon.id]: [] }));
    } finally {
      setUsagesLoading((prev) => ({ ...prev, [coupon.id]: false }));
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <BadgePercent className="w-8 h-8 text-[#00E5FF]" />
            Coupon Management
          </h1>
          <p className="text-[#A0A7B8] mt-1">
            Create discount coupons for subscriptions, releases, promotions, and marketing payments.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#7B61FF] text-white rounded-lg hover:bg-[#6a52e0] transition font-medium"
          >
            <Plus className="w-5 h-5" />
            New Coupon
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-900/30 border border-green-700/50 text-green-300 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            {editingId ? 'Edit Coupon' : 'Create New Coupon'}
          </h2>
          <p className="text-[#6D7385] text-sm mb-5">
            {editingId ? 'Update the details below and save.' : 'Fill in the details below to create a new discount coupon.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">
                Coupon Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SAVE20"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none uppercase disabled:opacity-50"
                disabled={!!editingId}
              />
              {editingId && <p className="text-xs text-[#6D7385] mt-1">Code cannot be changed after creation.</p>}
            </div>

            {/* Discount % */}
            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">
                Discount Percentage <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
                  className="w-full px-3 py-2 pr-8 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  title="Discount percentage"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6D7385] text-sm font-medium">%</span>
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Description <span className="text-[#6D7385] font-normal">(shown to user at checkout)</span></label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. 20% off your first subscription"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
              />
            </div>

            {/* Scopes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Applies to</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleScope('all')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    form.scopes?.includes('all')
                      ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                      : 'bg-transparent text-[#A0A7B8] border-[#7B61FF]/30 hover:border-[#7B61FF]'
                  }`}
                >
                  All payments
                </button>
                {ALL_SCOPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleScope(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                      form.scopes?.includes(s) && !form.scopes?.includes('all')
                        ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                        : 'bg-transparent text-[#A0A7B8] border-[#7B61FF]/30 hover:border-[#7B61FF]'
                    }`}
                  >
                    {SCOPE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Uses */}
            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Max Uses <span className="text-[#6D7385] font-normal">(blank = unlimited)</span></label>
              <input
                type="number"
                min={1}
                value={form.maxUses ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Expiry Date <span className="text-[#6D7385] font-normal">(blank = no expiry)</span></label>
              <input
                type="date"
                value={form.expiresAt ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                title="Expiry date"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
              />
            </div>

            {/* Status (edit only) */}
            {editingId && (
              <div>
                <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Status</label>
                <select
                  value={form.status}
                  title="Coupon status"
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CouponStatus }))}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 focus:ring-2 focus:ring-[#7B61FF] outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#7B61FF] text-white rounded-lg hover:bg-[#6a52e0] transition font-medium disabled:opacity-50"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Coupon'}
            </button>
            <button
              onClick={closeForm}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-white/5 text-[#A0A7B8] rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-[#6D7385]">
          <Loader className="animate-spin w-5 h-5" />
          Loading coupons...
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-[#121826] rounded-xl border border-[#7B61FF]/20">
          <BadgePercent className="w-12 h-12 text-[#7B61FF]/30 mx-auto mb-3" />
          <p className="text-[#6D7385]">No coupons yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0B0F1A] border-b border-[#7B61FF]/10">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6D7385]">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6D7385]">Discount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6D7385]">Applies To</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6D7385]">Uses</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6D7385]">Expires</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6D7385]">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6D7385]">Usage Log</th>
                  {canEdit && (
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6D7385]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7B61FF]/10">
                {coupons.map((c) => (
                  <React.Fragment key={c.id}>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white tracking-widest">{c.code}</span>
                        <button
                          onClick={() => copyCode(c.code)}
                          title="Copy code"
                          className="text-[#6D7385] hover:text-[#00E5FF] transition"
                        >
                          {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {c.description && <p className="text-xs text-[#6D7385] mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#7B61FF]/15 text-[#7B61FF] border border-[#7B61FF]/30">
                        <BadgePercent className="w-3 h-3" />
                        {c.discountPercent}% off
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {c.scopes.includes('all') ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">All payments</span>
                        ) : (
                          c.scopes.map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded text-xs bg-white/5 text-[#A0A7B8] border border-white/10">
                              {SCOPE_LABELS[s]}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[#B3B3B3]">
                      {c.usedCount}
                      {c.maxUses ? ` / ${c.maxUses}` : ' / ∞'}
                    </td>
                    <td className="px-5 py-4 text-[#A0A7B8]">{formatDate(c.expiresAt)}</td>
                    <td className="px-5 py-4">{statusBadge(c.status, c.expiresAt)}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleUsages(c)}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#A0A7B8] hover:text-[#00E5FF] transition"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {c.usedCount > 0 ? `${c.usedCount} uses` : 'None'}
                        {expandedCouponId === c.id
                          ? <ChevronUp className="w-3.5 h-3.5" />
                          : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(c)}
                            title={c.status === 'active' ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded hover:bg-white/5 transition"
                          >
                            {c.status === 'active'
                              ? <ToggleRight className="w-5 h-5 text-green-400" />
                              : <ToggleLeft className="w-5 h-5 text-[#6D7385]" />}
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            title="Edit"
                            className="p-1.5 rounded hover:bg-white/5 transition text-[#7B61FF]"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {deleteConfirmId === c.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-xs bg-white/10 text-[#A0A7B8] rounded hover:bg-white/20"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(c.id)}
                              title="Delete"
                              className="p-1.5 rounded hover:bg-red-900/20 transition text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {/* Expandable usage panel */}
                  {expandedCouponId === c.id && (
                    <tr>
                      <td colSpan={canEdit ? 8 : 7} className="bg-[#0B0F1A] border-t border-[#7B61FF]/10 px-5 py-4">
                        {usagesLoading[c.id] ? (
                          <div className="flex items-center gap-2 text-[#6D7385] text-sm py-2">
                            <Loader className="w-4 h-4 animate-spin" /> Loading usage records...
                          </div>
                        ) : !usagesMap[c.id] || usagesMap[c.id].length === 0 ? (
                          <div className="flex items-center gap-2 text-[#6D7385] text-sm py-2">
                            <Users className="w-4 h-4" />
                            No uses recorded yet.
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold text-[#A0A7B8] uppercase tracking-wider mb-3">Usage Records</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-[#6D7385]">
                                    <th className="text-left pb-2 pr-4 font-medium">User</th>
                                    <th className="text-left pb-2 pr-4 font-medium">Type</th>
                                    <th className="text-left pb-2 pr-4 font-medium">Amount Before</th>
                                    <th className="text-left pb-2 pr-4 font-medium">Discount</th>
                                    <th className="text-left pb-2 pr-4 font-medium">Amount After</th>
                                    <th className="text-left pb-2 pr-4 font-medium">Reference</th>
                                    <th className="text-left pb-2 font-medium">Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#7B61FF]/10">
                                  {usagesMap[c.id].map((u) => (
                                    <tr key={u.id} className="text-[#A0A7B8]">
                                      <td className="py-2 pr-4">
                                        <p className="text-white font-medium">{u.userEmail}</p>
                                        {u.userName && <p className="text-[#6D7385]">{u.userName}</p>}
                                        <p className="text-[#6D7385] font-mono text-[10px]">{u.userId.slice(0, 8)}…</p>
                                      </td>
                                      <td className="py-2 pr-4">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                          u.scope === 'subscription' ? 'bg-[#7B61FF]/15 text-[#7B61FF]' :
                                          u.scope === 'release' ? 'bg-blue-900/30 text-blue-300' :
                                          u.scope === 'promotion' ? 'bg-orange-900/30 text-orange-300' :
                                          'bg-teal-900/30 text-teal-300'
                                        }`}>{u.scope}</span>
                                        {u.plan && <p className="text-[#6D7385] mt-0.5">{u.plan}</p>}
                                      </td>
                                      <td className="py-2 pr-4 font-mono">₦{u.amountBefore.toLocaleString()}</td>
                                      <td className="py-2 pr-4">
                                        <span className="text-green-400 font-mono">−₦{u.discountAmount.toLocaleString()}</span>
                                        <span className="text-[#6D7385] ml-1">({u.discountPercent}%)</span>
                                      </td>
                                      <td className="py-2 pr-4 font-mono text-white">₦{u.amountAfter.toLocaleString()}</td>
                                      <td className="py-2 pr-4">
                                        {u.paymentReference
                                          ? <span className="font-mono text-[#6D7385]">{u.paymentReference.slice(0, 12)}…</span>
                                          : <span className="text-[#6D7385]">—</span>}
                                      </td>
                                      <td className="py-2 text-[#6D7385]">{formatDate(u.createdAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-[#0F1525] border border-[#7B61FF]/20 rounded-lg p-4 text-sm">
        <p className="font-semibold text-white mb-1">How coupons work</p>
        <ul className="list-disc list-inside space-y-1 text-[#A0A7B8]">
          <li>Users enter a coupon code at checkout. The discount is applied before payment is initialised with Paystack.</li>
          <li>Coupons set to <strong className="text-white">All payments</strong> work on every transaction type.</li>
          <li>Scoped coupons only apply to their specific payment type (subscription, release, promotion, or marketing).</li>
          <li>If a coupon reaches its max-use limit or its expiry date, it is automatically rejected at checkout.</li>
          <li>The coupon code is stored with the payment record for full audit traceability.</li>
        </ul>
      </div>
    </div>
  );
}
