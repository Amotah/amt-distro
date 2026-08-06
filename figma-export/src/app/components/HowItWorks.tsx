import { Upload, CheckCircle, Rocket } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

const STEP_KEYS = [
  { icon: Upload, titleKey: 'how.s1.title', titleFb: 'Upload Your Music', descKey: 'how.s1.desc', descFb: 'Upload your tracks in high-quality format along with artwork and metadata.' },
  { icon: CheckCircle, titleKey: 'how.s2.title', titleFb: 'We Review & Approve', descKey: 'how.s2.desc', descFb: 'Our team ensures everything meets platform requirements within 24 hours.' },
  { icon: Rocket, titleKey: 'how.s3.title', titleFb: 'Go Live Everywhere', descKey: 'how.s3.desc', descFb: 'Your music appears on all major streaming platforms and starts earning.' },
];

export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-gradient-to-b from-[#050505] via-[#0A0A0A] to-[#050505] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-[#FF6B00]/15 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#FFD600]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-15 translate-y-1/2" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="inline-block mb-4 px-4 py-2 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#FF6B00]">Simple Process</p>
          </div>
          <h2 className="text-4xl font-black text-white mb-4 lg:text-5xl">
            {t('how.title', 'How It Works')}
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            {t('how.subtitle', 'Get your music out there in three simple steps')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-0 relative">
          {/* Animated Connection Line */}
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-1 bg-gradient-to-r from-[#FF6B00]/20 via-[#FF6B00]/50 to-[#FF6B00]/20 rounded-full" />
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-1 bg-gradient-to-r from-[#FF6B00] via-[#FFD600] to-[#FF6B00] rounded-full animate-pulse" style={{ width: '0%' }} />

          {STEP_KEYS.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === STEP_KEYS.length - 1;
            
            return (
              <div key={step.titleKey} className="relative">
                {/* Arrow Connector (hidden on mobile) */}
                {!isLast && (
                  <div className="hidden md:block absolute -right-4 top-24 w-8 h-0.5 bg-gradient-to-r from-[#FF6B00]/30 to-transparent" />
                )}

                <div className="flex flex-col items-center text-center">
                  {/* Animated Circle Container */}
                  <div className="relative mb-8 flex items-center justify-center">
                    {/* Outer Glow */}
                    <div className="absolute w-40 h-40 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] opacity-0 blur-xl animate-pulse" />
                    
                    {/* Main Circle */}
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] p-1 shadow-lg shadow-[#FF6B00]/50">
                      <div className="w-full h-full rounded-full bg-[#0A0A0A] flex items-center justify-center">
                        <Icon className="w-12 h-12 text-[#FF6B00]" />
                      </div>
                    </div>

                    {/* Step Number Badge */}
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] flex items-center justify-center border-4 border-[#0A0A0A] shadow-lg">
                      <span className="text-white font-bold text-lg">{index + 1}</span>
                    </div>
                  </div>

                  {/* Text Content */}
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {t(step.titleKey, step.titleFb)}
                  </h3>
                  <p className="text-white/70 leading-relaxed max-w-xs">
                    {t(step.descKey, step.descFb)}
                  </p>

                  {/* Animated Underline */}
                  <div className="mt-6 h-1 w-16 bg-gradient-to-r from-[#FF6B00] to-[#FFD600] rounded-full" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-r from-[#FF6B00]/10 to-[#FFD600]/5 p-8 text-center backdrop-blur-sm">
          <p className="text-white/80 mb-4">Ready to get started?</p>
          <a
            href="/get-started"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#FF6B00]/40 transition-all duration-300"
          >
            Begin Your Distribution Journey
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}