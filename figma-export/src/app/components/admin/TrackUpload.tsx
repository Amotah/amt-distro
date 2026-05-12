import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Disc3, Loader2, Plus, Upload } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';

const LANGUAGE_OPTIONS = [
  { value: 'eng', label: 'English' },
  { value: 'yor', label: 'Yoruba' },
  { value: 'hau', label: 'Hausa' },
  { value: 'ibo', label: 'Igbo' },
  { value: 'fra', label: 'French' },
  { value: 'ara', label: 'Arabic' },
  { value: 'spa', label: 'Spanish' },
  { value: 'por', label: 'Portuguese' },
  { value: 'swa', label: 'Swahili' },
];

const GENRE_OPTIONS: Record<string, string[]> = {
  Afrobeats: ['Afro-Pop', 'Afro-Fusion', 'Afro-House', 'Afro-Soul'],
  'Hip-Hop/Rap': ['Trap', 'Boom Bap', 'Drill', 'Alternative Hip-Hop'],
  'R&B/Soul': ['Contemporary R&B', 'Neo-Soul', 'Alternative R&B'],
  Pop: ['Dance Pop', 'Electropop', 'Indie Pop', 'Synth-pop'],
  Electronic: ['House', 'Techno', 'Drum & Bass', 'Dubstep', 'Amapiano'],
  Gospel: ['Contemporary Gospel', 'Traditional Gospel', 'Gospel Choir'],
  Highlife: ['Traditional Highlife', 'Contemporary Highlife'],
  Juju: ['Traditional Juju', 'Modern Juju'],
  Fuji: ['Traditional Fuji', 'Contemporary Fuji'],
  'Reggae/Dancehall': ['Roots Reggae', 'Dancehall', 'Reggae Fusion'],
  Alternative: ['Indie', 'Experimental', 'Art Pop'],
  Jazz: ['Contemporary Jazz', 'Jazz Fusion', 'Smooth Jazz'],
};

function createInitialTrackForm() {
  return {
    releaseId: '',
    title: '',
    version: '',
    trackNumber: '1',
    discNumber: '1',
    duration: '180',
    language: 'eng',
    explicit: false,
    genre: 'Afrobeats',
    subgenre: 'Afro-Pop',
    primaryArtist: '',
    isrc: '',
    audioFileUrl: '',
    audioFilePath: '',
    previewStart: '0',
    lyrics: '',
  };
}

export function TrackUpload() {
  const { hasPermission } = useAdmin();
  const canEdit = hasPermission('releases.edit');
  const [releases, setReleases] = useState<adminApi.Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(createInitialTrackForm());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formControlClassName = 'w-full rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] px-3 py-2 text-white placeholder-[#6D7385]';

  useEffect(() => {
    async function loadReleases() {
      try {
        setIsLoading(true);
        const data = await adminApi.getAllReleases();
        const ordered = data.slice().sort((left, right) => {
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        });
        setReleases(ordered);
        if (ordered.length > 0) {
          setForm((current) => ({
            ...current,
            releaseId: current.releaseId || ordered[0].id,
            primaryArtist: current.primaryArtist || ordered[0].primaryArtist,
          }));
        }
      } catch (error: any) {
        setErrorMessage(error.message || 'Failed to load releases.');
      } finally {
        setIsLoading(false);
      }
    }

    loadReleases();
  }, []);

  const selectedRelease = useMemo(() => {
    return releases.find((release) => release.id === form.releaseId) || null;
  }, [form.releaseId, releases]);

  function handleFieldChange(field: string, value: string | boolean) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'genre') {
        next.subgenre = GENRE_OPTIONS[String(value)]?.[0] || '';
      }

      if (field === 'releaseId') {
        const release = releases.find((item) => item.id === value);
        next.primaryArtist = release?.primaryArtist || current.primaryArtist;
      }

      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) {
      setErrorMessage('You do not have permission to create tracks.');
      return;
    }

    if (!form.releaseId) {
      setErrorMessage('Select a release first.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const track = await adminApi.createAdminReleaseTrack(form.releaseId, {
        title: form.title.trim(),
        version: form.version.trim() || undefined,
        trackNumber: Number(form.trackNumber),
        discNumber: Number(form.discNumber),
        duration: Number(form.duration),
        isrc: form.isrc.trim() || undefined,
        language: form.language,
        explicit: form.explicit,
        genre: form.genre,
        subgenre: form.subgenre.trim() || undefined,
        contributors: [
          {
            id: crypto.randomUUID(),
            name: form.primaryArtist.trim() || selectedRelease?.primaryArtist || 'Unknown Artist',
            role: 'primary_artist',
          },
        ],
        lyrics: form.lyrics.trim() || undefined,
        audioFilePath: form.audioFilePath.trim() || form.audioFileUrl.trim(),
        audioFileUrl: form.audioFileUrl.trim(),
        previewStart: Number(form.previewStart) > 0 ? Number(form.previewStart) : undefined,
      });

      setSuccessMessage(`Track "${track.title}" was created successfully.`);
      setForm((current) => ({
        ...createInitialTrackForm(),
        releaseId: current.releaseId,
        primaryArtist: selectedRelease?.primaryArtist || '',
      }));
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to create track.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-red-700">
        You do not have permission to access Track Upload.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Track Upload</h1>
          <p className="mt-1 text-[#A0A7B8]">Create tracks directly from the admin backend and attach them to an existing release.</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="flex items-center gap-2 font-medium">
            <Upload className="h-4 w-4" />
            Admin Track Creation
          </div>
          <p className="mt-1 text-blue-600">This writes to the same release-track backend used by the dashboard.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#7B61FF]/20 bg-[#121826] p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Release *</label>
              <select
                value={form.releaseId}
                onChange={(event) => handleFieldChange('releaseId', event.target.value)}
                className={formControlClassName}
                title="Select release"
                disabled={isLoading || releases.length === 0}
                required
              >
                {releases.length === 0 ? (
                  <option value="">No releases available</option>
                ) : (
                  releases.map((release) => (
                    <option key={release.id} value={release.id}>
                      {release.title} - {release.primaryArtist}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Track Title *</label>
              <input type="text" value={form.title} onChange={(event) => handleFieldChange('title', event.target.value)} className={formControlClassName} title="Track title" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Version</label>
              <input type="text" value={form.version} onChange={(event) => handleFieldChange('version', event.target.value)} className={formControlClassName} title="Track version" placeholder="Acoustic, Remix, Live" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Track Number *</label>
              <input type="number" min="1" value={form.trackNumber} onChange={(event) => handleFieldChange('trackNumber', event.target.value)} className={formControlClassName} title="Track number" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Disc Number *</label>
              <input type="number" min="1" value={form.discNumber} onChange={(event) => handleFieldChange('discNumber', event.target.value)} className={formControlClassName} title="Disc number" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Duration (seconds) *</label>
              <input type="number" min="1" value={form.duration} onChange={(event) => handleFieldChange('duration', event.target.value)} className={formControlClassName} title="Track duration in seconds" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Primary Artist *</label>
              <input type="text" value={form.primaryArtist} onChange={(event) => handleFieldChange('primaryArtist', event.target.value)} className={formControlClassName} title="Primary artist" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Language *</label>
              <select value={form.language} onChange={(event) => handleFieldChange('language', event.target.value)} className={formControlClassName} title="Track language">
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language.value} value={language.value}>{language.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Genre *</label>
              <select value={form.genre} onChange={(event) => handleFieldChange('genre', event.target.value)} className={formControlClassName} title="Track genre">
                {Object.keys(GENRE_OPTIONS).map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Subgenre</label>
              <select value={form.subgenre} onChange={(event) => handleFieldChange('subgenre', event.target.value)} className={formControlClassName} title="Track subgenre">
                {(GENRE_OPTIONS[form.genre] || []).map((subgenre) => (
                  <option key={subgenre} value={subgenre}>{subgenre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">ISRC</label>
              <input type="text" value={form.isrc} onChange={(event) => handleFieldChange('isrc', event.target.value)} className={formControlClassName} title="Track ISRC" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Preview Start (seconds)</label>
              <input type="number" min="0" value={form.previewStart} onChange={(event) => handleFieldChange('previewStart', event.target.value)} className={formControlClassName} title="Preview start in seconds" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Audio File URL *</label>
              <input type="url" value={form.audioFileUrl} onChange={(event) => handleFieldChange('audioFileUrl', event.target.value)} className={formControlClassName} title="Audio file URL" placeholder="https://..." required />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Audio File Path</label>
              <input type="text" value={form.audioFilePath} onChange={(event) => handleFieldChange('audioFilePath', event.target.value)} className={formControlClassName} title="Audio file storage path" placeholder="Optional storage path; URL will be used if left blank" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#A0A7B8]">Lyrics</label>
              <textarea value={form.lyrics} onChange={(event) => handleFieldChange('lyrics', event.target.value)} className="min-h-32 w-full rounded-lg border border-[#7B61FF]/20 bg-[#0F1525] text-white px-3 py-2 text-white placeholder-[#6D7385]" title="Track lyrics" placeholder="Optional lyrics" />
            </div>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#A0A7B8]">
            <input type="checkbox" checked={form.explicit} onChange={(event) => handleFieldChange('explicit', event.target.checked)} className="rounded border-[#7B61FF]/20" />
            Explicit content
          </label>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                setForm((current) => ({
                  ...createInitialTrackForm(),
                  releaseId: current.releaseId,
                  primaryArtist: selectedRelease?.primaryArtist || '',
                }));
              }}
              className="rounded-lg border border-[#7B61FF]/20 px-4 py-2 text-sm font-medium text-[#A0A7B8]"
            >
              Reset
            </button>
            <button type="submit" disabled={isSubmitting || isLoading || releases.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isSubmitting ? 'Creating Track...' : 'Create Track'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#7B61FF]/20 bg-[#121826] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Disc3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Selected Release</h2>
                <p className="text-sm text-[#A0A7B8]">Attach the track to an existing release before publishing.</p>
              </div>
            </div>

            {selectedRelease ? (
              <div className="mt-5 space-y-3 text-sm text-[#A0A7B8]">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#A0A7B8]">Title</p>
                  <p className="font-medium text-white">{selectedRelease.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#A0A7B8]">Artist</p>
                    <p className="font-medium text-white">{selectedRelease.primaryArtist}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#A0A7B8]">Type</p>
                    <p className="font-medium text-white">{selectedRelease.releaseType}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#A0A7B8]">Status</p>
                    <p className="font-medium capitalize text-white">{selectedRelease.status}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#A0A7B8]">UPC</p>
                    <p className="font-mono font-medium text-white">{selectedRelease.upc || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-[#A0A7B8]">Select a release to see its details.</p>
            )}
          </div>

          <div className="rounded-2xl border border-[#7B61FF]/20 bg-[#121826] p-6">
            <h2 className="text-lg font-semibold text-white">Requirements</h2>
            <ul className="mt-4 space-y-2 text-sm text-[#A0A7B8]">
              <li>Track title, duration, language, genre, artist, and audio URL are required.</li>
              <li>The new track is created directly on the backend through the admin release-track route.</li>
              <li>The selected release stays in draft status after a new admin-created track is added.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}