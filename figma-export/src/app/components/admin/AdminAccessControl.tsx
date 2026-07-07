import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Lock,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
  FileText,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  approveAccessAction,
  rejectAccessAction,
  getPendingAccessActions,
  getAccessLogs,
  getRolePermissions,
  ADMIN_ROLE_MATRIX,
  type AdminAccessAction,
  type AdminAccessLog,
  type InternalUserRole,
} from '../../utils/admin-api';

const ACTION_TYPES = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
  reject: 'Reject',
  execute: 'Execute',
};

const STATUS_COLORS: Record<AdminAccessAction['status'], { bg: string; color: string }> = {
  pending_approval: { bg: 'rgba(249,115,22,0.12)', color: '#FDBA74' },
  approved: { bg: 'rgba(34,197,94,0.12)', color: '#4ADE80' },
  rejected: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  executed: { bg: 'rgba(34,197,94,0.12)', color: '#22C55E' },
  failed: { bg: 'rgba(239,68,68,0.12)', color: '#DC2626' },
};

const LOG_STATUS_COLORS: Record<AdminAccessLog['status'], { bg: string; color: string }> = {
  success: { bg: 'rgba(34,197,94,0.12)', color: '#4ADE80' },
  denied: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  error: { bg: 'rgba(239,68,68,0.12)', color: '#DC2626' },
};

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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

export function AdminAccessControl() {
  const [pendingActions, setPendingActions] = useState<AdminAccessAction[]>([]);
  const [logs, setLogs] = useState<AdminAccessLog[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<InternalUserRole, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'logs' | 'matrix'>('pending');
  const [query, setQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<AdminAccessAction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<InternalUserRole>('superadmin');
  const [logFilters, setLogFilters] = useState({ status: 'all' as AdminAccessLog['status'] | 'all' });

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [pendingResult, logsResult] = await Promise.all([
        getPendingAccessActions(),
        getAccessLogs({ limit: 100 }),
      ]);

      setPendingActions(pendingResult);
      setLogs(logsResult);

      // Load role permissions
      const rolePerms: Record<InternalUserRole, any> = {};
      const roles: InternalUserRole[] = [
        'superadmin',
        'system_admin',
        'admin_finance',
        'admin_content',
        'admin_support',
      ];
      for (const role of roles) {
        try {
          rolePerms[role] = await getRolePermissions(role);
        } catch {
          rolePerms[role] = ADMIN_ROLE_MATRIX[role];
        }
      }
      setRolePermissions(rolePerms);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load access control data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return pendingActions.filter((action) => {
      const matchesQuery =
        !normalizedQuery ||
        [action.resourceName, action.resourceType, action.userId].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesQuery;
    });
  }, [query, pendingActions]);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return logs.filter((log) => {
      const statusMatch = logFilters.status === 'all' || log.status === logFilters.status;
      const queryMatch =
        !normalizedQuery ||
        [log.userId, log.action, log.resourceType].join(' ').toLowerCase().includes(normalizedQuery);
      return statusMatch && queryMatch;
    });
  }, [query, logs, logFilters]);

  const handleApproveAction = async () => {
    if (!selectedAction) return;
    try {
      setSaving(true);
      await approveAccessAction(selectedAction.id);
      toast.success('Access action approved');
      setDetailOpen(false);
      setSelectedAction(null);
      await loadData(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve action');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectAction = async () => {
    if (!selectedAction || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setSaving(true);
      await rejectAccessAction(selectedAction.id, rejectionReason);
      toast.success('Access action rejected');
      setRejectionOpen(false);
      setDetailOpen(false);
      setSelectedAction(null);
      setRejectionReason('');
      await loadData(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject action');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'border-b-2 border-blue-500 text-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Clock3 className="mb-1 inline h-4 w-4 mr-2" />
          Pending Approvals ({pendingActions.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? 'border-b-2 border-blue-500 text-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <FileText className="mb-1 inline h-4 w-4 mr-2" />
          Access Logs
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'matrix'
              ? 'border-b-2 border-blue-500 text-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Shield className="mb-1 inline h-4 w-4 mr-2" />
          Permission Matrix
        </button>
      </div>

      {/* Pending Approvals Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search resource name, type, user..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <Button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="bg-slate-700 hover:bg-slate-600"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {filteredActions.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <p className="text-slate-400">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    setSelectedAction(action);
                    setDetailOpen(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-left transition-colors hover:bg-slate-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-white">{action.resourceName}</p>
                        <Badge variant="outline" className="text-xs">
                          {ACTION_TYPES[action.actionType]}
                        </Badge>
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                          style={STATUS_COLORS[action.status]}
                        >
                          {action.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {action.resourceType} • Inputted by {action.inputtedBy} • {formatDate(action.inputtedAt)}
                      </p>
                    </div>
                    <Clock3 className="h-5 w-5 text-orange-400 mt-1 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Access Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search user, action, resource..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-slate-400">
                Status:
              </label>
              <select
                id="status-filter"
                value={logFilters.status}
                onChange={(e) => setLogFilters({ status: (e.target.value as any) })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="denied">Denied</option>
                <option value="error">Error</option>
              </select>
            </div>
            <Button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="bg-slate-700 hover:bg-slate-600"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-500" />
              <p className="text-slate-400">No access logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="px-4 py-3 text-left font-medium text-slate-400">User</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-400">Action</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-400">Resource</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-400">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-700 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-300">{log.userId}</td>
                      <td className="px-4 py-3 text-slate-300">{log.action}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {log.resourceType} ({log.resourceId})
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                          style={LOG_STATUS_COLORS[log.status]}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Permission Matrix Tab */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <label htmlFor="role-select" className="text-sm font-medium text-slate-400">
              Select Role:
            </label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as InternalUserRole)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
            >
              {Object.entries(ADMIN_ROLE_MATRIX).map(([role, config]) => (
                <option key={role} value={role}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inputter Permissions */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-400" />
                Inputter Permissions
              </h3>
              <div className="space-y-2">
                {(rolePermissions[selectedRole]?.inputterPermissions || ADMIN_ROLE_MATRIX[selectedRole]?.inputterPermissions || []).map((perm: string) => (
                  <div
                    key={perm}
                    className="text-sm px-3 py-2 rounded bg-slate-700/50 text-slate-300 border border-slate-600"
                  >
                    {perm}
                  </div>
                ))}
                {(rolePermissions[selectedRole]?.inputterPermissions || ADMIN_ROLE_MATRIX[selectedRole]?.inputterPermissions || []).length === 0 && (
                  <p className="text-slate-500 text-sm">No inputter permissions</p>
                )}
              </div>
            </div>

            {/* Authorizer Permissions */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Authorizer Permissions
              </h3>
              <div className="space-y-2">
                {(rolePermissions[selectedRole]?.authorizerPermissions || ADMIN_ROLE_MATRIX[selectedRole]?.authorizerPermissions || []).map((perm: string) => (
                  <div
                    key={perm}
                    className="text-sm px-3 py-2 rounded bg-slate-700/50 text-slate-300 border border-slate-600"
                  >
                    {perm}
                  </div>
                ))}
                {(rolePermissions[selectedRole]?.authorizerPermissions || ADMIN_ROLE_MATRIX[selectedRole]?.authorizerPermissions || []).length === 0 && (
                  <p className="text-slate-500 text-sm">No authorizer permissions</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-sm text-slate-400">
              <strong>Workflow:</strong> Users with <span className="text-blue-400">Inputter</span> permissions can create or input
              actions. Users with <span className="text-green-400">Authorizer</span> permissions can approve or reject those actions.
              The <span className="text-cyan-400">System Admin</span> role approves all actions inputted by{' '}
              <span className="text-cyan-400">Super Admin</span>.
            </p>
          </div>
        </div>
      )}

      {/* Action Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Access Action Details</DialogTitle>
            <DialogDescription>Review and approve or reject this action</DialogDescription>
          </DialogHeader>

          {selectedAction && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Resource Name</label>
                <p className="text-white mt-1">{selectedAction.resourceName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Resource Type</label>
                <p className="text-white mt-1">{selectedAction.resourceType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Action Type</label>
                <p className="text-white mt-1">{ACTION_TYPES[selectedAction.actionType]}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Permission</label>
                <p className="text-white mt-1 font-mono text-sm">{selectedAction.permission}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Inputted By</label>
                <p className="text-white mt-1">{selectedAction.inputtedBy}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Timestamp</label>
                <p className="text-white mt-1">{formatDate(selectedAction.inputtedAt)}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {selectedAction?.status === 'pending_approval' && (
              <>
                <Button
                  onClick={() => {
                    setRejectionOpen(true);
                    setDetailOpen(false);
                  }}
                  disabled={saving}
                  className="bg-red-900 hover:bg-red-800"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApproveAction}
                  disabled={saving}
                  className="bg-green-900 hover:bg-green-800"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {saving ? 'Approving...' : 'Approve'}
                </Button>
              </>
            )}
            <Button onClick={() => setDetailOpen(false)} className="bg-slate-700 hover:bg-slate-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionOpen} onOpenChange={setRejectionOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Access Action</DialogTitle>
            <DialogDescription>Provide a reason for rejection</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason" className="text-slate-300">
                Rejection Reason
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain why this action is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2 bg-slate-800 border-slate-700 text-white min-h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setRejectionOpen(false)} className="bg-slate-700 hover:bg-slate-600">
              Cancel
            </Button>
            <Button onClick={handleRejectAction} disabled={saving} className="bg-red-900 hover:bg-red-800">
              {saving ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
