import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';
import {
  Disc3,
  Download,
  Heart,
  Headphones,
  Music2,
  Play,
  Pause,
  Radio,
  Search,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  buildListenerDeviceFingerprint,
  buildListenerSessionId,
  getArtistListenerMonetizationSummary,
  getListenerCatalog,
  getListenerDeviceType,
  getListenerSummary,
  recordListenerEvent,
  type ArtistListenerMonetizationSummary,
  type ListenerCatalogResponse,
  type ListenerCatalogTrack,
  type ListenerSummaryResponse,
} from '../utils/listener-api';

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number) {
  return `₦${value.toLocaleString('en-US', { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function ListenerApp() {
  const [catalog, setCatalog] = useState<ListenerCatalogResponse | null>(null);
  const [listenerSummary, setListenerSummary] = useState<ListenerSummaryResponse | null>(null);
  const [artistSummary, setArtistSummary] = useState<ArtistListenerMonetizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'library' | 'downloads' | 'rewards'>('discover');
  const [activeTrack, setActiveTrack] = useState<ListenerCatalogTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionId = useMemo(() => buildListenerSessionId(), []);
  const deviceFingerprint = useMemo(() => buildListenerDeviceFingerprint(), []);

  const loadData = async () => {
    try {
      setLoading(true);
      const nextCatalog = await getListenerCatalog();
      setCatalog(nextCatalog);

      const [summaryResult, artistResult] = await Promise.allSettled([
        getListenerSummary(),
        getArtistListenerMonetizationSummary(),
      ]);

      if (summaryResult.status === 'fulfilled') {
        setListenerSummary(summaryResult.value);
      } else {
        setListenerSummary(null);
      }

      if (artistResult.status === 'fulfilled') {
        setArtistSummary(artistResult.value);
      } else {
        setArtistSummary(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load listener experience.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const filteredTracks = useMemo(() => {
    const tracks = catalog?.trendingTracks || [];
    if (!search.trim()) {
      return tracks;
    }

    const query = search.toLowerCase();
    return tracks.filter((track) =>
      track.title.toLowerCase().includes(query)
      || track.artistName.toLowerCase().includes(query)
      || track.genre.toLowerCase().includes(query),
    );
  }, [catalog, search]);

  const recordListenerTrackEvent = async (track: ListenerCatalogTrack, eventType: 'play_start' | 'play_progress' | 'play_complete' | 'download' | 'save' | 'follow' | 'share', listenedSeconds = 0, completionRate = 0) => {
    const response = await recordListenerEvent({
      trackId: track.id,
      releaseId: track.releaseId,
      artistName: track.artistName,
      eventType,
      listenedSeconds,
      completionRate,
      sessionId,
      deviceFingerprint,
      deviceType: getListenerDeviceType(),
      sourcePlatform: 'web',
    });

    if (response.isQualified && response.estimatedListenerReward > 0 && (eventType === 'play_complete' || eventType === 'download')) {
      toast.success(`Reward earned: ${formatCurrency(response.estimatedListenerReward)}`);
    }

    return response;
  };

  const stopAudio = async () => {
    const audio = audioRef.current;
    const track = activeTrack;
    if (!audio || !track) {
      return;
    }

    const listenedSeconds = Math.max(0, audio.currentTime || 0);
    if (listenedSeconds > 0 && listenedSeconds < track.duration) {
      await recordListenerTrackEvent(track, 'play_progress', listenedSeconds, track.duration > 0 ? listenedSeconds / track.duration : 0).catch((error) => {
        console.debug('Listener progress tracking failed:', error);
      });
    }

    audio.pause();
    audioRef.current = null;
    setIsPlaying(false);
  };

  const handlePlay = async (track: ListenerCatalogTrack) => {
    if (activeTrack?.id === track.id && isPlaying) {
      await stopAudio();
      return;
    }

    if (audioRef.current) {
      await stopAudio();
    }

    const nextAudio = new Audio(track.audioUrl);
    audioRef.current = nextAudio;
    setActiveTrack(track);
    setIsPlaying(true);
    await recordListenerTrackEvent(track, 'play_start').catch(() => undefined);

    nextAudio.onended = () => {
      setIsPlaying(false);
      void recordListenerTrackEvent(track, 'play_complete', track.duration, 1)
        .then(() => loadData())
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : 'Playback finished but completion tracking failed.');
        });
    };
    nextAudio.onpause = () => {
      setIsPlaying(false);
    };

    nextAudio.play().catch((error) => {
      setIsPlaying(false);
      toast.error(error instanceof Error ? error.message : 'Unable to start playback.');
    });
  };

  const handleDownload = async (track: ListenerCatalogTrack) => {
    await recordListenerTrackEvent(track, 'download').then(() => loadData()).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Download tracking failed.');
    });
    window.open(track.audioUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSave = async (track: ListenerCatalogTrack) => {
    await recordListenerTrackEvent(track, 'save').then(() => {
      toast.success('Added to your listener library.');
      void loadData();
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Sign in to save tracks.');
    });
  };

  const handleFollow = async (track: ListenerCatalogTrack) => {
    await recordListenerTrackEvent(track, 'follow').then(() => {
      toast.success(`Following ${track.artistName}`);
      void loadData();
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Sign in to follow artists.');
    });
  };

  const handleShare = async (track: ListenerCatalogTrack) => {
    const shareUrl = `${window.location.origin}/listen`;
    if (navigator.share) {
      await navigator.share({
        title: `${track.title} • ${track.artistName}`,
        text: 'Check out this track on AMTDISTRO.',
        url: shareUrl,
      }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
      toast.success('Listener app link copied.');
    }
    await recordListenerTrackEvent(track, 'share').catch(() => undefined);
  };

  if (loading && !catalog) {
    return (
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-10 w-64 rounded bg-white/10" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
          <div className="h-96 rounded-3xl border border-white/10 bg-white/5" />
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8 text-white">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#161616] via-[#0b0b0b] to-[#111111] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.4fr,0.6fr]">
            <div className="space-y-5">
              <Badge className="bg-[#FFD600]/15 text-[#FFD600] hover:bg-[#FFD600]/20">Listener app preview</Badge>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Stream, discover, download, and reward real fans from one AMTDISTRO experience.
                </h1>
                <p className="max-w-3xl text-base text-[#CFCFCF] sm:text-lg">
                  This listener surface turns your distribution platform into a mobile-first web app with playback tracking, download events, artist monetization, and listener reward readiness.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {(['discover', 'library', 'downloads', 'rewards'] as const).map((tab) => (
                  <Button
                    key={tab}
                    type="button"
                    variant={activeTab === tab ? 'default' : 'outline'}
                    className={activeTab === tab ? 'bg-[#FF6B00] text-white hover:bg-[#ff7f26]' : 'border-white/15 bg-transparent text-white hover:bg-white/5'}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="border-[#FF6B00]/20 bg-[#121212] p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#FF6B00]/15 p-3 text-[#FF6B00]"><Music2 className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm text-[#B3B3B3]">Qualified streams</p>
                    <p className="text-2xl font-semibold">{formatCompact(catalog?.summary.totalQualifiedStreams || 0)}</p>
                  </div>
                </div>
              </Card>
              <Card className="border-[#FFD600]/20 bg-[#121212] p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#FFD600]/15 p-3 text-[#FFD600]"><Download className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm text-[#B3B3B3]">Tracked downloads</p>
                    <p className="text-2xl font-semibold">{formatCompact(catalog?.summary.totalDownloads || 0)}</p>
                  </div>
                </div>
              </Card>
              <Card className="border-[#00E5FF]/20 bg-[#121212] p-5 text-white sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#00E5FF]/15 p-3 text-[#00E5FF]"><Users className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm text-[#B3B3B3]">Artists discoverable</p>
                    <p className="text-2xl font-semibold">{formatCompact(catalog?.summary.artists || 0)}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr,0.55fr]">
          <div className="space-y-6">
            <Card className="border-white/10 bg-[#121212] p-4 text-white">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E7E7E]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by track, artist, or genre"
                  className="border-white/10 bg-[#0D0D0D] pl-10 text-white placeholder:text-[#6E6E6E]"
                />
              </div>
            </Card>

            {activeTab === 'discover' && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  {(catalog?.featuredReleases || []).slice(0, 3).map((release) => (
                    <Card key={release.id} className="overflow-hidden border-white/10 bg-[#121212] text-white">
                      <img src={release.artworkUrl} alt={release.title} className="h-52 w-full object-cover" />
                      <div className="space-y-3 p-4">
                        <div>
                          <p className="text-lg font-semibold">{release.title}</p>
                          <p className="text-sm text-[#B3B3B3]">{release.artistName}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-white/10 text-[#D5D5D5]">{release.type.toUpperCase()}</Badge>
                          <Badge variant="outline" className="border-white/10 text-[#D5D5D5]">{release.genre}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-[#B3B3B3]">
                          <span>{formatCompact(release.totalStreams)} streams</span>
                          <span>{release.trackCount} tracks</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="border-white/10 bg-[#121212] p-5 text-white">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold">Trending playback</h2>
                      <p className="text-sm text-[#B3B3B3]">Tracks currently ready for streaming and download monetization.</p>
                    </div>
                    <Badge className="bg-[#FF6B00]/15 text-[#FF6B00] hover:bg-[#FF6B00]/20">Web + app ready</Badge>
                  </div>
                  <div className="space-y-3">
                    {filteredTracks.map((track) => (
                      <div key={track.id} className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#0C0C0C] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <img src={track.artworkUrl} alt={track.title} className="h-14 w-14 rounded-xl object-cover" />
                          <div>
                            <p className="font-semibold">{track.title}</p>
                            <p className="text-sm text-[#B3B3B3]">{track.artistName} • {track.genre}</p>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#8F8F8F]">
                              <span>{formatCompact(track.qualifiedPlayCount)} qualified streams</span>
                              <span>{formatCompact(track.downloadCount)} downloads</span>
                              <span>{formatDuration(track.duration)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" onClick={() => void handlePlay(track)} className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]">
                            {activeTrack?.id === track.id && isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                            {activeTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'}
                          </Button>
                          <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => void handleDownload(track)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => void handleSave(track)}>
                            <Heart className="mr-2 h-4 w-4" />
                            Save
                          </Button>
                          <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => void handleFollow(track)}>
                            <Users className="mr-2 h-4 w-4" />
                            Follow
                          </Button>
                          <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => void handleShare(track)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {activeTab === 'library' && (
              <Card className="border-white/10 bg-[#121212] p-5 text-white">
                <div className="mb-4 flex items-center gap-3">
                  <Heart className="h-5 w-5 text-[#FF6B00]" />
                  <h2 className="text-2xl font-semibold">Your listener library</h2>
                </div>
                {listenerSummary ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="border-white/8 bg-[#0C0C0C] p-4 text-white"><p className="text-sm text-[#8F8F8F]">Saved tracks</p><p className="mt-2 text-2xl font-semibold">{listenerSummary.library.savedTracks}</p></Card>
                      <Card className="border-white/8 bg-[#0C0C0C] p-4 text-white"><p className="text-sm text-[#8F8F8F]">Followed artists</p><p className="mt-2 text-2xl font-semibold">{listenerSummary.library.followedArtists}</p></Card>
                      <Card className="border-white/8 bg-[#0C0C0C] p-4 text-white"><p className="text-sm text-[#8F8F8F]">Rewarded streams</p><p className="mt-2 text-2xl font-semibold">{listenerSummary.rewards.qualifiedStreams}</p></Card>
                    </div>
                    <div className="space-y-3">
                      {listenerSummary.savedTrackPreview.map((track) => (
                        <div key={track.id} className="rounded-2xl border border-white/8 bg-[#0C0C0C] p-4">
                          <p className="font-medium">{track.title}</p>
                          <p className="text-sm text-[#B3B3B3]">{track.artistName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#0C0C0C] p-8 text-center text-[#B3B3B3]">
                    Sign in to unlock saved tracks, followed artists, and rewarded listening history.
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'downloads' && (
              <Card className="border-white/10 bg-[#121212] p-5 text-white">
                <div className="mb-4 flex items-center gap-3">
                  <Download className="h-5 w-5 text-[#FFD600]" />
                  <h2 className="text-2xl font-semibold">Offline-ready downloads</h2>
                </div>
                {listenerSummary ? (
                  <div className="space-y-3">
                    {listenerSummary.recentDownloads.map((track) => (
                      <div key={track.id} className="rounded-2xl border border-white/8 bg-[#0C0C0C] p-4">
                        <p className="font-medium">{track.title}</p>
                        <p className="text-sm text-[#B3B3B3]">{track.artistName}</p>
                        <p className="mt-1 text-xs text-[#7F7F7F]">{new Date(track.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                    {listenerSummary.recentDownloads.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-[#0C0C0C] p-8 text-center text-[#B3B3B3]">
                        No tracked downloads yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#0C0C0C] p-8 text-center text-[#B3B3B3]">
                    Download tracking and reward history appear here after sign-in.
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'rewards' && (
              <Card className="border-white/10 bg-[#121212] p-5 text-white">
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#00E5FF]" />
                  <h2 className="text-2xl font-semibold">Listener rewards and artist revenue</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-[#00E5FF]/15 bg-[#0C0C0C] p-4 text-white">
                    <p className="text-sm text-[#8F8F8F]">Your reward balance</p>
                    <p className="mt-2 text-3xl font-semibold">{formatCurrency(listenerSummary?.rewards.availableBalance || 0)}</p>
                    <p className="mt-2 text-sm text-[#B3B3B3]">Qualified streams: {listenerSummary?.rewards.qualifiedStreams || 0} • Qualified downloads: {listenerSummary?.rewards.qualifiedDownloads || 0}</p>
                  </Card>
                  <Card className="border-[#FF6B00]/15 bg-[#0C0C0C] p-4 text-white">
                    <p className="text-sm text-[#8F8F8F]">Artist-side listener revenue</p>
                    <p className="mt-2 text-3xl font-semibold">{formatCurrency(artistSummary?.netArtistRevenue || 0)}</p>
                    <p className="mt-2 text-sm text-[#B3B3B3]">Gross: {formatCurrency(artistSummary?.grossRevenue || 0)} • Rewards funded: {formatCurrency(artistSummary?.listenerRewardsFunded || 0)}</p>
                  </Card>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#D8D8D8]">Recent reward activity</p>
                    {(listenerSummary?.recentRewardTransactions || []).map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/8 bg-[#0C0C0C] p-4">
                        <p className="font-medium">{entry.transactionType.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-[#B3B3B3]">{formatCurrency(entry.amount)} • {entry.status}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#D8D8D8]">Recent artist entries</p>
                    {(artistSummary?.recentEntries || []).map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/8 bg-[#0C0C0C] p-4">
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-sm text-[#B3B3B3]">{entry.revenueType.replace(/_/g, ' ')} • {formatCurrency(entry.netArtistAmount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-white/10 bg-[#121212] p-5 text-white">
              <div className="mb-4 flex items-center gap-3">
                <Disc3 className="h-5 w-5 text-[#FF6B00]" />
                <h2 className="text-xl font-semibold">Now playing</h2>
              </div>
              {activeTrack ? (
                <div className="space-y-4">
                  <img src={activeTrack.artworkUrl} alt={activeTrack.title} className="h-56 w-full rounded-3xl object-cover" />
                  <div>
                    <p className="text-xl font-semibold">{activeTrack.title}</p>
                    <p className="text-sm text-[#B3B3B3]">{activeTrack.artistName}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-[#B3B3B3]">
                    <span>{activeTrack.genre}</span>
                    <span>{formatDuration(activeTrack.duration)}</span>
                  </div>
                  <Button type="button" className="w-full bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={() => void handlePlay(activeTrack)}>
                    {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isPlaying ? 'Pause stream' : 'Resume stream'}
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0C0C0C] p-8 text-center text-[#B3B3B3]">
                  Choose a track to start the listener flow.
                </div>
              )}
            </Card>

            <Card className="border-white/10 bg-[#121212] p-5 text-white">
              <div className="mb-4 flex items-center gap-3">
                <Radio className="h-5 w-5 text-[#FFD600]" />
                <h2 className="text-xl font-semibold">Spotlight artists</h2>
              </div>
              <div className="space-y-3">
                {(catalog?.spotlightArtists || []).slice(0, 6).map((artist) => (
                  <div key={artist.slug} className="rounded-2xl border border-white/8 bg-[#0C0C0C] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{artist.name}</p>
                        <p className="text-sm text-[#B3B3B3]">{artist.genre}</p>
                      </div>
                      <Badge variant="outline" className="border-white/10 text-[#D5D5D5]">{artist.releaseCount} releases</Badge>
                    </div>
                    <p className="mt-2 text-xs text-[#808080]">{formatCompact(artist.totalStreams)} qualified streams tracked</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-white/10 bg-[#121212] p-5 text-white">
              <div className="mb-4 flex items-center gap-3">
                <Headphones className="h-5 w-5 text-[#00E5FF]" />
                <h2 className="text-xl font-semibold">Genre lanes</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(catalog?.genreHighlights || []).map((item) => (
                  <Badge key={item.genre} className="bg-white/8 text-white hover:bg-white/12">
                    {item.genre} • {item.releases}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
