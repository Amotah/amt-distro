import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';
import {
  UserCog,
  Shield,
  Plus,
  Edit,
  Trash2,
  Crown,
  Search,
} from 'lucide-react';

export function AdminUserManagement() {
  const { hasPermission, isSuperAdmin } = useAdmin();
  const [admins, setAdmins] = useState<adminApi.AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    userId: '',
    role: 'admin_support' as adminApi.AdminUser['role'],
    department: '',
    defaultPassword: '@Pass',
  });

  const canCreate = hasPermission('admins.create');
  const canEdit = hasPermission('admins.edit');
  const canDelete = hasPermission('admins.delete');

  useEffect(() => {
    loadAdmins();
  }, []);

  async function loadAdmins() {
    try {
      setIsLoading(true);
      const data = await adminApi.getAllAdminUsers();
      setAdmins(data);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateAdmin() {
    if (!newAdminData.userId) {
      alert('User ID is required to add a new admin.');
      return;
    }
    if (!newAdminData.defaultPassword) {
      alert('Default password for admin must be @Pass.');
      return;
    }

    try {
      await adminApi.createAdminUser(newAdminData);
      setIsCreateModalOpen(false);
      setNewAdminData({ userId: '', role: 'admin_support', department: '', defaultPassword: '@Pass' });
      loadAdmins();
    } catch (error: any) {
      alert('Error creating admin: ' + error.message);
    }
  }

  async function handleDeleteAdmin(userId: string) {
    if (!confirm('Are you sure you want to remove admin privileges from this user?')) {
      return;
    }

    try {
      await adminApi.deleteAdminUser(userId);
      setAdmins(admins.filter((a) => a.userId !== userId));
    } catch (error: any) {
      alert('Error deleting admin: ' + error.message);
    }
  }

  async function handleUpdateRole(userId: string, newRole: adminApi.AdminUser['role']) {
    try {
      await adminApi.updateAdminRole(userId, newRole);
      setAdmins(admins.map((a) => (a.userId === userId ? { ...a, role: newRole } : a)));
    } catch (error: any) {
      alert('Error updating admin role: ' + error.message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Users</h1>
          <p className="text-[#A0A7B8] mt-1">Manage admin roles and permissions</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Admin
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <p className="text-sm text-[#A0A7B8]">Total Admins</p>
          <p className="text-2xl font-bold text-white mt-1">{admins.length}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-purple-600">Super Admin</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {admins.filter((a) => a.role === 'superadmin').length}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600">Finance</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {admins.filter((a) => a.role === 'admin_finance').length}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-600">Content</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {admins.filter((a) => a.role === 'admin_content').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-600">Support</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {admins.filter((a) => a.role === 'admin_support').length}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-red-600">Fraud</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {admins.filter((a) => a.role === 'admin_fraud').length}
          </p>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0B0F1A] border-b border-[#7B61FF]/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  Last Active
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#A0A7B8] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7B61FF]/10">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-[#0B0F1A]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {admin.role === 'superadmin' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      <p className="text-sm font-mono text-[#A0A7B8]">{admin.userId.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {canEdit && isSuperAdmin ? (
                      <select
                        value={admin.role}
                        onChange={(e) => handleUpdateRole(admin.userId, e.target.value as any)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border-0 ${
                          admin.role === 'superadmin'
                            ? 'bg-[#7B61FF]/20 text-[#7B61FF]'
                            : admin.role === 'admin_finance'
                            ? 'bg-[#00E5FF]/20 text-[#00E5FF]'
                            : admin.role === 'admin_content'
                            ? 'bg-green-100 text-green-700'
                            : admin.role === 'admin_support'
                            ? 'bg-yellow-100 text-yellow-700'
                            : admin.role === 'admin_fraud'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-white/10 text-[#A0A7B8]'
                        }`}
                      >
                        <option value="superadmin">Super Admin</option>
                        <option value="admin_finance">Finance Admin</option>
                        <option value="admin_content">Content Admin</option>
                        <option value="admin_support">Support Admin</option>
                        <option value="admin_fraud">Fraud Admin</option>
                        <option value="admin_analytics">Analytics Admin</option>
                      </select>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          admin.role === 'superadmin'
                            ? 'bg-[#7B61FF]/20 text-[#7B61FF]'
                            : admin.role === 'admin_finance'
                            ? 'bg-[#00E5FF]/20 text-[#00E5FF]'
                            : admin.role === 'admin_content'
                            ? 'bg-green-100 text-green-700'
                            : admin.role === 'admin_support'
                            ? 'bg-yellow-100 text-yellow-700'
                            : admin.role === 'admin_fraud'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-white/10 text-[#A0A7B8]'
                        }`}
                      >
                        {admin.role.replace('admin_', '')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#A0A7B8]">
                    {admin.department || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#A0A7B8]">
                    {admin.permissions.length} permissions
                  </td>
                  <td className="px-6 py-4 text-sm text-[#A0A7B8]">
                    {admin.lastActiveAt
                      ? new Date(admin.lastActiveAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canDelete && admin.role !== 'superadmin' && (
                      <button
                        onClick={() => handleDeleteAdmin(admin.userId)}
                        className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition"
                        title="Remove admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {admins.length === 0 && (
          <div className="text-center py-12">
            <UserCog className="w-12 h-12 text-[#A0A7B8] mx-auto mb-3" />
            <p className="text-[#A0A7B8]">No admin users found</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Add New Admin</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  User ID
                </label>
                <input
                  type="text"
                  value={newAdminData.userId}
                  onChange={(e) => setNewAdminData({ ...newAdminData, userId: e.target.value })}
                  placeholder="Enter existing user ID"
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-white"
                />
                <p className="text-xs text-[#A0A7B8] mt-1">
                  Must be an existing user on the platform
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Admin Role
                </label>
                <select
                  value={newAdminData.role}
                  onChange={(e) =>
                    setNewAdminData({ ...newAdminData, role: e.target.value as any })
                  }
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-white"
                >
                  <option value="admin_support">Support Admin</option>
                  <option value="admin_content">Content Admin</option>
                  <option value="admin_finance">Finance Admin</option>
                  <option value="admin_fraud">Fraud Admin</option>
                  <option value="admin_analytics">Analytics Admin</option>
                  {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  value={newAdminData.department}
                  onChange={(e) =>
                    setNewAdminData({ ...newAdminData, department: e.target.value })
                  }
                  placeholder="e.g., Customer Support"
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Default Password
                </label>
                <input
                  type="password"
                  value={newAdminData.defaultPassword}
                  onChange={(e) =>
                    setNewAdminData({ ...newAdminData, defaultPassword: e.target.value })
                  }
                  placeholder="@Pass"
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-white"
                />
                <p className="text-xs text-[#A0A7B8] mt-1">
                  Default required for new Admins: <strong>@Pass</strong>. This is mandatory if password is empty.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateAdmin}
                disabled={!newAdminData.userId}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Create Admin
              </button>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewAdminData({ userId: '', role: 'admin_support', department: '' });
                }}
                className="flex-1 bg-white/10 text-[#A0A7B8] py-2 px-4 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
