import { Card } from './ui/card';
import { Button } from './ui/button';
import { MapPin, Clock, Zap, Heart, Users, Rocket, Music, Globe, Code, BarChart3, Megaphone, Headphones } from 'lucide-react';

const openings = [
  {
    title: 'Senior Frontend Engineer',
    team: 'Engineering',
    location: 'Lagos, NG (Hybrid)',
    type: 'Full-time',
    icon: Code,
    description: 'Build and refine the artist-facing platform used by thousands of creators across Africa.',
  },
  {
    title: 'Backend Engineer',
    team: 'Engineering',
    location: 'Remote (Africa)',
    type: 'Full-time',
    icon: Zap,
    description: 'Design scalable APIs, payment integrations, and real-time analytics pipelines.',
  },
  {
    title: 'Product Designer',
    team: 'Design',
    location: 'Lagos, NG (Hybrid)',
    type: 'Full-time',
    icon: Music,
    description: 'Shape how independent artists interact with distribution, analytics, and royalty tools.',
  },
  {
    title: 'Data Analyst',
    team: 'Analytics',
    location: 'Remote (Africa)',
    type: 'Full-time',
    icon: BarChart3,
    description: 'Turn streaming and revenue data into actionable insights for artists and the business.',
  },
  {
    title: 'Artist Relations Manager',
    team: 'Operations',
    location: 'Lagos, NG',
    type: 'Full-time',
    icon: Headphones,
    description: 'Be the bridge between AMT DISTRO and the artists who depend on us every day.',
  },
  {
    title: 'Growth Marketing Lead',
    team: 'Marketing',
    location: 'Remote (Africa)',
    type: 'Full-time',
    icon: Megaphone,
    description: 'Drive artist acquisition and brand awareness across African and global markets.',
  },
];

const perks = [
  { icon: Globe, title: 'Remote-First', description: 'Work from anywhere across Africa with flexible hours.' },
  { icon: Heart, title: 'Health & Wellness', description: 'Comprehensive health insurance and wellness stipend.' },
  { icon: Rocket, title: 'Growth Budget', description: 'Annual learning budget for courses, conferences, and books.' },
  { icon: Music, title: 'Music Culture', description: 'Free premium plan, listening rooms, and artist meet-ups.' },
  { icon: Users, title: 'Team Retreats', description: 'Quarterly in-person gatherings to connect and collaborate.' },
  { icon: Zap, title: 'Equity Options', description: 'Share in the success you help build with stock options.' },
];

export function Careers() {
  return (
    <section className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto max-w-6xl">
        {/* Hero */}
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
            Careers
          </div>
          <h1 className="text-[2rem] font-bold text-white sm:text-[2.5rem]">
            Help us shape the future of African music
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#B3B3B3]">
            AMT DISTRO is growing fast. We&apos;re looking for passionate people who believe
            independent artists deserve better tools, fairer pay, and a global stage.
          </p>
        </div>

        {/* Culture Visual Banner */}
        <div className="mb-14 grid gap-3 sm:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl sm:col-span-2">
            <img
              src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&h=420&fit=crop&q=80"
              alt="Recording studio session"
              className="h-56 w-full object-cover sm:h-64"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 to-transparent" />
            <div className="absolute bottom-5 left-5">
              <span className="rounded-full bg-[#FF6B00] px-3 py-1 text-xs font-semibold text-white">Our Culture</span>
              <p className="mt-2 max-w-xs text-sm font-medium leading-5 text-white/90">
                Music runs through everything we do — from the product we build to the way we work.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="relative flex-1 overflow-hidden rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=450&h=200&fit=crop&q=80"
                alt="Team collaboration"
                className="h-full min-h-[120px] w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs font-semibold text-white/90">Collaboration</span>
            </div>
            <div className="relative flex-1 overflow-hidden rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=450&h=200&fit=crop&q=80"
                alt="Music production workspace"
                className="h-full min-h-[120px] w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs font-semibold text-white/90">Innovation</span>
            </div>
          </div>
        </div>

        {/* Perks */}
        <div className="mb-14">
          <h2 className="mb-8 text-center text-2xl font-bold text-white">Why Work With Us</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((perk) => (
              <Card key={perk.title} className="border-[#FF6B00]/10 bg-[#161616] p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10">
                  <perk.icon className="h-5 w-5 text-[#FF6B00]" />
                </div>
                <h3 className="text-sm font-bold text-white">{perk.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#B3B3B3]">{perk.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-14">
          <h2 className="mb-2 text-2xl font-bold text-white">Open Positions</h2>
          <p className="mb-8 text-sm text-[#B3B3B3]">
            Don&apos;t see a perfect fit? Send us your CV anyway — we&apos;re always looking for great people.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {openings.map((job) => (
              <Card
                key={job.title}
                className="group border-[#FF6B00]/10 bg-[#161616] p-5 transition-shadow hover:shadow-[0_12px_32px_rgba(255,107,0,0.08)]"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FFD600]">
                    <job.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="rounded-full border border-[#FF6B00]/20 bg-[#0A0A0A] px-2.5 py-1 text-[10px] font-medium text-[#FFD600]">
                    {job.team}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-[#FF6B00] transition-colors">{job.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#B3B3B3]">{job.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#8D8D8D]">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {job.type}
                  </span>
                </div>
                <Button
                  className="mt-4 w-full bg-[#FF6B00] py-2 text-sm font-medium text-white hover:bg-[#FF6B00]/90 sm:w-auto sm:px-6"
                  onClick={() => window.location.href = '/contact'}
                >
                  Apply Now
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Card className="border border-[#FF6B00]/20 bg-gradient-to-r from-[#FF6B00] to-[#FFD600] p-8 text-center text-white sm:p-10">
          <h2 className="text-2xl font-bold">Ready to make an impact?</h2>
          <p className="mx-auto mt-3 mb-6 max-w-xl text-sm leading-6 text-white/85">
            Join a team that&apos;s building the infrastructure for independent African music. Your work
            will directly reach thousands of artists and millions of listeners.
          </p>
          <Button
            className="bg-white px-8 py-2.5 text-sm font-medium text-[#A04A00] hover:bg-[#FFF3DB]"
            onClick={() => window.location.href = '/contact'}
          >
            Send Your Application
          </Button>
        </Card>
      </div>
    </section>
  );
}
