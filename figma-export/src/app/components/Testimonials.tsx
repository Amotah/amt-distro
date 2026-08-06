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
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0A0A0A] via-[#050505] to-[#0A0A0A] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#FF6B00]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-[#FFD600]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-15" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Section Header */}
        <div className="mb-16">
          <h2 className="max-w-4xl text-4xl font-black leading-tight text-white lg:text-5xl mb-4">
            {t('testimonials.title', 'What people are saying about us.')}
          </h2>
          <p className="text-xl text-white/70 max-w-2xl">
            {t('testimonials.subtitle', 'Join hundreds of artists and labels who trust AMT DISTRO with their music.')}
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="rounded-3xl border border-[#FF6B00]/20 bg-gradient-to-br from-[#0D0D0D]/80 to-[#050505]/90 p-8 backdrop-blur-sm overflow-hidden">
          {/* Header Controls */}
          <div className="mb-8 flex items-center justify-between pb-8 border-b border-[#FF6B00]/20">
            <div className="text-sm font-semibold text-[#FF6B00] uppercase tracking-widest">
              {activeIndex + 1} / {testimonials.length}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goToPrevious}
                className="p-2 rounded-lg border border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/20 hover:border-[#FFD600]/50 transition-all duration-300"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="p-2 rounded-lg border border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/20 hover:border-[#FFD600]/50 transition-all duration-300"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Testimonial Card */}
          <div
            key={activeItem.name}
            className="relative flex min-h-[340px] flex-col justify-between rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-br from-[#0D0D0D]/60 to-[#050505]/80 p-8 overflow-hidden"
          >
            {/* Decorative Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF6B00]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 -translate-y-1/2 translate-x-1/2 transition-opacity duration-500" />

            <div className="relative z-10">
              {/* Top Section */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFD600] text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/40">
                  {activeItem.initials}
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-[#FFD600] text-[#FFD600]" />
                  ))}
                </div>
              </div>

              {/* Quote */}
              <Quote className="mb-4 h-6 w-6 text-[#FF6B00]/60" />
              <p className="text-lg leading-8 text-white/90 mb-4">{activeItem.quote}</p>
            </div>

            {/* Bottom Section */}
            <div className="relative z-10 border-t border-[#FF6B00]/20 pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-bold text-white">{activeItem.name}</div>
                  <div className="text-sm text-white/70 mt-1">{activeItem.role}</div>
                  <div className="mt-2 text-xs uppercase tracking-widest text-[#FF6B00]">{activeItem.city}</div>
                </div>
                <div className="rounded-lg border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-3 py-2 text-xs font-semibold text-[#FFD600] text-center whitespace-nowrap">
                  {activeItem.metric}
                </div>
              </div>
            </div>
          </div>

          {/* Dot Navigation */}
          <div className="mt-8 flex items-center justify-center gap-2">
            {testimonials.map((item, index) => (
              <button
                key={item.name}
                type="button"
                aria-label={`Go to testimonial ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'w-8 h-2 bg-gradient-to-r from-[#FF6B00] to-[#FFD600]'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}