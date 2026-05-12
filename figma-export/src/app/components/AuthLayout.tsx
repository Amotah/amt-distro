import { ReactNode, useState } from 'react';
import {
  Music,
  Moon,
  Sun,
  Star,
  Globe,
  BadgeDollarSign,
  BarChart3,
  ShieldCheck,
  Radio,
  TrendingUp,
  Users,
  Headphones,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Globe,
    label: 'Global Reach',
    text: 'Distribute to 150+ streaming platforms worldwide',
    color: 'text-sky-300',
    bg: 'bg-sky-400/15',
  },
  {
    icon: BadgeDollarSign,
    label: 'Full Royalties',
    text: 'Keep up to 100% of your earnings — always',
    color: 'text-emerald-300',
    bg: 'bg-emerald-400/15',
  },
  {
    icon: BarChart3,
    label: 'Live Analytics',
    text: 'Real-time streams, revenue and audience data',
    color: 'text-amber-300',
    bg: 'bg-amber-400/15',
  },
  {
    icon: ShieldCheck,
    label: 'Rights Protected',
    text: 'Secure, transparent rights management & licensing',
    color: 'text-violet-300',
    bg: 'bg-violet-400/15',
  },
];

const STATS = [
  { icon: Users, value: '50K+', label: 'Artists' },
  { icon: Radio, value: '150+', label: 'Platforms' },
  { icon: TrendingUp, value: '₦2B+', label: 'Paid out' },
  { icon: Headphones, value: '48h', label: 'Go live' },
];

const TESTIMONIALS = [
  {
    quote: "AMT DISTRO helped me reach fans in 50+ countries within my first month. The dashboard is incredibly intuitive.",
    author: 'Davide O.',
    role: 'Afrobeats Artist',
    avatar: 'DO',
    stars: 5,
  },
  {
    quote: "The label dashboard gives us full control over all our artists and royalties in one place. Game changer.",
    author: 'Pulse Records',
    role: 'Record Label',
    avatar: 'PR',
    stars: 5,
  },
  {
    quote: "Getting started was seamless. My music was live on Spotify within 48 hours of signing up.",
    author: 'Ade K.',
    role: 'R&B Artist',
    avatar: 'AK',
    stars: 5,
  },
];

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  testimonialIndex?: number;
}

export function AuthLayout({ children, title, subtitle, testimonialIndex = 0 }: AuthLayoutProps) {
  const [isDark, setIsDark] = useState(true);
  const testimonial = TESTIMONIALS[testimonialIndex % TESTIMONIALS.length];

  return (
    <div className={isDark ? '' : 'auth-light'}>
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col lg:flex-row">
        {/* ── Left Branding Panel ── */}
        <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-[44%] relative overflow-hidden p-10 xl:p-14">
          {/* Layered background */}
          <div className="absolute inset-0 bg-[#0f0a04]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/90 via-[#c84e00]/70 to-[#0f0a04]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_110%_-10%,rgba(255,214,0,0.18),transparent)]" />
          {/* Decorative circles */}
          <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#FFD600]/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-[#FF6B00]/20 blur-3xl pointer-events-none" />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Logo */}
          <a href="/" className="relative z-10 inline-flex items-center gap-3 group w-fit">
            <img
              src="/brand/amt-distro-wordmark.svg"
              alt="AMTDISTRO logo"
              className="h-11 w-auto object-contain"
            />
          </a>

          {/* Middle Content */}
          <div className="relative z-10 space-y-7">
            {/* Headline */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/80 text-xs font-medium">Trusted by 50,000+ creators</span>
              </div>
              <h2 className="text-3xl xl:text-[2.6rem] font-extrabold text-white leading-[1.15] mb-3 tracking-tight">
                Your Music,<br />The Whole World.
              </h2>
              <p className="text-white/65 text-[0.93rem] leading-relaxed">
                Upload once. Reach every major platform. Get paid every stream.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.label} className="flex items-center gap-3.5">
                    <div className={`w-9 h-9 rounded-xl ${f.bg} border border-white/10 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${f.color}`} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold leading-tight">{f.label}</p>
                      <p className="text-white/55 text-[11px] leading-snug">{f.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl bg-white/8 border border-white/12 px-2 py-3 text-center">
                    <Icon className="w-4 h-4 text-white/50 mx-auto mb-1" />
                    <p className="text-white font-bold text-base leading-none">{s.value}</p>
                    <p className="text-white/45 text-[10px] mt-0.5">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Testimonial */}
            <div className="rounded-2xl bg-white/8 backdrop-blur-sm border border-white/15 p-5 shadow-xl">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: testimonial.stars }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-[#FFD600] fill-[#FFD600]" />
                ))}
              </div>
              <p className="text-white/85 text-[0.82rem] italic leading-relaxed mb-4">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFD600] to-[#FF6B00] flex items-center justify-center text-[10px] font-black text-[#0A0A0A] flex-shrink-0 shadow-lg">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-none">{testimonial.author}</p>
                  <p className="text-white/50 text-xs mt-0.5">{testimonial.role}</p>
                </div>
                <div className="ml-auto flex items-center gap-1 bg-emerald-400/15 border border-emerald-400/20 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300 text-[10px] font-medium">Verified</span>
                </div>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-white/30 text-[11px]">
            © {new Date().getFullYear()} AMT DISTRO. All rights reserved.
          </p>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="flex-1 flex flex-col min-h-screen bg-[#0A0A0A]">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/5">
            {/* Mobile logo */}
            <a href="/" className="lg:hidden flex items-center gap-2">
              <img
                src="/brand/amt-distro-wordmark.svg"
                alt="AMTDISTRO logo"
                className="h-9 w-auto object-contain"
              />
            </a>
            <div className="hidden lg:block" />

            {/* Theme toggle */}
            <button
              type="button"
              onClick={() => setIsDark(d => !d)}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-[#B3B3B3] hover:text-white hover:border-[#FF6B00]/40 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-start lg:items-center justify-center p-5 sm:p-8 overflow-y-auto">
            <div className="w-full max-w-md py-4">
              <div className="mb-7">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">{title}</h1>
                <p className="text-[#B3B3B3] text-sm sm:text-base">{subtitle}</p>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
