import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  Play,
  Globe,
  TrendingUp,
  Users,
  ArrowUpRight,
  Download,
  FileText,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts';

// Mock data for streams by month
const streamsMonthlyData = [
  { month: 'Jan', streams: 120000, listeners: 45000, engagement: 78 },
  { month: 'Feb', streams: 135000, listeners: 48500, engagement: 82 },
  { month: 'Mar', streams: 128000, listeners: 46200, engagement: 79 },
  { month: 'Apr', streams: 155000, listeners: 52300, engagement: 85 },
  { month: 'May', streams: 185000, listeners: 58900, engagement: 88 },
  { month: 'Jun', streams: 210000, listeners: 64200, engagement: 91 },
  { month: 'Jul', streams: 225000, listeners: 68100, engagement: 89 },
  { month: 'Aug', streams: 242000, listeners: 71500, engagement: 92 },
  { month: 'Sep', streams: 218000, listeners: 65800, engagement: 87 },
  { month: 'Oct', streams: 265000, listeners: 74200, engagement: 94 },
  { month: 'Nov', streams: 295000, listeners: 82500, engagement: 96 },
  { month: 'Dec', streams: 328000, listeners: 89400, engagement: 98 },
];

// Mock data for streams by country
const streamsByCountry = [
  { country: 'Nigeria', streams: 456200, percentage: 38, listeners: 125000, color: '#1DB954' },
  { country: 'United States', streams: 325100, percentage: 27, listeners: 89000, color: '#FA243C' },
  { country: 'United Kingdom', streams: 182400, percentage: 15, listeners: 52000, color: '#9333EA' },
  { country: 'South Africa', streams: 119700, percentage: 10, listeners: 34000, color: '#FF6B00' },
  { country: 'Ghana', streams: 89500, percentage: 7, listeners: 28000, color: '#FFD600' },
  { country: 'Others', streams: 36100, percentage: 3, listeners: 12000, color: '#666666' },
];

// Mock data for streams by platform
const streamsByPlatform = [
  { 
    platform: 'Spotify', 
    streams: 542000, 
    percentage: 45, 
    growth: '+18.5%',
    color: '#1DB954',
    avgListenTime: '3:24'
  },
  { 
    platform: 'Apple Music', 
    streams: 338400, 
    percentage: 28, 
    growth: '+12.3%',
    color: '#FA243C',
    avgListenTime: '3:18'
  },
  { 
    platform: 'YouTube Music', 
    streams: 181200, 
    percentage: 15, 
    growth: '+25.7%',
    color: '#FF0000',
    avgListenTime: '2:45'
  },
  { 
    platform: 'Deezer', 
    streams: 96800, 
    percentage: 8, 
    growth: '+8.2%',
    color: '#00C7F2',
    avgListenTime: '3:12'
  },
  { 
    platform: 'Others', 
    streams: 48600, 
    percentage: 4, 
    growth: '+5.1%',
    color: '#9333EA',
    avgListenTime: '3:05'
  },
];

// Mock data for audience demographics
const audienceDemographics = [
  { ageGroup: '13-17', percentage: 8, count: 12400 },
  { ageGroup: '18-24', percentage: 28, count: 43400 },
  { ageGroup: '25-34', percentage: 35, count: 54300 },
  { ageGroup: '35-44', percentage: 18, count: 27900 },
  { ageGroup: '45-54', percentage: 8, count: 12400 },
  { ageGroup: '55+', percentage: 3, count: 4600 },
];

const COLORS = ['#9333EA', '#1DB954', '#FA243C', '#FF6B00', '#00C7F2', '#666666'];

export function ArtistAnalytics() {
  const [timeRange, setTimeRange] = useState('12months');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = (format: 'csv' | 'pdf') => {
    setIsDownloading(true);
    
    setTimeout(() => {
      const fileName = `analytics-report-${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (format === 'csv') {
        const headers = ['Platform', 'Streams', 'Percentage', 'Growth', 'Avg Listen Time'];
        const rows = streamsByPlatform.map(platform => [
          platform.platform,
          platform.streams,
          `${platform.percentage}%`,
          platform.growth,
          platform.avgListenTime,
        ]);
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(',')),
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('PDF download would be implemented with jsPDF library');
      }
      
      setIsDownloading(false);
    }, 1000);
  };

  const totalStreams = streamsByPlatform.reduce((sum, platform) => sum + platform.streams, 0);
  const totalListeners = streamsByCountry.reduce((sum, country) => sum + country.listeners, 0);
  const avgEngagement = 92;
  const growthRate = '+24.8%';

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header with Download Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-[#B3B3B3]">Track your streams and audience insights</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => handleDownloadReport('csv')}
            disabled={isDownloading}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
          <Button
            onClick={() => handleDownloadReport('pdf')}
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Play className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              <span className="text-green-600">{growthRate}</span>
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1">{(totalStreams / 1000000).toFixed(1)}M</div>
          <div className="text-sm text-[#B3B3B3]">Total Streams</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              <span className="text-green-600">+15.3%</span>
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1">{(totalListeners / 1000).toFixed(1)}K</div>
          <div className="text-sm text-[#B3B3B3]">Total Listeners</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1">{avgEngagement}%</div>
          <div className="text-sm text-[#B3B3B3]">Avg Engagement</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <Globe className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1">{streamsByCountry.length}</div>
          <div className="text-sm text-[#B3B3B3]">Countries</div>
        </Card>
      </div>

      {/* Streams Over Time */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Streams Over Time</h3>
            <p className="text-sm text-[#B3B3B3]">Monthly streaming performance</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-[#FF6B00]/20 rounded-lg text-sm"
          >
            <option value="6months">Last 6 months</option>
            <option value="12months">Last 12 months</option>
            <option value="all">All time</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={streamsMonthlyData}>
            <defs>
              <linearGradient id="colorStreams" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9333EA" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9333EA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number) => value.toLocaleString()}
            />
            <Area
              type="monotone"
              dataKey="streams"
              fill="url(#colorStreams)"
              stroke="#9333EA"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="listeners"
              stroke="#1DB954"
              strokeWidth={2}
              dot={{ fill: '#1DB954', r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600"></div>
            <span className="text-sm text-[#B3B3B3]">Streams</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span className="text-sm text-[#B3B3B3]">Listeners</span>
          </div>
        </div>
      </Card>

      {/* Streams by Platform and Country */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Streams by Platform */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-1">Streams by Platform</h3>
              <p className="text-sm text-[#B3B3B3]">Platform distribution</p>
            </div>
            <BarChart3 className="w-5 h-5 text-[#B3B3B3]" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={streamsByPlatform}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="platform" stroke="#888" fontSize={11} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Bar dataKey="streams" radius={[8, 8, 0, 0]}>
                {streamsByPlatform.map((entry, index) => (
                  <Cell key={`platform-bar-${entry.platform}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-6">
            {streamsByPlatform.map((platform) => (
              <div key={platform.platform} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-sm">{platform.platform}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{platform.streams.toLocaleString()}</div>
                  <div className="text-xs text-green-600">{platform.growth}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Streams by Country */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-1">Streams by Country</h3>
              <p className="text-sm text-[#B3B3B3]">Geographic distribution</p>
            </div>
            <Globe className="w-5 h-5 text-[#B3B3B3]" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={streamsByCountry}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={90}
                fill="#8884d8"
                dataKey="streams"
              >
                {streamsByCountry.map((entry, index) => (
                  <Cell key={`country-pie-${entry.country}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-6">
            {streamsByCountry.map((country) => (
              <div key={country.country} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: country.color }}
                  />
                  <span className="text-sm">{country.country}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{country.streams.toLocaleString()}</div>
                  <div className="text-xs text-[#B3B3B3]">{country.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Platform Details Table */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-1">Platform Performance</h3>
          <p className="text-sm text-[#B3B3B3]">Detailed platform analytics</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-[#FF6B00]/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Total Streams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Growth
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Avg Listen Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FF6B00]/10">
              {streamsByPlatform.map((platform) => (
                <tr key={platform.platform} className="hover:bg-[#0A0A0A]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="font-medium text-white">{platform.platform}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white">
                      {platform.streams.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#B3B3B3]">{platform.percentage}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-green-600 font-medium">{platform.growth}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white">{platform.avgListenTime}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audience Demographics */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-1">Audience Demographics</h3>
          <p className="text-sm text-[#B3B3B3]">Age group distribution</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={audienceDemographics} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" stroke="#888" fontSize={12} />
            <YAxis dataKey="ageGroup" type="category" stroke="#888" fontSize={12} width={60} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="percentage" radius={[0, 8, 8, 0]}>
              {audienceDemographics.map((entry, index) => (
                <Cell key={`demo-bar-${entry.ageGroup}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
