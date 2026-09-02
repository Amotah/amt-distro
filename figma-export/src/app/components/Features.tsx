import { Globe, DollarSign, BarChart3, Shield, Clock, Headphones, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Card } from './ui/card';
import { useLanguage } from '../utils/i18n';
import { useState } from 'react';

const FEATURE_KEYS = [
  { icon: Globe, titleKey: 'features.f1.title', titleFb: 'Global Distribution', descKey: 'features.f1.desc', descFb: 'Distribute your music to Spotify, Apple Music, Amazon Music, YouTube Music, and 150+ platforms worldwide.' },
  { icon: DollarSign, titleKey: 'features.f2.title', titleFb: '100% Royalties', descKey: 'features.f2.desc', descFb: 'Keep all your earnings. No hidden fees or percentage cuts. You own your music, you keep your money.' },
  { icon: BarChart3, titleKey: 'features.f3.title', titleFb: 'Advanced Analytics', descKey: 'features.f3.desc', descFb: 'Track your streams, revenue, and audience demographics in real-time with detailed insights.' },
  { icon: Shield, titleKey: 'features.f4.title', titleFb: 'Rights Protection', descKey: 'features.f4.desc', descFb: 'Your music is registered and protected. Content ID ensures you get credited for every play.' },
  { icon: Clock, titleKey: 'features.f5.title', titleFb: 'Fast Release', descKey: 'features.f5.desc', descFb: 'Your music goes live in 4-5 days of submission. Schedule releases and manage your catalog effortlessly.' },
  { icon: Headphones, titleKey: 'features.f6.title', titleFb: '24/7 Support', descKey: 'features.f6.desc', descFb: 'Our dedicated team is here to help you succeed. Get answers whenever you need them.' },
];

// Modal component for detailed feature info
function FeatureModal({ feature, isOpen, onClose, onPrev, onNext, t }: any) {
  if (!isOpen || !feature) return null;

  const Icon = feature.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-[#B3B3B3] hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Modal Content */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#FF6B00]/30 p-8 shadow-2xl shadow-[#FF6B00]/20">
          {/* Icon */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFD600] shadow-[0_12px_30px_rgba(255,107,0,0.25)]">
            <Icon className="h-7 w-7 text-white" />
          </div>

          {/* Title */}
          <h3 className="mb-4 text-2xl font-bold text-white">
            {t(feature.titleKey, feature.titleFb)}
          </h3>

          {/* Description */}
          <p className="mb-8 text-base leading-relaxed text-[#B3B3B3]">
            {t(feature.descKey, feature.descFb)}
          </p>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onPrev}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/20 hover:border-[#FF6B00]/50 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/20 hover:border-[#FF6B00]/50 transition-all"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Features() {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);

  const itemsPerSlide = 3;
  const totalSlides = Math.ceil(FEATURE_KEYS.length / itemsPerSlide);

  // Auto-scroll carousel every 5 seconds
  React.useEffect(() => {
    if (totalSlides <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(interval);
  }, [totalSlides]);

  const handlePrevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handleFeatureClick = (index: number) => {
    setSelectedFeatureIndex(index);
    setIsModalOpen(true);
  };

  const handleModalPrev = () => {
    setSelectedFeatureIndex((prev) => (prev - 1 + FEATURE_KEYS.length) % FEATURE_KEYS.length);
  };

  const handleModalNext = () => {
    setSelectedFeatureIndex((prev) => (prev + 1) % FEATURE_KEYS.length);
  };

  const startIndex = currentIndex * itemsPerSlide;
  const visibleFeatures = FEATURE_KEYS.slice(startIndex, startIndex + itemsPerSlide);

  return (
    <section id="features" className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-12 text-center">
          <p className="landing-section-kicker">Core capabilities</p>
          <h2 className="text-3xl mb-3 text-white font-bold">
            {t('features.title', 'Everything You Need to Succeed')}
          </h2>
          <p className="text-base text-[#B3B3B3] max-w-2xl mx-auto">
            {t('features.subtitle', 'Professional music distribution made simple. Focus on creating while we handle the rest.')}
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Feature Cards */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              const actualIndex = startIndex + idx;
              return (
                <Card
                  key={feature.titleKey}
                  onClick={() => handleFeatureClick(actualIndex)}
                  className="landing-stagger-item landing-feature-card bg-[#161616] border-[#FF6B00]/20 p-6 transition-all hover:shadow-lg hover:shadow-[#FF6B00]/20 cursor-pointer hover:border-[#FF6B00]/50 hover:scale-105"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFD600] shadow-[0_12px_30px_rgba(255,107,0,0.18)]">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mb-4 text-base font-bold text-white">{t(feature.titleKey, feature.titleFb)}</h3>
                  <p className="text-xs text-[#FF6B00] font-semibold">Click for more details →</p>
                </Card>
              );
            })}
          </div>

          {/* Previous Button */}
          {totalSlides > 1 && (
            <button
              onClick={handlePrevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 lg:-translate-x-20 p-2 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/30 hover:border-[#FF6B00]/50 transition-all"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Next Button */}
          {totalSlides > 1 && (
            <button
              onClick={handleNextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 lg:translate-x-20 p-2 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/30 hover:border-[#FF6B00]/50 transition-all"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Carousel Indicators */}
        {totalSlides > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-[#FF6B00] w-8' : 'bg-[#FF6B00]/30 w-2 hover:bg-[#FF6B00]/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Feature Modal */}
      <FeatureModal
        feature={FEATURE_KEYS[selectedFeatureIndex]}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPrev={handleModalPrev}
        onNext={handleModalNext}
        t={t}
      />
    </section>
  );
}