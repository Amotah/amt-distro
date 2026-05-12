import { Quote, Star } from 'lucide-react';
import { Card } from './ui/card';
import { useLanguage } from '../utils/i18n';

const testimonials = [
  {
    quote: 'AMT DISTRO got my first single on major platforms without the usual back-and-forth. The reporting is clean and the release process is fast.',
    name: 'Tomi Ade',
    role: 'Afropop Artist',
    metric: '2.1M streams in 8 months',
    initials: 'TA',
    city: 'Lagos, NG',
    surface: 'Spotify + Apple Music',
  },
  {
    quote: 'We moved our label roster here because the workflow is simpler. Artist onboarding, payments, and support all feel built for an actual African music business.',
    name: 'Maya K.',
    role: 'Label Operations Lead',
    metric: '14 artists managed',
    initials: 'MK',
    city: 'Accra, GH',
    surface: 'Label Operations',
  },
  {
    quote: 'The paid artist plan gave me structure. I can release consistently, track performance, and stop guessing where the momentum is coming from.',
    name: 'J-Rune',
    role: 'Independent Rap Artist',
    metric: '4 releases delivered this year',
    initials: 'JR',
    city: 'Abuja, NG',
    surface: 'Release Strategy',
  },
  {
    quote: 'The platform feels direct. No clutter, no vague pricing, no confusion about what happens after upload. That matters when you are scaling a catalog.',
    name: 'Adaobi N.',
    role: 'Catalog Manager',
    metric: '120+ tracks distributed',
    initials: 'AN',
    city: 'Nairobi, KE',
    surface: 'Catalog Operations',
  },
];

export function Testimonials() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,107,0,0.08),_transparent_35%),linear-gradient(180deg,#0f0d0a_0%,#0a0a0a_50%,#0f0d0a_100%)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-12">
          <div>
            <p className="landing-section-kicker">Proof</p>
            <div className="mb-4 inline-flex rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
              {t('testimonials.badge', 'Testimonials')}
            </div>
            <h2 className="max-w-3xl text-[2rem] font-bold leading-tight text-white sm:text-[2.35rem]">{t('testimonials.title', 'Trusted by artists and labels who need release momentum, not extra friction.')}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#B3B3B3]">
              {t('testimonials.subtitle', 'A fast-moving snapshot of how artists and labels are using the platform in the real world.')}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {testimonials.map((item) => (
            <Card
              key={item.name}
              className="landing-stagger-item landing-testimonial-card group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1410]/80 to-[#0f0d0a]/80 p-6 text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_24px_48px_rgba(255,107,0,0.12)]"
            >
              {/* Premium background glow on hover */}
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/0 to-[#FF6B00]/5" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B00]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] text-sm font-bold text-white shadow-[0_4px_12px_rgba(255,107,0,0.4)] transition-transform duration-300 group-hover:scale-110">
                    {item.initials}
                  </div>
                  <div className="flex items-center gap-1 text-[#FFD600]">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <Quote className="mb-4 h-5 w-5 text-[#FF6B00]/70 transition-colors duration-300 group-hover:text-[#FF6B00]" />
                <p className="text-sm leading-7 text-white/85 transition-colors duration-300 group-hover:text-white">{item.quote}</p>
              </div>

              <div className="relative z-10 mt-6 border-t border-white/10 pt-5 transition-colors duration-300 group-hover:border-white/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <div className="text-xs text-[#B3B3B3]">{item.role}</div>
                    <div className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-[#8D8D8D]">{item.city}</div>
                  </div>
                  <div className="rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/8 px-3 py-1 text-[10px] font-medium text-[#FFD600] whitespace-nowrap transition-colors duration-300 group-hover:border-[#FF6B00]/50 group-hover:bg-[#FF6B00]/12">
                    {item.metric}
                  </div>
                </div>
                <div className="mt-2.5 text-[10px] uppercase tracking-[0.16em] text-[#8D8D8D]">{item.surface}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}