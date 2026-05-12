import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Music,
  DollarSign,
  Play,
  Download,
  Globe,
  Calendar,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const streamingData = [
  { month: 'Jan', streams: 45000, revenue: 60000 },
  { month: 'Feb', streams: 52000, revenue: 69300 },
  { month: 'Mar', streams: 61000, revenue: 81300 },
  { month: 'Apr', streams: 58000, revenue: 77300 },
  { month: 'May', streams: 72000, revenue: 96000 },
  { month: 'Jun', streams: 85000, revenue: 113300 },
];

const topTracks = [
  { title: 'Summer Vibes', streams: '125.4K', growth: '+12%', trending: 'up' },
  { title: 'Electric Hearts', streams: '89.2K', growth: '+8%', trending: 'up' },
  { title: 'Midnight Dreams', streams: '67.3K', growth: '-3%', trending: 'down' },
  { title: 'Acoustic Sessions', streams: '54.1K', growth: '+15%', trending: 'up' },
  { title: 'Urban Nights', streams: '42.8K', growth: '+5%', trending: 'up' },
];

const topPlatforms = [
  { name: 'Spotify', streams: '156.3K', percentage: 42, color: 'bg-green-500' },
  { name: 'Apple Music', streams: '98.7K', percentage: 27, color: 'bg-pink-500' },
  { name: 'YouTube Music', streams: '67.2K', percentage: 18, color: 'bg-red-500' },
  { name: 'Amazon Music', streams: '32.1K', percentage: 9, color: 'bg-blue-500' },
  { name: 'Others', streams: '14.9K', percentage: 4, color: 'bg-gray-400' },
];

const topCountries = [
  { country: 'United States', flag: '🇺🇸', streams: '98.5K', percentage: 34 },
  { country: 'United Kingdom', flag: '🇬🇧', streams: '52.3K', percentage: 18 },
  { country: 'Germany', flag: '🇩🇪', streams: '38.7K', percentage: 13 },
  { country: 'Brazil', flag: '🇧🇷', streams: '29.4K', percentage: 10 },
  { country: 'Canada', flag: '🇨🇦', streams: '24.1K', percentage: 8 },
];

const demographics = [
  { age: '18-24', percentage: 28, color: 'bg-purple-500' },
  { age: '25-34', percentage: 35, color: 'bg-pink-500' },
  { age: '35-44', percentage: 22, color: 'bg-blue-500' },
  { age: '45-54', percentage: 10, color: 'bg-green-500' },
  { age: '55+', percentage: 5, color: 'bg-gray-500' },
];

export function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl mb-2">Analytics</h1>
            <p className="text-gray-600">Track your music performance and audience insights</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              onClick={() => setTimeRange('90d')}
            >
              90 Days
            </Button>
            <Button
              variant={timeRange === '1y' ? 'default' : 'outline'}
              onClick={() => setTimeRange('1y')}
            >
              1 Year
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Play className="w-6 h-6 text-purple-600" />
              </div>
              <Badge variant="secondary" className="text-green-700 bg-green-100">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.5%
              </Badge>
            </div>
            <div className="text-3xl mb-1">214.6K</div>
            <div className="text-gray-600">Total Streams</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <Badge variant="secondary" className="text-green-700 bg-green-100">
                <TrendingUp className="w-3 h-3 mr-1" />
                +8.2%
              </Badge>
            </div>
            <div className="text-3xl mb-1">₦247,100</div>
            <div className="text-gray-600">Total Revenue</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <Badge variant="secondary" className="text-green-700 bg-green-100">
                <TrendingUp className="w-3 h-3 mr-1" />
                +18.3%
              </Badge>
            </div>
            <div className="text-3xl mb-1">45.8K</div>
            <div className="text-gray-600">Monthly Listeners</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center">
                <Music className="w-6 h-6 text-pink-600" />
              </div>
              <Badge variant="secondary" className="text-gray-700 bg-gray-100">
                +2
              </Badge>
            </div>
            <div className="text-3xl mb-1">12</div>
            <div className="text-gray-600">Active Releases</div>
          </Card>
        </div>

        {/* Streaming Trend Chart */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl mb-6">Streaming Trend</h2>
          <div className="space-y-4">
            {streamingData.map((data, index) => {
              const maxStreams = Math.max(...streamingData.map((d) => d.streams));
              const percentage = (data.streams / maxStreams) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 w-12">{data.month}</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-pink-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-white text-sm font-medium">
                            {data.streams.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      ₦{data.revenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Top Tracks */}
          <Card className="p-6">
            <h2 className="text-2xl mb-6">Top Tracks</h2>
            <div className="space-y-4">
              {topTracks.map((track, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{track.title}</div>
                    <div className="text-sm text-gray-600">{track.streams} streams</div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      track.trending === 'up'
                        ? 'text-green-700 bg-green-100'
                        : 'text-red-700 bg-red-100'
                    }
                  >
                    {track.trending === 'up' ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {track.growth}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Platforms */}
          <Card className="p-6">
            <h2 className="text-2xl mb-6">Platform Distribution</h2>
            <div className="space-y-4">
              {topPlatforms.map((platform, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{platform.name}</span>
                    <span className="text-sm text-gray-600">
                      {platform.streams} ({platform.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${platform.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${platform.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Geography and Demographics */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Top Countries */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl">Top Countries</h2>
            </div>
            <div className="space-y-4">
              {topCountries.map((country, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-2xl">{country.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{country.country}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-full rounded-full"
                        style={{ width: `${country.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{country.streams}</div>
                    <div className="text-sm text-gray-600">{country.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Demographics */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl">Audience Age</h2>
            </div>
            <div className="space-y-4">
              {demographics.map((demo, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{demo.age} years</span>
                    <span className="text-sm text-gray-600">{demo.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${demo.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${demo.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl mb-1">52%</div>
                  <div className="text-sm text-gray-600">Male</div>
                </div>
                <div className="text-center p-4 bg-pink-50 rounded-lg">
                  <div className="text-3xl mb-1">48%</div>
                  <div className="text-sm text-gray-600">Female</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Export Button */}
        <div className="mt-8 flex justify-end">
          <Button variant="outline" className="gap-2">
            <Download className="w-5 h-5" />
            Export Report
          </Button>
        </div>
      </div>
    </section>
  );
}