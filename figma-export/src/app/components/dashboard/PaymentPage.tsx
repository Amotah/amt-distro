import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CreditCard, Lock, ArrowLeft, Shield, AlertCircle, CheckCircle, Megaphone } from 'lucide-react';
import { getCurrentUserProfile } from '../../utils/user-api';
import { initializePaystackPayment, validateCoupon, type BillingPlan, type BillingPeriod } from '../../utils/payment-api';
import { Tag, X } from 'lucide-react';

interface CheckoutPlanMeta {
  name: string;
  billingCycle: string;
  nextBillingDate: string;
}

const PLAN_CONFIG: Record<BillingPlan, Record<BillingPeriod, CheckoutPlanMeta>> = {
  artist: {
    monthly: { name: 'Artist', billingCycle: 'Per Release', nextBillingDate: 'Per submission' },
    yearly: { name: 'Artist', billingCycle: 'Per Release', nextBillingDate: 'Per submission' },
  },
  super_artist: {
    monthly: { name: 'Super Artist', billingCycle: 'Per Release', nextBillingDate: 'Per submission' },
    yearly: { name: 'Super Artist', billingCycle: 'Per Release', nextBillingDate: 'Per submission' },
  },
  partner: {
    monthly: { name: 'Partner', billingCycle: 'Monthly', nextBillingDate: 'Every 30 days' },
    yearly: { name: 'Partner', billingCycle: 'Yearly', nextBillingDate: 'Every 365 days' },
  },
  promotion: {
    monthly: { name: 'Promotion Campaign', billingCycle: 'One-time', nextBillingDate: 'N/A' },
    yearly: { name: 'Promotion Campaign', billingCycle: 'One-time', nextBillingDate: 'N/A' },
  },
  release: {
    monthly: { name: 'Release Distribution', billingCycle: 'Per Release', nextBillingDate: 'N/A' },
    yearly: { name: 'Release Distribution', billingCycle: 'Per Release', nextBillingDate: 'N/A' },
  },
};

const PROMOTION_FEATURES_BY_AMOUNT: Record<number, string[]> = {
  30000: [
    'Playlist pitching submissions',
    'Social posting framework',
    'Press release copy',
    'Promotional graphics package',
  ],
  40000: [
    'Everything in 1-week campaign',
    'Online blog outreach',
    'Promotional video (30 seconds)',
    'Extended graphics package',
  ],
  100000: [
    'Everything in 2-weeks campaign',
    'Paid ad campaign optimization',
    'Promotional videos and banners',
    'Weekly reporting and support',
  ],
};

function parsePlan(plan: unknown): BillingPlan {
  if (plan === 'super_artist') return 'super_artist';
  if (plan === 'partner') return 'partner';
  if (plan === 'promotion') return 'promotion';
  if (plan === 'release') return 'release';
  return 'artist';
}

function getPlanFeatures(selectedPlan: BillingPlan, amount: number) {
  if (selectedPlan === 'promotion') {
    return PROMOTION_FEATURES_BY_AMOUNT[amount] || [
      'Promotion strategy and planning',
      'Creative asset delivery',
      'Campaign reporting',
      'Priority support',
    ];
  }

  if (selectedPlan === 'partner') {
    return [
      '5 releases/month included',
      '5 artist accounts included',
      'Label dashboard & roster management',
      'SplitShare and payout workflows',
      'Priority partner support',
    ];
  }

  if (selectedPlan === 'super_artist') {
    return [
      'Priority distribution (1–2 business days)',
      'Advanced analytics & audience insights',
      'Revenue forecasting',
      'Pre-save campaign builder',
      'Priority support',
    ];
  }

  if (selectedPlan === 'release') {
    return [
      'Single release distribution',
      'Distribution to all major platforms',
      '100% royalty retention',
      'Streaming analytics',
    ];
  }

  return [
    'Advanced analytics',
    'Priority distribution',
    'Marketing tools',
    'Priority support',
  ];
}

interface PaymentState {
  plan?: BillingPlan;
  amount?: number;
  billingPeriod?: BillingPeriod;
  promotionId?: string;
  promotionPlanName?: string;
  releaseTitle?: string;
}

export function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as PaymentState | null) || null;
  const { plan, amount, billingPeriod, promotionId, promotionPlanName, releaseTitle } = state || { plan: 'artist', amount: 20000, billingPeriod: 'monthly' };
  const selectedPlan = useMemo(() => parsePlan(plan), [plan]);
  const selectedBillingPeriod: BillingPeriod = billingPeriod === 'yearly' ? 'yearly' : 'monthly';
  const selectedPlanMeta = PLAN_CONFIG[selectedPlan][selectedBillingPeriod];
  const isPromotionCheckout = selectedPlan === 'promotion';
  const amountValue = typeof amount === 'number' && Number.isFinite(amount)
    ? amount
    : isPromotionCheckout
      ? 30000
      : selectedPlan === 'partner'
      ? 40000
      : selectedPlan === 'super_artist'
      ? 25000
      : 15000;
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const dashboardBasePath = isLabelDashboard ? '/label-dashboard' : '/dashboard';
  const planFeatures = getPlanFeatures(selectedPlan, amountValue);

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'paystack'>('paystack');
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    email: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [reviewStepUnlocked, setReviewStepUnlocked] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponDescription, setCouponDescription] = useState('');
  const [couponError, setCouponError] = useState('');

  const couponScope = selectedPlan === 'promotion' ? 'promotion' : selectedPlan === 'release' ? 'release' : 'subscription';

  const finalAmount = couponApplied ? Math.round(amountValue * (1 - couponDiscount / 100)) : amountValue;

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponValidating(true);
    setCouponError('');
    try {
      const result = await validateCoupon(code, couponScope);
      if (result.valid) {
        setCouponCode(code);
        setCouponDiscount(result.discountPercent);
        setCouponDescription(result.description || `${result.discountPercent}% discount applied`);
        setCouponApplied(true);
      } else {
        setCouponApplied(false);
        setCouponCode('');
        setCouponDiscount(0);
        setCouponDescription('');
        setCouponError(result.error || 'Invalid or expired coupon code');
      }
    } catch {
      setCouponError('Could not validate coupon. Please try again.');
    } finally {
      setCouponValidating(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponInput('');
    setCouponCode('');
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponDescription('');
    setCouponError('');
  }

  useEffect(() => {
    let active = true;

    async function fillEmail() {
      try {
        const profile = await getCurrentUserProfile();
        if (!active || !profile.email) {
          return;
        }

        setFormData((current) => (
          current.email ? current : { ...current, email: profile.email }
        ));
      } catch {
        // Leave manual email entry available if profile loading fails.
      }
    }

    fillEmail();

    return () => {
      active = false;
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentError('');
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    if (!isPromotionCheckout && paymentMethod !== 'paystack') {
      setPaymentError('Paystack is the configured payment gateway for this checkout. Please select Paystack to continue.');
      return;
    }

    if (isPromotionCheckout && !promotionId) {
      setPaymentError('Promotion checkout session is incomplete. Please return to Promotion and start again.');
      return;
    }

    if (!formData.email.trim()) {
      setPaymentError('Email address is required to start Paystack checkout.');
      return;
    }

    if (!termsAccepted) {
      setPaymentError('Please accept the transaction terms before continuing.');
      return;
    }

    if (!reviewStepUnlocked) {
      setReviewStepUnlocked(true);
      return;
    }

    setIsProcessing(true);

    try {
      const callbackPath = isLabelDashboard ? '/label-dashboard/payment/callback' : '/dashboard/payment/callback';
      const callbackQuery = isPromotionCheckout && promotionId
        ? `?promotionId=${encodeURIComponent(promotionId)}`
        : '';
      const callbackUrl = `${window.location.origin}${callbackPath}${callbackQuery}`;

      let result;
      try {
        result = await initializePaystackPayment({
          email: formData.email.trim(),
          plan: selectedPlan,
          amount: finalAmount,
          billingPeriod: selectedBillingPeriod,
          callbackUrl,
          promotionId,
          couponCode: couponApplied ? couponCode : undefined,
        });
      } catch (error) {
        // Some older API deployments only accept artist/label plan values.
        if (!isPromotionCheckout) {
          throw error;
        }

        result = await initializePaystackPayment({
          email: formData.email.trim(),
          plan: 'artist',
          amount: finalAmount,
          billingPeriod: selectedBillingPeriod,
          callbackUrl,
          promotionId,
          couponCode: couponApplied ? couponCode : undefined,
        });
      }

      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to start Paystack checkout.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(isPromotionCheckout ? `${dashboardBasePath}/promotion` : -1)}
          className="flex items-center gap-2 text-[#B3B3B3] hover:text-white mb-8 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          {isPromotionCheckout ? 'Back to Promotion' : 'Back to Plans'}
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#FF6B00]/20 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <h2 className="text-2xl font-bold text-white">Payment Details</h2>
              </div>

              {isPromotionCheckout ? (
                <div className="mb-6 rounded-xl border border-[#FF6B00]/25 bg-[#FF6B00]/8 p-4">
                  <div className="flex items-start gap-3">
                    <Megaphone className="mt-0.5 h-5 w-5 text-[#FF6B00]" />
                    <div>
                      <p className="text-sm font-semibold text-white">Promotion Campaign Checkout</p>
                      <p className="text-xs text-[#B3B3B3] mt-1">
                        {promotionPlanName || selectedPlanMeta.name}
                        {releaseTitle ? ` for ${releaseTitle}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#B3B3B3] mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    disabled={isPromotionCheckout}
                    className={`p-4 rounded-xl border-2 transition ${
                      paymentMethod === 'card'
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                        : 'border-gray-700 hover:border-gray-600'
                    } ${isPromotionCheckout ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <CreditCard className="w-6 h-6 text-white mx-auto mb-2" />
                    <p className="text-sm text-white">Card</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('bank')}
                    disabled={isPromotionCheckout}
                    className={`p-4 rounded-xl border-2 transition ${
                      paymentMethod === 'bank'
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                        : 'border-gray-700 hover:border-gray-600'
                    } ${isPromotionCheckout ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Shield className="w-6 h-6 text-white mx-auto mb-2" />
                    <p className="text-sm text-white">Bank</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('paystack')}
                    className={`p-4 rounded-xl border-2 transition ${
                      paymentMethod === 'paystack'
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <Lock className="w-6 h-6 text-white mx-auto mb-2" />
                    <p className="text-sm text-white">Paystack</p>
                  </button>
                </div>
              </div>

              {paymentError ? (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 p-4 text-sm text-[#FFD3D3]">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#FF6B6B]" />
                  <span>{paymentError}</span>
                </div>
              ) : null}

              {/* Payment Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#B3B3B3] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-xl text-white placeholder-[#B3B3B3] focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition"
                  />
                </div>

                {!isPromotionCheckout && paymentMethod === 'card' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#B3B3B3] mb-2">
                        Card Number
                      </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        required
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-xl text-white placeholder-[#B3B3B3] focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#B3B3B3] mb-2">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        required
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-xl text-white placeholder-[#B3B3B3] focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-2">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleInputChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-xl text-white placeholder-[#B3B3B3] focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-2">
                          CVV
                        </label>
                        <input
                          type="text"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleInputChange}
                          placeholder="123"
                          maxLength={3}
                          required
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-xl text-white placeholder-[#B3B3B3] focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition"
                        />
                      </div>
                    </div>
                  </>
                )}

                {!isPromotionCheckout && paymentMethod === 'bank' && (
                  <div className="bg-[#0A0A0A] border border-gray-700 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4">Bank Transfer Details</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#B3B3B3]">Bank Name:</span>
                        <span className="text-white font-medium">GTBank</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#B3B3B3]">Account Number:</span>
                        <span className="text-white font-medium">0123456789</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#B3B3B3]">Account Name:</span>
                        <span className="text-white font-medium">AMT DISTRO</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#B3B3B3]">Amount:</span>
                        <span className="text-white font-medium">₦{amountValue.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-[#B3B3B3] text-xs mt-4">
                      Please use your email as the transfer reference
                    </p>
                  </div>
                )}

                {paymentMethod === 'paystack' && (
                  <div className="bg-[#0A0A0A] border border-gray-700 rounded-xl p-6 text-center">
                    <Lock className="w-12 h-12 text-[#FFD600] mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-2">Paystack Payment</h3>
                    <p className="text-[#B3B3B3] text-sm mb-4">
                      You will be redirected to Paystack to complete your payment securely.
                    </p>
                    <p className="text-xs text-[#B3B3B3]">
                      {isPromotionCheckout
                        ? 'Promotion campaigns are processed as one-time payments via Paystack.'
                        : 'Card and bank options in this screen are informational only. The live checkout is handled through Paystack.'}
                    </p>
                  </div>
                )}

                {/* Coupon Code Input */}
                <div className="rounded-xl border border-dashed border-gray-600 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-[#FF6B00]" />
                    <span className="text-sm font-medium text-[#B3B3B3]">Coupon Code</span>
                  </div>
                  {couponApplied ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2">
                      <div>
                        <span className="text-green-400 font-semibold text-sm">{couponCode}</span>
                        <p className="text-green-300 text-xs mt-0.5">{couponDescription}</p>
                      </div>
                      <button type="button" onClick={handleRemoveCoupon} title="Remove coupon" className="text-[#B3B3B3] hover:text-white ml-3 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-[#B3B3B3] text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]/30 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponValidating || !couponInput.trim()}
                        className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-medium hover:bg-[#FF8C00] transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {couponValidating ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {couponError}
                    </p>
                  )}
                </div>

                {reviewStepUnlocked ? (
                  <div className="rounded-xl border border-[#FF6B00]/30 bg-[#FF6B00]/8 p-4">
                    <p className="text-sm font-semibold text-white">Transaction Review</p>
                    <p className="mt-1 text-xs text-[#B3B3B3]">Confirm the details below before redirecting to Paystack.</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between text-[#D6D6D6]"><span>Plan</span><span className="font-medium text-white">{promotionPlanName || selectedPlanMeta.name}</span></div>
                      <div className="flex items-center justify-between text-[#D6D6D6]"><span>Billing</span><span className="font-medium text-white">{selectedPlanMeta.billingCycle}</span></div>
                      <div className="flex items-center justify-between text-[#D6D6D6]"><span>Payment Method</span><span className="font-medium text-white">Paystack</span></div>
                      <div className="flex items-center justify-between border-t border-[#FF6B00]/20 pt-2 text-[#D6D6D6]"><span>Total</span><span className="text-base font-semibold text-[#FFD600]">₦{finalAmount.toLocaleString()}</span></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewStepUnlocked(false)}
                      className="mt-3 text-xs text-[#FF6B00] hover:underline"
                    >
                      Edit review
                    </button>
                  </div>
                ) : null}

                <label className="flex items-start gap-2 rounded-xl border border-gray-700 bg-[#0A0A0A] p-3 text-sm text-[#B3B3B3]">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-transparent text-[#FF6B00]"
                  />
                  <span>I confirm this order summary is correct and I authorize AMTDISTRO to continue to Paystack checkout.</span>
                </label>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-[#FF6B00] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#FF8C00] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      {reviewStepUnlocked ? `Confirm & Continue to Paystack (₦${finalAmount.toLocaleString()})` : 'Review Transaction'}
                    </>
                  )}
                </button>
              </form>

              {/* Security Note */}
              <div className="flex items-center gap-2 mt-6 text-sm text-[#B3B3B3]">
                <Shield className="w-4 h-4 text-[#1DB954]" />
                <span>Secured by 256-bit SSL encryption</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 sticky top-6">
              <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>

              <div className="space-y-4 mb-6">
                <div className="bg-[#0A0A0A] rounded-xl p-4">
                  <p className="text-[#B3B3B3] text-sm mb-1">Plan</p>
                  <p className="text-white font-semibold">{promotionPlanName || selectedPlanMeta.name}</p>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl p-4">
                  <p className="text-[#B3B3B3] text-sm mb-1">Billing Cycle</p>
                  <p className="text-white font-semibold">{selectedPlanMeta.billingCycle}</p>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl p-4">
                  <p className="text-[#B3B3B3] text-sm mb-1">{isPromotionCheckout ? 'Campaign' : 'Next Billing Date'}</p>
                  <p className="text-white font-semibold">{isPromotionCheckout ? (releaseTitle || 'Promotion campaign') : selectedPlanMeta.nextBillingDate}</p>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-[#B3B3B3]">Subtotal</span>
                  <span className="text-white">₦{amountValue.toLocaleString()}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between mb-2">
                    <span className="text-green-400 text-sm">Coupon ({couponCode})</span>
                    <span className="text-green-400 text-sm">-{couponDiscount}% (−₦{(amountValue - finalAmount).toLocaleString()})</span>
                  </div>
                )}
                <div className="flex justify-between mb-2">
                  <span className="text-[#B3B3B3]">Tax</span>
                  <span className="text-white">₦0</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-4">
                  <span className="text-white">Total</span>
                  <span className="text-[#FFD600]">₦{finalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/10 border border-[#1DB954]/30 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-[#1DB954] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">
                      What you'll get:
                    </p>
                    <ul className="text-[#B3B3B3] text-xs space-y-1">
                      {planFeatures.map((feature) => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
