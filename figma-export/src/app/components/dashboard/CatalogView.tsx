import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import MusicPlatformLogos, { PlatformLogo } from './MusicPlatformLogos';
import * as userApi from '../../utils/user-api';
import {
  Search,
  Music,
  Play,
  MoreVertical,
  Calendar,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Plus,
  Pause,
  Link2,
  Clock3,
  AlertCircle,
  Video,
  RefreshCcw,
  Briefcase,
} from 'lucide-react';

const releaseShortcuts = [
  {
    label: 'Audio Release',
    description: 'Upload audio masters, metadata, and store delivery settings.',
    to: '/dashboard/upload/audio',
    icon: Music,
  },
  {
    label: 'Video Distribution',
    description: 'Submit official videos and route to video streaming channels.',
    to: '/dashboard/upload/video',
    icon: Video,
  },
  {
    label: 'Transfer Catalog',
    description: 'Move your existing releases into AMTDISTRO with no downtime.',
    to: '/dashboard/upload/transfer',
    icon: RefreshCcw,
  },
  {
    label: 'Client Offerings',
    description: 'Open premium growth services and artist campaign add-ons.',
    to: '/dashboard/marketing/client-offerings',
    icon: Briefcase,
  },
];

export function CatalogView() {
  const location = useLocation();
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const dashboardBasePath = isLabelDashboard ? '/label-dashboard' : '/dashboard';

  const [releases, setReleases] = useState<userApi.Release[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRelease, setSelectedRelease] = useState<userApi.Release | null>(null);
  const [releaseTracks, setReleaseTracks] = useState<userApi.ReleaseTrack[]>([]);
  const [deliveries, setDeliveries] = useState<userApi.DSPDelivery[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [playingReleaseId, setPlayingReleaseId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadReleases() {
      try {
        setIsLoading(true);
        setCatalogError('');
        const data = await userApi.getUserReleases();
        if (mounted) {
          setReleases(data);
        }
      } catch (error: any) {
        if (mounted) {
          const cachedReleases = userApi.getCachedUserReleases();
          if (cachedReleases.length > 0) {
            setCatalogError('Live catalog sync is temporarily unavailable. Showing your last synced releases.');
            setReleases(cachedReleases);
          } else {
            setCatalogError('Unable to load your catalog. Please check your connection and try again.');
            setReleases([]);
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadReleases();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      audio?.pause();
    };
  }, [audio]);

  const filteredReleases = releases.filter((release) => {
    const matchesSearch = release.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || release.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: releases.length,
    live: releases.filter((r) => r.status === 'live').length,
    processing: releases.filter((r) => r.status === 'processing' || r.status === 'submitted' || r.status === 'validated').length,
    draft: releases.filter((r) => r.status === 'draft').length,
  };

  const platformStatuses = useMemo(() => {
    if (!selectedRelease) return [] as Array<{ platform: string; code: string; status: string; url?: string; updatedAt?: string }>;

    if (deliveries.length > 0) {
      return deliveries.map((delivery) => ({
        platform: delivery.platform,
        code: delivery.platformReleaseId || `${delivery.platform.slice(0, 3).toUpperCase()}-${selectedRelease.id.slice(0, 6)}`,
        status: delivery.status,
        url: delivery.platformUrl,
        updatedAt: delivery.updatedAt,
      }));
    }

    const platforms = selectedRelease.selectedPlatforms || [];
    return platforms.map((platform, index) => ({
      platform,
      code: `${platform.slice(0, 3).toUpperCase()}-${selectedRelease.id.slice(0, 6)}-${index + 1}`,
      status:
        selectedRelease.status === 'draft'
          ? 'pending'
          : selectedRelease.status === 'processing' || selectedRelease.status === 'submitted' || selectedRelease.status === 'validated'
          ? 'processing'
          : 'live',
      updatedAt: selectedRelease.updatedAt,
    }));
  }, [deliveries, selectedRelease]);

  async function openReleaseDetails(release: userApi.Release) {
    setSelectedRelease(release);
    setIsDetailsLoading(true);

    try {
      const [detailData, deliveryData] = await Promise.allSettled([
        userApi.getReleaseById(release.id),
        userApi.getReleaseDeliveries(release.id),
      ]);

      if (detailData.status === 'fulfilled') {
        setSelectedRelease(detailData.value.release);
        setReleaseTracks(detailData.value.tracks);
      } else {
        const cached = userApi.getCachedReleaseDetails(release.id);
        if (cached.release) {
          setSelectedRelease(cached.release);
          setReleaseTracks(cached.tracks);
        } else {
          setReleaseTracks([]);
        }
      }

      if (deliveryData.status === 'fulfilled') {
        setDeliveries(deliveryData.value);
      } else {
        setDeliveries(userApi.getCachedReleaseDeliveries(release.id));
      }
    } finally {
      setIsDetailsLoading(false);
    }
  }

  function closeReleaseDetails() {
    setSelectedRelease(null);
    setReleaseTracks([]);
    setDeliveries([]);
  }

  function togglePreview(release: userApi.Release) {
    if (playingReleaseId === release.id && audio) {
      audio.pause();
      setPlayingReleaseId(null);
      return;
    }

    if (!release.audioPreviewUrl) {
      return;
    }

    audio?.pause();
    const nextAudio = new Audio(release.audioPreviewUrl);
    nextAudio.onended = () => setPlayingReleaseId(null);
    nextAudio.play().catch(() => setPlayingReleaseId(null));
    setAudio(nextAudio);
    setPlayingReleaseId(release.id);
  }

  function openDeliveryLinks() {
    platformStatuses
      .filter((item): item is (typeof platformStatuses)[number] & { url: string } => 'url' in item && Boolean(item.url))
      .forEach((item) => window.open(item.url, '_blank', 'noopener,noreferrer'));
  }

  const releaseTimeline = useMemo(() => {
    if (!selectedRelease) return [] as Array<{ label: string; value: string }>;

    const items = [
      { label: 'Created', value: new Date(selectedRelease.createdAt).toLocaleString() },
      { label: 'Updated', value: new Date(selectedRelease.updatedAt).toLocaleString() },
      { label: 'Scheduled Release', value: new Date(selectedRelease.releaseDate).toLocaleDateString() },
    ];

    deliveries.forEach((delivery) => {
      if (delivery.submittedAt) items.push({ label: `${delivery.platform} submitted`, value: new Date(delivery.submittedAt).toLocaleString() });
      if (delivery.deliveredAt) items.push({ label: `${delivery.platform} delivered`, value: new Date(delivery.deliveredAt).toLocaleString() });
      if (delivery.goLiveDate) items.push({ label: `${delivery.platform} go-live`, value: new Date(delivery.goLiveDate).toLocaleString() });
    });

    return items;
  }, [deliveries, selectedRelease]);

  const getReleaseArtwork = (release: userApi.Release) => release.artworkUrl || release.artworkPath || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400';
  const getReleaseArtist = (release: userApi.Release) => release.primaryArtist || release.label || 'Unknown Artist';
  const getReleaseCode = (release: userApi.Release) => `REL-${new Date(release.createdAt).getFullYear()}-${release.id.slice(0, 6).toUpperCase()}`;
  const getReleasePlatforms = (release: userApi.Release) => release.selectedPlatforms || [];
  const getReleaseTypeLabel = (release: userApi.Release) => release.type.toUpperCase();
  const getStatusLabel = (release: userApi.Release) => release.status.charAt(0).toUpperCase() + release.status.slice(1);
  const getStatusClass = (status: string) =>
    status === 'live'
      ? 'bg-green-600'
      : status === 'processing' || status === 'submitted' || status === 'validated'
      ? 'bg-blue-600'
      : status === 'draft'
      ? 'bg-gray-600'
      : 'bg-amber-600';

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-semibold mb-2 ${isLabelDashboard ? 'text-white' : ''}`}>Music Catalog</h2>
          <p className={isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}>Manage all your releases in one place</p>
        </div>
        <Link to={`${dashboardBasePath}/upload`}>
          <Button className={isLabelDashboard ? 'bg-[#FF6B00] text-white hover:bg-[#ff7f26]' : ''}>
            <Plus className="w-4 h-4 mr-2" />
            Upload New Release
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#161616] p-4 text-white' : 'p-4'}>
          <div className="text-2xl font-semibold mb-1">{stats.total}</div>
          <div className={`text-sm ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Total Releases</div>
        </Card>
        <Card className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#161616] p-4 text-white' : 'p-4'}>
          <div className="text-2xl font-semibold mb-1 text-green-600">{stats.live}</div>
          <div className={`text-sm ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Live</div>
        </Card>
        <Card className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#161616] p-4 text-white' : 'p-4'}>
          <div className="text-2xl font-semibold mb-1 text-blue-600">{stats.processing}</div>
          <div className={`text-sm ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Processing</div>
        </Card>
        <Card className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#161616] p-4 text-white' : 'p-4'}>
          <div className="text-2xl font-semibold mb-1 text-[#B3B3B3]">{stats.draft}</div>
          <div className={`text-sm ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Draft</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#161616] p-4 text-white' : 'p-4'}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isLabelDashboard ? 'text-[#666]' : 'text-[#B3B3B3]'}`} />
              <Input
                placeholder="Search releases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 text-white placeholder:text-[#666]' : 'pl-10'}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter releases by status"
              title="Filter releases by status"
              className={isLabelDashboard ? 'rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-4 py-2 text-sm text-white' : 'px-4 py-2 border border-[#FF6B00]/20 rounded-lg text-sm'}
            >
              <option value="all">All Status</option>
              <option value="live">Live</option>
              <option value="processing">Processing</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#161616] p-4 text-white' : 'p-4'}>
        <div className="mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#B3B3B3]">Upload Menu</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {releaseShortcuts.map((shortcut) => (
            <Link key={shortcut.label} to={shortcut.to}>
              <div className={`rounded-xl border p-3 transition-colors ${
                isLabelDashboard
                  ? 'border-[#FF6B00]/20 bg-[#0A0A0A] hover:border-[#FF6B00]/50'
                  : 'border-[#E5E7EB] bg-white hover:border-[#FF6B00]/40'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${isLabelDashboard ? 'bg-[#FF6B00]/15 text-[#FF6B00]' : 'bg-[#FFF1E8] text-[#FF6B00]'}`}>
                    <shortcut.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isLabelDashboard ? 'text-white' : 'text-[#111827]'}`}>{shortcut.label}</p>
                    <p className={`mt-1 text-xs ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#6B7280]'}`}>{shortcut.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {catalogError && (
        <Card className={isLabelDashboard ? 'border-amber-500/30 bg-amber-500/10 p-4 text-amber-100' : 'border-amber-200 bg-amber-50 p-4 text-amber-900'}>
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{catalogError}</p>
          </div>
        </Card>
      )}

      {isLoading && (
        <Card className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#161616] p-10 text-center text-[#B3B3B3]' : 'p-10 text-center text-[#B3B3B3]'}>Loading releases...</Card>
      )}

      {/* Releases Grid */}
      {!isLoading && viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReleases.map((release) => (
            <Card
              key={release.id}
              className="overflow-hidden group cursor-pointer transition-transform hover:-translate-y-1"
              onClick={() => openReleaseDetails(release)}
            >
              <div className="aspect-square relative">
                <ImageWithFallback
                  src={getReleaseArtwork(release)}
                  alt={release.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <Button size="sm" variant="secondary" onClick={(event) => {
                    event.stopPropagation();
                    togglePreview(release);
                  }}>
                    {playingReleaseId === release.id ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {playingReleaseId === release.id ? 'Pause' : 'Preview'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={(event) => {
                    event.stopPropagation();
                    openReleaseDetails(release);
                  }}>
                    <Eye className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                </div>
                <Badge
                  variant={release.status === 'live' ? 'default' : 'secondary'}
                  className={`absolute top-4 right-4 ${getStatusClass(release.status)}`}
                >
                  {getStatusLabel(release)}
                </Badge>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{release.title}</h3>
                    <p className="text-sm text-[#B3B3B3]">{getReleaseArtist(release)}</p>
                    <p className="text-xs text-[#B3B3B3] mt-1">{getReleaseCode(release)} • UPC {release.upc || 'Pending'}</p>
                  </div>
                  <button
                    className="p-2 hover:bg-[#161616]/5 rounded-lg"
                    aria-label="Release actions"
                    title="Release actions"
                    onClick={(event) => {
                      event.stopPropagation();
                      openReleaseDetails(release);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#B3B3B3] mb-3">
                  <Badge variant="outline" className="text-xs">
                    {getReleaseTypeLabel(release)}
                  </Badge>
                  <span>•</span>
                  <Calendar className="w-3 h-3" />
                  <span>{release.releaseDate}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-[#FF6B00]/20 pt-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-[#B3B3B3] mb-1">Streams</div>
                    <div className="font-semibold">0</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#B3B3B3] mb-1">Revenue</div>
                    <div className="font-semibold">₦0</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <MusicPlatformLogos platforms={getReleasePlatforms(release).slice(0, 3)} size={18} hideLabels={false} compact className="gap-2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filteredReleases.map((release) => (
              <div
                key={release.id}
                className="p-4 hover:bg-[#0A0A0A] transition-colors flex items-center gap-4 cursor-pointer"
                onClick={() => openReleaseDetails(release)}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={getReleaseArtwork(release)}
                    alt={release.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{release.title}</h3>
                  <p className="text-sm text-[#B3B3B3]">{getReleaseArtist(release)}</p>
                  <p className="text-xs text-[#B3B3B3] mt-1">{getReleaseCode(release)} • UPC {release.upc || 'Pending'}</p>
                </div>
                <Badge variant="outline" className="hidden sm:block">
                  {getReleaseTypeLabel(release)}
                </Badge>
                <div className="hidden md:flex items-center gap-2 text-sm text-[#B3B3B3]">
                  <Calendar className="w-4 h-4" />
                  {release.releaseDate}
                </div>
                <div className="hidden lg:block text-right">
                  <div className="text-sm text-[#B3B3B3]">Streams</div>
                  <div className="font-semibold">0</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[#B3B3B3]">Revenue</div>
                  <div className="font-semibold">₦0</div>
                </div>
                <Badge
                  variant={release.status === 'live' ? 'default' : 'secondary'}
                  className={getStatusClass(release.status)}
                >
                  {getStatusLabel(release)}
                </Badge>
                <button
                  className="p-2 hover:bg-[#161616]/5 rounded-lg"
                  aria-label="Release actions"
                  title="Release actions"
                  onClick={(event) => {
                    event.stopPropagation();
                    openReleaseDetails(release);
                  }}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filteredReleases.length === 0 && (
        <Card className="p-12 text-center">
          <Music className="w-16 h-16 text-[#B3B3B3] mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No releases found</h3>
          <p className="text-[#B3B3B3] mb-6">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Start by uploading your first release'}
          </p>
          <Link to="/dashboard/upload">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload New Release
            </Button>
          </Link>
        </Card>
      )}

      {selectedRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-full overflow-y-auto rounded-2xl border border-[#FF6B00]/20 bg-[#111111] text-white shadow-2xl md:max-w-5xl">
            <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
              <div className="border-b border-[#FF6B00]/20 lg:border-b-0 lg:border-r lg:border-r-[#FF6B00]/20 p-6 bg-[#161616]">
                <div className="overflow-hidden rounded-2xl mb-4">
                  <ImageWithFallback
                    src={getReleaseArtwork(selectedRelease)}
                    alt={selectedRelease.title}
                    className="h-72 w-full object-cover"
                  />
                </div>
                <div className="space-y-3">
                  <Badge className={getStatusClass(selectedRelease.status)}>
                    {getStatusLabel(selectedRelease)}
                  </Badge>
                  <div>
                    <h3 className="text-2xl font-semibold">{selectedRelease.title}</h3>
                    <p className="text-sm text-[#B3B3B3]">{getReleaseArtist(selectedRelease)}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-[#161616]/5 p-3">
                      <div className="text-[#B3B3B3]">Streams</div>
                      <div className="mt-1 font-semibold">0</div>
                    </div>
                    <div className="rounded-xl bg-[#161616]/5 p-3">
                      <div className="text-[#B3B3B3]">Revenue</div>
                      <div className="mt-1 font-semibold">₦0</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {isDetailsLoading && (
                  <Card className="border-[#FF6B00]/20 bg-[#161616]/5 p-4 text-sm text-gray-200">
                    Loading release details...
                  </Card>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#FFD600]">Release Details</p>
                    <h2 className="mt-2 text-3xl font-semibold">Manage This Release</h2>
                    <p className="mt-2 text-sm text-[#B3B3B3]">A cleaner artist-side release detail view inspired by the reference management system.</p>
                  </div>
                  <button
                    className="self-start rounded-lg border border-[#FF6B00]/30 px-4 py-2 text-sm text-white hover:bg-[#161616]/5"
                    onClick={closeReleaseDetails}
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616]/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#B3B3B3]">Release Code</p>
                    <p className="mt-2 font-semibold">{getReleaseCode(selectedRelease)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616]/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#B3B3B3]">UPC</p>
                    <p className="mt-2 font-semibold">{selectedRelease.upc || 'Pending assignment'}</p>
                  </div>
                  <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616]/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#B3B3B3]">Release Date</p>
                    <p className="mt-2 font-semibold">{selectedRelease.releaseDate}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616]/5 p-5">
                    <h3 className="text-lg font-semibold">Track Listing</h3>
                    <div className="mt-4 space-y-3">
                      {releaseTracks.length > 0 ? releaseTracks.map((track, index) => (
                        <div key={track.id} className="flex items-center justify-between rounded-xl bg-black/20 p-3">
                          <div>
                            <p className="font-medium">{index + 1}. {track.title}</p>
                            <p className="text-xs text-[#B3B3B3]">{track.isrc || 'ISRC pending'} • {track.duration}s</p>
                          </div>
                          <Badge variant="outline" className="border-white/10 text-gray-200">{track.genre}</Badge>
                        </div>
                      )) : (
                        <p className="text-sm text-[#B3B3B3]">No track details returned yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616]/5 p-5">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-5 w-5 text-[#FFD600]" />
                      <h3 className="text-lg font-semibold">Delivery Timeline</h3>
                    </div>
                    <div className="mt-4 space-y-3">
                      {releaseTimeline.map((item) => (
                        <div key={`${item.label}-${item.value}`} className="rounded-xl bg-black/20 p-3">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-[#B3B3B3] mt-1">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616]/5 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">Distribution Delivery</h3>
                      <p className="text-sm text-[#B3B3B3]">Platform status, delivery codes, and quick review.</p>
                    </div>
                    <Badge variant="outline" className="border-[#FFD600]/30 text-[#FFD600]">
                      {platformStatuses.length} Platforms
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {platformStatuses.map((item) => (
                      <div key={item.code} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <PlatformLogo platform={item.platform} size={24} />
                            <p className="font-medium">{item.platform}</p>
                          </div>
                          <p className="text-xs text-[#B3B3B3]">Code: {item.code}</p>
                          {item.updatedAt && <p className="text-xs text-[#B3B3B3] mt-1">Updated: {new Date(item.updatedAt).toLocaleString()}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {'url' in item && item.url && (
                            <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[#FF6B00]/20 px-3 py-1 text-xs hover:bg-[#161616]/5">
                              <Link2 className="h-3.5 w-3.5" />
                              Link
                            </a>
                          )}
                          <Badge className={item.status === 'live' ? 'bg-green-600' : item.status === 'processing' || item.status === 'delivered' || item.status === 'ingested' ? 'bg-blue-600' : 'bg-amber-600'}>
                          {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616]/5 p-5">
                  <h3 className="text-lg font-semibold">Quick Actions</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="outline" className="border-[#FF6B00]/30 bg-transparent text-white hover:bg-[#161616]/5" onClick={() => togglePreview(selectedRelease)} disabled={!selectedRelease.audioPreviewUrl}>
                      {playingReleaseId === selectedRelease.id ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                      {playingReleaseId === selectedRelease.id ? 'Pause Preview' : 'Preview Audio'}
                    </Button>
                    <Link to={`${dashboardBasePath}/upload?releaseId=${selectedRelease.id}`}>
                      <Button variant="outline" className="border-[#FF6B00]/30 bg-transparent text-white hover:bg-[#161616]/5">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Release
                      </Button>
                    </Link>
                    <Button variant="outline" className="border-[#FF6B00]/30 bg-transparent text-white hover:bg-[#161616]/5" onClick={openDeliveryLinks} disabled={platformStatuses.every((item) => !('url' in item && item.url))}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Delivery Links
                    </Button>
                    <Button variant="outline" className="border-red-500/30 bg-transparent text-white hover:bg-red-500/10" disabled={selectedRelease.status !== 'draft'}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Archive Draft
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
