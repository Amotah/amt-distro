import { Server, Shield, Zap, Cloud, BarChart, Cpu, Database } from 'lucide-react';

export function Technology() {
  return (
    <section className="bg-[#0A0A0A] py-14 sm:py-16 lg:py-18 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Hero with image */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-14">
          <div>
            <span className="inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600] mb-6">
              Our Technology
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Technology That Powers Your Music
            </h1>
            <p className="text-lg text-[#B3B3B3] max-w-xl leading-relaxed">
              Enterprise-grade infrastructure built for speed, security, and scale — so you can focus on creating.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden h-72 lg:h-80">
            <img
              src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80"
              alt="Server infrastructure"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 to-transparent" />
          </div>
        </div>

        {/* Main Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {[
            { icon: Cloud, title: 'Cloud Infrastructure', desc: 'Built on AWS with 99.99% uptime guarantee. Your music is always accessible, anywhere in the world.' },
            { icon: Shield, title: 'Bank-Level Security', desc: '256-bit encryption, secure file storage, and regular security audits protect your intellectual property.' },
            { icon: Zap, title: 'Lightning Fast', desc: 'Upload files up to 10x faster with our optimized delivery network. Global CDN ensures quick access.' },
            { icon: Database, title: 'Smart Data Management', desc: 'Automated metadata optimization, format conversion, and quality checks for every release.' },
            { icon: BarChart, title: 'Real-Time Analytics', desc: 'Live streaming data from all platforms. Track your performance second by second.' },
            { icon: Cpu, title: 'AI-Powered Tools', desc: 'Smart recommendations for release timing, pricing optimization, and audience targeting.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
              <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
              <p className="text-[#B3B3B3] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Technical Specs */}
        <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">Technical Specifications</h2>
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-lg font-semibold text-[#FFD600] mb-4">Audio Requirements</h3>
              <ul className="space-y-3">
                {['WAV, FLAC, or MP3 (320kbps minimum)', '16-bit or 24-bit depth', '44.1kHz or 48kHz sample rate', 'Stereo or mono channels'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <span className="text-[#FF6B00] mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#FFD600] mb-4">Artwork Requirements</h3>
              <ul className="space-y-3">
                {['JPG or PNG format', '3000x3000 pixels minimum', 'RGB color mode', '72-300 DPI resolution'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <span className="text-[#FF6B00] mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* API CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FFD600] p-10 text-center">
          <Server className="w-14 h-14 mx-auto mb-5 text-[#0A0A0A]" />
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-3">Developer API</h2>
          <p className="text-[#0A0A0A]/80 mb-7 max-w-2xl mx-auto leading-relaxed">
            Build custom integrations with our RESTful API. Perfect for labels managing large catalogs or developers building music tools.
          </p>
          <button className="px-8 py-3 bg-[#0A0A0A] text-white rounded-lg hover:bg-[#161616] transition-colors font-medium">
            View API Documentation
          </button>
        </div>

      </div>
    </section>
  );
}
