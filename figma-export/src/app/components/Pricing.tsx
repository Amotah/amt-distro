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
    <section id="pricing" className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-12 text-center">
          <p className="landing-section-kicker">Pricing</p>
          <h2 className="text-4xl mb-4 text-white font-bold">
            {t('pricing.title', 'Simple, Transparent Pricing')}
          </h2>
          <p className="text-xl text-[#B3B3B3] max-w-2xl mx-auto">
            {t('pricing.subtitle', 'Choose the plan that works for you. No hidden fees, no surprises.')}
          </p>
        </div>

        <div className="mb-8 grid gap-4 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 text-sm text-white/68 shadow-[0_20px_60px_rgba(0,0,0,0.22)] md:grid-cols-3">
          <div className="landing-stagger-item rounded-2xl border border-white/6 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#FFD600]">No hidden cuts</div>
            <div className="mt-2 text-white">You keep your royalty ownership while using a clear plan structure.</div>
          </div>
          <div className="landing-stagger-item rounded-2xl border border-white/6 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#FFD600]">Built to scale</div>
            <div className="mt-2 text-white">Move from single releases to label operations without changing platforms.</div>
          </div>
          <div className="landing-stagger-item rounded-2xl border border-white/6 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#FFD600]">Support included</div>
            <div className="mt-2 text-white">Operational help is built into the experience, not bolted on later.</div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLAN_KEYS.map((plan) => (
            <Card
              key={plan.id}
              className={`landing-stagger-item landing-pricing-card p-8 relative bg-[#161616] border-[#FF6B00]/20 ${
                plan.popular
                  ? 'border-2 border-[#FFD600] shadow-xl shadow-[#FFD600]/10 md:scale-[1.03]'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white text-sm font-medium">
                  {t('pricing.popular', 'Most Popular')}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl mb-2 text-white font-bold">{t(plan.nameKey, plan.nameFb)}</h3>
                <p className="text-[#B3B3B3]">{t(plan.descKey, plan.descFb)}</p>
              </div>

              <div className="mb-6 rounded-2xl border border-white/8 bg-black/20 p-4">
                <span className="text-5xl text-[#FFD600] font-bold">{plan.price}</span>
                <span className="text-[#B3B3B3]">/{plan.period === 'release' ? t('pricing.period.release', 'release') : t('pricing.period.month', 'month')}</span>
              </div>

              <Button
                className="w-full mb-6 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
                onClick={() => onSelectPlan(plan.id)}
              >
                {t(plan.ctaKey, plan.ctaFb)}
              </Button>

              <ul className="space-y-3 mb-6">
                {plan.featureKeys.map((feature) => (
                  <li key={feature.key} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#1DB954] flex-shrink-0 mt-0.5" />
                    <span className="text-[#B3B3B3]">{t(feature.key, feature.fb)}</span>
                  </li>
                ))}
              </ul>

              <div className="text-center pt-4 border-t border-[#FF6B00]/20">
                <a
                  href={plan.learnMoreUrl}
                  className="text-[#FF6B00] hover:text-[#FFD600] text-sm underline"
                >
                  {t('pricing.learnMore', 'Learn More')}
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
