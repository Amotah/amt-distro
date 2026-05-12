import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Music,
  Check,
  ArrowLeft,
  ArrowRight,
  Globe,
  TrendingUp,
  Shield,
  BarChart3,
  Megaphone,
  Headphones,
  Users,
  Crown,
  Palette,
  Clock,
} from 'lucide-react';

const partnerStreamingPlatforms = [
  { name: 'Spotify', domain: 'spotify.com' },
  { name: 'Apple Music', domain: 'music.apple.com' },
  { name: 'YouTube Music', domain: 'music.youtube.com' },
  { name: 'Amazon Music', domain: 'music.amazon.com' },
  { name: 'Deezer', domain: 'deezer.com' },
  { name: 'TIDAL', domain: 'tidal.com' },
  { name: 'Audiomack', domain: 'audiomack.com' },
  { name: 'Boomplay', domain: 'boomplay.com' },
  { name: 'Pandora', domain: 'pandora.com' },
  { name: 'SoundCloud', domain: 'soundcloud.com' },
  { name: 'TikTok', domain: 'tiktok.com' },
  { name: 'Instagram', domain: 'instagram.com' },
  { name: 'Facebook', domain: 'facebook.com' },
  { name: 'Napster', domain: 'napster.com' },
  { name: 'KKBOX', domain: 'kkbox.com' },
  { name: 'Anghami', domain: 'anghami.com' },
  { name: 'JioSaavn', domain: 'jiosaavn.com' },
];

export function PartnerPlanDetails() {
  const selectPlan = (planId: 'partner') => {
    window.sessionStorage.setItem('amtdistro-public-selected-plan', planId);
    window.location.href = '/get-started';
  };

  const handleBackToPlans = () => {
    window.location.href = '/get-started';
  };

  const handleStartNow = () => {
    selectPlan('partner');
  };

  return (
    <section id="partner-plan-details" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0A0A0A] min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBackToPlans}
            className="text-[#B3B3B3] hover:text-white hover:bg-[#161616] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Plans
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-[#FFD600] rounded-lg flex items-center justify-center">
              <Crown className="w-9 h-9 text-white" />
            </div>
          </div>
          <div className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-full font-bold mb-4">
            PREMIUM
          </div>
          <h1 className="text-5xl mb-4 text-white font-bold">Partner (Label) Plan</h1>
          <p className="text-xl text-[#B3B3B3] mb-6">
            Enterprise-grade distribution for record labels and multi-artist management
          </p>
          <div className="grid gap-4 sm:grid-cols-1">
            <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616] p-6">
              <div className="text-sm uppercase tracking-[0.24em] text-[#B3B3B3]">Monthly</div>
              <div className="mt-3 text-5xl font-bold text-[#FFD600]">₦40,000</div>
              <div className="mt-2 text-sm text-[#B3B3B3]">per month</div>
              <Button onClick={() => selectPlan('partner')} className="mt-5 w-full bg-[#FF6B00] text-white hover:bg-[#ff7c21]">Choose Plan</Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Plan Overview */}
          <Card className="p-8 bg-[#161616] border-[#FF6B00]/20">
            <h2 className="text-3xl mb-6 text-white font-bold">What's Included</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Unlimited Releases</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Distribute unlimited music for all artists on your roster
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">All Major Streaming Platforms</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Launch across Spotify, Apple Music, Boomplay, YouTube Music, Amazon Music, Deezer, TIDAL, Audiomack, SoundCloud, and more
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Basic Analytics</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Comprehensive analytics dashboard for all your artists and releases
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">One-Time Promotion (First Release)</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Professional promotional campaign for your first release
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">24/7 Support</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Round-the-clock priority support for urgent issues and questions
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">White-Label Options</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Customize the platform with your label's branding and identity
                  </div>
                </div>
              </li>
            </ul>
          </Card>

          {/* Key Benefits */}
          <Card className="p-8 bg-[#161616] border-[#FF6B00]/20">
            <h2 className="text-3xl mb-6 text-white font-bold">Key Benefits</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-[#FF6B00]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Multi-Artist Management</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Manage multiple artists and their releases from one centralized dashboard
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#FFD600]/20 flex items-center justify-center flex-shrink-0">
                  <Palette className="w-6 h-6 text-[#FFD600]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Custom Branding</div>
                  <div className="text-[#B3B3B3] text-sm">
                    White-label the platform with your logo, colors, and brand identity
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-[#1DB954]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Advanced Analytics</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Track performance across all artists with detailed reporting and insights
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">24/7 Priority Support</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Always-on support team ready to help with any issues day or night
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Global Distribution</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Reach over 150 platforms and stores in every country worldwide
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Rights Management</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Advanced tools for managing rights, splits, and royalty distribution
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-8 bg-[#161616] border-[#FF6B00]/20 mb-12 overflow-hidden">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <h2 className="text-3xl text-white font-bold">Streaming Platforms Included</h2>
              <p className="text-[#B3B3B3] mt-2 max-w-2xl">
                Your partner plan is positioned for distribution across the core global DSPs, regional streaming services, and social music destinations shown below.
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border border-[#FF6B00]/20 bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-[#FFD600]">
              {partnerStreamingPlatforms.length}+ featured destinations
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {partnerStreamingPlatforms.map((platform) => (
              <div
                key={platform.name}
                className="group rounded-2xl border border-[#FF6B00]/15 bg-[#0F0F0F] p-4 transition-colors hover:border-[#FF6B00]/40 hover:bg-[#141414]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2 shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
                    <img
                      src={`https://img.logo.dev/${platform.domain}?token=pk_X3s8Z7sHnXWg0z6c`}
                      alt={`${platform.name} logo`}
                      className="h-8 w-8 object-contain"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white leading-tight">{platform.name}</div>
                    <div className="text-xs text-[#B3B3B3] truncate">{platform.domain}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Feature Comparison */}
        <Card className="p-8 bg-[#161616] border-[#FF6B00]/20 mb-12">
          <h2 className="text-3xl mb-6 text-white font-bold">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#FF6B00]/20">
                  <th className="text-left py-4 text-white">Feature</th>
                  <th className="text-center py-4 text-[#B3B3B3]">Free</th>
                  <th className="text-center py-4 text-[#B3B3B3]">Paid Artist</th>
                  <th className="text-center py-4 text-[#FFD600] font-bold">Partner</th>
                </tr>
              </thead>
              <tbody className="text-[#B3B3B3]">
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Releases per year</td>
                  <td className="text-center py-4">1</td>
                  <td className="text-center py-4">Unlimited</td>
                  <td className="text-center py-4 text-[#1DB954] font-semibold">Unlimited</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Distribution platforms</td>
                  <td className="text-center py-4">5</td>
                  <td className="text-center py-4">150+</td>
                  <td className="text-center py-4 text-[#1DB954] font-semibold">150+</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Analytics</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4">✓ Basic</td>
                  <td className="text-center py-4 text-[#1DB954] font-semibold">✓ Advanced</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Social media promotion</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4">✓ One-time</td>
                  <td className="text-center py-4 text-[#1DB954] font-semibold">✓ One-time</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Support</td>
                  <td className="text-center py-4">Email</td>
                  <td className="text-center py-4">Dedicated</td>
                  <td className="text-center py-4 text-[#1DB954] font-semibold">24/7</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">White-label options</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4 text-[#1DB954] font-semibold">✓</td>
                </tr>
                <tr>
                  <td className="py-4">Multi-artist management</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4 text-[#1DB954] font-semibold">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* White-Label Features */}
        <Card className="p-8 bg-[#161616] border-[#FF6B00]/20 mb-12">
          <h2 className="text-3xl mb-6 text-white font-bold">White-Label Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Palette className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-white font-semibold mb-2">Custom Branding</div>
                <div className="text-[#B3B3B3] text-sm">
                  Add your label's logo, colors, and brand elements throughout the platform
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-white font-semibold mb-2">Custom Domain</div>
                <div className="text-[#B3B3B3] text-sm">
                  Use your own domain name for a fully branded experience
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-white font-semibold mb-2">Artist Portals</div>
                <div className="text-[#B3B3B3] text-sm">
                  Provide your artists with branded login portals and dashboards
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-white font-semibold mb-2">Premium Support</div>
                <div className="text-[#B3B3B3] text-sm">
                  Dedicated account manager and priority technical support
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Perfect For Section */}
        <Card className="p-8 bg-[#161616] border-[#FF6B00]/20 mb-12">
          <h2 className="text-3xl mb-6 text-white font-bold">Perfect For</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-lg bg-[#0A0A0A]">
              <div className="text-4xl mb-3">🏢</div>
              <div className="text-white font-semibold mb-2">Record Labels</div>
              <div className="text-[#B3B3B3] text-sm">
                Independent and established labels managing multiple artists
              </div>
            </div>
            <div className="text-center p-6 rounded-lg bg-[#0A0A0A]">
              <div className="text-4xl mb-3">👥</div>
              <div className="text-white font-semibold mb-2">Artist Collectives</div>
              <div className="text-[#B3B3B3] text-sm">
                Groups of artists collaborating under one brand or collective
              </div>
            </div>
            <div className="text-center p-6 rounded-lg bg-[#0A0A0A]">
              <div className="text-4xl mb-3">🎯</div>
              <div className="text-white font-semibold mb-2">Music Distributors</div>
              <div className="text-[#B3B3B3] text-sm">
                Companies providing distribution services to multiple clients
              </div>
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="p-8 bg-gradient-to-br from-[#161616] to-[#0A0A0A] border-2 border-[#FF6B00] max-w-2xl mx-auto">
            <h2 className="text-3xl mb-4 text-white font-bold">Ready to Scale Your Label?</h2>
            <p className="text-xl text-[#B3B3B3] mb-6">
              Get enterprise-grade distribution with white-label options and priority support
            </p>
            <Button
              size="lg"
              onClick={handleStartNow}
              className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white px-12 text-lg"
            >
              Start Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-[#B3B3B3] mt-4">
              From ₦40,000/month or ₦250,000/year
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
