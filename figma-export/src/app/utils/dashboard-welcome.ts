import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUserProfile, type UserProfile } from './user-api';

type DashboardRole = 'artist' | 'partner';

interface StoredLoginEntry {
  currentLoginAt?: string;
  currentLoginLocation?: string;
  previousLoginAt?: string;
  previousLoginLocation?: string;
}

type StoredLoginMap = Record<string, StoredLoginEntry>;

interface RecordDashboardLoginInput {
  userId: string;
  location?: string;
}

interface DashboardWelcomeData {
  loading: boolean;
  profile: UserProfile | null;
  greeting: string;
  heading: string;
  subtitle: string;
  roleLabel: string;
  displayName: string;
  planLabel: string;
  locationLabel: string;
  currentTimeLabel: string;
  currentDateLabel: string;
  lastLoginLabel: string;
  lastLoginLocationLabel: string;
}

const LOGIN_STORAGE_KEY = 'amtdistro-dashboard-login-history';

function readStoredLogins(): StoredLoginMap {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LOGIN_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as StoredLoginMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredLogins(records: StoredLoginMap) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage failures and keep the dashboard functional.
  }
}

function getFallbackLocation() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) {
      return 'Unknown location';
    }

    const segments = timezone.split('/').filter(Boolean);
    const city = segments[segments.length - 1]?.replace(/_/g, ' ');
    const region = segments.length > 1 ? segments[0].replace(/_/g, ' ') : '';

    if (city && region) {
      return `${city}, ${region}`;
    }

    return city || timezone.replace(/_/g, ' ');
  } catch {
    return 'Unknown location';
  }
}

export function getProfileLocation(profile?: Partial<UserProfile> | null) {
  const locationParts = [profile?.state, profile?.country].filter(Boolean);
  if (locationParts.length > 0) {
    return locationParts.join(', ');
  }

  return getFallbackLocation();
}

export function recordDashboardLogin({ userId, location }: RecordDashboardLoginInput) {
  if (!userId) {
    return;
  }

  const records = readStoredLogins();
  const existing = records[userId] ?? {};

  records[userId] = {
    previousLoginAt: existing.currentLoginAt,
    previousLoginLocation: existing.currentLoginLocation ?? existing.previousLoginLocation,
    currentLoginAt: new Date().toISOString(),
    currentLoginLocation: location || existing.currentLoginLocation || getFallbackLocation(),
  };

  writeStoredLogins(records);
}

export function getStoredDashboardLogin(userId?: string | null): StoredLoginEntry | null {
  if (!userId) {
    return null;
  }

  const records = readStoredLogins();
  return records[userId] ?? null;
}

function getGreetingForDate(date: Date) {
  const hour = date.getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function formatCurrentTime(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatCurrentDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLiveCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)}, ${longitude.toFixed(3)} (Live)`;
}

function getLocationLookupKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

interface ReverseGeocodeResult {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

function formatLivePlaceName(result: ReverseGeocodeResult) {
  const city = result.city || result.locality || '';
  const region = result.principalSubdivision || '';
  const country = result.countryName || '';

  const parts = [city, region, country].filter(Boolean);
  const uniqueParts = parts.filter((part, index) => parts.indexOf(part) === index);

  return uniqueParts.length > 0 ? `${uniqueParts.join(', ')} (Live)` : null;
}

async function reverseGeocodeLocation(latitude: number, longitude: number) {
  const endpoint = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to resolve live location');
  }

  const payload = await response.json() as ReverseGeocodeResult;
  return formatLivePlaceName(payload);
}

function formatRelativeLogin(isoDate?: string) {
  if (!isoDate) {
    return 'First login on this device';
  }

  const loginDate = new Date(isoDate);
  if (Number.isNaN(loginDate.getTime())) {
    return 'First login on this device';
  }

  const now = new Date();
  const diffMs = now.getTime() - loginDate.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return loginDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getPersonalName(profile: UserProfile | null) {
  const parts = [profile?.firstName?.trim(), profile?.lastName?.trim()].filter(Boolean);
  return parts.join(' ');
}

function getDisplayName(profile: UserProfile | null, fallbackRole: DashboardRole) {
  const emailName = profile?.email?.split('@')[0]?.trim();
  const publicName = profile?.role === 'partner'
    ? profile.labelName
    : profile?.artistName;

  if (publicName?.trim()) {
    return publicName.trim();
  }

  const personalName = getPersonalName(profile);
  if (personalName) {
    return personalName;
  }

  if (profile?.username) {
    return profile.username;
  }

  if (emailName) {
    return emailName;
  }

  return fallbackRole === 'partner' ? 'your label' : 'your artist profile';
}

function getPlanLabel(subscriptionTier?: UserProfile['subscriptionTier']) {
  if (subscriptionTier === 'partner') {
    return 'Partner Plan';
  }
  if (subscriptionTier === 'super_artist') {
    return 'Super Artist Plan';
  }
  if (subscriptionTier === 'artist') {
    return 'Artist Plan';
  }
  return 'Free Plan';
}

export function useDashboardWelcome(fallbackRole: DashboardRole): DashboardWelcomeData {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [liveLocationLabel, setLiveLocationLabel] = useState<string | null>(null);
  const lastLocationLookupRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const nextProfile = await getCurrentUserProfile();
        if (!cancelled) {
          setProfile(nextProfile);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    let active = true;

    const watcherId = navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const lookupKey = getLocationLookupKey(latitude, longitude);

        if (lastLocationLookupRef.current === lookupKey) {
          return;
        }

        lastLocationLookupRef.current = lookupKey;
        const fallbackLiveLabel = `${getProfileLocation(profile)} (Live)`;

        try {
          const resolved = await reverseGeocodeLocation(latitude, longitude);
          if (active && lastLocationLookupRef.current === lookupKey) {
            setLiveLocationLabel(resolved || fallbackLiveLabel);
          }
        } catch {
          if (active && lastLocationLookupRef.current === lookupKey) {
            setLiveLocationLabel(fallbackLiveLabel);
          }
        }
      },
      () => {
        setLiveLocationLabel(null);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 12000,
      }
    );

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watcherId);
    };
  }, [profile]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return useMemo(() => {
    const effectiveRole = profile?.role === 'partner' ? 'partner' : profile?.role === 'artist' ? 'artist' : fallbackRole;
    const roleLabel = effectiveRole === 'partner' ? 'Label' : 'Artist';
    const displayName = getDisplayName(profile, fallbackRole);
    const locationLabel = liveLocationLabel || getProfileLocation(profile);
    const greeting = getGreetingForDate(currentTime);
    const userId = profile?.userId || (typeof window !== 'undefined' ? window.sessionStorage.getItem('user_id') : null);
    const lastLogin = getStoredDashboardLogin(userId);
    const heading = `${greeting}, ${displayName}`;
    const subtitle = effectiveRole === 'partner'
      ? 'Your roster, releases, and payouts are ready for review.'
      : 'Your catalog, audience, and earnings are ready for review.';

    return {
      loading,
      profile,
      greeting,
      heading,
      subtitle,
      roleLabel,
      displayName,
      planLabel: getPlanLabel(profile?.subscriptionTier),
      locationLabel,
      currentTimeLabel: formatCurrentTime(currentTime),
      currentDateLabel: formatCurrentDate(currentTime),
      lastLoginLabel: formatRelativeLogin(lastLogin?.previousLoginAt),
      lastLoginLocationLabel: lastLogin?.previousLoginLocation || locationLabel,
    };
  }, [currentTime, fallbackRole, liveLocationLabel, loading, profile]);
}