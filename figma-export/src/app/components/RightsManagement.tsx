import {
  Shield,
  Lock,
  FileText,
  Search,
  AlertTriangle,
  CheckCircle,
  Scale,
  Gavel,
  Globe,
  DollarSign,
} from 'lucide-react';

export function RightsManagement() {
  const services = [
    { icon: Shield, title: 'Copyright Protection', desc: 'Register and protect your copyrights internationally. We handle all documentation and legal requirements to ensure your work is protected.' },
    { icon: Search, title: 'Usage Monitoring', desc: '24/7 automated monitoring of your music across streaming platforms, radio, TV, films, commercials, and social media worldwide.' },
    { icon: FileText, title: 'License Management', desc: 'Manage sync licenses, mechanical licenses, and performance rights. Track all licenses and ensure proper compensation.' },
    { icon: AlertTriangle, title: 'Infringement Detection', desc: 'AI-powered detection of unauthorized use of your music. Instant alerts when your work is used without permission or proper licensing.' },
    { icon: Gavel, title: 'Takedown Services', desc: 'Fast DMCA takedown requests for unauthorized uses. Our legal team handles the process to remove infringing content quickly.' },
    { icon: DollarSign, title: 'Royalty Collection', desc: 'Collect royalties from all sources including performance rights organizations, mechanical rights, and sync fees globally.' },
  ];

  const steps = [
    { num: '1', title: 'Register Your Works', desc: 'Submit your music and metadata to our rights management system' },
    { num: '2', title: 'We Monitor', desc: 'Our AI scans the internet 24/7 for any use of your music' },
    { num: '3', title: 'Detect Usage', desc: 'Get instant alerts when your music is used anywhere online' },
    { num: '4', title: 'Take Action', desc: 'Approve licenses, collect royalties, or remove unauthorized uses' },
  ];

  return (
    <section className="bg-[#0A0A0A] py-14 sm:py-16 lg:py-18 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Hero with image */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-14">
          <div>
            <span className="inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600] mb-6">
              Rights Management
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Protect Your Creative Work
            </h1>
            <p className="text-lg text-[#B3B3B3] max-w-xl leading-relaxed">
              Protect your intellectual property, monitor usage worldwide, and ensure you get paid for every use of your music.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden h-72 lg:h-80">
            <img
              src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80"
              alt="Legal documents and copyright protection"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 to-transparent" />
          </div>
        </div>

        {/* Key Services */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {services.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
              <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
              <p className="text-[#B3B3B3] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-10 text-center">How Rights Management Works</h2>
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

        {/* Protection Coverage */}
        <div className="grid md:grid-cols-2 gap-6 mb-14">
          <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
            <h3 className="text-xl font-semibold text-white mb-5 flex items-center gap-3">
              <Globe className="w-6 h-6 text-[#FF6B00]" />
              Global Coverage
            </h3>
            <ul className="space-y-3">
              {[
                'YouTube Content ID protection worldwide',
                'Social media monitoring (Instagram, TikTok, Facebook, Twitter)',
                'Streaming platforms (Spotify, Apple Music, all DSPs)',
                'Radio broadcast monitoring (terrestrial and online)',
                'TV and film placement tracking',
                'Public performance venues and events',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                  <CheckCircle className="w-4 h-4 text-[#FF6B00] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
            <h3 className="text-xl font-semibold text-white mb-5 flex items-center gap-3">
              <Scale className="w-6 h-6 text-[#FF6B00]" />
              Legal Support
            </h3>
            <ul className="space-y-3">
              {[
                'Copyright registration with Nigerian Copyright Commission',
                'International copyright protection (WIPO)',
                'DMCA takedown request handling',
                'License agreement templates and review',
                'Legal consultation for infringement cases',
                'Performance rights registration (COSON)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                  <CheckCircle className="w-4 h-4 text-[#FF6B00] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">Rights Management Plans</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Basic Protection</h3>
              <div className="text-3xl font-bold text-[#FFD600] mb-5">{'\u20A6'}30,000/yr</div>
              <ul className="space-y-2 mb-6">
                {['Copyright registration', 'YouTube Content ID', 'Social media monitoring', 'Monthly infringement reports'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <CheckCircle className="w-4 h-4 text-[#FF6B00] flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 rounded-lg border border-[#FF6B00]/30 text-[#FF6B00] text-sm font-medium hover:bg-[#FF6B00]/10 transition-colors">
                Get Started
              </button>
            </div>

            <div className="rounded-2xl border-2 border-[#FF6B00] bg-[#161616] p-6 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FF6B00] text-[#0A0A0A] px-4 py-1 rounded-full text-xs font-bold">
                Recommended
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Professional</h3>
              <div className="text-3xl font-bold text-[#FFD600] mb-5">{'\u20A6'}75,000/yr</div>
              <ul className="space-y-2 mb-6">
                {['Everything in Basic', 'Global usage monitoring', 'DMCA takedown service', 'Real-time alerts', 'License management tools'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <CheckCircle className="w-4 h-4 text-[#FF6B00] flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 rounded-lg bg-[#FF6B00] text-[#0A0A0A] text-sm font-bold hover:bg-[#FF6B00]/90 transition-colors">
                Get Started
              </button>
            </div>

            <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Enterprise</h3>
              <div className="text-3xl font-bold text-[#FFD600] mb-5">{'\u20A6'}200,000/yr</div>
              <ul className="space-y-2 mb-6">
                {['Everything in Professional', 'Dedicated legal team', 'International litigation support', 'Custom licensing agreements', 'Catalog management (unlimited)'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <CheckCircle className="w-4 h-4 text-[#FF6B00] flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 rounded-lg border border-[#FF6B00]/30 text-[#FF6B00] text-sm font-medium hover:bg-[#FF6B00]/10 transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FFD600] p-10 text-center">
          <Lock className="w-14 h-14 mx-auto mb-5 text-[#0A0A0A]" />
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-3">Protect Your Creative Work</h2>
          <p className="text-[#0A0A0A]/80 mb-7 max-w-2xl mx-auto leading-relaxed">
            Don't let unauthorized use cost you revenue. Join thousands of artists who trust us to protect their rights worldwide.
          </p>
          <button className="px-8 py-3 bg-[#0A0A0A] text-white rounded-lg hover:bg-[#161616] transition-colors font-bold">
            Start Protecting Your Music
          </button>
        </div>

      </div>
    </section>
  );
}
