import {
  Video,
  Youtube,
  Play,
  Eye,
  DollarSign,
  CheckCircle,
  Sparkles,
  Globe,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';

export function VideoDistribution() {
  const platforms = [
    { icon: Youtube, name: 'YouTube', desc: 'Official Artist Channel & Content ID' },
    { icon: Play, name: 'Vevo', desc: 'Premium music video platform' },
    { icon: Video, name: 'Apple Music', desc: 'Music videos on Apple platforms' },
    { icon: Globe, name: 'More Platforms', desc: 'Tidal, Amazon, and others' },
  ];

  const features = [
    { icon: Shield, title: 'Content ID Protection', desc: 'Protect your videos from unauthorized use. Automatically claim revenue from any uploads of your content across YouTube.' },
    { icon: DollarSign, title: 'Monetization Ready', desc: 'Earn ad revenue from your music videos on YouTube and other platforms. We handle all the setup and optimization.' },
    { icon: Eye, title: 'View Analytics', desc: 'Track views, watch time, audience demographics, and engagement metrics across all video platforms in one dashboard.' },
    { icon: Sparkles, title: 'Official Artist Channel', desc: 'Get verified with the official artist badge on YouTube. Build credibility and stand out from fan uploads.' },
    { icon: TrendingUp, title: 'Release Strategy', desc: 'Schedule premieres, coordinate with audio release dates, and create buzz with strategic timing and promotion.' },
    { icon: Zap, title: 'Fast Delivery', desc: 'Videos typically go live within 24-48 hours. Priority processing available for urgent releases.' },
  ];

  return (
    <section className="bg-[#0A0A0A] py-14 sm:py-16 lg:py-18 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Hero with image */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-14">
          <div>
            <span className="inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600] mb-6">
              Video Distribution
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Music Video Distribution
            </h1>
            <p className="text-lg text-[#B3B3B3] max-w-xl leading-relaxed">
              Get your music videos on YouTube, Vevo, Apple Music, and more. Maximize views, engagement, and revenue.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden h-72 lg:h-80">
            <img
              src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80"
              alt="Music video production setup"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 to-transparent" />
          </div>
        </div>

        {/* Distribution Platforms */}
        <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">Where We Distribute</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {platforms.map(({ icon: Icon, name, desc }) => (
              <div key={name} className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#FF6B00]/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-8 h-8 text-[#FF6B00]" />
                </div>
                <h3 className="font-semibold text-white mb-1 text-sm">{name}</h3>
                <p className="text-xs text-[#B3B3B3]">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
              <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
              <p className="text-[#B3B3B3] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Requirements */}
        <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">Video Requirements</h2>
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-lg font-semibold text-[#FFD600] mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Technical Specifications
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'Format', value: 'MP4, MOV, or AVI' },
                  { label: 'Resolution', value: '1080p minimum, 4K preferred' },
                  { label: 'Aspect Ratio', value: '16:9 standard, 9:16 vertical' },
                  { label: 'Frame Rate', value: '24fps, 30fps, or 60fps' },
                  { label: 'Audio', value: 'AAC or PCM, 48kHz sample rate' },
                  { label: 'File Size', value: 'Up to 50GB per video' },
                ].map(({ label, value }) => (
                  <li key={label} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <span className="text-[#FF6B00] mt-0.5">{'\u2022'}</span>
                    <span><span className="text-white font-medium">{label}:</span> {value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#FFD600] mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Content Guidelines
              </h3>
              <ul className="space-y-3">
                {[
                  'Original content or proper licensing obtained',
                  'No copyright violations or unauthorized samples',
                  'Professional quality video and audio production',
                  'Complies with platform community guidelines',
                  'Age-appropriate content or proper restrictions set',
                  'Metadata including title, description, and tags',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <span className="text-[#FF6B00] mt-0.5">{'\u2022'}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">Video Distribution Plans</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Single Video</h3>
              <div className="text-3xl font-bold text-[#FFD600] mb-2">{'\u20A6'}15,000</div>
              <p className="text-sm text-[#B3B3B3] mb-5">Perfect for individual releases</p>
              <ul className="space-y-2 mb-6">
                {['YouTube & Vevo distribution', 'Content ID protection', 'Monetization enabled', 'Analytics dashboard'].map((item) => (
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
                Best Value
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">5 Videos</h3>
              <div className="text-3xl font-bold text-[#FFD600] mb-2">{'\u20A6'}60,000</div>
              <p className="text-sm text-[#B3B3B3] mb-5">Save {'\u20A6'}15,000 per year</p>
              <ul className="space-y-2 mb-6">
                {['All platforms included', 'Content ID protection', 'Full monetization', 'Priority support'].map((item) => (
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
              <h3 className="text-xl font-semibold text-white mb-3">Unlimited</h3>
              <div className="text-3xl font-bold text-[#FFD600] mb-2">{'\u20A6'}150,000/yr</div>
              <p className="text-sm text-[#B3B3B3] mb-5">For serious content creators</p>
              <ul className="space-y-2 mb-6">
                {['Unlimited video uploads', 'All distribution platforms', 'Advanced Content ID', 'Dedicated account manager'].map((item) => (
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
          <Video className="w-14 h-14 mx-auto mb-5 text-[#0A0A0A]" />
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-3">Ready to Share Your Vision?</h2>
          <p className="text-[#0A0A0A]/80 mb-7 max-w-2xl mx-auto leading-relaxed">
            Get your music videos in front of millions of viewers worldwide. Start distributing today.
          </p>
          <button className="px-8 py-3 bg-[#0A0A0A] text-white rounded-lg hover:bg-[#161616] transition-colors font-bold">
            Upload Your First Video
          </button>
        </div>

      </div>
    </section>
  );
}
