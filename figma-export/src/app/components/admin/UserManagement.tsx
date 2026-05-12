import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';
import { syncStoredCurrentUserProfile } from '../../utils/user-api';
import {
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  User,
  Eye,
  Crown,
  ArrowUpCircle,
  Ban,
  UserCheck,
  Plus,
  X,
  Music,
  Play,
  DollarSign,
  AlertTriangle,
  BadgeCheck,
  Clock3,
  Circle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { getArtistVerificationBadge, getArtistVerificationState } from '../../utils/artist-verification';

// Countries and States data
const COUNTRIES = [
  'Nigeria',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Ireland',
  'Portugal',
  'Greece',
  'Poland',
  'Czech Republic',
  'Hungary',
  'Slovakia',
  'Slovenia',
  'Croatia',
  'Bosnia and Herzegovina',
  'Serbia',
  'Montenegro',
  'Kosovo',
  'Albania',
  'North Macedonia',
  'Bulgaria',
  'Romania',
  'Moldova',
  'Ukraine',
  'Belarus',
  'Russia',
  'Estonia',
  'Latvia',
  'Lithuania',
  'South Africa',
  'Kenya',
  'Ghana',
  'Egypt',
  'Morocco',
  'Tunisia',
  'Algeria',
  'Libya',
  'Sudan',
  'Ethiopia',
  'Tanzania',
  'Uganda',
  'Rwanda',
  'Burundi',
  'Zimbabwe',
  'Zambia',
  'Malawi',
  'Mozambique',
  'Botswana',
  'Namibia',
  'Angola',
  'Democratic Republic of the Congo',
  'Republic of the Congo',
  'Gabon',
  'Cameroon',
  'Central African Republic',
  'Chad',
  'Niger',
  'Mali',
  'Burkina Faso',
  'Senegal',
  'Gambia',
  'Guinea',
  'Sierra Leone',
  'Liberia',
  'Côte d\'Ivoire',
  'Togo',
  'Benin',
  'Brazil',
  'Mexico',
  'Argentina',
  'Chile',
  'Colombia',
  'Peru',
  'Venezuela',
  'Ecuador',
  'Bolivia',
  'Paraguay',
  'Uruguay',
  'India',
  'China',
  'Japan',
  'South Korea',
  'Singapore',
  'Malaysia',
  'Thailand',
  'Indonesia',
  'Philippines',
  'Vietnam',
  'Myanmar',
  'Cambodia',
  'Laos',
  'Brunei',
  'East Timor',
  'Papua New Guinea',
  'New Zealand',
  'Fiji',
  'Samoa',
  'Tonga',
  'Vanuatu',
  'Solomon Islands',
  'Kiribati',
  'Tuvalu',
  'Nauru',
  'Marshall Islands',
  'Micronesia',
  'Palau',
  'Other'
];

const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT (Abuja)',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara'
];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const getStatesForCountry = (country: string): string[] => {
  switch (country) {
    case 'Nigeria':
      return NIGERIAN_STATES;
    case 'United States':
      return US_STATES;
    default:
      return [];
  }
};

function renderVerificationStatusIcon(status: 'verified' | 'pending' | 'unverified') {
  if (status === 'verified') {
    return <BadgeCheck className="w-4 h-4 text-[#2F80FF]" />;
  }

  if (status === 'pending') {
    return <Clock3 className="w-4 h-4 text-[#D97706]" />;
  }

  return <Circle className="w-4 h-4 text-[#6B7280]" />;
}

export function UserManagement() {
  const { hasPermission } = useAdmin();
  const [users, setUsers] = useState<adminApi.User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<adminApi.User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<adminApi.User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSuspendConfirmOpen, setIsSuspendConfirmOpen] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [createdUserEmail, setCreatedUserEmail] = useState<string | null>(null);
  const [createdUserDefaultPassword, setCreatedUserDefaultPassword] = useState<string | null>(null);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    artistName: '',
    email: '',
    password: '',
    defaultPassword: 'Password@1',
    role: 'artist' as 'artist' | 'partner',
    plan: 'artist' as 'artist' | 'super_artist' | 'partner',
    country: '',
    state: '',
  });

  const canView = hasPermission('users.view');
  const canEdit = hasPermission('users.edit');
  const canDelete = hasPermission('users.delete');
  const canCreate = hasPermission('users.create');
  const pendingVerificationArtists = users.filter((user) => user.role === 'artist' && getArtistVerificationState(user).status === 'pending');
  const pendingVerificationCount = pendingVerificationArtists.length;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, planFilter, statusFilter, verificationFilter]);

  async function loadUsers() {
    try {
      setIsLoading(true);
      const data = await adminApi.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function filterUsers() {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.artistName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.labelName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter((user) => user.subscriptionTier === planFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => user.isVerified === (statusFilter === 'active'));
    }

    if (verificationFilter !== 'all') {
      filtered = filtered.filter((user) => {
        if (user.role !== 'artist') {
          return false;
        }

        return getArtistVerificationState(user).status === verificationFilter;
      });
    }

    setFilteredUsers(filtered);
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      setUsers((current) => current.filter((u) => u.id !== userId));
    } catch (error: any) {
      alert('Error deleting user: ' + error.message);
    }
  }

  async function handleUpdateUser(updates: Partial<adminApi.User>) {
    if (!selectedUser) return;

    try {
      const updatePayload = {
        ...updates,
        ...(defaultPassword && { defaultPassword }),
      };
      const updatedUser = await adminApi.updateUser(selectedUser.id, updatePayload);
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

      const currentSessionUserId = sessionStorage.getItem('user_id');
      const updatedSessionUserId = updatedUser.userId || updatedUser.id;

      if (currentSessionUserId && currentSessionUserId === updatedSessionUserId) {
        syncStoredCurrentUserProfile(updatedUser);

        if (window.location.pathname.startsWith('/admin') && updatedUser.role !== 'admin') {
          const nextDashboardPath = updatedUser.role === 'partner' || updatedUser.subscriptionTier === 'partner'
            ? '/label-dashboard'
            : '/dashboard';
          window.history.replaceState({}, '', nextDashboardPath);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }

      setIsEditModalOpen(false);
      setSelectedUser(null);
      setDefaultPassword('');
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
    } catch (error: any) {
      alert('Error updating user: ' + error.message);
    }
  }

  async function handleApproveArtistVerification(user: adminApi.User) {
    if (user.role !== 'artist') {
      return;
    }

    try {
      const verification = getArtistVerificationState(user).verification;
      const updatedUser = await adminApi.updateUser(user.id, {
        verification: {
          ...verification,
          emailConfirmed: true,
          profileReviewed: true,
          reviewedAt: new Date().toISOString(),
          reviewNotes: user.verification?.reviewNotes || 'Approved from admin review queue.',
        },
      });

      setUsers((current) => current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)));

      if (selectedUser?.id === updatedUser.id) {
        setSelectedUser(updatedUser);
      }

      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
    } catch (error: any) {
      alert('Error approving verification: ' + error.message);
    }
  }

  async function handleRequestArtistVerificationChanges(user: adminApi.User) {
    if (user.role !== 'artist') {
      return;
    }

    const reason = window.prompt('Add a note for the artist about what needs to change before approval:', user.verification?.reviewNotes || 'Please complete the missing verification requirements.');
    if (reason === null) {
      return;
    }

    try {
      const verification = getArtistVerificationState(user).verification;
      const updatedUser = await adminApi.updateUser(user.id, {
        verificationStatus: 'pending',
        verification: {
          ...verification,
          profileReviewed: false,
          reviewedAt: new Date().toISOString(),
          reviewNotes: reason.trim() || 'Changes requested by admin reviewer.',
        },
      });

      setUsers((current) => current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)));

      if (selectedUser?.id === updatedUser.id) {
        setSelectedUser(updatedUser);
      }

      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
    } catch (error: any) {
      alert('Error requesting verification changes: ' + error.message);
    }
  }

  async function handleRejectArtistVerification(user: adminApi.User) {
    if (user.role !== 'artist') {
      return;
    }

    const reason = window.prompt('Enter the rejection reason for this verification request:', user.verification?.reviewNotes || 'Verification was rejected by admin review.');
    if (reason === null) {
      return;
    }

    try {
      const verification = getArtistVerificationState(user).verification;
      const updatedUser = await adminApi.updateUser(user.id, {
        verificationStatus: 'unverified',
        verification: {
          ...verification,
          idVerified: false,
          profileReviewed: false,
          reviewedAt: new Date().toISOString(),
          reviewNotes: reason.trim() || 'Verification rejected by admin reviewer.',
        },
      });

      setUsers((current) => current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)));

      if (selectedUser?.id === updatedUser.id) {
        setSelectedUser(updatedUser);
      }

      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
    } catch (error: any) {
      alert('Error rejecting verification: ' + error.message);
    }
  }

  async function handleCreateUser() {
    // Validate inputs
    const passwordToUse = newUser.password.trim() || newUser.defaultPassword.trim() || 'Password@1';
    const trimmedFirstName = newUser.firstName.trim();
    const trimmedLastName = newUser.lastName.trim();
    const trimmedArtistName = newUser.artistName.trim();
    const trimmedEmail = newUser.email.trim();
    const derivedLabelName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ').trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !newUser.country) {
      alert('Please fill in all required fields (first name, last name, email, country)');
      return;
    }

    if (newUser.role === 'artist' && !trimmedArtistName) {
      alert('Artist name is required for artist accounts.');
      return;
    }

    if (!newUser.password && !newUser.defaultPassword) {
      alert('Default password is required for new users (Password@1).');
      return;
    }

    try {
      const createdUserResult = await adminApi.createUser({
        email: trimmedEmail,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        artistName: newUser.role === 'artist' ? trimmedArtistName : undefined,
        labelName: newUser.role === 'label' ? derivedLabelName : undefined,
        role: newUser.role,
        subscriptionTier: newUser.role === 'label' ? 'partner' : newUser.plan,
        country: newUser.country,
        state: newUser.state,
        password: passwordToUse,
        defaultPassword: passwordToUse,
      });

      const createdUser = createdUserResult.user;

      setUsers((current) => [...current, createdUser]);
      setIsAddUserModalOpen(false);
      setCreatedUserEmail(createdUser.email);
      setCreatedUserDefaultPassword(passwordToUse);
      setNewUser({
        firstName: '',
        lastName: '',
        artistName: '',
        email: '',
        password: '',
        defaultPassword: 'Password@1',
        role: 'artist',
        plan: 'free',
        country: '',
        state: '',
      });
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        (typeof error === 'string' ? error : null) ||
        JSON.stringify(error || {}, null, 2) ||
        'Unknown error';
      console.error('User create error (top-level):', error);
      alert('Error creating user: ' + errorMessage);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-[#A0A7B8] mt-1">Manage all platform users and their accounts</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {pendingVerificationCount > 0 ? (
            <button
              onClick={() => {
                setRoleFilter('artist');
                setVerificationFilter('pending');
                setStatusFilter('all');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition"
            >
              <Clock3 className="w-5 h-5" />
              Review Pending Artists ({pendingVerificationCount})
            </button>
          ) : null}

          {canCreate && (
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add New User
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <p className="text-sm text-[#A0A7B8]">Total Users</p>
          <p className="text-2xl font-bold text-white mt-1">{users.length}</p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <p className="text-sm text-[#A0A7B8]">Active Accounts</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {users.filter((u) => u.isVerified).length}
          </p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <p className="text-sm text-[#A0A7B8]">Artists</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {users.filter((u) => u.role === 'artist').length}
          </p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <p className="text-sm text-[#A0A7B8]">Labels</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {users.filter((u) => u.role === 'label').length}
          </p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <p className="text-sm text-[#A0A7B8]">Pending Verification</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {pendingVerificationCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A0A7B8]" />
            <input
              type="text"
              title="Search users"
              placeholder="Search by username, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
            />
          </div>

          {/* Role Filter */}
          <select
            title="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
          >
            <option value="all">All Roles</option>
            <option value="artist">Artist</option>
            <option value="partner">Partner (Label)</option>
            <option value="admin">Admin</option>
          </select>

          {/* Plan Filter */}
          <select
            title="Filter by plan"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
          >
            <option value="all">All Plans</option>
            <option value="artist">Artist (₦15k/release)</option>
            <option value="super_artist">Super Artist (₦25k/release)</option>
            <option value="partner">Partner (₦40k/month)</option>
          </select>

          {/* Status Filter */}
          <select
            title="Filter by account status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
          >
            <option value="all">All Account Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            title="Filter by artist verification"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
          >
            <option value="all">All Verification</option>
            <option value="verified">Verified Artists</option>
            <option value="pending">Pending Review</option>
            <option value="unverified">Unverified Artists</option>
          </select>
        </div>
      </div>

      {pendingVerificationCount > 0 ? (
        <div className="bg-[#121826] rounded-xl border border-amber-500/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Pending Verification Queue</h2>
              <p className="mt-1 text-sm text-[#A0A7B8]">
                Review the next artists waiting for email confirmation, optional ID review, or profile approval.
              </p>
            </div>
            <button
              onClick={() => {
                setRoleFilter('artist');
                setVerificationFilter('pending');
                setStatusFilter('all');
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200"
            >
              <Filter className="w-4 h-4" />
              Open Full Queue
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {pendingVerificationArtists.slice(0, 4).map((user) => {
              const verification = getArtistVerificationState(user);
              const badge = getArtistVerificationBadge(verification.status);

              return (
                <div key={user.id} className="flex flex-col gap-3 rounded-xl border border-[#7B61FF]/20 bg-[#0B0F1A] p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{user.artistName || user.email}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
                        {renderVerificationStatusIcon(verification.status)}
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#A0A7B8]">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#A0A7B8]">
                      <span>Email: {verification.verification.emailConfirmed ? 'done' : 'pending'}</span>
                      <span>ID: {verification.verification.idVerified ? 'done' : verification.verification.idVerificationOptional ? 'optional' : 'required'}</span>
                      <span>Profile review: {verification.verification.profileReviewed ? 'done' : 'pending'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setIsViewModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2 text-sm font-medium text-[#A0A7B8] transition hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleApproveArtistVerification(user)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      <BadgeCheck className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRequestArtistVerificationChanges(user)}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Request Changes
                    </button>
                    <button
                      onClick={() => handleRejectArtistVerification(user)}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Users Table */}
      <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0B0F1A] border-b border-[#7B61FF]/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                  Account / Verification
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7B61FF]/10">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">
                      {user.username || 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {user.artistName || user.labelName || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-[#A0A7B8]">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'artist' 
                        ? 'bg-[#7B61FF]/20 text-[#7B61FF]'
                        : user.role === 'partner'
                        ? 'bg-[#00E5FF]/20 text-[#00E5FF]'
                        : 'bg-gray-500/20 text-[#A0A7B8]'
                    }`}>
                      {user.role === 'artist' ? 'Artist' : user.role === 'partner' ? 'Partner' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                        user.subscriptionTier === 'partner'
                          ? 'bg-[#7B61FF]/20 text-[#7B61FF]'
                          : user.subscriptionTier === 'super_artist'
                          ? 'bg-purple-500/20 text-purple-300'
                          : user.subscriptionTier === 'artist'
                          ? 'bg-[#00E5FF]/20 text-[#00E5FF]'
                          : 'bg-gray-500/20 text-[#A0A7B8]'
                      }`}
                    >
                      {user.subscriptionTier === 'partner' && <Crown className="w-3 h-3" />}
                      {user.subscriptionTier === 'partner' ? 'Partner' : user.subscriptionTier === 'super_artist' ? 'Super Artist' : user.subscriptionTier === 'artist' ? 'Artist' : 'No Plan'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isVerified ? (
                      <span className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Active</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-yellow-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Suspended</span>
                      </span>
                    )}
                    {user.role === 'artist' ? (
                      <div className="mt-2">
                        {(() => {
                          const verification = getArtistVerificationState(user);
                          const badge = getArtistVerificationBadge(verification.status);
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
                              {renderVerificationStatusIcon(verification.status)}
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsViewModalOpen(true);
                        }}
                        className="p-2 text-[#A0A7B8] hover:bg-white/10 rounded-lg transition"
                        title="View user"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setDefaultPassword('');
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-[#7B61FF]/10 rounded-lg transition"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsUpgradeModalOpen(true);
                        }}
                        className="p-2 text-purple-600 hover:bg-[#7B61FF]/10 rounded-lg transition"
                        title="Upgrade user"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-[#A0A7B8] mx-auto mb-3" />
            <p className="text-[#A0A7B8]">No users found</p>
          </div>
        )}
      </div>

      {/* Table Summary */}
      <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Table Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-[#A0A7B8]">Total Users:</span>
            <span className="ml-2 text-white">{filteredUsers.length}</span>
          </div>
          <div>
            <span className="font-medium text-[#A0A7B8]">Active Users:</span>
            <span className="ml-2 text-green-600">{filteredUsers.filter(u => u.isVerified).length}</span>
          </div>
          <div>
            <span className="font-medium text-[#A0A7B8]">Suspended Users:</span>
            <span className="ml-2 text-red-600">{filteredUsers.filter(u => !u.isVerified).length}</span>
          </div>
          <div>
            <span className="font-medium text-[#A0A7B8]">Artists:</span>
            <span className="ml-2 text-purple-600">{filteredUsers.filter(u => u.role === 'artist').length}</span>
          </div>
          <div>
            <span className="font-medium text-[#A0A7B8]">Pending Verification:</span>
            <span className="ml-2 text-amber-600">{filteredUsers.filter((u) => u.role === 'artist' && getArtistVerificationState(u).status === 'pending').length}</span>
          </div>
          <div>
            <span className="font-medium text-[#A0A7B8]">Labels:</span>
            <span className="ml-2 text-blue-600">{filteredUsers.filter(u => u.role === 'label').length}</span>
          </div>
          <div>
            <span className="font-medium text-[#A0A7B8]">Admins:</span>
            <span className="ml-2 text-[#A0A7B8]">{filteredUsers.filter(u => u.role === 'admin').length}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#7B61FF]/10">
          <p className="text-xs text-[#A0A7B8]">
            <strong>Note:</strong> Usernames can be edited by administrators only. The table shows current filtered results.
            Use the search bar to find users by username, full name, or email address.
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Edit User</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={selectedUser.username || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  placeholder="Enter username"
                />
                <p className="text-xs text-[#A0A7B8] mt-1">
                  Username can be changed by admin only
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={selectedUser.role === 'artist' ? (selectedUser.artistName || '') : (selectedUser.labelName || '')}
                  onChange={(e) => {
                    if (selectedUser.role === 'artist') {
                      setSelectedUser({ ...selectedUser, artistName: e.target.value });
                    } else {
                      setSelectedUser({ ...selectedUser, labelName: e.target.value });
                    }
                  }}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  placeholder="Enter user name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Country
                </label>
                <select
                  title="Edit country"
                  value={selectedUser.country || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, country: e.target.value, state: '' })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  State
                </label>
                <select
                  title="Edit state"
                  value={selectedUser.state || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, state: e.target.value })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  disabled={!selectedUser.country || getStatesForCountry(selectedUser.country).length === 0}
                >
                  <option value="">
                    {selectedUser.country ? 'Select State' : 'Select Country First'}
                  </option>
                  {selectedUser.country && getStatesForCountry(selectedUser.country).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Role
                </label>
                <select
                  title="Edit role"
                  value={selectedUser.role}
                  onChange={(e) => {
                    const newRole = e.target.value as 'artist' | 'partner' | 'admin';
                    // Auto-sync subscriptionTier when role changes so they never mismatch
                    const newTier: 'artist' | 'super_artist' | 'partner' =
                      newRole === 'partner' ? 'partner'
                      : newRole === 'admin' ? 'artist'
                      : (selectedUser.subscriptionTier === 'partner' ? 'artist' : selectedUser.subscriptionTier);
                    setSelectedUser({ ...selectedUser, role: newRole, subscriptionTier: newTier });
                  }}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                >
                  <option value="artist">Artist</option>
                  <option value="partner">Partner (Label)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {selectedUser.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                    Plan
                  </label>
                  <select
                    title="Edit plan"
                    value={selectedUser.subscriptionTier}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        subscriptionTier: e.target.value as 'artist' | 'super_artist' | 'partner',
                      })
                    }
                    className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  >
                    {selectedUser.role === 'artist' && (
                      <>
                        <option value="artist">Artist (₦15,000/release)</option>
                        <option value="super_artist">Super Artist (₦25,000/release)</option>
                      </>
                    )}
                    {selectedUser.role === 'partner' && (
                      <option value="partner">Partner (₦40,000/month)</option>
                    )}
                    {/* Fallback: if tier doesn't match the role yet, show it as selectable so admin can correct it */}
                    {!['artist','super_artist'].includes(selectedUser.subscriptionTier) && selectedUser.role === 'artist' && (
                      <option value={selectedUser.subscriptionTier} disabled>Current: {selectedUser.subscriptionTier} (select a plan above)</option>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Status
                </label>
                <select
                  title="Edit account status"
                  value={selectedUser.isVerified ? 'active' : 'suspended'}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, isVerified: e.target.value === 'active' })
                  }
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Default Password
                </label>
                <input
                  type="text"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  placeholder="Leave empty to keep current password"
                />
                <p className="text-xs text-[#A0A7B8] mt-1">Optional: Set a new default password. Leave empty to keep the current one.</p>
              </div>

              {selectedUser.role === 'artist' ? (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Artist Verification Review
                  </div>

                  {(() => {
                    const verification = getArtistVerificationState(selectedUser);
                    const badge = getArtistVerificationBadge(verification.status);

                    return (
                      <>
                        <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-100 bg-[#0F1525] px-3 py-2">
                          <span className="text-sm text-[#A0A7B8]">Current verification status</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
                            {renderVerificationStatusIcon(verification.status)}
                            {badge.label}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm text-[#A0A7B8]">
                            <input
                              type="checkbox"
                              checked={verification.verification.emailConfirmed}
                              onChange={(e) => setSelectedUser({
                                ...selectedUser,
                                verification: {
                                  ...verification.verification,
                                  emailConfirmed: e.target.checked,
                                },
                              })}
                            />
                            Email confirmed
                          </label>
                          <label className="flex items-center gap-2 text-sm text-[#A0A7B8]">
                            <input
                              type="checkbox"
                              checked={verification.verification.idVerificationOptional}
                              onChange={(e) => setSelectedUser({
                                ...selectedUser,
                                verification: {
                                  ...verification.verification,
                                  idVerificationOptional: e.target.checked,
                                },
                              })}
                            />
                            ID verification optional
                          </label>
                          <label className="flex items-center gap-2 text-sm text-[#A0A7B8]">
                            <input
                              type="checkbox"
                              checked={verification.verification.idVerified}
                              onChange={(e) => setSelectedUser({
                                ...selectedUser,
                                verification: {
                                  ...verification.verification,
                                  idVerified: e.target.checked,
                                },
                              })}
                            />
                            ID verified
                          </label>
                          <label className="flex items-center gap-2 text-sm text-[#A0A7B8]">
                            <input
                              type="checkbox"
                              checked={verification.verification.profileReviewed}
                              onChange={(e) => setSelectedUser({
                                ...selectedUser,
                                verification: {
                                  ...verification.verification,
                                  profileReviewed: e.target.checked,
                                },
                              })}
                            />
                            Profile reviewed
                          </label>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                            Review Notes
                          </label>
                          <textarea
                            value={selectedUser.verification?.reviewNotes || ''}
                            onChange={(e) => setSelectedUser({
                              ...selectedUser,
                              verification: {
                                ...verification.verification,
                                reviewNotes: e.target.value,
                              },
                            })}
                            className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                            rows={3}
                            placeholder="Add internal notes about the verification review"
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  handleUpdateUser(selectedUser);
                  setDefaultPassword('');
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-100 text-[#A0A7B8] py-2 px-4 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal - User Profile */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">User Profile</h2>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedUser(null);
                }}
                aria-label="Close user profile"
                title="Close user profile"
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-[#A0A7B8]" />
              </button>
            </div>
            
            {/* User Info Section */}
            <div className="mb-6 rounded-xl border border-[#7B61FF]/20 bg-[#0B0F1A] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#7B61FF]/20 bg-gradient-to-br from-[#FF6B00] to-[#7B61FF]">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedUser.artistName || selectedUser.labelName || 'Unknown'}
                  </h3>
                  <p className="text-sm text-[#A0A7B8]">{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#A0A7B8]">Role</p>
                  <p className="font-semibold text-white capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-sm text-[#A0A7B8]">Plan</p>
                  <p className="font-semibold text-white">
                    {selectedUser.subscriptionTier === 'free' ? 'Free' : selectedUser.subscriptionTier === 'artist' ? 'Artist' : selectedUser.subscriptionTier === 'super_artist' ? 'Super Artist' : 'Partner'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#A0A7B8]">Status</p>
                  <p className={`font-semibold ${selectedUser.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedUser.isVerified ? 'Active' : 'Suspended'}
                  </p>
                </div>
                {selectedUser.role === 'artist' ? (
                  <div>
                    <p className="text-sm text-[#A0A7B8]">Verification</p>
                    {(() => {
                      const verification = getArtistVerificationState(selectedUser);
                      const badge = getArtistVerificationBadge(verification.status);
                      return (
                        <p className={`inline-flex items-center gap-1.5 rounded-full border border-[#7B61FF]/20 px-3 py-1 text-xs font-medium ${badge.className}`}>
                          {renderVerificationStatusIcon(verification.status)}
                          {badge.label}
                        </p>
                      );
                    })()}
                  </div>
                ) : null}
                <div>
                  <p className="text-sm text-[#A0A7B8]">Joined</p>
                  <p className="font-semibold text-white">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {selectedUser.role === 'artist' ? (
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="bg-[#121826] border border-[#7B61FF]/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedUser.genres || []).length > 0 ? (selectedUser.genres || []).map((genre) => (
                      <span key={genre} className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">{genre}</span>
                    )) : <p className="text-sm text-[#A0A7B8]">No genres added</p>}
                  </div>
                </div>

                <div className="bg-[#121826] border border-[#7B61FF]/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Social Links</h3>
                  <div className="space-y-2 text-sm">
                    {[
                      ['Spotify', selectedUser.socialLinks?.spotify],
                      ['Instagram', selectedUser.socialLinks?.instagram],
                      ['TikTok', selectedUser.socialLinks?.tiktok],
                      ['YouTube', selectedUser.socialLinks?.youtube],
                    ].map(([label, url]) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <span className="text-[#A0A7B8]">{label}</span>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                            Open
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-[#A0A7B8]">Not added</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedUser.role === 'artist' ? (
              <div className="mb-6 bg-[#121826] border border-[#7B61FF]/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Verification Review</h3>
                {(() => {
                  const verification = getArtistVerificationState(selectedUser);
                  return (
                    <div className="space-y-3 text-sm text-[#A0A7B8]">
                      <div className="flex items-center justify-between">
                        <span>Email confirmation</span>
                        <span className={verification.verification.emailConfirmed ? 'text-green-600 font-medium' : 'text-[#A0A7B8]'}>
                          {verification.verification.emailConfirmed ? 'Complete' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>ID verification</span>
                        <span className={verification.verification.idVerified ? 'text-green-600 font-medium' : verification.verification.idVerificationOptional ? 'text-amber-600 font-medium' : 'text-[#A0A7B8]'}>
                          {verification.verification.idVerified ? 'Complete' : verification.verification.idVerificationOptional ? 'Optional' : 'Required'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Profile review</span>
                        <span className={verification.verification.profileReviewed ? 'text-green-600 font-medium' : 'text-[#A0A7B8]'}>
                          {verification.verification.profileReviewed ? 'Complete' : 'Pending'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs uppercase tracking-wide text-[#A0A7B8] mb-1">Artist request notes</p>
                        <p className="text-sm text-[#A0A7B8]">{selectedUser.verification?.requestNotes || 'No request notes submitted.'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#A0A7B8] mb-1">Admin review notes</p>
                        <p className="text-sm text-[#A0A7B8]">{selectedUser.verification?.reviewNotes || 'No review notes added.'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#A0A7B8] mb-1">ID document</p>
                        {selectedUser.verification?.idDocumentUrl ? (
                          <a href={selectedUser.verification.idDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                            View uploaded document
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <p className="text-sm text-[#A0A7B8]">No ID document submitted.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}

            {selectedUser.role === 'artist' && selectedUser.bio ? (
              <div className="mb-6 bg-[#121826] border border-[#7B61FF]/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Bio</h3>
                <p className="text-sm text-[#A0A7B8] whitespace-pre-wrap">{selectedUser.bio}</p>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {selectedUser.role === 'artist' ? (
                <>
                  <button
                    onClick={() => handleApproveArtistVerification(selectedUser)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    Approve Verification
                  </button>
                  <button
                    onClick={() => handleRequestArtistVerificationChanges(selectedUser)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Request Changes
                  </button>
                  <button
                    onClick={() => handleRejectArtistVerification(selectedUser)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Verification
                  </button>
                </>
              ) : null}

              {canEdit && (
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsEditModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit className="w-4 h-4" />
                  Edit User
                </button>
              )}

              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setIsUpgradeModalOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <ArrowUpCircle className="w-4 h-4" />
                Upgrade Plan
              </button>

              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setIsSuspendConfirmOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
              >
                <Ban className="w-4 h-4" />
                {selectedUser.isVerified ? 'Suspend User' : 'Activate User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {isUpgradeModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Upgrade Plan</h2>
            
            <div className="space-y-4">
              {/* Current Plan */}
              <div className="bg-[#0B0F1A] rounded-lg p-4">
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Current Plan
                </label>
                <p className="text-lg font-semibold text-white">
                  {selectedUser.subscriptionTier === 'free' 
                    ? 'Free' 
                    : selectedUser.subscriptionTier === 'artist' 
                    ? 'Artist' 
                    : selectedUser.subscriptionTier === 'super_artist'
                    ? 'Super Artist'
                    : 'Partner'}
                </p>
              </div>

              {/* Plan Options */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#A0A7B8] mb-2">
                  Select New Plan
                </label>

                {/* Free Plan */}
                <div 
                  onClick={() => setSelectedUser({ ...selectedUser, subscriptionTier: 'free' })}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    selectedUser.subscriptionTier === 'free' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-[#7B61FF]/20 hover:border-[#7B61FF]/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">Free</h3>
                    <span className="text-xl font-bold text-white">₦0</span>
                  </div>
                  <ul className="text-sm text-[#A0A7B8] space-y-1">
                    <li>• Upload unlimited tracks</li>
                    <li>• 100% royalty retention</li>
                    <li>• Basic analytics</li>
                    <li>• Distribution to major platforms</li>
                  </ul>
                </div>

                {/* Artist Plan */}
                <div 
                  onClick={() => setSelectedUser({ ...selectedUser, subscriptionTier: 'artist' })}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    selectedUser.subscriptionTier === 'artist' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-[#7B61FF]/20 hover:border-[#7B61FF]/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">Artist</h3>
                    <span className="text-xl font-bold text-white">₦15,000<span className="text-sm text-[#A0A7B8]">/release</span></span>
                  </div>
                  <ul className="text-sm text-[#A0A7B8] space-y-1">
                    <li>• Pay per release distributed</li>
                    <li>• 100% royalty retention</li>
                    <li>• Basic analytics</li>
                    <li>• Distribution to all major platforms</li>
                    <li>• Standard processing time</li>
                  </ul>
                </div>

                {/* Super Artist Plan */}
                <div 
                  onClick={() => setSelectedUser({ ...selectedUser, subscriptionTier: 'super_artist' })}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    selectedUser.subscriptionTier === 'super_artist' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-[#7B61FF]/20 hover:border-[#7B61FF]/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">Super Artist</h3>
                    <span className="text-xl font-bold text-white">₦25,000<span className="text-sm text-[#A0A7B8]">/release</span></span>
                  </div>
                  <ul className="text-sm text-[#A0A7B8] space-y-1">
                    <li>• Priority distribution (1–2 business days)</li>
                    <li>• Advanced analytics & audience insights</li>
                    <li>• Revenue forecasting</li>
                    <li>• Pre-save campaign builder</li>
                    <li>• Priority support</li>
                  </ul>
                </div>

                {/* Partner Plan */}
                <div 
                  onClick={() => setSelectedUser({ ...selectedUser, subscriptionTier: 'partner' })}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    selectedUser.subscriptionTier === 'partner' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-[#7B61FF]/20 hover:border-[#7B61FF]/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">Partner</h3>
                      <Crown className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xl font-bold text-white">₦40,000<span className="text-sm text-[#A0A7B8]">/month</span></span>
                  </div>
                  <ul className="text-sm text-[#A0A7B8] space-y-1">
                    <li>• 5 releases/month included (then ₦15k each)</li>
                    <li>• 5 artist accounts included</li>
                    <li>• Label dashboard & roster management</li>
                    <li>• SplitShare and payout workflows</li>
                    <li>• Priority partner support</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  handleUpdateUser(selectedUser);
                  setIsUpgradeModalOpen(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Upgrade Plan
              </button>
              <button
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-100 text-[#A0A7B8] py-2 px-4 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Add New User</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  title="First name"
                  placeholder="Enter first name"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  title="Last name"
                  placeholder="Enter last name"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  title="Email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  title="Password"
                  placeholder="Enter password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Default Password
                </label>
                <input
                  type="text"
                  value={newUser.defaultPassword}
                  onChange={(e) => setNewUser({ ...newUser, defaultPassword: e.target.value })}
                  placeholder="Password@1"
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                />
                <p className="text-xs text-[#A0A7B8] mt-1">
                  Default required for new Artist/Label users: <strong>Password@1</strong>.
                  Use this value if you leave Password blank.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Role
                </label>
                <select
                  title="User role"
                  value={newUser.role}
                  onChange={(e) => {
                    const role = e.target.value as 'artist' | 'label';
                    setNewUser((current) => ({
                      ...current,
                      role,
                      plan: role === 'label' ? 'label' : current.plan === 'label' ? 'free' : current.plan,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                >
                  <option value="artist">Artist</option>
                  <option value="label">Label</option>
                </select>
              </div>

              {newUser.role === 'artist' && (
                <div>
                  <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                    Artist Name
                  </label>
                  <input
                    type="text"
                    title="Artist name"
                    placeholder="Enter artist/stage name"
                    value={newUser.artistName}
                    onChange={(e) => setNewUser({ ...newUser, artistName: e.target.value })}
                    className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Country
                </label>
                <select
                  title="Country"
                  value={newUser.country}
                  onChange={(e) => setNewUser({ ...newUser, country: e.target.value, state: '' })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  State
                </label>
                <select
                  title="State"
                  value={newUser.state}
                  onChange={(e) => setNewUser({ ...newUser, state: e.target.value })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  disabled={!newUser.country || getStatesForCountry(newUser.country).length === 0}
                >
                  <option value="">
                    {newUser.country ? 'Select State' : 'Select Country First'}
                  </option>
                  {newUser.country && getStatesForCountry(newUser.country).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-1">
                  Plan
                </label>
                <select
                  title="Subscription plan"
                  value={newUser.plan}
                  onChange={(e) => setNewUser({ ...newUser, plan: e.target.value as 'free' | 'artist' | 'label' })}
                  className="w-full px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
                  disabled={newUser.role === 'label'}
                >
                  <option value="free">Free</option>
                  <option value="artist">Artist (₦19,990/yr)</option>
                  <option value="label">Label (₦49,990/yr)</option>
                </select>
                {newUser.role === 'label' && (
                  <p className="text-xs text-[#A0A7B8] mt-1">Label accounts always use the Label plan.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleCreateUser()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
              >
                Add User
              </button>
              <button
                onClick={() => {
                  setIsAddUserModalOpen(false);
                }}
                className="flex-1 bg-gray-100 text-[#A0A7B8] py-2 px-4 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Notification */}
      {showSavedNotification && (
        <div className="fixed bottom-2 right-2 z-50 max-w-[calc(100vw-1rem)] rounded-lg bg-green-500 px-4 py-2 text-sm text-white shadow-lg sm:bottom-4 sm:right-4 sm:text-base">
          User updated successfully!
        </div>
      )}

      {createdUserEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">User Created</h2>
                <p className="text-sm text-[#A0A7B8]">The account was created successfully.</p>
              </div>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-6">
              <p className="text-sm text-[#A0A7B8]">Login email</p>
              <p className="mt-1 text-base font-semibold text-white break-all">{createdUserEmail}</p>
              {createdUserDefaultPassword ? (
                <>
                  <p className="mt-4 text-sm text-[#A0A7B8]">Default password</p>
                  <p className="mt-1 text-base font-semibold text-white break-all">{createdUserDefaultPassword}</p>
                </>
              ) : null}
              <p className="mt-3 text-sm text-[#A0A7B8]">
                Share this temporary password with the user directly. They will be forced to change it immediately after first login.
              </p>
            </div>

            <button
              onClick={() => {
                setCreatedUserEmail(null);
                setCreatedUserDefaultPassword(null);
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Delete User</h2>
                <p className="text-sm text-[#A0A7B8]">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                Are you sure you want to permanently delete <strong>{selectedUser.artistName || selectedUser.labelName}</strong>? 
                This will remove all their data, uploads, and account information from the system.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleDeleteUser(selectedUser.id);
                  setIsDeleteConfirmOpen(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition font-medium"
              >
                Delete User
              </button>
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-100 text-[#A0A7B8] py-2 px-4 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend/Activate Confirmation Modal */}
      {isSuspendConfirmOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                selectedUser.isVerified ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                {selectedUser.isVerified ? (
                  <Ban className="w-6 h-6 text-yellow-600" />
                ) : (
                  <UserCheck className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedUser.isVerified ? 'Suspend User' : 'Activate User'}
                </h2>
                <p className="text-sm text-[#A0A7B8]">Confirm your action</p>
              </div>
            </div>
            
            <div className={`border rounded-lg p-4 mb-6 ${
              selectedUser.isVerified ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-sm ${selectedUser.isVerified ? 'text-yellow-800' : 'text-green-800'}`}>
                {selectedUser.isVerified ? (
                  <>
                    Are you sure you want to suspend <strong>{selectedUser.artistName || selectedUser.labelName}</strong>? 
                    They will lose access to their account and will not be able to upload or manage their content.
                  </>
                ) : (
                  <>
                    Are you sure you want to activate <strong>{selectedUser.artistName || selectedUser.labelName}</strong>? 
                    They will regain full access to their account and all features.
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleUpdateUser({ ...selectedUser, isVerified: !selectedUser.isVerified });
                  setIsSuspendConfirmOpen(false);
                }}
                className={`flex-1 text-white py-2 px-4 rounded-lg transition font-medium ${
                  selectedUser.isVerified 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {selectedUser.isVerified ? 'Suspend User' : 'Activate User'}
              </button>
              <button
                onClick={() => {
                  setIsSuspendConfirmOpen(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-100 text-[#A0A7B8] py-2 px-4 rounded-lg hover:bg-gray-200 transition"
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