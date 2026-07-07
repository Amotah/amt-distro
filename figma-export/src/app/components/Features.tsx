import { Globe, DollarSign, BarChart3, Shield, Clock, Headphones } from 'lucide-react';
import { Card } from './ui/card';
import { useLanguage } from '../utils/i18n';

const FEATURE_KEYS = [
  { icon: Globe, titleKey: 'features.f1.title', titleFb: 'Global Distribution', descKey: 'features.f1.desc', descFb: 'Distribute your music to Spotify, Apple Music, Amazon Music, YouTube Music, and 150+ platforms worldwide.' },
  { icon: DollarSign, titleKey: 'features.f2.title', titleFb: '100% Royalties', descKey: 'features.f2.desc', descFb: 'Keep all your earnings. No hidden fees or percentage cuts. You own your music, you keep your money.' },
  { icon: BarChart3, titleKey: 'features.f3.title', titleFb: 'Advanced Analytics', descKey: 'features.f3.desc', descFb: 'Track your streams, revenue, and audience demographics in real-time with detailed insights.' },
  { icon: Shield, titleKey: 'features.f4.title', titleFb: 'Rights Protection', descKey: 'features.f4.desc', descFb: 'Your music is registered and protected. Content ID ensures you get credited for every play.' },
  { icon: Clock, titleKey: 'features.f5.title', titleFb: 'Fast Release', descKey: 'features.f5.desc', descFb: 'Your music goes live in 4-5 days of submission. Schedule releases and manage your catalog effortlessly.' },
  { icon: Headphones, titleKey: 'features.f6.title', titleFb: '24/7 Support', descKey: 'features.f6.desc', descFb: 'Our dedicated team is here to help you succeed. Get answers whenever you need them.' },
];

export function Features() {
  const { t } = useLanguage();

  return (
    <section id="features" className="bg-[radial-gradient(circle_at_top,rgba(255,107,0,0.08),transparent_40%),#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-12 rounded-3xl border border-white/10 bg-gradient-to-br from-[#19120d]/80 to-[#0d0d0d]/90 p-6 text-center sm:p-8">
          <p className="landing-section-kicker">Everything You Need</p>
          <h2 className="mb-3 text-4xl font-extrabold text-white">
            {t('features.title', 'Everything You Need to Succeed')}
          </h2>
          <p className="mx-auto max-w-2xl text-base text-[#B3B3B3] sm:text-lg">
            {t('features.subtitle', 'Professional music distribution made simple. Focus on creating while we handle the rest.')}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.titleKey} className="landing-stagger-item landing-feature-card group border-[#FF6B00]/20 bg-[#161616] p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-[#FF6B00]/20">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFD600] shadow-[0_12px_30px_rgba(255,107,0,0.18)]">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f6f6f]">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="mb-3 text-lg font-bold text-white group-hover:text-[#FFD600]">{t(feature.titleKey, feature.titleFb)}</h3>
                <p className="text-sm leading-6 text-[#B3B3B3]">{t(feature.descKey, feature.descFb)}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}