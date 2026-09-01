import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileText, Loader2, Music2, PenLine, Send, Trash2, X } from 'lucide-react';
import { getUserReleases, getReleaseById, type Release, type ReleaseTrack } from '../../utils/user-api';
import {
  deleteMyLyrics,
  getMyLyrics,
  submitLyrics,
  updateMyLyrics,
  type LyricsEntry,
} from '../../utils/lyrics-api';

function StatusBadge({ lyrics }: { lyrics: LyricsEntry }) {
  if (lyrics.is_published && lyrics.verification_status === 'verified') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Published</span>;
  }
  if (lyrics.verification_status === 'rejected') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400"><AlertCircle className="h-3.5 w-3.5" /> Rejected</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400"><Clock className="h-3.5 w-3.5" /> Pending review</span>;
}

export function LyricsSubmission() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [tracksByRelease, setTracksByRelease] = useState<Record<string, ReleaseTrack[]>>({});
  const [mine, setMine] = useState<LyricsEntry[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingReleases, setLoadingReleases] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [selectedReleaseId, setSelectedReleaseId] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [mode, setMode] = useState<'submit' | 'request'>('submit');
  const [lyricsText, setLyricsText] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [language, setLanguage] = useState('English');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const refreshMine = () => {
    setLoadingMine(true);
    getMyLyrics()
      .then((result) => setMine(result.data))
      .catch(() => setMine([]))
      .finally(() => setLoadingMine(false));
  };

  useEffect(() => {
    refreshMine();
    setLoadingReleases(true);
    getUserReleases()
      .then((list) => setReleases(list))
      .catch(() => setReleases([]))
      .finally(() => setLoadingReleases(false));
  }, []);

  const loadTracksForRelease = async (releaseId: string) => {
    if (!releaseId || tracksByRelease[releaseId]) return;
    try {
      const { tracks } = await getReleaseById(releaseId);
      setTracksByRelease((prev) => ({ ...prev, [releaseId]: tracks }));
    } catch {
      setTracksByRelease((prev) => ({ ...prev, [releaseId]: [] }));
    }
  };

  const tracksForSelectedRelease = useMemo(
    () => tracksByRelease[selectedReleaseId] || [],
    [tracksByRelease, selectedReleaseId],
  );

  const resetForm = () => {
    setSelectedReleaseId('');
    setSelectedTrackId('');
    setMode('submit');
    setLyricsText('');
    setRequestNote('');
    setLanguage('English');
    setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');

    if (!selectedTrackId) {
      setFormError('Please choose which track this is for.');
      return;
    }

    if (mode === 'submit' && !lyricsText.trim()) {
      setFormError('Please paste the lyrics text.');
      return;
    }

    if (mode === 'request' && requestNote.trim().length < 10) {
      setFormError('Please describe your request in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await submitLyrics({
        trackId: selectedTrackId,
        lyricsText: mode === 'submit' ? lyricsText : undefined,
        requestNote: mode === 'request' ? requestNote : undefined,
        isRequest: mode === 'request',
        language,
      });
      resetForm();
      setShowForm(false);
      refreshMine();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to submit lyrics.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (entry: LyricsEntry) => {
    setEditingId(entry.id);
    setEditText(entry.lyrics_text);
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      await updateMyLyrics(id, { lyricsText: editText });
      setEditingId(null);
      refreshMine();
    } catch {
      // keep the editor open so the artist can retry
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this lyrics submission?')) return;
    try {
      await deleteMyLyrics(id);
      refreshMine();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to delete lyrics.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lyrics</h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">Submit lyrics for your releases, or request our team add them for you.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { window.location.href = '/lyrics'; }}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-[#D6D6D6] hover:bg-white/5"
          >
            View public lyrics site
          </button>
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            <PenLine className="h-4 w-4" /> {showForm ? 'Close' : 'Submit lyrics'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('submit')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${mode === 'submit' ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FFB066]' : 'border-white/10 text-[#B3B3B3] hover:bg-white/5'}`}
            >
              I have the full lyrics
            </button>
            <button
              type="button"
              onClick={() => setMode('request')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${mode === 'request' ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[#7FE8FF]' : 'border-white/10 text-[#B3B3B3] hover:bg-white/5'}`}
            >
              Request our team to add lyrics
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-[#B3B3B3]">Release</label>
              <select
                value={selectedReleaseId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedReleaseId(value);
                  setSelectedTrackId('');
                  void loadTracksForRelease(value);
                }}
                className="w-full rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
              >
                <option value="">{loadingReleases ? 'Loading releases...' : 'Select a release'}</option>
                {releases.map((release) => (
                  <option key={release.id} value={release.id}>{release.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#B3B3B3]">Track</label>
              <select
                value={selectedTrackId}
                onChange={(event) => setSelectedTrackId(event.target.value)}
                disabled={!selectedReleaseId}
                className="w-full rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00] disabled:opacity-50"
              >
                <option value="">{selectedReleaseId ? 'Select a track' : 'Choose a release first'}</option>
                {tracksForSelectedRelease.map((track) => (
                  <option key={track.id} value={track.id}>{track.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm text-[#B3B3B3]">Language</label>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00] sm:w-56"
            >
              {['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Other'].map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          {mode === 'submit' ? (
            <div className="mt-4">
              <label className="mb-1 block text-sm text-[#B3B3B3]">Lyrics</label>
              <textarea
                value={lyricsText}
                onChange={(event) => setLyricsText(event.target.value)}
                rows={10}
                placeholder={'[Verse 1]\nPaste your full lyrics here...'}
                className="w-full rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
              />
            </div>
          ) : (
            <div className="mt-4">
              <label className="mb-1 block text-sm text-[#B3B3B3]">Tell us what you need</label>
              <textarea
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                rows={5}
                placeholder="E.g. I don't have the written lyrics yet, please transcribe from the audio and add them for this track."
                className="w-full rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#00E5FF]"
              />
            </div>
          )}

          {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-[#D6D6D6] hover:bg-white/5">Cancel</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {mode === 'submit' ? 'Submit lyrics' : 'Send request'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
        <div className="mb-4 flex items-center gap-2 text-white">
          <FileText className="h-4 w-4 text-[#FFD600]" />
          <h2 className="text-lg font-bold">Your lyrics submissions</h2>
        </div>

        {loadingMine ? (
          <div className="flex items-center gap-2 py-8 text-[#9AA8BD]"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : mine.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-[#9AA8BD]">
            <Music2 className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3">You haven't submitted any lyrics yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-white/10 bg-[#0E0E0E] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{entry.title}</p>
                    <p className="text-sm text-[#9AA8BD]">{entry.album_name || 'Single'} • {entry.lyrics_language}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge lyrics={entry} />
                    {!entry.is_published && (
                      <>
                        <button type="button" onClick={() => startEdit(entry)} className="rounded-lg border border-white/15 p-2 text-[#D6D6D6] hover:bg-white/5" aria-label="Edit lyrics" title="Edit lyrics">
                          <PenLine className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(entry.id)} className="rounded-lg border border-white/15 p-2 text-red-400 hover:bg-red-500/10" aria-label="Delete lyrics" title="Delete lyrics">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === entry.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={editText}
                      onChange={(event) => setEditText(event.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-white/15 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditingId(null)} className="flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-[#D6D6D6] hover:bg-white/5"><X className="h-3.5 w-3.5" /> Cancel</button>
                      <button
                        type="button"
                        onClick={() => saveEdit(entry.id)}
                        disabled={savingEdit}
                        className="flex items-center gap-1 rounded-lg bg-[#FF6B00] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#FF6B00]/90 disabled:opacity-60"
                      >
                        {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[#C9D2E2] line-clamp-3">{entry.lyrics_text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
