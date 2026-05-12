import { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getLabelArtists, type UserProfile } from '../../utils/user-api';
import {
  Youtube,
  TrendingUp,
  Eye,
  Users,
  ThumbsUp,
  MessageCircle,
  Plus,
  BarChart3,
  Video,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ArtistChannel = {
  id: string | number;
  artistName: string;
  channelName: string;
  subscribers: string;
  totalViews: string;
  monthlyViews: string;
  videos: number;
  engagementRate: string;
  status: 'verified' | 'pending';
  profileImage?: string;
  bannerImage?: string;
  handle: string;
};

const channelData = [
  { month: 'Jan', views: 45000, subscribers: 1200 },
  { month: 'Feb', views: 52000, subscribers: 1450 },
  { month: 'Mar', views: 48000, subscribers: 1680 },
  { month: 'Apr', views: 61000, subscribers: 2100 },
  { month: 'May', views: 75000, subscribers: 2650 },
  { month: 'Jun', views: 92000, subscribers: 3200 },
];

const fallbackArtistChannels: ArtistChannel[] = [
  {
    id: 1,
    artistName: 'Artist A',
    channelName: 'Artist A Official',
    subscribers: '45.2K',
    totalViews: '1.2M',
    monthlyViews: '125K',
    videos: 24,
    engagementRate: '8.5%',
    status: 'verified',
    profileImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200&h=360&fit=crop',
    handle: '@artistaofficial',
  },
  {
    id: 2,
    artistName: 'Artist B',
    channelName: 'Artist B Music',
    subscribers: '32.8K',
    totalViews: '890K',
    monthlyViews: '89K',
    videos: 18,
    engagementRate: '12.3%',
    status: 'verified',
    profileImage: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=400&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=1200&h=360&fit=crop',
    handle: '@artistbmusic',
  },
  {
    id: 3,
    artistName: 'Artist C',
    channelName: 'Artist C',
    subscribers: '18.5K',
    totalViews: '450K',
    monthlyViews: '45K',
    videos: 12,
    engagementRate: '6.8%',
    status: 'pending',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=1200&h=360&fit=crop',
    handle: '@artistc',
  },
];

const recentVideos = [
  {
    id: 1,
    title: 'Summer Vibes - Official Music Video',
    artist: 'Artist A',
    views: '125K',
    likes: '8.5K',
    comments: '432',
    uploadDate: '2 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1629426958038-a4cb6e3830a0?w=400',
  },
  {
    id: 2,
    title: 'Electric Hearts (Lyric Video)',
    artist: 'Artist B',
    views: '89K',
    likes: '6.2K',
    comments: '287',
    uploadDate: '5 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
  },
];

function getArtistInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function toChannelHandle(name: string) {
  return `@${name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'artistchannel'}`;
}

function mapProfileToChannel(profile: UserProfile, index: number): ArtistChannel {
  const artistName = profile.artistName || profile.firstName || profile.email.split('@')[0] || `Artist ${index + 1}`;
  const baseSubscribers = 18000 + index * 12500;
  const baseViews = 450000 + index * 240000;
  const monthlyViews = 42000 + index * 18000;
  const videos = 12 + index * 6;

  return {
    id: profile.id,
    artistName,
    channelName: `${artistName} Official`,
    subscribers: `${(baseSubscribers / 1000).toFixed(1)}K`,
    totalViews: `${(baseViews / 1000000).toFixed(1)}M`,
    monthlyViews: `${Math.round(monthlyViews / 1000)}K`,
    videos,
    engagementRate: `${(6.5 + index * 1.3).toFixed(1)}%`,
    status: profile.isVerified ? 'verified' : 'pending',
    profileImage: profile.profileImage,
    bannerImage: profile.bannerImage,
    handle: toChannelHandle(artistName),
  };
}

export function YouTubeArtistChannel() {
  const [artistChannels, setArtistChannels] = useState<ArtistChannel[]>(fallbackArtistChannels);

  useEffect(() => {
    let cancelled = false;

    async function loadLabelArtists() {
      try {
        const artists = await getLabelArtists();
        if (!cancelled && artists.length > 0) {
          setArtistChannels(artists.map(mapProfileToChannel));
        }
      } catch {
        if (!cancelled) {
          setArtistChannels(fallbackArtistChannels);
        }
      }
    }

    loadLabelArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredChannel = useMemo(() => artistChannels[0] || fallbackArtistChannels[0], [artistChannels]);

  const stats = [
    {
      label: 'Total Subscribers',
      value: '96.5K',
      change: '+12.5%',
      icon: Users,
      bgColor: 'bg-[#FF0000]/10',
      iconColor: 'text-[#FF0000]',
    },
    {
      label: 'Monthly Views',
      value: '2.54M',
      change: '+18.2%',
      icon: Eye,
      bgColor: 'bg-[#FF6B00]/10',
      iconColor: 'text-[#FF6B00]',
    },
    {
      label: 'Total Videos',
      value: '54',
      change: '+6',
      icon: Video,
      bgColor: 'bg-[#FFD600]/10',
      iconColor: 'text-[#FFD600]',
    },
    {
      label: 'Avg. Engagement',
      value: '9.2%',
      change: '+2.1%',
      icon: TrendingUp,
      bgColor: 'bg-[#1DB954]/10',
      iconColor: 'text-[#1DB954]',
    },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white">YouTube Artist Channel</h1>
          <p className="text-[#B3B3B3]">Manage artist profile pictures, cover art, and verified channel presentation.</p>
        </div>
        <Button className="bg-gradient-to-r from-[#FF0000] to-[#FF6B00] text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Channel Campaign
        </Button>
      </div>

      <Card className="overflow-hidden border-[#FF6B00]/20 bg-[#161616] p-0">
        <div className="relative h-40 overflow-hidden bg-gradient-to-r from-[#0b5d1e] via-[#0f9d39] to-[#127a33] sm:h-52">
          {featuredChannel.bannerImage ? (
            <ImageWithFallback
              src={featuredChannel.bannerImage}
              alt={`${featuredChannel.artistName} banner`}
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/35 to-transparent" />
        </div>
        <div className="relative px-4 pb-6 sm:px-6">
          <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#161616] bg-[#0A0A0A] text-2xl font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:h-28 sm:w-28">
                {featuredChannel.profileImage ? (
                  <ImageWithFallback
                    src={featuredChannel.profileImage}
                    alt={`${featuredChannel.artistName} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{getArtistInitials(featuredChannel.artistName) || 'AP'}</span>
                )}
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-2xl font-semibold text-white sm:text-3xl">{featuredChannel.artistName}</h2>
                  {featuredChannel.status === 'verified' && (
                    <CheckCircle2 className="h-6 w-6 fill-[#3ea6ff] text-white" />
                  )}
                </div>
                <p className="truncate text-sm text-[#B3B3B3] sm:text-base">
                  {featuredChannel.handle} · {featuredChannel.subscribers} subscribers · {featuredChannel.videos} videos
                </p>
                <p className="mt-1 text-sm text-[#D5D5D5]">
                  YouTube-style artist header with cover art, circular profile image, and blue verification tick.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" className="border-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#0A0A0A]">
                <BarChart3 className="mr-2 h-4 w-4" />
                Channel Analytics
              </Button>
              <Button className="bg-gradient-to-r from-[#FF0000] to-[#FF6B00] text-white">
                <Youtube className="mr-2 h-4 w-4" />
                Visit Channel
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-[#FF6B00]/20 bg-[#161616] p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <Badge className="border-[#1DB954]/20 bg-[#1DB954]/10 text-[#1DB954]">{stat.change}</Badge>
              </div>
              <div className="mb-1 text-3xl font-semibold text-white">{stat.value}</div>
              <div className="text-sm text-[#B3B3B3]">{stat.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="mb-1 text-xl font-semibold text-white">Channel Performance</h3>
              <p className="text-sm text-[#B3B3B3]">Views and subscribers over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={channelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FF6B00" opacity={0.1} />
              <XAxis dataKey="month" stroke="#B3B3B3" fontSize={12} />
              <YAxis stroke="#B3B3B3" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161616',
                  border: '1px solid rgba(255, 107, 0, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line type="monotone" dataKey="views" stroke="#FF0000" strokeWidth={2} name="Views" />
              <Line type="monotone" dataKey="subscribers" stroke="#FFD600" strokeWidth={2} name="Subscribers" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6">
          <div className="mb-6">
            <h3 className="mb-1 text-xl font-semibold text-white">Recent Videos</h3>
            <p className="text-sm text-[#B3B3B3]">Latest uploads across managed artist channels</p>
          </div>
          <div className="space-y-4">
            {recentVideos.map((video) => (
              <div key={video.id} className="flex gap-4 rounded-2xl border border-[#FF6B00]/10 bg-[#0A0A0A]/60 p-3">
                <ImageWithFallback
                  src={video.thumbnail}
                  alt={video.title}
                  className="h-20 w-32 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-white">{video.title}</p>
                  <p className="mt-1 text-xs text-[#B3B3B3]">{video.artist}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#D5D5D5]">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {video.views}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {video.likes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {video.comments}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#8E8E8E]">{video.uploadDate}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="mb-1 text-xl font-semibold text-white">Managed Artist Channels</h3>
              <p className="text-sm text-[#B3B3B3]">Each artist can now show a cover art banner, profile image, and verified state.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {artistChannels.map((channel) => (
              <div key={channel.id} className="overflow-hidden rounded-3xl border border-[#FF6B00]/10 bg-[#0A0A0A]">
                <div className="h-28 overflow-hidden bg-gradient-to-r from-[#0b5d1e] via-[#0f9d39] to-[#127a33]">
                  {channel.bannerImage ? (
                    <ImageWithFallback
                      src={channel.bannerImage}
                      alt={`${channel.artistName} banner`}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="px-4 pb-4">
                  <div className="-mt-8 flex items-end gap-3">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-[#0A0A0A] bg-[#111111] text-lg font-semibold text-white">
                      {channel.profileImage ? (
                        <ImageWithFallback
                          src={channel.profileImage}
                          alt={`${channel.artistName} profile`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{getArtistInitials(channel.artistName) || 'AP'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-lg font-semibold text-white">{channel.channelName}</h4>
                        {channel.status === 'verified' && (
                          <CheckCircle2 className="h-5 w-5 fill-[#3ea6ff] text-white" />
                        )}
                      </div>
                      <p className="truncate text-sm text-[#B3B3B3]">{channel.artistName} · {channel.handle}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-[#141414] p-3 text-center">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#8E8E8E]">Subs</p>
                      <p className="mt-1 text-sm font-semibold text-white">{channel.subscribers}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#8E8E8E]">Views</p>
                      <p className="mt-1 text-sm font-semibold text-white">{channel.totalViews}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#8E8E8E]">Rate</p>
                      <p className="mt-1 text-sm font-semibold text-white">{channel.engagementRate}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6">
          <div className="mb-6">
            <h3 className="mb-1 text-xl font-semibold text-white">View Momentum</h3>
            <p className="text-sm text-[#B3B3B3]">Monthly views trend for current channel activity</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={channelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FF6B00" opacity={0.1} />
              <XAxis dataKey="month" stroke="#B3B3B3" fontSize={12} />
              <YAxis stroke="#B3B3B3" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161616',
                  border: '1px solid rgba(255, 107, 0, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="views" fill="#FF6B00" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 rounded-2xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#8E8E8E]">Top growth</p>
                <p className="mt-1 text-lg font-semibold text-white">{featuredChannel.artistName}</p>
              </div>
              <Badge className="border-[#1DB954]/20 bg-[#1DB954]/10 text-[#1DB954]">
                <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                +18.2%
              </Badge>
            </div>
            <p className="mt-3 text-sm text-[#D5D5D5]">
              This highlighted artist now shows the full channel identity block with uploaded avatar, cover art, and blue verification check.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}