import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, RefreshCw, Search, Shield, Trash2, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  createAdminUser,
  deleteAdminUser,
  getAllAdminUsers,
  getAllUsers,
  updateAdminRole,
  type AdminUser,
  type User as PlatformUser,
} from '../../utils/admin-api';

type AdminRole = AdminUser['role'];

const ADMIN_ROLES: AdminRole[] = [
  'superadmin',
  'admin_finance',
  'admin_content',
  'admin_support',
  'admin_fraud',
  'admin_analytics',
];

function getRoleLabel(role: AdminRole): string {
  const labels: Record<AdminRole, string> = {
    superadmin: 'Super Admin',
    admin_finance: 'Finance Admin',
    admin_content: 'Content Admin',
    admin_support: 'Support Admin',
    admin_fraud: 'Fraud Admin',
    admin_analytics: 'Analytics Admin',
  };
  return labels[role];
}

function getUserDisplayName(user?: PlatformUser): string {
  if (!user) return 'Unknown user';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (fullName) return fullName;
  if (user.artistName) return user.artistName;
  if (user.labelName) return user.labelName;
  return user.email;
}

export function AdminInternalUsers() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [createForm, setCreateForm] = useState<{
    userId: string;
    role: AdminRole;
    department: string;
  }>({
    userId: '',
    role: 'admin_support',
    department: '',
  });

  const [detailRole, setDetailRole] = useState<AdminRole>('admin_support');

  const usersById = useMemo(() => {
    const map = new Map<string, PlatformUser>();
    for (const user of platformUsers) {
      map.set(user.userId, user);
    }
    return map;
  }, [platformUsers]);

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [admins, users] = await Promise.all([getAllAdminUsers(), getAllUsers()]);
      setAdminUsers(admins);
      setPlatformUsers(users);
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

  const filteredAdminUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return adminUsers.filter((admin) => {
      const profile = usersById.get(admin.userId);
      const haystack = [
        admin.userId,
        admin.department || '',
        admin.role,
        profile?.email || '',
        getUserDisplayName(profile),
      ]
        .join(' ')
        .toLowerCase();

      return !q || haystack.includes(q);
    });
  }, [adminUsers, query, usersById]);

  const nonAdminCandidates = useMemo(() => {
    const currentAdmins = new Set(adminUsers.map((admin) => admin.userId));
    return platformUsers
      .filter((user) => !currentAdmins.has(user.userId))
      .slice(0, 200);
  }, [adminUsers, platformUsers]);

  const openDetail = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setDetailRole(admin.role);
    setDetailOpen(true);
  };

  const handleCreateAdmin = async () => {
    if (!createForm.userId.trim() || !createForm.role) {
      toast.error('User ID and role are required');
      return;
    }

    try {
      setSaving(true);
      await createAdminUser({
        userId: createForm.userId.trim(),
        role: createForm.role,
        department: createForm.department.trim() || undefined,
      });

      toast.success('Internal admin user created');
      setCreateForm({ userId: '', role: 'admin_support', department: '' });
      setCreateOpen(false);
      await loadData(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create admin user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedAdmin) return;

    try {
      setSaving(true);
      await updateAdminRole(selectedAdmin.userId, detailRole);
      toast.success('Admin role updated');
      await loadData(true);
      setDetailOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update admin role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAdmin || !confirm('Delete this internal admin user?')) return;

    try {
      setSaving(true);
      await deleteAdminUser(selectedAdmin.userId);
      toast.success('Internal admin user deleted');
      await loadData(true);
      setDetailOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete admin user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(123,97,255,0.16),_transparent_36%),linear-gradient(180deg,_#0B0F1A_0%,_#0F1423_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-white/8 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#C9BEFF]">
                <Shield className="h-3.5 w-3.5" /> Internal Users
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Internal admin users</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#A0A7B8] sm:text-base">
                  Live data from the backend admin user service. Manage admin roles and access for real platform users.
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
                New Internal User
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-[#0B0F1A]/80 p-4">
              <p className="text-sm text-[#A0A7B8]">Total Admin Users</p>
              <p className="mt-3 text-2xl font-semibold text-white">{adminUsers.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0B0F1A]/80 p-4">
              <p className="text-sm text-[#A0A7B8]">Super Admins</p>
              <p className="mt-3 text-2xl font-semibold text-[#4ADE80]">{adminUsers.filter((user) => user.role === 'superadmin').length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0B0F1A]/80 p-4">
              <p className="text-sm text-[#A0A7B8]">Departments Set</p>
              <p className="mt-3 text-2xl font-semibold text-[#C9BEFF]">{adminUsers.filter((user) => Boolean(user.department)).length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-[#0C1017]/90 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by user ID, email, name, role, or department..."
              className="h-11 border-white/10 bg-white/5 pl-10 text-white placeholder:text-[#667085] focus:border-[#7B61FF]/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-white/8 bg-white/5">
            <div className="flex items-center gap-3 text-sm text-[#A0A7B8]">
              <Loader2 className="h-5 w-5 animate-spin text-[#7B61FF]" />
              Loading internal users...
            </div>
          </div>
        ) : filteredAdminUsers.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-14 text-center">
            <User className="mx-auto h-10 w-10 text-[#C9BEFF]" />
            <h2 className="mt-4 text-xl font-semibold text-white">No internal users found</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#A0A7B8]">
              Add your first internal admin user to grant platform administration access.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredAdminUsers.map((admin) => {
              const profile = usersById.get(admin.userId);
              return (
                <button
                  key={admin.id}
                  type="button"
                  onClick={() => openDetail(admin)}
                  className="group rounded-[24px] border border-white/8 bg-white/5 p-5 text-left transition hover:-translate-y-0.5 hover:border-[#7B61FF]/30 hover:bg-white/8"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-white/8 text-[#D1D5DB] hover:bg-white/8">{getRoleLabel(admin.role)}</Badge>
                        <span className="rounded-full border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-2.5 py-1 text-xs font-semibold text-[#C9BEFF]">
                          {admin.permissions.length} permissions
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white">{getUserDisplayName(profile)}</h3>
                      <p className="mt-1 text-sm text-[#A0A7B8]">{profile?.email || admin.userId}</p>
                      <p className="mt-1 text-xs text-[#667085]">{admin.department || 'No department set'}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Shield className="h-5 w-5 text-[#C9BEFF]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#0E1118] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Internal Admin User</DialogTitle>
            <DialogDescription className="text-[#A0A7B8]">
              Use an existing platform user ID and assign an admin role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#D1D5DB]">User ID *</Label>
              <Input
                list="internal-user-candidates"
                value={createForm.userId}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, userId: e.target.value }))}
                placeholder="Paste or select a user ID"
                className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
              />
              <datalist id="internal-user-candidates">
                {nonAdminCandidates.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {`${getUserDisplayName(user)} (${user.email})`}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Role *</Label>
                <select
                  title="Select admin role"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value as AdminRole }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0B0F1A] px-3 text-sm text-white outline-none"
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Department</Label>
                <Input
                  value={createForm.department}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g., Finance"
                  className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button onClick={() => void handleCreateAdmin()} disabled={saving} className="bg-[#7B61FF] text-white hover:bg-[#6A4EEF]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="border-white/10 bg-[#0E1118] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Internal User Details</DialogTitle>
            <DialogDescription className="text-[#A0A7B8]">
              {selectedAdmin ? `${usersById.get(selectedAdmin.userId)?.email || selectedAdmin.userId}` : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedAdmin && (
            <div className="space-y-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">User ID</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{selectedAdmin.userId}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Department</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedAdmin.department || 'Not set'}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Created</p>
                  <p className="mt-2 text-sm font-semibold text-white">{new Date(selectedAdmin.createdAt).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Last Active</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedAdmin.lastActiveAt ? new Date(selectedAdmin.lastActiveAt).toLocaleString() : 'Never'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Role</Label>
                <select
                  title="Update admin role"
                  value={detailRole}
                  onChange={(e) => setDetailRole(e.target.value as AdminRole)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0B0F1A] px-3 text-sm text-white outline-none"
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">Effective Permissions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAdmin.permissions.map((perm) => (
                    <span key={perm} className="rounded-full border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-3 py-1 text-xs font-semibold text-[#C9BEFF]">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void handleDelete()}
              disabled={saving}
              className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDetailOpen(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
            <Button onClick={() => void handleUpdateRole()} disabled={saving} className="bg-[#7B61FF] text-white hover:bg-[#6A4EEF]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
