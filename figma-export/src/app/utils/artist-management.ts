import type { UserProfile } from './user-api';

export const ARTIST_MANAGEMENT_STORAGE_KEY = 'amtdistro-label-artist-management';

export type ArtistStatus = 'active' | 'inactive';
export type ArtistContractType = 'distribution' | 'label-services' | 'licensing' | 'exclusive' | 'non-exclusive' | 'featured-artist' | 'producer';
export type ArtistContractRenewalStatus = 'active' | 'renewal-due' | 'auto-renew' | 'expired';
export type ArtistDataRetentionOption = 'retain-all' | 'retain-financials' | 'remove-roster-only';
export type ArtistTaxFormType = 'W-9' | '1099' | 'W-8BEN' | 'VAT Certificate' | 'GST Declaration' | 'Other';
export type ArtistContractTemplateId = 'standard-exclusive' | 'standard-non-exclusive' | 'featured-artist' | 'producer' | 'distribution' | 'custom';
export type ArtistESignProvider = 'docusign' | 'hellosign' | 'manual';
export type ArtistESignStatus = 'draft' | 'sent' | 'viewed' | 'partially-signed' | 'signed' | 'declined';
export type ArtistSignerRole = 'label' | 'artist' | 'producer' | 'witness';
export type ArtistRenewalMode = 'auto-renew' | 'prompt-new-terms' | 'manual-renewal';
export type ArtistRenewalOwner = 'label' | 'artist' | 'shared';
export type ArtistDisputeStatus = 'none' | 'monitoring' | 'open' | 'in-mediation' | 'resolved';
export type ArtistDisputeChannel = 'email' | 'phone' | 'portal' | 'legal-counsel';
export type RightsDeclarationConfirmedBy = 'label' | 'artist' | 'both';

export type ArtistTaxDocument = {
  id: string;
  formType: ArtistTaxFormType;
  region: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  notes?: string;
};

export type ArtistContractSigner = {
  id: string;
  role: ArtistSignerRole;
  name: string;
  email?: string;
  status: 'pending' | 'sent' | 'signed' | 'declined';
  signedAt?: string;
};

export type ArtistESignIntegration = {
  provider?: ArtistESignProvider;
  status?: ArtistESignStatus;
  signingUrl?: string;
  envelopeId?: string;
  sentAt?: string;
  lastSyncedAt?: string;
  signers: ArtistContractSigner[];
};

export type ArtistContractVersion = {
  id: string;
  versionLabel: string;
  createdAt: string;
  createdBy: string;
  templateId: ArtistContractTemplateId;
  contractType: ArtistContractType;
  commissionRate: number;
  summary: string;
  signedBy: string[];
};

export type ArtistContractAlertSettings = {
  enabled?: boolean;
  daysBefore?: number[];
};

export type ArtistContractRenewalWorkflow = {
  mode?: ArtistRenewalMode;
  noticeDays?: number;
  owner?: ArtistRenewalOwner;
  nextActionDate?: string;
  nextActionNote?: string;
};

export type ArtistDisputeResolution = {
  status?: ArtistDisputeStatus;
  preferredChannel?: ArtistDisputeChannel;
  escalationContact?: string;
  notes?: string;
  openedAt?: string;
  lastUpdatedAt?: string;
};

export type ArtistRightsDeclaration = {
  confirmed?: boolean;
  confirmedBy?: RightsDeclarationConfirmedBy;
  confirmedAt?: string;
  territory?: string;
  ownershipSummary?: string;
  notes?: string;
};

export type ArtistContractDetails = {
  contractType: ArtistContractType;
  templateId?: ArtistContractTemplateId;
  templateName?: string;
  labelEntityName?: string;
  artistLegalName?: string;
  territory?: string;
  termSummary?: string;
  commissionRate: number;
  startDate?: string;
  endDate?: string;
  renewalStatus: ArtistContractRenewalStatus;
  pdfUrl?: string;
  expirationAlerts?: ArtistContractAlertSettings;
  renewalWorkflow?: ArtistContractRenewalWorkflow;
  signatureIntegration?: ArtistESignIntegration;
  disputeResolution?: ArtistDisputeResolution;
  rightsDeclaration?: ArtistRightsDeclaration;
  versions?: ArtistContractVersion[];
};

export type ArtistRemovalRecord = {
  retentionOption: ArtistDataRetentionOption;
  reason?: string;
  removedAt?: string;
};

export type ArtistManagementOverride = {
  status: ArtistStatus;
  archived: boolean;
  campaignName?: string;
  genres?: string[];
  internalNotes?: string;
  contract?: ArtistContractDetails;
  taxDocuments?: ArtistTaxDocument[];
  removal?: ArtistRemovalRecord;
};

export type ArtistManagementOverrides = Record<string, ArtistManagementOverride>;

export type ManagedArtist = {
  id: string;
  name: string;
  avatar?: string;
  genres: string[];
  streams30d: number;
  revenue30d: number;
  status: ArtistStatus;
  archived: boolean;
  campaignName?: string;
  email: string;
  profile: UserProfile;
};

const genrePools = [
  ['Afrobeats', 'Amapiano'],
  ['Hip-Hop', 'Trap'],
  ['R&B', 'Soul'],
  ['Gospel', 'Inspirational'],
  ['Pop', 'Dance'],
  ['Highlife', 'Afro-Fusion'],
  ['Alternative', 'Indie'],
] as const;

export function getArtistDisplayName(profile: UserProfile) {
  return profile.artistName || profile.username || profile.firstName || profile.email.split('@')[0] || 'Artist';
}

export function getArtistInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function hashValue(input: string) {
  let hash = 0;

  for (const character of input) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2147483647;
  }

  return Math.abs(hash);
}

export function readArtistManagementOverrides() {
  if (typeof window === 'undefined') {
    return {} as ArtistManagementOverrides;
  }

  try {
    const raw = window.localStorage.getItem(ARTIST_MANAGEMENT_STORAGE_KEY);
    if (!raw) {
      return {} as ArtistManagementOverrides;
    }

    const parsed = JSON.parse(raw) as ArtistManagementOverrides;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {} as ArtistManagementOverrides;
  }
}

export function writeArtistManagementOverrides(overrides: ArtistManagementOverrides) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ARTIST_MANAGEMENT_STORAGE_KEY, JSON.stringify(overrides));
}

export function buildManagedArtist(profile: UserProfile, index: number, overrides: ArtistManagementOverrides): ManagedArtist {
  const name = getArtistDisplayName(profile);
  const seed = hashValue(`${profile.id}-${name}-${index}`);
  const baseGenres = genrePools[index % genrePools.length];
  const extraGenre = genrePools[(index + 2) % genrePools.length][0];
  const override = overrides[profile.id];
  const defaultGenres = [baseGenres[0], baseGenres[1], extraGenre].filter((genre, genreIndex, allGenres) => allGenres.indexOf(genre) === genreIndex);

  return {
    id: profile.id,
    name,
    avatar: profile.profileImage,
    genres: override?.genres && override.genres.length > 0 ? override.genres : defaultGenres,
    streams30d: 120000 + (seed % 1250000),
    revenue30d: 45000 + (seed % 850000),
    status: override?.status || (profile.isVerified ? 'active' : 'inactive'),
    archived: override?.archived || false,
    campaignName: override?.campaignName,
    email: profile.email,
    profile,
  };
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCurrency(value: number) {
  return `₦${value.toLocaleString('en-US')}`;
}