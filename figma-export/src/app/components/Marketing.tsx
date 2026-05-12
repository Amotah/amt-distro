import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Megaphone,
  Share2,
  Link,
  Instagram,
  Facebook,
  Twitter,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Calendar,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const campaigns = [
  {
    id: 1,
    title: 'Summer Vibes Pre-Save',
    type: 'Pre-Save Campaign',
    status: 'Active',
    startDate: '2024-05-15',
    endDate: '2024-06-15',
    saves: 1247,
    clicks: 3521,
    conversion: '35.4%',
  },
  {
    id: 2,
    title: 'Electric Hearts Release',
    type: 'Release Campaign',
    status: 'Completed',
    startDate: '2024-08-01',
    endDate: '2024-08-31',
    saves: 892,
    clicks: 2340,
    conversion: '38.1%',
  },
];

const socialPosts = [
  {
    id: 1,
    platform: 'Instagram',
    content: 'New track dropping this Friday! 🎵',
    image: 'https://images.unsplash.com/photo-1629426958038-a4cb6e3830a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW55bCUyMHJlY29yZHMlMjBtdXNpY3xlbnwxfHx8fDE3NjYyMjk0NTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    likes: 2341,
    comments: 156,
    shares: 89,
    scheduled: '2024-12-28 18:00',
  },
  {
    id: 2,
    platform: 'Twitter',
    content: 'Thanks for 100K streams on Summer Vibes! You all are amazing 🙏',
    likes: 1523,
    comments: 87,
    shares: 234,
    posted: '2024-12-20',
  },
];

const smartLinks = [
  {
    id: 1,
    title: 'Summer Vibes - All Platforms',
    url: 'amtdistro.link/summer-vibes',
    clicks: 5642,
    platforms: ['Spotify', 'Apple Music', 'YouTube', 'Amazon'],
  },
  {
    id: 2,
    title: 'Electric Hearts - Universal Link',
    url: 'amtdistro.link/electric-hearts',
    clicks: 3821,
    platforms: ['Spotify', 'Apple Music', 'YouTube', 'Deezer'],
  },
];

interface MarketingProps {
  onNavigate: (page: string) => void;
}

export function Marketing({ onNavigate }: MarketingProps) {
  return (
    <section className="py-4 sm:py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl mb-2">Marketing</h1>
            <p className="text-gray-600 text-sm sm:text-base">Promote your music and grow your audience</p>
          </div>
          <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={() => onNavigate('new-campaign')}>
            <Plus className="w-5 h-5" />
            New Campaign
          </Button>
        </div>

        {/* Marketing Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs">
                Active
              </Badge>
            </div>
            <div className="text-2xl sm:text-3xl mb-1">3</div>
            <div className="text-gray-600 text-xs sm:text-sm">Active Campaigns</div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                +24%
              </Badge>
            </div>
            <div className="text-2xl sm:text-3xl mb-1">12.4K</div>
            <div className="text-gray-600 text-xs sm:text-sm">Total Clicks</div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                +18%
              </Badge>
            </div>
            <div className="text-2xl sm:text-3xl mb-1">2,139</div>
            <div className="text-gray-600 text-xs sm:text-sm">New Fans</div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-pink-100 flex items-center justify-center">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl mb-1">36.2%</div>
            <div className="text-gray-600 text-xs sm:text-sm">Avg. Conversion</div>
          </Card>
        </div>

        {/* Active Campaigns */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl">Campaigns</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl truncate">{campaign.title}</h3>
                      <Badge
                        className={
                          campaign.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mb-3">{campaign.type}</div>
                    <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">
                          {new Date(campaign.startDate).toLocaleDateString()} -{' '}
                          {new Date(campaign.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:gap-6">
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl mb-1">{campaign.saves}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Saves</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl mb-1">{campaign.clicks}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Clicks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl mb-1">{campaign.conversion}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Conv.</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full lg:w-auto">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Smart Links */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              <h2 className="text-xl sm:text-2xl">Smart Links</h2>
            </div>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto" onClick={() => onNavigate('create-smart-link')}>
              <Plus className="w-4 h-4" />
              Create Link
            </Button>
          </div>
          <div className="space-y-4">
            {smartLinks.map((link) => (
              <div
                key={link.id}
                className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg mb-2 truncate">{link.title}</h3>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <code className="px-2 sm:px-3 py-1 bg-gray-100 rounded text-xs sm:text-sm truncate max-w-full">
                        {link.url}
                      </code>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {link.platforms.map((platform, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 lg:gap-4">
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl mb-1">{link.clicks}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Total Clicks</div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">Analytics</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Social Media & Marketing Tools */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Scheduled Posts */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl">Social Media</h2>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Post</span>
              </Button>
            </div>
            <div className="space-y-4">
              {socialPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-3 sm:p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-start gap-2 sm:gap-3 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                      {post.platform === 'Instagram' && (
                        <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      )}
                      {post.platform === 'Twitter' && (
                        <Twitter className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      )}
                      {post.platform === 'Facebook' && (
                        <Facebook className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-medium text-sm sm:text-base">{post.platform}</span>
                        {post.scheduled && (
                          <Badge variant="outline" className="text-xs">
                            Scheduled: {post.scheduled}
                          </Badge>
                        )}
                        {post.posted && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Posted
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm sm:text-base text-gray-700 mb-3">{post.content}</p>
                      {post.image && (
                        <div className="w-full h-24 sm:h-32 rounded-lg overflow-hidden mb-3">
                          <ImageWithFallback
                            src={post.image}
                            alt="Post"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                          {post.likes}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                          {post.comments}
                        </div>
                        <div className="flex items-center gap-1">
                          <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          {post.shares}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Marketing Tools */}
          <Card className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl mb-4 sm:mb-6">Marketing Tools</h2>
            <div className="space-y-4">
              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg mb-1">Pre-Save Campaign</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Build hype for your upcoming release with pre-save links
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg mb-1">Social Media Kit</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Download promotional graphics and assets for social media
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer" onClick={() => onNavigate('create-smart-link')}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Link className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg mb-1">Smart Links</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Create universal links to all your streaming platforms
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg mb-1">Playlist Pitching</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Submit your music to curators and playlist editors
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}