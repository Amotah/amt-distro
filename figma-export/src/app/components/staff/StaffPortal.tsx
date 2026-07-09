import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Calendar, BookOpen, Download, Plus, Search, Filter, X, Check, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  applyForLeave, getMyLeaveApplications, getLeaveBalance, cancelLeaveApplication,
  getMyPayslips, downloadPayslip, getPayslipDetails,
  getAvailableTrainings, getMyTrainings, enrollInTraining, unenrollFromTraining, submitTrainingFeedback,
  type LeaveApplication, type Payslip, type Training, type StaffTrainingEnrollment, type LeaveBalance, type LeaveType,
} from '../../utils/admin-api';

export function StaffPortal() {
  const [activeTab, setActiveTab] = useState<'leave' | 'payslips' | 'trainings'>('leave');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Staff Portal</h1>
          <p className="text-[#A0A7B8]">Manage your leave, payslips, and trainings</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-[#7B61FF]/20">
          {[
            { id: 'leave' as const, label: 'Leave', icon: Calendar },
            { id: 'payslips' as const, label: 'Payslips', icon: FileText },
            { id: 'trainings' as const, label: 'Trainings', icon: BookOpen },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#7B61FF] text-[#7B61FF]'
                    : 'border-transparent text-[#A0A7B8] hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'leave' && <LeaveTab />}
            {activeTab === 'payslips' && <PayslipsTab />}
            {activeTab === 'trainings' && <TrainingsTab />}
          </>
        )}
      </div>
    </div>
  );
}

function formatPayslipAmount(amount: number, currencyCode = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: String(currencyCode || 'NGN').toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }
}

// ─ Leave Tab ─────────────────────────────────────────────────────────────
function LeaveTab() {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [appResult, balResult] = await Promise.all([
        getMyLeaveApplications(),
        getLeaveBalance(),
      ]);
      setApplications(appResult);
      setBalances(balResult);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }

  const filteredApps = useMemo(() => {
    if (filterStatus === 'all') return applications;
    return applications.filter(a => a.status === filterStatus);
  }, [applications, filterStatus]);

  const statusColors: Record<string, string> = {
    pending: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    approved: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    rejected: 'bg-[#F43F5E]/15 text-[#F43F5E]',
    cancelled: 'bg-[#A0A7B8]/15 text-[#A0A7B8]',
    on_leave: 'bg-[#7B61FF]/15 text-[#7B61FF]',
  };

  const statusIcons: Record<string, React.ElementType> = {
    pending: Clock,
    approved: Check,
    rejected: AlertCircle,
    cancelled: X,
    on_leave: Check,
  };

  return (
    <div className="space-y-6">
      {/* Leave Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map(b => (
          <div key={b.leaveType} className="rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 p-4">
            <div className="text-xs text-[#A0A7B8] uppercase mb-2 font-semibold">{b.leaveType} Leave</div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-2xl font-bold text-[#22D3A1]">{b.available}</div>
                <div className="text-xs text-[#A0A7B8]">of {b.totalAllowed} days</div>
              </div>
            </div>
            <div className="text-xs text-[#A0A7B8]">
              {b.pending > 0 && `${b.pending} pending, `}
              {b.used} used
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filter leave applications by status"
            className="px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm hover:border-[#7B61FF]/40 transition-colors"
          >
            <option value="all">All Applications</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Apply for Leave
        </button>
      </div>

      {/* Apply Form */}
      {showForm && <LeaveApplicationForm onSubmit={() => { setShowForm(false); loadData(); }} />}

      {/* Applications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[#A0A7B8]">Loading applications...</div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-10 text-[#A0A7B8]">No leave applications found</div>
        ) : (
          filteredApps.map(app => {
            const StatusIcon = statusIcons[app.status];
            return (
              <div key={app.id} className="rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${statusColors[app.status] || 'bg-[#7B61FF]/15 text-[#7B61FF]'}`}>
                        {app.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-[#A0A7B8]">
                        {app.numberOfDays} day{app.numberOfDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="font-semibold capitalize">{app.leaveType} Leave</div>
                      <div className="text-sm text-[#A0A7B8]">
                        {new Date(app.startDate).toLocaleDateString()} - {new Date(app.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    {app.reason && <div className="text-sm text-[#A0A7B8]">{app.reason}</div>}
                    {app.rejectionReason && (
                      <div className="text-sm text-[#F43F5E] mt-2">Reason: {app.rejectionReason}</div>
                    )}
                  </div>
                  {app.status === 'pending' && (
                    <button
                      onClick={() => cancelLeaveApplication(app.id).then(() => loadData()).catch(() => toast.error('Failed to cancel'))}
                      className="px-3 py-1 rounded text-sm text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─ Leave Application Form ────────────────────────────────────────────────
function LeaveApplicationForm({ onSubmit }: { onSubmit: () => void }) {
  const [data, setData] = useState({
    leaveType: 'annual' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applyForLeave(data);
      toast.success('Leave application submitted successfully');
      onSubmit();
    } catch (error) {
      toast.error('Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Apply for Leave</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="leaveType" className="block text-sm font-medium text-[#A0A7B8] mb-2">Leave Type</label>
          <select
            id="leaveType"
            value={data.leaveType}
            onChange={e => setData(prev => ({ ...prev, leaveType: e.target.value as LeaveType }))}
            aria-label="Select leave type"
            className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/30 text-white text-sm"
          >
            <option value="annual">Annual</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="parental">Parental</option>
            <option value="study">Study</option>
            <option value="bereavement">Bereavement</option>
          </select>
        </div>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-[#A0A7B8] mb-2">Start Date</label>
          <input
            id="startDate"
            type="date"
            value={data.startDate}
            onChange={e => setData(prev => ({ ...prev, startDate: e.target.value }))}
            aria-label="Leave start date"
            required
            className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/30 text-white text-sm"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-[#A0A7B8] mb-2">End Date</label>
          <input
            id="endDate"
            type="date"
            value={data.endDate}
            onChange={e => setData(prev => ({ ...prev, endDate: e.target.value }))}
            aria-label="Leave end date"
            required
            className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/30 text-white text-sm"
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-[#A0A7B8] mb-2">Reason</label>
        <textarea
          value={data.reason}
          onChange={e => setData(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="Reason for leave..."
          className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#7B61FF]/30 text-white text-sm h-24 resize-none"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </form>
  );
}

// ─ Payslips Tab ──────────────────────────────────────────────────────────
function PayslipsTab() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadPayslips();
  }, [selectedYear]);

  async function loadPayslips() {
    setLoading(true);
    try {
      const result = await getMyPayslips(selectedYear);
      setPayslips(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(payslipId: string) {
    setDownloading(payslipId);
    try {
      await downloadPayslip(payslipId);
      toast.success('Payslip downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download payslip');
    } finally {
      setDownloading(null);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          aria-label="Filter payslips by year"
          className="px-3 py-2 rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 text-white text-sm"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Payslips List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[#A0A7B8]">Loading payslips...</div>
        ) : payslips.length === 0 ? (
          <div className="text-center py-10 text-[#A0A7B8]">No payslips found for this year</div>
        ) : (
          payslips.map(p => (
            <div key={p.id} className="rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <div className="font-semibold">{p.payPeriod}</div>
                    {p.payGrade ? (
                      <span className="rounded-full bg-[#7B61FF]/15 px-2 py-1 text-xs font-medium text-[#C4B5FD]">
                        {p.payGrade}
                      </span>
                    ) : null}
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      p.status === 'paid'
                        ? 'bg-[#22D3A1]/15 text-[#22D3A1]'
                        : p.status === 'draft'
                        ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                        : 'bg-[#7B61FF]/15 text-[#7B61FF]'
                    }`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-[#A0A7B8] mb-2">
                    Paid on {new Date(p.payDate).toLocaleDateString()}
                  </div>
                  {(p.role || p.department) ? (
                    <div className="text-xs text-[#A0A7B8] mb-3">
                      {[p.role, p.department].filter(Boolean).join(' • ')}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
                    <div>
                      <div className="text-[#A0A7B8]">Base Salary</div>
                      <div className="font-semibold text-[#22D3A1]">{formatPayslipAmount(p.baseSalary, p.currency)}</div>
                    </div>
                    <div>
                      <div className="text-[#A0A7B8]">Allowances</div>
                      <div className="font-semibold text-[#60A5FA]">{formatPayslipAmount(p.allowances, p.currency)}</div>
                    </div>
                    <div>
                      <div className="text-[#A0A7B8]">Gross Pay</div>
                      <div className="font-semibold text-white">{formatPayslipAmount(p.grossSalary ?? (p.baseSalary + p.allowances), p.currency)}</div>
                    </div>
                    <div>
                      <div className="text-[#A0A7B8]">PAYE</div>
                      <div className="font-semibold text-[#F59E0B]">{formatPayslipAmount(p.tax, p.currency)}</div>
                    </div>
                    <div>
                      <div className="text-[#A0A7B8]">Deductions</div>
                      <div className="font-semibold text-[#F43F5E]">{formatPayslipAmount(p.deductions, p.currency)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="text-[#A0A7B8]">Net Pay</span>
                    <div className="font-semibold text-[#7B61FF]">{formatPayslipAmount(p.netSalary, p.currency)}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(p.id)}
                  disabled={downloading === p.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  <Download size={16} />
                  {downloading === p.id ? 'Downloading...' : 'Download'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─ Trainings Tab ─────────────────────────────────────────────────────────
function TrainingsTab() {
  const [myTrainings, setMyTrainings] = useState<StaffTrainingEnrollment[]>([]);
  const [availableTrainings, setAvailableTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvailable, setShowAvailable] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    loadTrainings();
  }, []);

  async function loadTrainings() {
    setLoading(true);
    try {
      const [my, available] = await Promise.all([
        getMyTrainings(),
        getAvailableTrainings(),
      ]);
      setMyTrainings(my);
      setAvailableTrainings(available);
    } catch (error) {
      toast.error('Failed to load trainings');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(trainingId: string) {
    setEnrolling(trainingId);
    try {
      await enrollInTraining(trainingId);
      toast.success('Enrolled successfully');
      loadTrainings();
    } catch (error) {
      toast.error('Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  }

  const enrollmentStatuses: Record<string, string> = {
    enrolled: 'bg-[#7B61FF]/15 text-[#7B61FF]',
    completed: 'bg-[#22D3A1]/15 text-[#22D3A1]',
    cancelled: 'bg-[#A0A7B8]/15 text-[#A0A7B8]',
    no_show: 'bg-[#F43F5E]/15 text-[#F43F5E]',
  };

  return (
    <div className="space-y-6">
      {/* Toggle View */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAvailable(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !showAvailable
              ? 'bg-[#7B61FF] text-white'
              : 'bg-[#1a1f35] text-[#A0A7B8] hover:text-white'
          }`}
        >
          My Trainings
        </button>
        <button
          onClick={() => setShowAvailable(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showAvailable
              ? 'bg-[#7B61FF] text-white'
              : 'bg-[#1a1f35] text-[#A0A7B8] hover:text-white'
          }`}
        >
          Available Trainings
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[#A0A7B8]">Loading trainings...</div>
        ) : !showAvailable && myTrainings.length === 0 ? (
          <div className="text-center py-10 text-[#A0A7B8]">
            You haven't enrolled in any trainings yet.
            <button
              onClick={() => setShowAvailable(true)}
              className="ml-2 text-[#7B61FF] hover:underline"
            >
              Browse available trainings
            </button>
          </div>
        ) : showAvailable && availableTrainings.length === 0 ? (
          <div className="text-center py-10 text-[#A0A7B8]">No available trainings at this time</div>
        ) : (
          <>
            {!showAvailable
              ? myTrainings.map(t => (
                  <div key={t.id} className="rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{t.trainingTitle}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${enrollmentStatuses[t.status]}`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="text-sm text-[#A0A7B8]">
                          Enrolled {new Date(t.enrolledAt).toLocaleDateString()}
                        </div>
                        {t.completedAt && (
                          <div className="text-sm text-[#22D3A1] mt-1">
                            Completed {new Date(t.completedAt).toLocaleDateString()}
                          </div>
                        )}
                        {t.score !== undefined && (
                          <div className="text-sm text-[#7B61FF] mt-1">
                            Score: {t.score}%
                          </div>
                        )}
                      </div>
                      {t.certificateUrl && (
                        <a
                          href={t.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded text-sm bg-[#22D3A1]/20 text-[#22D3A1] hover:bg-[#22D3A1]/30 transition-colors"
                        >
                          Certificate
                        </a>
                      )}
                    </div>
                  </div>
                ))
              : availableTrainings.map(t => (
                  <div key={t.id} className="rounded-lg bg-[#1a1f35] border border-[#7B61FF]/20 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{t.title}</h3>
                        <p className="text-sm text-[#A0A7B8] mb-3">{t.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-[#A0A7B8]">Duration</div>
                            <div className="font-semibold">{t.duration}h</div>
                          </div>
                          <div>
                            <div className="text-[#A0A7B8]">Instructor</div>
                            <div className="font-semibold">{t.instructor}</div>
                          </div>
                          <div>
                            <div className="text-[#A0A7B8]">Starts</div>
                            <div className="font-semibold">{new Date(t.startDate).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <div className="text-[#A0A7B8]">Participants</div>
                            <div className="font-semibold">{t.currentParticipants}{t.maxParticipants ? `/${t.maxParticipants}` : ''}</div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEnroll(t.id)}
                        disabled={enrolling === t.id || (t.maxParticipants ? t.currentParticipants >= t.maxParticipants : false)}
                        className="px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-medium disabled:opacity-40 transition-colors whitespace-nowrap"
                      >
                        {enrolling === t.id ? 'Enrolling...' : 'Enroll'}
                      </button>
                    </div>
                  </div>
                ))
            }
          </>
        )}
      </div>
    </div>
  );
}
