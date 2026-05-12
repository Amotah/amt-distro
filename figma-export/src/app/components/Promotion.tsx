import { Megaphone, ListMusic, Newspaper, Share2, Target, FileText, Video, Image, Sparkles, ArrowRight } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const promoFeatures = [
  {
    icon: ListMusic,
    title: 'Playlist Pitching',
    description: 'We submit your release to relevant independent and editorial-facing curators to improve your chance of playlist traction.',
  },
  {
    icon: Newspaper,
    title: 'Online Blog Features',
    description: 'Your campaign includes targeted outreach to music blogs and tastemakers that fit your genre and audience.',
  },
  {
    icon: Share2,
    title: 'Social Media Strategy',
    description: 'Get a practical posting plan across Instagram, TikTok, and short-form channels with launch-week timing suggestions.',
  },
  {
    icon: Target,
    title: 'Paid Ad Campaign',
    description: 'For growth-focused campaigns, we build and optimize ad sets to reach listeners who match your fan profile.',
  },
  {
    icon: FileText,
    title: 'Press Release Creation',
    description: 'Receive a concise release narrative and positioning copy you can use in outreach, EPKs, and distribution portals.',
  },
  {
    icon: Video,
    title: 'Promotional Videos',
    description: 'Short promo edits for reels and ad creatives to help your campaign convert better across social surfaces.',
  },
  {
    icon: Image,
    title: 'Promotional Graphics',
    description: 'Custom visual assets for teasers, release-day posts, and announcement sequences that keep your identity consistent.',
  },
  {
    icon: Megaphone,
    title: 'Social Banners',
    description: 'Channel-ready cover graphics and story banners for Spotify, YouTube, and social profiles during the campaign.',
  },
  {
    icon: Sparkles,
    title: 'Perks and Priority Support',
    description: 'Priority turnaround and direct campaign support so blockers are resolved quickly while your rollout is live.',
  },
];

const campaignSteps = [
  {
    title: 'Discovery and Positioning',
    description: 'We learn your artist story, release goals, and audience data, then shape a campaign angle that is clear and sellable.',
  },
  {
    title: 'Creative and Asset Build',
    description: 'We produce messaging, visuals, and posting assets so your release appears cohesive across platforms.',
  },
  {
    title: 'Launch and Amplification',
    description: 'Playlist, blog, and social activity runs in a coordinated window to build momentum around release week.',
  },
  {
    title: 'Reports and Next Moves',
    description: 'You get campaign insights, what worked, and practical next-step actions to sustain growth after rollout.',
  },
];

export function Promotion() {
  return (
    <section className="bg-[#0A0A0A] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="mb-12 rounded-3xl border border-[#FF6B00]/20 bg-[radial-gradient(circle_at_top_right,_rgba(255,214,0,0.12),_transparent_45%),linear-gradient(180deg,#15100B_0%,#0A0A0A_100%)] p-8 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD600]">
            <Megaphone className="h-3.5 w-3.5" />
            Promotion Campaigns
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Music Promotion Built For Real Release Momentum
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#B3B3B3] sm:text-lg">
            Launch a focused campaign with playlist pitching, online press, social strategy, and creative assets designed to convert attention into listeners.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#Pricing-promo">
              <Button className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90">
                View Campaign Pricing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="/contact">
              <Button variant="outline" className="border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00]/10">
                Speak With Promotion Team
              </Button>
            </a>
          </div>
        </div>

        <div className="mb-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {promoFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-[#FF6B00]/20 bg-[#161616] p-5">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFD600]">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{feature.title}</h3>
                <p className="text-sm leading-6 text-[#B3B3B3]">{feature.description}</p>
              </Card>
            );
          })}
        </div>

        <div className="mb-14 rounded-2xl border border-[#FF6B00]/20 bg-[#111111] p-6 sm:p-8">
          <h2 className="mb-6 text-3xl font-bold text-white">How We Run Promotion</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {campaignSteps.map((step, index) => (
              <div key={step.title} className="rounded-xl border border-[#FF6B00]/15 bg-[#171717] p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFD600]">
                  Step {index + 1}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-6 text-[#B3B3B3]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="Pricing-promo" className="rounded-2xl border border-[#FF6B00]/20 bg-[#111111] p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-white">Promotion Pricing</h2>
          <p className="mt-3 max-w-2xl text-[#B3B3B3]">
            Choose a campaign based on your release goals. Every plan includes strategic support, creator-friendly timelines, and clear reporting.
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <Card className="border-[#FF6B00]/20 bg-[#161616] p-6">
              <div className="mb-3 inline-flex rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD600]">
                Starter
              </div>
              <h3 className="text-2xl font-bold text-white">1-Week Campaign</h3>
              <p className="mt-2 text-[#B3B3B3]">For artists who want a compact but effective launch campaign.</p>
              <div className="mt-5 text-4xl font-extrabold text-[#FFD600]">₦30,000</div>
              <ul className="mt-5 space-y-2 text-sm text-[#D0D0D0]">
                <li>Playlist pitching submissions</li>
                <li>Social posting framework</li>
                <li>Press release copy</li>
                <li>3 promotional graphics</li>
                <li>Campaign summary report</li>
              </ul>
              <a href="/get-started" className="mt-6 inline-flex text-sm font-semibold text-[#FF6B00] hover:text-[#FFD600]">Start Starter Plan</a>
            </Card>

            <Card className="relative border-2 border-[#FFD600] bg-[#161616] p-6 shadow-lg shadow-[#FFD600]/10">
              <div className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">
                Most Popular
              </div>
              <div className="mb-3 inline-flex rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD600]">
                Growth
              </div>
              <h3 className="text-2xl font-bold text-white">2-Weeks Campaign</h3>
              <p className="mt-2 text-[#B3B3B3]">For artists who want stronger reach via ads, extra content, and deeper optimization.</p>
              <div className="mt-5 text-4xl font-extrabold text-[#FFD600]">₦40,000</div>
              <ul className="mt-5 space-y-2 text-sm text-[#D0D0D0]">
                <li>Everything in 1-Week Campaign</li>
                <li>Online blog outreach (3+ outlets)</li>
                <li>Promotional video (30 seconds)</li>
                <li>5 promotional graphics</li>
                <li>Mid-campaign analytics check-in</li>
              </ul>
              <a href="/get-started" className="mt-6 inline-flex text-sm font-semibold text-[#FF6B00] hover:text-[#FFD600]">Start Growth Plan</a>
            </Card>

            <Card className="border-[#FF6B00]/20 bg-[#161616] p-6">
              <div className="mb-3 inline-flex rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD600]">
                Scale
              </div>
              <h3 className="text-2xl font-bold text-white">4-Week Campaign</h3>
              <p className="mt-2 text-[#B3B3B3]">For artists and teams ready for a full-scale campaign with aggressive growth optimization.</p>
              <div className="mt-5 text-4xl font-extrabold text-[#FFD600]">₦100,000</div>
              <ul className="mt-5 space-y-2 text-sm text-[#D0D0D0]">
                <li>Everything in 2-Weeks Campaign</li>
                <li>Paid social ad campaign</li>
                <li>2 promotional videos (60s and 15s)</li>
                <li>10 promotional graphics</li>
                <li>Weekly progress reports and optimization</li>
              </ul>
              <a href="/get-started" className="mt-6 inline-flex text-sm font-semibold text-[#FF6B00] hover:text-[#FFD600]">Start Scale Plan</a>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
