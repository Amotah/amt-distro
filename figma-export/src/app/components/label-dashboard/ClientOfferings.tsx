import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Package,
  Check,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Music,
  Instagram,
  Twitter,
  Youtube,
  ArrowRight,
} from 'lucide-react';

export function ClientOfferings() {
  const packages = [
    {
      id: 1,
      name: 'Starter Package',
      price: '₦150,000',
      period: 'per campaign',
      description: 'Perfect for new releases and independent artists',
      features: [
        'Social media promotion (2 weeks)',
        'Playlist pitching (50+ curators)',
        'Press release distribution',
        'Basic analytics report',
        'Email marketing campaign',
      ],
      recommended: false,
    },
    {
      id: 2,
      name: 'Professional Package',
      price: '₦350,000',
      period: 'per campaign',
      description: 'Comprehensive marketing for established artists',
      features: [
        'Social media promotion (4 weeks)',
        'Playlist pitching (150+ curators)',
        'Press release + media outreach',
        'Advanced analytics & reporting',
        'Email & SMS marketing',
        'Influencer partnerships (3-5)',
        'YouTube promotion',
        'Spotify Canvas creation',
      ],
      recommended: true,
    },
    {
      id: 3,
      name: 'Premium Package',
      price: '₦750,000',
      period: 'per campaign',
      description: 'Full-scale marketing for major releases',
      features: [
        'Social media promotion (8 weeks)',
        'Playlist pitching (300+ curators)',
        'Full media & PR campaign',
        'Comprehensive analytics dashboard',
        'Multi-channel marketing',
        'Influencer partnerships (10+)',
        'YouTube & TikTok campaigns',
        'Professional content creation',
        'Radio promotion',
        'Billboard & outdoor advertising',
      ],
      recommended: false,
    },
  ];

  const additionalServices = [
    {
      icon: Instagram,
      title: 'Social Media Management',
      description: 'Daily content creation and community management',
      price: '₦100,000/month',
    },
    {
      icon: Youtube,
      title: 'Video Production',
      description: 'Professional music video and content production',
      price: '₦500,000+',
    },
    {
      icon: Target,
      title: 'Paid Advertising',
      description: 'Facebook, Instagram, and Google Ads campaigns',
      price: 'Starting at ₦200,000',
    },
    {
      icon: Music,
      title: 'Playlist Promotion',
      description: 'Targeted playlist pitching and curator relationships',
      price: '₦75,000/release',
    },
    {
      icon: TrendingUp,
      title: 'SEO & Digital Strategy',
      description: 'Search optimization and online presence building',
      price: '₦150,000/month',
    },
    {
      icon: Users,
      title: 'Influencer Marketing',
      description: 'Partnerships with influencers and content creators',
      price: 'Custom pricing',
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Client Offerings</h1>
          <p className="text-[#B3B3B3]">Comprehensive marketing packages for your artists</p>
        </div>
        <Button className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white">
          <Package className="w-5 h-5 mr-2" />
          Request Custom Package
        </Button>
      </div>

      {/* Marketing Packages */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 text-white">Marketing Packages</h2>
        <div className="grid lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`p-6 bg-[#161616] border-[#FF6B00]/20 relative ${
                pkg.recommended ? 'border-2 border-[#FFD600]' : ''
              }`}
            >
              {pkg.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2 text-white">{pkg.name}</h3>
                <p className="text-[#B3B3B3] text-sm mb-4">{pkg.description}</p>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-[#FFD600]">{pkg.price}</span>
                  <span className="text-[#B3B3B3] ml-2">/{pkg.period}</span>
                </div>
              </div>

              <Button
                className={`w-full mb-6 ${
                  pkg.recommended
                    ? 'bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white'
                    : 'bg-[#0A0A0A] text-white border border-[#FF6B00]/20 hover:bg-[#FF6B00]/10'
                }`}
              >
                Get Started
              </Button>

              <ul className="space-y-3">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#1DB954] flex-shrink-0 mt-0.5" />
                    <span className="text-[#B3B3B3] text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>

      {/* Additional Services */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 text-white">Additional Services</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {additionalServices.map((service) => {
            const Icon = service.icon;
            return (
              <Card key={service.title} className="p-6 bg-[#161616] border-[#FF6B00]/20 hover:border-[#FF6B00] transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FFD600] flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-[#FF6B00] transition-colors">
                  {service.title}
                </h3>
                <p className="text-[#B3B3B3] text-sm mb-4">{service.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[#FFD600] font-semibold">{service.price}</span>
                  <ArrowRight className="w-4 h-4 text-[#FF6B00] group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom Solutions */}
      <Card className="p-8 bg-gradient-to-br from-[#FF6B00]/10 to-[#FFD600]/10 border-[#FF6B00]/20">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B00] to-[#FFD600] rounded-lg flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h3 className="text-2xl font-bold mb-2 text-white">Need a Custom Solution?</h3>
            <p className="text-[#B3B3B3] mb-4">
              We can create tailored marketing packages to meet your specific needs and goals. Our team will work with you to design a strategy that maximizes your artists' reach and impact.
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <Button className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white">
                Schedule Consultation
              </Button>
              <Button variant="outline" className="border-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#0A0A0A]">
                View Case Studies
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Success Stories */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 text-white">Success Stories</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-[#FFD600] rounded-full"></div>
              <div>
                <h4 className="font-semibold text-white mb-1">Artist A - "Summer Vibes"</h4>
                <p className="text-sm text-[#B3B3B3]">Professional Package</p>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 text-center sm:grid-cols-3 sm:text-left">
              <div>
                <div className="text-2xl font-bold text-[#1DB954]">+250%</div>
                <div className="text-xs text-[#B3B3B3]">Streams increase</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1DB954]">+180%</div>
                <div className="text-xs text-[#B3B3B3]">Followers growth</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1DB954]">50K+</div>
                <div className="text-xs text-[#B3B3B3]">Playlist adds</div>
              </div>
            </div>
            <p className="text-sm text-[#B3B3B3]">
              "The professional package helped us reach a whole new audience. Our streams tripled within the first month!"
            </p>
          </Card>

          <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-[#FFD600] rounded-full"></div>
              <div>
                <h4 className="font-semibold text-white mb-1">Artist B - "Electric Hearts"</h4>
                <p className="text-sm text-[#B3B3B3]">Premium Package</p>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 text-center sm:grid-cols-3 sm:text-left">
              <div>
                <div className="text-2xl font-bold text-[#1DB954]">+400%</div>
                <div className="text-xs text-[#B3B3B3]">Revenue increase</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1DB954]">1M+</div>
                <div className="text-xs text-[#B3B3B3]">Total reach</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1DB954]">Top 10</div>
                <div className="text-xs text-[#B3B3B3]">Chart position</div>
              </div>
            </div>
            <p className="text-sm text-[#B3B3B3]">
              "The premium package was a game-changer. We charted for the first time and built a sustainable fanbase."
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
