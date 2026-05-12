import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';
import {
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Search,
} from 'lucide-react';

export function FraudMonitoring() {
  const { hasPermission } = useAdmin();
  const [alerts, setAlerts] = useState<adminApi.FraudAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<adminApi.FraudAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<adminApi.FraudAlert | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);

  const mostRecentAlert = alerts
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const canResolve = hasPermission('fraud.resolve');

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, statusFilter, riskFilter]);

  async function loadAlerts() {
    try {
      setIsLoading(true);
      const data = await adminApi.getAllFraudAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Error loading fraud alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function filterAlerts() {
    let filtered = alerts;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((alert) => alert.status === statusFilter);
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter((alert) => alert.riskLevel === riskFilter);
    }

    setFilteredAlerts(filtered);
  }

  function toggleAlertSelection(alertId: string) {
    setSelectedAlertIds((prev) =>
      prev.includes(alertId) ? prev.filter((id) => id !== alertId) : [...prev, alertId]
    );
  }

  async function handleBulkResolve(status: adminApi.FraudAlert['status']) {
    if (!selectedAlertIds.length) return;
    try {
      await Promise.all(
        selectedAlertIds.map((id) => adminApi.resolveFraudAlert(id, status, resolveNotes))
      );
      const updated = alerts.map((alert) =>
        selectedAlertIds.includes(alert.id) ? { ...alert, status } : alert
      );
      setAlerts(updated);
      setSelectedAlertIds([]);
      setSelectedAlert(null);
      setIsDetailModalOpen(false);
      setResolveNotes('');
      alert(`${selectedAlertIds.length} alerts marked ${status}`);
    } catch (error: any) {
      alert('Bulk resolve failed: ' + error.message);
    }
  }

  async function handleResolveAlert(
    alertId: string,
    status: adminApi.FraudAlert['status']
  ) {
    try {
      const updatedAlert = await adminApi.resolveFraudAlert(alertId, status, resolveNotes);
      setAlerts(alerts.map((a) => (a.id === alertId ? updatedAlert : a)));
      setIsDetailModalOpen(false);
      setSelectedAlert(null);
      setResolveNotes('');
    } catch (error: any) {
      alert('Error resolving alert: ' + error.message);
    }
  }

  const activeAlerts = alerts.filter((a) => a.status === 'active').length;
  const criticalAlerts = alerts.filter(
    (a) => a.riskLevel === 'critical' && a.status === 'active'
  ).length;
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved').length;

  const alertsByRole = alerts.reduce((acc, alert) => {
    const role = alert.metadata?.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const roleStats = Object.entries(alertsByRole);


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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fraud Monitoring</h1>
        <p className="text-gray-600 mt-1">
          Monitor and investigate suspicious activity on the platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Alerts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-red-200 bg-red-50">
          <p className="text-sm text-red-600">Critical Alerts</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{criticalAlerts}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-600">Active</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{activeAlerts}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-green-200 bg-green-50">
          <p className="text-sm text-green-600">Resolved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{resolvedAlerts}</p>
        </div>
      </div>

      {/* Most Recent Issue */}
      {mostRecentAlert && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Most Recent Alert</p>
          <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-base font-semibold text-red-700">{mostRecentAlert.ruleType}</p>
            <p className="text-xs text-gray-500">{new Date(mostRecentAlert.createdAt).toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-700">{mostRecentAlert.description}</p>
            <p className="mt-1 text-xs text-gray-500">Risk: {mostRecentAlert.riskLevel}</p>
            <p className="mt-0.5 text-xs text-gray-500">Status: {mostRecentAlert.status}</p>
          </div>
        </div>
      )}

      {/* Role-Based Alert Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Alerts by Role</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {roleStats.length > 0 ? (
            roleStats.map(([role, count]) => (
              <div key={role} className="rounded-lg p-3 bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase">{role}</p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No role data available from alerts</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Bulk Resolve Actions */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">Selected alerts: {selectedAlertIds.length}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleBulkResolve('resolved')}
            disabled={!selectedAlertIds.length || !canResolve}
            className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-40"
          >
            Resolve Selected
          </button>
          <button
            onClick={() => handleBulkResolve('false_positive')}
            disabled={!selectedAlertIds.length || !canResolve}
            className="px-3 py-2 rounded bg-gray-600 text-white disabled:opacity-40"
          >
            Mark as False Positive
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedAlertIds.length > 0 && selectedAlertIds.length === filteredAlerts.length}
                    onChange={(e) =>
                      setSelectedAlertIds(e.target.checked ? filteredAlerts.map((a) => a.id) : [])
                    }
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alert Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedAlertIds.includes(alert.id)}
                      onChange={() => toggleAlertSelection(alert.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        alert.riskLevel === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : alert.riskLevel === 'high'
                          ? 'bg-orange-100 text-orange-700'
                          : alert.riskLevel === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {alert.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {alert.ruleType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 max-w-md truncate">{alert.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.status === 'active'
                          ? 'bg-yellow-100 text-yellow-700'
                          : alert.status === 'investigating'
                          ? 'bg-blue-100 text-blue-700'
                          : alert.status === 'resolved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {alert.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedAlert(alert);
                        setIsDetailModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-500">No alerts found</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Fraud Alert Details</h2>
                <p className="text-sm text-gray-500 mt-1">Alert ID: {selectedAlert.id}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedAlert.riskLevel === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : selectedAlert.riskLevel === 'high'
                    ? 'bg-orange-100 text-orange-700'
                    : selectedAlert.riskLevel === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {selectedAlert.riskLevel} Risk
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alert Type</label>
                <p className="text-gray-900">
                  {selectedAlert.ruleType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-900">{selectedAlert.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="text-gray-900 capitalize">{selectedAlert.status.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-gray-900">
                    {new Date(selectedAlert.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedAlert.metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Details
                  </label>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedAlert.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAlert.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution Notes
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAlert.notes}</p>
                </div>
              )}

              {canResolve && selectedAlert.status === 'active' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution Notes
                  </label>
                  <textarea
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Enter notes about how you resolved this alert..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              {canResolve && selectedAlert.status === 'active' && (
                <>
                  <button
                    onClick={() => handleResolveAlert(selectedAlert.id, 'resolved')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Resolved
                  </button>
                  <button
                    onClick={() => handleResolveAlert(selectedAlert.id, 'false_positive')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    False Positive
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedAlert(null);
                  setResolveNotes('');
                }}
                className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
