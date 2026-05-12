import { useState, useEffect } from 'react';
import { useLanguage } from '../utils/i18n';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Upload,
  Music,
  TrendingUp,
  DollarSign,
  Eye,
  MoreVertical,
  Play,
  Calendar,
  MapPin,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Badge } from './ui/badge';

const mockReleases = [
  {
    id: 1,
    title: 'Summer Vibes',
    artist: 'Your Artist Name',
    coverArt: 'https://images.unsplash.com/photo-1629426958038-a4cb6e3830a0?w=400',
    status: 'Live',
    streams: '125.4K',
    revenue: '₦142,833.50',
    releaseDate: '2024-06-15',
  },
  {
    id: 2,
    title: 'Midnight Dreams',
    artist: 'Your Artist Name',
    coverArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    status: 'Processing',
    streams: '0',
    revenue: '₦0.00',
    releaseDate: '2024-12-28',
  },
  {
    id: 3,
    title: 'Electric Hearts',
    artist: 'Your Artist Name',
    coverArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    status: 'Live',
    streams: '89.2K',
    revenue: '₦104,268.80',
    releaseDate: '2024-08-22',
  },
];

const metrics = [
  {
    label: 'Total Revenue',
    value: '₦247,102.30',
    change: '+8.2%',
    icon: DollarSign,
  },
  {
    label: 'Active Releases',
    value: '12',
    change: '+2',
    icon: Music,
  },
  {
    label: 'Monthly Listeners',
    value: '45.8K',
    change: '+18.3%',
    icon: Eye,
  },
];

export function Dashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mock user data - in real app, this would come from auth context/API
  const userData = {
    firstName: 'John',
    lastName: 'Doe',
    location: 'Lagos, Nigeria',
    lastLogin: {
      time: '2026-03-27T18:45:00',
      location: 'Lagos, Nigeria',
    },
  };

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return t('dashboard.greeting.morning', 'Good Morning');
    if (hour < 17) return t('dashboard.greeting.afternoon', 'Good Afternoon');
    return t('dashboard.greeting.evening', 'Good Evening');
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format last login time
  const formatLastLogin = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <section id="dashboard" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Greeting and User Info Section */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
            {/* Left: Greeting */}
            <div>
              <h2 className="text-4xl mb-2">
                {getGreeting()}, {userData.firstName }
              </h2>
              <p className="text-xl text-gray-600">
                {t('dashboard.subtitle', "Track your music's performance and manage your releases")}
              </p>
            </div>

            {/* Right: User Info Card */}
            <Card className="p-6 lg:min-w-[380px] border-2">
              <div className="space-y-4">
                {/* Role */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">{t('dashboard.role', 'Role')}</div>
                    <div className="font-semibold">{(userData as any).role ?? 'Artist'}</div>
                  </div>
                </div>

                {/* Current Location & Time */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">{t('dashboard.location', 'Current Location')}</div>
                    <div className="font-semibold">{userData.location}</div>
                  </div>
                </div>

                {/* Current Time */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">{t('dashboard.time', 'Current Time')}</div>
                    <div className="font-semibold">{formatTime(currentTime)}</div>
                    <div className="text-xs text-gray-500">{formatDate(currentTime)}</div>
                  </div>
                </div>

                {/* Last Login */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">{t('dashboard.lastLogin', 'Last Login')}</div>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{formatLastLogin(userData.lastLogin.time)}</div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-3 h-3" />
                      {userData.lastLogin.location}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="overview">{t('dashboard.tab.overview', 'Overview')}</TabsTrigger>
            <TabsTrigger value="releases">{t('dashboard.tab.releases', 'Releases')}</TabsTrigger>
            <TabsTrigger value="upload">{t('dashboard.tab.upload', 'Upload New')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {metrics.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-purple-600" />
                      </div>
                      <Badge variant="secondary" className="text-green-700 bg-green-100">
                        {stat.change}
                      </Badge>
                    </div>
                    <div className="text-3xl mb-1">{stat.value}</div>
                    <div className="text-gray-600">{stat.label}</div>
                  </Card>
                );
              })}
            </div>

            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-2xl mb-4">{t('dashboard.recentReleases', 'Recent Releases')}</h3>
              <div className="space-y-4">
                {mockReleases.slice(0, 3).map((release) => (
                  <div
                    key={release.id}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={release.coverArt}
                        alt={release.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 truncate">{release.title}</div>
                      <div className="text-sm text-gray-600">{release.artist}</div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={release.status === 'Live' ? 'default' : 'secondary'}
                        className={release.status === 'Live' ? 'bg-green-600' : ''}
                      >
                        {release.status}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">{release.streams} {t('dashboard.streams', 'streams')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="releases">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockReleases.map((release) => (
                <Card key={release.id} className="overflow-hidden">
                  <div className="aspect-square relative">
                    <ImageWithFallback
                      src={release.coverArt}
                      alt={release.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge
                      variant={release.status === 'Live' ? 'default' : 'secondary'}
                      className={`absolute top-4 right-4 ${
                        release.status === 'Live' ? 'bg-green-600' : ''
                      }`}
                    >
                      {release.status}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl mb-1">{release.title}</h3>
                    <p className="text-gray-600 mb-4">{release.artist}</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                      <div className="text-sm text-gray-600">{t('dashboard.releases.streams', 'Streams')}</div>
                        <div className="text-lg">{release.streams}</div>
                      </div>
                      <div>
                      <div className="text-sm text-gray-600">{t('dashboard.releases.revenue', 'Revenue')}</div>
                        <div className="text-lg">{release.revenue}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {t('dashboard.releases.released', 'Released')} {release.releaseDate}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="upload">
            <Card className="p-8 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl mb-2">{t('dashboard.upload.title', 'Upload New Release')}</h3>
                <p className="text-gray-600">
                  {t('dashboard.upload.subtitle', 'Share your music with the world. Distribute to 150+ platforms.')}
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-600 transition-colors cursor-pointer mb-6">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="mb-2">{t('dashboard.upload.drag', 'Drag & drop your audio files here')}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {t('dashboard.upload.or', 'or click to browse (WAV, FLAC)')}
                </p>
                <Button variant="outline">{t('dashboard.upload.choose', 'Choose Files')}</Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2">{t('dashboard.upload.releaseTitle', 'Release Title')}</label>
                  <input
                    type="text"
                    placeholder={t('dashboard.upload.releaseTitlePlaceholder', 'Enter your release title')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block mb-2">{t('dashboard.upload.artistName', 'Artist Name')}</label>
                  <input
                    type="text"
                    placeholder="Enter artist name"
                    title="Artist Name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block mb-2">Release Date</label>
                  <input
                    type="date"
                    title="Release Date"
                    placeholder="YYYY-MM-DD"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <Button className="w-full" size="lg">
                  Continue to Upload
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}