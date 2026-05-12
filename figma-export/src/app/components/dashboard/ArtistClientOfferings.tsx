import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Check, Package } from 'lucide-react';

export function ArtistClientOfferings() {
  const packages = [
    {
      id: 1,
      name: 'Starter Package',
      price: '₦150,000',
      period: 'per campaign',
      description: 'Perfect for new releases',
      features: [
        'Social media promotion (2 weeks)',
        'Playlist pitching (50+ curators)',
        'Press release distribution',
        'Basic analytics report',
      ],
    },
    {
      id: 2,
      name: 'Professional Package',
      price: '₦350,000',
      period: 'per campaign',
      description: 'Comprehensive marketing solution',
      features: [
        'Social media promotion (4 weeks)',
        'Playlist pitching (150+ curators)',
        'Press release + media outreach',
        'Advanced analytics',
        'Influencer partnerships',
        'YouTube promotion',
      ],
      recommended: true,
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white">Client Offerings</h1>
        <p className="text-[#B3B3B3]">Marketing packages to grow your audience</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {packages.map((pkg) => (
          <Card key={pkg.id} className={`border bg-[#161616] p-6 text-white ${pkg.recommended ? 'border-2 border-[#FF6B00]' : 'border-[#FF6B00]/20'}`}>
            {pkg.recommended && (
              <div className="text-center mb-4">
                <span className="rounded-full bg-[#FF6B00] px-4 py-1 text-sm font-medium text-white">
                  Most Popular
                </span>
              </div>
            )}
            <h3 className="mb-2 text-2xl font-bold">{pkg.name}</h3>
            <p className="mb-4 text-sm text-[#B3B3B3]">{pkg.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-[#FF6B00]">{pkg.price}</span>
              <span className="ml-2 text-[#B3B3B3]">/{pkg.period}</span>
            </div>
            <Button className="mb-6 w-full bg-[#FF6B00] text-white hover:bg-[#ff7f26]">
              Get Started
            </Button>
            <ul className="space-y-3">
              {pkg.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#FFD600]" />
                  <span className="text-sm text-[#E5E5E5]">{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
