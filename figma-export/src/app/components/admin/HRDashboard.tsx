import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Briefcase, CalendarDays, Plus, RefreshCw, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import {
  approveHRPromotion,
  bulkIncreaseHRSalary,
  getHROverview,
  promoteHRStaff,
  rejectHRPromotion,
  requestHRPromotion,
  reviewHRPromotion,
  upsertHRDepartment,
  upsertHRRole,
  upsertHRStaff,
  updateHRStaffStatus,
  type HrDepartmentRecord,
  type HrOverviewResponse,
  type HrRoleRecord,
  type HrStaffMember,
} from '../../utils/admin-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

function currency(amount: number, code = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function emptyStaff(): Partial<HrStaffMember> {
  return {
    fullName: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    manager: '',
    employmentType: 'full_time',
    status: 'active',
    joinDate: new Date().toISOString().slice(0, 10),
    promotionStatus: 'none',
    payGrade: 'PG-1',
    baseSalary: 0,
    currency: 'NGN',
    benefits: {
      healthInsurance: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      mealAllowance: 0,
      pensionPercent: 8,
      nhfPercent: 2.5,
    },
    entitlements: {
      annualLeaveDays: 21,
      sickLeaveDays: 10,
      parentalLeaveDays: 14,
      studyLeaveDays: 5,
    },
    tax: {
      taxId: '',
      stateCode: 'LA',
    },
    bank: {
      bankName: '',
      accountNumber: '',
      bankCode: '',
    },
    leaveBalance: {
      annualLeaveDays: 0,
      sickLeaveDays: 0,
      parentalLeaveDays: 0,
      studyLeaveDays: 0,
      lastAccruedAt: new Date().toISOString(),
    },
  };
}

export function HRDashboard() {
  type StaffStatus = HrStaffMember['status'];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState<HrOverviewResponse | null>(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StaffStatus>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<HrStaffMember>>(() => emptyStaff());
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryIncreasePct, setSalaryIncreasePct] = useState('5');
  const [salaryDepartment, setSalaryDepartment] = useState('all');
  const [salaryStatus, setSalaryStatus] = useState<'all' | StaffStatus>('all');
  const [salaryReason, setSalaryReason] = useState('Annual compensation adjustment');
  const [salaryConfirmChecked, setSalaryConfirmChecked] = useState(false);
  const [applyingSalaryIncrease, setApplyingSalaryIncrease] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [promotionMenuOpen, setPromotionMenuOpen] = useState(false);
  const [promotionMode, setPromotionMode] = useState<'auto' | 'manual'>('auto');
  const [promotionStepPct, setPromotionStepPct] = useState('20');
  const [promotionManualPct, setPromotionManualPct] = useState('20');
  const [promotionUseFixedTarget, setPromotionUseFixedTarget] = useState(false);
  const [promotionTargetPayGrade, setPromotionTargetPayGrade] = useState('PG-1A');
  const [applyingBulkPromotion, setApplyingBulkPromotion] = useState(false);
  const [departmentRoleModalOpen, setDepartmentRoleModalOpen] = useState(false);
  const [departmentForm, setDepartmentForm] = useState<Partial<HrDepartmentRecord>>({
    name: '',
    description: '',
    costCenterCode: '',
    expenseAccount: 'Payroll Expense',
    revenueAccount: 'N/A',
  });
  const [roleForm, setRoleForm] = useState<Partial<HrRoleRecord>>({
    name: '',
    department: '',
    defaultPayGrade: 'PG-1A',
  });
  const [savingDepartmentMeta, setSavingDepartmentMeta] = useState(false);

  const payGradeScale = useMemo(() => {
    const grades: string[] = [];
    for (let level = 1; level <= 30; level += 1) {
      grades.push(`PG-${level}A`);
      grades.push(`PG-${level}B`);
    }
    return grades;
  }, []);

  const staff = overview?.staff || [];

  async function load() {
    setLoading(true);
    try {
      const data = await getHROverview();
      setOverview(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load HR dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const departments = useMemo(() => {
    const values = new Set((overview?.departments || []).map((d) => d.name).filter(Boolean));
    return Array.from(values).sort();
  }, [overview]);

  const roles = useMemo(() => {
    return (overview?.roles || []).slice().sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
  }, [overview]);

  const roleOptionsForForm = useMemo(() => {
    const selectedDept = String(form.department || '').trim();
    if (!selectedDept) return roles;
    return roles.filter((r) => r.department === selectedDept);
  }, [roles, form.department]);

  const filtered = useMemo(() => {
    return staff.filter((item) => {
      const matchesSearch = [item.fullName, item.staffId, item.email, item.role, item.department]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesDept = departmentFilter === 'all' || item.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [staff, search, departmentFilter, statusFilter]);

  const selectedStaff = useMemo(() => {
    const idSet = new Set(selectedStaffIds);
    return staff.filter((member) => idSet.has(member.id));
  }, [staff, selectedStaffIds]);

  function startEdit(member: HrStaffMember) {
    setEditingId(member.id);
    setForm(member);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyStaff());
  }

  async function saveStaff() {
    if (!form.fullName || !form.email || !form.department || !form.role) {
      toast.error('Full name, email, department, and role are required');
      return;
    }

    setSaving(true);
    try {
      const list = await upsertHRStaff({ ...form, id: editingId || undefined });
      setOverview((current) => (current ? { ...current, staff: list } : current));
      toast.success(editingId ? 'Staff profile updated' : 'Staff member added');
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save staff profile');
    } finally {
      setSaving(false);
    }
  }

  async function saveDepartmentMeta() {
    if (!departmentForm.name?.trim()) {
      toast.error('Department name is required');
      return;
    }
    setSavingDepartmentMeta(true);
    try {
      const list = await upsertHRDepartment({
        ...departmentForm,
        name: departmentForm.name.trim(),
      });
      setOverview((current) => (current ? { ...current, departments: list } : current));
      setDepartmentForm({
        name: '',
        description: '',
        costCenterCode: '',
        expenseAccount: 'Payroll Expense',
        revenueAccount: 'N/A',
      });
      toast.success('Department saved and linked to finance');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save department');
    } finally {
      setSavingDepartmentMeta(false);
    }
  }

  async function saveRoleMeta() {
    if (!roleForm.name?.trim() || !roleForm.department?.trim()) {
      toast.error('Role name and department are required');
      return;
    }
    setSavingDepartmentMeta(true);
    try {
      const list = await upsertHRRole({
        ...roleForm,
        name: roleForm.name.trim(),
        department: roleForm.department.trim(),
      });
      setOverview((current) => (current ? { ...current, roles: list } : current));
      setRoleForm({
        name: '',
        department: String(form.department || (departmentFilter === 'all' ? '' : departmentFilter)),
        defaultPayGrade: 'PG-1A',
      });
      toast.success('Role saved');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save role');
    } finally {
      setSavingDepartmentMeta(false);
    }
  }

  async function setStaffStatus(id: string, status: HrStaffMember['status']) {
    try {
      const updated = await updateHRStaffStatus(id, status);
      setOverview((current) => {
        if (!current) return current;
        return {
          ...current,
          staff: current.staff.map((s) => (s.id === updated.id ? updated : s)),
        };
      });
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  }

  async function requestPromotion(id: string) {
    try {
      const member = staff.find((s) => s.id === id);
      if (!member) return;
      await requestHRPromotion({
        id,
        newRole: member.role,
        newPayGrade: member.payGrade,
        salaryIncreasePct: 10,
        reason: 'Performance review recommendation',
      });
      toast.success('Promotion request submitted');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Promotion request failed');
    }
  }

  async function movePromotionToReview(id: string) {
    try {
      await reviewHRPromotion(id);
      toast.success('Promotion request moved to review');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to review promotion request');
    }
  }

  async function approvePromotion(id: string) {
    try {
      const member = staff.find((s) => s.id === id);
      if (!member) return;
      await approveHRPromotion({
        id,
        newRole: member.promotionRequest?.requestedRole || member.role,
        newPayGrade: member.promotionRequest?.requestedPayGrade || member.payGrade,
        salaryIncreasePct: member.promotionRequest?.salaryIncreasePct || 10,
      });
      toast.success('Promotion approved and synchronized to payroll');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve promotion');
    }
  }

  async function rejectPromotion(id: string) {
    try {
      await rejectHRPromotion(id, 'Not approved in current cycle');
      toast.success('Promotion request rejected');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject promotion');
    }
  }

  function parsePayGrade(grade: string): number | null {
    const normalized = String(grade || '').trim().toUpperCase();
    const match = normalized.match(/^PG-(\d{1,2})(A|B)$/);
    if (!match) return null;
    const level = Number(match[1]);
    if (!Number.isFinite(level) || level < 1 || level > 30) return null;
    const notchOffset = match[2] === 'B' ? 1 : 0;
    return (level - 1) * 2 + notchOffset;
  }

  function formatPayGrade(index: number): string {
    const safe = Math.max(0, Math.min(59, index));
    const level = Math.floor(safe / 2) + 1;
    const notch = safe % 2 === 0 ? 'A' : 'B';
    return `PG-${level}${notch}`;
  }

  function nextPayGrade(current: string): string {
    const idx = parsePayGrade(current);
    if (idx === null) return 'PG-1A';
    return formatPayGrade(idx + 1);
  }

  function gradeStepsBetween(fromGrade: string, toGrade: string): number {
    const fromIdx = parsePayGrade(fromGrade);
    const toIdx = parsePayGrade(toGrade);
    if (fromIdx === null || toIdx === null) return 1;
    return Math.max(1, toIdx - fromIdx);
  }

  function toggleStaffSelection(id: string) {
    setSelectedStaffIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleSelectAllFiltered() {
    const filteredIds = filtered.map((member) => member.id);
    const selectedSet = new Set(selectedStaffIds);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));
    if (allSelected) {
      setSelectedStaffIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }
    setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  }

  function openPromotionMenu() {
    setPromotionMode('auto');
    setPromotionStepPct('20');
    setPromotionManualPct('20');
    setPromotionUseFixedTarget(false);
    setPromotionTargetPayGrade('PG-1A');
    setPromotionMenuOpen(true);
  }

  async function applyBulkPromotion() {
    if (selectedStaff.length === 0) {
      toast.error('Select at least one staff member for bulk promotion');
      return;
    }

    const autoStepPct = Math.max(0, Number(promotionStepPct) || 0);
    const manualPct = Math.max(0, Number(promotionManualPct) || 0);
    if (promotionMode === 'auto' && autoStepPct <= 0) {
      toast.error('Auto promotion percentage must be greater than 0');
      return;
    }
    if (promotionMode === 'manual' && manualPct <= 0) {
      toast.error('Manual increase percentage must be greater than 0');
      return;
    }

    setApplyingBulkPromotion(true);
    try {
      let updatedCount = 0;
      for (const member of selectedStaff) {
        const targetGrade = promotionUseFixedTarget ? promotionTargetPayGrade : nextPayGrade(member.payGrade);
        const steps = promotionUseFixedTarget ? gradeStepsBetween(member.payGrade, targetGrade) : 1;
        const increasePct = promotionMode === 'manual' ? manualPct : autoStepPct * steps;

        await promoteHRStaff({
          id: member.id,
          newRole: member.role,
          newPayGrade: targetGrade,
          salaryIncreasePct: increasePct,
        });
        updatedCount += 1;
      }

      toast.success(`Bulk promotion completed for ${updatedCount} staff`);
      setPromotionMenuOpen(false);
      setSelectedStaffIds([]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply bulk promotion');
    } finally {
      setApplyingBulkPromotion(false);
    }
  }

  function openSalaryIncreaseModal() {
    setSalaryDepartment(departmentFilter);
    setSalaryStatus(statusFilter);
    setSalaryIncreasePct('5');
    setSalaryReason('Annual compensation adjustment');
    setSalaryConfirmChecked(false);
    setSalaryModalOpen(true);
  }

  async function applyBulkSalaryIncrease() {
    const pct = Number(salaryIncreasePct);
    if (!Number.isFinite(pct) || pct <= 0) {
      toast.error('Increase percentage must be greater than 0');
      return;
    }

    setApplyingSalaryIncrease(true);
    try {
      const result = await bulkIncreaseHRSalary({
        increasePct: pct,
        department: salaryDepartment === 'all' ? undefined : salaryDepartment,
        status: salaryStatus,
        reason: salaryReason,
      });
      setOverview((current) => (current ? { ...current, staff: result.staff } : current));
      toast.success(`Salary increased for ${result.updatedCount} staff (${currency(result.totalIncrement)} total monthly increase)`);
      setSalaryModalOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply salary increase');
    } finally {
      setApplyingSalaryIncrease(false);
    }
  }

  const salaryTargets = useMemo(() => {
    return staff.filter((member) => {
      if (member.status === 'terminated') return false;
      if (salaryDepartment !== 'all' && member.department !== salaryDepartment) return false;
      if (salaryStatus !== 'all' && member.status !== salaryStatus) return false;
      return true;
    });
  }, [staff, salaryDepartment, salaryStatus]);

  const projectedMonthlyIncrement = useMemo(() => {
    const pct = Number(salaryIncreasePct);
    if (!Number.isFinite(pct) || pct <= 0) return 0;
    return salaryTargets.reduce((sum, member) => sum + Number(member.baseSalary || 0) * (pct / 100), 0);
  }, [salaryTargets, salaryIncreasePct]);

  const selectedCurrentMonthlyPayroll = useMemo(() => {
    return salaryTargets.reduce((sum, member) => sum + Number(member.baseSalary || 0), 0);
  }, [salaryTargets]);

  const selectedProjectedMonthlyPayroll = selectedCurrentMonthlyPayroll + projectedMonthlyIncrement;

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-[#A0A7B8]">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading HR dashboard...
      </div>
    );
  }

  const metrics = overview?.metrics || {
    totalStaff: 0,
    activeStaff: 0,
    onLeave: 0,
    monthlyPayroll: 0,
    pendingPromotions: 0,
  };

  return (
    <>
      <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">HR Dashboard</h1>
          <p className="mt-1 text-sm text-[#A0A7B8]">Live staff records, promotions, benefits, pay grades, entitlements, and payroll linkage.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
        <Button variant="outline" onClick={openPromotionMenu}>
          <BadgeCheck className="mr-2 h-4 w-4" /> Promotion Menu
        </Button>
        <Button variant="outline" onClick={() => setDepartmentRoleModalOpen(true)}>
          <Users className="mr-2 h-4 w-4" /> Departments & Roles
        </Button>
        <Button onClick={openSalaryIncreaseModal}>
          <Briefcase className="mr-2 h-4 w-4" /> Increase Staff Salary
        </Button>
      </div>

      <Card className="border-[#222] bg-[#111] p-3 text-xs text-[#A0A7B8]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            Selected staff for promotion: <span className="text-white">{selectedStaffIds.length}</span>
          </p>
          <p>
            Paygrade ladder: <span className="text-white">PG-1A to PG-30B (60 steps, 2 notches each)</span>
          </p>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-5">
        <Card className="border-[#222] bg-[#111] p-4"><p className="text-xs text-[#9CA3AF]">Total Staff</p><p className="mt-1 text-xl font-bold text-white">{metrics.totalStaff}</p></Card>
        <Card className="border-[#222] bg-[#111] p-4"><p className="text-xs text-[#9CA3AF]">Active</p><p className="mt-1 text-xl font-bold text-[#10B981]">{metrics.activeStaff}</p></Card>
        <Card className="border-[#222] bg-[#111] p-4"><p className="text-xs text-[#9CA3AF]">On Leave</p><p className="mt-1 text-xl font-bold text-[#F59E0B]">{metrics.onLeave}</p></Card>
        <Card className="border-[#222] bg-[#111] p-4"><p className="text-xs text-[#9CA3AF]">Pending Promotions</p><p className="mt-1 text-xl font-bold text-[#7C3AED]">{metrics.pendingPromotions}</p></Card>
        <Card className="border-[#222] bg-[#111] p-4"><p className="text-xs text-[#9CA3AF]">Monthly Payroll</p><p className="mt-1 text-xl font-bold text-[#00E5FF]">{currency(metrics.monthlyPayroll)}</p></Card>
      </div>

      <Card className="border-[#222] bg-[#111] p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Department Finance Link</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs text-[#D1D5DB]">
            <thead className="text-[#9CA3AF]">
              <tr>
                <th className="pb-2">Department</th>
                <th className="pb-2">Cost Center</th>
                <th className="pb-2">Expense Account</th>
                <th className="pb-2">Revenue Account</th>
                <th className="pb-2">Monthly Payroll</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.departmentFinanceLinks || []).map((link) => (
                <tr key={link.id} className="border-t border-[#222]">
                  <td className="py-2 pr-3 text-white">{link.name}</td>
                  <td className="py-2 pr-3">{link.costCenterCode}</td>
                  <td className="py-2 pr-3">{link.expenseAccount}</td>
                  <td className="py-2 pr-3">{link.revenueAccount}</td>
                  <td className="py-2 pr-3">{currency(link.monthlyPayroll)}</td>
                </tr>
              ))}
              {(overview?.departmentFinanceLinks || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[#9CA3AF]">No department finance mapping yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="border-[#222] bg-[#111] p-4">
          <h2 className="mb-3 flex items-center text-sm font-semibold text-white"><UserCog className="mr-2 h-4 w-4" /> {editingId ? 'Edit Staff Profile' : 'Add Staff Profile'}</h2>
          <div className="space-y-3 text-xs">
            <Input placeholder="Full name" value={form.fullName || ''} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} />
            <Input placeholder="Email" value={form.email || ''} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <Input placeholder="Phone" value={form.phone || ''} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-10 rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white"
                value={form.department || ''}
                onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))}
              >
                <option value="">Select department</option>
                {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
              </select>
              <select
                className="h-10 rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white"
                value={form.role || ''}
                onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
              >
                <option value="">Select role</option>
                {roleOptionsForForm.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Pay Grade" value={form.payGrade || ''} onChange={(e) => setForm((s) => ({ ...s, payGrade: e.target.value }))} />
              <Input type="number" placeholder="Base Salary" value={String(form.baseSalary || '')} onChange={(e) => setForm((s) => ({ ...s, baseSalary: Number(e.target.value || 0) }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tax ID" value={form.tax?.taxId || ''} onChange={(e) => setForm((s) => ({ ...s, tax: { ...(s.tax || { stateCode: 'LA', taxId: '' }), taxId: e.target.value } }))} />
              <Input placeholder="State Code" value={form.tax?.stateCode || ''} onChange={(e) => setForm((s) => ({ ...s, tax: { ...(s.tax || { stateCode: 'LA', taxId: '' }), stateCode: e.target.value } }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Bank" value={form.bank?.bankName || ''} onChange={(e) => setForm((s) => ({ ...s, bank: { ...(s.bank || { accountNumber: '', bankCode: '', bankName: '' }), bankName: e.target.value } }))} />
              <Input placeholder="Account No" value={form.bank?.accountNumber || ''} onChange={(e) => setForm((s) => ({ ...s, bank: { ...(s.bank || { accountNumber: '', bankCode: '', bankName: '' }), accountNumber: e.target.value } }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Annual Leave Days" value={String(form.entitlements?.annualLeaveDays || '')} onChange={(e) => setForm((s) => ({ ...s, entitlements: { ...(s.entitlements || { annualLeaveDays: 21, sickLeaveDays: 10, parentalLeaveDays: 14, studyLeaveDays: 5 }), annualLeaveDays: Number(e.target.value || 0) } }))} />
              <Input type="number" placeholder="Sick Leave Days" value={String(form.entitlements?.sickLeaveDays || '')} onChange={(e) => setForm((s) => ({ ...s, entitlements: { ...(s.entitlements || { annualLeaveDays: 21, sickLeaveDays: 10, parentalLeaveDays: 14, studyLeaveDays: 5 }), sickLeaveDays: Number(e.target.value || 0) } }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Pension %" value={String(form.benefits?.pensionPercent || '')} onChange={(e) => setForm((s) => ({ ...s, benefits: { ...(s.benefits || { healthInsurance: 0, housingAllowance: 0, transportAllowance: 0, mealAllowance: 0, pensionPercent: 8, nhfPercent: 2.5 }), pensionPercent: Number(e.target.value || 0) } }))} />
              <Input type="number" placeholder="NHF %" value={String(form.benefits?.nhfPercent || '')} onChange={(e) => setForm((s) => ({ ...s, benefits: { ...(s.benefits || { healthInsurance: 0, housingAllowance: 0, transportAllowance: 0, mealAllowance: 0, pensionPercent: 8, nhfPercent: 2.5 }), nhfPercent: Number(e.target.value || 0) } }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" disabled={saving} onClick={() => void saveStaff()}>
                <Plus className="mr-2 h-4 w-4" /> {editingId ? 'Update Staff' : 'Add Staff'}
              </Button>
              {editingId ? <Button variant="outline" onClick={resetForm}>Cancel</Button> : null}
            </div>
          </div>
        </Card>

        <Card className="border-[#222] bg-[#111] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Input className="max-w-xs" placeholder="Search staff" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select
              className="h-10 rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All departments</option>
              {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
            </select>
            <select
              className="h-10 rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-[#D1D5DB]">
              <thead className="text-[#9CA3AF]">
                <tr>
                  <th className="pb-2">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((member) => selectedStaffIds.includes(member.id))}
                      onChange={toggleSelectAllFiltered}
                    />
                  </th>
                  <th className="pb-2">Staff</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Pay Grade</th>
                  <th className="pb-2">Benefits + Entitlements</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t border-[#222] align-top">
                    <td className="py-3 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.includes(item.id)}
                        onChange={() => toggleStaffSelection(item.id)}
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-white">{item.fullName}</p>
                      <p className="text-[#9CA3AF]">{item.staffId} · {item.department}</p>
                      <p className="text-[#9CA3AF]">{item.email}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p>{item.role}</p>
                      <p className="text-[#9CA3AF]">Manager: {item.manager || '-'}</p>
                      <p className="text-[#9CA3AF]">{currency(item.baseSalary, item.currency)}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="text-white">{item.payGrade}</p>
                      <p className="text-[#9CA3AF]">Pension: {item.benefits.pensionPercent}%</p>
                      <p className="text-[#9CA3AF]">NHF: {item.benefits.nhfPercent}%</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="text-[#9CA3AF]">Annual leave: {item.entitlements.annualLeaveDays}d</p>
                      <p className="text-[#9CA3AF]">Sick leave: {item.entitlements.sickLeaveDays}d</p>
                      <p className="text-[#9CA3AF]">Leave balance: {item.leaveBalance.annualLeaveDays.toFixed(1)}d / {item.leaveBalance.sickLeaveDays.toFixed(1)}d</p>
                      <p className="text-[#9CA3AF]">Tax state: {item.tax.stateCode}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center rounded-full border border-[#333] px-2 py-1 text-[11px] text-white">
                        {item.status.replace('_', ' ')}
                      </span>
                      <div className="mt-1 text-[11px] text-[#A78BFA]">Promotion: {item.promotionStatus}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => startEdit(item)}><Users className="mr-1 h-3 w-3" />Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => void requestPromotion(item.id)}><BadgeCheck className="mr-1 h-3 w-3" />Request</Button>
                        <Button size="sm" variant="outline" onClick={() => void movePromotionToReview(item.id)}>Review</Button>
                        <Button size="sm" variant="outline" onClick={() => void approvePromotion(item.id)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => void rejectPromotion(item.id)}>Reject</Button>
                        <Button size="sm" variant="outline" onClick={() => void setStaffStatus(item.id, 'on_leave')}><CalendarDays className="mr-1 h-3 w-3" />Leave</Button>
                        <Button size="sm" variant="outline" onClick={() => void setStaffStatus(item.id, 'active')}><Briefcase className="mr-1 h-3 w-3" />Activate</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#9CA3AF]">No staff records found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="border-[#222] bg-[#111] p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">HR Audit Trail</h2>
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1 text-xs">
          {(overview?.auditTrail || []).map((entry) => (
            <div key={entry.id} className="rounded border border-[#222] bg-[#0F0F10] p-2">
              <p className="font-medium text-white">{entry.action}</p>
              <p className="text-[#9CA3AF]">Staff ID: {entry.staffId} · Actor: {entry.actor}</p>
              <p className="text-[#9CA3AF]">{new Date(entry.timestamp).toLocaleString()}</p>
            </div>
          ))}
          {(overview?.auditTrail || []).length === 0 ? <p className="text-[#9CA3AF]">No audit events recorded yet.</p> : null}
        </div>
      </Card>
      </div>

      <Dialog open={salaryModalOpen} onOpenChange={setSalaryModalOpen}>
        <DialogContent className="border-[#222] bg-[#111] text-white">
        <DialogHeader>
          <DialogTitle>Bulk Salary Increase</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Apply a non-promotion salary increase to all matching staff and sync to payroll in real time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="Increase %"
              value={salaryIncreasePct}
              onChange={(e) => setSalaryIncreasePct(e.target.value)}
            />
            <Input
              placeholder="Reason"
              value={salaryReason}
              onChange={(e) => setSalaryReason(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-10 rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white"
              value={salaryDepartment}
              onChange={(e) => setSalaryDepartment(e.target.value)}
            >
              <option value="all">All departments</option>
              {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
            </select>
            <select
              className="h-10 rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white"
              value={salaryStatus}
              onChange={(e) => setSalaryStatus(e.target.value as 'all' | StaffStatus)}
            >
              <option value="all">All active statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="rounded border border-[#222] bg-[#0F0F10] p-3 text-xs text-[#9CA3AF]">
            <p>Staff affected: <span className="text-white">{salaryTargets.length}</span></p>
            <p>Current monthly payroll (selected): <span className="text-white">{currency(selectedCurrentMonthlyPayroll)}</span></p>
            <p>Projected monthly increment: <span className="text-white">{currency(projectedMonthlyIncrement)}</span></p>
            <p>Projected monthly payroll (selected): <span className="text-white">{currency(selectedProjectedMonthlyPayroll)}</span></p>
          </div>

          <div className="rounded border border-[#1F2937] bg-[#0C1118] p-3 text-xs text-[#9FB3C8]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={salaryConfirmChecked}
                onChange={(e) => setSalaryConfirmChecked(e.target.checked)}
                className="h-4 w-4 rounded border border-[#334155] bg-[#0B0B0C]"
              />
              <span>I confirm this non-promotion salary increase and payroll update.</span>
            </label>
          </div>
        </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSalaryModalOpen(false)}>Cancel</Button>
          <Button
            disabled={applyingSalaryIncrease || salaryTargets.length === 0 || !salaryConfirmChecked}
            onClick={() => void applyBulkSalaryIncrease()}
          >
              {applyingSalaryIncrease ? 'Applying...' : 'Apply Increase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promotionMenuOpen} onOpenChange={setPromotionMenuOpen}>
        <DialogContent className="border-[#222] bg-[#111] text-white">
          <DialogHeader>
            <DialogTitle>Promotion Menu</DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Promote all selected staff, update paygrades, and apply salary increase rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded border border-[#222] bg-[#0F0F10] p-3 text-xs text-[#9CA3AF]">
              <p>Selected staff: <span className="text-white">{selectedStaff.length}</span></p>
              <p>Paygrade ladder: <span className="text-white">PG-1A to PG-30B (two notches per grade)</span></p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-10 rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white"
                value={promotionMode}
                onChange={(e) => setPromotionMode(e.target.value as 'auto' | 'manual')}
              >
                <option value="auto">Auto 20% per paygrade step</option>
                <option value="manual">Manual percentage setup</option>
              </select>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder={promotionMode === 'auto' ? 'Auto step %' : 'Manual increase %'}
                value={promotionMode === 'auto' ? promotionStepPct : promotionManualPct}
                onChange={(e) => {
                  if (promotionMode === 'auto') {
                    setPromotionStepPct(e.target.value);
                  } else {
                    setPromotionManualPct(e.target.value);
                  }
                }}
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <input
                type="checkbox"
                checked={promotionUseFixedTarget}
                onChange={(e) => setPromotionUseFixedTarget(e.target.checked)}
              />
              Set a fixed target paygrade for all selected staff
            </label>

            {promotionUseFixedTarget ? (
              <select
                className="h-10 w-full rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white"
                value={promotionTargetPayGrade}
                onChange={(e) => setPromotionTargetPayGrade(e.target.value)}
              >
                {payGradeScale.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-[#9CA3AF]">Auto target: each selected staff moves to the next notch/grade.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromotionMenuOpen(false)}>Cancel</Button>
            <Button disabled={applyingBulkPromotion || selectedStaff.length === 0} onClick={() => void applyBulkPromotion()}>
              {applyingBulkPromotion ? 'Applying...' : 'Promote Selected'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={departmentRoleModalOpen} onOpenChange={setDepartmentRoleModalOpen}>
        <DialogContent className="border-[#222] bg-[#111] text-white">
          <DialogHeader>
            <DialogTitle>Departments & Roles</DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Create departments, map them to finance accounts, and define roles for HR staff records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded border border-[#222] bg-[#0F0F10] p-3">
              <p className="mb-2 text-xs font-semibold text-white">Create Department (Finance-linked)</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Department name" value={departmentForm.name || ''} onChange={(e) => setDepartmentForm((s) => ({ ...s, name: e.target.value }))} />
                <Input placeholder="Cost center code" value={departmentForm.costCenterCode || ''} onChange={(e) => setDepartmentForm((s) => ({ ...s, costCenterCode: e.target.value }))} />
                <Input placeholder="Expense account" value={departmentForm.expenseAccount || ''} onChange={(e) => setDepartmentForm((s) => ({ ...s, expenseAccount: e.target.value }))} />
                <Input placeholder="Revenue account" value={departmentForm.revenueAccount || ''} onChange={(e) => setDepartmentForm((s) => ({ ...s, revenueAccount: e.target.value }))} />
              </div>
              <Input className="mt-2" placeholder="Description" value={departmentForm.description || ''} onChange={(e) => setDepartmentForm((s) => ({ ...s, description: e.target.value }))} />
              <Button className="mt-2" size="sm" disabled={savingDepartmentMeta} onClick={() => void saveDepartmentMeta()}>Save Department</Button>
            </div>

            <div className="rounded border border-[#222] bg-[#0F0F10] p-3">
              <p className="mb-2 text-xs font-semibold text-white">Create Role</p>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Role name" value={roleForm.name || ''} onChange={(e) => setRoleForm((s) => ({ ...s, name: e.target.value }))} />
                <select className="h-10 rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white" value={roleForm.department || ''} onChange={(e) => setRoleForm((s) => ({ ...s, department: e.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
                <select className="h-10 rounded-md border border-[#333] bg-[#0B0B0C] px-3 text-sm text-white" value={roleForm.defaultPayGrade || 'PG-1A'} onChange={(e) => setRoleForm((s) => ({ ...s, defaultPayGrade: e.target.value }))}>
                  {payGradeScale.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                </select>
              </div>
              <Button className="mt-2" size="sm" disabled={savingDepartmentMeta} onClick={() => void saveRoleMeta()}>Save Role</Button>
            </div>

            <div className="max-h-44 overflow-y-auto rounded border border-[#222] bg-[#0F0F10] p-3 text-xs">
              <p className="mb-2 font-semibold text-white">Configured Roles</p>
              {(overview?.roles || []).map((role) => (
                <div key={role.id} className="flex items-center justify-between border-t border-[#222] py-1 text-[#9CA3AF]">
                  <span>{role.name}</span>
                  <span>{role.department} · {role.defaultPayGrade}</span>
                </div>
              ))}
              {(overview?.roles || []).length === 0 ? <p className="text-[#9CA3AF]">No roles configured yet.</p> : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartmentRoleModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
