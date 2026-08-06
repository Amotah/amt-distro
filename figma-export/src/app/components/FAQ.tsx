import { useState } from 'react';
import { Card } from './ui/card';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

const FAQ_KEYS = [
  { qKey: 'faq.q1', qFb: 'How long does it take to distribute my music?', aKey: 'faq.a1', aFb: 'Your music typically goes live on streaming platforms within 2-5 business days after submission. We recommend uploading at least 2 weeks before your release date to ensure everything is processed smoothly.' },
  { qKey: 'faq.q2', qFb: 'Do I keep 100% of my royalties?', aKey: 'faq.a2', aFb: 'Yes! AMT DISTRO allows you to keep 100% of your royalties. We charge a simple subscription fee, but we never take a cut of your earnings from streams and downloads.' },
  { qKey: 'faq.q3', qFb: 'Which platforms do you distribute to?', aKey: 'faq.a3', aFb: 'We distribute to 150+ platforms worldwide including Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, Pandora, Instagram, TikTok, and many more.' },
  { qKey: 'faq.q4', qFb: 'Can I release music for free?', aKey: 'faq.a4', aFb: 'Yes! Our Free plan allows you to release 1 song per year to 50+ platforms at no cost. This is perfect for testing our service or if you\'re just getting started.' },
  { qKey: 'faq.q5', qFb: 'How do I get paid?', aKey: 'faq.a5', aFb: 'Royalties are calculated monthly and paid out to your registered Nigerian bank account once you reach your minimum payout threshold. Payments are processed within 3-5 business days.' },
  { qKey: 'faq.q6', qFb: 'Can I cancel my subscription anytime?', aKey: 'faq.a6', aFb: 'Absolutely! You can cancel your subscription at any time from your account settings. Your music will remain live on all platforms, but you won\'t be able to upload new releases.' },
  { qKey: 'faq.q7', qFb: 'Do you offer music video distribution?', aKey: 'faq.a7', aFb: 'Yes! Our platform includes music video distribution to YouTube, Vevo, and other video platforms. This feature is available on all paid plans.' },
  { qKey: 'faq.q8', qFb: 'What file formats do you accept?', aKey: 'faq.a8', aFb: 'We accept WAV (preferred), FLAC, and high-quality MP3 files (320kbps minimum). For cover art, we accept JPG and PNG files at least 3000x3000 pixels.' },
  { qKey: 'faq.q9', qFb: 'Do you provide ISRC and UPC codes?', aKey: 'faq.a9', aFb: 'Yes, we automatically generate ISRC codes for your tracks and UPC codes for your releases at no extra cost. You can also use your own existing codes if you prefer.' },
  { qKey: 'faq.q10', qFb: 'Can I distribute music for multiple artists?', aKey: 'faq.a10', aFb: 'Yes! Our Label plan is designed for managing multiple artists. You can create separate artist profiles, upload releases for each artist, and manage everything from one dashboard.' },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useLanguage();
  const leftColumnFaqs = FAQ_KEYS.filter((_, index) => index % 2 === 0).map((faq, localIndex) => ({ faq, index: localIndex * 2 }));
  const rightColumnFaqs = FAQ_KEYS.filter((_, index) => index % 2 === 1).map((faq, localIndex) => ({ faq, index: localIndex * 2 + 1 }));

  return (
    <section id="faq" className="relative overflow-hidden bg-gradient-to-b from-[#050505] via-[#0A0A0A] to-[#050505] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#FF6B00]/15 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#FFD600]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-15 translate-x-1/2" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-[#FF6B00]/30 bg-gradient-to-br from-[#FF6B00]/15 to-[#FFD600]/8 shadow-lg shadow-[#FF6B00]/20 mb-6">
            <HelpCircle className="h-7 w-7 text-[#FF6B00]" />
          </div>
          <h2 className="text-4xl mb-4 text-white font-black lg:text-5xl">
            {t('faq.title', 'Frequently Asked Questions')}
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            {t('faq.subtitle', 'Everything you need to know about AMT DISTRO')}
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="grid gap-6 md:grid-cols-2 md:items-start mb-12">
          {/* Left Column */}
          <div className="space-y-4">
            {leftColumnFaqs.map(({ faq, index }) => (
              <div
                key={faq.qKey}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="group cursor-pointer overflow-hidden rounded-xl border border-[#FF6B00]/20 bg-gradient-to-br from-[#0D0D0D]/80 to-[#050505]/90 transition-all duration-300 hover:border-[#FF6B00]/50 hover:shadow-lg hover:shadow-[#FF6B00]/10"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-semibold text-white leading-6 pr-2 group-hover:text-[#FFD600] transition-colors duration-300">
                      {t(faq.qKey, faq.qFb)}
                    </h3>
                    <ChevronDown
                      className={`h-5 w-5 text-[#FF6B00] flex-shrink-0 transition-all duration-300 ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  {openIndex === index && (
                    <div className="mt-5 border-t border-[#FF6B00]/20 pt-5 text-white/80 leading-relaxed text-sm animate-in fade-in duration-300">
                      {t(faq.aKey, faq.aFb)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {rightColumnFaqs.map(({ faq, index }) => (
              <div
                key={faq.qKey}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="group cursor-pointer overflow-hidden rounded-xl border border-[#FF6B00]/20 bg-gradient-to-br from-[#0D0D0D]/80 to-[#050505]/90 transition-all duration-300 hover:border-[#FF6B00]/50 hover:shadow-lg hover:shadow-[#FF6B00]/10"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-semibold text-white leading-6 pr-2 group-hover:text-[#FFD600] transition-colors duration-300">
                      {t(faq.qKey, faq.qFb)}
                    </h3>
                    <ChevronDown
                      className={`h-5 w-5 text-[#FF6B00] flex-shrink-0 transition-all duration-300 ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  {openIndex === index && (
                    <div className="mt-5 border-t border-[#FF6B00]/20 pt-5 text-white/80 leading-relaxed text-sm animate-in fade-in duration-300">
                      {t(faq.aKey, faq.aFb)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support CTA */}
        <div className="rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-r from-[#FF6B00]/10 to-[#FFD600]/5 p-8 text-center backdrop-blur-sm">
          <p className="text-white/80 mb-4 text-lg">{t('faq.stillHave', 'Still have questions?')}</p>
          <p className="text-white/70 mb-6">Get in touch with our support team and we'll help you out.</p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#FF6B00]/40 transition-all duration-300"
          >
            {t('faq.contactSupport', 'Contact our support team')}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}