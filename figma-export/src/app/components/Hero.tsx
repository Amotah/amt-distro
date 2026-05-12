import { Button } from './ui/button';
import { ArrowRight, BarChart3, Play, RadioTower, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../utils/i18n';
import { Logos } from '../../assets/logos';

const HERO_PLATFORMS = [
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
    <section className="relative overflow-hidden bg-[#050505] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,214,0,0.10),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(255,107,0,0.16),transparent_24%),linear-gradient(180deg,#080808_0%,#0b0b0b_48%,#060606_100%)]" />
      <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-[#FF6B00]/12 blur-3xl" />
      <div className="absolute bottom-10 right-[-4rem] h-56 w-56 rounded-full bg-[#FFD600]/10 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 lg:gap-12">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_32px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="grid items-stretch gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/12 px-4 py-2 text-[#FFD27A] backdrop-blur-sm">
                <Play className="h-4 w-4" />
                <span className="text-sm font-medium">{t('hero.badge', 'Trusted by 50,000+ artists worldwide')}</span>
              </div>

              <div className="max-w-2xl">
                <h1 className="text-4xl font-black leading-[0.98] text-white sm:text-5xl lg:text-[4.35rem]">
                  {t('hero.titlePrefix', 'Distribute Your Music to')}{' '}
                  <span className="bg-gradient-to-r from-[#FF6B00] via-[#FF9A3D] to-[#FFD600] bg-clip-text text-transparent">
                    {t('hero.titleHighlight', 'Every Platform')}
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
                  {t('hero.subtitle', 'Get your music on Spotify, Apple Music, Amazon, and 150+ streaming services. Keep 100% of your rights and royalties.')}
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58 sm:text-xs">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">Release operations</span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">Royalty visibility</span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">Promotion support</span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">Rights protection</span>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="group h-12 bg-[#FF6B00] px-8 text-white hover:bg-[#FF6B00]/90"
                  onClick={() => window.location.href = '/get-started'}
                >
                  {t('hero.ctaPrimary', 'Start Distributing')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/20 bg-white/[0.03] text-white hover:bg-white/10"
                  onClick={() => window.location.href = '/promotion#Pricing-promo'}
                >
                  Explore Promotion
                </Button>
              </div>

              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#0B0B0B]/85 px-4 py-4">
                  <div className="text-3xl font-bold text-[#FFD600]">150+</div>
                  <div className="mt-1 text-sm text-white/60">{t('hero.statPlatforms', 'Platforms')}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0B0B0B]/85 px-4 py-4">
                  <div className="text-3xl font-bold text-[#FFD600]">24h</div>
                  <div className="mt-1 text-sm text-white/60">{t('hero.statDistribution', 'Distribution')}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0B0B0B]/85 px-4 py-4">
                  <div className="text-3xl font-bold text-[#FFD600]">100%</div>
                  <div className="mt-1 text-sm text-white/60">{t('hero.statRoyalties', 'Royalties')}</div>
                </div>
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] lg:min-h-full lg:border-l lg:border-t-0">
              <img
                src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80"
                alt="Artist crowd dancing at a concert"
                className="absolute inset-0 h-full w-full object-cover opacity-48"
                loading="eager"
              />
              <video
                className="hero-media-video absolute inset-0 h-full w-full object-cover opacity-62"
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
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.08),rgba(5,5,5,0.78))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,214,0,0.2),transparent_36%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(0,234,255,0.08),transparent_42%)]" />

              <div className="relative flex h-full flex-col justify-end gap-4 p-6 sm:p-8">
                <div className="self-end rounded-2xl border border-white/10 bg-[#0C0C0C]/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md sm:w-[16.5rem]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">This week</div>
                      <div className="mt-2 text-3xl font-bold text-white">₦2.4M</div>
                    </div>
                    <div className="rounded-xl bg-[#FF6B00]/15 p-2 text-[#FFD600]">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600]" />
                  </div>
                  <div className="mt-3 text-sm text-white/62">Revenue, release momentum, and campaign performance in one workflow.</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#101010]/88 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-[#FF6B00]/12 p-2 text-[#FFB45A]">
                        <RadioTower className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">Release Control</div>
                        <div className="text-xs text-white/55">Metadata, scheduling, and approvals</div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-white/70">
                      <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        <span>Spotify delivery</span>
                        <span className="text-[#6EE7B7]">Live</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        <span>Apple Music review</span>
                        <span className="text-[#6EE7B7]">Live</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#101010]/88 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-[#FFD600]/12 p-2 text-[#FFD600]">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">Catalog Protection</div>
                        <div className="text-xs text-white/55">Rights, ownership, and payout clarity</div>
                      </div>
                    </div>
                    <ul className="mt-4 space-y-3 text-sm text-white/72">
                      <li className="flex items-center justify-between"><span>Content ID coverage</span><span className="text-[#6EE7B7]">Active</span></li>
                      <li className="flex items-center justify-between"><span>Royalty ownership</span><span className="text-[#6EE7B7]">100%</span></li>
                      <li className="flex items-center justify-between"><span>Support response</span><span className="text-white">24/7</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/8 bg-[#0C0C0C]/95 px-4 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:px-6">
          <div className="mb-5 flex flex-col gap-2 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">Distribution Network</p>
              <p className="mt-2 text-sm text-[#B3B3B3]">Distribute to all major streaming platforms with one release workflow.</p>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Spotify, Apple Music, YouTube Music, TikTok, Deezer, Audiomack and more</p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-[#FF6B00]/12 bg-[#0D0D0D] px-0 py-6">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#111111] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#111111] to-transparent" />
            <div className="hero-platform-marquee-track flex w-max items-center gap-6 px-6">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center gap-6 pr-6">
                  {HERO_PLATFORMS.map((platform, index) => (
                    <div
                      key={`${copy}-${platform.name}-${index}`}
                      className={`group relative flex h-[128px] w-[236px] shrink-0 items-center justify-center overflow-hidden rounded-3xl border shadow-[0_16px_36px_rgba(0,0,0,0.36)] transition-transform duration-300 hover:-translate-y-1 ${platform.surfaceClassName}`}
                      aria-label={platform.name}
                      title={platform.name}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0))]" />
                      {platform.badge && (
                        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/16 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/92">
                          {platform.badge}
                        </span>
                      )}
                      {platform.logoNode ? (
                        <div className="relative z-10 flex w-full items-center justify-center px-4">
                          {platform.logoNode}
                        </div>
                      ) : (
                        <img
                          src={platform.logo}
                          alt={platform.name}
                          className={`relative z-10 w-auto object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.25)] ${platform.logoClassName || 'h-14 max-w-[78%]'}`}
                          loading="lazy"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}