import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, BarChart3, Clock3, Loader2, Music2, PenLine, Search, Sparkles, TrendingUp } from 'lucide-react';
import {
  getPublicLyrics,
  getPublicLyricsByAlbum,
  getPublicLyricsByArtist,
  slugify,
  type LyricsEntry,
} from '../utils/lyrics-api';
import { AddLyricsModal } from './lyrics/AddLyricsModal';

const GENRES = ['All', 'Afrobeats', 'Gospel', 'Hip-Hop', 'R&B', 'Pop', 'Reggae', 'Amapiano', 'Highlife', 'Worship', 'Other'];
const LANGUAGES = ['All', 'English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Other'];

const formatCompact = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const navigatePublicPath = (path: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-[#9AA8BD]">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Loading lyrics...</span>
    </div>
  );
}

function AddLyricsButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 ${className}`}
    >
      <PenLine className="h-4 w-4" /> Add Lyrics
    </button>
  );
}

function EmptyState({ title, description, onAddLyrics }: { title: string; description: string; onAddLyrics: () => void }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
      <Music2 className="mx-auto h-8 w-8 text-[#7B61FF]" />
      <p className="mt-3 font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-[#9AA8BD]">{description}</p>
      <AddLyricsButton onClick={onAddLyrics} className="mt-4" />
    </div>
  );
}

function SongCard({ song }: { song: LyricsEntry }) {
  const artistSlug = slugify(song.artist_name);
  const songSlug = slugify(song.title);

  return (
    <button
      type="button"
      onClick={() => navigatePublicPath(`/lyrics/${artistSlug}/${songSlug}`)}
      className="group overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#111827]/70 p-3 text-left transition hover:border-[#7B61FF]/30"
    >
      {song.artwork_url ? (
        <img src={song.artwork_url} alt={song.title} className="h-36 w-full rounded-xl object-cover" />
      ) : (
        <div className="flex h-36 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2333] to-[#0A0A0A]">
          <Music2 className="h-8 w-8 text-white/30" />
        </div>
      )}
      <div className="mt-3 space-y-1">
        <p className="truncate font-semibold text-white group-hover:text-[#FFD600]">{song.title}</p>
        <p className="truncate text-sm text-[#B3B3B3]">{song.artist_name}</p>
      </div>
    </button>
  );
}

export function LyricsHomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [activeLanguage, setActiveLanguage] = useState('All');
  const [trending, setTrending] = useState<LyricsEntry[]>([]);
  const [latest, setLatest] = useState<LyricsEntry[]>([]);
  const [results, setResults] = useState<LyricsEntry[] | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingFeatured(true);
    Promise.all([
      getPublicLyrics({ sort: 'trending', limit: 8 }),
      getPublicLyrics({ sort: 'latest', limit: 8 }),
    ])
      .then(([trendingResult, latestResult]) => {
        if (cancelled) return;
        setTrending(trendingResult.data);
        setLatest(latestResult.data);
      })
      .catch(() => {
        if (!cancelled) {
          setTrending([]);
          setLatest([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFeatured(false);
      });
    return () => { cancelled = true; };
  }, []);

  const hasActiveFilters = Boolean(searchTerm.trim()) || activeGenre !== 'All' || activeLanguage !== 'All';

  useEffect(() => {
    if (!hasActiveFilters) {
      setResults(null);
      return;
    }

    let cancelled = false;
    setLoadingResults(true);
    const timer = window.setTimeout(() => {
      getPublicLyrics({
        search: searchTerm.trim() || undefined,
        genre: activeGenre !== 'All' ? activeGenre : undefined,
        language: activeLanguage !== 'All' ? activeLanguage : undefined,
        limit: 24,
      })
        .then((result) => {
          if (!cancelled) setResults(result.data);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingResults(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchTerm, activeGenre, activeLanguage, hasActiveFilters]);

  const featuredArtists = useMemo(() => {
    const seen = new Map<string, number>();
    [...trending, ...latest].forEach((song) => {
      seen.set(song.artist_name, (seen.get(song.artist_name) || 0) + 1);
    });
    return Array.from(seen.entries()).map(([name, count]) => ({ name, count, slug: slugify(name) })).slice(0, 6);
  }, [trending, latest]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <AddLyricsModal open={modalOpen} onOpenChange={setModalOpen} />

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD600]/30 bg-[#FFD600]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD600]">
              <Music2 className="h-3.5 w-3.5" />
              Lyrics
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Song Lyrics Database</h1>
            <p className="mt-2 max-w-xl text-sm text-[#C9CEDA]">Real lyrics submitted by artists and verified by our team.</p>
          </div>
          <AddLyricsButton onClick={() => setModalOpen(true)} />
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0E1420] px-3 py-3">
          <Search className="h-4 w-4 text-[#9AA8BD]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-[#7F8AA0] focus:outline-none"
            placeholder="Search for a song or artist..."
            aria-label="Search lyrics"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setActiveGenre(genre)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${activeGenre === genre ? 'border-[#FFD600] bg-[#FFD600]/15 text-[#FFD600]' : 'border-white/10 bg-white/5 text-[#D3D7DF] hover:border-[#00E5FF]/40 hover:text-white'}`}
            >
              {genre}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => setActiveLanguage(language)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${activeLanguage === language ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[#7FE8FF]' : 'border-white/10 bg-white/5 text-[#D3D7DF] hover:border-[#00E5FF]/40 hover:text-white'}`}
            >
              {language}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 lg:px-8">
        {hasActiveFilters ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Search results</h2>
              {results && <span className="text-sm text-[#A8B3C7]">{results.length} matches</span>}
            </div>
            {loadingResults ? <LoadingBlock /> : results && results.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {results.map((song) => <SongCard key={song.id} song={song} />)}
              </div>
            ) : (
              <EmptyState title="No lyrics matched your search" description="Can't find it? Submit the lyrics yourself or ask us to add them." onAddLyrics={() => setModalOpen(true)} />
            )}
          </div>
        ) : (
          <>
            <div>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#00E5FF]" />
                <h2 className="text-xl font-bold text-white">Trending Lyrics</h2>
              </div>
              {loadingFeatured ? <LoadingBlock /> : trending.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {trending.map((song) => <SongCard key={song.id} song={song} />)}
                </div>
              ) : (
                <EmptyState title="No trending lyrics yet" description="Published lyrics will show up here once verified by our team." onAddLyrics={() => setModalOpen(true)} />
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[#FFD600]" />
                <h2 className="text-xl font-bold text-white">Latest Lyrics</h2>
              </div>
              {loadingFeatured ? <LoadingBlock /> : latest.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {latest.map((song) => <SongCard key={`latest-${song.id}`} song={song} />)}
                </div>
              ) : (
                <EmptyState title="No lyrics published yet" description="Be the first to submit lyrics for a released track." onAddLyrics={() => setModalOpen(true)} />
              )}
            </div>

            {featuredArtists.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2 text-[#FFD600]">
                  <Sparkles className="h-4 w-4" />
                  <h2 className="text-xl font-bold text-white">Artists with lyrics</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredArtists.map((artist) => (
                    <button key={artist.slug} type="button" onClick={() => navigatePublicPath(`/artists/${artist.slug}/lyrics`)} className="rounded-[1.25rem] border border-white/10 bg-[#111827]/70 p-4 text-left transition hover:border-[#00E5FF]/40">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] font-bold text-black">{artist.name.slice(0, 1).toUpperCase()}</div>
                        <div>
                          <p className="font-semibold text-white">{artist.name}</p>
                          <p className="text-sm text-[#A8B3C7]">{artist.count} song{artist.count === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export function LyricsSongPage({ artistSlug, songSlug }: { artistSlug: string; songSlug: string }) {
  const [song, setSong] = useState<LyricsEntry | null>(null);
  const [related, setRelated] = useState<LyricsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    getPublicLyricsByArtist(artistSlug)
      .then((result) => {
        if (cancelled) return;
        const match = result.data.find((entry) => slugify(entry.title) === songSlug) || null;
        setSong(match);
        setRelated(result.data.filter((entry) => entry.id !== match?.id).slice(0, 6));
        if (!match) setNotFound(true);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [artistSlug, songSlug]);

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A]"><LoadingBlock /></div>;
  }

  if (notFound || !song) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <AddLyricsModal open={modalOpen} onOpenChange={setModalOpen} />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Lyrics unavailable</h1>
          <p className="mt-3 text-[#B3B3B3]">This song isn't published yet, or the link is invalid.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => navigatePublicPath('/lyrics')} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Back to Lyrics</button>
            <AddLyricsButton onClick={() => setModalOpen(true)} />
          </div>
        </div>
      </div>
    );
  }

  const streamingLinks = Object.entries(song.streaming_links || {});

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <AddLyricsModal open={modalOpen} onOpenChange={setModalOpen} />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigatePublicPath('/lyrics')} className="text-sm text-[#8FA3BE] hover:text-white">← Back to Lyrics</button>
          <AddLyricsButton onClick={() => setModalOpen(true)} />
        </div>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
          {song.artwork_url ? (
            <img src={song.artwork_url} alt={song.title} className="h-32 w-32 rounded-2xl object-cover shadow-[0_16px_40px_rgba(0,0,0,0.35)]" />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D2333] to-[#0A0A0A]"><Music2 className="h-8 w-8 text-white/30" /></div>
          )}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-[#FFD600]">
              <BadgeCheck className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Verified lyrics</span>
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">{song.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#D2D9E7]">
              <button type="button" onClick={() => navigatePublicPath(`/artists/${slugify(song.artist_name)}/lyrics`)} className="font-semibold text-[#00E5FF] hover:text-[#7FE8FF]">{song.artist_name}</button>
              {song.album_name && (<><span>•</span><span>{song.album_name}</span></>)}
              {song.release_date && (<><span>•</span><span>{song.release_date}</span></>)}
            </div>
          </div>
        </div>

        {streamingLinks.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {streamingLinks.map(([platform, url]) => (
              <a key={platform} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs capitalize text-[#E7EBF7] hover:border-[#00E5FF]/40 hover:text-white">
                {platform}
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr,0.5fr]">
          <article className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-6 sm:p-8">
            <p className="whitespace-pre-line text-[17px] leading-9 text-[#EDEFF5]">{song.lyrics_text}</p>
          </article>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111827]/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-[#00E5FF]">
                <BarChart3 className="h-4 w-4" />
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-white">Song info</h3>
              </div>
              <ul className="space-y-2 text-sm text-[#C9D2E2]">
                {song.genre && <li><span className="text-[#8F9BB3]">Genre:</span> {song.genre}</li>}
                <li><span className="text-[#8F9BB3]">Language:</span> {song.lyrics_language}</li>
                {song.upc && <li><span className="text-[#8F9BB3]">UPC:</span> {song.upc}</li>}
                <li><span className="text-[#8F9BB3]">Views:</span> {formatCompact(song.view_count)}</li>
              </ul>
            </div>

            {related.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#111827]/70 p-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-white">More from {song.artist_name}</h3>
                <div className="space-y-2">
                  {related.map((entry) => (
                    <button key={entry.id} type="button" onClick={() => navigatePublicPath(`/lyrics/${slugify(entry.artist_name)}/${slugify(entry.title)}`)} className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-left hover:border-[#00E5FF]/40">
                      <span className="truncate text-sm text-white">{entry.title}</span>
                      <ArrowRight className="ml-auto h-3.5 w-3.5 text-[#8FA3BE]" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export function LyricsArtistPage({ artistSlug }: { artistSlug: string }) {
  const [songs, setSongs] = useState<LyricsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicLyricsByArtist(artistSlug)
      .then((result) => { if (!cancelled) setSongs(result.data); })
      .catch(() => { if (!cancelled) setSongs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [artistSlug]);

  const artistName = songs[0]?.artist_name ?? artistSlug.replace(/-/g, ' ');

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A]"><LoadingBlock /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <AddLyricsModal open={modalOpen} onOpenChange={setModalOpen} />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigatePublicPath('/lyrics')} className="text-sm text-[#8FA3BE] hover:text-white">← Back to Lyrics</button>
          <AddLyricsButton onClick={() => setModalOpen(true)} />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] text-2xl font-black text-black">{artistName.slice(0, 1).toUpperCase()}</div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#9AA8BD]">Artist</p>
            <h1 className="text-2xl font-black capitalize sm:text-3xl">{artistName}</h1>
            <p className="text-sm text-[#A8B3C7]">{songs.length} lyrics on AMT DISTRO</p>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          {songs.length === 0 ? (
            <EmptyState title="No published lyrics for this artist yet" description="Submit lyrics for one of their songs to get started." onAddLyrics={() => setModalOpen(true)} />
          ) : songs.map((song) => (
            <button key={song.id} type="button" onClick={() => navigatePublicPath(`/lyrics/${slugify(song.artist_name)}/${slugify(song.title)}`)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#111827]/70 p-3.5 text-left transition hover:border-[#00E5FF]/40">
              <div className="flex items-center gap-3">
                {song.artwork_url ? (
                  <img src={song.artwork_url} alt={song.title} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10"><Music2 className="h-5 w-5 text-white/40" /></div>
                )}
                <div>
                  <p className="font-medium text-white">{song.title}</p>
                  {song.album_name && <p className="text-xs text-[#A8B3C7]">{song.album_name}</p>}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#8FA3BE]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LyricsAlbumPage({ albumSlug }: { albumSlug: string }) {
  const [songs, setSongs] = useState<LyricsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicLyricsByAlbum(albumSlug)
      .then((result) => { if (!cancelled) setSongs(result.data); })
      .catch(() => { if (!cancelled) setSongs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [albumSlug]);

  const albumName = songs[0]?.album_name ?? albumSlug.replace(/-/g, ' ');
  const artistName = songs[0]?.artist_name ?? 'Artist';

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A]"><LoadingBlock /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <AddLyricsModal open={modalOpen} onOpenChange={setModalOpen} />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigatePublicPath('/lyrics')} className="text-sm text-[#8FA3BE] hover:text-white">← Back to Lyrics</button>
          <AddLyricsButton onClick={() => setModalOpen(true)} />
        </div>

        <div className="mt-6 flex items-center gap-4">
          {songs[0]?.artwork_url ? (
            <img src={songs[0].artwork_url} alt={albumName} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D2333] to-[#0A0A0A]"><Music2 className="h-7 w-7 text-white/30" /></div>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#9AA8BD]">Album</p>
            <h1 className="text-2xl font-black capitalize sm:text-3xl">{albumName}</h1>
            <p className="text-sm text-[#A8B3C7]">{artistName} • {songs.length} track{songs.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          {songs.length === 0 ? (
            <EmptyState title="No published lyrics for this album yet" description="Submit lyrics for a track on this album to get started." onAddLyrics={() => setModalOpen(true)} />
          ) : songs.map((song, index) => (
            <button key={song.id} type="button" onClick={() => navigatePublicPath(`/lyrics/${slugify(song.artist_name)}/${slugify(song.title)}`)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#111827]/70 p-3.5 text-left transition hover:border-[#00E5FF]/40">
              <div>
                <p className="text-xs text-[#A8B3C7]">Track {index + 1}</p>
                <p className="font-medium text-white">{song.title}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#8FA3BE]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
