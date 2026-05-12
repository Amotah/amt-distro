import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Archive,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Megaphone,
  Music,
  Radio,
  Shield,
  StickyNote,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { getLabelArtists, getUserReleases, removeLabelArtist, updateLabelArtistVerification, type Release, type UserProfile } from '../../utils/user-api';
import { getLabelArtistEarningsSummary, type LabelArtistEarningsSummary } from '../../utils/payment-api';
import {
  type ArtistContractDetails,
  type ArtistContractTemplateId,
  type ArtistDataRetentionOption,
  type ArtistDisputeStatus,
  type ArtistESignProvider,
  type ArtistTaxDocument,
  type ArtistTaxFormType,
  buildManagedArtist,
  formatCompactNumber,
  formatCurrency,
  getArtistInitials,
  writeArtistManagementOverrides,
  readArtistManagementOverrides,
} from '../../utils/artist-management';
import { getArtistVerificationBadge, getArtistVerificationState, type ArtistVerificationStatus } from '../../utils/artist-verification';

function formatJoinedName(profile: UserProfile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Not provided';
}

function formatReleaseDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'TBD';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function renderVerificationIcon(status: ArtistVerificationStatus) {
  if (status === 'verified') {
    return <BadgeCheck className="h-3.5 w-3.5 text-[#63A4FF]" />;
  }

  if (status === 'pending') {
    return <Clock3 className="h-3.5 w-3.5 text-[#FFCC66]" />;
  }

  return <Circle className="h-3.5 w-3.5 text-[#B3B3B3]" />;
}

const CONTRACT_TEMPLATE_LIBRARY: Array<{
  id: ArtistContractTemplateId;
  label: string;
  contractType: ArtistContractDetails['contractType'];
  description: string;
  termSummary: string;
  commissionRate: number;
  territory: string;
}> = [
  {
    id: 'standard-exclusive',
    label: 'Standard Exclusive',
    contractType: 'exclusive',
    description: 'Full-service exclusive label agreement with defined term and renewal path.',
    termSummary: 'Exclusive recording and distribution rights for the stated term with label-led marketing support.',
    commissionRate: 25,
    territory: 'Worldwide',
  },
  {
    id: 'standard-non-exclusive',
    label: 'Standard Non-Exclusive',
    contractType: 'non-exclusive',
    description: 'Distribution-first non-exclusive agreement for catalog or new releases.',
    termSummary: 'Non-exclusive distribution appointment with artist retaining parallel exploitation rights outside the label scope.',
    commissionRate: 20,
    territory: 'Worldwide excluding prior encumbrances',
  },
  {
    id: 'featured-artist',
    label: 'Featured Artist',
    contractType: 'featured-artist',
    description: 'Short-form featured appearance agreement with marketing and royalty terms.',
    termSummary: 'Featured performance clearance covering promo usage, metadata crediting, and royalty split administration.',
    commissionRate: 15,
    territory: 'Worldwide',
  },
  {
    id: 'producer',
    label: 'Producer Agreement',
    contractType: 'producer',
    description: 'Producer services and backend participation with delivery obligations.',
    termSummary: 'Production services agreement covering beat/master delivery, revisions, crediting, and backend participation.',
    commissionRate: 12,
    territory: 'Worldwide',
  },
  {
    id: 'distribution',
    label: 'Distribution Services',
    contractType: 'distribution',
    description: 'Template for delivery, DSP exploitation, and reporting obligations.',
    termSummary: 'Digital distribution services agreement with reporting cadence, collection rights, and payout schedule.',
    commissionRate: 20,
    territory: 'Worldwide',
  },
];

function buildDefaultSignatureIntegration(profile: UserProfile) {
  return {
    provider: 'docusign' as ArtistESignProvider,
    status: 'draft' as const,
    signingUrl: '',
    envelopeId: '',
    sentAt: '',
    lastSyncedAt: '',
    signers: [
      {
        id: crypto.randomUUID(),
        role: 'label' as const,
        name: 'Label Representative',
        email: '',
        status: 'pending' as const,
      },
      {
        id: crypto.randomUUID(),
        role: 'artist' as const,
        name: formatJoinedName(profile),
        email: profile.email,
        status: 'pending' as const,
      },
    ],
  };
}

function buildDefaultRenewalWorkflow(endDate?: string) {
  return {
    mode: 'prompt-new-terms' as const,
    noticeDays: 60,
    owner: 'shared' as const,
    nextActionDate: endDate || '',
    nextActionNote: 'Review commercial terms before expiry.',
  };
}

function buildDefaultDisputeResolution() {
  return {
    status: 'none' as ArtistDisputeStatus,
    preferredChannel: 'email' as const,
    escalationContact: '',
    notes: '',
    openedAt: '',
    lastUpdatedAt: '',
  };
}

function buildDefaultRightsDeclaration(profile: UserProfile) {
  return {
    confirmed: false,
    confirmedBy: 'both' as const,
    confirmedAt: '',
    territory: profile.country || 'Worldwide',
    ownershipSummary: '',
    notes: '',
  };
}

function buildContractVersion(contract: ArtistContractDetails, actor: string) {
  const existingVersions = contract.versions || [];
  const versionNumber = existingVersions.length + 1;
  const signedBy = (contract.signatureIntegration?.signers || [])
    .filter((signer) => signer.status === 'signed')
    .map((signer) => signer.name);

  return {
    id: crypto.randomUUID(),
    versionLabel: `v${versionNumber}`,
    createdAt: new Date().toISOString(),
    createdBy: actor,
    templateId: contract.templateId || 'custom',
    contractType: contract.contractType,
    commissionRate: contract.commissionRate,
    summary: contract.termSummary || `${formatContractType(contract.contractType)} agreement`,
    signedBy,
  };
}

function getTemplateConfig(templateId?: ArtistContractTemplateId) {
  return CONTRACT_TEMPLATE_LIBRARY.find((template) => template.id === templateId) || null;
}

function buildDefaultContractDetails(profile: UserProfile): ArtistContractDetails {
  const startDate = profile.createdAt ? profile.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    contractType: 'distribution',
    templateId: 'distribution',
    templateName: 'Distribution Services',
    labelEntityName: '',
    artistLegalName: formatJoinedName(profile),
    territory: profile.country || 'Worldwide',
    termSummary: 'Digital distribution services agreement with reporting cadence, collection rights, and payout schedule.',
    commissionRate: 20,
    startDate,
    endDate: endDate.toISOString().slice(0, 10),
    renewalStatus: 'active',
    pdfUrl: '',
    expirationAlerts: {
      enabled: true,
      daysBefore: [90, 60, 30],
    },
    renewalWorkflow: buildDefaultRenewalWorkflow(endDate.toISOString().slice(0, 10)),
    signatureIntegration: buildDefaultSignatureIntegration(profile),
    disputeResolution: buildDefaultDisputeResolution(),
    rightsDeclaration: buildDefaultRightsDeclaration(profile),
    versions: [],
  };
}

function hydrateContractDetails(contract: ArtistContractDetails | undefined, profile: UserProfile) {
  const defaults = buildDefaultContractDetails(profile);
  const merged: ArtistContractDetails = {
    ...defaults,
    ...contract,
    expirationAlerts: {
      ...defaults.expirationAlerts,
      ...contract?.expirationAlerts,
      daysBefore: contract?.expirationAlerts?.daysBefore && contract.expirationAlerts.daysBefore.length > 0
        ? contract.expirationAlerts.daysBefore
        : defaults.expirationAlerts?.daysBefore || [90, 60, 30],
    },
    renewalWorkflow: {
      ...defaults.renewalWorkflow,
      ...contract?.renewalWorkflow,
    },
    signatureIntegration: {
      ...defaults.signatureIntegration,
      ...contract?.signatureIntegration,
      signers: contract?.signatureIntegration?.signers && contract.signatureIntegration.signers.length > 0
        ? contract.signatureIntegration.signers
        : defaults.signatureIntegration?.signers || [],
    },
    disputeResolution: {
      ...defaults.disputeResolution,
      ...contract?.disputeResolution,
    },
    rightsDeclaration: {
      ...defaults.rightsDeclaration,
      ...contract?.rightsDeclaration,
    },
    versions: contract?.versions || defaults.versions,
  };

  return merged;
}

function formatContractType(value: ArtistContractDetails['contractType']) {
  return value === 'label-services'
    ? 'Label Services'
    : value === 'distribution'
      ? 'Distribution'
      : value === 'licensing'
        ? 'Licensing'
      : value === 'non-exclusive'
        ? 'Non-Exclusive'
        : value === 'featured-artist'
          ? 'Featured Artist'
          : value === 'producer'
            ? 'Producer'
        : 'Exclusive';
}

function formatRenewalStatus(value: ArtistContractDetails['renewalStatus']) {
  return value === 'renewal-due'
    ? 'Renewal Due'
    : value === 'auto-renew'
      ? 'Auto Renew'
      : value === 'expired'
        ? 'Expired'
        : 'Active';
}

function formatESignProvider(value: ArtistESignProvider) {
  return value === 'hellosign' ? 'HelloSign' : value === 'manual' ? 'Manual' : 'DocuSign';
}

function formatDisputeStatus(value: ArtistDisputeStatus) {
  return value === 'in-mediation'
    ? 'In Mediation'
    : value === 'monitoring'
      ? 'Monitoring'
      : value === 'open'
        ? 'Open'
        : value === 'resolved'
          ? 'Resolved'
          : 'No active issue';
}

function formatTemplateLabel(value?: ArtistContractTemplateId) {
  return getTemplateConfig(value)?.label || 'Custom';
}

function getDaysUntil(dateValue?: string) {
  if (!dateValue) {
    return null;
  }

  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.ceil((target.getTime() - startOfToday) / (1000 * 60 * 60 * 24));
}

export function ArtistManagementDetail() {
  const navigate = useNavigate();
  const { artistId } = useParams();
  const [artists, setArtists] = useState<UserProfile[]>([]);
  const [overrides, setOverrides] = useState(() => readArtistManagementOverrides());
  const [releases, setReleases] = useState<Release[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<LabelArtistEarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingVerification, setIsSavingVerification] = useState(false);
  const [isSavingManagement, setIsSavingManagement] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [internalNotesDraft, setInternalNotesDraft] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [retentionOption, setRetentionOption] = useState<ArtistDataRetentionOption>('retain-all');
  const [contractForm, setContractForm] = useState<ArtistContractDetails>(buildDefaultContractDetails({ createdAt: new Date().toISOString() } as UserProfile));
  const [taxFormTypeDraft, setTaxFormTypeDraft] = useState<ArtistTaxFormType>('W-9');
  const [taxRegionDraft, setTaxRegionDraft] = useState('United States');
  const [taxNotesDraft, setTaxNotesDraft] = useState('');

  function persistOverrides(nextOverrides: ReturnType<typeof readArtistManagementOverrides>) {
    setOverrides(nextOverrides);
    writeArtistManagementOverrides(nextOverrides);
  }

  function patchArtistOverride(partial: Partial<NonNullable<typeof overrides[string]>>) {
    if (!managedArtist) {
      return;
    }

    const current = overrides[managedArtist.id];
    persistOverrides({
      ...overrides,
      [managedArtist.id]: {
        ...current,
        status: current?.status ?? managedArtist.status,
        archived: current?.archived ?? managedArtist.archived,
        campaignName: current?.campaignName ?? managedArtist.campaignName,
        genres: current?.genres ?? managedArtist.genres,
        internalNotes: current?.internalNotes,
        contract: current?.contract,
        taxDocuments: current?.taxDocuments,
        removal: current?.removal,
        ...partial,
      },
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadArtists() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const [nextArtists, nextReleases, nextSummary] = await Promise.all([
          getLabelArtists(),
          getUserReleases().catch(() => []),
          getLabelArtistEarningsSummary().catch(() => null),
        ]);

        if (!cancelled) {
          setArtists(nextArtists);
          setReleases(nextReleases);
          setEarningsSummary(nextSummary);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load artist details.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  const managedArtist = useMemo(() => {
    return artists
      .map((artist, index) => buildManagedArtist(artist, index, overrides))
      .find((artist) => artist.id === artistId) || null;
  }, [artistId, artists, overrides]);

  useEffect(() => {
    if (!managedArtist) {
      return;
    }

    setInternalNotesDraft(overrides[managedArtist.id]?.internalNotes || '');
    setContractForm(hydrateContractDetails(overrides[managedArtist.id]?.contract, managedArtist.profile));
  }, [managedArtist, overrides]);

  const liveArtistSummary = useMemo(() => {
    if (!managedArtist || !earningsSummary) {
      return null;
    }

    return earningsSummary.topArtists.find((artist) => (
      artist.userId === managedArtist.profile.userId
      || artist.artistId === managedArtist.profile.id
      || artist.artistId === managedArtist.id
    )) || null;
  }, [earningsSummary, managedArtist]);

  const performanceCards = useMemo(() => {
    if (!managedArtist) {
      return [] as Array<{ label: string; value: string; hint: string }>;
    }

    return [
      {
        label: 'Label Streams',
        value: liveArtistSummary ? formatCompactNumber(liveArtistSummary.totalStreams) : 'No data',
        hint: 'Streams from releases uploaded under this label account only',
      },
      {
        label: 'Label Revenue',
        value: liveArtistSummary ? formatCurrency(liveArtistSummary.totalRevenue) : 'No data',
        hint: 'Royalties tied to label-uploaded releases only',
      },
      {
        label: 'Roster Status',
        value: managedArtist.status === 'active' ? 'Active' : 'Inactive',
        hint: managedArtist.archived ? 'Archived from active roster view' : 'Visible in current roster',
      },
      {
        label: 'Campaign',
        value: managedArtist.campaignName || 'Unassigned',
        hint: 'Latest label campaign tag',
      },
    ];
  }, [liveArtistSummary, managedArtist]);

  const verificationSnapshot = useMemo(() => {
    if (!managedArtist) {
      return null;
    }

    return getArtistVerificationState(managedArtist.profile);
  }, [managedArtist]);

  const socialLinks = useMemo(() => {
    const links = managedArtist?.profile.socialLinks;

    return [
      { key: 'spotify', label: 'Spotify', url: links?.spotify },
      { key: 'instagram', label: 'Instagram', url: links?.instagram },
      { key: 'tiktok', label: 'TikTok', url: links?.tiktok },
      { key: 'youtube', label: 'YouTube', url: links?.youtube },
    ];
  }, [managedArtist]);

  const verificationStages = useMemo(() => {
    if (!verificationSnapshot) {
      return [] as Array<{
        key: 'emailConfirmed' | 'idVerified' | 'profileReviewed';
        label: string;
        description: string;
        complete: boolean;
        optional?: boolean;
      }>;
    }

    return [
      {
        key: 'emailConfirmed' as const,
        label: 'Email confirmation',
        description: 'Confirm the artist email is active and ready for account recovery and notices.',
        complete: verificationSnapshot.verification.emailConfirmed,
      },
      {
        key: 'idVerified' as const,
        label: 'ID verification',
        description: 'Optional identity review for higher-trust profiles and premium partnerships.',
        complete: verificationSnapshot.verification.idVerified,
        optional: verificationSnapshot.verification.idVerificationOptional,
      },
      {
        key: 'profileReviewed' as const,
        label: 'Profile review',
        description: 'Review avatar, bio, genres, and social profiles before granting verification.',
        complete: verificationSnapshot.verification.profileReviewed,
      },
    ];
  }, [verificationSnapshot]);

  const releaseHistory = useMemo(() => {
    if (!managedArtist) {
      return [] as Release[];
    }

    const artistName = managedArtist.name.toLowerCase();
    const matchedReleases = releases.filter((release) => {
      const primaryArtist = release.primaryArtist.toLowerCase();
      const featuredArtists = (release.featuredArtists || []).some((artist) => artist.toLowerCase().includes(artistName));
      return primaryArtist.includes(artistName) || featuredArtists;
    });

    return matchedReleases
      .slice()
      .sort((left, right) => new Date(right.releaseDate).getTime() - new Date(left.releaseDate).getTime())
      .slice(0, 4);
  }, [managedArtist, releases]);

  const payoutHistory = useMemo(() => {
    if (!managedArtist || !liveArtistSummary) {
      return [] as Array<{ id: string; periodLabel: string; requestDate: string; gross: number; net: number; status: string }>;
    }

    return [] as Array<{ id: string; periodLabel: string; requestDate: string; gross: number; net: number; status: string }>;
  }, [liveArtistSummary, managedArtist]);

  const contractDetails = useMemo(() => {
    if (!managedArtist) {
      return null;
    }

    return hydrateContractDetails(overrides[managedArtist.id]?.contract, managedArtist.profile);
  }, [managedArtist, overrides]);

  const taxDocuments = useMemo(() => {
    if (!managedArtist) {
      return [] as ArtistTaxDocument[];
    }

    return overrides[managedArtist.id]?.taxDocuments || [];
  }, [managedArtist, overrides]);

  const expirationAlerts = useMemo(() => {
    if (!contractDetails?.expirationAlerts?.enabled || !contractDetails.endDate) {
      return [] as Array<{ days: number; status: 'upcoming' | 'due' | 'passed'; message: string }>;
    }

    const daysUntilExpiry = getDaysUntil(contractDetails.endDate);
    if (daysUntilExpiry === null) {
      return [] as Array<{ days: number; status: 'upcoming' | 'due' | 'passed'; message: string }>;
    }

    return [...(contractDetails.expirationAlerts.daysBefore || [])]
      .sort((left, right) => right - left)
      .map((days) => {
        const status = daysUntilExpiry < 0 ? 'passed' : daysUntilExpiry <= days ? 'due' : 'upcoming';
        return {
          days,
          status,
          message: daysUntilExpiry < 0
            ? `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) === 1 ? '' : 's'} ago.`
            : daysUntilExpiry <= days
              ? `Alert window reached with ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} remaining.`
              : `${daysUntilExpiry} days remaining before expiry.`,
        };
      });
  }, [contractDetails]);

  const templatePreview = useMemo(() => getTemplateConfig(contractForm.templateId), [contractForm.templateId]);

  const versionHistory = useMemo(() => {
    return [...(contractDetails?.versions || [])]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [contractDetails]);

  const internalNotes = useMemo(() => {
    if (!managedArtist) {
      return '';
    }

    return overrides[managedArtist.id]?.internalNotes || '';
  }, [managedArtist, overrides]);

  async function handleVerificationUpdate(field: 'emailConfirmed' | 'idVerified' | 'profileReviewed', value: boolean) {
    if (!managedArtist) {
      return;
    }

    try {
      setIsSavingVerification(true);
      setErrorMessage(null);
      const updatedArtist = await updateLabelArtistVerification(managedArtist.id, {
        [field]: value,
      });
      setArtists((current) => current.map((artist) => (artist.id === updatedArtist.id ? updatedArtist : artist)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update verification.');
    } finally {
      setIsSavingVerification(false);
    }
  }

  function handleSaveContractDetails() {
    if (!managedArtist) {
      return;
    }

    const actorName = 'Label admin';
    const nextContract = hydrateContractDetails({
      ...contractForm,
      versions: contractForm.versions,
    }, managedArtist.profile);
    nextContract.versions = [...(contractDetails?.versions || []), buildContractVersion(nextContract, actorName)];

    patchArtistOverride({
      contract: nextContract,
    });
    setContractForm(nextContract);
    setIsContractDialogOpen(false);
  }

  function handleApplyTemplate(templateId: ArtistContractTemplateId) {
    const template = getTemplateConfig(templateId);
    if (!template || !managedArtist) {
      return;
    }

    setContractForm((current) => ({
      ...current,
      contractType: template.contractType,
      templateId: template.id,
      templateName: template.label,
      commissionRate: template.commissionRate,
      territory: template.territory,
      termSummary: template.termSummary,
      artistLegalName: current.artistLegalName || formatJoinedName(managedArtist.profile),
      rightsDeclaration: {
        ...current.rightsDeclaration,
        territory: template.territory,
      },
    }));
  }

  function handleSignatureStatusChange(status: NonNullable<ArtistContractDetails['signatureIntegration']>['status']) {
    setContractForm((current) => {
      const signatureIntegration = current.signatureIntegration;
      if (!signatureIntegration) {
        return current;
      }

      return {
        ...current,
        signatureIntegration: {
          ...signatureIntegration,
          status,
          sentAt: status === 'sent' && !signatureIntegration.sentAt ? new Date().toISOString() : signatureIntegration.sentAt,
          lastSyncedAt: new Date().toISOString(),
        },
      };
    });
  }

  function handleSignerStatusChange(signerId: string, status: NonNullable<ArtistContractDetails['signatureIntegration']>['signers'][number]['status']) {
    setContractForm((current) => {
      const signatureIntegration = current.signatureIntegration;
      if (!signatureIntegration) {
        return current;
      }

      return {
        ...current,
        signatureIntegration: {
          ...signatureIntegration,
          lastSyncedAt: new Date().toISOString(),
          signers: signatureIntegration.signers.map((signer) => (
            signer.id === signerId
              ? {
                  ...signer,
                  status,
                  signedAt: status === 'signed' ? new Date().toISOString() : signer.signedAt,
                }
              : signer
          )),
        },
      };
    });
  }

  function handleUploadTaxDocument(fileName: string) {
    if (!managedArtist) {
      return;
    }

    const nextDocument: ArtistTaxDocument = {
      id: crypto.randomUUID(),
      formType: taxFormTypeDraft,
      region: taxRegionDraft.trim() || 'Not specified',
      fileName,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Label admin',
      notes: taxNotesDraft.trim() || undefined,
    };

    patchArtistOverride({
      taxDocuments: [nextDocument, ...taxDocuments],
    });
    setTaxNotesDraft('');
  }

  function handleDeleteTaxDocument(documentId: string) {
    patchArtistOverride({
      taxDocuments: taxDocuments.filter((item) => item.id !== documentId),
    });
  }

  function handleSaveInternalNotes() {
    patchArtistOverride({
      internalNotes: internalNotesDraft.trim(),
    });
  }

  function handleConfirmArchive() {
    if (!managedArtist) {
      return;
    }

    patchArtistOverride({
      archived: !managedArtist.archived,
      status: managedArtist.archived ? 'active' : 'inactive',
    });
    setIsArchiveDialogOpen(false);
  }

  async function handleConfirmRemoval() {
    if (!managedArtist) {
      return;
    }

    try {
      setIsSavingManagement(true);
      setErrorMessage(null);
      await removeLabelArtist(managedArtist.id, retentionOption, removeReason.trim() || undefined);
      patchArtistOverride({
        removal: {
          retentionOption,
          reason: removeReason.trim() || undefined,
          removedAt: new Date().toISOString(),
        },
      });
      setIsRemoveDialogOpen(false);
      navigate('/label-dashboard/artists');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to remove artist from roster.');
    } finally {
      setIsSavingManagement(false);
    }
  }

  if (isLoading) {
    return <div className="space-y-6 p-4 text-[#B3B3B3] lg:p-8">Loading artist detail...</div>;
  }

  if (errorMessage) {
    return <div className="space-y-6 p-4 text-red-200 lg:p-8">{errorMessage}</div>;
  }

  if (!managedArtist) {
    return (
      <div className="space-y-6 p-4 lg:p-8">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
          <h1 className="text-2xl font-semibold">Artist not found</h1>
          <p className="mt-2 text-sm text-[#B3B3B3]">This artist is no longer available in the current label roster.</p>
          <Button type="button" className="mt-4 bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={() => navigate('/label-dashboard/artists')}>
            Back to Artist List
          </Button>
        </Card>
      </div>
    );
  }

  const verificationBadge = verificationSnapshot ? getArtistVerificationBadge(verificationSnapshot.status) : null;
  const profileGenres = managedArtist.profile.genres && managedArtist.profile.genres.length > 0
    ? managedArtist.profile.genres
    : managedArtist.genres;

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button asChild variant="outline" className="mb-4 border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]">
            <Link to="/label-dashboard/artists">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Artist List
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#FFD9BF]">
            <UserCircle2 className="h-3.5 w-3.5 text-[#FFD600]" />
            Artist detail
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-white">{managedArtist.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#B3B3B3]">
            Label-side management view for roster health, campaign assignment, and recent commercial performance.
          </p>
        </div>

        <Button asChild className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]">
          <Link to="/label-dashboard/artists">
            Manage in Roster
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden border-[#FF6B00]/20 bg-[#161616] text-white">
        <div className="relative h-40 overflow-hidden bg-[linear-gradient(135deg,rgba(255,107,0,0.28),rgba(10,10,10,0.92))] sm:h-48">
          {managedArtist.profile.bannerImage ? (
            <ImageWithFallback src={managedArtist.profile.bannerImage} alt={`${managedArtist.name} banner`} className="h-full w-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/30 to-transparent" />
        </div>
        <div className="relative px-4 pb-6 sm:px-6">
          <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#161616] bg-[#0A0A0A] text-2xl font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:h-28 sm:w-28">
                {managedArtist.avatar ? (
                  <ImageWithFallback src={managedArtist.avatar} alt={`${managedArtist.name} avatar`} className="h-full w-full object-cover" />
                ) : (
                  <span>{getArtistInitials(managedArtist.name) || 'AR'}</span>
                )}
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-2xl font-semibold">{managedArtist.name}</h2>
                  <Badge className={managedArtist.status === 'active' ? 'border border-[#1DB954]/20 bg-[#1DB954]/10 text-[#B8FFD0]' : 'border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FFD9BF]'}>
                    {managedArtist.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                  {verificationBadge ? (
                    <Badge className={verificationBadge.className}>
                      {renderVerificationIcon(verificationSnapshot!.status)}
                      <span className="ml-1">{verificationBadge.label}</span>
                    </Badge>
                  ) : null}
                  {managedArtist.archived ? <Badge className="border border-white/10 bg-white/5 text-[#B3B3B3]">Archived</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-[#D5D5D5]">{managedArtist.email}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {performanceCards.map((card) => (
          <Card key={card.label} className="border-[#FF6B00]/20 bg-[#161616] p-4 text-white">
            <div className="text-xs uppercase tracking-[0.18em] text-[#888]">{card.label}</div>
            <div className="mt-2 text-[1.55rem] font-semibold text-white">{card.value}</div>
            <p className="mt-1 text-sm text-[#B3B3B3]">{card.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <Music className="h-4 w-4 text-[#FF6B00]" />
            Profile Summary
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="flex items-center gap-2 text-sm text-[#B3B3B3]">
                <Mail className="h-4 w-4 text-[#FF6B00]" />
                Contact
              </div>
              <div className="mt-2 text-sm text-white">{managedArtist.email}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="flex items-center gap-2 text-sm text-[#B3B3B3]">
                <UserCircle2 className="h-4 w-4 text-[#FF6B00]" />
                Legal Name
              </div>
              <div className="mt-2 text-sm text-white">{formatJoinedName(managedArtist.profile)}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="flex items-center gap-2 text-sm text-[#B3B3B3]">
                <MapPin className="h-4 w-4 text-[#FF6B00]" />
                Territory
              </div>
              <div className="mt-2 text-sm text-white">{managedArtist.profile.country || 'Not specified'}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="flex items-center gap-2 text-sm text-[#B3B3B3]">
                <Radio className="h-4 w-4 text-[#FF6B00]" />
                Genres
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {profileGenres.map((genre) => (
                  <Badge key={genre} className="border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FFD9BF]">{genre}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
            <div className="text-sm text-[#B3B3B3]">Bio</div>
            <p className="mt-2 text-sm text-white">{managedArtist.profile.bio || 'No bio has been added for this artist yet.'}</p>
          </div>
          <div className="mt-4 rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
            <div className="text-sm text-[#B3B3B3]">Social Links</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {socialLinks.map((link) => (
                <div key={link.key} className="rounded-xl border border-white/10 bg-[#111111] p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#888]">{link.label}</div>
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm text-[#FFD9BF] transition hover:text-white"
                    >
                      Open profile
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <div className="mt-2 text-sm text-[#B3B3B3]">Not added</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <BarChart3 className="h-4 w-4 text-[#FF6B00]" />
            Verification Process
          </div>
          <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-[#B3B3B3]">Verification Status</div>
                <div className="mt-2 flex items-center gap-2 text-sm text-white">
                  {verificationSnapshot ? renderVerificationIcon(verificationSnapshot.status) : null}
                  <span>{verificationBadge?.label || 'Unverified'}</span>
                </div>
              </div>
              {verificationBadge ? <Badge className={verificationBadge.className}>{verificationBadge.label}</Badge> : null}
            </div>
            <p className="mt-3 text-sm text-[#B3B3B3]">
              Verification is granted after email confirmation and profile review. ID verification remains optional for label-managed artists.
            </p>
          </div>
          <div className="space-y-3">
            {verificationStages.map((stage) => (
              <div key={stage.key} className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      {stage.complete ? <CheckCircle2 className="h-4 w-4 text-[#63A4FF]" /> : stage.optional ? <Clock3 className="h-4 w-4 text-[#FFCC66]" /> : <Circle className="h-4 w-4 text-[#888]" />}
                      {stage.label}
                      {stage.optional ? <span className="text-xs font-normal uppercase tracking-[0.18em] text-[#FFCC66]">Optional</span> : null}
                    </div>
                    <div className="mt-2 text-sm text-[#B3B3B3]">{stage.description}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSavingVerification}
                    className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]"
                    onClick={() => handleVerificationUpdate(stage.key, !stage.complete)}
                  >
                    {stage.complete ? 'Undo' : stage.key === 'profileReviewed' ? 'Mark Reviewed' : stage.key === 'idVerified' ? 'Verify ID' : 'Confirm'}
                  </Button>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="flex items-center gap-2 text-sm text-[#B3B3B3]">
                <Megaphone className="h-4 w-4 text-[#FF6B00]" />
                Campaign Assignment
              </div>
              <div className="mt-2 text-sm text-white">{managedArtist.campaignName || 'No campaign assigned'}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="text-sm text-[#B3B3B3]">Account Tier</div>
              <div className="mt-2 text-sm text-white capitalize">{managedArtist.profile.subscriptionTier}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="text-sm text-[#B3B3B3]">Verification</div>
              <div className="mt-2 text-sm text-white">{verificationBadge?.label || 'Unverified'} artist profile</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="text-sm text-[#B3B3B3]">Profile Created</div>
              <div className="mt-2 text-sm text-white">{new Date(managedArtist.profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#FFD9BF]">
              <Shield className="h-4 w-4 text-[#FF6B00]" />
              Contract Workspace
            </div>
            <Badge className="border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FFD9BF]">
              {formatTemplateLabel(contractDetails?.templateId)}
            </Badge>
          </div>
          {contractDetails ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                  <div className="text-sm text-[#B3B3B3]">Contract Type</div>
                  <div className="mt-2 text-sm font-medium text-white">{formatContractType(contractDetails.contractType)}</div>
                </div>
                <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                  <div className="text-sm text-[#B3B3B3]">Commission</div>
                  <div className="mt-2 text-sm font-medium text-white">{contractDetails.commissionRate}%</div>
                </div>
                <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                  <div className="text-sm text-[#B3B3B3]">Renewal</div>
                  <div className="mt-2 text-sm font-medium text-white">{formatRenewalStatus(contractDetails.renewalStatus)}</div>
                </div>
                <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                  <div className="text-sm text-[#B3B3B3]">Start Date</div>
                  <div className="mt-2 text-sm text-white">{contractDetails.startDate || 'Not set'}</div>
                </div>
                <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                  <div className="text-sm text-[#B3B3B3]">End Date</div>
                  <div className="mt-2 text-sm text-white">{contractDetails.endDate || 'Open-ended'}</div>
                </div>
                <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                  <div className="text-sm text-[#B3B3B3]">Rights Declaration</div>
                  <div className="mt-2 text-sm text-white">
                    {contractDetails.rightsDeclaration?.confirmed ? 'Confirmed' : 'Awaiting confirmation'}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-[#B3B3B3]">Builder Summary</div>
                    <div className="mt-2 text-sm font-medium text-white">{contractDetails.termSummary || 'No term summary added yet.'}</div>
                  </div>
                  <Badge className="border border-white/10 bg-white/5 text-[#D5D5D5]">
                    Territory: {contractDetails.territory || 'Not set'}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-[#111111] p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Label Info</div>
                    <div className="mt-2 text-sm text-white">{contractDetails.labelEntityName || 'Label legal entity not set'}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#111111] p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Artist Info</div>
                    <div className="mt-2 text-sm text-white">{contractDetails.artistLegalName || formatJoinedName(managedArtist.profile)}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm text-[#FFD9BF]">
                    <CalendarClock className="h-4 w-4 text-[#FF6B00]" />
                    Expiration Alerts
                  </div>
                  <div className="space-y-2">
                    {expirationAlerts.length === 0 ? (
                      <div className="text-sm text-[#B3B3B3]">No expiration alert schedule is configured.</div>
                    ) : expirationAlerts.map((alert) => (
                      <div key={alert.days} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-[#111111] px-3 py-2">
                        <div>
                          <div className="text-sm text-white">{alert.days}-day notice</div>
                          <div className="mt-1 text-xs text-[#B3B3B3]">{alert.message}</div>
                        </div>
                        <Badge className={alert.status === 'due' ? 'border border-[#FFD600]/20 bg-[#FFD600]/10 text-[#FFE88A]' : alert.status === 'passed' ? 'border border-red-500/20 bg-red-500/10 text-red-200' : 'border border-[#1DB954]/20 bg-[#1DB954]/10 text-[#B8FFD0]'}>
                          {alert.status === 'due' ? 'Notify' : alert.status === 'passed' ? 'Expired' : 'Scheduled'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm text-[#FFD9BF]">
                    <AlertTriangle className="h-4 w-4 text-[#FF6B00]" />
                    Renewal Workflow
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#B3B3B3]">Mode</span>
                      <span className="text-white capitalize">{(contractDetails.renewalWorkflow?.mode || 'prompt-new-terms').replaceAll('-', ' ')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#B3B3B3]">Owner</span>
                      <span className="text-white capitalize">{contractDetails.renewalWorkflow?.owner}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#B3B3B3]">Notice Window</span>
                      <span className="text-white">{contractDetails.renewalWorkflow?.noticeDays || 0} days</span>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-[#111111] p-3 text-[#D5D5D5]">
                      {contractDetails.renewalWorkflow?.nextActionNote || 'No renewal action note added yet.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={() => setIsContractDialogOpen(true)}>
                  Edit Contract Builder
                </Button>
                {contractDetails.signatureIntegration?.signingUrl ? (
                  <Button asChild type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]">
                    <a href={contractDetails.signatureIntegration.signingUrl} target="_blank" rel="noreferrer">
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Open Signing Link
                    </a>
                  </Button>
                ) : null}
                {contractDetails.pdfUrl ? (
                  <Button asChild type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]">
                    <a href={contractDetails.pdfUrl} target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Contract PDF
                    </a>
                  </Button>
                ) : (
                  <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#B3B3B3]">
                    No contract PDF attached yet
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <FileText className="h-4 w-4 text-[#FF6B00]" />
            Tax And Compliance
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="text-sm text-[#B3B3B3]">Tax Form Collection</div>
              <div className="mt-3 grid gap-3">
                <select
                  aria-label="Tax form type"
                  value={taxFormTypeDraft}
                  onChange={(event) => setTaxFormTypeDraft(event.target.value as ArtistTaxFormType)}
                  className="h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white"
                >
                  <option value="W-9">W-9</option>
                  <option value="1099">1099</option>
                  <option value="W-8BEN">W-8BEN</option>
                  <option value="VAT Certificate">VAT Certificate</option>
                  <option value="GST Declaration">GST Declaration</option>
                  <option value="Other">Other regional form</option>
                </select>
                <Input
                  value={taxRegionDraft}
                  onChange={(event) => setTaxRegionDraft(event.target.value)}
                  placeholder="Region or tax jurisdiction"
                  className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
                />
                <Textarea
                  value={taxNotesDraft}
                  onChange={(event) => setTaxNotesDraft(event.target.value)}
                  placeholder="Optional filing notes"
                  className="min-h-[88px] border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
                />
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    handleUploadTaxDocument(file.name);
                    event.target.value = '';
                  }}
                  className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white file:text-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-[#B3B3B3]">Rights Declaration</div>
                <Badge className={contractDetails?.rightsDeclaration?.confirmed ? 'border border-[#1DB954]/20 bg-[#1DB954]/10 text-[#B8FFD0]' : 'border border-[#FFD600]/20 bg-[#FFD600]/10 text-[#FFE88A]'}>
                  {contractDetails?.rightsDeclaration?.confirmed ? 'Confirmed' : 'Pending'}
                </Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="text-white">{contractDetails?.rightsDeclaration?.ownershipSummary || 'Ownership summary not added yet.'}</div>
                <div className="text-[#B3B3B3]">Territory: {contractDetails?.rightsDeclaration?.territory || 'Not specified'}</div>
                <div className="text-[#B3B3B3]">Confirmed by: {contractDetails?.rightsDeclaration?.confirmedBy || 'Not set'}</div>
              </div>
            </div>

            <div className="space-y-2">
              {taxDocuments.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[#B3B3B3]">
                  No tax forms uploaded for this artist yet.
                </div>
              ) : taxDocuments.map((document) => (
                <div key={document.id} className="rounded-xl border border-white/10 bg-[#111111] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{document.formType} • {document.fileName}</div>
                      <div className="mt-1 text-xs text-[#B3B3B3]">
                        {document.region} • Uploaded {new Date(document.uploadedAt).toLocaleDateString()} by {document.uploadedBy}
                      </div>
                      {document.notes ? <div className="mt-2 text-xs text-[#D5D5D5]">{document.notes}</div> : null}
                    </div>
                    <Button type="button" size="sm" variant="outline" className="border-red-500/20 bg-transparent text-red-200 hover:bg-red-500/10" onClick={() => handleDeleteTaxDocument(document.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <FileText className="h-4 w-4 text-[#FF6B00]" />
            Contract Template Library
          </div>
          <div className="space-y-3">
            {CONTRACT_TEMPLATE_LIBRARY.map((template) => (
              <div key={template.id} className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{template.label}</div>
                    <div className="mt-1 text-sm text-[#B3B3B3]">{template.description}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[#888]">{template.commissionRate}% commission • {template.territory}</div>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={() => handleApplyTemplate(template.id)}>
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {templatePreview ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Current Template Preview</div>
              <div className="mt-2 text-sm font-medium text-white">{templatePreview.label}</div>
              <div className="mt-2 text-sm text-[#D5D5D5]">{templatePreview.termSummary}</div>
            </div>
          ) : null}
        </Card>

        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <BadgeCheck className="h-4 w-4 text-[#FF6B00]" />
            E-Signature And Version Tracking
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-[#B3B3B3]">Signature Provider</div>
                  <div className="mt-2 text-sm font-medium text-white">{formatESignProvider(contractDetails?.signatureIntegration?.provider || 'docusign')}</div>
                </div>
                <Badge className={contractDetails?.signatureIntegration?.status === 'signed' ? 'border border-[#1DB954]/20 bg-[#1DB954]/10 text-[#B8FFD0]' : contractDetails?.signatureIntegration?.status === 'sent' || contractDetails?.signatureIntegration?.status === 'partially-signed' ? 'border border-[#FFD600]/20 bg-[#FFD600]/10 text-[#FFE88A]' : 'border border-white/10 bg-white/5 text-[#D5D5D5]'}>
                  {contractDetails?.signatureIntegration?.status || 'draft'}
                </Badge>
              </div>
              <div className="mt-3 space-y-2">
                {(contractDetails?.signatureIntegration?.signers || []).map((signer) => (
                  <div key={signer.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111111] px-3 py-2">
                    <div>
                      <div className="text-sm text-white">{signer.name}</div>
                      <div className="text-xs text-[#B3B3B3]">{signer.role}{signer.email ? ` • ${signer.email}` : ''}</div>
                    </div>
                    <Badge className={signer.status === 'signed' ? 'border border-[#1DB954]/20 bg-[#1DB954]/10 text-[#B8FFD0]' : signer.status === 'declined' ? 'border border-red-500/20 bg-red-500/10 text-red-200' : 'border border-[#FFD600]/20 bg-[#FFD600]/10 text-[#FFE88A]'}>
                      {signer.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="text-sm text-[#B3B3B3]">Contract Versions</div>
              <div className="mt-3 space-y-2">
                {versionHistory.length === 0 ? (
                  <div className="text-sm text-[#B3B3B3]">Save the contract builder to create the first tracked version.</div>
                ) : versionHistory.map((version) => (
                  <div key={version.id} className="rounded-lg border border-white/10 bg-[#111111] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{version.versionLabel} • {formatTemplateLabel(version.templateId)}</div>
                        <div className="mt-1 text-xs text-[#B3B3B3]">
                          {new Date(version.createdAt).toLocaleDateString()} • Created by {version.createdBy}
                        </div>
                      </div>
                      <Badge className="border border-white/10 bg-white/5 text-[#D5D5D5]">
                        {version.signedBy.length > 0 ? version.signedBy.join(', ') : 'Awaiting signatures'}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm text-[#D5D5D5]">{version.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <AlertTriangle className="h-4 w-4 text-[#FF6B00]" />
            Dispute Resolution
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-[#B3B3B3]">Current Status</div>
                <Badge className={contractDetails?.disputeResolution?.status === 'resolved' ? 'border border-[#1DB954]/20 bg-[#1DB954]/10 text-[#B8FFD0]' : contractDetails?.disputeResolution?.status === 'open' || contractDetails?.disputeResolution?.status === 'in-mediation' ? 'border border-[#FFD600]/20 bg-[#FFD600]/10 text-[#FFE88A]' : 'border border-white/10 bg-white/5 text-[#D5D5D5]'}>
                  {formatDisputeStatus(contractDetails?.disputeResolution?.status || 'none')}
                </Badge>
              </div>
              <div className="mt-3 text-sm text-white">{contractDetails?.disputeResolution?.notes || 'No issue log has been added.'}</div>
              <div className="mt-3 text-xs text-[#B3B3B3]">
                Preferred channel: {contractDetails?.disputeResolution?.preferredChannel || 'email'}
                {contractDetails?.disputeResolution?.escalationContact ? ` • Escalation: ${contractDetails.disputeResolution.escalationContact}` : ''}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[#D5D5D5]">
              Use the contract builder to document issue notes, set the communication path, and track mediation or resolution state with the artist.
            </div>
          </div>
        </Card>

        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <StickyNote className="h-4 w-4 text-[#FF6B00]" />
            Internal Notes
          </div>
          <Textarea
            value={internalNotesDraft}
            onChange={(event) => setInternalNotesDraft(event.target.value)}
            placeholder="Add private label notes about the artist. These notes are not visible to the artist."
            className="min-h-[140px] border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-[#B3B3B3]">Saved privately for label-side artist management only.</p>
            <Button type="button" className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={handleSaveInternalNotes}>
              Save Notes
            </Button>
          </div>
          {internalNotes && !internalNotesDraft ? (
            <p className="mt-3 text-sm text-[#B3B3B3]">Notes saved.</p>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <Archive className="h-4 w-4 text-[#FF6B00]" />
            Archive Artist
          </div>
          <p className="text-sm text-[#B3B3B3]">
            Archive this artist to remove them from the active roster while retaining contract notes, verification history, and reporting context.
          </p>
          <Button type="button" variant="outline" className="mt-4 border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={() => setIsArchiveDialogOpen(true)}>
            {managedArtist.archived ? 'Restore Artist' : 'Archive Artist'}
          </Button>
        </Card>

        <Card className="border-red-500/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-red-300">
            <Trash2 className="h-4 w-4 text-red-400" />
            Remove From Roster
          </div>
          <p className="text-sm text-[#B3B3B3]">
            Remove this artist from the current label roster with an explicit data retention choice for the label workflow.
          </p>
          <Button type="button" variant="outline" className="mt-4 border-red-500/20 bg-transparent text-red-300 hover:bg-red-500/10" onClick={() => setIsRemoveDialogOpen(true)}>
            Remove Artist
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <CalendarClock className="h-4 w-4 text-[#FF6B00]" />
            Release History
          </div>
          <div className="space-y-3">
            {releaseHistory.length === 0 ? (
              <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4 text-sm text-[#B3B3B3]">
                No releases uploaded under this label account match this artist yet.
              </div>
            ) : releaseHistory.map((release) => (
              <div key={release.id} className="flex items-center gap-3 rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6B00]/10 text-[#FFD9BF]">
                  <Music className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white">{release.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#B3B3B3]">
                    <span>{release.type.toUpperCase()}</span>
                    <span className="h-1 w-1 rounded-full bg-[#555]" />
                    <span>{release.genre}</span>
                    <span className="h-1 w-1 rounded-full bg-[#555]" />
                    <span>{formatReleaseDate(release.releaseDate)}</span>
                  </div>
                </div>
                <Badge className={release.status === 'live' ? 'border border-[#1DB954]/20 bg-[#1DB954]/10 text-[#B8FFD0]' : 'border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FFD9BF]'}>
                  {release.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
          <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
            <CreditCard className="h-4 w-4 text-[#FF6B00]" />
            Payout History
          </div>
          <div className="space-y-3">
            {payoutHistory.length === 0 ? (
              <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4 text-sm text-[#B3B3B3]">
                No artist-specific payout history is exposed yet for label-uploaded data on this screen.
              </div>
            ) : payoutHistory.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{entry.periodLabel}</div>
                    <div className="mt-1 text-xs text-[#B3B3B3]">Requested {entry.requestDate}</div>
                  </div>
                  <Badge className={entry.status === 'paid' ? 'border border-[#1DB954]/20 bg-[#1DB954]/10 text-[#B8FFD0]' : 'border border-[#FFD600]/20 bg-[#FFD600]/10 text-[#FFE88A]'}>
                    {entry.status}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[#888]">Gross Share</div>
                    <div className="mt-1 font-medium text-white">{formatCurrency(entry.gross)}</div>
                  </div>
                  <div>
                    <div className="text-[#888]">Net Payout</div>
                    <div className="mt-1 font-medium text-white">{formatCurrency(entry.net)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[#888]">
            This view excludes artist-side payout activity and only shows payout data when label-uploaded artist-specific records are available.
          </p>
        </Card>
      </div>

      <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
        <DialogContent className="border-[#FF6B00]/20 bg-[#161616] text-white">
          <DialogHeader>
            <DialogTitle>Contract Builder</DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              Customize template terms, contract parties, signature flow, rights confirmation, renewal settings, and dispute escalation.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="templateId" className="text-[#B3B3B3]">Template</Label>
                <select id="templateId" aria-label="Contract Template" value={contractForm.templateId || 'custom'} onChange={(event) => handleApplyTemplate(event.target.value as ArtistContractTemplateId)} className="mt-2 w-full rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white outline-none">
                  {CONTRACT_TEMPLATE_LIBRARY.map((template) => (
                    <option key={template.id} value={template.id}>{template.label}</option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <Label htmlFor="contractType" className="text-[#B3B3B3]">Contract Type</Label>
                <select id="contractType" aria-label="Contract Type" title="Contract Type" value={contractForm.contractType} onChange={(event) => setContractForm((current) => ({ ...current, contractType: event.target.value as ArtistContractDetails['contractType'] }))} className="mt-2 w-full rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white outline-none">
                  <option value="distribution">Distribution</option>
                  <option value="label-services">Label Services</option>
                  <option value="licensing">Licensing</option>
                  <option value="exclusive">Exclusive</option>
                  <option value="non-exclusive">Non-Exclusive</option>
                  <option value="featured-artist">Featured Artist</option>
                  <option value="producer">Producer</option>
                </select>
              </div>
              <div>
                <Label htmlFor="labelEntityName" className="text-[#B3B3B3]">Label Entity</Label>
                <Input id="labelEntityName" value={contractForm.labelEntityName || ''} onChange={(event) => setContractForm((current) => ({ ...current, labelEntityName: event.target.value }))} className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
              </div>
              <div>
                <Label htmlFor="artistLegalName" className="text-[#B3B3B3]">Artist Legal Name</Label>
                <Input id="artistLegalName" value={contractForm.artistLegalName || ''} onChange={(event) => setContractForm((current) => ({ ...current, artistLegalName: event.target.value }))} className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
              </div>
              <div>
                <Label htmlFor="commissionRate" className="text-[#B3B3B3]">Commission %</Label>
                <Input id="commissionRate" type="number" min="0" max="100" value={contractForm.commissionRate} onChange={(event) => setContractForm((current) => ({ ...current, commissionRate: Number(event.target.value) || 0 }))} className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
              </div>
              <div>
                <Label htmlFor="contractTerritory" className="text-[#B3B3B3]">Territory</Label>
                <Input id="contractTerritory" value={contractForm.territory || ''} onChange={(event) => setContractForm((current) => ({ ...current, territory: event.target.value, rightsDeclaration: { ...current.rightsDeclaration, territory: event.target.value } }))} className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
              </div>
              <div>
                <Label htmlFor="contractStartDate" className="text-[#B3B3B3]">Start Date</Label>
                <Input id="contractStartDate" type="date" value={contractForm.startDate || ''} onChange={(event) => setContractForm((current) => ({ ...current, startDate: event.target.value || undefined }))} className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
              </div>
              <div>
                <Label htmlFor="contractEndDate" className="text-[#B3B3B3]">End Date</Label>
                <Input id="contractEndDate" type="date" value={contractForm.endDate || ''} onChange={(event) => setContractForm((current) => ({ ...current, endDate: event.target.value || undefined, renewalWorkflow: { ...current.renewalWorkflow, nextActionDate: event.target.value || current.renewalWorkflow?.nextActionDate } }))} className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
              </div>
              <div>
                <Label htmlFor="renewalStatus" className="text-[#B3B3B3]">Renewal Status</Label>
                <select id="renewalStatus" aria-label="Renewal Status" title="Renewal Status" value={contractForm.renewalStatus} onChange={(event) => setContractForm((current) => ({ ...current, renewalStatus: event.target.value as ArtistContractDetails['renewalStatus'] }))} className="mt-2 w-full rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white outline-none">
                  <option value="active">Active</option>
                  <option value="renewal-due">Renewal Due</option>
                  <option value="auto-renew">Auto Renew</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="contractTerms" className="text-[#B3B3B3]">Terms Summary</Label>
                <Textarea id="contractTerms" value={contractForm.termSummary || ''} onChange={(event) => setContractForm((current) => ({ ...current, termSummary: event.target.value }))} className="mt-2 min-h-[96px] border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="contractPdfUrl" className="text-[#B3B3B3]">Contract PDF URL</Label>
                <Input id="contractPdfUrl" type="url" value={contractForm.pdfUrl || ''} onChange={(event) => setContractForm((current) => ({ ...current, pdfUrl: event.target.value }))} placeholder="https://.../contract.pdf" className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]" />
              </div>
            </div>

            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="mb-3 text-sm font-medium text-white">E-Signature Integration</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="signatureProvider" className="text-[#B3B3B3]">Provider</Label>
                  <select id="signatureProvider" aria-label="E-signature provider" value={contractForm.signatureIntegration?.provider || 'docusign'} onChange={(event) => setContractForm((current) => ({ ...current, signatureIntegration: { ...current.signatureIntegration!, provider: event.target.value as ArtistESignProvider } }))} className="mt-2 w-full rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white outline-none">
                    <option value="docusign">DocuSign</option>
                    <option value="hellosign">HelloSign</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="signatureStatus" className="text-[#B3B3B3]">Signing Status</Label>
                  <select id="signatureStatus" aria-label="Signing Status" value={contractForm.signatureIntegration?.status || 'draft'} onChange={(event) => handleSignatureStatusChange(event.target.value as NonNullable<ArtistContractDetails['signatureIntegration']>['status'])} className="mt-2 w-full rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-white outline-none">
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="partially-signed">Partially Signed</option>
                    <option value="signed">Signed</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="signingUrl" className="text-[#B3B3B3]">Signing URL</Label>
                  <Input id="signingUrl" type="url" value={contractForm.signatureIntegration?.signingUrl || ''} onChange={(event) => setContractForm((current) => ({ ...current, signatureIntegration: { ...current.signatureIntegration!, signingUrl: event.target.value } }))} className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
                </div>
                <div>
                  <Label htmlFor="envelopeId" className="text-[#B3B3B3]">Envelope ID</Label>
                  <Input id="envelopeId" value={contractForm.signatureIntegration?.envelopeId || ''} onChange={(event) => setContractForm((current) => ({ ...current, signatureIntegration: { ...current.signatureIntegration!, envelopeId: event.target.value } }))} className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {(contractForm.signatureIntegration?.signers || []).map((signer) => (
                  <div key={signer.id} className="grid gap-3 rounded-lg border border-white/10 bg-[#111111] p-3 sm:grid-cols-[1fr_180px] sm:items-center">
                    <div>
                      <div className="text-sm text-white">{signer.name}</div>
                      <div className="text-xs text-[#B3B3B3]">{signer.role}{signer.email ? ` • ${signer.email}` : ''}</div>
                    </div>
                    <select aria-label={`${signer.name} signing state`} value={signer.status} onChange={(event) => handleSignerStatusChange(signer.id, event.target.value as NonNullable<ArtistContractDetails['signatureIntegration']>['signers'][number]['status'])} className="h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white">
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="signed">Signed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                <div className="mb-3 text-sm font-medium text-white">Rights Declaration</div>
                <label className="flex items-center gap-3 text-sm text-white">
                  <Checkbox
                    checked={Boolean(contractForm.rightsDeclaration?.confirmed)}
                    onCheckedChange={(checked) => setContractForm((current) => ({
                      ...current,
                      rightsDeclaration: {
                        ...current.rightsDeclaration,
                        confirmed: Boolean(checked),
                        confirmedAt: checked ? new Date().toISOString() : '',
                      },
                    }))}
                    className="border-[#FF6B00]/30 data-[state=checked]:border-[#FF6B00] data-[state=checked]:bg-[#FF6B00]"
                  />
                  I confirm the label and artist have the rights to distribute the contracted music.
                </label>
                <div className="mt-3 grid gap-3">
                  <select aria-label="Rights confirmed by" value={contractForm.rightsDeclaration?.confirmedBy || 'both'} onChange={(event) => setContractForm((current) => ({ ...current, rightsDeclaration: { ...current.rightsDeclaration, confirmedBy: event.target.value as NonNullable<ArtistContractDetails['rightsDeclaration']>['confirmedBy'] } }))} className="h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white">
                    <option value="label">Label</option>
                    <option value="artist">Artist</option>
                    <option value="both">Both</option>
                  </select>
                  <Textarea value={contractForm.rightsDeclaration?.ownershipSummary || ''} onChange={(event) => setContractForm((current) => ({ ...current, rightsDeclaration: { ...current.rightsDeclaration, ownershipSummary: event.target.value } }))} placeholder="Describe ownership, approvals, and chain of title." className="min-h-[88px] border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]" />
                </div>
              </div>

              <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                <div className="mb-3 text-sm font-medium text-white">Renewal And Alerts</div>
                <div className="grid gap-3">
                  <select aria-label="Renewal workflow mode" value={contractForm.renewalWorkflow?.mode || 'prompt-new-terms'} onChange={(event) => setContractForm((current) => ({ ...current, renewalWorkflow: { ...current.renewalWorkflow, mode: event.target.value as NonNullable<ArtistContractDetails['renewalWorkflow']>['mode'] } }))} className="h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white">
                    <option value="auto-renew">Auto-Renew</option>
                    <option value="prompt-new-terms">Prompt New Terms</option>
                    <option value="manual-renewal">Manual Renewal</option>
                  </select>
                  <Input type="number" min="1" max="365" value={contractForm.renewalWorkflow?.noticeDays || 60} onChange={(event) => setContractForm((current) => ({ ...current, renewalWorkflow: { ...current.renewalWorkflow, noticeDays: Number(event.target.value) || 0 } }))} placeholder="Notice days" className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
                  <select aria-label="Renewal owner" value={contractForm.renewalWorkflow?.owner || 'shared'} onChange={(event) => setContractForm((current) => ({ ...current, renewalWorkflow: { ...current.renewalWorkflow, owner: event.target.value as NonNullable<ArtistContractDetails['renewalWorkflow']>['owner'] } }))} className="h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white">
                    <option value="label">Label</option>
                    <option value="artist">Artist</option>
                    <option value="shared">Shared</option>
                  </select>
                  <Input type="date" value={contractForm.renewalWorkflow?.nextActionDate || ''} onChange={(event) => setContractForm((current) => ({ ...current, renewalWorkflow: { ...current.renewalWorkflow, nextActionDate: event.target.value } }))} className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
                  <Textarea value={contractForm.renewalWorkflow?.nextActionNote || ''} onChange={(event) => setContractForm((current) => ({ ...current, renewalWorkflow: { ...current.renewalWorkflow, nextActionNote: event.target.value } }))} placeholder="What should happen before expiry?" className="min-h-[88px] border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]" />
                  <div className="space-y-2 rounded-lg border border-white/10 bg-[#111111] p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Alert Windows</div>
                    {[90, 60, 30].map((days) => {
                      const selectedDays = contractForm.expirationAlerts?.daysBefore || [];
                      const checked = selectedDays.includes(days);
                      return (
                        <label key={days} className="flex items-center gap-3 text-sm text-white">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) => setContractForm((current) => {
                              const currentDays = current.expirationAlerts?.daysBefore || [];
                              const nextDays = Boolean(nextChecked)
                                ? [...currentDays, days].sort((left, right) => right - left)
                                : currentDays.filter((value) => value !== days);

                              return {
                                ...current,
                                expirationAlerts: {
                                  enabled: nextDays.length > 0,
                                  daysBefore: nextDays,
                                },
                              };
                            })}
                            className="border-[#FF6B00]/30 data-[state=checked]:border-[#FF6B00] data-[state=checked]:bg-[#FF6B00]"
                          />
                          Notify {days} days before expiration
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="mb-3 text-sm font-medium text-white">Dispute Resolution</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <select aria-label="Dispute status" value={contractForm.disputeResolution?.status || 'none'} onChange={(event) => setContractForm((current) => ({ ...current, disputeResolution: { ...current.disputeResolution, status: event.target.value as NonNullable<ArtistContractDetails['disputeResolution']>['status'], lastUpdatedAt: new Date().toISOString(), openedAt: current.disputeResolution?.openedAt || new Date().toISOString() } }))} className="h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white">
                  <option value="none">No active issue</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="open">Open</option>
                  <option value="in-mediation">In Mediation</option>
                  <option value="resolved">Resolved</option>
                </select>
                <select aria-label="Dispute preferred channel" value={contractForm.disputeResolution?.preferredChannel || 'email'} onChange={(event) => setContractForm((current) => ({ ...current, disputeResolution: { ...current.disputeResolution, preferredChannel: event.target.value as NonNullable<ArtistContractDetails['disputeResolution']>['preferredChannel'], lastUpdatedAt: new Date().toISOString() } }))} className="h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white">
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="portal">Portal</option>
                  <option value="legal-counsel">Legal Counsel</option>
                </select>
                <Input value={contractForm.disputeResolution?.escalationContact || ''} onChange={(event) => setContractForm((current) => ({ ...current, disputeResolution: { ...current.disputeResolution, escalationContact: event.target.value, lastUpdatedAt: new Date().toISOString() } }))} placeholder="Escalation contact" className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white" />
                <div className="text-sm text-[#B3B3B3]">Use this section to document communication tools and next steps if disputes arise.</div>
                <div className="sm:col-span-2">
                  <Textarea value={contractForm.disputeResolution?.notes || ''} onChange={(event) => setContractForm((current) => ({ ...current, disputeResolution: { ...current.disputeResolution, notes: event.target.value, lastUpdatedAt: new Date().toISOString() } }))} placeholder="Issue summary, communication log, and mediation notes" className="min-h-[96px] border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={() => setIsContractDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={handleSaveContractDetails}>
              Save Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="border-[#FF6B00]/20 bg-[#161616] text-white">
          <DialogHeader>
            <DialogTitle>{managedArtist.archived ? 'Restore Artist' : 'Archive Artist'}</DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              {managedArtist.archived
                ? 'Restore this artist to the active roster while keeping their contract details, notes, and verification state.'
                : 'Archive this artist to hide them from the active roster while retaining all contract, notes, and verification data.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={() => setIsArchiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={handleConfirmArchive}>
              {managedArtist.archived ? 'Restore Artist' : 'Confirm Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="border-red-500/20 bg-[#161616] text-white">
          <DialogHeader>
            <DialogTitle>Remove Artist From Roster</DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              Choose how label-side data should be handled when this artist is removed from the roster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="retentionOption" className="text-[#B3B3B3]">Data Retention</Label>
              <select id="retentionOption" aria-label="Data Retention" title="Data Retention" value={retentionOption} onChange={(event) => setRetentionOption(event.target.value as ArtistDataRetentionOption)} className="mt-2 w-full rounded-md border border-red-500/20 bg-[#0A0A0A] px-3 py-2 text-white outline-none">
                <option value="retain-all">Retain all label records</option>
                <option value="retain-financials">Retain only financial and contract records</option>
                <option value="remove-roster-only">Remove roster link only</option>
              </select>
            </div>
            <div>
              <Label htmlFor="removeReason" className="text-[#B3B3B3]">Removal Reason</Label>
              <Textarea id="removeReason" value={removeReason} onChange={(event) => setRemoveReason(event.target.value)} placeholder="Internal reason for removal" className="mt-2 border-red-500/20 bg-[#0A0A0A] text-white placeholder:text-[#666]" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-red-500/20 bg-transparent text-red-300 hover:bg-red-500/10" onClick={() => setIsRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isSavingManagement} className="bg-red-600 text-white hover:bg-red-700" onClick={handleConfirmRemoval}>
              {isSavingManagement ? 'Removing...' : 'Remove Artist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}