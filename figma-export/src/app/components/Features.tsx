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
    <section id="features" className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-12 text-center">
          <p className="landing-section-kicker">Core capabilities</p>
          <h2 className="text-4xl mb-4 text-white font-bold">
            {t('features.title', 'Everything You Need to Succeed')}
          </h2>
          <p className="text-xl text-[#B3B3B3] max-w-2xl mx-auto">
            {t('features.subtitle', 'Professional music distribution made simple. Focus on creating while we handle the rest.')}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.titleKey} className="landing-stagger-item landing-feature-card bg-[#161616] border-[#FF6B00]/20 p-6 transition-all hover:shadow-lg hover:shadow-[#FF6B00]/20">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFD600] shadow-[0_12px_30px_rgba(255,107,0,0.18)]">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-white">{t(feature.titleKey, feature.titleFb)}</h3>
                <p className="text-sm leading-6 text-[#B3B3B3]">{t(feature.descKey, feature.descFb)}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}