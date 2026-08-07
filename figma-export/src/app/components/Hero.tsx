import { Button } from './ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { useLanguage } from '../utils/i18n';
import { Logos } from '../../assets/logos';

interface HeroPlatform {
  name: string;
  surfaceClassName: string;
  logo?: string;
  logoNode?: React.ReactNode;
  badge?: string;
  logoClassName?: string;
}

const HERO_PLATFORMS: HeroPlatform[] = [
  {
    name: 'YouTube Music',
    logo: '/platform-logos/youtube-music.jpg',
    surfaceClassName: 'bg-[#F21212] border-white/8',
  },
  {
    name: 'Deezer',
    logo: '/platform-logos/deezer.png',
    surfaceClassName: 'bg-[linear-gradient(135deg,#7C2DFF_0%,#A238FF_100%)] border-white/8',
  },
  {
    name: 'Spotify',
    logoNode: Logos.spotify,
    surfaceClassName: 'bg-[#1DB954] border-white/8',
  },
  {
    name: 'Apple Music',
    logo: '/platform-logos/apple-music.jpg',
    surfaceClassName: 'bg-[#FA4A67] border-white/8',
  },
  {
    name: 'Amazon Music',
    logo: '/platform-logos/amazon-music.jpg',
    surfaceClassName: 'bg-[linear-gradient(130deg,#091115_0%,#0E1A20_100%)] border-white/8',
  },
  {
    name: 'iHeart',
    logo: '/platform-logos/iheart.jpg',
    surfaceClassName: 'bg-[#D6003A] border-white/8',
  },
  {
    name: 'Tidal',
    logo: '/platform-logos/tidal.png',
    surfaceClassName: 'bg-[#040404] border-white/10',
  },
  {
    name: 'SoundCloud',
    logo: '/platform-logos/soundcloud.png',
    surfaceClassName: 'bg-[#FF7A00] border-white/8',
  },
  {
    name: 'Pandora',
    logo: '/platform-logos/pandora.jpeg',
    surfaceClassName: 'bg-[#2A6FE4] border-white/8',
  },
  {
    name: 'Boomplay',
    logo: '/platform-logos/boomplay.png',
    surfaceClassName: 'bg-[#FF8C00] border-white/8',
  },
  {
    name: 'Audiomack',
    logo: '/platform-logos/audiomack.jpg',
    surfaceClassName: 'bg-[#F7B500] border-white/8',
  },
  {
    name: 'TikTok',
    logo: '/platform-logos/tiktok.png',
    surfaceClassName: 'bg-[#0D0D0D] border-white/10',
  },
  {
    name: 'Meta',
    logo: '/platform-logos/meta.jpg',
    surfaceClassName: 'bg-[linear-gradient(135deg,#005CE6_0%,#2F86FF_100%)] border-white/8',
  },
  {
    name: 'KKBOX',
    logo: '/platform-logos/kkbox.jpg',
    surfaceClassName: 'bg-[#08A8EA] border-white/8',
  },
  {
    name: 'JOOX',
    logo: '/platform-logos/joox.jpg',
    surfaceClassName: 'bg-[#00B96E] border-white/8',
  },
  {
    name: 'Anghami',
    logo: '/platform-logos/anghami.jpg',
    surfaceClassName: 'bg-[#7D36F5] border-white/8',
  },
  {
    name: 'Napster',
    logo: '/platform-logos/napster-logo.jpg',
    surfaceClassName: 'bg-[linear-gradient(130deg,#461A90_0%,#7C3AED_100%)] border-white/8',
  },
];

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="hero-section relative overflow-hidden bg-gradient-to-b from-[#0A0A0A] via-[#050505] to-[#000000] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-[#FF6B00]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-[#FFD600]/15 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-[#FF6B00]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(255,107,0,0.02)_25%,rgba(255,107,0,0.02)_26%,transparent_27%,transparent_74%,rgba(255,107,0,0.02)_75%,rgba(255,107,0,0.02)_76%,transparent_77%,transparent_100%)] bg-[size:50px_50px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 lg:gap-12">
        {/* Main Hero Panel */}
        <div className="hero-primary-panel overflow-hidden rounded-3xl border border-[#FF6B00]/30 bg-gradient-to-br from-[#0D0D0D]/80 via-[#1A0F05]/50 to-[#050505]/90 shadow-[0_20px_80px_rgba(255,107,0,0.15)] backdrop-blur-xl">
          <div className="grid items-stretch gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
              {/* Badge removed: Watch Video removed to improve mobile fit */}

              {/* Heading */}
              <div className="max-w-2xl">
                <h1 className="hero-title text-4xl font-black leading-tight text-white sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] tracking-tight">
                  {t('hero.titlePrefix', 'Distribute Your Music to')}{' '}
                  <span className="block mt-2 bg-gradient-to-r from-[#FF6B00] via-[#FF9A3D] to-[#FFD600] bg-clip-text text-transparent">
                    {t('hero.titleHighlight', 'Every Platform')}
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-8 text-white/70 sm:text-xl">
                  {t('hero.subtitle', 'Get your music on Spotify, Apple Music, Amazon, and 150+ streaming services. Keep 100% of your rights and royalties.')}
                </p>
              </div>

              {/* CTAs */}
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Button
                  size="lg"
                  className="group h-14 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] px-8 text-white font-semibold rounded-xl shadow-lg shadow-[#FF6B00]/30 hover:shadow-[#FF6B00]/50 hover:scale-105 transition-all duration-300 border border-[#FF6B00]/50"
                  onClick={() => {
                    window.history.pushState({}, '', '/get-started');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  {t('hero.ctaPrimary', 'Start Distributing')}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  className="h-14 border border-[#FF6B00]/50 bg-transparent text-white font-semibold rounded-xl hover:bg-[#FF6B00]/10 hover:border-[#FFD600]/50 transition-all duration-300"
                  onClick={() => {
                    window.history.pushState({}, '', '/promotion#Pricing-promo');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  Explore Promotion
                </Button>
              </div>
            </div>

            {/* Image Side */}
            <div className="relative min-h-[420px] overflow-hidden bg-gradient-to-br from-[#1A0F05]/60 to-[#0D0D0D]/80 lg:min-h-full lg:border-l lg:border-[#FF6B00]/20">
              <img
                src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80"
                alt="Artist crowd dancing at a concert"
                className="absolute inset-0 h-full w-full object-cover opacity-60"
                loading="eager"
              />
              <video
                className="hero-media-video absolute inset-0 h-full w-full object-cover opacity-70"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80"
              >
                <source src="https://videos.pexels.com/video-files/1764375/1764375-hd_1920_1080_24fps.mp4" type="video/mp4" />
                <source src="https://cdn.pixabay.com/video/2022/05/30/118660-715808173_large.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0D0D0D]/40 to-[#0D0D0D]/90" />

              {/* Stats Grid */}
              <div className="absolute inset-0 flex items-end p-6 sm:p-8">
                <div className="hero-media-stats-grid grid w-full gap-3 sm:grid-cols-3">
                  {[
                    { value: '150+', label: t('hero.statPlatforms', 'Platforms') },
                    { value: '24h', label: t('hero.statDistribution', 'Distribution') },
                    { value: '100%', label: t('hero.statRoyalties', 'Royalties') },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[#FF6B00]/30 bg-[#000000]/60 px-4 py-4 text-center backdrop-blur-md hover:border-[#FFD600]/50 hover:bg-[#0D0D0D]/80 transition-all"
                    >
                      <div className="text-3xl font-bold text-[#FFD600]">{stat.value}</div>
                      <div className="mt-1 text-sm text-white/60">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Distribution Section */}
        <div className="rounded-3xl border border-[#FF6B00]/20 bg-gradient-to-br from-[#0D0D0D]/70 to-[#050505]/90 px-6 py-8 shadow-xl backdrop-blur-sm sm:px-8">
          <div className="mb-6 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[#FF6B00]">Global Distribution Network</p>
            <p className="mt-2 text-sm text-white/70">Distribute to all major streaming platforms with one release</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#FF6B00]/10 bg-[#000000]/50 px-6 py-6">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF6B00]/5 to-transparent pointer-events-none" />
            <div className="relative flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {HERO_PLATFORMS.map((platform, index) => (
                <span
                  key={`${platform.name}-${index}`}
                  className="px-3 py-2 text-sm font-medium text-white/80 hover:text-[#FFD600] hover:bg-[#FF6B00]/10 rounded-lg transition-all duration-200 cursor-default"
                  title={platform.name}
                >
                  {platform.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}