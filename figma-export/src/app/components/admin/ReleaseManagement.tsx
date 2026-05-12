import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { useSearchParams } from 'react-router';
import * as adminApi from '../../utils/admin-api';
import {
  Music,
  CheckCircle,
  Search,
  Eye,
  Plus,
  Disc3,
  Hash,
  PencilLine,
  Loader2,
  Trash2,
  XCircle,
} from 'lucide-react';

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
  'Afrobeats': ['Afro-Pop', 'Afro-Fusion', 'Afro-House', 'Afro-Soul'],
  'Hip-Hop/Rap': ['Trap', 'Boom Bap', 'Drill', 'Alternative Hip-Hop'],
  'R&B/Soul': ['Contemporary R&B', 'Neo-Soul', 'Alternative R&B'],
  'Pop': ['Dance Pop', 'Electropop', 'Indie Pop', 'Synth-pop'],
  'Electronic': ['House', 'Techno', 'Drum & Bass', 'Dubstep', 'Amapiano'],
  'Gospel': ['Contemporary Gospel', 'Traditional Gospel', 'Gospel Choir'],
  'Highlife': ['Traditional Highlife', 'Contemporary Highlife'],
  'Juju': ['Traditional Juju', 'Modern Juju'],
  'Fuji': ['Traditional Fuji', 'Contemporary Fuji'],
  'Reggae/Dancehall': ['Roots Reggae', 'Dancehall', 'Reggae Fusion'],
  'Alternative': ['Indie', 'Experimental', 'Art Pop'],
  'Jazz': ['Contemporary Jazz', 'Jazz Fusion', 'Smooth Jazz'],
};

function formatDuration(seconds: number) {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function createInitialTrackForm(release?: adminApi.Release) {
  return {
    title: '',
    version: '',
    trackNumber: '1',
    discNumber: '1',
    duration: '180',
    language: 'eng',
    explicit: false,
    genre: 'Afrobeats',
    subgenre: 'Afro-Pop',
    primaryArtist: release?.primaryArtist || '',
    isrc: '',
    audioFileUrl: '',
    audioFilePath: '',
    previewStart: '0',
    lyrics: '',
  };
}

export function ReleaseManagement() {
  const { hasPermission } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [releases, setReleases] = useState<adminApi.Release[]>([]);
  const [filteredReleases, setFilteredReleases] = useState<adminApi.Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [requestFilter, setRequestFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedReleaseId, setHighlightedReleaseId] = useState<string | null>(null);
  const [previewRelease, setPreviewRelease] = useState<adminApi.Release | null>(null);
  const [previewTracks, setPreviewTracks] = useState<adminApi.ReleaseTrack[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [trackFormOpen, setTrackFormOpen] = useState(false);
  const [trackSubmitting, setTrackSubmitting] = useState(false);
  const [trackForm, setTrackForm] = useState(createInitialTrackForm());
  const [assigningUpc, setAssigningUpc] = useState(false);
  const [assigningTrackId, setAssigningTrackId] = useState<string | null>(null);
  const [upcInput, setUpcInput] = useState('');
  const [trackCodeInputs, setTrackCodeInputs] = useState<Record<string, string>>({});
  const PAGE_SIZE = 10;

  const canEdit = hasPermission('releases.edit');
  const canApprove = hasPermission('releases.approve');
  const canDelete = hasPermission('releases.delete');

  useEffect(() => {
    loadReleases();
  }, []);

  useEffect(() => {
    filterReleases();
  }, [releases, searchQuery, statusFilter, requestFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, requestFilter]);

  useEffect(() => {
    const releaseId = searchParams.get('releaseId');
    if (releaseId) {
      setHighlightedReleaseId(releaseId);
      const idx = filteredReleases.findIndex((release) => release.id === releaseId);
      if (idx >= 0) {
        setCurrentPage(Math.floor(idx / PAGE_SIZE) + 1);
      }
    }
  }, [filteredReleases, searchParams]);

  async function loadReleases() {
    try {
      setIsLoading(true);
      const data = await adminApi.getAllReleases();
      setReleases(data);
    } catch (error) {
      console.error('Error loading releases:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function filterReleases() {
    let filtered = releases;

    if (searchQuery) {
      filtered = filtered.filter(
        (release) =>
          release.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          release.primaryArtist.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((release) => release.status === statusFilter);
    }

    if (requestFilter !== 'all') {
      filtered = filtered.filter((release) => {
        const upcRequested = Boolean(release.upcRequested && !release.upc);

        if (requestFilter === 'upc') {
          return upcRequested;
        }

        if (requestFilter === 'any') {
          return upcRequested;
        }

        return true;
      });
    }

    setFilteredReleases(filtered);
  }

  function releaseHasCodeRequest(release: adminApi.Release) {
    return Boolean(release.upcRequested && !release.upc);
  }

  async function handleStatusChange(releaseId: string, newStatus: string) {
    try {
      await adminApi.updateRelease(releaseId, { status: newStatus as any });
      setReleases(releases.map(r => r.id === releaseId ? { ...r, status: newStatus as any } : r));
    } catch (error: any) {
      alert('Error updating release: ' + error.message);
    }
  }

  async function handleDeleteRelease(release: adminApi.Release) {
    const confirmed = window.confirm(`Delete release "${release.title}" by ${release.primaryArtist}? This will remove the release and its tracks.`);
    if (!confirmed) {
      return;
    }

    try {
      await adminApi.deleteRelease(release.id);
      setReleases((current) => current.filter((item) => item.id !== release.id));
      setFilteredReleases((current) => current.filter((item) => item.id !== release.id));
      if (previewRelease?.id === release.id) {
        closePreview();
      }
    } catch (error: any) {
      alert('Error deleting release: ' + error.message);
    }
  }

  async function openPreview(release: adminApi.Release) {
    setPreviewRelease(release);
    setPreviewTracks([]);
    setPreviewError(null);
    setTrackFormOpen(false);
    setTrackForm(createInitialTrackForm(release));

    try {
      setPreviewLoading(true);
      const details = await adminApi.getAdminReleaseDetails(release.id);
      setPreviewRelease(details.release);
      setPreviewTracks(details.tracks);
      setUpcInput(details.release.upc || '');
      setTrackCodeInputs(Object.fromEntries(details.tracks.map((track) => [track.id, track.isrc || ''])));
      setTrackForm((current) => ({
        ...current,
        primaryArtist: details.release.primaryArtist || current.primaryArtist,
      }));
    } catch (error: any) {
      setPreviewError(error.message || 'Failed to load release tracks.');
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewRelease(null);
    setPreviewTracks([]);
    setPreviewError(null);
    setTrackFormOpen(false);
    setTrackForm(createInitialTrackForm());
    setUpcInput('');
    setTrackCodeInputs({});
  }

  function handleTrackFieldChange(field: string, value: string | boolean) {
    setTrackForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === 'genre') {
        const nextSubgenre = GENRE_OPTIONS[String(value)]?.[0] || '';
        next.subgenre = nextSubgenre;
      }

      return next;
    });
  }

  async function handleCreateTrack(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!previewRelease) return;

    try {
      setTrackSubmitting(true);
      setPreviewError(null);

      const createdTrack = await adminApi.createAdminReleaseTrack(previewRelease.id, {
        title: trackForm.title.trim(),
        version: trackForm.version.trim() || undefined,
        trackNumber: Number(trackForm.trackNumber),
        discNumber: Number(trackForm.discNumber),
        duration: Number(trackForm.duration),
        isrc: trackForm.isrc.trim() || undefined,
        language: trackForm.language,
        explicit: trackForm.explicit,
        genre: trackForm.genre,
        subgenre: trackForm.subgenre.trim() || undefined,
        contributors: [
          {
            id: crypto.randomUUID(),
            name: trackForm.primaryArtist.trim() || previewRelease.primaryArtist,
            role: 'primary_artist',
          },
        ],
        lyrics: trackForm.lyrics.trim() || undefined,
        audioFilePath: trackForm.audioFilePath.trim() || trackForm.audioFileUrl.trim(),
        audioFileUrl: trackForm.audioFileUrl.trim(),
        previewStart: Number(trackForm.previewStart) > 0 ? Number(trackForm.previewStart) : undefined,
      });

      setPreviewTracks((current) => [...current, createdTrack].sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber));
      setTrackForm(createInitialTrackForm(previewRelease));
      setTrackFormOpen(false);
      setReleases((current) => current.map((item) => item.id === previewRelease.id ? { ...item, status: 'draft' } : item));
      setFilteredReleases((current) => current.map((item) => item.id === previewRelease.id ? { ...item, status: 'draft' } : item));
    } catch (error: any) {
      setPreviewError(error.message || 'Failed to create track.');
    } finally {
      setTrackSubmitting(false);
    }
  }

  async function handleAssignUpc(mode: 'manual' | 'generate') {
    if (!previewRelease) return;

    if (mode === 'manual' && !upcInput.trim()) {
      setPreviewError('Enter a UPC before saving it.');
      return;
    }

    try {
      setAssigningUpc(true);
      setPreviewError(null);
      const result = await adminApi.assignReleaseUpc(previewRelease.id, mode === 'manual' ? upcInput.trim() : undefined);
      if (result.release) {
        setPreviewRelease(result.release);
        setUpcInput(result.release.upc || result.upc || '');
        setReleases((current) => current.map((item) => item.id === result.release.id ? result.release : item));
        setFilteredReleases((current) => current.map((item) => item.id === result.release.id ? result.release : item));
      }
    } catch (error: any) {
      setPreviewError(error.message || 'Failed to save UPC.');
    } finally {
      setAssigningUpc(false);
    }
  }

  async function handleAssignIsrc(trackId: string, mode: 'manual' | 'generate') {
    const nextCode = trackCodeInputs[trackId]?.trim() || '';
    if (mode === 'manual' && !nextCode) {
      setPreviewError('Enter an ISRC before saving it.');
      return;
    }

    try {
      setAssigningTrackId(trackId);
      setPreviewError(null);
      const result = await adminApi.assignTrackIsrc(trackId, mode === 'manual' ? nextCode : undefined);
      if (result.track) {
        setPreviewTracks((current) => current.map((track) => track.id === trackId ? result.track : track));
        setTrackCodeInputs((current) => ({
          ...current,
          [trackId]: result.track.isrc || result.isrc || '',
        }));
      }
    } catch (error: any) {
      setPreviewError(error.message || 'Failed to save ISRC.');
    } finally {
      setAssigningTrackId(null);
    }
  }

  const pageCount = Math.max(1, Math.ceil(filteredReleases.length / PAGE_SIZE));
  const pagedReleases = filteredReleases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Release Management</h1>
        <p className="text-[#A0A7B8] mt-1">Manage and approve music releases</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <p className="text-sm text-[#A0A7B8]">Total Releases</p>
          <p className="text-2xl font-bold text-white mt-1">{releases.length}</p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-green-500/30 p-4">
          <p className="text-sm text-green-600">Live</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {releases.filter((r) => r.status === 'live').length}
          </p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-yellow-500/30 p-4">
          <p className="text-sm text-yellow-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {releases.filter((r) => r.status === 'submitted' || r.status === 'processing').length}
          </p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
          <p className="text-sm text-[#A0A7B8]">Draft</p>
          <p className="text-2xl font-bold text-white mt-1">
            {releases.filter((r) => r.status === 'draft').length}
          </p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-red-500/30 p-4">
          <p className="text-sm text-red-600">Failed</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {releases.filter((r) => r.status === 'failed').length}
          </p>
        </div>
        <div className="bg-[#121826] rounded-xl border border-amber-500/30 p-4">
          <p className="text-sm text-amber-700">Code Requests</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {releases.filter((release) => releaseHasCodeRequest(release)).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A0A7B8]" />
            <input
              type="text"
              placeholder="Search releases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
            title="Filter releases by status"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="processing">Processing</option>
            <option value="live">Live</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
            <option value="takedown">Takedown</option>
          </select>
          <select
            value={requestFilter}
            onChange={(e) => setRequestFilter(e.target.value)}
            className="px-4 py-2 border border-[#7B61FF]/20 rounded-lg bg-[#0F1525] text-white placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
            title="Filter releases by code requests"
          >
            <option value="all">All Code Requests</option>
            <option value="any">Needs Code Assignment</option>
            <option value="upc">UPC Requested</option>
          </select>
        </div>
      </div>

      {/* Releases Table */}
      <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0B0F1A] border-b border-[#7B61FF]/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  Release
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  Release Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  UPC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#A0A7B8] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7B61FF]/10">
              {pagedReleases.map((release) => (
                <tr
                  key={release.id}
                  className={`hover:bg-[#0B0F1A] ${highlightedReleaseId === release.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex-shrink-0">
                        {release.artworkUrl && (
                          <img
                            src={release.artworkUrl}
                            alt={release.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">{release.title}</p>
                        <p className="text-sm text-[#A0A7B8]">{release.primaryArtist}</p>
                        {releaseHasCodeRequest(release) && (
                          <p className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            UPC requested
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-[#A0A7B8]">
                      {release.releaseType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#A0A7B8]">
                    {new Date(release.releaseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#A0A7B8]">
                    {release.upc ? (
                      <span className="font-mono">{release.upc}</span>
                    ) : releaseHasCodeRequest(release) ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        Requested from admin
                      </span>
                    ) : (
                      <span className="text-[#A0A7B8]">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {canEdit ? (
                      <select
                        value={release.status}
                        onChange={(e) => handleStatusChange(release.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${
                          release.status === 'live'
                            ? 'bg-green-100 text-green-700'
                            : release.status === 'submitted' || release.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-700'
                            : release.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : release.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-white/10 text-[#A0A7B8]'
                        }`}
                        title={`Update status for ${release.title}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="processing">Processing</option>
                        <option value="live">Live</option>
                        <option value="rejected">Rejected</option>
                        <option value="failed">Failed</option>
                        <option value="takedown">Takedown</option>
                      </select>
                    ) : (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          release.status === 'live'
                            ? 'bg-green-100 text-green-700'
                            : release.status === 'submitted' || release.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-700'
                            : release.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : release.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-white/10 text-[#A0A7B8]'
                        }`}
                      >
                        {release.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => openPreview(release)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-[#7B61FF]/10 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <div className="flex flex-wrap justify-end gap-2">
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteRelease(release)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-900/20 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                        {canApprove && release.status !== 'rejected' && release.status !== 'live' && (
                          <button
                            onClick={() => handleStatusChange(release.id, 'rejected')}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1 text-sm text-rose-600 hover:bg-rose-50 transition"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        )}
                        {canApprove && release.status !== 'live' && (
                          <button
                            onClick={() => handleStatusChange(release.id, 'live')}
                            className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-3 py-1 text-sm text-green-600 hover:bg-green-50 transition"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-[#7B61FF]/20 bg-[#0B0F1A] flex items-center justify-between">
          <div className="text-sm text-[#A0A7B8]">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredReleases.length)} of {filteredReleases.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-[#7B61FF]/20 text-[#A0A7B8] disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-sm text-[#A0A7B8]">{currentPage}/{pageCount}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, pageCount))}
              disabled={currentPage === pageCount}
              className="px-3 py-1 rounded border border-[#7B61FF]/20 text-[#A0A7B8] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {previewRelease && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-auto rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <h3 className="text-lg font-semibold text-slate-900">Release Preview</h3>
                <button
                  onClick={closePreview}
                  className="text-slate-500 hover:text-slate-900"
                >
                  Close
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Title</p>
                    <p className="text-xl font-semibold text-slate-900">{previewRelease.title}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Artist</p>
                    <p className="text-xl font-semibold text-slate-900">{previewRelease.primaryArtist}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Status</p>
                    <p className="text-sm font-semibold text-slate-900">{previewRelease.status}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Release Type</p>
                    <p className="text-sm font-semibold text-slate-900">{previewRelease.releaseType}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">UPC</p>
                    <div className="mt-1 space-y-2">
                      <p className="text-sm font-semibold text-slate-900">{previewRelease.upc || 'Pending assignment'}</p>
                      {previewRelease.upcRequested && !previewRelease.upc && (
                        <p className="text-xs font-medium text-amber-600">Artist requested a UPC from admin.</p>
                      )}
                      {canEdit && (
                        <>
                          <input
                            type="text"
                            value={upcInput}
                            onChange={(e) => setUpcInput(e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2 text-sm"
                            placeholder="Enter a 13-digit UPC"
                            title="Release UPC"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAssignUpc('manual')}
                              disabled={assigningUpc}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              {assigningUpc ? <Loader2 className="w-3 h-3 animate-spin" /> : <PencilLine className="w-3 h-3" />}
                              Save UPC
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAssignUpc('generate')}
                              disabled={assigningUpc}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {assigningUpc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hash className="w-3 h-3" />}
                              Generate UPC
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Release Date</p>
                    <p className="text-sm font-semibold text-slate-900">{new Date(previewRelease.releaseDate).toLocaleDateString()}</p>
                  </div>
                </div>
                {previewRelease.artworkUrl && (
                  <img src={previewRelease.artworkUrl} alt={previewRelease.title} className="h-64 w-full rounded-lg border border-slate-200 object-cover shadow-sm" />
                )}
                {/* If audio URL available, include small audio player */}
                {previewRelease.audioUrl && (
                  <audio controls className="w-full">
                    <source src={previewRelease.audioUrl} />
                    Your browser does not support the audio element.
                  </audio>
                )}

                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase text-slate-500">Track Menu</p>
                      <h4 className="text-lg font-semibold text-slate-900">Release Tracks</h4>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setTrackFormOpen((current) => !current);
                          setPreviewError(null);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Track
                      </button>
                    )}
                  </div>

                  {previewError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {previewError}
                    </div>
                  )}

                  {trackFormOpen && canEdit && (
                    <form onSubmit={handleCreateTrack} className="rounded-xl border border-[#7B61FF]/20 bg-[#0B0F1A] p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Track Title *</label>
                          <input
                            type="text"
                            value={trackForm.title}
                            onChange={(e) => handleTrackFieldChange('title', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Track title"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Version</label>
                          <input
                            type="text"
                            value={trackForm.version}
                            onChange={(e) => handleTrackFieldChange('version', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            placeholder="Acoustic, Remix, Live"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Track Number *</label>
                          <input
                            type="number"
                            min="1"
                            value={trackForm.trackNumber}
                            onChange={(e) => handleTrackFieldChange('trackNumber', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Track number"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Disc Number *</label>
                          <input
                            type="number"
                            min="1"
                            value={trackForm.discNumber}
                            onChange={(e) => handleTrackFieldChange('discNumber', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Disc number"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Duration (seconds) *</label>
                          <input
                            type="number"
                            min="1"
                            value={trackForm.duration}
                            onChange={(e) => handleTrackFieldChange('duration', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Track duration in seconds"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Primary Artist *</label>
                          <input
                            type="text"
                            value={trackForm.primaryArtist}
                            onChange={(e) => handleTrackFieldChange('primaryArtist', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Primary artist"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Language *</label>
                          <select
                            value={trackForm.language}
                            onChange={(e) => handleTrackFieldChange('language', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Track language"
                          >
                            {LANGUAGE_OPTIONS.map((language) => (
                              <option key={language.value} value={language.value}>{language.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Genre *</label>
                          <select
                            value={trackForm.genre}
                            onChange={(e) => handleTrackFieldChange('genre', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Track genre"
                          >
                            {Object.keys(GENRE_OPTIONS).map((genre) => (
                              <option key={genre} value={genre}>{genre}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Subgenre</label>
                          <select
                            value={trackForm.subgenre}
                            onChange={(e) => handleTrackFieldChange('subgenre', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Track subgenre"
                          >
                            {(GENRE_OPTIONS[trackForm.genre] || []).map((subgenre) => (
                              <option key={subgenre} value={subgenre}>{subgenre}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">ISRC</label>
                          <input
                            type="text"
                            value={trackForm.isrc}
                            onChange={(e) => handleTrackFieldChange('isrc', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Track ISRC"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Preview Start (seconds)</label>
                          <input
                            type="number"
                            min="0"
                            value={trackForm.previewStart}
                            onChange={(e) => handleTrackFieldChange('previewStart', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            title="Preview start time in seconds"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Audio File URL *</label>
                          <input
                            type="url"
                            value={trackForm.audioFileUrl}
                            onChange={(e) => handleTrackFieldChange('audioFileUrl', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            placeholder="https://..."
                            title="Audio file URL"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Audio File Path</label>
                          <input
                            type="text"
                            value={trackForm.audioFilePath}
                            onChange={(e) => handleTrackFieldChange('audioFilePath', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2"
                            placeholder="Optional storage path; URL will be used if left blank"
                            title="Audio file storage path"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#A0A7B8] mb-1">Lyrics</label>
                          <textarea
                            value={trackForm.lyrics}
                            onChange={(e) => handleTrackFieldChange('lyrics', e.target.value)}
                            className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2 min-h-28"
                            title="Track lyrics"
                            placeholder="Optional lyrics"
                          />
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2 text-sm font-medium text-[#A0A7B8]">
                        <input
                          type="checkbox"
                          checked={trackForm.explicit}
                          onChange={(e) => handleTrackFieldChange('explicit', e.target.checked)}
                          className="rounded border-[#7B61FF]/20"
                        />
                        Explicit content
                      </label>

                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setTrackFormOpen(false);
                            setTrackForm(createInitialTrackForm(previewRelease));
                          }}
                          className="rounded-lg border border-[#7B61FF]/20 px-4 py-2 text-sm font-medium text-[#A0A7B8]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={trackSubmitting}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {trackSubmitting ? 'Creating Track...' : 'Create Track'}
                        </button>
                      </div>
                    </form>
                  )}

                  {previewLoading ? (
                    <div className="rounded-lg border border-[#7B61FF]/20 px-4 py-6 text-sm text-[#A0A7B8]">Loading track details...</div>
                  ) : previewTracks.length > 0 ? (
                    <div className="space-y-3">
                      {previewTracks
                        .slice()
                        .sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber)
                        .map((track) => (
                          <div key={track.id} className="rounded-xl border border-[#7B61FF]/20 px-4 py-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="rounded-lg bg-white/10 p-2 text-[#A0A7B8]">
                                  <Disc3 className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium text-white">{track.title}</p>
                                  <p className="text-sm text-[#A0A7B8]">
                                    Disc {track.discNumber} • Track {track.trackNumber} • {formatDuration(track.duration)} • {track.genre}
                                  </p>
                                </div>
                              </div>
                              <div className="text-sm text-[#A0A7B8] md:text-right">
                                <p>{LANGUAGE_OPTIONS.find((language) => language.value === track.language)?.label || track.language}</p>
                                <div className="mt-1 space-y-2 md:flex md:flex-col md:items-end">
                                  <p>{track.isrc || 'No ISRC assigned'}</p>
                                  {track.isrcRequested && !track.isrc && (
                                    <p className="text-xs font-medium text-amber-600">Artist requested an ISRC from admin.</p>
                                  )}
                                  {canEdit && (
                                    <>
                                      <input
                                        type="text"
                                        value={trackCodeInputs[track.id] || ''}
                                        onChange={(e) => setTrackCodeInputs((current) => ({ ...current, [track.id]: e.target.value }))}
                                        className="w-full rounded-lg border border-[#7B61FF]/20 px-3 py-2 text-sm md:w-56"
                                        placeholder="Enter ISRC"
                                        title={`ISRC for ${track.title}`}
                                      />
                                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                        <button
                                          type="button"
                                          onClick={() => handleAssignIsrc(track.id, 'manual')}
                                          disabled={assigningTrackId === track.id}
                                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                        >
                                          {assigningTrackId === track.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PencilLine className="w-3 h-3" />}
                                          Save ISRC
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleAssignIsrc(track.id, 'generate')}
                                          disabled={assigningTrackId === track.id}
                                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                        >
                                          {assigningTrackId === track.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hash className="w-3 h-3" />}
                                          Generate ISRC
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#7B61FF]/20 px-4 py-8 text-center text-sm text-[#A0A7B8]">
                      No tracks on this release yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {pagedReleases.length === 0 && (
          <div className="text-center py-12">
            <Music className="w-12 h-12 text-[#A0A7B8] mx-auto mb-3" />
            <p className="text-[#A0A7B8]">No releases found</p>
          </div>
        )}
      </div>
    </div>
  );
}
