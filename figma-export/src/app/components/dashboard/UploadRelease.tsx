import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import MusicPlatformLogos from './MusicPlatformLogos';
import { ChunkedUploader, formatDuration, validateArtworkFile, validateAudioFile } from '../../utils/chunked-uploader';
import { getAuthStorageSnapshot, getStoredAccessToken } from '../../utils/auth-session';
import * as userApi from '../../utils/user-api';
import { getArtistDisplayName } from '../../utils/artist-management';
import { getEffectiveDashboardMode } from '../../utils/dashboard-access';
import { getCurrentUserProfile } from '../../utils/user-api';
import { initializePaystackPayment, getReleaseFee } from '../../utils/payment-api';
import { PROMOTION_PLANS } from './PromotionDashboard';
import {
  Upload,
  Music,
  Image as ImageIcon,
  Check,
  X,
  FileAudio,
  Calendar,
  Globe,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CreditCard,
  Megaphone,
  Crown,
  Zap,
  ArrowRight,
} from 'lucide-react';

function getPlanDisplayName(tier: string): string {
  if (tier === 'partner') return 'Partner';
  if (tier === 'super_artist') return 'Super Artist';
  if (tier === 'artist') return 'Artist';
  return 'Free';
}

const steps = [
  { id: 1, name: 'Upload Files', icon: Upload },
  { id: 2, name: 'Release Info', icon: Music },
  { id: 3, name: 'Distribution', icon: Globe },
  { id: 4, name: 'Review', icon: Check },
  { id: 5, name: 'Payment', icon: CreditCard },
];

const platforms = [
  { id: 'spotify', name: 'Spotify', code: 'DSP-SPOT', short: 'SP', badgeClass: 'bg-[#1DB954] text-white', selected: true },
  { id: 'apple_music', name: 'Apple Music', code: 'DSP-APPL', short: 'AM', badgeClass: 'bg-black text-white border border-white/20', selected: true },
  { id: 'youtube_music', name: 'YouTube Music', code: 'DSP-YTMU', short: 'YT', badgeClass: 'bg-[#FF0033] text-white', selected: true },
  { id: 'amazon_music', name: 'Amazon Music', code: 'DSP-AMZN', short: 'AZ', badgeClass: 'bg-[#00A8E1] text-white', selected: true },
  { id: 'deezer', name: 'Deezer', code: 'DSP-DEEZ', short: 'DZ', badgeClass: 'bg-[#FF5D00] text-white', selected: true },
  { id: 'tidal', name: 'TIDAL', code: 'DSP-TIDL', short: 'TD', badgeClass: 'bg-black text-white border border-white/20', selected: true },
  { id: 'audiomack', name: 'Audiomack', code: 'DSP-AUMK', short: 'AU', badgeClass: 'bg-[#FFA200] text-black', selected: true },
  { id: 'boomplay', name: 'Boomplay', code: 'DSP-BOOM', short: 'BM', badgeClass: 'bg-[#18A64A] text-white', selected: true },
  { id: 'pandora', name: 'Pandora', code: 'DSP-PAND', short: 'PN', badgeClass: 'bg-[#3668FF] text-white', selected: false },
  { id: 'soundcloud', name: 'SoundCloud', code: 'DSP-SNDC', short: 'SC', badgeClass: 'bg-[#FF5500] text-white', selected: false },
  { id: 'tiktok', name: 'TikTok Music', code: 'DSP-TTIK', short: 'TK', badgeClass: 'bg-black text-white border border-white/20', selected: false },
  { id: 'instagram', name: 'Instagram/Facebook', code: 'DSP-META', short: 'IG', badgeClass: 'bg-[#E1306C] text-white', selected: false },
  { id: 'napster', name: 'Napster', code: 'DSP-NAPS', short: 'NP', badgeClass: 'bg-[#2E2E2E] text-white', selected: false },
  { id: 'kkbox', name: 'KKBOX', code: 'DSP-KKBX', short: 'KK', badgeClass: 'bg-[#00C300] text-white', selected: false },
  { id: 'anghami', name: 'Anghami', code: 'DSP-ANGH', short: 'AN', badgeClass: 'bg-[#7C4DFF] text-white', selected: false },
  { id: 'jiosaavn', name: 'JioSaavn', code: 'DSP-JSAV', short: 'JS', badgeClass: 'bg-[#2BC5B4] text-white', selected: false },
];

const defaultSelectedPlatforms = platforms.filter((platform) => platform.selected).map((platform) => platform.id);

interface TrackDraft {
  id?: string;
  title: string;
  version: string;
  trackNumber: number;
  discNumber: number;
  duration: number;
  isrc: string;
  isrcRequested: boolean;
  lyrics: string;
  explicitContent: boolean;
  producer: string;
  composer: string;
  audioFile: File | null;
  audioFileUrl: string;
  existingAudioPath: string;
  existingAudioName: string;
  uploadProgress: number;
}

interface UploadDiagnostic {
  target: string;
  stage: 'idle' | 'authorizing' | 'uploading' | 'finalizing' | 'completed' | 'failed';
  message: string;
  timestamp: string;
}

function extractStoragePathFromUrl(fileUrl: string, bucketName: string) {
  if (!fileUrl) {
    return '';
  }

  try {
    const parsedUrl = new URL(fileUrl);
    const signedPrefix = `/storage/v1/object/sign/${bucketName}/`;
    const publicPrefix = `/storage/v1/object/public/${bucketName}/`;
    const objectPrefix = `/storage/v1/object/${bucketName}/`;

    for (const prefix of [signedPrefix, publicPrefix, objectPrefix]) {
      if (parsedUrl.pathname.includes(prefix)) {
        const path = parsedUrl.pathname.split(prefix)[1] || '';
        return decodeURIComponent(path);
      }
    }
  } catch {
    return '';
  }

  return '';
}

function resolveUploadedPath(path: string, url: string, fileType: 'audio' | 'artwork') {
  if (path) {
    return path;
  }

  const bucketName = fileType === 'audio' ? 'make-79198001-audio' : 'make-79198001-artwork';
  return extractStoragePathFromUrl(url, bucketName);
}

function createEmptyTrack(index: number): TrackDraft {
  return {
    title: index === 0 ? '' : `Track ${index + 1}`,
    version: '',
    trackNumber: index + 1,
    discNumber: 1,
    duration: 180,
    isrc: '',
    isrcRequested: false,
    lyrics: '',
    explicitContent: false,
    producer: '',
    composer: '',
    audioFile: null,
    audioFileUrl: '',
    existingAudioPath: '',
    existingAudioName: '',
    uploadProgress: 0,
  };
}

export function UploadRelease() {
  const location = useLocation();
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const dashboardBasePath = isLabelDashboard ? '/label-dashboard' : '/dashboard';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const releaseId = searchParams.get('releaseId');
  const [currentUserProfile, setCurrentUserProfile] = useState<userApi.UserProfile | null>(null);
  const [labelArtists, setLabelArtists] = useState<userApi.UserProfile[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [userSubscriptionTier, setUserSubscriptionTier] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [trackDrafts, setTrackDrafts] = useState<TrackDraft[]>([createEmptyTrack(0)]);
  const [deletedTrackIds, setDeletedTrackIds] = useState<string[]>([]);
  const [existingArtworkPath, setExistingArtworkPath] = useState('');
  const [existingArtworkUrl, setExistingArtworkUrl] = useState('');
  const [initialPlatforms, setInitialPlatforms] = useState<string[]>(defaultSelectedPlatforms);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRelease, setIsLoadingRelease] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(defaultSelectedPlatforms);
  const [uploadDiagnostic, setUploadDiagnostic] = useState<UploadDiagnostic | null>(null);

  // Payment step state
  const [releaseFee, setReleaseFee] = useState<number | null>(null);
  const [activePlan, setActivePlan] = useState<string>('free');
  const [selectedPromoAddon, setSelectedPromoAddon] = useState<string | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [formData, setFormData] = useState({
    releaseType: 'single' as 'single' | 'ep' | 'album',
    releaseVersion: '',
    title: '',
    upc: '',
    upcRequested: false,
    artistName: '',
    genre: '',
    releaseDate: '',
    primaryArtist: '',
    featuring: '',
    language: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getAccessToken = () => {
    const token = getStoredAccessToken();
    if (!token) {
      const snapshot = getAuthStorageSnapshot();
      throw new Error(
        `Your session has expired. Sign in again to upload files. Session token: ${snapshot.hasSessionStorageToken ? 'present' : 'missing'}, persisted session: ${snapshot.hasPersistedSupabaseSession ? 'present' : 'missing'}.`
      );
    }

    return token;
  };

  const updateUploadDiagnostic = (target: string, stage: UploadDiagnostic['stage'], message: string) => {
    setUploadDiagnostic({
      target,
      stage,
      message,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  const uploadMediaFile = async (
    file: File,
    type: 'audio' | 'artwork',
    target: string,
    onProgress: (progress: number) => void,
  ) => {
    updateUploadDiagnostic(target, 'authorizing', 'Requesting secure upload permission...');

    const uploader = new ChunkedUploader(file, type, getAccessToken(), {
      onProgress: (progress) => {
        onProgress(progress.progress);

        if (progress.status === 'pending') {
          updateUploadDiagnostic(target, 'authorizing', 'Preparing upload session...');
        } else if (progress.status === 'uploading') {
          updateUploadDiagnostic(target, 'uploading', `Uploading to secure storage: ${progress.progress}% complete.`);
        } else if (progress.status === 'completed') {
          updateUploadDiagnostic(target, 'completed', 'Upload stored successfully.');
        } else if (progress.status === 'failed') {
          updateUploadDiagnostic(target, 'failed', progress.error || 'Upload failed.');
        }
      },
    });

    const result = await uploader.upload();
    updateUploadDiagnostic(target, 'finalizing', 'Finalizing uploaded file for release use...');
    updateUploadDiagnostic(target, 'completed', 'Upload complete and ready for release submission.');
    return result;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'cover', trackIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setSubmitError('');

      if (type === 'cover') {
        const validation = validateArtworkFile(file);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid artwork file.');
        }

        setCoverArt(file);
        setCoverUploadProgress(0);
        const result = await uploadMediaFile(file, 'artwork', 'Cover art', setCoverUploadProgress);
        setExistingArtworkPath(resolveUploadedPath(result.path, result.url, 'artwork'));
        setExistingArtworkUrl(result.url);
        setCoverUploadProgress(100);
        return;
      }

      if (typeof trackIndex === 'number') {
        const validation = validateAudioFile(file);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid audio file.');
        }

        updateTrackDraft(trackIndex, 'audioFile', file);
        updateTrackDraft(trackIndex, 'uploadProgress', 0);
        const result = await uploadMediaFile(
          file,
          'audio',
          `Track ${trackIndex + 1}`,
          (progress) => updateTrackDraft(trackIndex, 'uploadProgress', progress),
        );
        setTrackDrafts((prev) => prev.map((track, index) => (
          index === trackIndex
            ? {
                ...track,
                audioFile: file,
                audioFileUrl: result.url,
                existingAudioPath: resolveUploadedPath(result.path, result.url, 'audio'),
                existingAudioName: file.name,
                uploadProgress: 100,
              }
            : track
        )));
      }
    } catch (error: any) {
      updateUploadDiagnostic(
        type === 'cover' ? 'Cover art' : `Track ${(trackIndex ?? 0) + 1}`,
        'failed',
        error?.message || 'Failed to upload file.',
      );

      // Only reset progress/state if the file was never stored.
      // If a path was saved (partial success), keep the file reference so the
      // user sees the failure rather than the UI silently clearing everything.
      const uploadWasStored = Boolean(
        type === 'cover'
          ? existingArtworkPath || existingArtworkUrl
          : typeof trackIndex === 'number' && trackDrafts[trackIndex]?.existingAudioPath,
      );

      if (!uploadWasStored) {
        if (type === 'cover') {
          setCoverUploadProgress(0);
          setCoverArt(null);
        }

        if (typeof trackIndex === 'number') {
          setTrackDrafts((prev) => prev.map((track, index) => (
            index === trackIndex ? { ...track, audioFile: null, uploadProgress: 0 } : track
          )));
        }
      }

      setSubmitError(error?.message || 'Failed to upload file.');
    }
  };

  const updateTrackDraft = <K extends keyof TrackDraft>(index: number, field: K, value: TrackDraft[K]) => {
    setTrackDrafts((prev) => prev.map((track, trackIndex) => {
      if (trackIndex !== index) {
        return track;
      }

      if (field === 'isrcRequested') {
        return {
          ...track,
          isrcRequested: Boolean(value),
          isrc: value ? '' : track.isrc,
        };
      }

      if (field === 'isrc') {
        const nextIsrc = String(value);
        return {
          ...track,
          isrc: nextIsrc,
          isrcRequested: nextIsrc.trim() ? false : track.isrcRequested,
        };
      }

      return { ...track, [field]: value };
    }));
  };

  const addTrackDraft = () => {
    setTrackDrafts((prev) => [...prev, createEmptyTrack(prev.length)]);
  };

  const moveTrackDraft = (index: number, direction: 'up' | 'down') => {
    setTrackDrafts((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const [movedTrack] = next.splice(index, 1);
      next.splice(targetIndex, 0, movedTrack);

      return next.map((track, trackIndex) => ({
        ...track,
        trackNumber: trackIndex + 1,
      }));
    });
  };

  const removeTrackDraft = (index: number) => {
    setTrackDrafts((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      const trackToRemove = prev[index];
      if (trackToRemove?.id) {
        setDeletedTrackIds((current) => [...current, trackToRemove.id!]);
      }

      return prev.filter((_, trackIndex) => trackIndex !== index);
    });
  };

  const languageCodeMap: Record<string, string> = {
    english: 'eng',
    yoruba: 'yor',
    igbo: 'ibo',
    hausa: 'hau',
    pidgin: 'eng',
  };

  const genreLabelMap: Record<string, string> = {
    afrobeats: 'Afrobeats',
    pop: 'Pop',
    'hip-hop': 'Hip-Hop/Rap',
    rnb: 'R&B/Soul',
    electronic: 'Electronic',
    rock: 'Alternative',
    jazz: 'Jazz',
    gospel: 'Gospel',
  };

  const reverseLanguageCodeMap: Record<string, string> = {
    eng: 'english',
    yor: 'yoruba',
    ibo: 'igbo',
    hau: 'hausa',
  };

  const reverseGenreLabelMap: Record<string, string> = {
    afrobeats: 'afrobeats',
    pop: 'pop',
    'hip-hop/rap': 'hip-hop',
    'r&b/soul': 'rnb',
    electronic: 'electronic',
    alternative: 'rock',
    rock: 'rock',
    jazz: 'jazz',
    gospel: 'gospel',
  };

  const normalizedArtworkPath = resolveUploadedPath(existingArtworkPath, existingArtworkUrl, 'artwork');
  const hasAudioSource = trackDrafts.length > 0 && trackDrafts.every((track) => resolveUploadedPath(track.existingAudioPath, track.audioFileUrl, 'audio'));
  const hasArtworkSource = Boolean(normalizedArtworkPath);
  const isEditMode = Boolean(releaseId);

  // Per-step readiness — determines whether the "Next" button is enabled
  const step1Ready = hasAudioSource && hasArtworkSource;
  const step2Ready = Boolean(
    formData.title.trim() &&
    formData.primaryArtist.trim() &&
    formData.genre &&
    formData.releaseDate &&
    trackDrafts.every((t) => t.title.trim() && t.duration >= 30)
  );
  const step3Ready = selectedPlatforms.length > 0;
  // step 4 (Review) → always ready to proceed (enterPaymentStep has its own loading guard)
  const effectiveDashboardMode = getEffectiveDashboardMode(currentUserProfile ?? {});
  const isLabelUser = isLabelDashboard || effectiveDashboardMode === 'label';
  const isArtistUser = !isLabelUser && effectiveDashboardMode === 'artist';
  const labelArtistOptions = useMemo(() => labelArtists.map((artist) => ({
    id: artist.id,
    name: getArtistDisplayName(artist),
  })), [labelArtists]);
  const hasMatchingPrimaryArtistOption = useMemo(
    () => labelArtistOptions.some((artist) => artist.name === formData.primaryArtist),
    [formData.primaryArtist, labelArtistOptions],
  );
  const platformSelectionChanged = useMemo(() => {
    if (initialPlatforms.length !== selectedPlatforms.length) {
      return true;
    }

    const initialSet = new Set(initialPlatforms);
    return selectedPlatforms.some((platform) => !initialSet.has(platform));
  }, [initialPlatforms, selectedPlatforms]);

  useEffect(() => {
    if (trackDrafts.length === 0) {
      setTrackDrafts([createEmptyTrack(0)]);
    }
  }, [trackDrafts]);

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUserProfile() {
      try {
        const profile = await userApi.getCurrentUserProfile();
        if (!mounted) {
          return;
        }

        setCurrentUserProfile(profile);
        setUserSubscriptionTier(profile.subscriptionTier || 'free');

        const effectiveMode = getEffectiveDashboardMode(profile);

        if (effectiveMode === 'artist') {
          const lockedArtistName = profile.artistName || [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
          if (lockedArtistName) {
            setFormData((current) => ({
              ...current,
              artistName: current.artistName || profile.labelName || lockedArtistName,
              primaryArtist: current.primaryArtist || lockedArtistName,
            }));
          }
          return;
        }

        if (effectiveMode === 'label') {
          const managedArtists = await userApi.getLabelArtists().catch(() => []);
          if (!mounted) {
            return;
          }

          setLabelArtists(managedArtists);
          const defaultPrimaryArtist = managedArtists[0] ? getArtistDisplayName(managedArtists[0]) : '';
          setFormData((current) => ({
            ...current,
            artistName: current.artistName || profile.labelName || profile.artistName || profile.username || 'Label',
            primaryArtist: releaseId ? current.primaryArtist : (current.primaryArtist || defaultPrimaryArtist),
          }));
        }
      } catch {
        if (mounted) {
          setCurrentUserProfile(null);
          setLabelArtists([]);
          setUserSubscriptionTier('free');
        }
      } finally {
        if (mounted) setIsLoadingProfile(false);
      }
    }

    loadCurrentUserProfile();

    return () => {
      mounted = false;
    };
  }, [releaseId]);

  useEffect(() => {
    let mounted = true;

    async function loadReleaseForEdit() {
      if (!releaseId) {
        return;
      }

      try {
        setIsLoadingRelease(true);
        setSubmitError('');

        const { release, tracks } = await userApi.getReleaseById(releaseId);

        if (!mounted) {
          return;
        }

        setFormData({
          releaseType: release.type || 'single',
          releaseVersion: release.version || '',
          title: release.title || '',
          upc: release.upc || '',
          upcRequested: Boolean(release.upcRequested && !release.upc),
          artistName: release.label || release.primaryArtist || '',
          genre: reverseGenreLabelMap[(tracks[0]?.genre || release.genre || '').toLowerCase()] || '',
          releaseDate: release.releaseDate || '',
          primaryArtist: release.primaryArtist || '',
          featuring: release.featuredArtists?.join(', ') || '',
          language: reverseLanguageCodeMap[(tracks[0]?.language || release.language || '').toLowerCase()] || '',
        });
        setSelectedPlatforms(release.selectedPlatforms?.length ? release.selectedPlatforms : defaultSelectedPlatforms);
        setInitialPlatforms(release.selectedPlatforms?.length ? release.selectedPlatforms : defaultSelectedPlatforms);
        setDeletedTrackIds([]);
        setTrackDrafts(
          tracks.length > 0
            ? [...tracks]
                .sort((left, right) => (left.discNumber - right.discNumber) || (left.trackNumber - right.trackNumber))
                .map((track, index) => ({
                id: track.id,
                title: track.title,
                version: track.version || '',
                trackNumber: track.trackNumber || index + 1,
                discNumber: track.discNumber || 1,
                duration: track.duration || 180,
                isrc: track.isrc || '',
                isrcRequested: Boolean(track.isrcRequested && !track.isrc),
                lyrics: track.lyrics || '',
                explicitContent: track.explicit,
                producer: track.contributors.find((contributor) => contributor.role === 'producer')?.name || '',
                composer: track.contributors.find((contributor) => contributor.role === 'composer')?.name || '',
                audioFile: null,
                audioFileUrl: track.audioFileUrl || '',
                existingAudioPath: track.audioFilePath || '',
                existingAudioName: track.audioFilePath.split('/').pop() || track.audioFilePath || '',
                uploadProgress: track.audioFilePath ? 100 : 0,
              }))
            : [createEmptyTrack(0)]
        );
        setExistingArtworkPath(release.artworkPath || '');
        setExistingArtworkUrl(release.artworkUrl || release.artworkPath || '');
        setCoverUploadProgress(release.artworkPath || release.artworkUrl ? 100 : 0);
      } catch (error: any) {
        if (mounted) {
          setSubmitError(error?.message || 'Failed to load release for editing.');
        }
      } finally {
        if (mounted) {
          setIsLoadingRelease(false);
        }
      }
    }

    loadReleaseForEdit();

    return () => {
      mounted = false;
    };
  }, [releaseId]);

  async function enterPaymentStep() {
    setSubmitError('');
    setPaymentError('');
    setIsLoadingFee(true);
    try {
      const { fee, activePlan: plan } = await getReleaseFee();
      setReleaseFee(fee);
      setActivePlan(plan);
      const profile = await getCurrentUserProfile().catch(() => null);
      if (profile?.email) {
        setPaymentEmail((current) => current || profile.email);
      }
    } catch {
      setReleaseFee(5000);
      setActivePlan('free');
    } finally {
      setIsLoadingFee(false);
    }
    setCurrentStep(5);
  }

  const selectedPromoAddonPlan = PROMOTION_PLANS.find((p) => p.id === selectedPromoAddon) || null;
  const totalPaymentAmount = (releaseFee ?? 0) + (selectedPromoAddonPlan?.price ?? 0);

  async function handlePayAndSubmit() {
    setPaymentError('');

    if (!paymentEmail.trim()) {
      setPaymentError('Email address is required.');
      return;
    }

    // If total is 0 (paid plan, no promo addon), submit directly without Paystack.
    if (totalPaymentAmount <= 0) {
      await handleSubmitRelease();
      return;
    }

    setIsProcessingPayment(true);
    try {
      const callbackPath = isLabelDashboard ? '/label-dashboard/payment/callback' : '/dashboard/payment/callback';
      // Store the pending release payload in sessionStorage so the callback can submit it.
      const pendingPayload = {
        formData,
        trackDrafts,
        deletedTrackIds,
        existingArtworkPath,
        existingArtworkUrl,
        selectedPlatforms,
        releaseId: releaseId ?? null,
        isEditMode,
        promotionAddonPlanId: selectedPromoAddon,
      };
      sessionStorage.setItem('pending_release_payload', JSON.stringify(pendingPayload));

      const callbackUrl = `${window.location.origin}${callbackPath}?pendingRelease=1`;

      const result = await initializePaystackPayment({
        email: paymentEmail.trim(),
        plan: 'release',
        billingPeriod: 'monthly',
        callbackUrl,
        releaseId: releaseId ?? undefined,
        promotionAddonPlanId: selectedPromoAddon ?? undefined,
        promotionAddonAmount: selectedPromoAddonPlan?.price,
      });

      if ((result as any).freePass) {
        // Backend said no payment needed – submit directly.
        sessionStorage.removeItem('pending_release_payload');
        await handleSubmitRelease();
        return;
      }

      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to start payment.');
      setIsProcessingPayment(false);
    }
  }

  async function handleSubmitRelease() {
    // (Called from within Payment step after successful free-pass or as post-payment callback trigger)
    if (!hasAudioSource || !hasArtworkSource) {
      setSubmitError('Upload cover art and an audio file for every track before submitting.');
      return;
    }

    if (
      !formData.title ||
      !formData.primaryArtist ||
      !formData.genre ||
      !formData.releaseDate ||
      trackDrafts.some((track) => !track.title || track.duration < 30 || track.trackNumber < 1 || track.discNumber < 1)
    ) {
      setSubmitError('Complete the required release information before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const year = new Date().getFullYear();
      const normalizedLanguage = languageCodeMap[formData.language] || 'eng';
      const normalizedGenre = genreLabelMap[formData.genre] || 'Afrobeats';
      const normalizedTrackDrafts = trackDrafts.map((track) => ({
        ...track,
        existingAudioPath: resolveUploadedPath(track.existingAudioPath, track.audioFileUrl, 'audio'),
      }));
      const firstTrack = normalizedTrackDrafts[0];
      const previewUrl = firstTrack?.audioFileUrl || '';

      if (normalizedTrackDrafts.some((track) => !track.existingAudioPath)) {
        setSubmitError('Track upload finished without a saved storage path. Re-upload the affected track before submitting.');
        setIsSubmitting(false);
        return;
      }

      const releasePayload = {
        userId: sessionStorage.getItem('user_id') || 'current-user',
        title: formData.title,
        upc: formData.upc.trim() || undefined,
        upcRequested: formData.upcRequested,
        type: formData.releaseType,
        version: formData.releaseVersion || undefined,
        artworkPath: normalizedArtworkPath,
        artworkUrl: existingArtworkUrl,
        primaryArtist: formData.primaryArtist,
        featuredArtists: formData.featuring
          ? formData.featuring.split(',').map((name) => name.trim()).filter(Boolean)
          : [],
        label: (isLabelDashboard ? (currentUserProfile?.labelName || formData.artistName) : formData.artistName) || formData.primaryArtist,
        releaseDate: formData.releaseDate,
        originalReleaseDate: formData.releaseDate,
        genre: normalizedGenre,
        copyrightYear: year,
        copyrightText: `© ${year} ${formData.primaryArtist}`,
        publishingRights: `℗ ${year} ${formData.primaryArtist}`,
        language: normalizedLanguage,
        audioPreviewUrl: previewUrl,
        audioFileName: firstTrack?.audioFile?.name || firstTrack?.existingAudioName || '',
        selectedPlatforms,
      };

      let activeReleaseId = releaseId;

      if (releaseId) {
        await userApi.updateRelease(releaseId, releasePayload);

        for (const deletedTrackId of deletedTrackIds) {
          await userApi.deleteReleaseTrack(deletedTrackId);
        }

        const nextTrackDrafts = [...normalizedTrackDrafts];
        for (let index = 0; index < nextTrackDrafts.length; index += 1) {
          const track = nextTrackDrafts[index];
          const trackPayload = {
            title: track.title,
            version: track.version || undefined,
            trackNumber: track.trackNumber,
            discNumber: track.discNumber,
            duration: track.duration,
            isrc: track.isrc || undefined,
            isrcRequested: track.isrcRequested,
            language: normalizedLanguage,
            explicit: track.explicitContent,
            genre: normalizedGenre,
            contributors: [
              {
                id: crypto.randomUUID(),
                name: formData.primaryArtist,
                role: 'primary_artist' as const,
              },
              ...(track.producer
                ? [{ id: crypto.randomUUID(), name: track.producer, role: 'producer' as const }]
                : []),
              ...(track.composer
                ? [{ id: crypto.randomUUID(), name: track.composer, role: 'composer' as const }]
                : []),
            ],
            lyrics: track.lyrics || undefined,
            audioFilePath: track.existingAudioPath,
            audioFileUrl: track.audioFileUrl,
            previewStart: 0,
          };

          if (track.id) {
            await userApi.updateReleaseTrack(track.id, trackPayload);
          } else {
            const newTrack = await userApi.createReleaseTrack(releaseId, trackPayload);
            nextTrackDrafts[index] = {
              ...track,
              id: newTrack.id,
              audioFileUrl: newTrack.audioFileUrl,
              existingAudioPath: newTrack.audioFilePath,
              existingAudioName: newTrack.audioFilePath,
            };
          }
        }

        const orderedTrackIds = nextTrackDrafts.map((track) => track.id).filter(Boolean) as string[];

        setTrackDrafts(nextTrackDrafts);
        setDeletedTrackIds([]);
        await userApi.updateRelease(releaseId, {
          trackIds: orderedTrackIds,
          audioPreviewUrl: nextTrackDrafts[0]?.audioFileUrl || '',
          audioFileName: nextTrackDrafts[0]?.existingAudioName || '',
        });
      } else {
        const release = await userApi.createRelease({
          ...releasePayload,
          trackIds: [],
        });
        activeReleaseId = release.id;

        const nextTrackDrafts = [...normalizedTrackDrafts];
        for (let index = 0; index < nextTrackDrafts.length; index += 1) {
          const track = nextTrackDrafts[index];
          const newTrack = await userApi.createReleaseTrack(release.id, {
            title: track.title,
            version: track.version || undefined,
            trackNumber: track.trackNumber,
            discNumber: track.discNumber,
            duration: track.duration,
            isrc: track.isrc || undefined,
            isrcRequested: track.isrcRequested,
            language: normalizedLanguage,
            explicit: track.explicitContent,
            genre: normalizedGenre,
            contributors: [
              {
                id: crypto.randomUUID(),
                name: formData.primaryArtist,
                role: 'primary_artist' as const,
              },
              ...(track.producer
                ? [{ id: crypto.randomUUID(), name: track.producer, role: 'producer' as const }]
                : []),
              ...(track.composer
                ? [{ id: crypto.randomUUID(), name: track.composer, role: 'composer' as const }]
                : []),
            ],
            lyrics: track.lyrics || undefined,
            audioFilePath: track.existingAudioPath,
            audioFileUrl: track.audioFileUrl || previewUrl,
            previewStart: 0,
          });

          nextTrackDrafts[index] = {
            ...track,
            id: newTrack.id,
            audioFileUrl: newTrack.audioFileUrl,
            existingAudioPath: newTrack.audioFilePath,
            existingAudioName: newTrack.audioFilePath,
          };
        }

        const orderedTrackIds = nextTrackDrafts.map((track) => track.id).filter(Boolean) as string[];

        setTrackDrafts(nextTrackDrafts);
        setDeletedTrackIds([]);

        await userApi.updateRelease(release.id, {
          trackIds: orderedTrackIds,
          selectedPlatforms,
          audioPreviewUrl: nextTrackDrafts[0]?.audioFileUrl || previewUrl,
          audioFileName: nextTrackDrafts[0]?.existingAudioName || '',
        });
      }

      if (activeReleaseId && selectedPlatforms.length > 0 && (!isEditMode || platformSelectionChanged)) {
        await userApi.distributeRelease(activeReleaseId, selectedPlatforms);
      }

      navigate(`${dashboardBasePath}/catalog`);
    } catch (error: any) {
      setSubmitError(error?.message || `Failed to ${isEditMode ? 'update' : 'submit'} release.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Subscription gate for free-plan users ── */}
        {!isLoadingProfile && userSubscriptionTier === 'free' && (
          <div className={`rounded-2xl border-2 p-12 mb-8 ${isLabelDashboard ? 'border-[#FF6B00]/30 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]' : 'border-[#FF6B00]/30 bg-gradient-to-br from-orange-50 to-white'}`}>
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8C00] flex items-center justify-center shadow-lg">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className={`text-3xl font-bold mb-3 ${isLabelDashboard ? 'text-white' : 'text-white'}`}>
                  Unlock Music Distribution
                </h3>
                <p className={`text-base max-w-md mx-auto leading-relaxed ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>
                  Upgrade to a paid plan to start uploading and distributing your music to 150+ platforms worldwide. Get started in minutes with our simple distribution process.
                </p>
              </div>

              {/* Plan cards - Partner only */}
              <div className="flex justify-center w-full mt-8">
                {[
                  { id: 'partner', name: 'Partner', price: '₦40,000', period: 'per month', icon: <ArrowRight className="w-6 h-6" />, description: '5 releases + 5 artists per month included • Full platform access' },
                ].map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => navigate(`${dashboardBasePath}/subscription`)}
                    className={`relative rounded-2xl p-8 text-left border-2 transition-all hover:scale-105 duration-300 hover:shadow-2xl w-full max-w-sm ${isLabelDashboard ? 'border-[#FF6B00] bg-gradient-to-br from-[#FF6B00]/20 to-[#FF6B00]/5' : 'border-[#FF6B00] bg-gradient-to-br from-[#FF6B00]/10 to-[#FF6B00]/5'}`}
                  >
                    <div className="text-[#FF6B00] mb-3">{plan.icon}</div>
                    <div className={`font-bold text-xl mb-1 ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{plan.name}</div>
                    <div className="text-[#FF6B00] font-bold text-2xl">{plan.price} <span className={`font-normal text-base ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>/{plan.period}</span></div>
                    <p className={`text-sm mt-2 leading-relaxed ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>{plan.description}</p>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate(`${dashboardBasePath}/subscription`)}
                className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
              >
                Subscribe Now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Prevent upload form rendering for free users */}
        {(!isLoadingProfile && userSubscriptionTier !== 'free') && (<>
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className={`text-4xl font-bold mb-1 text-[#FF6B00]`}>{isEditMode ? 'Edit Release' : 'Upload New Release'}</h2>
              <p className={`text-base ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>
                {isEditMode
                  ? 'Update your release metadata, files, and distribution settings.'
                  : 'Distribute your music to 150+ platforms worldwide. Follow these simple steps to get started'}
              </p>
            </div>
            {currentStep > 1 && (
              <div className={`text-right px-4 py-2 rounded-lg ${'bg-[#FF6B00]/10 text-[#FF6B00]'}`}>
                <div className="text-sm font-semibold">Step {currentStep} of {steps.length}</div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-semibold flex-shrink-0 ${
                        isCompleted
                          ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-500/30'
                          : isActive
                          ? isLabelDashboard
                            ? 'bg-gradient-to-br from-[#FF6B00] to-[#FF8C00] border-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30'
                            : 'bg-gradient-to-br from-[#FF6B00] to-[#FF8C00] border-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30'
                          : isLabelDashboard
                            ? 'bg-[#161616] border-[#FF6B00]/20 text-[#666]'
                            : 'bg-[#161616]/5 border-[#FF6B00]/20 text-[#B3B3B3]'
                      }`}
                    >
                      {isCompleted ? <Check className="w-7 h-7" /> : <Icon className="w-7 h-7" />}
                    </div>
                    <div className="mt-3 text-center min-w-max">
                      <div
                        className={`text-xs font-bold uppercase tracking-wide ${
                          isActive || isCompleted
                            ? 'text-[#FF6B00]'
                            : isLabelDashboard ? 'text-[#666]' : 'text-[#B3B3B3]'
                        }`}
                      >
                        {step.name}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-3 rounded-full transition-all duration-300 ${
                        currentStep > step.id 
                          ? isLabelDashboard 
                            ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C00]' 
                            : 'bg-gradient-to-r from-purple-600 to-purple-500'
                          : isLabelDashboard 
                          ? 'bg-[#FF6B00]/10'
                          : 'bg-[#161616]/10'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className={`${isLabelDashboard ? 'border-[#FF6B00]/20 bg-gradient-to-br from-[#161616] to-[#0f0f0f] p-10 text-white shadow-2xl' : 'p-10 shadow-lg border border-[#FF6B00]/20'}`}>
          {isLoadingRelease && (
            <Card className="mb-6 border-[#FF6B00]/20 bg-[#FF6B00]/5 p-4 text-[#8A4B00]">
              Loading release details...
            </Card>
          )}

          {submitError && (
            <Card className={isLabelDashboard ? 'mb-6 border-red-500/30 bg-red-500/10 p-4 text-red-200' : 'mb-6 border-red-200 bg-red-50 p-4 text-red-700'}>
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{submitError}</p>
              </div>
            </Card>
          )}

          {uploadDiagnostic && currentStep === 1 && (
            <Card className={`mb-6 p-4 ${uploadDiagnostic.stage === 'failed'
              ? isLabelDashboard ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800'
              : isLabelDashboard ? 'border-blue-500/30 bg-blue-500/10 text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    {uploadDiagnostic.target} · {uploadDiagnostic.stage.charAt(0).toUpperCase() + uploadDiagnostic.stage.slice(1)}
                  </p>
                  <p>{uploadDiagnostic.message}</p>
                  <p className="text-xs opacity-80">Updated at {uploadDiagnostic.timestamp}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Step 1: Upload Files */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex-1">
                    <h3 className={`text-2xl font-bold mb-2 text-[#FF6B00]`}>Upload Track Files</h3>
                    <p className={`text-base ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Add high-quality audio files (WAV, FLAC) for each track in your release.</p>
                  </div>
                  {formData.releaseType !== 'single' && (
                    <Button onClick={addTrackDraft} className={`whitespace-nowrap ${'bg-[#FF6B00] text-white hover:bg-[#FF8C00]'}`}>
                      <Plus className="mr-2 h-5 w-5" />
                      Add Track
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-5">{trackDrafts.map((track, index) => (
                  <Card key={track.id || `track-${index}`} className={`transition-all ${'border-[#FF6B00]/15 bg-[#0A0A0A]/40 p-6 text-white'}`}>
                    <div className="mb-6 flex items-center justify-between gap-3">
                      <div>
                        <h4 className={`font-bold text-lg ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Track {track.trackNumber}</h4>
                        <p className={`text-sm ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>{track.title || 'Untitled track'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => moveTrackDraft(index, 'up')} disabled={index === 0} className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#161616]' : 'hover:bg-[#161616]/5'}>
                          <ChevronUp className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => moveTrackDraft(index, 'down')} disabled={index === trackDrafts.length - 1} className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#161616]' : 'hover:bg-[#161616]/5'}>
                          <ChevronDown className="h-5 w-5" />
                        </Button>
                        {trackDrafts.length > 1 && (
                          <Button variant="outline" size="sm" onClick={() => removeTrackDraft(index)} className={'border-red-500/20 bg-transparent text-red-400 hover:bg-red-500/10'}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className={`rounded-xl border-2 border-dashed transition-all p-8 text-center ${'border-[#FF6B00]/20 bg-[#161616]/50 hover:border-[#FF6B00]/50 hover:bg-[#161616]/80'}`}>
                      {track.audioFile ? (
                        <div className="space-y-4">
                          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                            <FileAudio className="w-10 h-10 text-white" />
                          </div>
                          <div>
                            <p className={`font-semibold text-lg ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{track.audioFile.name}</p>
                            <p className={`text-sm mt-1 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>{(track.audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                          <div className="max-w-xs mx-auto">
                            <Progress value={track.uploadProgress} className="mb-2 h-2" />
                            <p className={`text-sm font-medium ${'text-[#FF6B00]'}`}>Uploaded {track.uploadProgress}%</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => updateTrackDraft(index, 'audioFile', null)} className={'border-red-500/20 bg-transparent text-red-400 hover:bg-red-500/10'}>
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      ) : track.existingAudioName ? (
                        <div className="space-y-4">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                            <FileAudio className="w-10 h-10 text-white" />
                          </div>
                          <div>
                            <p className={`font-semibold text-lg ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{track.existingAudioName}</p>
                            <p className={`text-sm mt-1 font-medium ${isLabelDashboard ? 'text-[#FF6B00]' : 'text-green-600'}`}>✓ Ready for delivery</p>
                          </div>
                          <label htmlFor={`audio-upload-${index}`}>
                            <Button variant="outline" asChild className={'border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10'}>
                              <span>Replace Audio File</span>
                            </Button>
                          </label>
                          <input
                            id={`audio-upload-${index}`}
                            type="file"
                            accept=".wav,.flac"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'audio', index)}
                          />
                        </div>
                      ) : (
                        <>
                          <Upload className={`w-16 h-16 mx-auto mb-4 ${'text-[#FF6B00]/40'}`} />
                          <p className={`mb-1 font-semibold text-lg ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Upload audio for track {index + 1}</p>
                          <p className={`text-base mb-6 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Drag & drop or click to browse. WAV and FLAC formats supported.</p>
                          <label htmlFor={`audio-upload-${index}`}>
                            <Button className={`${'bg-[#FF6B00] text-white hover:bg-[#FF8C00]'}`} asChild>
                              <span>Choose File</span>
                            </Button>
                          </label>
                          <input
                            id={`audio-upload-${index}`}
                            type="file"
                            accept=".wav,.flac"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'audio', index)}
                          />
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-8">
                <h3 className={`text-2xl font-bold mb-2 text-[#FF6B00]`}>Release Artwork</h3>
                <p className={`text-base mb-6 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Upload professional cover art. Minimum 3000x3000 pixels (JPG, PNG, or WebP).</p>
                <div className={`rounded-xl border-2 border-dashed transition-all p-8 text-center ${'border-[#FF6B00]/20 bg-[#161616]/50 hover:border-[#FF6B00]/50 hover:bg-[#161616]/80'}`}>
                  {coverArt ? (
                    <div className="space-y-4">
                      <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden shadow-lg">
                        <img
                          src={URL.createObjectURL(coverArt)}
                          alt="Cover art preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className={`font-semibold text-lg ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{coverArt.name}</p>
                      </div>
                      <div className="max-w-xs mx-auto">
                        <Progress value={coverUploadProgress} className="mb-2 h-2" />
                        <p className={`text-sm font-medium ${'text-[#FF6B00]'}`}>Uploaded {coverUploadProgress}%</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCoverArt(null)}
                        className={'border-red-500/20 bg-transparent text-red-400 hover:bg-red-500/10'}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : existingArtworkUrl ? (
                    <div className="space-y-4">
                      <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden shadow-lg">
                        <img
                          src={existingArtworkUrl}
                          alt="Current cover art"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className={`font-semibold text-lg ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Current Cover Art</p>
                        <p className={`text-sm mt-1 font-medium ${isLabelDashboard ? 'text-[#FF6B00]' : 'text-green-600'}`}>✓ Ready for release</p>
                      </div>
                      <label htmlFor="cover-upload">
                        <Button variant="outline" asChild className={'border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10'}>
                          <span>Replace Cover Art</span>
                        </Button>
                      </label>
                      <input
                        id="cover-upload"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'cover')}
                      />
                    </div>
                  ) : (
                    <>
                      <ImageIcon className={`w-16 h-16 mx-auto mb-4 ${'text-[#FF6B00]/40'}`} />
                      <p className={`mb-1 font-semibold text-lg ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Drag & drop your cover art here</p>
                      <p className={`text-base mb-6 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Minimum 3000x3000px. JPEG, PNG, or WebP formats supported.</p>
                      <label htmlFor="cover-upload">
                        <Button className={`${'bg-[#FF6B00] text-white hover:bg-[#FF8C00]'}`} asChild>
                          <span>Choose Image</span>
                        </Button>
                      </label>
                      <input
                        id="cover-upload"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'cover')}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Release Info */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h3 className={`text-2xl font-bold mb-2 text-[#FF6B00]`}>Release Information</h3>
                <p className={`text-base ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Provide details about your release for proper metadata and distribution.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <Label htmlFor="releaseType" className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Release Type *</Label>
                  <select
                    id="releaseType"
                    name="releaseType"
                    aria-label="Release type"
                    title="Release type"
                    value={formData.releaseType}
                    onChange={handleInputChange}
                    className={`w-full mt-3 px-4 py-3 rounded-lg font-medium transition-all ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                  >
                    <option value="single">Single</option>
                    <option value="ep">EP</option>
                    <option value="album">Album</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="title" className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Release Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Enter release title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                    style={{}}
                  />
                </div>

                <div>
                  <Label htmlFor="releaseVersion" className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Release Version</Label>
                  <Input
                    id="releaseVersion"
                    name="releaseVersion"
                    placeholder="Deluxe, Radio Edit, Acoustic"
                    value={formData.releaseVersion}
                    onChange={handleInputChange}
                    className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                    style={{}}
                  />
                </div>

                <div>
                  <Label htmlFor="artistName" className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Primary Artist *</Label>
                  {isLabelUser ? (
                    <>
                      <select
                        id="primaryArtist"
                        name="primaryArtist"
                        aria-label="Primary artist"
                        value={formData.primaryArtist}
                        onChange={handleInputChange}
                        className={`mt-3 w-full rounded-lg px-4 py-3 font-medium transition-all ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                        disabled={labelArtistOptions.length === 0}
                      >
                        {labelArtistOptions.length === 0 ? (
                          <option value="">Create an artist first</option>
                        ) : null}
                        {formData.primaryArtist && !hasMatchingPrimaryArtistOption ? (
                          <option value={formData.primaryArtist}>{formData.primaryArtist}</option>
                        ) : null}
                        {labelArtistOptions.map((artist) => (
                          <option key={artist.id} value={artist.name}>{artist.name}</option>
                        ))}
                      </select>
                      {labelArtistOptions.length === 0 ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#B3B3B3]">
                          <span>Create the artist profile first before uploading a release.</span>
                          <Button type="button" size="sm" variant="outline" onClick={() => navigate('/label-dashboard/artists/new')} className="border-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#FF6B00]/10">
                            Create Artist
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-[#B3B3B3]">Select from your managed artist roster.</p>
                      )}
                    </>
                  ) : (
                    <Input
                      id="primaryArtist"
                      name="primaryArtist"
                      placeholder="Primary artist name"
                      value={formData.primaryArtist}
                      onChange={handleInputChange}
                      className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                      style={{}}
                      disabled={isArtistUser}
                    />
                  )}
                  {isArtistUser && (
                    <p className="mt-2 text-sm text-[#B3B3B3]">Primary artist is locked to your account.</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="featuring" className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Featuring Artists</Label>
                  <Input
                    id="featuring"
                    name="featuring"
                    placeholder="Separate with commas"
                    value={formData.featuring}
                    onChange={handleInputChange}
                    className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                    style={{}}
                  />
                </div>

                <div>
                  <Label htmlFor="genre" className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Genre *</Label>
                  <select
                    id="genre"
                    name="genre"
                    aria-label="Genre"
                    title="Genre"
                    value={formData.genre}
                    onChange={handleInputChange}
                    className={`w-full mt-3 px-4 py-3 rounded-lg font-medium transition-all ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                  >
                    <option value="">Select genre</option>
                    <option value="afrobeats">Afrobeats</option>
                    <option value="pop">Pop</option>
                    <option value="hip-hop">Hip Hop</option>
                    <option value="rnb">R&B</option>
                    <option value="electronic">Electronic</option>
                    <option value="rock">Rock</option>
                    <option value="jazz">Jazz</option>
                    <option value="gospel">Gospel</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="releaseDate" className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Release Date *</Label>
                  <Input
                    id="releaseDate"
                    name="releaseDate"
                    type="date"
                    value={formData.releaseDate}
                    onChange={handleInputChange}
                    className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                    style={{}}
                  />
                </div>

                <div>
                  <Label htmlFor="language" className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Language</Label>
                  <select
                    id="language"
                    name="language"
                    aria-label="Language"
                    title="Language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className={`w-full mt-3 px-4 py-3 rounded-lg font-medium transition-all ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                  >
                    <option value="">Select language</option>
                    <option value="english">English</option>
                    <option value="yoruba">Yoruba</option>
                    <option value="igbo">Igbo</option>
                    <option value="hausa">Hausa</option>
                    <option value="pidgin">Pidgin</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="upc" className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>UPC</Label>
                  <Input
                    id="upc"
                    name="upc"
                    value={formData.upc}
                    onChange={handleInputChange}
                    className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                    placeholder="Enter your existing UPC or leave blank"
                    style={{}}
                  />
                  <label className={`mt-3 flex items-start gap-3 text-base ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>
                    <input
                      type="checkbox"
                      name="upcRequested"
                      checked={formData.upcRequested}
                      onChange={handleInputChange}
                      className={`mt-1 h-5 w-5 rounded ${isLabelDashboard ? 'border-[#FF6B00]/30 bg-[#0A0A0A]' : 'border-[#FF6B00]/20'}`}
                    />
                    <span>Request a UPC from admin for this release</span>
                  </label>
                </div>

              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className={`text-2xl font-bold mb-2 text-[#FF6B00]`}>Track Listing</h3>
                    <p className={`text-base ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Manage metadata for each track in this release. Set individual identifiers or request them from admin.</p>
                  </div>
                  {formData.releaseType !== 'single' && (
                    <Button onClick={addTrackDraft} className={`${'bg-[#FF6B00] hover:bg-[#ff7f26] text-white'}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Track
                    </Button>
                  )}
                </div>

                {trackDrafts.map((track, index) => (
                  <Card key={track.id || `track-metadata-${index}`} className={`p-6 border-2 ${isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A]/50' : 'border-[#FF6B00]/20 bg-[#0A0A0A]'}`}>
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <h5 className={`text-lg font-bold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Track {track.trackNumber}</h5>
                        <p className={`text-sm truncate ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>{track.existingAudioName || track.audioFile?.name || 'No file selected yet'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="icon" onClick={() => moveTrackDraft(index, 'up')} disabled={index === 0} className={`${isLabelDashboard ? 'border-[#FF6B00]/30 hover:bg-[#FF6B00]/10' : ''}`}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => moveTrackDraft(index, 'down')} disabled={index === trackDrafts.length - 1} className={`${isLabelDashboard ? 'border-[#FF6B00]/30 hover:bg-[#FF6B00]/10' : ''}`}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        {trackDrafts.length > 1 && (
                          <Button variant="outline" size="sm" onClick={() => removeTrackDraft(index)} className={`${isLabelDashboard ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : ''}`}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor={`track-title-${index}`} className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Track Title *</Label>
                        <Input
                          id={`track-title-${index}`}
                          value={track.title}
                          onChange={(e) => updateTrackDraft(index, 'title', e.target.value)}
                          className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`track-duration-${index}`} className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Duration (seconds) *</Label>
                        <Input
                          id={`track-duration-${index}`}
                          type="number"
                          min="30"
                          value={track.duration}
                          onChange={(e) => updateTrackDraft(index, 'duration', Number(e.target.value) || 0)}
                          className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`track-number-${index}`} className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Track Number *</Label>
                        <Input
                          id={`track-number-${index}`}
                          type="number"
                          min="1"
                          value={track.trackNumber}
                          onChange={(e) => updateTrackDraft(index, 'trackNumber', Number(e.target.value) || 1)}
                          className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`track-disc-${index}`} className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Disc Number *</Label>
                        <Input
                          id={`track-disc-${index}`}
                          type="number"
                          min="1"
                          value={track.discNumber}
                          onChange={(e) => updateTrackDraft(index, 'discNumber', Number(e.target.value) || 1)}
                          className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`track-version-${index}`} className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Track Version</Label>
                        <Input
                          id={`track-version-${index}`}
                          value={track.version}
                          onChange={(e) => updateTrackDraft(index, 'version', e.target.value)}
                          className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`track-producer-${index}`} className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Producer</Label>
                        <Input
                          id={`track-producer-${index}`}
                          value={track.producer}
                          onChange={(e) => updateTrackDraft(index, 'producer', e.target.value)}
                          className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`track-composer-${index}`} className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Composer</Label>
                        <Input
                          id={`track-composer-${index}`}
                          value={track.composer}
                          onChange={(e) => updateTrackDraft(index, 'composer', e.target.value)}
                          className={`mt-3 px-4 py-3 font-medium ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`track-isrc-${index}`} className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>ISRC</Label>
                        <Input
                          id={`track-isrc-${index}`}
                          value={track.isrc}
                          onChange={(e) => updateTrackDraft(index, 'isrc', e.target.value)}
                          disabled={track.isrcRequested}
                          className={`mt-3 px-4 py-3 font-medium transition-all ${
                            track.isrcRequested
                              ? `${isLabelDashboard ? 'border-2 border-[#FF6B00]/15 bg-[#0A0A0A]/30 text-[#666] cursor-not-allowed' : 'border-2 border-[#FF6B00]/20 bg-[#161616]/5 text-[#B3B3B3] cursor-not-allowed'}`
                              : `${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`
                          }`}
                        />
                        <label className={`mt-3 flex items-start gap-3 text-base ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>
                          <input
                            type="checkbox"
                            checked={track.isrcRequested}
                            onChange={(e) => updateTrackDraft(index, 'isrcRequested', e.target.checked)}
                            className={`mt-1 h-5 w-5 rounded ${isLabelDashboard ? 'border-[#FF6B00]/30 bg-[#0A0A0A]' : 'border-[#FF6B00]/20'}`}
                          />
                          <span>Request an ISRC from admin for this track</span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Label htmlFor={`track-lyrics-${index}`} className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Lyrics</Label>
                      <Textarea
                        id={`track-lyrics-${index}`}
                        value={track.lyrics}
                        onChange={(e) => updateTrackDraft(index, 'lyrics', e.target.value)}
                        className={`mt-3 px-4 py-3 font-medium min-h-32 ${isLabelDashboard ? 'border-2 border-[#FF6B00]/30 bg-[#0A0A0A] text-white placeholder-[#666] focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent' : 'border-2 border-[#FF6B00]/20 bg-[#161616] text-white focus:ring-2 focus:ring-purple-600 focus:border-transparent'}`}
                      />
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`track-explicit-${index}`}
                        aria-label={`Explicit content for track ${index + 1}`}
                        title={`Explicit content for track ${index + 1}`}
                        checked={track.explicitContent}
                        onChange={(e) => updateTrackDraft(index, 'explicitContent', e.target.checked)}
                        className={`h-5 w-5 rounded ${isLabelDashboard ? 'border-[#FF6B00]/30 bg-[#0A0A0A]' : 'border-[#FF6B00]/20'}`}
                      />
                      <Label htmlFor={`track-explicit-${index}`} className={`cursor-pointer font-medium ${isLabelDashboard ? 'text-white' : 'text-white'}`}>
                        This track contains explicit content
                      </Label>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Distribution */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div>
                <h3 className={`text-2xl font-bold mb-2 text-[#FF6B00]`}>Select Distribution Platforms</h3>
                <p className={`text-base ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>
                  Choose which platforms you want your release distributed to. Your music will be available on all selected platforms within 5-7 business days.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platforms.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-5 border-2 rounded-xl text-left transition-all duration-300 ${
                        isSelected
                          ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                          : 'border-[#FF6B00]/20 hover:border-[#FF6B00]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected
                                ? 'bg-[#FF6B00] border-[#FF6B00]'
                                : 'border-[#FF6B00]/30'
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                          <div className="flex-1">
                            <MusicPlatformLogos platforms={[platform.id]} size={32} hideLabels compact />
                            <p className={`font-semibold mt-2 ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{platform.name}</p>
                            <p className={`text-xs mt-1 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>{platform.code}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Card className={`p-6 border-2 ${isLabelDashboard ? 'border-green-500/30 bg-green-500/10' : 'border-green-300 bg-green-50'}`}>
                <div className="flex gap-4">
                  <AlertCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${isLabelDashboard ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <p className={`font-bold text-lg mb-1 ${isLabelDashboard ? 'text-green-400' : 'text-green-900'}`}>
                      Distribution Timeline
                    </p>
                    <p className={`text-base ${isLabelDashboard ? 'text-green-300' : 'text-green-800'}`}>
                      Your release will go live on selected platforms within 5-7 business days after approval. You'll receive notifications when your release launches.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <div>
                <h3 className={`text-2xl font-bold mb-2 text-[#FF6B00]`}>Review Your Release</h3>
                <p className={`text-base ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>
                  Please verify all information is correct before submitting for distribution.
                </p>
              </div>

              <div className="space-y-8">
                {/* Files */}
                <div>
                  <h4 className={`text-lg font-bold mb-4 text-[#FF6B00]`}>✓ Uploaded Files</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {trackDrafts.map((track, index) => (
                      <Card key={track.id || `review-track-file-${index}`} className={`p-5 border-2 ${isLabelDashboard ? 'border-green-500/30 bg-green-500/5' : 'border-green-300 bg-green-50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${isLabelDashboard ? 'bg-green-500/20' : 'bg-green-100'}`}>
                            <FileAudio className={`w-7 h-7 ${isLabelDashboard ? 'text-green-400' : 'text-green-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Track {track.trackNumber}</p>
                            <p className={`text-sm truncate ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>{track.audioFile?.name || track.existingAudioName || 'Not uploaded'}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Card className={`p-5 border-2 ${isLabelDashboard ? 'border-green-500/30 bg-green-500/5' : 'border-green-300 bg-green-50'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${isLabelDashboard ? 'bg-green-500/20' : 'bg-green-100'}`}>
                          <ImageIcon className={`w-7 h-7 ${isLabelDashboard ? 'text-green-400' : 'text-green-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>Cover Art</p>
                          <p className={`text-sm truncate ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>{coverArt?.name || (existingArtworkUrl ? 'Current cover' : 'Not uploaded')}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Release Info */}
                <div>
                  <h4 className={`text-lg font-bold mb-4 text-[#FF6B00]`}>✓ Release Information</h4>
                  <Card className={`p-6 border-2 ${isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A]/50' : 'border-[#FF6B00]/20 bg-[#0A0A0A]'}`}>
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                      <div>
                        <span className={`font-semibold block mb-1 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Release Type</span>
                        <span className={`text-lg font-bold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{formData.releaseType?.toUpperCase() || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className={`font-semibold block mb-1 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Release Title</span>
                        <span className={`text-lg font-bold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{formData.title || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className={`font-semibold block mb-1 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Primary Artist</span>
                        <span className={`text-lg font-bold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{formData.primaryArtist || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className={`font-semibold block mb-1 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Genre</span>
                        <span className={`text-lg font-bold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{formData.genre?.toUpperCase() || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className={`font-semibold block mb-1 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Release Date</span>
                        <span className={`text-lg font-bold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{formData.releaseDate || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className={`font-semibold block mb-1 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>Language</span>
                        <span className={`text-lg font-bold ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{(formData.language || '').charAt(0).toUpperCase() + (formData.language || '').slice(1) || 'Not provided'}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                <div>
                  <h4 className={`text-lg font-bold mb-4 ${isLabelDashboard ? 'text-white' : 'text-white'}`}>✓ Track Listing</h4>
                  <div className="space-y-4">
                    {trackDrafts.map((track, index) => (
                      <Card key={track.id || `review-track-${index}`} className="p-4">
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-[#B3B3B3]">Track:</span>{' '}
                            <span className="font-medium">{track.title || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-[#B3B3B3]">Track No / Disc:</span>{' '}
                            <span className="font-medium">{track.trackNumber} / {track.discNumber}</span>
                          </div>
                          <div>
                            <span className="text-[#B3B3B3]">Version:</span>{' '}
                            <span className="font-medium">{track.version || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-[#B3B3B3]">Duration:</span>{' '}
                            <span className="font-medium">{formatDuration(track.duration)}</span>
                          </div>
                          <div>
                            <span className="text-[#B3B3B3]">ISRC:</span>{' '}
                            <span className="font-medium">{track.isrc || (track.isrcRequested ? 'Requested from admin' : 'Not provided')}</span>
                          </div>
                          <div>
                            <span className="text-[#B3B3B3]">Producer:</span>{' '}
                            <span className="font-medium">{track.producer || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-[#B3B3B3]">Composer:</span>{' '}
                            <span className="font-medium">{track.composer || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-[#B3B3B3]">Explicit:</span>{' '}
                            <span className="font-medium">{track.explicitContent ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg bg-[#0A0A0A] p-3 text-sm text-[#B3B3B3] whitespace-pre-wrap">
                          {track.lyrics || 'No lyrics provided'}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <h4 className={`text-lg font-bold mb-4 text-[#FF6B00]`}>✓ Distribution Platforms ({selectedPlatforms.length})</h4>
                  <Card className={`p-6 border-2 ${isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A]/50' : 'border-[#FF6B00]/20 bg-[#0A0A0A]'}`}>
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {selectedPlatforms.map((platformId) => {
                        const platform = platforms.find((p) => p.id === platformId);
                        if (!platform) return null;
                        return (
                          <div key={platformId} className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-[#FF6B00]/30 bg-[#FF6B00]/5">
                            <div className="flex items-center justify-center h-12">
                              <MusicPlatformLogos platforms={[platform.id]} size={32} hideLabels compact />
                            </div>
                            <span className={`text-xs font-bold text-center ${isLabelDashboard ? 'text-white' : 'text-white'}`}>{platform.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900 mb-1">
                        {isEditMode ? 'Ready to Update' : 'Ready to Submit'}
                      </p>
                      <p className="text-sm text-green-800">
                        {isEditMode
                          ? 'Your changes will be saved and any new distribution selections will be submitted.'
                          : 'Your release will be reviewed and distributed to all selected platforms.'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-1">Complete Your Order</h3>
                <p className={`text-sm ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>
                  Your release will be submitted after payment is confirmed.
                </p>
              </div>

              {/* Promotion add-on */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone className="w-5 h-5 text-[#FF6B00]" />
                  <h4 className="font-semibold">Add Promotion Campaign (Optional)</h4>
                </div>
                <p className={`text-sm mb-4 ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>
                  Boost your release with a promotional campaign. Select a plan to add it to your order.
                </p>
                <div className="space-y-3">
                  {PROMOTION_PLANS.map((plan) => {
                    const isSelected = selectedPromoAddon === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPromoAddon(isSelected ? null : plan.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-[#FF6B00] bg-[#FF6B00]/10' : isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A]/40 hover:border-[#FF6B00]/50' : 'border-[#FF6B00]/20 hover:border-[#FF6B00]/40'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#FF6B00] border-[#FF6B00]' : 'border-gray-400'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{plan.name}</p>
                              <p className={`text-xs ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}`}>{plan.durationLabel} · {plan.description.slice(0, 60)}…</p>
                            </div>
                          </div>
                          <span className="font-bold text-[#FF6B00] text-sm ml-3 flex-shrink-0">{plan.displayPrice}</span>
                        </div>
                        {plan.badge && (
                          <span className="mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00]">{plan.badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order summary */}
              <Card className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-[#0A0A0A]/60 p-5' : 'border border-[#FF6B00]/20 p-5'}>
                <h4 className="font-semibold mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}>Release: {formData.title || 'Untitled'}</span>
                    <span>{releaseFee === 0 ? 'Free' : `₦${(releaseFee ?? 5000).toLocaleString()}`}</span>
                  </div>
                  {selectedPromoAddonPlan && (
                    <div className="flex justify-between">
                      <span className={isLabelDashboard ? 'text-[#B3B3B3]' : 'text-[#B3B3B3]'}>Promotion: {selectedPromoAddonPlan.name}</span>
                      <span>{selectedPromoAddonPlan.displayPrice}</span>
                    </div>
                  )}
                  <div className={`flex justify-between font-bold border-t pt-2 ${isLabelDashboard ? 'border-[#FF6B00]/20' : 'border-[#FF6B00]/20'}`}>
                    <span>Total</span>
                    <span className="text-[#FF6B00]">{totalPaymentAmount === 0 ? 'Free' : `₦${totalPaymentAmount.toLocaleString()}`}</span>
                  </div>
                </div>
              </Card>

              {/* Email input */}
              {totalPaymentAmount > 0 && (
                <div>
                  <Label htmlFor="payment-email">Email for Paystack Receipt</Label>
                  <Input
                    id="payment-email"
                    type="email"
                    value={paymentEmail}
                    onChange={(e) => { setPaymentError(''); setPaymentEmail(e.target.value); }}
                    placeholder="your@email.com"
                    className="mt-2"
                    style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
                  />
                </div>
              )}

              {paymentError && (
                <Card className={isLabelDashboard ? 'border-red-500/30 bg-red-500/10 p-4 text-red-200' : 'border-red-200 bg-red-50 p-4 text-red-700'}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">{paymentError}</p>
                  </div>
                </Card>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#FF6B00]/20">
                <Button variant="outline" onClick={() => setCurrentStep(4)} disabled={isProcessingPayment || isSubmitting}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Review
                </Button>
                <Button
                  className="bg-[#FF6B00] hover:bg-[#e05e00] text-white"
                  onClick={handlePayAndSubmit}
                  disabled={isProcessingPayment || isSubmitting}
                >
                  {isProcessingPayment || isSubmitting
                    ? 'Processing…'
                    : totalPaymentAmount === 0
                      ? (isEditMode ? 'Update Release' : 'Submit Release')
                      : `Pay ₦${totalPaymentAmount.toLocaleString()} & Submit`}
                  {!isProcessingPayment && !isSubmitting && <Check className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#FF6B00]/20">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && !step1Ready) ||
                  (currentStep === 2 && !step2Ready) ||
                  (currentStep === 3 && !step3Ready)
                }
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : currentStep === 4 ? (
              <Button className="bg-[#FF6B00] hover:bg-[#e05e00] text-white" onClick={enterPaymentStep} disabled={isLoadingFee}>
                {isLoadingFee ? 'Loading…' : (isEditMode ? 'Review Payment' : 'Proceed to Payment')}
                <CreditCard className="w-4 h-4 ml-2" />
              </Button>
            ) : null}
          </div>
        </Card>
        </>)} {/* end subscription gate wrapper */}
      </div>
    </div>
  );
}
