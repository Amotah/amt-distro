import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Check, Crown, Zap, TrendingUp, Shield, Headphones, Users } from 'lucide-react';
import { getCurrentUserProfile } from '../../utils/user-api';

type SubscriptionTier = 'artist' | 'super_artist' | 'partner';

const TIER_RANK: Record<SubscriptionTier, number> = { artist: 1, super_artist: 2, partner: 3 };

export function UpgradePlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('artist');

  useEffect(() => {
    getCurrentUserProfile()
      .then((p) => setCurrentTier((p.subscriptionTier as SubscriptionTier) || 'artist'))
      .catch(() => {});
  }, []);

  const plans = useMemo(() => {
    const isPartner = currentTier === 'partner';

    function planButtonState(planId: SubscriptionTier) {
      if (currentTier === planId) return { text: 'Current Plan', disabled: true };
      if (isPartner) return { text: 'Already on Partner', disabled: true };
      if (TIER_RANK[currentTier] > TIER_RANK[planId]) return { text: 'Downgrade', disabled: true };
      return { text: `Select ${planId === 'super_artist' ? 'Super Artist' : planId === 'partner' ? 'Partner' : 'Go-Artist'} Plan`, disabled: false };
    }

    return [
    {
      id: 'artist',
      name: 'Go-Artist',
      price: '₦15,000',
      period: 'per release',
      description: 'For independent artists getting their music out.',
      recommended: false,
      features: [
        '150+ platforms',
        'Basic analytics',
        'Keep 100% royalties',
        'ISRC & UPC codes included',
        'Dedicated support',
      ],
      ...planButtonState('artist'),
    },
    {
      id: 'super_artist',
      name: 'Super Artist',
      price: '₦25,000',
      period: 'per release',
      description: 'For artists ready to grow their audience.',
      recommended: true,
      features: [
        'All Go-Artist features',
        'Advanced Analytics',
        'YouTube Content ID & OAC setup',
        'Set exact release times',
        'Social media promotion',
        'Priority support',
        'Free Pre-Save Smartlinks for every release',
      ],
      ...planButtonState('super_artist'),
    },
    {
      id: 'partner',
      name: 'Partner',
      price: '₦40,000',
      period: 'per month',
      description: 'Monthly subscription for labels and collectives managing multiple artists.',
      recommended: false,
      features: [
        '5 releases included per month',
        '5 artist accounts included',
        'Extra releases at ₦15,000/release after quota',
        'Label dashboard & roster management',
        'Multi-artist analytics & earnings visibility',
        'SplitShare and payout workflows',
        'Marketing hub for label services',
        'Priority support for partner labels',
        'All Super Artist features included',
      ],
      ...planButtonState('partner'),
    },
  ];
  }, [currentTier]);

  const handleSelectPlan = (planId: string) => {
    const paymentPath = isLabelDashboard ? '/label-dashboard/payment' : '/dashboard/payment';
    const amounts: Record<string, number> = {
      artist: 15000,
      super_artist: 25000,
      partner: 40000,
    };
    const amount = amounts[planId];
    if (!amount) return;
    navigate(paymentPath, { state: { plan: planId, amount, billingPeriod: 'monthly' } });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-[#B3B3B3] max-w-2xl mx-auto">
            Flexible pricing for every stage of your music journey. Artist and Super Artist plans are per release — pay only when you distribute. Partner is a monthly subscription.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 transition-all duration-300 flex flex-col ${
                plan.recommended
                  ? 'bg-gradient-to-br from-[#FF6B00] to-[#FF8C00] shadow-2xl shadow-[#FF6B00]/30 border-2 border-[#FFD600]'
                  : 'bg-[#1A1A1A] border border-gray-800 hover:border-gray-700'
              }`}
            >
              {/* Recommended Badge */}
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-[#FFD600] text-black px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <Crown className="w-4 h-4" />
                    RECOMMENDED
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className={`text-sm ${plan.recommended ? 'text-white/90' : 'text-[#B3B3B3]'}`}>
                  {plan.description}
                </p>
              </div>

              {/* Pricing */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className={`text-lg ${plan.recommended ? 'text-white/80' : 'text-[#B3B3B3]'}`}>
                    /{plan.period}
                  </span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      plan.recommended ? 'bg-[#161616]/20' : 'bg-[#1DB954]/20'
                    }`}>
                      <Check className={`w-3 h-3 ${plan.recommended ? 'text-white' : 'text-[#1DB954]'}`} />
                    </div>
                    <span className={`text-sm ${plan.recommended ? 'text-white/90' : 'text-[#B3B3B3]'}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => !plan.disabled && handleSelectPlan(plan.id)}
                disabled={plan.disabled}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                  plan.disabled
                    ? 'bg-gray-700 text-[#B3B3B3] cursor-not-allowed opacity-60'
                    : plan.recommended
                    ? 'bg-[#161616] text-[#FF6B00] hover:bg-[#161616]/5 shadow-lg hover:shadow-xl'
                    : 'bg-[#FF6B00] text-white hover:bg-[#FF8C00] shadow-lg hover:shadow-xl'
                }`}
              >
                {plan.text}
              </button>
              {plan.disabled && plan.text === 'Current Plan' && (
                <p className="text-center text-[#B3B3B3] text-sm mt-3">You are currently on this plan</p>
              )}
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-[#FF6B00]" />
            </div>
            <h4 className="text-white font-semibold mb-2">Instant Access</h4>
            <p className="text-[#B3B3B3] text-sm">
              Get immediate access to all premium features upon upgrade
            </p>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-[#1DB954]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-[#1DB954]" />
            </div>
            <h4 className="text-white font-semibold mb-2">Grow Your Career</h4>
            <p className="text-[#B3B3B3] text-sm">
              Advanced tools to help you reach more fans and boost your streams
            </p>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-[#FFD600]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Headphones className="w-6 h-6 text-[#FFD600]" />
            </div>
            <h4 className="text-white font-semibold mb-2">Priority Support</h4>
            <p className="text-[#B3B3B3] text-sm">
              Get help faster with our dedicated priority support team
            </p>
          </div>
        </div>

        {/* Trust footer */}
        <div className="mt-12 text-center">
          <p className="text-[#B3B3B3] mb-4">
            Questions about upgrading? Contact our support team
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-[#B3B3B3]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1DB954]" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#1DB954]" />
              <span>No Hidden Fees</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1DB954]" />
              <span>Partner support available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
