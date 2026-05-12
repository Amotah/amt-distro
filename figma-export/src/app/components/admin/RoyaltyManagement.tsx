import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  Edit,
  Download,
  Filter,
  CreditCard,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export function RoyaltyManagement() {
  const { hasPermission } = useAdmin();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<adminApi.PayoutRequest[]>([]);
  const [selectedEarnings, setSelectedEarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPayoutReference, setIsUpdatingPayoutReference] = useState<string | null>(null);

  const canEdit = hasPermission('royalties.edit');
  const canApprove = hasPermission('royalties.approve');
  const canViewPayouts = hasPermission('payments.view');
  const canManagePayouts = hasPermission('payments.approve');

  useEffect(() => {
    loadEarnings();
  }, []);

  async function loadEarnings() {
    try {
      setIsLoading(true);
      // This would load from a real endpoint - for now using mock data
      setEarnings([]);

      if (canViewPayouts) {
        const requests = await adminApi.getPayoutRequests().catch(() => []);
        setPayoutRequests(requests);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApproveSelected() {
    if (selectedEarnings.length === 0) {
      alert('Please select at least one earning to approve');
      return;
    }

    try {
      await adminApi.approveEarnings(selectedEarnings);
      alert('Earnings approved successfully');
      setSelectedEarnings([]);
      loadEarnings();
    } catch (error: any) {
      alert('Error approving earnings: ' + error.message);
    }
  }

  async function handleUpdatePayout(reference: string, status: 'completed' | 'failed') {
    try {
      setIsUpdatingPayoutReference(reference);
      const updated = await adminApi.updatePayoutRequest(reference, status);
      setPayoutRequests((current) => current.map((request) => request.reference === reference ? updated : request));
    } catch (error: any) {
      alert(`Error updating payout request: ${error.message}`);
    } finally {
      setIsUpdatingPayoutReference(null);
    }
  }

  const totalPayoutRequests = payoutRequests.reduce((sum, request) => sum + request.amount, 0);
  const pendingPayoutRequests = payoutRequests.filter((request) => request.status === 'pending');
  const completedPayoutRequests = payoutRequests.filter((request) => request.status === 'completed');
  const failedPayoutRequests = payoutRequests.filter((request) => request.status === 'failed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Royalty Management</h1>
        <p className="text-[#A0A7B8] mt-1">Manage artist royalties, streaming earnings, and revenue payout requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <p className="text-sm text-[#A0A7B8]">Total Earnings</p>
          <p className="text-2xl font-bold text-white mt-1">₦0.00</p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-yellow-500/30 p-4">
          <p className="text-sm text-yellow-600">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">₦0.00</p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-green-500/30 p-4">
          <p className="text-sm text-green-600">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₦0.00</p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-[#00E5FF]/30 p-4">
          <p className="text-sm text-blue-600">Paid Out</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">₦0.00</p>
        </div>
      </div>

      {canViewPayouts && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
              <p className="text-sm text-[#A0A7B8]">Payout Requests</p>
              <p className="text-2xl font-bold text-white mt-1">₦{totalPayoutRequests.toLocaleString()}</p>
            </div>
            <div className="bg-[#121826] rounded-xl border border-yellow-500/30 p-4">
              <p className="text-sm text-yellow-700">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">{pendingPayoutRequests.length}</p>
            </div>
            <div className="bg-[#121826] rounded-xl border border-green-500/30 p-4">
              <p className="text-sm text-green-700">Processed</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{completedPayoutRequests.length}</p>
            </div>
            <div className="bg-[#121826] rounded-xl border border-red-500/30 p-4">
              <p className="text-sm text-red-700">Rejected</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{failedPayoutRequests.length}</p>
            </div>
          </div>

          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#7B61FF]/20 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Revenue Payout Requests</h2>
                <p className="text-sm text-[#A0A7B8] mt-1">All artist and label payout requests are managed here under /admin/royalties.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
                <Clock className="w-4 h-4" />
                {pendingPayoutRequests.length} pending
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-[#A0A7B8]">Loading payout requests...</div>
            ) : payoutRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0B0F1A] border-b border-[#7B61FF]/20">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">Requester</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">Account Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">Requested</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payoutRequests.map((request) => (
                      <tr key={request.reference} className="hover:bg-[#0B0F1A]">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-white">{request.requesterName || request.email}</div>
                            <div className="text-xs text-[#A0A7B8]">{request.requesterRole || 'artist'} · {request.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-white/10 px-2 py-1 rounded">{request.reference}</code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">{request.payoutAccount?.bankName || 'Bank not provided'}</div>
                          <div className="text-xs text-[#A0A7B8]">{request.payoutAccount?.accountName || 'No account name'} · {request.payoutAccount?.accountNumber || 'No account number'}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-white">₦{request.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-[#A0A7B8]">{new Date(request.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            request.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : request.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {request.status === 'pending' ? <Clock className="w-3 h-3" /> : request.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {canManagePayouts && request.status === 'pending' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUpdatePayout(request.reference, 'completed')}
                                disabled={isUpdatingPayoutReference === request.reference}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => handleUpdatePayout(request.reference, 'failed')}
                                disabled={isUpdatingPayoutReference === request.reference}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#A0A7B8]">{request.status === 'pending' ? 'Finance approval required' : 'Updated'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-[#A0A7B8] mx-auto mb-3" />
                <p className="text-[#A0A7B8]">No payout requests yet</p>
                <p className="text-sm text-[#A0A7B8] mt-1">Revenue payout requests from artists and labels will appear here</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      {canApprove && (
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <button
            onClick={handleApproveSelected}
            disabled={selectedEarnings.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-5 h-5" />
            Approve Selected ({selectedEarnings.length})
          </button>
        </div>
      )}

      {/* Earnings Table */}
      <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20">
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-[#A0A7B8] mx-auto mb-3" />
          <p className="text-[#A0A7B8]">No royalty data available yet</p>
          <p className="text-sm text-[#A0A7B8] mt-1">
            Earnings will appear here once streaming reports are processed
          </p>
        </div>
      </div>
    </div>
  );
}
