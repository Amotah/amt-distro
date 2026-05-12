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
    <section id="how-it-works" className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="w-full">
        <div className="text-center mb-12">
          <h2 className="text-4xl mb-4 text-white font-bold">
            {t('how.title', 'How It Works')}
          </h2>
          <p className="text-xl text-[#B3B3B3] max-w-2xl mx-auto">
            {t('how.subtitle', 'Get your music out there in three simple steps')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connection Lines */}
          <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[#FF6B00]/20 via-[#FFD600]/20 to-[#FF6B00]/20"></div>

          {STEP_KEYS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.titleKey} className="text-center relative">
                <div className="inline-flex w-32 h-32 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] items-center justify-center mb-6 relative z-10">
                  <div className="w-28 h-28 rounded-full bg-[#0A0A0A] flex items-center justify-center">
                    <Icon className="w-12 h-12 text-[#FF6B00]" />
                  </div>
                </div>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#0A0A0A] border-4 border-[#FF6B00] flex items-center justify-center z-20">
                  <span className="text-[#FFD600] font-bold">{index + 1}</span>
                </div>
                <h3 className="text-2xl mb-3 text-white font-bold">{t(step.titleKey, step.titleFb)}</h3>
                <p className="text-[#B3B3B3]">{t(step.descKey, step.descFb)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}