import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { Features } from './Features';
import { Pricing } from './Pricing';
import { ReportingEngine } from './ReportingEngine';
import { Testimonials } from './Testimonials';
import { FAQ } from './FAQ';

interface LandingPageProps {
  onSelectPlan: (planId: string) => void;
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
      className={`landing-reveal enter-from-${enterFrom} ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
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

      <RevealSection className="landing-section-shell" delay={120}>
        <HowItWorks />
      </RevealSection>
      <RevealSection className="landing-section-shell" delay={150}>
        <Pricing onSelectPlan={onSelectPlan} />
      </RevealSection>
      <RevealSection className="landing-section-shell" delay={180}>
        <Features />
      </RevealSection>
      <RevealSection className="landing-section-shell" delay={195}>
        <ReportingEngine />
      </RevealSection>
      <RevealSection className="landing-section-shell" delay={210}>
        <Testimonials />
      </RevealSection>
      <RevealSection className="landing-section-shell landing-section-shell--last" delay={240}>
        <FAQ />
      </RevealSection>
    </div>
  );
}