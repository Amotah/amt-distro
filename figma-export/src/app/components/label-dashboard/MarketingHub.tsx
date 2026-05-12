import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Link } from 'react-router';
import {
  Megaphone,
  TrendingUp,
  Users,
  Eye,
  ArrowRight,
  Youtube,
  Instagram,
  Music,
  Target,
  BarChart3,
  Sparkles,
} from 'lucide-react';

export function MarketingHub() {
  const marketingServices = [
    {
      icon: Users,
      title: 'Client Offerings',
      description: 'Comprehensive marketing packages and services for your artists',
      link: '/label-dashboard/marketing/client-offerings',
      color: 'from-[#FF6B00] to-[#FFD600]',
    },
    {
      icon: Youtube,
      title: 'YouTube Artist Channel',
      description: 'Manage and grow your artists\' YouTube presence',
      link: '/label-dashboard/marketing/youtube-artist-channel',
      color: 'from-[#FF0000] to-[#FF6B00]',
    },
  ];

  const activecampaigns = [
    {
      id: 1,
      title: 'Summer Vibes Release Campaign',
      artist: 'Artist A',
      status: 'active',
      reach: '125K',
      engagement: '8.5%',
      budget: '₦500,000',
    },
    {
      id: 2,
      title: 'Electric Hearts Promo',
      artist: 'Artist B',
      status: 'active',
      reach: '89K',
      engagement: '12.3%',
      budget: '₦350,000',
    },
  ];

  const stats = [
    {
      label: 'Total Campaigns',
      value: '24',
      change: '+6',
      icon: Megaphone,
      bgColor: 'bg-[#FF6B00]/10',
      iconColor: 'text-[#FF6B00]',
    },
    {
      label: 'Total Reach',
      value: '1.2M',
      change: '+18.5%',
      icon: Eye,
      bgColor: 'bg-[#1DB954]/10',
      iconColor: 'text-[#1DB954]',
    },
    {
      label: 'Avg. Engagement',
      value: '10.2%',
      change: '+2.3%',
      icon: TrendingUp,
      bgColor: 'bg-[#FFD600]/10',
      iconColor: 'text-[#FFD600]',
    },
    {
      label: 'Marketing Spend',
      value: '₦2.4M',
      change: '+12%',
      icon: Target,
      bgColor: 'bg-[#FF6B00]/10',
      iconColor: 'text-[#FF6B00]',
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Marketing Hub</h1>
          <p className="text-[#B3B3B3]">Manage your marketing campaigns and promotional activities</p>
        </div>
        <Button className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white">
          <Megaphone className="w-5 h-5 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6 bg-[#161616] border-[#FF6B00]/20">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20">
                  {stat.change}
                </Badge>
              </div>
              <div className="text-3xl font-semibold mb-1 text-white">{stat.value}</div>
              <div className="text-sm text-[#B3B3B3]">{stat.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Marketing Services */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-white">Marketing Services</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {marketingServices.map((service) => {
            const Icon = service.icon;
            return (
              <Link key={service.title} to={service.link}>
                <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 hover:border-[#FF6B00] transition-all cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-[#FF6B00] transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-[#B3B3B3] mb-4">{service.description}</p>
                      <div className="flex items-center text-[#FF6B00] font-medium">
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

      {/* Active Campaigns */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">Active Campaigns</h2>
          <Button variant="ghost" size="sm" className="text-[#FF6B00] hover:bg-[#0A0A0A]">
            View All <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        <div className="space-y-4">
          {activecampaigns.map((campaign) => (
            <Card key={campaign.id} className="p-6 bg-[#161616] border-[#FF6B00]/20">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{campaign.title}</h3>
                    <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20">
                      Active
                    </Badge>
                  </div>
                  <p className="text-[#B3B3B3]">{campaign.artist}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3 sm:text-left sm:gap-6">
                  <div>
                    <div className="text-sm text-[#B3B3B3] mb-1">Reach</div>
                    <div className="text-lg font-semibold text-white">{campaign.reach}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#B3B3B3] mb-1">Engagement</div>
                    <div className="text-lg font-semibold text-[#1DB954]">{campaign.engagement}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#B3B3B3] mb-1">Budget</div>
                    <div className="text-lg font-semibold text-white">{campaign.budget}</div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#0A0A0A]"
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 bg-gradient-to-br from-[#FF6B00]/10 to-[#FFD600]/10 border-[#FF6B00]/20">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-[#FFD600] rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Need Marketing Help?</h3>
            <p className="text-[#B3B3B3]">Our team is ready to help you grow your artists</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white">
            Contact Marketing Team
          </Button>
          <Button variant="outline" className="border-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#0A0A0A]">
            View Resources
          </Button>
        </div>
      </Card>
    </div>
  );
}
