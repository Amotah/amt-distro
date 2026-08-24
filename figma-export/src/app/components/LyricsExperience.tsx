import { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, BarChart3, Clock3, Globe, Mic2, Music2, Search, Sparkles, Star, TrendingUp } from 'lucide-react';

export type LyricsSong = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  artistSlug: string;
  album: string;
  albumSlug: string;
  releaseYear: number;
  genre: string;
  language: string;
  artwork: string;
  isrc: string;
  upc: string;
  lyrics: string;
  lyricsPreview: string;
  totalViews: number;
  streamCount: number;
  releaseDate: string;
  streamingLinks: {
    spotify: string;
    apple: string;
    youtube: string;
    amazon: string;
    boomplay: string;
    audiomack: string;
    deezer: string;
    tidal: string;
  };
};

const lyricsCatalog: LyricsSong[] = [
  {
    id: '1',
    slug: 'song-title',
    title: 'Song Title',
    artist: 'Tope Banjo',
    artistSlug: 'tope-banjo',
    album: 'Album Name',
    albumSlug: 'album-name',
    releaseYear: 2026,
    genre: 'Afrobeats',
    language: 'English',
    artwork: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
    isrc: 'NG-ABC-25-12345',
    upc: '123456789012',
    lyrics: '[Verse 1]\nThe morning calls my name, and I rise with hope\nI can hear the rhythm in the air, and I keep moving\n[Pre-Chorus]\nEven when the road gets rough, I will not give in\nI carry faith and courage, and I let it lead me on\n[Chorus]\nI call the name of Jesus, my shield and my song\nI rise with a new sound, I walk in Your light\n[Verse 2]\nThe night is fading now, and the future is clear\nI know You are with me, and that is enough to heal\n[Bridge]\nLift my hands and let Your peace fill every place\nI am not afraid, my hope is in Your grace',
    lyricsPreview: 'I call the name of Jesus, my shield and my song...',
    totalViews: 38400,
    streamCount: 126000,
    releaseDate: '2026-08-12',
    streamingLinks: {
      spotify: 'https://open.spotify.com',
      apple: 'https://music.apple.com',
      youtube: 'https://music.youtube.com',
      amazon: 'https://music.amazon.com',
      boomplay: 'https://www.boomplay.com',
      audiomack: 'https://audiomack.com',
      deezer: 'https://www.deezer.com',
      tidal: 'https://tidal.com',
    },
  },
  {
    id: '2',
    slug: 'city-light',
    title: 'City Light',
    artist: 'J. Akin',
    artistSlug: 'j-akin',
    album: 'Night Shift',
    albumSlug: 'night-shift',
    releaseYear: 2026,
    genre: 'Gospel',
    language: 'English',
    artwork: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
    isrc: 'NG-ABC-25-12346',
    upc: '123456789013',
    lyrics: '[Verse 1]\nWe walk through the city, chasing a dream\nThe streets glow bright but my heart is still\n[Chorus]\nCity light, keep me shining\nA fire in my soul and a song in my bones\n[Verse 2]\nI carry hope even in the lonely hours\nYou are the reason my spirit stays strong',
    lyricsPreview: 'City light, keep me shining...',
    totalViews: 28150,
    streamCount: 92000,
    releaseDate: '2026-06-08',
    streamingLinks: {
      spotify: 'https://open.spotify.com',
      apple: 'https://music.apple.com',
      youtube: 'https://music.youtube.com',
      amazon: 'https://music.amazon.com',
      boomplay: 'https://www.boomplay.com',
      audiomack: 'https://audiomack.com',
      deezer: 'https://www.deezer.com',
      tidal: 'https://tidal.com',
    },
  },
  {
    id: '3',
    slug: 'goodness-of-god',
    title: 'Goodness of God',
    artist: 'Ayo Faith',
    artistSlug: 'ayo-faith',
    album: 'Grace Road',
    albumSlug: 'grace-road',
    releaseYear: 2025,
    genre: 'Worship',
    language: 'Yoruba',
    artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
    isrc: 'NG-ABC-25-12347',
    upc: '123456789014',
    lyrics: '[Verse 1]\nOluwa mi, O ti jo mi la\nNitori ife Re, mi wa ni ija\n[Chorus]\nOdo rere, Odo rere\nAfi ife Re la nrin mi ni aye\n[Bridge]\nAdupe, adupe, o se iyanu\nAwa yio ma pe oruko Re',
    lyricsPreview: 'Oluwa mi, O ti jo mi la...',
    totalViews: 32060,
    streamCount: 118200,
    releaseDate: '2025-12-11',
    streamingLinks: {
      spotify: 'https://open.spotify.com',
      apple: 'https://music.apple.com',
      youtube: 'https://music.youtube.com',
      amazon: 'https://music.amazon.com',
      boomplay: 'https://www.boomplay.com',
      audiomack: 'https://audiomack.com',
      deezer: 'https://www.deezer.com',
      tidal: 'https://tidal.com',
    },
  },
  {
    id: '4',
    slug: 'midnight-rhythm',
    title: 'Midnight Rhythm',
    artist: 'Nia Blaze',
    artistSlug: 'nia-blaze',
    album: 'After Hours',
    albumSlug: 'after-hours',
    releaseYear: 2025,
    genre: 'R&B',
    language: 'English',
    artwork: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    isrc: 'NG-ABC-25-12348',
    upc: '123456789015',
    lyrics: '[Verse 1]\nThe moon is glowing on the windowpane\nYou and I are chasing every dream\n[Pre-Chorus]\nHold me closer, let the silence speak\n[Chorus]\nMidnight rhythm, we are alive\nDancing through the shadows, feeling alive\n[Verse 2]\nWe pour our hearts into the beat\nA million stars cannot hide this love',
    lyricsPreview: 'Midnight rhythm, we are alive...',
    totalViews: 21540,
    streamCount: 77100,
    releaseDate: '2025-03-02',
    streamingLinks: {
      spotify: 'https://open.spotify.com',
      apple: 'https://music.apple.com',
      youtube: 'https://music.youtube.com',
      amazon: 'https://music.amazon.com',
      boomplay: 'https://www.boomplay.com',
      audiomack: 'https://audiomack.com',
      deezer: 'https://www.deezer.com',
      tidal: 'https://tidal.com',
    },
  },
  {
    id: '5',
    slug: 'sunrise-echo',
    title: 'Sunrise Echo',
    artist: 'Tobi Eze',
    artistSlug: 'tobi-eze',
    album: 'Open Skies',
    albumSlug: 'open-skies',
    releaseYear: 2026,
    genre: 'Pop',
    language: 'Pidgin',
    artwork: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    isrc: 'NG-ABC-25-12349',
    upc: '123456789016',
    lyrics: '[Verse 1]\nI wake with the sun on my face\nNo more fear, I choose grace\n[Chorus]\nSunrise echo, lead me on\nMake the morning sweet again\n[Verse 2]\nWe dey jam to the sound of hope\nEvery step, every breath feels right',
    lyricsPreview: 'Sunrise echo, lead me on...',
    totalViews: 27780,
    streamCount: 88400,
    releaseDate: '2026-04-21',
    streamingLinks: {
      spotify: 'https://open.spotify.com',
      apple: 'https://music.apple.com',
      youtube: 'https://music.youtube.com',
      amazon: 'https://music.amazon.com',
      boomplay: 'https://www.boomplay.com',
      audiomack: 'https://audiomack.com',
      deezer: 'https://www.deezer.com',
      tidal: 'https://tidal.com',
    },
  },
  {
    id: '6',
    slug: 'roots',
    title: 'Roots',
    artist: 'Maya Kola',
    artistSlug: 'maya-kola',
    album: 'Highland Gold',
    albumSlug: 'highland-gold',
    releaseYear: 2024,
    genre: 'Reggae',
    language: 'English',
    artwork: 'https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=900&q=80',
    isrc: 'NG-ABC-25-12350',
    upc: '123456789017',
    lyrics: '[Verse 1]\nI remember every road, every song, every story\nFrom the roots beneath my feet to the ocean in my chest\n[Chorus]\nKeep me grounded, keep me strong\nEven when the wind blows hard\n[Bridge]\nMy heritage is louder than fear\nI carry it with me everywhere',
    lyricsPreview: 'Keep me grounded, keep me strong...',
    totalViews: 19620,
    streamCount: 63400,
    releaseDate: '2024-11-18',
    streamingLinks: {
      spotify: 'https://open.spotify.com',
      apple: 'https://music.apple.com',
      youtube: 'https://music.youtube.com',
      amazon: 'https://music.amazon.com',
      boomplay: 'https://www.boomplay.com',
      audiomack: 'https://audiomack.com',
      deezer: 'https://www.deezer.com',
      tidal: 'https://tidal.com',
    },
  },
];

const genres = ['All', 'Afrobeats', 'Gospel', 'Worship', 'R&B', 'Pop', 'Reggae'];
const languages = ['All', 'English', 'Yoruba', 'Pidgin', 'French', 'Spanish', 'Other'];

const formatCompact = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightMatch = (value: string, searchTerm: string) => {
  const query = searchTerm.trim();
  if (!query) {
    return value;
  }

  return value.split(new RegExp(`(${escapeRegExp(query)})`, 'ig')).map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={`${part}-${index}`} className="rounded bg-[#FFD600]/25 px-1 text-[#F7E7AA]">{part}</mark> : <span key={`${part}-${index}`}>{part}</span>,
  );
};

const navigatePublicPath = (path: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export function LyricsHomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [activeLanguage, setActiveLanguage] = useState('All');

  const filteredSongs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return lyricsCatalog.filter((song) => {
      const matchesGenre = activeGenre === 'All' || song.genre === activeGenre;
      const matchesLanguage = activeLanguage === 'All' || song.language === activeLanguage;
      if (!query) {
        return matchesGenre && matchesLanguage;
      }

      const haystack = [song.title, song.artist, song.album, song.genre, song.language, song.lyrics].join(' ').toLowerCase();
      return matchesGenre && matchesLanguage && haystack.includes(query);
    });
  }, [activeGenre, activeLanguage, searchTerm]);

  const artists = useMemo(
    () => Array.from(new Set(lyricsCatalog.map((song) => song.artist))).map((artistName) => ({
      name: artistName,
      songCount: lyricsCatalog.filter((song) => song.artist === artistName).length,
      slug: lyricsCatalog.find((song) => song.artist === artistName)?.artistSlug ?? artistName.toLowerCase().replace(/\s+/g, '-'),
    })),
    [],
  );

  const trendingLyrics = [...lyricsCatalog].sort((a, b) => b.totalViews - a.totalViews).slice(0, 4);
  const latestLyrics = [...lyricsCatalog].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()).slice(0, 4);
  const popularSongs = [...lyricsCatalog].sort((a, b) => b.streamCount - a.streamCount).slice(0, 4);

  const songResults = searchTerm.trim() ? filteredSongs : [];
  const artistResults = searchTerm.trim() ? artists.filter((artist) => artist.name.toLowerCase().includes(searchTerm.toLowerCase())) : [];
  const albumResults = searchTerm.trim()
    ? lyricsCatalog.filter((song) => song.album.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];
  const lyricTextMatches = searchTerm.trim()
    ? lyricsCatalog.filter((song) => song.lyrics.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#1D2333] via-[#101828] to-[#0A0A0A] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.45)] sm:p-8 lg:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFD600]/30 bg-[#FFD600]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD600]">
            <Music2 className="h-3.5 w-3.5" />
            Lyrics
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.25fr,0.75fr] lg:items-center">
            <div className="space-y-5">
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Lyrics</h1>
              <p className="max-w-2xl text-base text-[#C9CEDA] sm:text-lg">
                Discover lyrics from your favourite artists, songs and albums.
              </p>

              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#0E1420] px-3 py-3">
                  <Search className="h-4 w-4 text-[#9AA8BD]" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder:text-[#7F8AA0] focus:outline-none"
                    placeholder="Search for a song, artist, album or lyrics..."
                    aria-label="Search lyrics"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!searchTerm.trim()) {
                      navigatePublicPath('/lyrics');
                      return;
                    }
                    navigatePublicPath('/lyrics');
                  }}
                  className="rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-5 py-3 font-semibold text-black transition hover:opacity-90"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#7B61FF]/20 bg-[#111827]/70 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9AA8BD]">Trending now</p>
                  <p className="mt-2 text-xl font-bold text-white">{formatCompact(trendingLyrics[0]?.totalViews ?? 0)} views</p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#00E5FF]" />
              </div>
              <div className="space-y-3">
                {trendingLyrics.slice(0, 3).map((song) => (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => navigatePublicPath(`/lyrics/${song.artistSlug}/${song.slug}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/5 p-2 text-left transition hover:border-[#00E5FF]/40 hover:bg-white/10"
                  >
                    <img src={song.artwork} alt={song.title} className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{song.title}</p>
                      <p className="truncate text-xs text-[#B3B3B3]">{song.artist}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#B3B3B3]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {searchTerm.trim() && (
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="rounded-[1.75rem] border border-white/10 bg-[#111827]/70 p-5">
            <div className="mb-4 flex items-center gap-2 text-[#FFD600]">
              <Search className="h-4 w-4" />
              <h2 className="text-xl font-bold text-white">Search results</h2>
            </div>

            <div className="grid gap-6 xl:grid-cols-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9AA8BD]">Songs</p>
                {songResults.length === 0 ? <p className="text-sm text-[#B3B3B3]">No songs found.</p> : songResults.map((song) => (
                  <button key={song.id} type="button" onClick={() => navigatePublicPath(`/lyrics/${song.artistSlug}/${song.slug}`)} className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#00E5FF]/40">
                    <p className="font-semibold text-white">{highlightMatch(song.title, searchTerm)}</p>
                    <p className="text-sm text-[#B3B3B3]">{song.artist} • {song.album}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9AA8BD]">Artists</p>
                {artistResults.length === 0 ? <p className="text-sm text-[#B3B3B3]">No artists found.</p> : artistResults.map((artist) => (
                  <button key={artist.slug} type="button" onClick={() => navigatePublicPath(`/artists/${artist.slug}/lyrics`)} className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#00E5FF]/40">
                    <p className="font-semibold text-white">{artist.name}</p>
                    <p className="text-sm text-[#B3B3B3]">{artist.songCount} songs</p>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9AA8BD]">Albums</p>
                {albumResults.length === 0 ? <p className="text-sm text-[#B3B3B3]">No matching albums.</p> : albumResults.map((song) => (
                  <button key={`${song.album}-${song.id}`} type="button" onClick={() => navigatePublicPath(`/album/${song.albumSlug}/lyrics`)} className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#00E5FF]/40">
                    <p className="font-semibold text-white">{highlightMatch(song.album, searchTerm)}</p>
                    <p className="text-sm text-[#B3B3B3]">{song.artist}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9AA8BD]">Lyrics matches</p>
                {lyricTextMatches.length === 0 ? <p className="text-sm text-[#B3B3B3]">No lyric text matches.</p> : lyricTextMatches.map((song) => (
                  <button key={`lyrics-${song.id}`} type="button" onClick={() => navigatePublicPath(`/lyrics/${song.artistSlug}/${song.slug}`)} className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#00E5FF]/40">
                    <p className="font-semibold text-white">{song.title} — {song.artist}</p>
                    <p className="mt-2 text-sm text-[#D6DCE7]">“{highlightMatch(song.lyricsPreview, searchTerm)}”</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
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

        <div className="flex flex-wrap gap-2">
          {languages.map((language) => (
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

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Trending Lyrics</h2>
            <span className="text-sm text-[#A8B3C7]">{filteredSongs.length} matches</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(filteredSongs.length ? filteredSongs : trendingLyrics).map((song) => (
              <div key={song.id} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111827]/70 p-3 transition hover:border-[#7B61FF]/30">
                <img src={song.artwork} alt={song.title} className="h-44 w-full rounded-xl object-cover" />
                <div className="mt-4 space-y-2">
                  <p className="text-lg font-semibold text-white">{song.title}</p>
                  <p className="text-sm text-[#B3B3B3]">{song.artist}</p>
                  <p className="text-xs text-[#8B96A7]">{song.album} • {song.releaseYear}</p>
                  <button type="button" onClick={() => navigatePublicPath(`/lyrics/${song.artistSlug}/${song.slug}`)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#FF6B00]/10 px-3 py-1.5 text-sm font-medium text-[#FFB066] hover:bg-[#FF6B00]/20">
                    View Lyrics <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Latest Lyrics</h2>
            <span className="text-sm text-[#A8B3C7]">Fresh uploads</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {latestLyrics.map((song) => (
              <div key={`latest-${song.id}`} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111827]/70 p-3">
                <img src={song.artwork} alt={song.title} className="h-40 w-full rounded-xl object-cover" />
                <div className="mt-3 space-y-2">
                  <p className="font-semibold text-white">{song.title}</p>
                  <p className="text-sm text-[#B3B3B3]">{song.artist}</p>
                  <p className="text-xs text-[#8B96A7]">{song.album} • {song.releaseYear}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center gap-2 text-[#FFD600]">
              <Mic2 className="h-4 w-4" />
              <h2 className="text-2xl font-bold text-white">Popular Artists</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {artists.slice(0, 6).map((artist) => (
                <button key={artist.slug} type="button" onClick={() => navigatePublicPath(`/artists/${artist.slug}/lyrics`)} className="rounded-[1.5rem] border border-white/10 bg-[#111827]/70 p-4 text-left transition hover:border-[#00E5FF]/40">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] font-bold text-black">{artist.name.slice(0, 1)}</div>
                    <div>
                      <p className="font-semibold text-white">{artist.name}</p>
                      <p className="text-sm text-[#A8B3C7]">{artist.songCount} songs</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2 text-[#00E5FF]">
              <Star className="h-4 w-4" />
              <h2 className="text-2xl font-bold text-white">Popular Songs</h2>
            </div>
            <div className="space-y-3">
              {popularSongs.map((song) => (
                <button key={`popular-${song.id}`} type="button" onClick={() => navigatePublicPath(`/lyrics/${song.artistSlug}/${song.slug}`)} className="flex w-full items-center gap-3 rounded-[1.25rem] border border-white/10 bg-[#111827]/70 p-3 text-left transition hover:border-[#7B61FF]/30">
                  <img src={song.artwork} alt={song.title} className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{song.title}</p>
                    <p className="truncate text-sm text-[#B3B3B3]">{song.artist}</p>
                  </div>
                  <div className="text-right text-xs text-[#A8B3C7]">
                    <p>{formatCompact(song.totalViews)}</p>
                    <p className="text-[#FFD600]">views</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center gap-2 text-[#FF6B00]">
              <Sparkles className="h-4 w-4" />
              <h2 className="text-2xl font-bold text-white">Browse by Genre</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Afrobeats', 'Gospel', 'Hip-Hop', 'R&B', 'Pop', 'Reggae', 'Amapiano', 'Dancehall', 'Highlife', 'Worship', 'Christian', 'Jazz', 'Rock', 'Other'].map((genre) => (
                <button key={genre} type="button" onClick={() => setActiveGenre(genre)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[#D9DEE9] transition hover:border-[#FF6B00]/40 hover:text-white">
                  {genre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-4 flex items-center gap-2 text-[#00E5FF]">
              <Globe className="h-4 w-4" />
              <h2 className="text-2xl font-bold text-white">Browse by Language</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Spanish', 'Portuguese', 'Other'].map((language) => (
                <button key={language} type="button" onClick={() => setActiveLanguage(language)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[#D9DEE9] transition hover:border-[#00E5FF]/40 hover:text-white">
                  {language}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function LyricsSongPage({ artistSlug, songSlug }: { artistSlug: string; songSlug: string }) {
  const song = lyricsCatalog.find((entry) => entry.artistSlug === artistSlug && entry.slug === songSlug) ?? lyricsCatalog.find((entry) => entry.slug === songSlug);

  if (!song) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-white">
        <h1 className="text-3xl font-bold">Lyrics unavailable</h1>
        <p className="mt-3 text-[#B3B3B3]">This song is not published yet or the page slug is invalid.</p>
      </div>
    );
  }

  const relatedSongs = lyricsCatalog.filter((entry) => entry.artistSlug === song.artistSlug && entry.id !== song.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111827]/70 p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
            <img src={song.artwork} alt={song.title} className="h-44 w-44 rounded-[1.5rem] object-cover shadow-[0_22px_60px_rgba(0,0,0,0.35)]" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 text-[#FFD600]">
                <BadgeCheck className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Official lyrics</span>
              </div>
              <h1 className="text-3xl font-black sm:text-5xl">{song.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#D2D9E7]">
                <button type="button" onClick={() => navigatePublicPath(`/artists/${song.artistSlug}/lyrics`)} className="font-semibold text-[#00E5FF] hover:text-[#7FE8FF]">{song.artist}</button>
                <span>•</span>
                <span>{song.album}</span>
                <span>•</span>
                <span>{song.releaseDate}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[#A8B3C7]">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{song.genre}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{song.language}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">ISRC: {song.isrc}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {Object.entries(song.streamingLinks).map(([platform, url]) => (
              <a key={platform} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm capitalize text-[#E7EBF7] transition hover:border-[#00E5FF]/40 hover:text-white">
                {platform}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr,0.6fr]">
          <article className="rounded-[1.75rem] border border-white/10 bg-[#111827]/70 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 text-[#FFD600]">
              <Music2 className="h-4 w-4" />
              <h2 className="text-xl font-bold text-white">Lyrics</h2>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-base leading-8 text-[#E8EDF7] sm:text-lg" style={{ fontFamily: 'inherit' }}>{song.lyrics}</pre>
          </article>

          <aside className="space-y-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#111827]/70 p-5">
              <div className="mb-4 flex items-center gap-2 text-[#00E5FF]">
                <BarChart3 className="h-4 w-4" />
                <h3 className="text-xl font-bold text-white">Song metadata</h3>
              </div>
              <ul className="space-y-3 text-sm text-[#C9D2E2]">
                <li><span className="text-[#8F9BB3]">Album:</span> {song.album}</li>
                <li><span className="text-[#8F9BB3]">Genre:</span> {song.genre}</li>
                <li><span className="text-[#8F9BB3]">Language:</span> {song.language}</li>
                <li><span className="text-[#8F9BB3]">Release date:</span> {song.releaseDate}</li>
                <li><span className="text-[#8F9BB3]">UPC:</span> {song.upc}</li>
                <li><span className="text-[#8F9BB3]">Total views:</span> {formatCompact(song.totalViews)}</li>
              </ul>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[#111827]/70 p-5">
              <div className="mb-4 flex items-center gap-2 text-[#FFD600]">
                <Clock3 className="h-4 w-4" />
                <h3 className="text-xl font-bold text-white">More from this artist</h3>
              </div>
              <div className="space-y-3">
                {relatedSongs.map((entry) => (
                  <button key={entry.id} type="button" onClick={() => navigatePublicPath(`/lyrics/${entry.artistSlug}/${entry.slug}`)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2 text-left hover:border-[#00E5FF]/40">
                    <img src={entry.artwork} alt={entry.title} className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{entry.title}</p>
                      <p className="truncate text-xs text-[#B3B3B3]">{entry.album}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function LyricsArtistPage({ artistSlug }: { artistSlug: string }) {
  const artistSongs = lyricsCatalog.filter((song) => song.artistSlug === artistSlug);
  const artistName = artistSongs[0]?.artist ?? artistSlug.replace(/-/g, ' ');

  const visibleSongs = useMemo(() => artistSongs.slice(0, 8), [artistSongs]);

  if (!artistSongs.length) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-white"><h1 className="text-3xl font-bold">Artist not found</h1></div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] text-3xl font-black text-black">{artistName.slice(0, 1)}</div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9AA8BD]">Artist lyrics</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">{artistName}</h1>
              <p className="mt-2 max-w-2xl text-[#C9CEDA]">
                Discover all released lyrics, popular tracks, and songs from {artistName} across AMTDistro.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-lg font-bold text-white">{artistSongs.length}</p><p className="text-[#A8B3C7]">Lyrics</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-lg font-bold text-white">{new Set(artistSongs.map((song) => song.album)).size}</p><p className="text-[#A8B3C7]">Albums</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-lg font-bold text-white">{artistSongs.length}</p><p className="text-[#A8B3C7]">Songs</p></div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2 text-[#FFD600]">
            <Music2 className="h-4 w-4" />
            <h2 className="text-2xl font-bold text-white">All Lyrics</h2>
          </div>
          <div className="space-y-3">
            {visibleSongs.map((song) => (
              <button key={song.id} type="button" onClick={() => navigatePublicPath(`/lyrics/${song.artistSlug}/${song.slug}`)} className="flex w-full items-center justify-between gap-4 rounded-[1.25rem] border border-white/10 bg-[#111827]/70 p-4 text-left transition hover:border-[#00E5FF]/40">
                <div className="flex items-center gap-4">
                  <img src={song.artwork} alt={song.title} className="h-16 w-16 rounded-xl object-cover" />
                  <div>
                    <p className="font-semibold text-white">{song.title}</p>
                    <p className="text-sm text-[#A8B3C7]">{song.album} • {song.releaseYear}</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#FF6B00]/10 px-3 py-1 text-sm font-medium text-[#FFB066]">View Lyrics</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function LyricsAlbumPage({ albumSlug }: { albumSlug: string }) {
  const albumSongs = lyricsCatalog.filter((song) => song.albumSlug === albumSlug);
  const albumName = albumSongs[0]?.album ?? albumSlug.replace(/-/g, ' ');
  const artistName = albumSongs[0]?.artist ?? 'Artist';

  if (!albumSongs.length) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-white"><h1 className="text-3xl font-bold">Album lyrics page not found</h1></div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-[#111827]/70 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <img src={albumSongs[0].artwork} alt={albumName} className="h-40 w-40 rounded-[1.4rem] object-cover" />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9AA8BD]">Album lyrics</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{albumName}</h1>
              <p className="mt-2 text-[#D2D9E7]">Artist: <button type="button" onClick={() => navigatePublicPath(`/artists/${albumSongs[0].artistSlug}/lyrics`)} className="font-semibold text-[#00E5FF]">{artistName}</button></p>
              <p className="mt-1 text-sm text-[#A8B3C7]">Released: {albumSongs[0].releaseDate} • {albumSongs.length} tracks</p>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-3">
          {albumSongs.map((song, index) => (
            <button key={song.id} type="button" onClick={() => navigatePublicPath(`/lyrics/${song.artistSlug}/${song.slug}`)} className="flex w-full items-center justify-between gap-4 rounded-[1.25rem] border border-white/10 bg-[#111827]/70 p-4 text-left transition hover:border-[#00E5FF]/40">
              <div>
                <p className="text-sm text-[#A8B3C7]">Track {index + 1}</p>
                <p className="mt-1 text-lg font-semibold text-white">{song.title}</p>
              </div>
              <span className="rounded-full bg-[#FF6B00]/10 px-3 py-1 text-sm font-medium text-[#FFB066]">View Lyrics</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
