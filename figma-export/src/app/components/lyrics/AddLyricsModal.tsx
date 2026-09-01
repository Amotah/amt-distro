import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Music2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { searchLiveTracks, submitLyrics, submitPublicLyrics, type SearchableTrack } from '../../utils/lyrics-api';

interface AddLyricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Other'];

function isSignedIn() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem('access_token'));
}

export function AddLyricsModal({ open, onOpenChange, onSubmitted }: AddLyricsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchableTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SearchableTrack | null>(null);
  const [mode, setMode] = useState<'submit' | 'request'>('submit');
  const [lyricsText, setLyricsText] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [language, setLanguage] = useState('English');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const signedIn = isSignedIn();

  const reset = () => {
    setSearchTerm('');
    setResults([]);
    setSelectedTrack(null);
    setMode('submit');
    setLyricsText('');
    setRequestNote('');
    setLanguage('English');
    setSubmitterName('');
    setSubmitterEmail('');
    setError('');
    setSuccess(false);
  };

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTrack) return;
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchLiveTracks(searchTerm)
        .then((tracks) => setResults(tracks))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, selectedTrack]);

  const handleSubmit = async () => {
    setError('');

    if (!selectedTrack) {
      setError('Please choose a song first.');
      return;
    }

    if (mode === 'submit' && !lyricsText.trim()) {
      setError('Please paste the lyrics text.');
      return;
    }

    if (mode === 'request' && requestNote.trim().length < 10) {
      setError('Please describe your request in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (signedIn) {
        await submitLyrics({
          trackId: selectedTrack.trackId,
          lyricsText: mode === 'submit' ? lyricsText : undefined,
          requestNote: mode === 'request' ? requestNote : undefined,
          isRequest: mode === 'request',
          language,
        });
      } else {
        await submitPublicLyrics({
          trackId: selectedTrack.trackId,
          mode,
          lyricsText: mode === 'submit' ? lyricsText : undefined,
          requestNote: mode === 'request' ? requestNote : undefined,
          submitterName: submitterName.trim() || undefined,
          submitterEmail: submitterEmail.trim() || undefined,
          language,
        });
      }
      setSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#111111] border border-white/10 text-white">
        {success ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#6EE7B7]" />
            <h3 className="mt-3 text-lg font-bold text-white">
              {mode === 'submit' ? 'Lyrics submitted!' : 'Request sent!'}
            </h3>
            <p className="mt-1 text-sm text-[#B3B3B3]">
              Thanks — this is now pending review by our team before it appears on the site.
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-4 rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Lyrics</DialogTitle>
              <DialogDescription>
                Search for a song from our catalog, then submit the lyrics or ask us to add them.
              </DialogDescription>
            </DialogHeader>

            {!selectedTrack ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2">
                  <Search className="h-4 w-4 text-[#8FA3BE]" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search song or artist..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#7F8AA0]"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {searching ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#8FA3BE]"><Loader2 className="h-4 w-4 animate-spin" /> Searching...</div>
                  ) : results.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#8FA3BE]">No matching songs found in our catalog.</p>
                  ) : (
                    results.map((track) => (
                      <button
                        key={track.trackId}
                        type="button"
                        onClick={() => setSelectedTrack(track)}
                        className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left hover:border-[#FF6B00]/40"
                      >
                        {track.artworkUrl ? (
                          <img src={track.artworkUrl} alt={track.title} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10"><Music2 className="h-4 w-4 text-white/40" /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{track.title}</p>
                          <p className="truncate text-xs text-[#8FA3BE]">{track.artistName}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                  <div className="flex items-center gap-3">
                    {selectedTrack.artworkUrl ? (
                      <img src={selectedTrack.artworkUrl} alt={selectedTrack.title} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10"><Music2 className="h-4 w-4 text-white/40" /></div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{selectedTrack.title}</p>
                      <p className="text-xs text-[#8FA3BE]">{selectedTrack.artistName}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedTrack(null)} className="text-xs text-[#8FA3BE] hover:text-white">Change</button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('submit')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${mode === 'submit' ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FFB066]' : 'border-white/10 text-[#B3B3B3] hover:bg-white/5'}`}
                  >
                    I have the lyrics
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('request')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${mode === 'request' ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[#7FE8FF]' : 'border-white/10 text-[#B3B3B3] hover:bg-white/5'}`}
                  >
                    Request lyrics
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[#B3B3B3]">Language</label>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
                  >
                    {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>

                {mode === 'submit' ? (
                  <textarea
                    value={lyricsText}
                    onChange={(event) => setLyricsText(event.target.value)}
                    rows={6}
                    placeholder={'[Verse 1]\nPaste the lyrics here...'}
                    className="w-full rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
                  />
                ) : (
                  <textarea
                    value={requestNote}
                    onChange={(event) => setRequestNote(event.target.value)}
                    rows={4}
                    placeholder="Tell us what you need, e.g. 'Please add the official lyrics for this song.'"
                    className="w-full rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#00E5FF]"
                  />
                )}

                {!signedIn && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={submitterName}
                      onChange={(event) => setSubmitterName(event.target.value)}
                      placeholder="Your name (optional)"
                      className="rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
                    />
                    <input
                      value={submitterEmail}
                      onChange={(event) => setSubmitterEmail(event.target.value)}
                      placeholder="Your email (optional)"
                      className="rounded-lg border border-white/15 bg-[#0E0E0E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B00]"
                    />
                  </div>
                )}

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === 'submit' ? 'Submit lyrics' : 'Send request'}
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
