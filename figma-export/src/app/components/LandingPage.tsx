import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, BadgeCheck, Headphones, WalletCards } from 'lucide-react';
import { Hero } from './Hero';
import { Features } from './Features';
import { HowItWorks } from './HowItWorks';
import { Pricing } from './Pricing';
import { CoreCapabilities } from './CoreCapabilities';
import { Testimonials } from './Testimonials';
import { FAQ } from './FAQ';

interface LandingPageProps {
  onSelectPlan: (planId: string) => void;
}

const PROOF_ITEMS = [
  {
    icon: BadgeCheck,
    title: 'Built for serious releases',
    description: 'Professional distribution workflows, release controls, and catalog handling for independent artists and label teams.',
  },
  {
    icon: WalletCards,
    title: 'Clear royalties and pricing',
    description: 'Transparent commercial structure, payout visibility, and no hidden revenue-share surprises buried in the process.',
  },
  {
    icon: Headphones,
    title: 'Human support when timing matters',
    description: 'Real operational support for launches, metadata issues, and growth campaigns when release windows are tight.',
  },
];

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

      <RevealSection className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8" delay={60}>
        <section className="landing-proof-panel">
          <div className="landing-proof-panel__header">
            <div>
              <p className="landing-kicker">Why artists trust the platform</p>
              <h2 className="landing-proof-panel__title">A cleaner front door for distribution, rights, and release growth.</h2>
            </div>
            <a href="/who-we-are" className="landing-proof-panel__link">
              Learn more about AMT DISTRO
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="landing-proof-grid">
            {PROOF_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="landing-proof-card">
                  <div className="landing-proof-card__icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="landing-proof-card__title">{item.title}</h3>
                  <p className="landing-proof-card__description">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      </RevealSection>

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
        <CoreCapabilities />
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