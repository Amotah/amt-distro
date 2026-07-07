import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Shield, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { getCurrentUserProfile } from '../../utils/user-api';
import { cancelPartnerSubscription, getPartnerSubscriptionStatus, type BillingHistoryRecord } from '../../utils/payment-api';

type SubscriptionTier = 'artist' | 'super_artist' | 'partner';

function formatDate(value?: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SubscriptionCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>('artist');
  const [activeSubscription, setActiveSubscription] = useState<BillingHistoryRecord | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const profile = await getCurrentUserProfile();
      const nextTier = (profile.subscriptionTier as SubscriptionTier) || 'artist';
      setTier(nextTier);

      if (nextTier !== 'partner') {
        setActiveSubscription(null);
        return;
      }

      const status = await getPartnerSubscriptionStatus();
      setActiveSubscription(status.hasActiveSubscription ? status.subscription : null);
    } catch (loadError) {
      console.error(loadError);
      setError('Unable to load subscription details right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscription();
  }, []);

  const handleCancel = async () => {
    try {
      setCancelInProgress(true);
      setError(null);
      await cancelPartnerSubscription();
      setSuccessMessage('Subscription cancelled successfully. Access remains available until your current billing period ends.');
      setShowCancelConfirm(false);
      await loadSubscription();
    } catch (cancelError) {
      console.error(cancelError);
      setError('Cancellation failed. Please try again, or contact support if this continues.');
    } finally {
      setCancelInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-xl border border-white/10 bg-[#161616] p-5 text-[#B3B3B3]">
          <Loader2 className="h-5 w-5 animate-spin text-[#FF6B00]" />
          <span>Loading subscription details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616] p-5 md:p-6">
          <h1 className="text-2xl font-bold text-white md:text-3xl">Subscription Center</h1>
          <p className="mt-2 text-sm text-[#B3B3B3]">Review your current plan and manage recurring subscriptions.</p>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-700/40 bg-red-950/20 p-4 text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-green-700/40 bg-green-950/20 p-4 text-green-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {tier !== 'partner' && (
          <section className="rounded-2xl border border-white/10 bg-[#161616] p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Badge className="border border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00] capitalize">{tier.replace('_', ' ')}</Badge>
              <span className="text-sm text-[#B3B3B3]">Current plan</span>
            </div>
            <p className="text-[#E5E5E5]">
              Your current plan is pay-per-release and has no recurring monthly subscription to cancel.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="bg-[#FF6B00] text-white hover:bg-[#FF8C00]" onClick={() => navigate('/dashboard/upgrade-plan')}>
                Upgrade Plan
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => navigate('/dashboard/payment-history')}>
                View Payment History
              </Button>
            </div>
          </section>
        )}

        {tier === 'partner' && (
          <section className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616] p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#FF6B00]" />
                <h2 className="text-xl font-semibold text-white">Partner Subscription</h2>
              </div>
              <Badge className={`${activeSubscription ? 'bg-green-900/40 text-green-200 border-green-700/40' : 'bg-orange-900/40 text-orange-200 border-orange-700/40'} border`}>
                {activeSubscription ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {activeSubscription ? (
              <>
                <div className="grid gap-4 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">Amount</p>
                    <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(activeSubscription.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">Payment Date</p>
                    <p className="mt-1 text-white">{formatDate(activeSubscription.paidAt || activeSubscription.createdAt)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">Reference</p>
                    <p className="mt-1 break-all font-mono text-sm text-white/90">{activeSubscription.reference}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    className="bg-red-900/30 text-red-200 hover:bg-red-900/45 border border-red-700/40"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Subscription
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => navigate('/dashboard/payment-history')}>
                    Payment History
                  </Button>
                </div>

                {showCancelConfirm && (
                  <div className="mt-5 rounded-xl border border-orange-700/40 bg-orange-950/20 p-4">
                    <p className="text-sm text-orange-200">
                      Confirm cancellation? Your partner access remains active until the end of the current billing period.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        className="bg-red-700 text-white hover:bg-red-600"
                        disabled={cancelInProgress}
                        onClick={() => void handleCancel()}
                      >
                        {cancelInProgress ? 'Cancelling...' : 'Yes, Cancel Now'}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        disabled={cancelInProgress}
                        onClick={() => setShowCancelConfirm(false)}
                      >
                        Keep Subscription
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-orange-700/40 bg-orange-950/20 p-4 text-orange-200">
                <p>No active partner subscription found. Subscribe again to restore full partner upload access.</p>
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-[#B3B3B3]">
              <Shield className="mt-0.5 h-5 w-5 text-[#FFD600]" />
              <p>You can cancel at any time from this page. Cancellation takes effect after the current paid period ends.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
