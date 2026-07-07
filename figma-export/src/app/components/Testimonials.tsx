import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
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
  },
  {
    quote: 'We moved our label roster here because the workflow is simpler. Artist onboarding, payments, and support all feel built for an actual African music business.',
    name: 'Maya K.',
    role: 'Label Operations Lead',
    metric: '14 artists managed',
    initials: 'MK',
    city: 'Accra, GH',
  },
  {
    quote: 'The paid artist plan gave me structure. I can release consistently, track performance, and stop guessing where the momentum is coming from.',
    name: 'J-Rune',
    role: 'Independent Rap Artist',
    metric: '4 releases delivered this year',
    initials: 'JR',
    city: 'Abuja, NG',
  },
  {
    quote: 'The platform feels direct. No clutter, no vague pricing, no confusion about what happens after upload. That matters when you are scaling a catalog.',
    name: 'Adaobi N.',
    role: 'Catalog Manager',
    metric: '120+ tracks distributed',
    initials: 'AN',
    city: 'Nairobi, KE',
  },
];

export function Testimonials() {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % testimonials.length);
  };

  const activeItem = testimonials[activeIndex];

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,107,0,0.08),_transparent_35%),linear-gradient(180deg,#0f0d0a_0%,#0a0a0a_50%,#0f0d0a_100%)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-12">
          <h2 className="max-w-3xl text-[2rem] font-bold leading-tight text-white sm:text-[2.35rem]">{t('testimonials.title', 'What people are saying about us.')}</h2>
        </div>

        <div className="testimonial-carousel-shell rounded-3xl border border-white/12 bg-[#120f0d]/85 p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">
              {activeIndex + 1} / {testimonials.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="testimonial-carousel-control"
                onClick={goToPrevious}
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="testimonial-carousel-control"
                onClick={goToNext}
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Card
            key={activeItem.name}
            className="testimonial-carousel-card landing-testimonial-card group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1410]/80 to-[#0f0d0a]/80 p-6 text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/0 to-[#FF6B00]/5" />
            </div>

            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] text-sm font-bold text-white shadow-[0_4px_12px_rgba(255,107,0,0.4)]">
                  {activeItem.initials}
                </div>
                <div className="flex items-center gap-1 text-[#FFD600]">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </div>
              <Quote className="mb-4 h-5 w-5 text-[#FF6B00]/70" />
              <p className="text-sm leading-7 text-white/90">{activeItem.quote}</p>
            </div>

            <div className="relative z-10 mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{activeItem.name}</div>
                  <div className="text-xs text-[#B3B3B3]">{activeItem.role}</div>
                  <div className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-[#8D8D8D]">{activeItem.city}</div>
                </div>
                <div className="rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/8 px-3 py-1 text-[10px] font-medium text-[#FFD600] whitespace-nowrap">
                  {activeItem.metric}
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-4 flex items-center justify-center gap-2">
            {testimonials.map((item, index) => (
              <button
                key={item.name}
                type="button"
                aria-label={`Go to testimonial ${index + 1}`}
                className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-8 bg-[#FFD600]' : 'w-2 bg-white/30 hover:bg-white/55'}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}