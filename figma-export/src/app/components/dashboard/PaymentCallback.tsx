import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle, LoaderCircle } from 'lucide-react';
import { verifyPaystackPayment } from '../../utils/payment-api';
import * as userApi from '../../utils/user-api';
import { getArtistDisplayName } from '../../utils/artist-management';

type VerificationState = 'verifying' | 'submitting' | 'success' | 'failed';

async function submitPendingRelease(payload: any, dashboardBasePath: string) {
  const {
    formData,
    trackDrafts,
    deletedTrackIds,
    existingArtworkPath,
    existingArtworkUrl,
    selectedPlatforms,
    releaseId,
    isEditMode,
  } = payload;

  const languageCodeMap: Record<string, string> = {
    english: 'eng', yoruba: 'yor', igbo: 'ibo', hausa: 'hau', pidgin: 'eng',
  };
  const genreLabelMap: Record<string, string> = {
    afrobeats: 'Afrobeats', pop: 'Pop', 'hip-hop': 'Hip-Hop/Rap', rnb: 'R&B/Soul',
    electronic: 'Electronic', rock: 'Alternative', jazz: 'Jazz', gospel: 'Gospel',
  };

  const year = new Date().getFullYear();
  const normalizedLanguage = languageCodeMap[formData.language] || 'eng';
  const normalizedGenre = genreLabelMap[formData.genre] || 'Afrobeats';
  const firstTrack = trackDrafts[0];
  const previewUrl = firstTrack?.audioFileUrl || '';

  const releasePayload = {
    userId: sessionStorage.getItem('user_id') || 'current-user',
    title: formData.title,
    upc: formData.upc?.trim() || undefined,
    upcRequested: formData.upcRequested,
    type: formData.releaseType,
    version: formData.releaseVersion || undefined,
    artworkPath: existingArtworkPath,
    artworkUrl: existingArtworkUrl,
    primaryArtist: formData.primaryArtist,
    featuredArtists: formData.featuring
      ? formData.featuring.split(',').map((n: string) => n.trim()).filter(Boolean)
      : [],
    label: formData.artistName || formData.primaryArtist,
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

  if (isEditMode && releaseId) {
    await userApi.updateRelease(releaseId, releasePayload);
    for (const id of (deletedTrackIds || [])) {
      await userApi.deleteReleaseTrack(id);
    }
    for (const track of trackDrafts) {
      const trackPayload = {
        title: track.title, version: track.version || undefined,
        trackNumber: track.trackNumber, discNumber: track.discNumber,
        duration: track.duration, isrc: track.isrc || undefined,
        isrcRequested: track.isrcRequested, language: normalizedLanguage,
        explicit: track.explicitContent, genre: normalizedGenre,
        contributors: [
          { id: crypto.randomUUID(), name: formData.primaryArtist, role: 'primary_artist' as const },
          ...(track.producer ? [{ id: crypto.randomUUID(), name: track.producer, role: 'producer' as const }] : []),
          ...(track.composer ? [{ id: crypto.randomUUID(), name: track.composer, role: 'composer' as const }] : []),
        ],
        lyrics: track.lyrics || undefined,
        audioFilePath: track.existingAudioPath,
        audioFileUrl: track.audioFileUrl,
        previewStart: 0,
      };
      if (track.id) {
        await userApi.updateReleaseTrack(track.id, trackPayload);
      } else {
        await userApi.createReleaseTrack(releaseId, trackPayload);
      }
    }
    const orderedIds = trackDrafts.map((t: any) => t.id).filter(Boolean);
    await userApi.updateRelease(releaseId, {
      trackIds: orderedIds, audioPreviewUrl: trackDrafts[0]?.audioFileUrl || '', audioFileName: trackDrafts[0]?.existingAudioName || '',
    });
  } else {
    const release = await userApi.createRelease({ ...releasePayload, trackIds: [] });
    activeReleaseId = release.id;
    const createdTracks: any[] = [];
    for (const track of trackDrafts) {
      const newTrack = await userApi.createReleaseTrack(release.id, {
        title: track.title, version: track.version || undefined,
        trackNumber: track.trackNumber, discNumber: track.discNumber,
        duration: track.duration, isrc: track.isrc || undefined,
        isrcRequested: track.isrcRequested, language: normalizedLanguage,
        explicit: track.explicitContent, genre: normalizedGenre,
        contributors: [
          { id: crypto.randomUUID(), name: formData.primaryArtist, role: 'primary_artist' as const },
          ...(track.producer ? [{ id: crypto.randomUUID(), name: track.producer, role: 'producer' as const }] : []),
          ...(track.composer ? [{ id: crypto.randomUUID(), name: track.composer, role: 'composer' as const }] : []),
        ],
        lyrics: track.lyrics || undefined,
        audioFilePath: track.existingAudioPath,
        audioFileUrl: track.audioFileUrl || previewUrl,
        previewStart: 0,
      });
      createdTracks.push(newTrack);
    }
    const orderedIds = createdTracks.map((t) => t.id).filter(Boolean);
    await userApi.updateRelease(release.id, {
      trackIds: orderedIds, selectedPlatforms,
      audioPreviewUrl: createdTracks[0]?.audioFileUrl || previewUrl,
      audioFileName: createdTracks[0]?.audioFilePath?.split('/')?.pop() || '',
    });
  }

  if (activeReleaseId && selectedPlatforms.length > 0) {
    await userApi.distributeRelease(activeReleaseId, selectedPlatforms);
  }
}

export function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<VerificationState>('verifying');
  const [message, setMessage] = useState('Verifying your Paystack payment...');
  const [failedReference, setFailedReference] = useState<string | null>(null);
  const [failedAmount, setFailedAmount] = useState<number | null>(null);
  const [failedDate, setFailedDate] = useState<string | null>(null);
  const [debitLikely, setDebitLikely] = useState(false);

  const dashboardBasePath = useMemo(() => {
    return location.pathname.startsWith('/label-dashboard') ? '/label-dashboard' : '/dashboard';
  }, [location.pathname]);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const promotionIdFromQuery = searchParams.get('promotionId');
    const isPendingRelease = searchParams.get('pendingRelease') === '1';

    if (!reference) {
      setState('failed');
      setMessage('No Paystack payment reference was returned.');
      return;
    }

    let active = true;

    async function verifyPayment() {
      try {
        const result = await verifyPaystackPayment(reference);
        if (!active) {
          return;
        }

        if (result.transaction.status !== 'success') {
          const gatewayStatus = (result.transaction.gatewayStatus || '').toLowerCase();
          const likelyDebited = Boolean(
            result.transaction.paidAt
            || gatewayStatus.includes('charge')
            || gatewayStatus.includes('debit')
            || gatewayStatus.includes('success')
            || gatewayStatus.includes('pending'),
          );

          setFailedReference(result.transaction.reference || reference);
          setFailedAmount(typeof result.transaction.amount === 'number' ? result.transaction.amount : null);
          setFailedDate(result.transaction.paidAt || result.transaction.updatedAt || result.transaction.createdAt || null);
          setDebitLikely(likelyDebited);
          setState('failed');
          setMessage(result.transaction.failureReason || 'Payment was not completed successfully.');
          return;
        }

        if (isPendingRelease) {
          const raw = sessionStorage.getItem('pending_release_payload');
          if (raw) {
            setState('submitting');
            setMessage('Payment confirmed. Submitting your release...');
            try {
              const pendingPayload = JSON.parse(raw);
              await submitPendingRelease(pendingPayload, dashboardBasePath);
              sessionStorage.removeItem('pending_release_payload');
              setState('success');
              setMessage('Release submitted successfully! It will be reviewed and distributed shortly.');
              window.setTimeout(() => {
                navigate(`${dashboardBasePath}/catalog`, { replace: true });
              }, 2000);
            } catch (err) {
              setState('failed');
              setMessage(err instanceof Error ? err.message : 'Payment succeeded but release submission failed. Please contact support.');
            }
          } else {
            setState('success');
            setMessage('Payment confirmed. Your release has been submitted.');
            window.setTimeout(() => {
              navigate(`${dashboardBasePath}/catalog`, { replace: true });
            }, 2000);
          }
          return;
        }

        const promotionId = promotionIdFromQuery;

        setState('success');
        setMessage(
          promotionId
            ? 'Payment verified. Your promotion campaign payment is confirmed and backend processing is complete.'
            : 'Payment verified. Your subscription has been updated.',
        );

        window.setTimeout(() => {
          navigate(promotionId ? `${dashboardBasePath}/promotion` : dashboardBasePath, { replace: true });
        }, 1800);
      } catch (error) {
        if (!active) {
          return;
        }

        setState('failed');
        setMessage(error instanceof Error ? error.message : 'Unable to verify your payment.');
      }
    }

    verifyPayment();

    return () => {
      active = false;
    };
  }, [dashboardBasePath, navigate, searchParams]);

  const hasPromotionCheckout = searchParams.has('promotionId');
  const isPendingRelease = searchParams.get('pendingRelease') === '1';

  return (
    <div className="min-h-[60vh] bg-[#0A0A0A] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-800 bg-[#1A1A1A] p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0A0A0A]">
          {state === 'verifying' || state === 'submitting' ? (
            <LoaderCircle className="h-8 w-8 animate-spin text-[#FFD600]" />
          ) : state === 'success' ? (
            <CheckCircle className="h-8 w-8 text-[#1DB954]" />
          ) : (
            <AlertCircle className="h-8 w-8 text-[#FF6B6B]" />
          )}
        </div>

        <h1 className="mb-3 text-2xl font-bold text-white">
          {state === 'verifying' ? 'Confirming payment'
            : state === 'submitting' ? 'Submitting release'
            : state === 'success' ? 'Payment successful'
            : 'Payment verification failed'}
        </h1>
        <p className="mb-6 text-sm text-[#B3B3B3]">{message}</p>

        {state === 'failed' ? (
          <div className="space-y-4">
            {failedReference ? (
              <div className="mx-auto max-w-md rounded-xl border border-[#FF6B6B]/25 bg-[#FF6B6B]/5 p-4 text-left">
                <p className="mb-2 text-xs uppercase tracking-[0.15em] text-[#FF9E9E]">Payment Outcome</p>
                <div className="grid grid-cols-1 gap-2 text-sm text-[#D1D5DB]">
                  <p><span className="text-[#9CA3AF]">Reference:</span> <span className="font-mono">{failedReference}</span></p>
                  {failedAmount ? <p><span className="text-[#9CA3AF]">Amount:</span> ₦{failedAmount.toLocaleString()}</p> : null}
                  {failedDate ? <p><span className="text-[#9CA3AF]">Date:</span> {new Date(failedDate).toLocaleString('en-US')}</p> : null}
                  <p className="text-xs text-[#B3B3B3] mt-1">
                    {debitLikely
                      ? 'This transaction may have debited your account. You can file a dispute directly from here.'
                      : 'No successful debit was detected from the provider response.'}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-center gap-3">
              {debitLikely && failedReference ? (
                <button
                  onClick={() => navigate(`${dashboardBasePath}/disputes`, {
                    state: {
                      openDisputeForm: true,
                      disputeType: 'failed_debit',
                      transactionReference: failedReference,
                      transactionAmount: failedAmount ?? 0,
                      transactionDate: failedDate ?? undefined,
                      description: `I was charged for payment reference ${failedReference}, but the checkout did not complete successfully. Please investigate and reverse the debit if applicable.`,
                    },
                  })}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#FF6B00]/90"
                >
                  File Payment Dispute
                </button>
              ) : null}

              <button
                onClick={() => navigate(isPendingRelease ? `${dashboardBasePath}/upload` : hasPromotionCheckout ? `${dashboardBasePath}/promotion` : `${dashboardBasePath}/payment`)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-3 text-sm font-medium text-white transition hover:border-gray-500"
              >
                <ArrowLeft className="h-4 w-4" />
                {isPendingRelease ? 'Back to upload' : hasPromotionCheckout ? 'Back to promotion' : 'Back to payment'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}