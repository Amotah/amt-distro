import { Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useLanguage } from '../utils/i18n';

const PLAN_KEYS = [
  {
    id: 'artist',
    nameKey: 'pricing.artist.name', nameFb: 'Go-Artist',
    price: '₦15,000',
    period: 'release',
    descKey: 'pricing.artist.desc', descFb: 'For independent artists getting their music out',
    featureKeys: [
      { key: 'pricing.artist.f1', fb: '150+ platforms' },
      { key: 'pricing.artist.f2', fb: 'Basic analytics' },
      { key: 'pricing.artist.f3', fb: 'Keep 100% royalties' },
      { key: 'pricing.artist.f4', fb: 'ISRC & UPC codes included' },
      { key: 'pricing.artist.f5', fb: 'Dedicated support' },
    ],
    popular: false,
    ctaKey: 'pricing.artist.cta', ctaFb: 'Get Started',
    learnMoreUrl: '/plans/artist',
  },
  {
    id: 'super_artist',
    nameKey: 'pricing.superArtist.name', nameFb: 'Super Artist',
    price: '₦25,000',
    period: 'release',
    descKey: 'pricing.superArtist.desc', descFb: 'For artists ready to grow their audience',
    featureKeys: [
      { key: 'pricing.superArtist.f1', fb: 'All Go-Artist features included' },
      { key: 'pricing.superArtist.f2', fb: 'Advanced analytics' },
      { key: 'pricing.superArtist.f3', fb: 'YouTube Content ID & OAC setup' },
      { key: 'pricing.superArtist.f4', fb: 'Set exact release times' },
      { key: 'pricing.superArtist.f5', fb: 'Social media promotion' },
      { key: 'pricing.superArtist.f6', fb: 'Priority support' },
      { key: 'pricing.superArtist.f7', fb: 'Free Pre-Save Smartlinks for every release' },
    ],
    popular: true,
    ctaKey: 'pricing.superArtist.cta', ctaFb: 'Get Started',
    learnMoreUrl: '/plans/artist',
  },
  {
    id: 'partner',
    nameKey: 'pricing.label.name', nameFb: 'Partner',
    price: '₦40,000',
    period: 'month',
    descKey: 'pricing.label.desc', descFb: 'For labels managing multiple artists',
    featureKeys: [
      { key: 'pricing.label.f1', fb: 'All Super Artist features included' },
      { key: 'pricing.label.f2', fb: '5 releases included per month' },
      { key: 'pricing.label.f3', fb: '5 artist accounts included' },
      { key: 'pricing.label.f4', fb: 'Extra releases at ₦15,000/release after quota' },
      { key: 'pricing.label.f5', fb: 'Label dashboard & roster management' },
      { key: 'pricing.label.f6', fb: 'Multi-artist analytics & earnings visibility' },
      { key: 'pricing.label.f7', fb: 'SplitShare and payout workflows' },
      { key: 'pricing.label.f8', fb: 'Priority support' },
    ],
    popular: false,
    ctaKey: 'pricing.label.cta', ctaFb: 'Get Started',
    learnMoreUrl: '/plans/partner',
  },
];

interface PricingProps {
  onSelectPlan: (planId: string) => void;
}

export function Pricing({ onSelectPlan }: PricingProps) {
  const { t } = useLanguage();

  return (
    <section id="pricing" className="relative overflow-hidden bg-gradient-to-b from-[#0A0A0A] via-[#050505] to-[#0A0A0A] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-[#FF6B00]/15 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-[#FFD600]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-15" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="inline-block mb-4 px-4 py-2 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#FF6B00]">Pricing</p>
          </div>
          <h2 className="text-4xl mb-4 text-white font-black lg:text-5xl">
            {t('pricing.title', 'Simple, Transparent Pricing')}
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            {t('pricing.subtitle', 'Choose the plan that works for you. No hidden fees, no surprises.')}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="mb-12 grid gap-4 rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-br from-[#0D0D0D]/60 to-transparent p-6 md:grid-cols-3 backdrop-blur-sm">
          {[
            { title: 'No hidden cuts', desc: 'You keep your royalty ownership with clear plan pricing.' },
            { title: 'Built to scale', desc: 'Grow from releases to label operations seamlessly.' },
            { title: 'Support included', desc: 'Dedicated help is built into every plan.' },
          ].map((benefit, idx) => (
            <div key={idx} className="rounded-lg border border-[#FF6B00]/10 bg-[#000000]/40 p-4 hover:border-[#FF6B00]/30 transition-all">
              <div className="text-sm font-bold uppercase tracking-widest text-[#FF6B00] mb-2">{benefit.title}</div>
              <div className="text-white/70 text-sm">{benefit.desc}</div>
            </div>
          ))}
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3 md:auto-rows-max">
          {PLAN_KEYS.map((plan) => (
            <div
              key={plan.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-500 ${
                plan.popular
                  ? 'md:scale-105 border-2 border-[#FFD600] bg-gradient-to-br from-[#1A0F05]/90 to-[#0D0D0D]/90 shadow-2xl shadow-[#FFD600]/20'
                  : 'border border-[#FF6B00]/20 bg-gradient-to-br from-[#0D0D0D]/80 to-[#050505]/80 hover:border-[#FF6B00]/50 hover:shadow-xl hover:shadow-[#FF6B00]/10'
              }`}
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white text-xs font-bold uppercase tracking-widest shadow-lg z-10">
                  {t('pricing.popular', 'Most Popular')}
                </div>
              )}

              <div className="relative p-8 flex flex-col h-full">
                {/* Header */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{t(plan.nameKey, plan.nameFb)}</h3>
                  <p className="text-white/70">{t(plan.descKey, plan.descFb)}</p>
                </div>

                {/* Price */}
                <div className="mb-8 rounded-xl border border-[#FF6B00]/20 bg-[#000000]/50 p-6 backdrop-blur-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-[#FFD600]">{plan.price}</span>
                    <span className="text-white/60">/{plan.period === 'release' ? t('pricing.period.release', 'release') : t('pricing.period.month', 'month')}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full mb-8 font-semibold rounded-xl h-12 transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white hover:shadow-lg hover:shadow-[#FF6B00]/40'
                      : 'border border-[#FF6B00]/50 bg-transparent text-white hover:bg-[#FF6B00]/10'
                  }`}
                  onClick={() => onSelectPlan(plan.id)}
                >
                  {t(plan.ctaKey, plan.ctaFb)}
                </Button>

                {/* Features List */}
                <div className="space-y-3 mb-8 pb-8 border-b border-[#FF6B00]/20 flex-grow">
                  {plan.featureKeys.map((feature) => (
                    <div key={feature.key} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-[#FF6B00] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-white/80 text-sm">{t(feature.key, feature.fb)}</span>
                    </div>
                  ))}
                </div>

                {/* Learn More Link */}
                <div className="text-center mt-auto">
                  <a
                    href={plan.learnMoreUrl}
                    className="text-sm font-medium text-[#FF6B00] hover:text-[#FFD600] transition-colors underline"
                  >
                    {t('pricing.learnMore', 'Learn More')} →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
