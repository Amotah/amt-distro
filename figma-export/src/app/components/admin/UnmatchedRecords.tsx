import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import {
  AlertCircle,
  Search,
  Filter,
  Link2,
  CheckCircle,
  X,
  Music,
  User,
  Hash,
  Calendar,
  ExternalLink,
  Download,
  RefreshCw,
} from 'lucide-react';

interface UnmatchedRecord {
  id: string;
  isrc: string;
  trackName: string;
  artist: string;
  uploadDate: string;
  source: string;
  streams?: number;
  revenue?: number;
  status: 'pending' | 'reviewing' | 'matched';
}

interface AssignmentModalProps {
  record: UnmatchedRecord | null;
  onClose: () => void;
  onAssign: (recordId: string, userId: string) => void;
}

function AssignmentModal({ record, onClose, onAssign }: AssignmentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  // Mock user data for assignment
  const availableUsers = [
    { id: 'user1', name: 'John Doe', email: 'john@example.com', tracks: 12 },
    { id: 'user2', name: 'Jane Smith', email: 'jane@example.com', tracks: 8 },
    { id: 'user3', name: 'Mike Johnson', email: 'mike@example.com', tracks: 15 },
    { id: 'user4', name: 'Sarah Williams', email: 'sarah@example.com', tracks: 6 },
  ];

  const filteredUsers = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!record) return null;

  const handleAssign = () => {
    if (selectedUser) {
      onAssign(record.id, selectedUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121826] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Link2 className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">Assign Track Manually</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Record Info */}
          <div className="bg-white/10 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Music className="w-4 h-4" />
              <span className="font-semibold">{record.trackName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span>{record.artist}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Hash className="w-4 h-4" />
              <span className="font-mono">{record.isrc}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#A0A7B8] mb-2">
              Search User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A0A7B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-3 border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none"
              />
            </div>
          </div>

          {/* User List */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#A0A7B8] mb-2">
              Select User to Assign
            </label>
            <div className="border border-[#7B61FF]/20 rounded-lg max-h-64 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-[#A0A7B8]">
                  <User className="w-12 h-12 mx-auto mb-2 text-[#A0A7B8]" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="divide-y divide-[#7B61FF]/10">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user.id)}
                      className={`w-full p-4 text-left hover:bg-[#0B0F1A] transition flex items-center justify-between ${
                        selectedUser === user.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                            selectedUser === user.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-[#A0A7B8]'
                          }`}
                        >
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-[#A0A7B8]">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[#A0A7B8]">{user.tracks} tracks</p>
                        {selectedUser === user.id && (
                          <CheckCircle className="w-5 h-5 text-blue-600 ml-auto mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#7B61FF]/20 text-[#A0A7B8] rounded-lg font-semibold hover:bg-[#0B0F1A] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedUser}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Link2 className="w-5 h-5" />
              Assign Track
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UnmatchedRecords() {
  const { hasPermission } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<UnmatchedRecord | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Mock unmatched records data
  const [records, setRecords] = useState<UnmatchedRecord[]>([
    {
      id: '1',
      isrc: 'USRC17607839',
      trackName: 'Midnight Vibes',
      artist: 'Unknown Artist',
      uploadDate: '2026-03-20T10:30:00',
      source: 'Spotify',
      streams: 15420,
      revenue: 45.80,
      status: 'pending',
    },
    {
      id: '2',
      isrc: 'GBUM71507845',
      trackName: 'Summer Dreams',
      artist: 'DJ Smooth',
      uploadDate: '2026-03-19T14:22:00',
      source: 'Apple Music',
      streams: 8930,
      revenue: 28.40,
      status: 'pending',
    },
    {
      id: '3',
      isrc: 'DEUM71234567',
      trackName: 'Electric Soul',
      artist: 'Various Artists',
      uploadDate: '2026-03-18T09:15:00',
      source: 'YouTube Music',
      streams: 23100,
      revenue: 62.30,
      status: 'reviewing',
    },
    {
      id: '4',
      isrc: 'FRUM71909876',
      trackName: 'Lost in Translation',
      artist: 'John Smith',
      uploadDate: '2026-03-17T16:45:00',
      source: 'Spotify',
      streams: 5640,
      revenue: 18.90,
      status: 'pending',
    },
    {
      id: '5',
      isrc: 'NZUM71445566',
      trackName: 'City Lights',
      artist: 'Unknown',
      uploadDate: '2026-03-16T11:20:00',
      source: 'Deezer',
      streams: 12800,
      revenue: 38.50,
      status: 'pending',
    },
    {
      id: '6',
      isrc: 'CAUM71778899',
      trackName: 'Rhythm of the Night',
      artist: 'MC Flow',
      uploadDate: '2026-03-15T13:10:00',
      source: 'Tidal',
      streams: 19300,
      revenue: 54.20,
      status: 'reviewing',
    },
  ]);

  const canView = hasPermission('royalties.view');
  const canManage = hasPermission('royalties.manage');

  const handleAssign = (recordId: string, userId: string) => {
    setRecords(
      records.map((record) =>
        record.id === recordId ? { ...record, status: 'matched' as const } : record
      )
    );
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleBulkReprocess = () => {
    if (confirm('Reprocess all pending records? This may take a few minutes.')) {
      // Simulate reprocessing
      alert('Reprocessing started. You will be notified when complete.');
    }
  };

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.trackName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.isrc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      reviewing: 'bg-[#00E5FF]/20 text-[#00E5FF] border-blue-300',
      matched: 'bg-green-100 text-green-700 border-green-300',
    };
    return styles[status as keyof typeof styles] || 'bg-white/10 text-[#A0A7B8]';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle className="w-4 h-4" />;
      case 'reviewing':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const stats = {
    total: records.length,
    pending: records.filter((r) => r.status === 'pending').length,
    reviewing: records.filter((r) => r.status === 'reviewing').length,
    matched: records.filter((r) => r.status === 'matched').length,
  };

  if (!canView) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-[#A0A7B8]">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#0B0F1A] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Unmatched Records</h1>
          <p className="text-[#A0A7B8]">
            Review and manually assign tracks that couldn't be automatically matched
          </p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Track assigned successfully!</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A0A7B8] mb-1">Total Unmatched</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Music className="w-6 h-6 text-[#A0A7B8]" />
              </div>
            </div>
          </div>

          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A0A7B8] mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A0A7B8] mb-1">Reviewing</p>
                <p className="text-3xl font-bold text-blue-600">{stats.reviewing}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A0A7B8] mb-1">Matched</p>
                <p className="text-3xl font-bold text-green-600">{stats.matched}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A0A7B8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by track, artist, or ISRC..."
                  className="w-full pl-10 pr-4 py-3 border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="md:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A0A7B8]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="matched">Matched</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            <button
              onClick={handleBulkReprocess}
              className="px-6 py-3 bg-white/10 text-[#A0A7B8] rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className="w-5 h-5" />
              Reprocess All
            </button>

            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0B0F1A] border-b border-[#7B61FF]/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    ISRC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Track Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Artist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Streams
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7B61FF]/10">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Music className="w-12 h-12 text-[#A0A7B8] mx-auto mb-3" />
                      <p className="text-[#A0A7B8]">No unmatched records found</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-[#0B0F1A]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-[#A0A7B8]" />
                          <span className="font-mono text-sm text-white">{record.isrc}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-[#A0A7B8]" />
                          <span className="font-medium text-white">{record.trackName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#A0A7B8]" />
                          <span className="text-[#A0A7B8]">{record.artist}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#A0A7B8]">{record.source}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white">
                          {record.streams?.toLocaleString() || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-green-600">
                          ₦{record.revenue?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                              record.status
                            )}`}
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {canManage && record.status !== 'matched' ? (
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                          >
                            <Link2 className="w-4 h-4" />
                            Assign
                          </button>
                        ) : (
                          <span className="text-sm text-[#A0A7B8] italic">
                            {record.status === 'matched' ? 'Assigned' : 'View only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Info */}
        <div className="mt-6 flex items-center justify-between text-sm text-[#A0A7B8]">
          <p>
            Showing <span className="font-medium">{filteredRecords.length}</span> of{' '}
            <span className="font-medium">{records.length}</span> records
          </p>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedRecord && (
        <AssignmentModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}
