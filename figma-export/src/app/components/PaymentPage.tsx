import { useState } from 'react';
import { initializePaystackPayment, validateCoupon } from '../utils/payment-api';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  CreditCard,
  Building2,
  Smartphone,
  Check,
  Lock,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

interface PaymentPageProps {
  selectedPlan: {
    name: string;
    price: string;
    period: string;
    id: string;
  };
  onBack: () => void;
  onPaymentComplete: (status: 'success' | 'failed' | 'rejected') => void;
}

const paymentMethods = [
  { id: 'card', name: 'Debit/Credit Card', icon: CreditCard },
  { id: 'bank-transfer', name: 'Bank Transfer', icon: Building2 },
  { id: 'ussd', name: 'USSD', icon: Smartphone },
];

const nigerianBanks = [
  'Access Bank',
  'Citibank',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Globus Bank',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Keystone Bank',
  'Polaris Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'SunTrust Bank',
  'Titan Trust Bank',
  'Union Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
];

export function PaymentPage({ selectedPlan, onBack, onPaymentComplete }: PaymentPageProps) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });
  const [bankTransferData, setBankTransferData] = useState({
    bankName: '',
  });
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponValidating, setCouponValidating] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [couponDescription, setCouponDescription] = useState('');
  const [error, setError] = useState('');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    
    if (name === 'cardNumber') {
      value = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      if (value.length > 19) return;
    }
    
    if (name === 'expiryDate') {
      value = value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      if (value.length > 5) return;
    }
    
    if (name === 'cvv') {
      value = value.replace(/\D/g, '');
      if (value.length > 3) return;
    }

    setCardData({
      ...cardData,
      [name]: value,
    });
  };

  const handlePayment = async () => {
    if (!termsAccepted) {
      setError('Please accept the terms before continuing.');
      return;
    }

    if (!isFreeplan && !reviewConfirmed) {
      setReviewConfirmed(true);
      setError('Please review and confirm your transaction details before checkout.');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      // Only for paid plans
      if (!isFreeplan) {
        const callbackPath = selectedPlan.id === 'partner' ? '/label-dashboard/payment/callback' : '/dashboard/payment/callback';
        const input = {
          email: '',
          plan: selectedPlan.id === 'partner' ? 'partner' : selectedPlan.id === 'super_artist' ? 'super_artist' : 'artist',
          amount: discountedPrice,
          billingPeriod: selectedPlan.period === 'year' ? 'yearly' : selectedPlan.period === 'month' ? 'monthly' : undefined,
          couponCode: couponApplied ? coupon.trim().toUpperCase() : undefined,
          callbackUrl: `${window.location.origin}${callbackPath}`,
        };
        const result = await initializePaystackPayment(input);
        if (result && result.authorizationUrl) {
          window.location.href = result.authorizationUrl;
          return;
        } else {
          setError('Unable to initialize payment. Please try again.');
        }
      } else {
        // Free plan: just complete
        onPaymentComplete('success');
      }
    } catch (e) {
      setError((e && (e as any).message) || 'Payment error.');
    } finally {
      setProcessing(false);
    }
  };

  const isFreeplan = selectedPlan.price === '₦0';

  // Determine the payment scope for coupon validation
  const paymentScope = 'subscription';

  async function handleApplyCoupon() {
    if (!coupon.trim()) return;
    setCouponValidating(true);
    setError('');
    try {
      const result = await validateCoupon(coupon.trim(), paymentScope);
      if (result.valid) {
        setDiscount(result.discountPercent / 100);
        setCouponDescription(result.description || `${result.discountPercent}% discount applied`);
        setCouponApplied(true);
      } else {
        setDiscount(0);
        setCouponApplied(false);
        setCouponDescription('');
        setError(result.error || 'Invalid or expired coupon code');
      }
    } catch {
      setDiscount(0);
      setCouponApplied(false);
      setCouponDescription('');
      setError('Could not validate coupon. Please try again.');
    } finally {
      setCouponValidating(false);
    }
  }

  function handleRemoveCoupon() {
    setCoupon('');
    setCouponApplied(false);
    setDiscount(0);
    setCouponDescription('');
    setError('');
  }

  // Parse price as number
  const basePrice = parseFloat(selectedPlan.price.replace(/[^\d.]/g, ''));
  const discountedPrice = couponApplied ? Math.round(basePrice * (1 - discount)) : basePrice;
  const totalAmount = isFreeplan ? 0 : Math.round(discountedPrice * 1.075);

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl mb-2">Complete Your Payment</h1>
          <p className="text-gray-600">Secure payment to activate your account</p>
          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            {!isFreeplan && (
              <Card className="p-6 mb-6">
                <h2 className="text-2xl mb-6">Select Payment Method</h2>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          paymentMethod === method.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon
                          className={`w-8 h-8 mx-auto mb-2 ${
                            paymentMethod === method.id ? 'text-purple-600' : 'text-gray-600'
                          }`}
                        />
                        <div className="text-sm text-center">{method.name}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Card Payment Form */}
            {paymentMethod === 'card' && !isFreeplan && (
              <Card className="p-6">
                <h3 className="text-xl mb-6">Card Details</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Card Number *</Label>
                    <Input
                      id="cardNumber"
                      name="cardNumber"
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={cardData.cardNumber}
                      onChange={handleCardInputChange}
                      className="mt-2"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardName">Cardholder Name *</Label>
                    <Input
                      id="cardName"
                      name="cardName"
                      type="text"
                      placeholder="John Doe"
                      value={cardData.cardName}
                      onChange={handleCardInputChange}
                      className="mt-2"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate">Expiry Date *</Label>
                      <Input
                        id="expiryDate"
                        name="expiryDate"
                        type="text"
                        placeholder="MM/YY"
                        value={cardData.expiryDate}
                        onChange={handleCardInputChange}
                        className="mt-2"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV *</Label>
                      <Input
                        id="cvv"
                        name="cvv"
                        type="text"
                        placeholder="123"
                        value={cardData.cvv}
                        onChange={handleCardInputChange}
                        className="mt-2"
                        required
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Bank Transfer */}
            {paymentMethod === 'bank-transfer' && !isFreeplan && (
              <Card className="p-6">
                <h3 className="text-xl mb-6">Bank Transfer Details</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bankName">Select Your Bank *</Label>
                    <select
                      id="bankName"
                      name="bankName"
                      title="Select your bank"
                      value={bankTransferData.bankName}
                      onChange={(e) => setBankTransferData({ bankName: e.target.value })}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                      required
                    >
                      <option value="">Choose your bank</option>
                      {nigerianBanks.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Transfer to:</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Bank:</span>{' '}
                        <span className="font-medium">Guaranty Trust Bank</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Account Number:</span>{' '}
                        <span className="font-medium">0123456789</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Account Name:</span>{' '}
                        <span className="font-medium">SoundFlow Payments</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>{' '}
                        <span className="font-medium text-lg">{selectedPlan.price}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    After making the transfer, your account will be activated within 10-15 minutes.
                  </p>
                </div>
              </Card>
            )}

            {/* USSD */}
            {paymentMethod === 'ussd' && !isFreeplan && (
              <Card className="p-6">
                <h3 className="text-xl mb-6">Pay with USSD</h3>
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                    <div className="text-3xl mb-4">*737*50*{selectedPlan.price.replace(/[₦,]/g, '')}#</div>
                    <p className="text-sm text-gray-700 mb-4">Dial this code on your phone to complete payment</p>
                    <div className="text-xs text-gray-600">
                      Available for GTBank, Access Bank, Zenith Bank, and more
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">How to pay:</h4>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Dial the USSD code above from your registered phone number</li>
                      <li>Follow the prompts on your phone</li>
                      <li>Authorize the payment with your PIN</li>
                      <li>Your account will be activated immediately</li>
                    </ol>
                  </div>
                </div>
              </Card>
            )}

            {/* Free Plan Message */}
            {isFreeplan && (
              <Card className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl mb-2">No Payment Required</h3>
                <p className="text-gray-600 mb-6">
                  You've selected the Free plan. Click the button below to activate your account.
                </p>
              </Card>
            )}

            {/* Security Notice */}
            <div className="mt-6 flex items-start gap-3 text-sm text-gray-600">
              <Lock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Secure Payment:</span> Your payment information is encrypted
                and secure. We never store your card details.
              </div>
            </div>

            {/* Terms */}
            <div className="mt-4">
              <div className="flex items-start gap-3">
                <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))} />
                <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                  I agree to the automatic renewal of my subscription and the{' '}
                  <a href="#" className="text-purple-600 hover:underline">
                    Terms of Service
                  </a>
                </label>
              </div>
            </div>

            {!isFreeplan && reviewConfirmed && (
              <Card className="mt-4 border-amber-200 bg-amber-50 p-4">
                <h4 className="font-medium text-amber-900">Transaction Review</h4>
                <p className="mt-1 text-sm text-amber-800">Please confirm these details before you continue to the payment gateway.</p>
                <div className="mt-3 space-y-1.5 text-sm text-amber-900">
                  <div className="flex justify-between"><span>Plan</span><span className="font-medium">{selectedPlan.name}</span></div>
                  <div className="flex justify-between"><span>Billing</span><span className="font-medium">{selectedPlan.period}</span></div>
                  <div className="flex justify-between"><span>Method</span><span className="font-medium">Paystack gateway</span></div>
                  <div className="flex justify-between border-t border-amber-200 pt-2"><span>Total</span><span className="font-semibold">₦{totalAmount.toLocaleString()}</span></div>
                </div>
                <Button variant="ghost" className="mt-2 h-auto p-0 text-amber-800 hover:bg-transparent hover:text-amber-900" onClick={() => setReviewConfirmed(false)}>
                  Edit transaction
                </Button>
              </Card>
            )}

            {/* Payment Button */}
            <Button
              size="lg"
              onClick={handlePayment}
              disabled={processing}
              className="w-full mt-6"
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  {isFreeplan ? 'Activate Account' : reviewConfirmed ? `Confirm & Continue (₦${totalAmount.toLocaleString()})` : 'Review Transaction'}
                </>
              )}
            </Button>
          </div>

            {/* Coupon Input */}
            {!isFreeplan && (
              <div className="mb-6">
                <Label htmlFor="coupon">Coupon Code</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="coupon"
                    placeholder="Enter coupon code"
                    value={coupon}
                    onChange={e => { setCoupon(e.target.value.toUpperCase()); if (couponApplied) handleRemoveCoupon(); }}
                    disabled={couponApplied}
                  />
                  {couponApplied ? (
                    <Button type="button" variant="outline" onClick={handleRemoveCoupon} className="text-red-500 border-red-300 hover:bg-red-50">
                      Remove
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleApplyCoupon} disabled={couponValidating || !coupon.trim()}>
                      {couponValidating ? 'Checking...' : 'Apply'}
                    </Button>
                  )}
                </div>
                {couponApplied && (
                  <div className="flex items-center gap-1.5 text-green-600 text-sm mt-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {couponDescription}
                  </div>
                )}
              </div>
            )}
            {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <h3 className="text-xl mb-6">Order Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Billing Cycle</span>
                  <span className="font-medium">{selectedPlan.period}</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₦{basePrice.toLocaleString()}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between mb-2 text-green-700">
                      <span>Coupon Discount ({coupon})</span>
                      <span>-₦{Math.round(basePrice * discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Tax (VAT 7.5%)</span>
                    <span>
                      {isFreeplan
                        ? '₦0'
                        : `₦${Math.round(discountedPrice * 0.075).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg pt-4 border-t border-gray-200">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">
                      {isFreeplan ? '₦0' : `₦${totalAmount.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    What's Included
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 100% of your royalties</li>
                    <li>• Distribution to 150+ platforms</li>
                    <li>• Advanced analytics</li>
                    <li>• Priority support</li>
                  </ul>
                </div>

                <div className="text-xs text-gray-600 mt-4">
                  By completing this purchase, you agree to automatic renewal. Cancel anytime from
                  your account settings.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
