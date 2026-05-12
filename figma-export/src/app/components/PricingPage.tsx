import { useState } from 'react';
import { Check, X, Minus, Music, Users, TrendingUp, Zap, Star } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   Distribution Plans (sourced from UpgradePlan.tsx — single source of truth)
   ──────────────────────────────────────────────────────────────────────────── */
const DIST_PLANS = [
  {
    id: 'artist',
    name: 'Go-Artist',
    price: '₦15,000',
    period: 'per release',
    billing: 'Pay per release — no recurring charge',
    description: 'For independent artists getting their first music out to global platforms.',
    color: '#FF6B00',
    popular: false,
    forWho: 'Independent artists releasing music occasionally',
    icon: Music,
    features: {
      platforms: '150+ streaming platforms',
      releases: 'Pay per release',
      analytics: 'Basic analytics',
      royalties: '100% royalty ownership',
      isrc: 'ISRC & UPC codes included',
      support: 'Dedicated support',
      smartlinks: false,
      contentId: false,
      releaseTime: false,
      socialPromo: false,
      artistAccounts: false,
      labelDashboard: false,
      splitShare: false,
      rosterMgmt: false,
    },
  },
  {
    id: 'super_artist',
    name: 'Super Artist',
    price: '₦25,000',
    period: 'per release',
    billing: 'Pay per release — no recurring charge',
    description: 'For artists ready to grow their audience with premium tools and promotion.',
    color: '#FFD600',
    popular: true,
    forWho: 'Growing artists who release regularly and want more exposure',
    icon: Star,
    features: {
      platforms: '150+ streaming platforms',
      releases: 'Pay per release',
      analytics: 'Advanced analytics',
      royalties: '100% royalty ownership',
      isrc: 'ISRC & UPC codes included',
      support: 'Priority support',
      smartlinks: true,
      contentId: true,
      releaseTime: true,
      socialPromo: true,
      artistAccounts: false,
      labelDashboard: false,
      splitShare: false,
      rosterMgmt: false,
    },
  },
  {
    id: 'partner',
    name: 'Partner',
    price: '₦40,000',
    period: 'per month',
    billing: 'Monthly subscription — 5 releases included',
    description: 'Monthly subscription for labels and collectives managing multiple artists.',
    color: '#7B61FF',
    popular: false,
    forWho: 'Labels, collectives, and managers handling 2+ artists',
    icon: Users,
    features: {
      platforms: '150+ streaming platforms',
      releases: '5 releases/month (₦15k extra)',
      analytics: 'Multi-artist analytics',
      royalties: '100% royalty ownership',
      isrc: 'ISRC & UPC codes included',
      support: 'Priority label support',
      smartlinks: true,
      contentId: true,
      releaseTime: true,
      socialPromo: true,
      artistAccounts: true,
      labelDashboard: true,
      splitShare: true,
      rosterMgmt: true,
    },
  },
] as const;

/* ────────────────────────────────────────────────────────────────────────────
   Promotion Plans (sourced from PromotionDashboard.tsx)
   ──────────────────────────────────────────────────────────────────────────── */
const PROMO_PLANS = [
  {
    id: '1week',
    name: '1-Week Campaign',
    price: '₦30,000',
    period: 'one-time',
    description: 'Quick launch push for a new release or single.',
    color: '#FF6B00',
    popular: false,
    features: [
      'Playlist pitching submissions',
      'Social media framework',
      'Press release template',
      'Basic release analytics',
      'Creative assets guide',
    ],
  },
  {
    id: '2weeks',
    name: '2-Week Campaign',
    price: '₦40,000',
    period: 'one-time',
    description: 'Extended reach for a strong release window.',
    color: '#FFD600',
    popular: true,
    features: [
      'Everything in 1-Week',
      'Blog & media outreach',
      'Social posting schedule',
      'Creative graphics pack',
      'Weekly performance report',
    ],
  },
  {
    id: '4weeks',
    name: '4-Week Campaign',
    price: '₦100,000',
    period: 'one-time',
    description: 'Full campaign cycle for album launches or major rollouts.',
    color: '#7B61FF',
    popular: false,
    features: [
      'Everything in 2-Week',
      'Playlist editorial pitching',
      'Influencer outreach',
      'Multi-platform ad strategy',
      'Strategy call with our team',
      'Bi-weekly deep-dive reports',
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   Feature comparison rows for the detailed comparison table
   ──────────────────────────────────────────────────────────────────────────── */
const COMPARISON_ROWS: { label: string; key: keyof typeof DIST_PLANS[0]['features'] }[] = [
  { label: 'Platform Distribution', key: 'platforms' },
  { label: 'Release Model', key: 'releases' },
  { label: 'Analytics', key: 'analytics' },
  { label: 'Royalty Ownership', key: 'royalties' },
  { label: 'ISRC & UPC Codes', key: 'isrc' },
  { label: 'Support', key: 'support' },
  { label: 'Free Pre-Save Smartlinks', key: 'smartlinks' },
  { label: 'YouTube Content ID & OAC', key: 'contentId' },
  { label: 'Scheduled Release Times', key: 'releaseTime' },
  { label: 'Social Media Promotion', key: 'socialPromo' },
  { label: '5 Artist Accounts', key: 'artistAccounts' },
  { label: 'Label Dashboard', key: 'labelDashboard' },
  { label: 'SplitShare & Payout Workflows', key: 'splitShare' },
  { label: 'Roster & Team Management', key: 'rosterMgmt' },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === false) {
    return <X className="w-4 h-4 text-[#6D7385] mx-auto" />;
  }
  if (value === true) {
    return <Check className="w-4 h-4 text-[#1DB954] mx-auto" />;
  }
  return <span className="text-sm text-[#D1D5DB] text-center block">{value}</span>;
}

interface PricingPageProps {
  onSelectPlan?: (planId: string) => void;
}

export function PricingPage({ onSelectPlan }: PricingPageProps) {
  const [tab, setTab] = useState<'distribution' | 'promotion'>('distribution');

  const handleDistPlan = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      window.location.href = '/get-started';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="text-center mb-14">
          <p className="landing-section-kicker mb-3">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-[#B3B3B3] max-w-2xl mx-auto">
            No hidden fees. No surprise cuts. Choose a distribution plan that fits your release cadence, and add promotion campaigns any time.
          </p>

          {/* Tab switcher */}
          <div className="mt-8 inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 gap-1">
            <button
              onClick={() => setTab('distribution')}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === 'distribution'
                  ? 'bg-[#FF6B00] text-white shadow'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Distribution Plans
            </button>
            <button
              onClick={() => setTab('promotion')}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === 'promotion'
                  ? 'bg-[#FF6B00] text-white shadow'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Promotion Campaigns
            </button>
          </div>
        </div>

        {/* ── Distribution Plans ──────────────────────────────────── */}
        {tab === 'distribution' && (
          <>
            {/* Plan cards */}
            <div className="grid gap-6 md:grid-cols-3 mb-16">
              {DIST_PLANS.map((plan) => {
                const Icon = plan.icon;
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-8 flex flex-col transition-all ${
                      plan.popular
                        ? 'border-2 bg-[#161616] shadow-xl'
                        : 'border bg-[#161616] border-white/8'
                    }`}
                    style={plan.popular ? { borderColor: plan.color, boxShadow: `0 0 32px ${plan.color}22` } : {}}
                  >
                    {plan.popular && (
                      <div
                        className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold text-black"
                        style={{ backgroundColor: plan.color }}
                      >
                        Most Popular
                      </div>
                    )}

                    <div className="mb-5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                        style={{ backgroundColor: `${plan.color}18` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: plan.color }} />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                      <p className="text-sm text-[#B3B3B3]">{plan.description}</p>
                    </div>

                    <div className="mb-6 p-4 rounded-xl bg-black/30 border border-white/6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold" style={{ color: plan.color }}>{plan.price}</span>
                        <span className="text-[#B3B3B3] text-sm">/{plan.period}</span>
                      </div>
                      <p className="text-xs text-[#6D7385] mt-1">{plan.billing}</p>
                    </div>

                    <ul className="space-y-2.5 mb-8 flex-1">
                      {COMPARISON_ROWS.filter(r => {
                        const v = plan.features[r.key];
                        return v !== false;
                      }).map((r) => {
                        const v = plan.features[r.key];
                        return (
                          <li key={r.key} className="flex items-start gap-2.5 text-sm">
                            <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#1DB954]" />
                            <span className="text-[#B3B3B3]">
                              {v === true ? r.label : String(v)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <button
                      onClick={() => handleDistPlan(plan.id)}
                      className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                      style={{ backgroundColor: plan.color, color: plan.id === 'super_artist' ? '#000' : '#fff' }}
                    >
                      Get Started — {plan.name}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Detailed comparison table */}
            <div className="mb-16 rounded-2xl border border-white/8 bg-[#111] overflow-hidden">
              <div className="p-6 border-b border-white/6">
                <h2 className="text-2xl font-bold text-white">Plan Comparison</h2>
                <p className="text-sm text-[#B3B3B3] mt-1">See exactly what's included in each plan side-by-side.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      <th className="text-left px-6 py-4 text-[#6D7385] font-medium w-1/3">Feature</th>
                      {DIST_PLANS.map(p => (
                        <th key={p.id} className="px-4 py-4 text-center" style={{ color: p.color }}>
                          {p.name}
                          <div className="text-xs font-normal text-[#B3B3B3] mt-0.5">{p.price}/{p.period}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={row.key} className={i % 2 === 0 ? 'bg-white/[0.015]' : ''}>
                        <td className="px-6 py-3.5 text-[#D1D5DB]">{row.label}</td>
                        {DIST_PLANS.map(p => (
                          <td key={p.id} className="px-4 py-3.5 text-center">
                            <FeatureValue value={p.features[row.key]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Which plan is better? recommendation guide */}
            <div className="mb-16 rounded-2xl border border-white/8 bg-[#111] p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Which Plan Should You Choose?</h2>
              <p className="text-[#B3B3B3] mb-8">Quick guide based on where you are in your music career.</p>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    icon: Music,
                    color: '#FF6B00',
                    title: 'Choose Go-Artist if…',
                    points: [
                      "You're releasing your first tracks",
                      'You release 1–3 times per year',
                      'You want to test the platform first',
                      'Budget is a top priority',
                    ],
                    plan: DIST_PLANS[0],
                  },
                  {
                    icon: TrendingUp,
                    color: '#FFD600',
                    title: 'Choose Super Artist if…',
                    points: [
                      'You release music regularly',
                      'You want YouTube Content ID revenue',
                      'You need Pre-Save Smartlinks for every drop',
                      "You're actively growing your fanbase",
                    ],
                    plan: DIST_PLANS[1],
                  },
                  {
                    icon: Users,
                    color: '#7B61FF',
                    title: 'Choose Partner if…',
                    points: [
                      'You manage 2 or more artists',
                      'You distribute 5+ releases per month',
                      'You need royalty splits between collaborators',
                      "You're running an independent label",
                    ],
                    plan: DIST_PLANS[2],
                  },
                ].map(({ icon: Icon, color, title, points, plan }) => (
                  <div
                    key={title}
                    className="rounded-xl p-6 border"
                    style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <h3 className="font-bold text-white text-sm">{title}</h3>
                    </div>
                    <ul className="space-y-2 mb-5">
                      {points.map(p => (
                        <li key={p} className="flex items-start gap-2 text-sm text-[#B3B3B3]">
                          <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleDistPlan(plan.id)}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                      style={{ backgroundColor: color, color: plan.id === 'super_artist' ? '#000' : '#fff' }}
                    >
                      Start with {plan.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Promotion Campaigns ─────────────────────────────────── */}
        {tab === 'promotion' && (
          <>
            <div className="mb-10 text-center max-w-xl mx-auto">
              <p className="text-[#B3B3B3]">
                Promotion campaigns run separately from your distribution plan. Add a campaign to any release at any time — one-time payment, no recurring charges.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-16">
              {PROMO_PLANS.map(plan => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-8 flex flex-col bg-[#161616] transition-all ${
                    plan.popular ? 'border-2' : 'border border-white/8'
                  }`}
                  style={plan.popular ? { borderColor: plan.color, boxShadow: `0 0 32px ${plan.color}22` } : {}}
                >
                  {plan.popular && (
                    <div
                      className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold text-black"
                      style={{ backgroundColor: plan.color }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div className="mb-5">
                    <div
                      className="inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ backgroundColor: `${plan.color}18`, color: plan.color }}
                    >
                      Promotion
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-[#B3B3B3]">{plan.description}</p>
                  </div>

                  <div className="mb-6 p-4 rounded-xl bg-black/30 border border-white/6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold" style={{ color: plan.color }}>{plan.price}</span>
                      <span className="text-[#B3B3B3] text-sm"> one-time</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#1DB954]" />
                        <span className="text-[#B3B3B3]">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="/dashboard/promotion"
                    className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-all hover:opacity-90"
                    style={{ backgroundColor: plan.color, color: plan.id === '2weeks' ? '#000' : '#fff' }}
                  >
                    Start Campaign
                  </a>
                </div>
              ))}
            </div>

            {/* Promo comparison table */}
            <div className="mb-16 rounded-2xl border border-white/8 bg-[#111] overflow-hidden">
              <div className="p-6 border-b border-white/6">
                <h2 className="text-2xl font-bold text-white">Campaign Comparison</h2>
                <p className="text-sm text-[#B3B3B3] mt-1">Which campaign fits your release?</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      <th className="text-left px-6 py-4 text-[#6D7385] font-medium">What you get</th>
                      {PROMO_PLANS.map(p => (
                        <th key={p.id} className="px-4 py-4 text-center" style={{ color: p.color }}>
                          {p.name}
                          <div className="text-xs font-normal text-[#B3B3B3] mt-0.5">{p.price}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Playlist pitching', vals: [true, true, true] },
                      { label: 'Social posting framework', vals: [true, true, true] },
                      { label: 'Press release template', vals: [true, true, true] },
                      { label: 'Creative assets guide', vals: [true, true, true] },
                      { label: 'Blog & media outreach', vals: [false, true, true] },
                      { label: 'Creative graphics pack', vals: [false, true, true] },
                      { label: 'Weekly performance report', vals: [false, true, true] },
                      { label: 'Playlist editorial pitching', vals: [false, false, true] },
                      { label: 'Influencer outreach', vals: [false, false, true] },
                      { label: 'Multi-platform ad strategy', vals: [false, false, true] },
                      { label: 'Strategy call with our team', vals: [false, false, true] },
                      { label: 'Bi-weekly deep-dive reports', vals: [false, false, true] },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? 'bg-white/[0.015]' : ''}>
                        <td className="px-6 py-3.5 text-[#D1D5DB]">{row.label}</td>
                        {row.vals.map((v, idx) => (
                          <td key={idx} className="px-4 py-3.5 text-center">
                            {v
                              ? <Check className="w-4 h-4 text-[#1DB954] mx-auto" />
                              : <Minus className="w-4 h-4 text-[#6D7385] mx-auto" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── FAQ / Trust strip ───────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[
            { icon: Zap, title: 'No hidden cuts', body: 'You keep 100% royalty ownership. Our flat fee covers distribution only.' },
            { icon: TrendingUp, title: 'Built to scale', body: 'Move from per-release to monthly partner billing without switching platforms.' },
            { icon: Check, title: 'Cancel anytime', body: 'Partner plan can be cancelled at any billing cycle end. No lock-in.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="w-9 h-9 rounded-lg bg-[#FF6B00]/15 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-[#FF6B00]" />
              </div>
              <h4 className="font-semibold text-white mb-1">{title}</h4>
              <p className="text-sm text-[#B3B3B3]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
