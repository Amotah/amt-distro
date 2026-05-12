import { Globe, Zap, BarChart3, Lock, Users, Music } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

const CAPABILITIES = [
  {
    icon: Globe,
    title: 'Global Distribution Network',
    description: 'Get your music to 150+ platforms worldwide with one click. Spotify, Apple Music, YouTube, TikTok, and everywhere else your fans listen.',
  },
  {
    icon: Zap,
    title: 'Lightning-Fast Processing',
    description: 'Your music goes live within 2-5 business days. No delays, no complications—just a straightforward path from upload to global release.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track streams, downloads, and revenue across every platform. Get the insights you need to understand what\'s working and grow smarter.',
  },
  {
    icon: Lock,
    title: 'Security & Rights Management',
    description: 'Professional ISRC and UPC code generation. Protect your metadata, manage collaborator splits, and maintain full control of your intellectual property.',
  },
  {
    icon: Users,
    title: 'Team & Label Tools',
    description: 'Scale your roster with professional label management. Onboard artists, approve releases, and track multiple catalogs from one unified dashboard.',
  },
  {
    icon: Music,
    title: '100% Artist-Owned Royalties',
    description: 'Keep every penny your music earns. We make money from transparent subscription fees, never from your royalties or streaming cuts.',
  },
];

export function CoreCapabilities() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#0a0a0a_0%,#0f0d0a_50%,#0a0a0a_100%)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="landing-section-kicker">Platform</p>
          <div className="mb-6 inline-flex rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
            {t('capabilities.badge', 'Core Capabilities')}
          </div>
          <h2 className="max-w-3xl mx-auto text-[2rem] font-bold leading-tight text-white sm:text-[2.35rem] mb-4">
            {t('capabilities.title', 'Everything you need to release, grow, and get paid.')}
          </h2>
          <p className="max-w-2xl mx-auto text-[#B3B3B3] text-base leading-6">
            {t('capabilities.subtitle', 'Built from the ground up to handle professional music distribution with the simplicity independent artists deserve.')}
          </p>
        </div>

        {/* Capabilities Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            return (
              <div
                key={capability.title}
                className="landing-stagger-item group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1410]/80 to-[#0f0d0a]/80 p-7 transition-all duration-300 hover:border-white/20 hover:shadow-[0_24px_48px_rgba(255,107,0,0.12)]"
              >
                {/* Premium background glow on hover */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/0 to-[#FF6B00]/5" />
                  <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF6B00]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="relative z-10">
                  {/* Icon Container */}
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FFD600]/10 shadow-[0_4px_12px_rgba(255,107,0,0.2)] transition-all duration-300 group-hover:h-16 group-hover:w-16 group-hover:shadow-[0_8px_20px_rgba(255,107,0,0.3)]">
                    <Icon className="h-7 w-7 text-[#FF6B00] transition-all duration-300 group-hover:text-[#FFD600] group-hover:scale-110" />
                  </div>

                  {/* Title */}
                  <h3 className="mb-3 text-lg font-semibold text-white transition-colors duration-300 group-hover:text-white">
                    {capability.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm leading-6 text-[#B3B3B3] transition-colors duration-300 group-hover:text-white/80">
                    {capability.description}
                  </p>

                  {/* Accent line */}
                  <div className="mt-6 h-1 w-0 bg-gradient-to-r from-[#FF6B00] to-[#FFD600] transition-all duration-300 group-hover:w-12" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
