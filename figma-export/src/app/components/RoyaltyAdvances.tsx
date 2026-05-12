import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  BarChart,
  Shield,
  Zap,
  Calculator,
  Users,
  Award,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export function RoyaltyAdvances() {
  const [monthlyRoyaltiesInput, setMonthlyRoyaltiesInput] = useState('50000');

  const monthlyRoyalties = useMemo(() => {
    const normalized = monthlyRoyaltiesInput.replace(/[^\d]/g, '');
    const parsed = Number.parseInt(normalized || '0', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [monthlyRoyaltiesInput]);

  const minAdvance = monthlyRoyalties * 6;
  const maxAdvance = monthlyRoyalties * 12;

  function formatNaira(value: number) {
    return `\u20A6${new Intl.NumberFormat('en-NG').format(Math.max(0, Math.round(value)))}`;
  }

  const steps = [
    { num: '1', title: 'Apply Online', desc: 'Submit your streaming history and connect your distribution account' },
    { num: '2', title: 'Get Your Offer', desc: 'We analyze your data and provide an advance offer within 48 hours' },
    { num: '3', title: 'Accept & Get Paid', desc: 'Review terms, sign digitally, and receive funds in your bank account' },
    { num: '4', title: 'Repay Over Time', desc: 'Advance is recouped from your future royalties automatically' },
  ];

  const faqs = [
    { q: 'Do I give up ownership of my music?', a: 'No! You retain 100% ownership of your masters and copyrights. The advance is simply recouped from your future royalties.' },
    { q: 'What if my streams don\u0027t cover the advance?', a: 'If royalties are lower than projected, the repayment period may extend, but you\u0027re never personally liable beyond your royalty earnings.' },
    { q: 'How long does approval take?', a: 'Most applications are reviewed within 48 hours. Once approved, funds are typically transferred within 3-5 business days.' },
    { q: 'Can I get multiple advances?', a: 'Yes! Once you\u0027ve recouped 75% of your current advance, you can apply for a new one based on updated earnings.' },
  ];

  return (
    <section className="bg-[#0A0A0A] py-14 sm:py-16 lg:py-18 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Hero with image */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-14">
          <div>
            <span className="inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600] mb-6">
              Royalty Advances
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Fund Your Music Career
            </h1>
            <p className="text-lg text-[#B3B3B3] max-w-xl leading-relaxed">
              Get paid now for your future streaming royalties. Invest in your music career without giving up ownership or rights.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden h-72 lg:h-80">
            <img
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80"
              alt="Financial growth and investment"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 to-transparent" />
          </div>
        </div>

        {/* What Are Royalty Advances */}
        <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5 text-center">What Are Royalty Advances?</h2>
          <p className="text-[#B3B3B3] leading-relaxed mb-8 max-w-3xl mx-auto text-center">
            A royalty advance is an upfront payment based on your projected future streaming earnings. Instead of waiting months for royalties to accumulate, you get immediate access to funds you can use to promote your music, produce new content, or invest in your career.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: CheckCircle, title: 'Keep 100% Ownership', desc: 'You own all your masters and rights' },
              { icon: Zap, title: 'Fast Funding', desc: 'Get approved in 48 hours' },
              { icon: Shield, title: 'No Hidden Fees', desc: 'Transparent and fair terms' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#FF6B00]/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-7 h-7 text-[#FF6B00]" />
                </div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-[#B3B3B3]">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#FF6B00] text-[#0A0A0A] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  {num}
                </div>
                <h3 className="font-semibold text-white mb-1 text-sm">{title}</h3>
                <p className="text-xs text-[#B3B3B3]">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Eligibility */}
        <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">Eligibility Requirements</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-lg font-semibold text-[#FFD600] mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                You Qualify If:
              </h3>
              <ul className="space-y-3">
                {[
                  'Earned at least \u20A6100,000 in streaming royalties in the past 12 months',
                  'Music distributed through AMT DISTRO or can be transferred',
                  'You own 100% of your master rights',
                  'Your catalog has consistent streaming growth',
                  'No existing advance agreements with other companies',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <span className="text-[#FF6B00] mt-0.5">{'\u2022'}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#FFD600] mb-4 flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Advance Amounts:
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'Minimum', value: '\u20A6100,000' },
                  { label: 'Maximum', value: '\u20A610,000,000' },
                  { label: 'Based on', value: '6-12 months of projected royalties' },
                  { label: 'Repayment', value: '12-24 months' },
                  { label: 'Fee', value: '10-15% of advance amount' },
                ].map(({ label, value }) => (
                  <li key={label} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <span className="text-[#FF6B00] mt-0.5">{'\u2022'}</span>
                    <span><span className="text-white font-medium">{label}:</span> {value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">What Artists Use Advances For</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Award, title: 'Music Production', desc: 'Fund studio time, hire producers, and create new music without financial stress' },
              { icon: TrendingUp, title: 'Marketing & Promotion', desc: 'Run ads, hire PR agencies, and invest in campaigns to grow your audience' },
              { icon: Users, title: 'Music Videos & Content', desc: 'Produce high-quality music videos and visual content for better engagement' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-[#FF6B00]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-[#B3B3B3]">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Advance Calculator */}
        <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 mb-14">
          <div className="max-w-2xl mx-auto text-center">
            <Calculator className="w-12 h-12 text-[#FF6B00] mx-auto mb-5" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Estimate Your Advance</h2>
            <p className="text-[#B3B3B3] mb-7">
              Use our calculator to see how much you could qualify for based on your streaming earnings.
            </p>
            <div className="bg-[#0A0A0A] border border-[#FF6B00]/10 p-6 rounded-xl">
              <div className="mb-5">
                <label className="block text-left mb-2 text-sm font-medium text-[#B3B3B3]">
                  Your Monthly Streaming Royalties ({'\u20A6'})
                </label>
                <input
                  type="text"
                  placeholder="e.g., 50000"
                  value={monthlyRoyaltiesInput}
                  onChange={(event) => setMonthlyRoyaltiesInput(event.target.value)}
                  className="w-full px-4 py-3 bg-[#161616] border border-[#FF6B00]/20 rounded-lg text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/50"
                />
              </div>
              <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/20 p-5 rounded-lg mb-5">
                <div className="text-xs text-[#B3B3B3] mb-1">Estimated Advance Range</div>
                <div className="text-2xl font-bold text-[#FFD600]">{formatNaira(minAdvance)} - {formatNaira(maxAdvance)}</div>
                <div className="text-xs text-[#B3B3B3] mt-1">Based on 6-12 months of projected earnings</div>
              </div>
              <button className="w-full py-3 rounded-lg bg-[#FF6B00] text-[#0A0A0A] font-bold hover:bg-[#FF6B00]/90 transition-colors">
                Apply for Advance
              </button>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border-b border-[#FF6B00]/10 pb-5 last:border-0">
                <h3 className="font-semibold text-white mb-2">{q}</h3>
                <p className="text-sm text-[#B3B3B3] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FFD600] p-10 text-center">
          <DollarSign className="w-14 h-14 mx-auto mb-5 text-[#0A0A0A]" />
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-3">Ready to Fund Your Music Career?</h2>
          <p className="text-[#0A0A0A]/80 mb-7 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of artists who have accelerated their careers with royalty advances. Apply today and get your offer in 48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-[#0A0A0A] text-white rounded-lg hover:bg-[#161616] transition-colors font-bold">
              Apply Now
            </button>
            <button className="px-8 py-3 bg-transparent border-2 border-[#0A0A0A] text-[#0A0A0A] rounded-lg hover:bg-[#0A0A0A]/10 transition-colors font-bold">
              Learn More
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
