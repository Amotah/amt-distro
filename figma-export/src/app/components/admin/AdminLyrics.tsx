import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileText, Loader2, Mail, PlusCircle, Radio, Search, ShieldCheck, Trash2, User, X, XCircle } from 'lucide-react';
import {
  createAdminLyrics,
  deleteAdminLyrics,
  getAdminLyrics,
  updateAdminLyrics,
  type LyricsEntry,
} from '../../utils/lyrics-api';

const STATUS_FILTERS = ['All', 'pending', 'verified', 'rejected'] as const;

const SOURCE_LABELS: Record<string, string> = {
  'upload': 'Upload',
  'admin-import': 'Admin import',
  'artist-submission': 'Artist submission',
  'public-submission': 'Public submission',
  'public-request': 'Public request',
};

function statusBadge(entry: LyricsEntry) {
  if (entry.verification_status === 'verified' && entry.is_published) {
    return <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">Published</span>;
  }
  if (entry.verification_status === 'verified') {
    return <span className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-300">Verified</span>;
  }
  if (entry.verification_status === 'rejected') {
    return <span className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300">Rejected</span>;
  }
  return <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300">Pending review</span>;
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-[#7B61FF]/10 bg-[#121826] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#A0A7B8]">{title}</p>
        <div className="rounded-lg bg-[#7B61FF]/15 p-2 text-[#7B61FF]">{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

export function AdminLyrics() {
  const [lyrics, setLyrics] = useState<LyricsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<LyricsEntry>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState({ trackId: '', title: '', artistName: '', albumName: '', lyricsText: '', language: 'English', genre: '' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = () => {
    setLoading(true);
    getAdminLyrics({
      search: search.trim() || undefined,
      verificationStatus: statusFilter !== 'All' ? statusFilter : undefined,
      limit: 100,
    })
      .then((result) => setLyrics(result.data))
      .catch(() => setLyrics([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(refresh, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const stats = useMemo(() => ({
    total: lyrics.length,
    published: lyrics.filter((item) => item.is_published).length,
    pending: lyrics.filter((item) => item.verification_status === 'pending').length,
    verified: lyrics.filter((item) => item.verification_status === 'verified').length,
  }), [lyrics]);

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (entry: LyricsEntry) => {
    setEditingId(entry.id);
    setEditDraft({
      lyrics_text: entry.lyrics_text,
      album_name: entry.album_name || '',
      genre: entry.genre || '',
      lyrics_language: entry.lyrics_language,
    });
  };

  const saveEdit = async (id: string) => {
    await runAction(id, () => updateAdminLyrics(id, {
      lyricsText: editDraft.lyrics_text,
      albumName: editDraft.album_name,
      genre: editDraft.genre,
      language: editDraft.lyrics_language,
    }));
    setEditingId(null);
  };

  const handleCreate = async () => {
    setError('');
    if (!createDraft.trackId.trim() || !createDraft.lyricsText.trim()) {
      setError('Track ID and lyrics text are required.');
      return;
    }
    try {
      await createAdminLyrics({
        trackId: createDraft.trackId.trim(),
        title: createDraft.title.trim() || undefined,
        artistName: createDraft.artistName.trim() || undefined,
        albumName: createDraft.albumName.trim() || undefined,
        lyricsText: createDraft.lyricsText.trim(),
        language: createDraft.language,
        genre: createDraft.genre.trim() || undefined,
      });
      setCreateDraft({ trackId: '', title: '', artistName: '', albumName: '', lyricsText: '', language: 'English', genre: '' });
      setShowCreate(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lyrics');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] p-4 text-white lg:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-[#7B61FF]/10 bg-[#121826] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00E5FF]">Content</p>
            <h1 className="mt-2 text-3xl font-black">Lyrics</h1>
            <p className="mt-1 text-sm text-[#A0A7B8]">Review artist and public submissions/requests, or add lyrics directly for any track.</p>
          </div>
          <button
            onClick={() => setShowCreate((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-2.5 font-semibold text-black transition hover:opacity-90"
          >
            <PlusCircle className="h-4 w-4" />
            Add Lyrics
          </button>
        </div>

        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

        {showCreate && (
          <div className="rounded-[1.75rem] border border-[#7B61FF]/10 bg-[#121826] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add lyrics for a track</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-[#A0A7B8] hover:bg-white/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={createDraft.trackId}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, trackId: event.target.value }))}
                placeholder="Track ID (from Release Management)"
                className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
              />
              <input
                value={createDraft.artistName}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, artistName: event.target.value }))}
                placeholder="Artist name (optional override)"
                className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
              />
              <input
                value={createDraft.title}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Title (optional override)"
                className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
              />
              <input
                value={createDraft.albumName}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, albumName: event.target.value }))}
                placeholder="Album name (optional override)"
                className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
              />
              <input
                value={createDraft.genre}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, genre: event.target.value }))}
                placeholder="Genre (optional override)"
                className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
              />
              <select
                value={createDraft.language}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, language: event.target.value }))}
                className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
              >
                {['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Other'].map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <textarea
              value={createDraft.lyricsText}
              onChange={(event) => setCreateDraft((prev) => ({ ...prev, lyricsText: event.target.value }))}
              rows={8}
              placeholder="Full lyrics text"
              className="mt-3 w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
            />
            <div className="mt-3 flex justify-end">
              <button onClick={handleCreate} className="rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-2 text-sm font-semibold text-black hover:opacity-90">Create lyrics</button>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total lyrics" value={stats.total.toString()} icon={<FileText className="h-4 w-4" />} />
          <StatCard title="Published" value={stats.published.toString()} icon={<ShieldCheck className="h-4 w-4" />} />
          <StatCard title="Pending review" value={stats.pending.toString()} icon={<Clock3 className="h-4 w-4" />} />
          <StatCard title="Verified" value={stats.verified.toString()} icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>

        <div className="rounded-[1.75rem] border border-[#7B61FF]/10 bg-[#121826] p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2.5">
              <Search className="h-4 w-4 text-[#8FA3BE]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search lyrics, artist, album..."
                className="w-full bg-transparent text-sm text-white placeholder:text-[#7F8AA0] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0F172A] px-2.5 py-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number])}
                className="bg-transparent text-sm text-white focus:outline-none"
              >
                {STATUS_FILTERS.map((status) => <option key={status} value={status} className="bg-[#121826] capitalize">{status}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-[#8FA3BE]"><Loader2 className="h-4 w-4 animate-spin" /> Loading lyrics...</div>
          ) : lyrics.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-[#8FA3BE]">No lyrics match this filter yet.</div>
          ) : (
            <div className="space-y-3">
              {lyrics.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-white/10 bg-[#0F172A] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{entry.title}</p>
                      <p className="text-sm text-[#C9D2E2]">{entry.artist_name} • {entry.album_name || 'Single'}</p>
                      <p className="mt-1 text-xs text-[#7C8AA5]">{entry.lyrics_language} • {SOURCE_LABELS[entry.source] || entry.source} • copyright: {entry.copyright_status.replace('-', ' ')}</p>
                      {(entry.submitter_name || entry.submitter_email) && (
                        <p className="mt-1 flex items-center gap-3 text-xs text-[#7C8AA5]">
                          {entry.submitter_name && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {entry.submitter_name}</span>}
                          {entry.submitter_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {entry.submitter_email}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(entry)}
                      {entry.verification_status === 'pending' && (
                        <>
                          <button disabled={busyId === entry.id} onClick={() => runAction(entry.id, () => updateAdminLyrics(entry.id, { verificationStatus: 'verified' }))} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                          </button>
                          <button disabled={busyId === entry.id} onClick={() => runAction(entry.id, () => updateAdminLyrics(entry.id, { verificationStatus: 'rejected' }))} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/15 disabled:opacity-50">
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {entry.verification_status === 'verified' && (
                        <button disabled={busyId === entry.id} onClick={() => runAction(entry.id, () => updateAdminLyrics(entry.id, { isPublished: !entry.is_published }))} className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-300 hover:bg-sky-500/15 disabled:opacity-50">
                          <Radio className="h-3.5 w-3.5" /> {entry.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                      )}
                      <button onClick={() => startEdit(entry)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#E8EDF7] hover:bg-white/10">Edit</button>
                      <button
                        disabled={busyId === entry.id}
                        onClick={() => { if (window.confirm('Delete this lyrics entry?')) runAction(entry.id, () => deleteAdminLyrics(entry.id)); }}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/15 disabled:opacity-50"
                        aria-label="Delete lyrics"
                        title="Delete lyrics"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {editingId === entry.id ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-[#121826] p-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input value={editDraft.album_name || ''} onChange={(event) => setEditDraft((prev) => ({ ...prev, album_name: event.target.value }))} placeholder="Album" className="rounded-lg border border-white/10 bg-[#0F172A] px-2 py-1.5 text-sm text-white outline-none focus:border-[#FF6B00]" />
                        <input value={editDraft.genre || ''} onChange={(event) => setEditDraft((prev) => ({ ...prev, genre: event.target.value }))} placeholder="Genre" className="rounded-lg border border-white/10 bg-[#0F172A] px-2 py-1.5 text-sm text-white outline-none focus:border-[#FF6B00]" />
                        <input value={editDraft.lyrics_language || ''} onChange={(event) => setEditDraft((prev) => ({ ...prev, lyrics_language: event.target.value }))} placeholder="Language" className="rounded-lg border border-white/10 bg-[#0F172A] px-2 py-1.5 text-sm text-white outline-none focus:border-[#FF6B00]" />
                      </div>
                      <textarea
                        value={editDraft.lyrics_text || ''}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, lyrics_text: event.target.value }))}
                        rows={8}
                        className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#D6D6D6] hover:bg-white/5">Cancel</button>
                        <button disabled={busyId === entry.id} onClick={() => saveEdit(entry.id)} className="rounded-lg bg-[#FF6B00] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#FF6B00]/90 disabled:opacity-60">Save</button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm text-[#C9D2E2]">{entry.lyrics_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
