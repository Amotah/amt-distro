import {
  Target,
  TrendingUp,
  Users,
  Share2,
  BarChart,
  Megaphone,
  Instagram,
  Music2,
  Sparkles,
  Crown,
  Zap,
} from 'lucide-react';

export function MarketingSolutions() {
  const features = [
    { icon: Target, title: 'Smart Links', desc: 'Create one universal link that directs fans to your music on their preferred streaming platform. Track clicks and conversions in real-time.' },
    { icon: TrendingUp, title: 'Pre-Save Campaigns', desc: 'Build anticipation for your release with pre-save campaigns on Spotify and Apple Music. Collect fan data and boost day-one streams.' },
    { icon: Users, title: 'Audience Insights', desc: 'Understand your audience demographics, geographic locations, and listening habits to make data-driven marketing decisions.' },
    { icon: Instagram, title: 'Social Media Integration', desc: 'Auto-generate social media assets, promotional graphics, and shareable content optimized for Instagram, TikTok, and Twitter.' },
    { icon: Megaphone, title: 'Playlist Pitching', desc: 'Submit your music directly to curated playlists and editorial teams. Increase your chances of getting featured and discovered.' },
    { icon: BarChart, title: 'Campaign Analytics', desc: 'Monitor the performance of all your marketing campaigns with detailed analytics, ROI tracking, and actionable insights.' },
  ];

  return (
    <section className="bg-[#0A0A0A] py-14 sm:py-16 lg:py-18 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Hero with image */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-14">
          <div>
            <span className="inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600] mb-6">
              Marketing
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Marketing Solutions
            </h1>
            <p className="text-lg text-[#B3B3B3] max-w-xl leading-relaxed">
              Amplify your reach with powerful marketing tools designed to grow your fanbase and maximize your music&#39;s impact.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden h-72 lg:h-80">
            <img
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
              alt="Digital marketing analytics dashboard"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 to-transparent" />
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

        {/* Marketing Packages */}
        <div className="mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">Marketing Packages</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Music2 className="w-7 h-7 text-[#FF6B00]" />
                <h3 className="text-xl font-semibold text-white">Starter</h3>
              </div>
              <div className="text-3xl font-bold text-[#FFD600] mb-5">&#8358;25,000</div>
              <ul className="space-y-3 mb-7">
                {['3 Smart Links', '1 Pre-Save Campaign', 'Basic Analytics Dashboard', 'Social Media Templates', 'Email Support'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <span className="text-[#FF6B00]">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 rounded-lg border border-[#FF6B00]/30 text-[#FF6B00] text-sm font-medium hover:bg-[#FF6B00]/10 transition-colors">
                Get Started
              </button>
            </div>

            {/* Professional */}
            <div className="rounded-2xl border-2 border-[#FF6B00] bg-[#161616] p-6 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FF6B00] text-[#0A0A0A] px-4 py-1 rounded-full text-xs font-bold">
                Popular
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-7 h-7 text-[#FFD600]" />
                <h3 className="text-xl font-semibold text-white">Professional</h3>
              </div>
              <div className="text-3xl font-bold text-[#FFD600] mb-5">&#8358;75,000</div>
              <ul className="space-y-3 mb-7">
                {['Unlimited Smart Links', '5 Pre-Save Campaigns', 'Advanced Analytics & Insights', 'Custom Social Assets', 'Playlist Pitching (10/month)', 'Priority Support'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <span className="text-[#FF6B00]">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 rounded-lg bg-[#FF6B00] text-[#0A0A0A] text-sm font-bold hover:bg-[#FF6B00]/90 transition-colors">
                Get Started
              </button>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-7 h-7 text-[#FF6B00]" />
                <h3 className="text-xl font-semibold text-white">Enterprise</h3>
              </div>
              <div className="text-3xl font-bold text-[#FFD600] mb-5">&#8358;150,000</div>
              <ul className="space-y-3 mb-7">
                {['Everything in Professional', 'Dedicated Account Manager', 'Unlimited Campaigns', 'Radio Promotion', 'Press Release Distribution', '24/7 Premium Support'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#B3B3B3] text-sm">
                    <span className="text-[#FF6B00]">&#10003;</span>
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

        {/* Success Stories */}
        <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">Success Stories</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl bg-[#0A0A0A] border border-[#FF6B00]/10 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" alt="Timi Blaze" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Timi Blaze</h4>
                  <p className="text-sm text-[#B3B3B3]">Afrobeats Artist</p>
                </div>
              </div>
              <p className="text-[#B3B3B3] italic text-sm mb-4 leading-relaxed">
                &ldquo;The pre-save campaign helped me get 15,000 saves before my album dropped. First week streams were 3x higher than my previous release!&rdquo;
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-[#FF6B00]">
                  <TrendingUp className="w-4 h-4" />
                  <span>+300% Streams</span>
                </div>
                <div className="flex items-center gap-1 text-[#FFD600]">
                  <Users className="w-4 h-4" />
                  <span>15K Pre-Saves</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#0A0A0A] border border-[#FF6B00]/10 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80" alt="Chioma Ezeh" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Chioma Ezeh</h4>
                  <p className="text-sm text-[#B3B3B3]">Gospel Singer</p>
                </div>
              </div>
              <p className="text-[#B3B3B3] italic text-sm mb-4 leading-relaxed">
                &ldquo;Smart Links made it so easy for my fans to find my music. The analytics showed me exactly where my audience is and how to reach them better.&rdquo;
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-[#FF6B00]">
                  <Share2 className="w-4 h-4" />
                  <span>25K Link Clicks</span>
                </div>
                <div className="flex items-center gap-1 text-[#FFD600]">
                  <Users className="w-4 h-4" />
                  <span>+150% Growth</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FFD600] p-10 text-center">
          <Zap className="w-14 h-14 mx-auto mb-5 text-[#0A0A0A]" />
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-3">Ready to Amplify Your Music?</h2>
          <p className="text-[#0A0A0A]/80 mb-7 max-w-2xl mx-auto leading-relaxed">
            Join thousands of artists using our marketing tools to grow their careers and reach new audiences worldwide.
          </p>
          <button className="px-8 py-3 bg-[#0A0A0A] text-white rounded-lg hover:bg-[#161616] transition-colors font-bold">
            Start Your Campaign Today
          </button>
        </div>

      </div>
    </section>
  );
}
