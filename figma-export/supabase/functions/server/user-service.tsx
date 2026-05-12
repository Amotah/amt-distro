import * as kv from './kv_store.tsx';

export type UserRole = 'artist' | 'partner' | 'admin';
export type ArtistVerificationStatus = 'verified' | 'pending' | 'unverified';

export interface ArtistVerification {
  emailConfirmed: boolean;
  idVerified: boolean;
  idVerificationOptional: boolean;
  profileReviewed: boolean;
  idDocumentUrl?: string;
  requestNotes?: string;
  requestedAt?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export type ArtistDataRetentionOption = 'retain-all' | 'retain-financials' | 'remove-roster-only';

export interface LabelArtistRemovalRecord {
  artistId: string;
  artistName?: string;
  artistEmail?: string;
  retentionOption: ArtistDataRetentionOption;
  reason?: string;
  removedAt: string;
}

export interface Artist {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  artistName: string;
  email: string;
  country?: string;
  state?: string;
  role: 'artist';
  profileImage?: string;
  bannerImage?: string;
  bio?: string;
  genres?: string[];
  socialLinks?: {
    spotify?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
  };
  verificationStatus: ArtistVerificationStatus;
  verification: ArtistVerification;
  isVerified: boolean;
  subscriptionTier: 'artist' | 'super_artist' | 'partner';
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  labelName: string;
  email: string;
  country?: string;
  state?: string;
  role: 'partner';
  profileImage?: string;
  bannerImage?: string;
  description?: string;
  website?: string;
  artists: string[]; // Array of artist IDs under this label
  removedArtists?: LabelArtistRemovalRecord[];
  isVerified: boolean;
  subscriptionTier: 'partner';
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserProfile {
  id: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  artistName?: string;
  username?: string;
  country?: string;
  state?: string;
  profileImage?: string;
  bannerImage?: string;
  role: 'admin';
  subscriptionTier: 'label';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  canUploadMusic: boolean;
  canManageReleases: boolean;
  canViewAnalytics: boolean;
  canManageArtists: boolean; // Label only
  canWithdrawFunds: boolean;
  canAccessAPI: boolean;
  maxUploadsPerYear?: number;
}

export type User = Artist | Label | AdminUserProfile;

function normalizeArtistVerification(data: {
  verification?: Partial<ArtistVerification>;
  verificationStatus?: ArtistVerificationStatus;
  isVerified?: boolean;
}): { verification: ArtistVerification; verificationStatus: ArtistVerificationStatus; isVerified: boolean } {
  const verification: ArtistVerification = {
    emailConfirmed: data.verification?.emailConfirmed === true,
    idVerified: data.verification?.idVerified === true,
    idVerificationOptional: data.verification?.idVerificationOptional !== false,
    profileReviewed: data.verification?.profileReviewed === true,
    idDocumentUrl: data.verification?.idDocumentUrl,
    requestNotes: data.verification?.requestNotes,
    requestedAt: data.verification?.requestedAt,
    reviewedAt: data.verification?.reviewedAt,
    reviewNotes: data.verification?.reviewNotes,
  };

  let verificationStatus: ArtistVerificationStatus;
  if (data.verificationStatus) {
    verificationStatus = data.verificationStatus;
  } else if (data.isVerified === true) {
    verificationStatus = 'verified';
  } else if (
    verification.emailConfirmed
    || verification.profileReviewed
    || verification.idVerified
    || Boolean(verification.requestedAt)
    || Boolean(verification.requestNotes)
    || Boolean(verification.idDocumentUrl)
  ) {
    verificationStatus = 'pending';
  } else {
    verificationStatus = 'unverified';
  }

  if (
    verification.emailConfirmed
    && verification.profileReviewed
    && (verification.idVerified || verification.idVerificationOptional)
  ) {
    verificationStatus = 'verified';
  }

  return {
    verification,
    verificationStatus,
    isVerified: verificationStatus === 'verified',
  };
}

// Permission presets based on subscription tier
const PERMISSIONS: Record<string, Permission> = {
  free: {
    canUploadMusic: true,
    canManageReleases: true,
    canViewAnalytics: true,
    canManageArtists: false,
    canWithdrawFunds: true,
    maxUploadsPerYear: 2,
    canAccessAPI: false,
  },
  artist: {
    canUploadMusic: true,
    canManageReleases: true,
    canViewAnalytics: true,
    canManageArtists: false,
    canWithdrawFunds: true,
    maxUploadsPerYear: undefined, // Unlimited
    canAccessAPI: false,
  },
  label: {
    canUploadMusic: true,
    canManageReleases: true,
    canViewAnalytics: true,
    canManageArtists: true,
    canWithdrawFunds: true,
    maxUploadsPerYear: undefined, // Unlimited
    canAccessAPI: true,
  },
};

// Create a new artist
export async function createArtist(data: Omit<Artist, 'id' | 'createdAt' | 'updatedAt' | 'role'>): Promise<Artist> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const verificationState = normalizeArtistVerification(data);
  
  const artist: Artist = {
    ...data,
    id,
    role: 'artist',
    verification: verificationState.verification,
    verificationStatus: verificationState.verificationStatus,
    isVerified: verificationState.isVerified,
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`user:${id}`, artist);
  await kv.set(`user:email:${data.email}`, id);
  await kv.set(`user:userId:${data.userId}`, id);

  return artist;
}

// Create a new label
export async function createLabel(data: Omit<Label, 'id' | 'createdAt' | 'updatedAt' | 'role'>): Promise<Label> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const label: Label = {
    ...data,
    id,
    role: 'partner',
    artists: data.artists || [],
    removedArtists: data.removedArtists || [],
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`user:${id}`, label);
  await kv.set(`user:email:${data.email}`, id);
  await kv.set(`user:userId:${data.userId}`, id);

  return label;
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const storedUser = await kv.get(`user:${userId}`);
  return storedUser ? (storedUser as User) : null;
}

export async function deleteUser(userId: string): Promise<User | null> {
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  const keys = [
    `user:${user.id}`,
    `user:email:${user.email}`,
    `user:userId:${user.userId}`,
  ];

  const legacyUsername = (user as any).username as string | undefined;
  if (legacyUsername) {
    keys.push(`user:username:${legacyUsername}`);
  }

  await kv.mdel(keys);
  return user;
}

// Get all users (admin only)
export async function getAllUsers(): Promise<User[]> {
  const userKeys = await kv.getByPrefix('user:');
  const users: User[] = [];
  const seenIds = new Set<string>();

  // Filter to get only main user records (user:{id})
  for (const userData of userKeys) {
    if (userData && typeof userData === 'object' && userData.id && userData.role && !seenIds.has(userData.id)) {
      seenIds.add(userData.id);
      users.push(userData as User);
    }
  }

  return users.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const id = await kv.get(`user:email:${email}`);
  if (!id) return null;
  return await kv.get(`user:${id}`);
}

// Get user by Supabase user ID
export async function getUserByUserId(userId: string): Promise<User | null> {
  const id = await kv.get(`user:userId:${userId}`);
  if (!id) return null;
  return await kv.get(`user:${id}`);
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | null> {
  const userId = await kv.get(`user:username:${username}`);
  if (!userId) return null;
  return await kv.get(`user:${userId}`);
}

// Update user
export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const user = await getUserById(id);
  if (!user) return null;

  // Validate subscriptionTier if it's being updated
  // Valid subscription tiers: 'artist', 'super_artist', 'partner'
  // 'free' is not set via updateUser; it's the default for new accounts
  if (updates.subscriptionTier && !['artist', 'super_artist', 'partner'].includes(updates.subscriptionTier)) {
    console.warn(`Invalid subscriptionTier "${updates.subscriptionTier}" provided to updateUser. Valid values are: artist, super_artist, partner. This may be a one-time transaction type. Removing it from updates.`);
    const validUpdates = { ...updates };
    delete validUpdates.subscriptionTier;
    return updateUser(id, validUpdates);
  }

  let updatedUser: User;

  // Use the incoming role if explicitly changing it, otherwise keep the existing role
  const targetRole = updates.role ?? user.role;

  if (targetRole === 'artist') {
    const nextArtist = {
      ...user,
      ...(updates as Partial<Artist>),
      id: user.id,
      userId: user.userId,
      role: 'artist' as const,
      updatedAt: new Date().toISOString(),
    };
    const verificationState = normalizeArtistVerification(nextArtist);
    const explicitIsVerified = typeof updates.isVerified === 'boolean' ? updates.isVerified : undefined;
    updatedUser = {
      ...nextArtist,
      verification: verificationState.verification,
      verificationStatus: verificationState.verificationStatus,
      // Account suspension uses isVerified as the active flag in admin views;
      // respect an explicit toggle from admin actions instead of overwriting it.
      isVerified: explicitIsVerified ?? verificationState.isVerified,
    };
  } else if (targetRole === 'partner') {
    updatedUser = {
      ...user,
      ...(updates as Partial<Label>),
      id: user.id,
      userId: user.userId,
      role: 'partner',
      updatedAt: new Date().toISOString(),
    };
  } else {
    updatedUser = {
      ...user,
      ...(updates as Partial<AdminUserProfile>),
      id: user.id,
      userId: user.userId,
      role: 'admin',
      updatedAt: new Date().toISOString(),
    };
  }

  await kv.set(`user:${id}`, updatedUser);
  return updatedUser;
}

// Get permissions for a user
export function getUserPermissions(user: User): Permission {
  return PERMISSIONS[user.subscriptionTier];
}

// Add artist to label
export async function addArtistToLabel(labelId: string, artistId: string): Promise<boolean> {
  const label = await getUserById(labelId);
  // Support both role === 'partner' and subscriptionTier === 'partner'
  const isPartner = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
  if (!isPartner) return false;

  const artist = await getUserById(artistId);
  if (!artist || artist.role !== 'artist') return false;

  // Type guard ensures label is Label type
  const labelData = label as Label;
  // Ensure artists array exists and is initialized
  if (!Array.isArray(labelData.artists)) {
    labelData.artists = [];
  }
  if (!labelData.artists.includes(artistId)) {
    labelData.artists.push(artistId);
    await kv.set(`user:${labelId}`, labelData);
  }

  return true;
}

// Remove artist from label
export async function removeArtistFromLabel(
  labelId: string,
  artistId: string,
  removal?: {
    artistName?: string;
    artistEmail?: string;
    retentionOption: ArtistDataRetentionOption;
    reason?: string;
  },
): Promise<boolean> {
  const label = await getUserById(labelId);
  // Support both role === 'partner' and subscriptionTier === 'partner'
  const isPartner = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
  if (!isPartner) return false;

  // Type guard ensures label is Label type
  const labelData = label as Label;
  // Ensure artists array exists and is initialized
  if (!Array.isArray(labelData.artists)) {
    labelData.artists = [];
  }
  labelData.artists = labelData.artists.filter(id => id !== artistId);
  if (removal) {
    const nextRecord: LabelArtistRemovalRecord = {
      artistId,
      artistName: removal.artistName,
      artistEmail: removal.artistEmail,
      retentionOption: removal.retentionOption,
      reason: removal.reason,
      removedAt: new Date().toISOString(),
    };

    labelData.removedArtists = [
      ...(labelData.removedArtists || []).filter((record) => record.artistId !== artistId),
      nextRecord,
    ];
  }

  await kv.set(`user:${labelId}`, labelData);

  return true;
}

// Get all artists for a label
export async function getLabelArtists(labelId: string): Promise<Artist[]> {
  const label = await getUserById(labelId);
  // Support both role === 'partner' and subscriptionTier === 'partner'
  const isPartner = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
  if (!isPartner) return [];

  // Type guard ensures label is Label type
  const labelData = label as Label;
  const artistIds = Array.isArray(labelData.artists) ? labelData.artists : [];
  const artists: Artist[] = [];
  for (const artistId of artistIds) {
    const artist = await getUserById(artistId);
    if (artist && artist.role === 'artist') {
      artists.push(artist as Artist);
    }
  }

  return artists;
}