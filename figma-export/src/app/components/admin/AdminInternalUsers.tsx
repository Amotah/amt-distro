import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  activateInternalUser,
  createInternalUser,
  deactivateInternalUser,
  deleteInternalUser,
  getInternalUsers,
  getAllPermissionMatrices,
  setRolePermissionMatrix,
  updateInternalUser,
  updateInternalUserPermissions,
  type CreateInternalUserInput,
  type InternalUser,
  type InternalUserRole,
  type PermissionLevel,
  type PermissionMatrixConfig,
} from '../../utils/admin-api';

const INTERNAL_USER_ROLES: InternalUserRole[] = [
  'superadmin',
  'system_admin',
  'admin_finance',
  'admin_content',
  'admin_support',
  'admin_fraud',
  'admin_analytics',
  'admin_operations',
  'hr_manager',
  'hr_specialist',
  'hr_coordinator',
  'payroll_manager',
  'recruitment_officer',
  'staff',
];

const PERMISSION_LEVELS: PermissionLevel[] = ['inputter', 'authorizer', 'viewer', 'admin'];

function getRoleLabel(role: InternalUserRole): string {
  const labels: Record<InternalUserRole, string> = {
    superadmin: 'Super Admin',
    system_admin: 'System Admin',
    admin_finance: 'Finance Admin',
    admin_content: 'Content Admin',
    admin_support: 'Support Admin',
    admin_fraud: 'Fraud Admin',
    admin_analytics: 'Analytics Admin',
    admin_operations: 'Operations Admin',
    hr_manager: 'HR Manager',
    hr_specialist: 'HR Specialist',
    hr_coordinator: 'HR Coordinator',
    payroll_manager: 'Payroll Manager',
    recruitment_officer: 'Recruitment Officer',
    staff: 'Staff',
  };
  return labels[role];
}

function getStatusColor(status: string): { bg: string; text: string; border: string } {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: 'rgba(34,197,94,0.12)', text: '#4ADE80', border: '#22C55E' },
    inactive: { bg: 'rgba(100,116,139,0.12)', text: '#94A3B8', border: '#64748B' },
    suspended: { bg: 'rgba(239,68,68,0.12)', text: '#EF4444', border: '#DC2626' },
  };
  return colors[status] || colors.inactive;
}

export function AdminInternalUsers() {
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([]);
  const [matrices, setMatrices] = useState<PermissionMatrixConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<InternalUserRole>('staff');
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState<CreateInternalUserInput>({
    email: '',
    fullName: '',
    role: 'staff',
    department: '',
    phone: '',
    directManager: '',
  });

  const [editForm, setEditForm] = useState<Partial<CreateInternalUserInput>>({});

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [usersResult, matricesResult] = await Promise.all([
        getInternalUsers(),
        getAllPermissionMatrices(),
      ]);

      setInternalUsers(usersResult);
      setMatrices(matricesResult);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load internal users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return internalUsers.filter((user) => {
      const matchesQuery = !normalizedQuery || [user.email, user.fullName, user.department].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesQuery;
    });
  }, [query, internalUsers]);

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.fullName || !createForm.role || !createForm.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      await createInternalUser(createForm);
      toast.success('Internal user created successfully');
      setCreateForm({
        email: '',
        fullName: '',
        role: 'staff',
        department: '',
        phone: '',
        directManager: '',
      });
      setCreateOpen(false);
      await loadData(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      await updateInternalUser(selectedUser.id, editForm);
      toast.success('User updated successfully');
      setDetailOpen(false);
      await loadData(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      if (selectedUser.status === 'active') {
        await deactivateInternalUser(selectedUser.id);
        toast.success('User deactivated');
      } else {
        await activateInternalUser(selectedUser.id);
        toast.success('User activated');
      }
      await loadData(true);
      setDetailOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user status');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !confirm('Are you sure you want to delete this user?')) return;

    try {
      setSaving(true);
      await deleteInternalUser(selectedUser.id);
      toast.success('User deleted');
      setDetailOpen(false);
      await loadData(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const openUserDetail = (user: InternalUser) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName,
      phone: user.phone,
      directManager: user.directManager,
      department: user.department,
    });
    setDetailOpen(true);
  };

  const currentMatrix = matrices.find((m) => m.roleId === selectedRole);

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(123,97,255,0.16),_transparent_36%),linear-gradient(180deg,_#0B0F1A_0%,_#0F1423_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-[28px] border border-white/8 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#C9BEFF]">
                <Shield className="h-3.5 w-3.5" /> Internal Users
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Internal staff & permissions</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#A0A7B8] sm:text-base">
                  Create and manage internal users with role-based permissions. Define inputter and authorizer access for each role.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => void loadData(true)} className="h-11 rounded-full border-white/10 bg-white/5 px-5 text-white hover:bg-white/10">
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="h-11 rounded-full bg-[#7B61FF] px-5 text-white hover:bg-[#6A4EEF]">
                <Plus className="mr-2 h-4 w-4" />
                New User
              </Button>
              <Button onClick={() => setMatrixOpen(true)} className="h-11 rounded-full bg-white/10 px-5 text-white hover:bg-white/20">
                <Shield className="mr-2 h-4 w-4" />
                Permission Matrix
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-[#0B0F1A]/80 p-4">
              <p className="text-sm text-[#A0A7B8]">Total Users</p>
              <p className="mt-3 text-2xl font-semibold text-white">{internalUsers.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0B0F1A]/80 p-4">
              <p className="text-sm text-[#A0A7B8]">Active</p>
              <p className="mt-3 text-2xl font-semibold text-[#4ADE80]">{internalUsers.filter((u) => u.status === 'active').length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0B0F1A]/80 p-4">
              <p className="text-sm text-[#A0A7B8]">Inactive</p>
              <p className="mt-3 text-2xl font-semibold text-[#94A3B8]">{internalUsers.filter((u) => u.status === 'inactive').length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0B0F1A]/80 p-4">
              <p className="text-sm text-[#A0A7B8]">Suspended</p>
              <p className="mt-3 text-2xl font-semibold text-[#EF4444]">{internalUsers.filter((u) => u.status === 'suspended').length}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-[28px] border border-white/8 bg-[#0C1017]/90 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email, name, or department..."
              className="h-11 border-white/10 bg-white/5 pl-10 text-white placeholder:text-[#667085] focus:border-[#7B61FF]/50"
            />
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-white/8 bg-white/5">
            <div className="flex items-center gap-3 text-sm text-[#A0A7B8]">
              <Loader2 className="h-5 w-5 animate-spin text-[#7B61FF]" />
              Loading internal users...
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-14 text-center">
            <User className="mx-auto h-10 w-10 text-[#C9BEFF]" />
            <h2 className="mt-4 text-xl font-semibold text-white">No internal users found</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#A0A7B8]">
              Create your first internal user to get started with role-based access management.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredUsers.map((user) => {
              const statusColor = getStatusColor(user.status);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => openUserDetail(user)}
                  className="group rounded-[24px] border border-white/8 bg-white/5 p-5 text-left transition hover:-translate-y-0.5 hover:border-[#7B61FF]/30 hover:bg-white/8"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-white/8 text-[#D1D5DB] hover:bg-white/8">{getRoleLabel(user.role)}</Badge>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                        >
                          {user.status}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white">{user.fullName}</h3>
                      <p className="mt-1 text-sm text-[#A0A7B8]">{user.email}</p>
                      <p className="mt-1 text-xs text-[#667085]">{user.department}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Shield className="h-5 w-5 text-[#C9BEFF]" />
                    </div>
                  </div>

                  {user.customPermissions && user.customPermissions.length > 0 && (
                    <div className="mt-4 border-t border-white/8 pt-3">
                      <p className="text-xs text-[#A0A7B8]">{user.customPermissions.length} custom permissions</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#0E1118] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Internal User</DialogTitle>
            <DialogDescription className="text-[#A0A7B8]">Add a new internal staff member with specific permissions</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Full Name *</Label>
                <Input
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Enter full name"
                  className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Email *</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Role *</Label>
                <select
                  title="Select user role"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as InternalUserRole }))}
                  className="h-10 rounded-xl border border-white/10 bg-[#0B0F1A] px-3 text-sm text-white outline-none"
                >
                  {INTERNAL_USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Department *</Label>
                <Input
                  value={createForm.department}
                  onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="e.g., Finance, Content"
                  className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Phone</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+234..."
                  className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Direct Manager</Label>
                <Input
                  value={createForm.directManager}
                  onChange={(e) => setCreateForm((f) => ({ ...f, directManager: e.target.value }))}
                  placeholder="Manager name"
                  className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button onClick={() => void handleCreateUser()} disabled={saving} className="bg-[#7B61FF] text-white hover:bg-[#6A4EEF]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0E1118] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedUser?.fullName}</span>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: getStatusColor(selectedUser?.status || 'inactive').bg,
                  color: getStatusColor(selectedUser?.status || 'inactive').text,
                }}
              >
                {selectedUser?.status}
              </span>
            </DialogTitle>
            <DialogDescription className="text-[#A0A7B8]">{selectedUser?.email}</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Role</p>
                  <p className="mt-2 text-sm font-semibold text-white">{getRoleLabel(selectedUser.role)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Department</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedUser.department}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Phone</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedUser.phone || 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Manager</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedUser.directManager || 'Unassigned'}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-[#D1D5DB]">Full Name</Label>
                    <Input
                      value={editForm.fullName || ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                      placeholder="Full name"
                      className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#D1D5DB]">Phone</Label>
                    <Input
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone number"
                      className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#D1D5DB]">Direct Manager</Label>
                    <Input
                      value={editForm.directManager || ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, directManager: e.target.value }))}
                      placeholder="Manager name"
                      className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                    />
                  </div>
                </div>
              </div>

              {selectedUser.customPermissions && selectedUser.customPermissions.length > 0 && (
                <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-white">Custom Permissions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedUser.customPermissions.map((perm) => (
                      <span key={perm} className="rounded-full border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-3 py-1 text-xs font-semibold text-[#C9BEFF]">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void handleToggleStatus()}
              disabled={saving}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              {selectedUser?.status === 'active' ? <Lock className="mr-2 h-4 w-4" /> : <LockOpen className="mr-2 h-4 w-4" />}
              {selectedUser?.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDeleteUser()}
              disabled={saving}
              className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDetailOpen(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Close
            </Button>
            <Button onClick={() => void handleUpdateUser()} disabled={saving} className="bg-[#7B61FF] text-white hover:bg-[#6A4EEF]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Matrix Dialog */}
      <Dialog open={matrixOpen} onOpenChange={setMatrixOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0E1118] text-white sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Permission Matrix Configuration</DialogTitle>
            <DialogDescription className="text-[#A0A7B8]">Define inputter and authorizer permissions for each role</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#D1D5DB]">Select Role</Label>
              <select
                title="Select role for permission matrix"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as InternalUserRole)}
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0B0F1A] px-3 text-sm text-white outline-none"
              >
                {INTERNAL_USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>

            {currentMatrix && (
              <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
                <div className="space-y-3">
                  {currentMatrix.permissions.map((perm) => (
                    <div key={perm.permission} className="rounded-2xl border border-white/8 bg-[#0B0F1A] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{perm.permission}</p>
                          <p className="mt-1 text-xs text-[#A0A7B8]">{perm.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-2 text-sm text-[#D1D5DB]">
                            <input type="checkbox" checked={perm.inputter} readOnly className="h-4 w-4" />
                            Inputter
                          </label>
                          <label className="flex items-center gap-2 text-sm text-[#D1D5DB]">
                            <input type="checkbox" checked={perm.authorizer} readOnly className="h-4 w-4" />
                            Authorizer
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMatrixOpen(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
