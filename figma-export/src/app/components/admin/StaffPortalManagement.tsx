import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Search, Filter, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';

export function StaffPortalManagement() {
  const [activeTab, setActiveTab] = useState<'leave-approvals' | 'payslips' | 'trainings'>('leave-approvals');

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Staff Portal Management</h1>
          <p className="text-[#A0A7B8]">Manage leave approvals, payslips, and training programs</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-[#7B61FF]/20">
          {[
            { id: 'leave-approvals' as const, label: 'Leave Approvals', icon: Calendar },
            { id: 'payslips' as const, label: 'Payslips', icon: Download },
            { id: 'trainings' as const, label: 'Trainings', icon: Eye },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#7B61FF] text-[#7B61FF]'
                  : 'border-transparent text-[#A0A7B8] hover:text-white'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'leave-approvals' && <LeaveApprovalsSection />}
        {activeTab === 'payslips' && <PayslipsSection />}
        {activeTab === 'trainings' && <TrainingsSection />}
      </div>
    </div>
  );
}

// ─ Leave Approvals Section ─────────────────────────────────────────────────
function LeaveApprovalsSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');

  const mockData = [
    { id: '1', staffName: 'John Doe', leaveType: 'annual', startDate: '2026-07-15', endDate: '2026-07-20', days: 6, reason: 'Family vacation', status: 'pending', appliedAt: '2026-07-07' },
    { id: '2', staffName: 'Jane Smith', leaveType: 'sick', startDate: '2026-07-08', endDate: '2026-07-09', days: 2, reason: 'Medical appointment', status: 'approved', appliedAt: '2026-07-06' },
    { id: '3', staffName: 'Mike Johnson', leaveType: 'personal', startDate: '2026-07-10', endDate: '2026-07-12', days: 3, reason: 'Personal matters', status: 'pending', appliedAt: '2026-07-05' },
  ];

  const filteredData = mockData.filter(item =>
    (filterStatus === 'all' || item.status === filterStatus) &&
    item.staffName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    approved: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    rejected: 'bg-[#F43F5E]/15 text-[#F43F5E]',
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search staff name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search staff members"
            className="w-full px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          aria-label="Filter by leave application status"
          className="px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Leave Requests Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#7B61FF]/20">
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Staff</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Leave Type</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Duration</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Dates</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Reason</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(request => (
              <tr key={request.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5 transition-colors">
                <td className="px-4 py-3">{request.staffName}</td>
                <td className="px-4 py-3 capitalize">{request.leaveType}</td>
                <td className="px-4 py-3">{request.days} days</td>
                <td className="px-4 py-3 text-sm text-[#A0A7B8]">
                  {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-[#A0A7B8]">{request.reason}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${statusColors[request.status]}`}>
                    {request.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast.success(`Leave approved for ${request.staffName}`)}
                        className="px-2 py-1 rounded text-xs bg-[#22D3A1]/20 text-[#22D3A1] hover:bg-[#22D3A1]/30 transition-colors"
                      >
                        <CheckCircle size={14} className="inline mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => toast.error(`Leave rejected for ${request.staffName}`)}
                        className="px-2 py-1 rounded text-xs bg-[#F43F5E]/20 text-[#F43F5E] hover:bg-[#F43F5E]/30 transition-colors"
                      >
                        <XCircle size={14} className="inline mr-1" />
                        Reject
                      </button>
                    </div>
                  )}
                  {request.status !== 'pending' && (
                    <span className="text-xs text-[#A0A7B8]">{request.status === 'approved' ? '✓ Approved' : '✗ Rejected'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─ Payslips Section ────────────────────────────────────────────────────────
function PayslipsSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2026-07');

  const mockPayslips = [
    { id: '1', staffName: 'John Doe', email: 'john@example.com', salary: 50000, deductions: 8000, net: 42000, month: '2026-07', status: 'finalized' },
    { id: '2', staffName: 'Jane Smith', email: 'jane@example.com', salary: 45000, deductions: 7200, net: 37800, month: '2026-07', status: 'draft' },
    { id: '3', staffName: 'Mike Johnson', email: 'mike@example.com', salary: 55000, deductions: 9000, net: 46000, month: '2026-07', status: 'paid' },
  ];

  const filteredPayslips = mockPayslips.filter(p =>
    p.staffName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusBadges: Record<string, string> = {
    draft: 'bg-[#A0A7B8]/15 text-[#A0A7B8]',
    finalized: 'bg-[#7B61FF]/15 text-[#7B61FF]',
    paid: 'bg-[#22D3A1]/15 text-[#22D3A1]',
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search staff name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search staff members for payslips"
            className="w-full px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm"
          />
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          aria-label="Select payslip month"
          className="px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm"
        >
          <option value="2026-07">July 2026</option>
          <option value="2026-06">June 2026</option>
          <option value="2026-05">May 2026</option>
          <option value="2026-04">April 2026</option>
          <option value="2026-03">March 2026</option>
        </select>
      </div>

      {/* Payslips Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#7B61FF]/20">
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Staff</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Email</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Salary</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Deductions</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Net Pay</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayslips.map(payslip => (
              <tr key={payslip.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5 transition-colors">
                <td className="px-4 py-3">{payslip.staffName}</td>
                <td className="px-4 py-3 text-[#A0A7B8] text-xs">{payslip.email}</td>
                <td className="px-4 py-3">₦{(payslip.salary / 100).toLocaleString()}</td>
                <td className="px-4 py-3 text-[#F43F5E]">₦{(payslip.deductions / 100).toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold text-[#22D3A1]">₦{(payslip.net / 100).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${statusBadges[payslip.status]}`}>
                    {payslip.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toast.success(`Payslip details for ${payslip.staffName} opened`)}
                      className="px-2 py-1 rounded text-xs bg-[#7B61FF]/20 text-[#7B61FF] hover:bg-[#7B61FF]/30 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => toast.success(`Payslip downloaded for ${payslip.staffName}`)}
                      className="px-2 py-1 rounded text-xs bg-[#22D3A1]/20 text-[#22D3A1] hover:bg-[#22D3A1]/30 transition-colors"
                    >
                      <Download size={12} className="inline mr-1" />
                      Download
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─ Trainings Section ───────────────────────────────────────────────────────
function TrainingsSection() {
  const [searchTerm, setSearchTerm] = useState('');

  const mockTrainings = [
    { id: '1', title: 'Leadership Skills', category: 'Professional Development', instructor: 'Dr. Sarah', schedule: '2026-07-20 - 2026-07-22', enrolled: 25, maxCapacity: 30, status: 'scheduled' },
    { id: '2', title: 'Data Analysis Basics', category: 'Technical', instructor: 'John Tech', schedule: '2026-07-15 - 2026-07-17', enrolled: 20, maxCapacity: 20, status: 'ongoing' },
    { id: '3', title: 'Communication Workshop', category: 'Soft Skills', instructor: 'Emma Brown', schedule: '2026-06-10 - 2026-06-12', enrolled: 18, maxCapacity: 25, status: 'completed' },
  ];

  const filteredTrainings = mockTrainings.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusBadges: Record<string, string> = {
    scheduled: 'bg-[#7B61FF]/15 text-[#7B61FF]',
    ongoing: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    completed: 'bg-[#22D3A1]/15 text-[#22D3A1]',
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search training title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search training programs"
            className="w-full px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm"
          />
        </div>
      </div>

      {/* Trainings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#7B61FF]/20">
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Training Title</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Category</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Instructor</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Schedule</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Enrollment</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-[#A0A7B8] font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrainings.map(training => (
              <tr key={training.id} className="border-b border-[#7B61FF]/10 hover:bg-[#7B61FF]/5 transition-colors">
                <td className="px-4 py-3 font-medium">{training.title}</td>
                <td className="px-4 py-3 text-[#A0A7B8]">{training.category}</td>
                <td className="px-4 py-3 text-[#A0A7B8]">{training.instructor}</td>
                <td className="px-4 py-3 text-xs text-[#A0A7B8]">{training.schedule}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-[#7B61FF]/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7B61FF] rounded-full transition-all"
                        style={{ width: `${Math.min((training.enrolled / training.maxCapacity) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#A0A7B8]">{training.enrolled}/{training.maxCapacity}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${statusBadges[training.status]}`}>
                    {training.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toast.success(`Training details for ${training.title} opened`)}
                    className="px-2 py-1 rounded text-xs bg-[#7B61FF]/20 text-[#7B61FF] hover:bg-[#7B61FF]/30 transition-colors"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
