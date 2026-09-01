import type { ReactNode } from 'react';
import { useLanguage } from '../utils/i18n';

/** Miniature recreations of real dashboard panels — one visual per pipeline stage instead of long copy. */
function DistributionMockup() {
  const rows: [string, string][] = [
    ['Spotify', 'Live'],
    ['Apple Music', 'Live'],
    ['YouTube Music', 'Processing'],
  ];
  return (
    <div className="space-y-1.5">
      {rows.map(([name, status]) => (
        <div key={name} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5">
          <span className="text-[11px] text-white/75">{name}</span>
          <span className={`text-[10px] font-semibold ${status === 'Live' ? 'text-[#6EE7B7]' : 'text-[#FFD600]'}`}>{status}</span>
        </div>
      ))}
    </div>
  );
}

function MatchingMockup() {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2.5 py-2.5">
      <div className="text-[11px] font-medium text-white">Midnight Rhythm</div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/45">
        <span>ISRC NG-A2B-26-00184</span>
        <span className="font-semibold text-[#6EE7B7]">Matched</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-white/45">
        <span>UPC 00184673210</span>
        <span className="font-semibold text-[#6EE7B7]">Matched</span>
      </div>
    </div>
  );
}

function FraudMockup() {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2.5 py-2.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-white/40">
        <span>Fraud score</span>
        <span className="font-semibold text-[#6EE7B7]">Low risk</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-[14%] rounded-full bg-gradient-to-r from-[#6EE7B7] to-[#00E5FF]" />
      </div>
      <div className="mt-2 text-[10px] text-white/45">2 anomalies flagged this week</div>
    </div>
  );
}

function SplitMockup() {
  const splits: [string, number][] = [
    ['Artist', 70],
    ['Producer', 20],
    ['Label', 10],
  ];
  return (
    <div className="space-y-2 rounded-lg bg-white/[0.04] px-2.5 py-2.5">
      {splits.map(([name, pct]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-[10px] text-white/60">
            <span>{name}</span>
            <span className="font-semibold text-white">{pct}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveReportMockup() {
  const bars = [40, 55, 35, 70, 50, 85, 60];
  return (
    <div className="rounded-lg bg-white/[0.04] px-2.5 py-2.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-white/40">
        <span>This month</span>
        <span className="font-semibold text-[#FFD600]">₦1.8M</span>
      </div>
      <div className="mt-2.5 flex h-10 items-end gap-1">
        {bars.map((height, index) => (
          <div key={index} className="flex-1 rounded-sm bg-gradient-to-t from-[#FF6B00] to-[#FFD600]" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

const ENGINE_STEPS: Array<{ step: string; title: string; mockup: ReactNode }> = [
  { step: '01', title: 'Multi-Platform Data Ingestion', mockup: <DistributionMockup /> },
  { step: '02', title: 'ISRC / UPC Matching Engine', mockup: <MatchingMockup /> },
  { step: '03', title: 'Fraud & Anomaly Detection', mockup: <FraudMockup /> },
  { step: '04', title: 'Royalty Calculation Engine', mockup: <SplitMockup /> },
  { step: '05', title: 'Live Dashboard Reporting', mockup: <LiveReportMockup /> },
];

export function ReportingEngine() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#0a0a0a_0%,#0f0d0a_50%,#0a0a0a_100%)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-12 text-center">
          <p className="landing-section-kicker">Under the hood</p>
          <div className="mb-4 inline-flex rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
            {t('engine.badge', 'Reporting Engine')}
          </div>
          <h2 className="max-w-3xl mx-auto text-2xl font-bold leading-tight text-white sm:text-[1.75rem] mb-3">
            {t('engine.title', 'How our reporting & royalty algorithm works')}
          </h2>
          <p className="max-w-2xl mx-auto text-[#B3B3B3] text-sm leading-6">
            {t('engine.subtitle', 'The same pipeline that powers your dashboard numbers — from raw stream data to a verified payout.')}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {ENGINE_STEPS.map((item) => (
            <div
              key={item.step}
              className="landing-stagger-item group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1410]/80 to-[#0f0d0a]/80 p-4 transition-all duration-300 hover:border-white/20 hover:shadow-[0_24px_48px_rgba(255,107,0,0.12)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Step {item.step}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0D0D0D] p-3">
                {item.mockup}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">{item.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
