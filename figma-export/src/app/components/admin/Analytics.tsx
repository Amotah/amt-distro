import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';
import {
  TrendingUp,
  Users,
  Music,
  Globe,
  Award,
  Activity,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function Analytics() {
  const { hasPermission } = useAdmin();
  const [releases, setReleases] = useState<adminApi.Release[]>([]);
  const [users, setUsers] = useState<adminApi.User[]>([]);
  const [stats, setStats] = useState<adminApi.AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canView = hasPermission('system.analytics');

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setIsLoading(true);
      const [releasesData, usersData, statsData] = await Promise.allSettled([
        adminApi.getAllReleases(),
        adminApi.getAllUsers(),
        adminApi.getAdminStatistics(),
      ]);

      if (releasesData.status === 'fulfilled') setReleases(releasesData.value);
      if (usersData.status === 'fulfilled') setUsers(usersData.value);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="w-16 h-16 mx-auto mb-4" style={{ color: '#FF5252' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>Access Denied</h2>
          <p style={{ color: '#A0A7B8' }}>You don't have permission to view analytics.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#00E5FF' }}></div>
      </div>
    );
  }

  // Calculate top artists by streams
  const artistStreams = releases.reduce((acc, release) => {
    const artist = release.primaryArtist;
    const streams = release.totalStreams || 0;
    acc[artist] = (acc[artist] || 0) + streams;
    return acc;
  }, {} as Record<string, number>);

  const topArtists = Object.entries(artistStreams)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([artist, streams]) => ({ artist, streams }));

  // Calculate top tracks
  const topTracks = releases
    .sort((a, b) => (b.totalStreams || 0) - (a.totalStreams || 0))
    .slice(0, 10)
    .map(r => ({
      title: r.title.length > 20 ? r.title.substring(0, 20) + '...' : r.title,
      artist: r.primaryArtist,
      streams: r.totalStreams || 0,
    }));

  // Streams by country data
  const streamsByCountry = [
    { country: 'Nigeria', streams: 45000, fill: '#00E5FF' },
    { country: 'Ghana', streams: 28000, fill: '#7B61FF' },
    { country: 'South Africa', streams: 23000, fill: '#00FFA3' },
    { country: 'Kenya', streams: 18000, fill: '#FF9800' },
    { country: 'UK', streams: 15000, fill: '#FF5252' },
    { country: 'USA', streams: 12000, fill: '#FFB800' },
    { country: 'Others', streams: 35000, fill: '#A0A7B8' },
  ];

  // Genre distribution
  const genreData = [
    { genre: 'Afrobeats', value: 45, fill: '#00E5FF' },
    { genre: 'Hip-Hop', value: 25, fill: '#7B61FF' },
    { genre: 'R&B', value: 15, fill: '#00FFA3' },
    { genre: 'Gospel', value: 10, fill: '#FF9800' },
    { genre: 'Other', value: 5, fill: '#A0A7B8' },
  ];

  const totalStreams = releases.reduce((sum, r) => sum + (r.totalStreams || 0), 0);
  const avgStreamsPerTrack = releases.length > 0 ? Math.floor(totalStreams / releases.length) : 0;
  const totalAdmins = stats?.totalAdmins ?? 0;
  const recentActions = stats?.recentActions ?? 0;
  const adminsByRole = stats?.adminsByRole ?? {};

  const roleData = Object.entries(adminsByRole).map(([role, count]) => ({ role, count }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-8 h-8" style={{ color: '#7B61FF' }} />
          <h1 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
            Analytics Dashboard
          </h1>
        </div>
        <p style={{ color: '#A0A7B8' }}>
          Deep insights into platform performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-6 border relative overflow-hidden"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(0, 229, 255, 0.2)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
            style={{ background: 'radial-gradient(circle, #00E5FF 0%, transparent 70%)' }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: '#A0A7B8' }}>Total Streams</p>
              <Activity className="w-5 h-5" style={{ color: '#00E5FF' }} />
            </div>
            <h3 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
              {totalStreams.toLocaleString()}
            </h3>
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#00FFA3' }}>
              <TrendingUp className="w-3 h-3" />
              +18% this month
            </p>
          </div>
        </div>

        <div className="rounded-xl p-6 border relative overflow-hidden"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(123, 97, 255, 0.2)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
            style={{ background: 'radial-gradient(circle, #7B61FF 0%, transparent 70%)' }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: '#A0A7B8' }}>Avg Streams/Track</p>
              <Music className="w-5 h-5" style={{ color: '#7B61FF' }} />
            </div>
            <h3 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
              {avgStreamsPerTrack.toLocaleString()}
            </h3>
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#00FFA3' }}>
              <TrendingUp className="w-3 h-3" />
              +5% this week
            </p>
          </div>
        </div>

        <div className="rounded-xl p-6 border relative overflow-hidden"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(0, 255, 163, 0.2)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
            style={{ background: 'radial-gradient(circle, #00FFA3 0%, transparent 70%)' }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: '#A0A7B8' }}>Active Artists</p>
              <Users className="w-5 h-5" style={{ color: '#00FFA3' }} />
            </div>
            <h3 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
              {users.length}
            </h3>
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#00FFA3' }}>
              <TrendingUp className="w-3 h-3" />
              +12% this month
            </p>
          </div>
        </div>

        <div className="rounded-xl p-6 border relative overflow-hidden"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(255, 152, 0, 0.2)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
            style={{ background: 'radial-gradient(circle, #FF9800 0%, transparent 70%)' }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: '#A0A7B8' }}>Admin Metrics</p>
              <Globe className="w-5 h-5" style={{ color: '#FF9800' }} />
            </div>
            <h3 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>{totalAdmins}</h3>
            <p className="text-xs mt-1" style={{ color: '#A0A7B8' }}>Admins (Total)</p>
            <p className="text-xs mt-1" style={{ color: '#00FFA3' }}>Recent actions: {recentActions}</p>
          </div>
        </div>
      </div>

      {/* Admin Role Distribution */}
      <div className="rounded-xl p-6 border"
        style={{
          backgroundColor: '#121826',
          borderColor: 'rgba(123, 97, 255, 0.1)',
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
          Admins by Role
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={roleData} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={80} label>
              {roleData.map((entry, index) => (
                <Cell
                  key={`role-cell-${entry.role}-${index}`}
                  fill={['#00E5FF', '#7B61FF', '#00FFA3', '#FF9800', '#FF5252'][index % 5]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#121826',
                border: '1px solid rgba(123, 97, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streams by Country */}
        <div className="rounded-xl p-6 border"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(123, 97, 255, 0.1)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
            Streams by Country
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={streamsByCountry}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 97, 255, 0.1)" />
              <XAxis dataKey="country" stroke="#A0A7B8" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#A0A7B8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121826',
                  border: '1px solid rgba(123, 97, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="streams" radius={[8, 8, 0, 0]}>
                {streamsByCountry.map((entry, index) => (
                  <Cell key={`country-cell-${entry.country}-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Genre Distribution */}
        <div className="rounded-xl p-6 border"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(123, 97, 255, 0.1)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
            Genre Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genreData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ genre, value }) => `${genre} ${value}%`}
                outerRadius={100}
                dataKey="value"
              >
                {genreData.map((entry, index) => (
                  <Cell key={`genre-cell-${entry.genre}-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121826',
                  border: '1px solid rgba(123, 97, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Artists */}
        <div className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(123, 97, 255, 0.1)',
          }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.1)' }}>
            <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Top Artists</h3>
          </div>
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgba(123, 97, 255, 0.03)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase"
                  style={{ color: '#A0A7B8' }}
                >#</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase"
                  style={{ color: '#A0A7B8' }}
                >Artist</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase"
                  style={{ color: '#A0A7B8' }}
                >Streams</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid rgba(123, 97, 255, 0.1)' }}>
              {topArtists.map((artist, index) => (
                <tr key={index}
                  className="transition"
                  style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.05)' }}
                >
                  <td className="px-6 py-4">
                    {index < 3 ? (
                      <Award className={`w-5 h-5`}
                        style={{
                          color: index === 0 ? '#FFB800' : index === 1 ? '#A0A7B8' : '#FF9800'
                        }}
                      />
                    ) : (
                      <span className="text-sm" style={{ color: '#A0A7B8' }}>{index + 1}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium" style={{ color: '#FFFFFF' }}>
                    {artist.artist}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold" style={{ color: '#00E5FF' }}>
                    {artist.streams.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Tracks */}
        <div className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: '#121826',
            borderColor: 'rgba(123, 97, 255, 0.1)',
          }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.1)' }}>
            <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Top Tracks</h3>
          </div>
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgba(123, 97, 255, 0.03)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase"
                  style={{ color: '#A0A7B8' }}
                >#</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase"
                  style={{ color: '#A0A7B8' }}
                >Track</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase"
                  style={{ color: '#A0A7B8' }}
                >Streams</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid rgba(123, 97, 255, 0.1)' }}>
              {topTracks.map((track, index) => (
                <tr key={index}
                  className="transition"
                  style={{ borderBottom: '1px solid rgba(123, 97, 255, 0.05)' }}
                >
                  <td className="px-6 py-4">
                    {index < 3 ? (
                      <Award className={`w-5 h-5`}
                        style={{
                          color: index === 0 ? '#FFB800' : index === 1 ? '#A0A7B8' : '#FF9800'
                        }}
                      />
                    ) : (
                      <span className="text-sm" style={{ color: '#A0A7B8' }}>{index + 1}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium" style={{ color: '#FFFFFF' }}>{track.title}</p>
                    <p className="text-xs" style={{ color: '#A0A7B8' }}>{track.artist}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold" style={{ color: '#7B61FF' }}>
                    {track.streams.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}