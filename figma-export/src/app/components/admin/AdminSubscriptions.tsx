import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Trash2, Calendar, DollarSign, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';

interface PartnerSubscription {
  id: string;
  userId: string;
  userEmail: string;
  reference: string;
  plan: string;
  amount: number;
  billingPeriod: string;
  status: string;
  paidAt: string;
  expiresAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

function getStatusBadgeClass(status: string, cancelledAt?: string) {
  if (cancelledAt) {
    return 'bg-red-900/30 text-red-300 border-red-700';
  }
  if (status === 'completed') {
    return 'bg-green-900/30 text-green-300 border-green-700';
  }
  if (status === 'failed') {
    return 'bg-red-900/30 text-red-300 border-red-700';
  }
  return 'bg-amber-900/30 text-amber-300 border-amber-700';
}

function isSubscriptionActive(subscription: PartnerSubscription): boolean {
  if (subscription.cancelledAt) {
    return false;
  }
  if (subscription.expiresAt) {
    const expiryDate = new Date(subscription.expiresAt);
    return expiryDate > new Date();
  }
  return true; // If no expiry set, consider it active
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function AdminSubscriptions() {
  const { hasPermission } = useAdmin();
  const canView = hasPermission('payments.view');

  const [subscriptions, setSubscriptions] = useState<PartnerSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'expired'>('all');
  const [query, setQuery] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<PartnerSubscription | null>(null);

  useEffect(() => {
    if (!canView) {
      setIsLoading(false);
      return;
    }

    loadSubscriptions();
  }, [canView]);

  async function loadSubscriptions() {
    try {
      setIsLoading(true);
      setPageError(null);
      
      // Get all billing history
      const history = await adminApi.getAdminBillingHistory() || [];
      
      // Filter for partner subscriptions
      const partnerSubs = history
        .filter(
          (record: any) =>
            record.type === 'subscription' &&
            record.plan === 'partner' &&
            record.provider === 'paystack'
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.paidAt || b.createdAt).getTime() -
            new Date(a.paidAt || a.createdAt).getTime()
        );

      setSubscriptions(partnerSubs as PartnerSubscription[]);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setPageError(error instanceof Error ? error.message : 'Unable to load subscriptions.');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSubscriptions = useMemo(() => {
    const now = new Date();
    
    return subscriptions.filter((sub) => {
      // Apply status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          if (!isSubscriptionActive(sub)) return false;
        } else if (statusFilter === 'cancelled') {
          if (!sub.cancelledAt) return false;
        } else if (statusFilter === 'expired') {
          if (sub.cancelledAt) return false;
          if (!sub.expiresAt || new Date(sub.expiresAt) > now) return false;
        }
      }

      // Apply search query
      if (query) {
        const searchLower = query.toLowerCase();
        return (
          sub.userEmail.toLowerCase().includes(searchLower) ||
          sub.reference.toLowerCase().includes(searchLower) ||
          sub.userId.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [subscriptions, statusFilter, query]);

  const stats = useMemo(() => {
    const now = new Date();
    const active = subscriptions.filter((s) => isSubscriptionActive(s)).length;
    const cancelled = subscriptions.filter((s) => s.cancelledAt).length;
    const expired = subscriptions.filter((s) => !s.cancelledAt && s.expiresAt && new Date(s.expiresAt) <= now).length;
    const totalRevenue = subscriptions
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + s.amount, 0);

    return { active, cancelled, expired, totalRevenue };
  }, [subscriptions]);

  if (!canView) {
    return (
      <div className="p-8 text-center text-[#B3B3B3]">
        You don't have permission to view subscriptions.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Partner Subscriptions</h1>
          <p className="text-[#B3B3B3]">Manage and monitor all partner subscription payments</p>
        </div>
        <Button
          onClick={loadSubscriptions}
          disabled={isLoading}
          className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#ff7f26] text-white"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {pageError && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-200">Error loading subscriptions</p>
            <p className="text-red-200/70 text-sm mt-1">{pageError}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#161616] border-[#FF6B00]/20 p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[#B3B3B3]">Active Subscriptions</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.active}</p>
        </Card>

        <Card className="bg-[#161616] border-[#FF6B00]/20 p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[#B3B3B3]">Cancelled</span>
            <X className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.cancelled}</p>
        </Card>

        <Card className="bg-[#161616] border-[#FF6B00]/20 p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[#B3B3B3]">Expired</span>
            <Calendar className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.expired}</p>
        </Card>

        <Card className="bg-[#161616] border-[#FF6B00]/20 p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[#B3B3B3]">Total Revenue</span>
            <DollarSign className="h-5 w-5 text-[#FF6B00]" />
          </div>
          <p className="text-2xl font-bold text-white">{formatPrice(stats.totalRevenue)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[#161616] border-[#FF6B00]/20 p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <Input
              type="text"
              placeholder="Search by email, reference, or user ID..."
              className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 text-white placeholder:text-[#666]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'cancelled', 'expired'] as const).map((status) => (
              <Button
                key={status}
                onClick={() => setStatusFilter(status)}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                className={
                  statusFilter === status
                    ? 'bg-[#FF6B00] text-white hover:bg-[#ff7f26]'
                    : 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]'
                }
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card className="bg-[#161616] border-[#FF6B00]/20 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[#B3B3B3]">Loading subscriptions...</div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="p-8 text-center text-[#B3B3B3]">
            {subscriptions.length === 0 ? 'No subscriptions found.' : 'No subscriptions match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#FF6B00]/15 bg-[#0A0A0A]">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Email</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Reference</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Amount</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Period</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Paid Date</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Expires</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Status</th>
                  <th className="text-right py-4 px-6 font-medium text-[#B3B3B3]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="border-b border-[#FF6B00]/10 hover:bg-[#0A0A0A]">
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-white font-medium">{subscription.userEmail}</p>
                        <p className="text-xs text-[#888] font-mono">{subscription.userId}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <code className="rounded bg-[#0A0A0A] px-2 py-1 text-xs text-[#FFD9BF]">
                        {subscription.reference}
                      </code>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-white">{formatPrice(subscription.amount)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className="capitalize bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/50">
                        {subscription.billingPeriod}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[#B3B3B3]">{formatDate(subscription.paidAt)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={subscription.expiresAt ? 'text-[#B3B3B3]' : 'text-[#888]'}>
                        {formatDate(subscription.expiresAt)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={getStatusBadgeClass(subscription.status, subscription.cancelledAt)}>
                        {subscription.cancelledAt
                          ? 'Cancelled'
                          : isSubscriptionActive(subscription)
                            ? 'Active'
                            : 'Expired'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button
                        onClick={() => setSelectedSubscription(subscription)}
                        size="sm"
                        className="text-[#FF6B00] hover:bg-[#0A0A0A] bg-transparent border border-[#FF6B00]/50"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedSubscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#161616] border-[#FF6B00]/20 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Subscription Details</h2>
                <Button
                  onClick={() => setSelectedSubscription(null)}
                  size="sm"
                  className="text-[#B3B3B3] hover:bg-[#0A0A0A] bg-transparent"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[#B3B3B3] text-sm font-medium mb-1">Email</p>
                  <p className="text-white">{selectedSubscription.userEmail}</p>
                </div>
                <div>
                  <p className="text-[#B3B3B3] text-sm font-medium mb-1">User ID</p>
                  <p className="text-white font-mono text-sm">{selectedSubscription.userId}</p>
                </div>
                <div>
                  <p className="text-[#B3B3B3] text-sm font-medium mb-1">Reference</p>
                  <p className="text-white font-mono text-sm">{selectedSubscription.reference}</p>
                </div>
                <div>
                  <p className="text-[#B3B3B3] text-sm font-medium mb-1">Amount</p>
                  <p className="text-white">{formatPrice(selectedSubscription.amount)}</p>
                </div>
                <div>
                  <p className="text-[#B3B3B3] text-sm font-medium mb-1">Billing Period</p>
                  <p className="text-white capitalize">{selectedSubscription.billingPeriod}</p>
                </div>
                <div>
                  <p className="text-[#B3B3B3] text-sm font-medium mb-1">Plan</p>
                  <p className="text-white capitalize">{selectedSubscription.plan}</p>
                </div>
                <div>
                  <p className="text-[#B3B3B3] text-sm font-medium mb-1">Payment Date</p>
                  <p className="text-white">{formatDate(selectedSubscription.paidAt)}</p>
                </div>
                <div>
                  <p className="text-[#B3B3B3] text-sm font-medium mb-1">Expires</p>
                  <p className="text-white">{formatDate(selectedSubscription.expiresAt)}</p>
                </div>
                {selectedSubscription.cancelledAt && (
                  <div className="col-span-2">
                    <p className="text-[#B3B3B3] text-sm font-medium mb-1">Cancelled Date</p>
                    <p className="text-red-300">{formatDate(selectedSubscription.cancelledAt)}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-[#B3B3B3] text-sm font-medium mb-1">Status</p>
                  <Badge className={getStatusBadgeClass(selectedSubscription.status, selectedSubscription.cancelledAt)}>
                    {selectedSubscription.cancelledAt
                      ? 'Cancelled'
                      : isSubscriptionActive(selectedSubscription)
                        ? 'Active'
                        : 'Expired'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
