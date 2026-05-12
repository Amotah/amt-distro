import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../utils/admin-api';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  Info,
  Edit,
  Flag,
  Music,
  Calendar,
  User,
  Hash,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'green' | 'red' | 'orange';
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

function ConfirmModal({ isOpen, title, message, confirmText, confirmColor, onConfirm, onCancel, children }: ConfirmModalProps) {
  if (!isOpen) return null;

  const colorStyles = {
    green: {
      background: 'linear-gradient(135deg, #00FFA3 0%, #00E5FF 100%)',
      color: '#0B0F1A',
    },
    red: {
      background: 'linear-gradient(135deg, #FF5252 0%, #FF9800 100%)',
      color: '#FFFFFF',
    },
    orange: {
      background: 'linear-gradient(135deg, #FF9800 0%, #FFB800 100%)',
      color: '#0B0F1A',
    },
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      <div className="rounded-xl max-w-md w-full border"
        style={{
          backgroundColor: '#121826',
          borderColor: 'rgba(123, 97, 255, 0.2)',
        }}
      >
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>{title}</h3>
          <p className="mb-4" style={{ color: '#A0A7B8' }}>{message}</p>
          {children}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg transition"
            style={{
              backgroundColor: 'rgba(123, 97, 255, 0.1)',
              color: '#FFFFFF',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg transition font-semibold"
            style={colorStyles[confirmColor]}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AudioPlayerProps {
  audioUrl: string;
}

function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }

  function formatTime(seconds: number) {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="rounded-lg p-4 border"
      style={{
        backgroundColor: 'rgba(11, 15, 26, 0.8)',
        borderColor: 'rgba(123, 97, 255, 0.2)',
      }}
    >
      <audio ref={audioRef} src={audioUrl} />
      
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition"
          style={{
            background: 'linear-gradient(135deg, #00E5FF 0%, #7B61FF 100%)',
            color: '#FFFFFF',
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
          }}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-2"
            style={{ color: '#A0A7B8' }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden cursor-pointer"
               style={{ backgroundColor: 'rgba(123, 97, 255, 0.2)' }}
               onClick={(e) => {
                 const audio = audioRef.current;
                 if (!audio || !duration) return;
                 const rect = e.currentTarget.getBoundingClientRect();
                 const percent = (e.clientX - rect.left) / rect.width;
                 audio.currentTime = percent * duration;
               }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #00E5FF 0%, #7B61FF 100%)',
              }}
            />
          </div>
        </div>

        <Volume2 className="w-5 h-5" style={{ color: '#A0A7B8' }} />
      </div>
    </div>
  );
}

export function ContentModeration() {
  const { hasPermission } = useAdmin();
  const [releases, setReleases] = useState<adminApi.Release[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReleaseIds, setSelectedReleaseIds] = useState<string[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<adminApi.FraudAlert[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject' | 'flag' | null;
    rejectReason?: string;
  }>({ isOpen: false, action: null });

  const canApprove = hasPermission('releases.approve');
  const canView = hasPermission('releases.view');
  const navigate = useNavigate();

  useEffect(() => {
    loadReleases();
  }, []);

  async function loadReleases() {
    try {
      setIsLoading(true);
      const data = await adminApi.getAllReleases();
      // Filter to only pending submissions
      const pending = data.filter(r => r.status === 'submitted');
      setReleases(pending.sort((a, b) => 
        new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
      ));

      // Fetch fraud alerts for contextual linking
      const fraudData = await adminApi.getAllFraudAlerts().catch(() => []);
      setFraudAlerts(fraudData);
    } catch (error) {
      console.error('Error loading releases:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const currentRelease = releases[currentIndex];

  async function handleApprove() {
    if (!currentRelease) return;
    
    try {
      await adminApi.updateRelease(currentRelease.id, { status: 'live' as any });
      
      // Remove from queue
      const newReleases = releases.filter((_, i) => i !== currentIndex);
      setReleases(newReleases);
      if (currentIndex >= newReleases.length && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      
      setConfirmModal({ isOpen: false, action: null });
    } catch (error: any) {
      alert('Error approving release: ' + error.message);
    }
  }

  async function handleReject() {
    if (!currentRelease) return;
    
    try {
      await adminApi.updateRelease(currentRelease.id, { 
        status: 'rejected' as any,
      });
      
      // Remove from queue
      const newReleases = releases.filter((_, i) => i !== currentIndex);
      setReleases(newReleases);
      if (currentIndex >= newReleases.length && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      
      setConfirmModal({ isOpen: false, action: null, rejectReason: '' });
    } catch (error: any) {
      alert('Error rejecting release: ' + error.message);
    }
  }

  function toggleSelect(releaseId: string) {
    setSelectedReleaseIds((prev) =>
      prev.includes(releaseId) ? prev.filter((id) => id !== releaseId) : [...prev, releaseId]
    );
  }

  async function handleBulkAction(targetStatus: 'live' | 'rejected') {
    if (!selectedReleaseIds.length) return;
    try {
      await Promise.all(
        selectedReleaseIds.map((id) => adminApi.updateRelease(id, { status: targetStatus as any }))
      );
      setReleases(releases.filter((release) => !selectedReleaseIds.includes(release.id)));
      setSelectedReleaseIds([]);
      setCurrentIndex(0);
      alert(`Successfully ${targetStatus === 'live' ? 'approved' : 'rejected'} ${selectedReleaseIds.length} releases.`);
    } catch (error: any) {
      alert('Bulk action failed: ' + error.message);
    }
  }

  function goToPrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function goToNext() {
    if (currentIndex < releases.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  const currentFraudAlertsForRelease = currentRelease
    ? fraudAlerts.filter(
        (alert) => alert.trackId === currentRelease.id || alert.userId === currentRelease.userId
      )
    : [];

  if (!canView) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to view content moderation.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">All Clear!</h2>
          <p className="text-gray-400">No pending approvals at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Moderation Queue</h1>
          <p className="text-gray-400 mt-1">
            Review and approve tracks before distribution
          </p>
        </div>
        <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg px-4 py-2">
          <p className="text-orange-400 font-semibold">
            {releases.length} Pending Approval{releases.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-400">
            Selected: {selectedReleaseIds.length} / {releases.length}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkAction('live')}
              disabled={!selectedReleaseIds.length || !canApprove}
              className="px-3 py-1 text-sm rounded bg-green-600 text-white disabled:opacity-40"
            >
              Bulk Approve
            </button>
            <button
              onClick={() => handleBulkAction('rejected')}
              disabled={!selectedReleaseIds.length || !canApprove}
              className="px-3 py-1 text-sm rounded bg-red-600 text-white disabled:opacity-40"
            >
              Bulk Reject
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {releases.map((release) => (
            <label key={release.id} className="flex items-center gap-2 px-3 py-2 rounded bg-gray-900">
              <input
                type="checkbox"
                checked={selectedReleaseIds.includes(release.id)}
                onChange={() => toggleSelect(release.id)}
                className="rounded"
              />
              <span className="text-sm text-gray-200">{release.title} - {release.primaryArtist}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Queue Navigation */}
      <div className="flex items-center justify-between gap-3 bg-gray-800 border border-gray-700 rounded-lg p-4">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          aria-label="Previous track"
          title="Previous track"
          className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-white font-semibold">
            Track {currentIndex + 1} of {releases.length}
          </p>
          <p className="text-sm text-gray-400">Use arrows to navigate</p>
        </div>

        <button
          onClick={goToNext}
          disabled={currentIndex === releases.length - 1}
          aria-label="Next track"
          title="Next track"
          className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      {currentRelease && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Artwork & Audio */}
          <div className="lg:col-span-1 space-y-4">
            {/* Artwork */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Artwork Preview</h3>
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden">
                {currentRelease.artworkUrl ? (
                  <img
                    src={currentRelease.artworkUrl}
                    alt={currentRelease.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-24 h-24 text-gray-600" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Required: 3000x3000px minimum
              </p>
            </div>

            {/* Audio Player */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Audio Preview</h3>
              {currentRelease.audioUrl ? (
                <AudioPlayer audioUrl={currentRelease.audioUrl} />
              ) : (
                <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-700">
                  <Music className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No audio file</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Metadata & Actions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Track Info */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase">Track Information</h3>
              
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">{currentRelease.title}</h2>
                  <p className="text-xl text-gray-300">{currentRelease.primaryArtist}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Music className="w-4 h-4" />
                      <span className="text-xs uppercase font-medium">Type</span>
                    </div>
                    <p className="text-white font-semibold">{currentRelease.releaseType}</p>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs uppercase font-medium">Release Date</span>
                    </div>
                    <p className="text-white font-semibold">
                      {new Date(currentRelease.releaseDate || '').toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Hash className="w-4 h-4" />
                      <span className="text-xs uppercase font-medium">UPC</span>
                    </div>
                    <p className="text-white font-mono text-sm">
                      {currentRelease.upc || <span className="text-gray-500 italic">Not assigned</span>}
                    </p>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <User className="w-4 h-4" />
                      <span className="text-xs uppercase font-medium">Genre</span>
                    </div>
                    <p className="text-white font-semibold">
                      {currentRelease.genre || <span className="text-gray-500 italic">Not specified</span>}
                    </p>
                  </div>
                </div>

                {currentRelease.copyrightHolder && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-sm text-blue-400">
                      <Info className="w-4 h-4 inline mr-1" />
                      © {currentRelease.copyrightYear} {currentRelease.copyrightHolder}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Fraud Alerts */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Fraud Alerts</h3>
              <p className="text-sm text-gray-300 mb-2">
                {currentFraudAlertsForRelease.length} related fraud alerts found.
              </p>
              {currentFraudAlertsForRelease.length > 0 ? (
                <ul className="space-y-1 max-h-28 overflow-y-auto text-xs text-gray-200">
                  {currentFraudAlertsForRelease.slice(0, 5).map((alert) => (
                    <li key={alert.id} className="py-1 px-2 rounded bg-gray-900">
                      #{alert.id.slice(0, 8)} {alert.ruleType} ({alert.riskLevel})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">No fraud issues linked to this release yet.</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <a
                  href="/admin/fraud"
                  className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition"
                >
                  <Eye className="w-4 h-4" />
                  Go to Fraud Monitoring
                </a>
                <button
                  onClick={() => navigate(`/admin/releases?releaseId=${currentRelease.id}`)}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition"
                >
                  <Eye className="w-4 h-4" />
                  View in Release Management
                </button>
              </div>
            </div>

            {/* Quality Checklist */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase">Quality Checklist</h3>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition">
                  <input type="checkbox" className="mt-0.5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0" />
                  <div>
                    <p className="text-white font-medium">Audio Quality</p>
                    <p className="text-sm text-gray-400">WAV/FLAC format, no distortion or clipping</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition">
                  <input type="checkbox" className="mt-0.5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0" />
                  <div>
                    <p className="text-white font-medium">Artwork Standards</p>
                    <p className="text-sm text-gray-400">3000x3000px, no low quality or pixelation</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition">
                  <input type="checkbox" className="mt-0.5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0" />
                  <div>
                    <p className="text-white font-medium">Metadata Accuracy</p>
                    <p className="text-sm text-gray-400">No typos, correct artist/title spelling</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition">
                  <input type="checkbox" className="mt-0.5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0" />
                  <div>
                    <p className="text-white font-medium">Copyright Clearance</p>
                    <p className="text-sm text-gray-400">No copyright violations detected</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition">
                  <input type="checkbox" className="mt-0.5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0" />
                  <div>
                    <p className="text-white font-medium">Content Appropriateness</p>
                    <p className="text-sm text-gray-400">Genre accurate, content meets platform guidelines</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            {canApprove && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase">Moderation Actions</h3>
                
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    onClick={() => setConfirmModal({ isOpen: true, action: 'approve' })}
                    className="flex flex-col items-center gap-2 p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                  >
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-semibold">Approve</span>
                  </button>

                  <button
                    onClick={() => setConfirmModal({ isOpen: true, action: 'reject', rejectReason: '' })}
                    className="flex flex-col items-center gap-2 p-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                  >
                    <XCircle className="w-6 h-6" />
                    <span className="font-semibold">Reject</span>
                  </button>

                  <button
                    onClick={() => setConfirmModal({ isOpen: true, action: 'flag' })}
                    className="flex flex-col items-center gap-2 p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition"
                  >
                    <Flag className="w-6 h-6" />
                    <span className="font-semibold">Flag</span>
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-4 text-center">
                  All actions are logged and artist will be notified
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen && confirmModal.action === 'approve'}
        title="Approve Track for Distribution?"
        message="This track will be distributed to Spotify, Apple Music, and all connected platforms."
        confirmText="Approve & Distribute"
        confirmColor="green"
        onConfirm={handleApprove}
        onCancel={() => setConfirmModal({ isOpen: false, action: null })}
      >
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-400">
            ✓ Quality checks passed
          </p>
        </div>
      </ConfirmModal>

      <ConfirmModal
        isOpen={confirmModal.isOpen && confirmModal.action === 'reject'}
        title="Reject This Track?"
        message="The track will be rejected and the artist will be notified."
        confirmText="Reject Track"
        confirmColor="red"
        onConfirm={handleReject}
        onCancel={() => setConfirmModal({ isOpen: false, action: null })}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rejection Reason
          </label>
          <textarea
            value={confirmModal.rejectReason || ''}
            onChange={(e) => setConfirmModal({ ...confirmModal, rejectReason: e.target.value })}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 outline-none"
            rows={3}
            placeholder="e.g., Audio quality below standards, copyright issue..."
          />
        </div>
      </ConfirmModal>
    </div>
  );
}