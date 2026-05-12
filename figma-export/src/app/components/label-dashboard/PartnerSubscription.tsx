import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CreditCard,
  Check,
  AlertCircle,
  Loader,
  Shield,
  Zap,
  ChevronRight,
  Clock,
  Trash2,
  FileText,
  Download,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { getCurrentUserProfile } from '../../utils/user-api';
import { initializePaystackPayment, getBillingHistory, cancelPartnerSubscription, getPartnerSubscriptionStatus, type BillingHistoryRecord } from '../../utils/payment-api';

interface SubscriptionPlan {
  id: string;
  name: string;
  period: 'monthly';
  price: number;
  billingCycle: string;
  features: string[];
  recommended?: boolean;
}

const PARTNER_PLANS: SubscriptionPlan[] = [
  {
    id: 'partner-monthly',
    name: 'Partner Monthly',
    period: 'monthly',
    price: 40000,
    billingCycle: 'Monthly (Billed every 30 days)',
    features: [
      '5 releases included per month',
      '5 artist accounts included',
      'Extra releases at ₦15,000 each after quota',
      'Priority support',
      'SplitShare and payout workflows',
      'Label dashboard and roster management',
      'All Super Artist features included',
    ],
  },
];

export function PartnerSubscription() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState<BillingHistoryRecord | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellationInProgress, setCancellationInProgress] = useState(false);
  const [showCancellationConfirm, setShowCancellationConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<BillingHistoryRecord[]>([]);

  useEffect(() => {
    fetchSubscriptionStatus();
    
    // Check if returning from payment
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment-complete') === 'true') {
      // Refresh subscription status after a short delay
      setTimeout(() => {
        fetchSubscriptionStatus();
        // Remove the query param
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1000);
    }
  }, []);

  async function fetchSubscriptionStatus() {
    try {
      setLoading(true);
      setError(null);

      // Get user profile to verify they're a partner
      let profile;
      try {
        profile = await getCurrentUserProfile();
      } catch (profileErr) {
        console.error('Profile fetch error:', profileErr);
        setError('Unable to load user profile. Please log out and log back in.');
        return;
      }

      setUserProfile(profile);

      if (!profile) {
        setError('User profile not found. Please log out and log back in.');
        return;
      }

      if (profile.subscriptionTier !== 'partner') {
        setError('This page is for partner accounts only. Your current plan: ' + (profile.subscriptionTier || 'unknown'));
        return;
      }

      // Get subscription status from backend or fallback
      let activePartnerSubscription = null;
      
      try {
        const statusResponse = await getPartnerSubscriptionStatus();
        console.log('Subscription status response:', statusResponse);
        
        if (statusResponse && statusResponse.subscription) {
          activePartnerSubscription = statusResponse.subscription;
          if (statusResponse.hasActiveSubscription) {
            setSuccessMessage('Your subscription is active! You now have access to all upload features.');
            setTimeout(() => setSuccessMessage(null), 5000);
          }
        }
      } catch (apiErr) {
        console.warn('Subscription status API error (using fallback):', apiErr);
        
        // Fallback: try to get billing history directly
        try {
          const history = await getBillingHistory();
          console.log('Billing history fallback - record count:', history.length);
          
          const now = new Date();
          activePartnerSubscription = history.find(
            (record) => {
              // Must be a completed partner subscription
              if (record.type !== 'subscription' || record.plan !== 'partner' || record.status !== 'completed' || record.provider !== 'paystack') {
                return false;
              }
              // Must not be cancelled
              if (record.cancelledAt) {
                return false;
              }
              // If expiresAt is set, check expiry
              if (record.expiresAt && new Date(record.expiresAt) <= now) {
                return false;
              }
              // Subscription is valid
              return true;
            }
          ) || null;
          
          console.log('Active subscription found:', !!activePartnerSubscription);
        } catch (fallbackErr) {
          console.error('Fallback billing history error:', fallbackErr);
          setError('Unable to load subscription status. Please try refreshing the page or contact support.');
          setLoading(false);
          return;
        }
      }
      
      setActiveSubscription(activePartnerSubscription);

      // Always load full billing history for the history table
      try {
        const history = await getBillingHistory();
        const partnerHistory = history
          .filter((r) => r.plan === 'partner' && r.type === 'subscription')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubscriptionHistory(partnerHistory);
      } catch (histErr) {
        console.warn('Could not load subscription history:', histErr);
      }
    } catch (err) {
      console.error('Unexpected error fetching subscription status:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgradeClick(plan: SubscriptionPlan) {
    try {
      setProcessingPayment(true);
      setError(null);

      const email = userProfile?.email;
      if (!email) {
        throw new Error('Email not found');
      }

      const callbackUrl = `${window.location.origin}/label-dashboard/subscription?payment-complete=true`;

      const response = await initializePaystackPayment({
        email,
        plan: 'partner',
        billingPeriod: plan.period,
        amount: plan.price,
        callbackUrl,
      });

      // Redirect to payment page
      if (response.authorizationUrl) {
        window.location.href = response.authorizationUrl;
      }
    } catch (err) {
      console.error('Error initiating payment:', err);
      setError('Failed to process payment. Please try again.');
      setProcessingPayment(false);
    }
  }

  async function handleCancelSubscription() {
    try {
      setCancellationInProgress(true);
      setError(null);
      await cancelPartnerSubscription();
      setSuccessMessage('Your subscription has been cancelled. You will retain full access to your partner dashboard and all features until the end of your current billing period. Only new release uploads will be restricted once the period ends.');
      setShowCancellationConfirm(false);
      setActiveSubscription(null);
      // Refresh subscription status after a short delay
      setTimeout(() => {
        fetchSubscriptionStatus();
        setSuccessMessage(null);
      }, 2000);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCancellationInProgress(false);
    }
  }

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  /** Determine billing period from a billing record */
  function getActiveBillingPeriod(record: BillingHistoryRecord): 'monthly' {
    if (record.billingPeriod === 'monthly') return 'monthly';
    return 'monthly';
  }

  /** Calculate subscription expiry date from a billing record */
  function getSubscriptionExpiry(record: BillingHistoryRecord): Date {
    if (record.expiresAt) return new Date(record.expiresAt);
    const base = new Date(record.paidAt || record.createdAt);
    base.setDate(base.getDate() + 30);
    return base;
  }

  /** Days remaining in current subscription */
  function getDaysRemaining(record: BillingHistoryRecord): number {
    const expiry = getSubscriptionExpiry(record);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader className="animate-spin text-[#FF6B00]" />
          <span className="text-[#B3B3B3]">Loading subscription status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Partner Subscription</h1>
          <p className="text-[#B3B3B3]">
            Manage your partner subscription and billing
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-900/50 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mr-3" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-green-900/20 border border-green-900/50 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-400 flex-shrink-0 mr-3" />
            <span className="text-green-200">{successMessage}</span>
          </div>
        )}

        {/* Active Subscription Status */}
        {activeSubscription && (
          <div className="mb-8 p-6 rounded-lg border border-green-900/50 bg-green-900/20">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-400 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Active Subscription</h3>
                  <p className="text-green-200">
                    Your subscription is active and you have full access to upload and all partner features.
                  </p>
                </div>
              </div>
              <Badge className="bg-green-900 text-green-100 border-green-700">Active</Badge>
            </div>

            {/* Subscription Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-black/30 rounded-lg">
              <div>
                <span className="text-green-300 text-sm font-medium">Plan Type:</span>
                <p className="text-white mt-1">{activeSubscription.plan === 'partner' ? 'Partner Plan' : 'Professional Plan'}</p>
              </div>
              <div>
                <span className="text-green-300 text-sm font-medium">Billing Amount:</span>
                <p className="text-white mt-1 text-lg font-semibold">{formatPrice(activeSubscription.amount)}</p>
              </div>
              <div>
                <span className="text-green-300 text-sm font-medium">Payment Date:</span>
                <p className="text-white mt-1">{formatDate(activeSubscription.paidAt)}</p>
              </div>
              <div>
                <span className="text-green-300 text-sm font-medium">Transaction Reference:</span>
                <p className="text-white mt-1 font-mono text-sm">{activeSubscription.reference}</p>
              </div>
              <div>
                <span className="text-green-300 text-sm font-medium">Payment Status:</span>
                <div className="mt-1">
                  <Badge className="bg-green-900 text-green-100 border-green-700 capitalize">{activeSubscription.status}</Badge>
                </div>
              </div>
              <div>
                <span className="text-green-300 text-sm font-medium">Payment Provider:</span>
                <p className="text-white mt-1 capitalize">{activeSubscription.provider}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate('/label-dashboard/payment-history')}
                className="flex items-center gap-2 bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 text-[#FF6B00] border border-[#FF6B00]/50"
              >
                <FileText className="h-4 w-4" />
                View Payment History
              </Button>
              <Button
                onClick={() => setShowCancellationConfirm(true)}
                className="flex items-center gap-2 bg-red-900/20 hover:bg-red-900/30 text-red-300 border border-red-900/50"
              >
                <Trash2 className="h-4 w-4" />
                Cancel Subscription
              </Button>
            </div>


            {/* Cancellation Confirmation Dialog */}
            {showCancellationConfirm && (
              <div className="mt-6 p-4 rounded-lg bg-orange-900/20 border border-orange-900/50">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Cancel Subscription?</h4>
                    <p className="text-orange-200 text-sm mb-4">
                      After cancellation, you will retain full access to your partner dashboard and all its features until the end of your current billing period. Only the ability to upload new releases will be restricted once your billing period ends. You can resubscribe anytime to restore upload access.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleCancelSubscription}
                        disabled={cancellationInProgress}
                        className="bg-red-900 hover:bg-red-800 text-white"
                      >
                        {cancellationInProgress ? 'Cancelling...' : 'Yes, Cancel Subscription'}
                      </Button>
                      <Button
                        onClick={() => setShowCancellationConfirm(false)}
                        disabled={cancellationInProgress}
                        className="bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 text-[#FF6B00] border border-[#FF6B00]/50"
                      >
                        Keep Subscription
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscription History Table */}
        {subscriptionHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#FF6B00]" />
              Subscription History
            </h2>
            <div className="rounded-lg border border-[#FF6B00]/20 bg-[#161616] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#FF6B00]/10 bg-black/30">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">Plan</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">Billing Period</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">Amount</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#B3B3B3]">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FF6B00]/10">
                    {subscriptionHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4 text-white whitespace-nowrap">
                          {formatDate(record.paidAt || record.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30">
                            Partner Plan
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#B3B3B3] capitalize">
                          {record.billingPeriod ?? 'Monthly'}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-white">
                          {formatPrice(record.amount)}
                        </td>
                        <td className="px-5 py-4">
                          {record.cancelledAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-orange-900/30 text-orange-300 border border-orange-800/50">Cancelled</span>
                          ) : record.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
                              <Check className="h-3 w-3" /> Paid
                            </span>
                          ) : record.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-yellow-900/30 text-yellow-300 border border-yellow-800/50">Pending</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-red-900/30 text-red-300 border border-red-800/50">Failed</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-[#B3B3B3]">
                          {record.reference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* No Subscription Warning */}
        {!activeSubscription && (
          <div className="mb-8 p-6 rounded-lg bg-orange-900/20 border border-orange-900/50">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-200 font-semibold text-lg">No active subscription</p>
                <p className="text-orange-200/80 text-sm mt-2">
                  Subscribe to a plan below to unlock unlimited uploads and access all partner features. Once payment is successful, you'll immediately have access to the Upload menu.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          {PARTNER_PLANS.map((plan) => {
            const isActiveMatch = !!activeSubscription && getActiveBillingPeriod(activeSubscription) === plan.period;
            return (
            <Card
              key={plan.id}
              className="relative bg-[#161616] border-2 transition-all border-[#FF6B00]/20 hover:border-[#FF6B00]/40"
            >
              {plan.recommended && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Badge className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-black border-0">
                    Recommended
                  </Badge>
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-4xl font-bold text-[#FF6B00]">{formatPrice(plan.price)}</span>
                    <span className="text-[#B3B3B3]">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-[#B3B3B3] mb-3">{plan.billingCycle}</p>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-[#FF6B00] flex-shrink-0 mt-0.5" />
                      <span className="text-[#B3B3B3] text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handleUpgradeClick(plan)}
                  disabled={processingPayment || isActiveMatch}
                  className="w-full bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 text-[#FF6B00] border border-[#FF6B00]/50"
                >
                  {isActiveMatch
                    ? 'Current Plan'
                    : processingPayment
                      ? 'Processing...'
                      : 'Subscribe Now'}
                </Button>
              </div>
            </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#161616] rounded-lg border border-[#FF6B00]/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <div>
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#FF6B00]" />
                How does billing work?
              </h4>
              <p className="text-[#B3B3B3] text-sm ml-7">
                Monthly subscriptions renew every 30 days, and yearly subscriptions renew every 365 days.
                You'll receive an email reminder before each renewal.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#FF6B00]" />
                Can I cancel my subscription?
              </h4>
              <p className="text-[#B3B3B3] text-sm ml-7">
                Yes, you can cancel your subscription anytime from the subscription management page. Your access will remain active until the end of your current billing period. You can resubscribe anytime to regain access to partner features.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#FF6B00]" />
                What happens after I subscribe?
              </h4>
              <p className="text-[#B3B3B3] text-sm ml-7">
                Your subscription will be activated immediately after successful payment. You'll have instant
                access to the upload feature and all partner dashboard features.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#FF6B00]" />
                Is my payment secure?
              </h4>
              <p className="text-[#B3B3B3] text-sm ml-7">
                Yes! We use Paystack, a PCI-DSS compliant payment processor, to handle all transactions
                securely. Your payment information is never stored on our servers.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#FF6B00]/10">
            <p className="text-[#B3B3B3] text-sm">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@amtdistro.com" className="text-[#FF6B00] hover:underline">
                support@amtdistro.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
