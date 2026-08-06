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
    <section id="features" className="relative overflow-hidden bg-gradient-to-b from-[#0A0A0A] via-[#050505] to-[#0A0A0A] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#FF6B00]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FFD600]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-15" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Section Header */}
        <div className="mb-16 rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-br from-[#0D0D0D]/60 to-transparent p-8 text-center backdrop-blur-sm sm:p-10">
          <div className="inline-block mb-4 px-4 py-2 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#FF6B00]">Why Choose Us</p>
          </div>
          <h2 className="mb-4 text-4xl font-black text-white lg:text-5xl">
            {t('features.title', 'Everything You Need to Succeed')}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/70 sm:text-xl">
            {t('features.subtitle', 'Professional music distribution made simple. Focus on creating while we handle the rest.')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.titleKey}
                className="group relative overflow-hidden rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-br from-[#0D0D0D]/80 via-[#0D0D0D]/50 to-[#050505]/80 p-8 transition-all duration-500 hover:border-[#FF6B00]/50 hover:shadow-lg hover:shadow-[#FF6B00]/20 hover:-translate-y-2"
              >
                {/* Background Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B00]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon and Number */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFD600] shadow-lg shadow-[#FF6B00]/30 group-hover:shadow-[#FFD600]/40 transition-all">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-3xl font-black text-[#FF6B00]/30 group-hover:text-[#FFD600]/50 transition-colors">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="mb-3 text-xl font-bold text-white group-hover:text-[#FFD600] transition-colors">
                    {t(feature.titleKey, feature.titleFb)}
                  </h3>

                  {/* Description */}
                  <p className="text-base leading-7 text-white/70 group-hover:text-white/85 transition-colors">
                    {t(feature.descKey, feature.descFb)}
                  </p>

                  {/* Arrow Icon */}
                  <div className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#FF6B00]/20 bg-[#FF6B00]/5 text-[#FF6B00] opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:translate-x-1">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}