import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle, XCircle, Plus, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminLeaveApplications, approveLeaveApplication, rejectLeaveApplication,
  getAdminTrainings, createTraining,
  type LeaveApplication, type Training,
} from '../../utils/admin-api';

export function StaffPortalManagement() {
  const [activeTab, setActiveTab] = useState<'leave-approvals' | 'trainings'>('leave-approvals');

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Staff Portal Management</h1>
          <p className="text-[#A0A7B8]">Manage leave approvals and training programs</p>
        </div>
        <div className="flex gap-2 mb-8 border-b border-[#7B61FF]/20">
          {[
            { id: 'leave-approvals' as const, label: 'Leave Approvals', icon: Calendar },
            { id: 'trainings' as const, label: 'Trainings', icon: Plus },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-[#7B61FF] text-[#7B61FF]' : 'border-transparent text-[#A0A7B8] hover:text-white'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'leave-approvals' && <LeaveApprovalsSection />}
        {activeTab === 'trainings' && <TrainingsSection />}
      </div>
    </div>
  );
}

// â”€ Leave Approvals Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LeaveApprovalsSection() {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminLeaveApplications();
      setApplications(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string, name: string) => {
    try {
      await approveLeaveApplication(id);
      toast.success(`Leave approved for ${name}`);
      load();
    } catch (err) {
      toast.error('Failed to approve leave');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectLeaveApplication(id, rejectReason);
      toast.success('Leave application rejected');
      setRejecting(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error('Failed to reject leave');
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    approved: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    rejected: 'bg-[#F43F5E]/15 text-[#F43F5E]',
    cancelled: 'bg-[#A0A7B8]/15 text-[#A0A7B8]',
    on_leave: 'bg-[#7B61FF]/15 text-[#7B61FF]',
  };

  const filtered = applications.filter(a =>
    (filterStatus === 'all' || a.status === filterStatus) &&
    a.staffName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search staff name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search staff members"
            className="px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm w-52"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1f35] text-[#A0A7B8] hover:text-white text-sm transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#A0A7B8]">No {filterStatus === 'all' ? '' : filterStatus} leave applications found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#7B61FF]/20">
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Staff</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Days</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Dates</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Reason</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5 transition-colors">
                  <td className="px-4 py-3 font-medium">{app.staffName}</td>
                  <td className="px-4 py-3 capitalize">{app.leaveType}</td>
                  <td className="px-4 py-3">{app.numberOfDays}d</td>
                  <td className="px-4 py-3 text-xs text-[#A0A7B8]">
                    {new Date(app.startDate).toLocaleDateString()} â€“ {new Date(app.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-[#A0A7B8] max-w-[160px] truncate">{app.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${statusColors[app.status] || ''}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {app.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(app.id, app.staffName)}
                          className="px-2 py-1 rounded text-xs bg-[#22D3A1]/20 text-[#22D3A1] hover:bg-[#22D3A1]/30 transition-colors"
                        >
                          <CheckCircle size={12} className="inline mr-1" />Approve
                        </button>
                        <button
                          onClick={() => setRejecting(app.id)}
                          className="px-2 py-1 rounded text-xs bg-[#F43F5E]/20 text-[#F43F5E] hover:bg-[#F43F5E]/30 transition-colors"
                        >
                          <XCircle size={12} className="inline mr-1" />Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#A0A7B8]">â€”</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1f35] rounded-xl p-6 w-full max-w-md border border-[#7B61FF]/20">
            <h3 className="text-lg font-bold text-white mb-4">Reject Leave Application</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              aria-label="Rejection reason"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/20 text-white text-sm mb-4 resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejecting(null); setRejectReason(''); }} className="px-4 py-2 rounded-lg bg-[#A0A7B8]/20 text-[#A0A7B8] text-sm hover:bg-[#A0A7B8]/30 transition-colors">Cancel</button>
              <button onClick={() => handleReject(rejecting)} className="px-4 py-2 rounded-lg bg-[#F43F5E]/20 text-[#F43F5E] text-sm hover:bg-[#F43F5E]/30 transition-colors">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€ Trainings Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TrainingsSection() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'general', instructor: '', startDate: '', endDate: '', duration: 1, isOnline: false, maxParticipants: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminTrainings();
      setTrainings(data);
    } catch {
      toast.error('Failed to load trainings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title || !form.startDate) { toast.error('Title and start date are required'); return; }
    setSaving(true);
    try {
      await createTraining({ ...form, maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined });
      toast.success('Training created');
      setShowForm(false);
      setForm({ title: '', category: 'general', instructor: '', startDate: '', endDate: '', duration: 1, isOnline: false, maxParticipants: '' });
      load();
    } catch {
      toast.error('Failed to create training');
    } finally {
      setSaving(false);
    }
  };

  const statusBadges: Record<string, string> = {
    scheduled: 'bg-[#7B61FF]/15 text-[#7B61FF]',
    ongoing: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    completed: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    cancelled: 'bg-[#F43F5E]/15 text-[#F43F5E]',
  };

  const filtered = trainings.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center justify-between flex-wrap">
        <input
          type="text"
          placeholder="Search trainings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search training programs"
          className="px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm w-52"
        />
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1f35] text-[#A0A7B8] hover:text-white text-sm transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#7B61FF]/20 text-[#7B61FF] hover:bg-[#7B61FF]/30 text-sm transition-colors">
            <Plus size={14} /> Add Training
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#1a1f35] rounded-xl p-6 border border-[#7B61FF]/20 space-y-4">
          <h3 className="font-bold text-white">New Training Program</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-title" className="block text-xs text-[#A0A7B8] mb-1">Title *</label>
              <input id="t-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/20 text-white text-sm" />
            </div>
            <div>
              <label htmlFor="t-instructor" className="block text-xs text-[#A0A7B8] mb-1">Instructor</label>
              <input id="t-instructor" value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/20 text-white text-sm" />
            </div>
            <div>
              <label htmlFor="t-start" className="block text-xs text-[#A0A7B8] mb-1">Start Date *</label>
              <input id="t-start" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/20 text-white text-sm" />
            </div>
            <div>
              <label htmlFor="t-end" className="block text-xs text-[#A0A7B8] mb-1">End Date</label>
              <input id="t-end" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/20 text-white text-sm" />
            </div>
            <div>
              <label htmlFor="t-category" className="block text-xs text-[#A0A7B8] mb-1">Category</label>
              <select id="t-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/20 text-white text-sm">
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="compliance">Compliance</option>
                <option value="leadership">Leadership</option>
                <option value="soft_skills">Soft Skills</option>
              </select>
            </div>
            <div>
              <label htmlFor="t-max" className="block text-xs text-[#A0A7B8] mb-1">Max Participants</label>
              <input id="t-max" type="number" value={form.maxParticipants} onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value }))} placeholder="Leave blank for unlimited" className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/20 text-white text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="t-online" type="checkbox" checked={form.isOnline} onChange={e => setForm(f => ({ ...f, isOnline: e.target.checked }))} />
            <label htmlFor="t-online" className="text-sm text-[#A0A7B8]">Online Training</label>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-[#A0A7B8]/20 text-[#A0A7B8] text-sm hover:bg-[#A0A7B8]/30 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 rounded-lg bg-[#7B61FF]/20 text-[#7B61FF] text-sm hover:bg-[#7B61FF]/30 transition-colors disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Training'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#A0A7B8]">No training programs found. Click "Add Training" to create one.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#7B61FF]/20">
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Title</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Category</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Instructor</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Schedule</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Enrollment</th>
                <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3 text-[#A0A7B8] capitalize">{t.category}</td>
                  <td className="px-4 py-3 text-[#A0A7B8]">{t.instructor || 'â€”'}</td>
                  <td className="px-4 py-3 text-xs text-[#A0A7B8]">{t.startDate}{t.endDate && t.endDate !== t.startDate ? ` â€“ ${t.endDate}` : ''}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-[#7B61FF]/20 rounded-full overflow-hidden">
                        <div className="h-full bg-[#7B61FF] rounded-full transition-all" style={{ width: t.maxParticipants ? `${Math.min((t.currentParticipants / t.maxParticipants) * 100, 100)}%` : '0%' }} />
                      </div>
                      <span className="text-xs text-[#A0A7B8]">{t.currentParticipants}{t.maxParticipants ? `/${t.maxParticipants}` : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${statusBadges[t.status] || ''}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
