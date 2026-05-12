import { Button } from './ui/button';
import { Card } from './ui/card';
import MusicPlatformLogos from './MusicPlatformLogos';
import {
  Music,
  Check,
  ArrowLeft,
  ArrowRight,
  Globe,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';

export function FreePlanDetails() {
  const handleBackToPlans = () => { window.location.href = '/get-started'; };
  const handleStartNow = () => { window.location.href = '/get-started'; };

  return (
    <section id="free-plan-details" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0A0A0A] min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBackToPlans}
            className="text-[#B3B3B3] hover:text-white hover:bg-[#161616] transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Plans
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-[#FFD600] rounded-lg flex items-center justify-center">
              <Music className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-5xl mb-4 text-white font-bold">Go-Artist Plan</h1>
          <p className="text-xl text-[#B3B3B3] mb-6">For independent artists getting their music out</p>
          <div className="inline-block">
            <div className="text-6xl text-[#FFD600] font-bold mb-2">₦15,000</div>
            <div className="text-[#B3B3B3]">per release</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Features */}
          <Card className="p-8 bg-[#161616] border-[#FF6B00]/20">
            <h2 className="text-3xl mb-6 text-white font-bold">What's Included</h2>
            <ul className="space-y-4">
              {[
                { title: '150+ Platforms', desc: 'Get your music on Spotify, Apple Music, YouTube Music, Audiomack, Boomplay and 150+ more.' },
                { title: 'Basic Analytics', desc: 'Track streams, listeners, and revenue across all platforms.' },
                { title: 'Keep 100% Royalties', desc: 'Every naira of your streaming revenue goes straight to you.' },
                { title: 'ISRC & UPC Codes', desc: 'Included with every release — no additional cost.' },
                { title: 'Dedicated Support', desc: 'Our team is here to help you through every step of your release.' },
              ].map(({ title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-5 h-5 text-[#1DB954]" />
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1">{title}</div>
                    <div className="text-[#B3B3B3] text-sm">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Benefits */}
          <Card className="p-8 bg-[#161616] border-[#FF6B00]/20">
            <h2 className="text-3xl mb-6 text-white font-bold">Key Benefits</h2>
            <div className="space-y-6">
              {[
                { Icon: Globe, color: 'text-[#FF6B00]', bg: 'bg-[#FF6B00]/20', title: 'Global Reach', desc: 'Access hundreds of millions of listeners across 150+ streaming platforms worldwide.' },
                { Icon: Shield, color: 'text-[#FF6B00]', bg: 'bg-[#FF6B00]/15', title: '100% Rights Retained', desc: 'You keep full ownership of your music and master rights — always.' },
                { Icon: TrendingUp, color: 'text-[#1DB954]', bg: 'bg-[#1DB954]/20', title: 'Easy Upgrade Path', desc: 'Level up to Super Artist anytime to unlock advanced tools as your career grows.' },
                { Icon: Zap, color: 'text-[#FFD600]', bg: 'bg-[#FFD600]/15', title: 'Fast Delivery', desc: 'Your music goes live across all platforms within 24–72 hours of approval.' },
              ].map(({ Icon, color, bg, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1">{title}</div>
                    <div className="text-[#B3B3B3] text-sm">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Platform Logos */}
        <Card className="p-8 bg-[#161616] border-[#FF6B00]/20 mb-12">
          <h2 className="text-3xl mb-6 text-white font-bold">Distribution Platforms</h2>
          <div className="rounded-2xl border border-[#FF6B00]/15 bg-[#0F0F0F] px-5 py-6">
            <MusicPlatformLogos
              platforms={['Spotify', 'Apple Music', 'YouTube Music', 'Audiomack', 'Boomplay', 'TIDAL', 'Amazon Music', 'Deezer']}
              size={32}
              className="grid grid-cols-1 gap-5 text-white sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            />
          </div>
        </Card>

        {/* Upgrade callout */}
        <Card className="p-8 bg-gradient-to-br from-[#1a0d00] to-[#0A0A0A] border border-[#FF6B00]/30 mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1">
              <p className="text-sm font-bold text-[#FF6B00] uppercase tracking-wider mb-1">Want more?</p>
              <h3 className="text-2xl text-white font-bold mb-2">Upgrade to Super Artist</h3>
              <p className="text-[#B3B3B3] text-sm leading-relaxed">
                ₦25,000/release — Advanced analytics, YouTube Content ID & OAC setup, exact release scheduling, social media promotion, and Free Pre-Save Smartlinks for every release.
              </p>
            </div>
            <Button size="lg" onClick={() => window.location.href = '/get-started'}
              className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-bold px-8 whitespace-nowrap flex-shrink-0">
              Get Super Artist <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Card className="p-8 bg-gradient-to-br from-[#161616] to-[#0A0A0A] border-2 border-[#FF6B00] max-w-2xl mx-auto">
            <h2 className="text-3xl mb-4 text-white font-bold">Ready to Get Started?</h2>
            <p className="text-xl text-[#B3B3B3] mb-6">Join thousands of artists distributing their music worldwide</p>
            <Button size="lg" onClick={handleStartNow}
              className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white px-12 text-lg">
              Start Now <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-[#B3B3B3] mt-4">Pay per release · Upgrade anytime · No subscriptions</p>
          </Card>
        </div>
      </div>
    </section>
  );
}

