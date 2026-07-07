import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Hero } from './Hero';
import { Features } from './Features';
import { HowItWorks } from './HowItWorks';
import { Pricing } from './Pricing';
import { Testimonials } from './Testimonials';
import { FAQ } from './FAQ';

interface LandingPageProps {
  onSelectPlan: (planId: string) => void;
}

function getRevealDelayClass(delay: number) {
  switch (delay) {
    case 90:
      return 'landing-reveal-delay-90';
    case 120:
      return 'landing-reveal-delay-120';
    case 150:
      return 'landing-reveal-delay-150';
    case 180:
      return 'landing-reveal-delay-180';
    case 210:
      return 'landing-reveal-delay-210';
    default:
      return '';
  }
}

function RevealSection({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const lastTopRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [enterFrom, setEnterFrom] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    const sectionNode = sectionRef.current;
    if (!sectionNode) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const currentTop = entry.boundingClientRect.top;
        const previousTop = lastTopRef.current;

        if (entry.isIntersecting) {
          if (previousTop == null) {
            setEnterFrom(currentTop > window.innerHeight * 0.5 ? 'bottom' : 'top');
          } else {
            setEnterFrom(currentTop < previousTop ? 'bottom' : 'top');
          }
        }

        lastTopRef.current = currentTop;
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.14,
        rootMargin: '-6% 0px -8% 0px',
      },
    );

    observer.observe(sectionNode);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`landing-reveal ${getRevealDelayClass(delay)} enter-from-${enterFrom} ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function LandingPage({ onSelectPlan }: LandingPageProps) {
  return (
    <div className="landing-shell">
      <div className="landing-shell__texture" />

      <Hero />

      <RevealSection className="landing-section-shell" delay={90}>
        <Features />
      </RevealSection>
      <RevealSection className="landing-section-shell" delay={120}>
        <HowItWorks />
      </RevealSection>
      <RevealSection className="landing-section-shell" delay={150}>
        <Pricing onSelectPlan={onSelectPlan} />
      </RevealSection>
      <RevealSection className="landing-section-shell" delay={180}>
        <Testimonials />
      </RevealSection>
      <RevealSection className="landing-section-shell landing-section-shell--last" delay={210}>
        <FAQ />
      </RevealSection>
    </div>
  );
}