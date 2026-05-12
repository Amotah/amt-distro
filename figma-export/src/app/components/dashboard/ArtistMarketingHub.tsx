import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Link } from 'react-router';
import {
  Megaphone,
  Youtube,
  Package,
  ArrowRight,
} from 'lucide-react';

export function ArtistMarketingHub() {
  const marketingServices = [
    {
      icon: Package,
      title: 'Client Offerings',
      description: 'Explore marketing packages to grow your audience',
      link: '/dashboard/marketing/client-offerings',
      color: 'from-[#FF6B00] to-[#FFD600]',
    },
    {
      icon: Youtube,
      title: 'YouTube Artist Channel',
      description: 'Manage and optimize your YouTube presence',
      link: '/dashboard/marketing/youtube-artist-channel',
      color: 'from-red-600 to-orange-600',
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-white">Marketing Hub</h1>
        <p className="text-[#B3B3B3]">Grow your audience and boost your music career</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {marketingServices.map((service) => {
          const Icon = service.icon;
          return (
            <Link key={service.title} to={service.link}>
              <Card className="group cursor-pointer border border-[#FF6B00]/20 bg-[#161616] p-6 text-white transition-all hover:-translate-y-1 hover:border-[#FF6B00]/45 hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-xl font-semibold transition-colors group-hover:text-[#FFD600]">
                      {service.title}
                    </h3>
                    <p className="mb-4 text-[#B3B3B3]">{service.description}</p>
                    <div className="flex items-center font-medium text-[#FF6B00]">
                      Explore <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
