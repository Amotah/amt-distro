import type { UserProfile } from './user-api';

export type ArtistVerificationStatus = 'verified' | 'pending' | 'unverified';

export type ArtistVerificationState = NonNullable<UserProfile['verification']>;

export function getArtistVerificationState(profile: UserProfile): {
  status: ArtistVerificationStatus;
  verification: ArtistVerificationState;
} {
  const verification: ArtistVerificationState = {
    emailConfirmed: profile.verification?.emailConfirmed === true,
    idVerified: profile.verification?.idVerified === true,
    idVerificationOptional: profile.verification?.idVerificationOptional !== false,
    profileReviewed: profile.verification?.profileReviewed === true,
    requestedAt: profile.verification?.requestedAt,
    reviewedAt: profile.verification?.reviewedAt,
    reviewNotes: profile.verification?.reviewNotes,
  };

  let status: ArtistVerificationStatus;
  if (profile.verificationStatus) {
    status = profile.verificationStatus;
  } else if (profile.isVerified) {
    status = 'verified';
  } else if (verification.emailConfirmed || verification.profileReviewed || verification.idVerified) {
    status = 'pending';
  } else {
    status = 'unverified';
  }

  if (
    verification.emailConfirmed
    && verification.profileReviewed
    && (verification.idVerified || verification.idVerificationOptional)
  ) {
    status = 'verified';
  }

  return { status, verification };
}

export function getArtistVerificationBadge(status: ArtistVerificationStatus) {
  if (status === 'verified') {
    return {
      label: 'Verified',
      className: 'border border-[#2F80FF]/25 bg-[#2F80FF]/12 text-[#CFE1FF]',
    };
  }

  if (status === 'pending') {
    return {
      label: 'Pending',
      className: 'border border-[#FFB020]/25 bg-[#FFB020]/12 text-[#FFE5A8]',
    };
  }

  return {
    label: 'Unverified',
    className: 'border border-white/10 bg-white/5 text-[#C8C8C8]',
  };
}