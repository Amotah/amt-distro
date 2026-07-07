export type DashboardMode = 'artist' | 'label' | 'admin' | null;

export interface DashboardAccessSnapshot {
  role?: string | null;
  subscriptionTier?: string | null;
}

const SHARED_DASHBOARD_SUFFIXES = new Set([
  '',
  '/catalog',
  '/upload',
  '/analytics',
  '/earnings',
  '/marketing',
  '/marketing/client-offerings',
  '/marketing/youtube-artist-channel',
  '/settings',
  '/upgrade-plan',
  '/payment',
  '/payment-history',
  '/payment/callback',
]);

export function getEffectiveDashboardMode(snapshot: DashboardAccessSnapshot): DashboardMode {
  if (snapshot.role === 'admin') {
    return 'admin';
  }

  if (snapshot.role === 'label' || snapshot.role === 'partner' || snapshot.subscriptionTier === 'partner') {
    return 'label';
  }

  if (snapshot.role === 'artist') {
    return 'artist';
  }

  return null;
}

export function getDashboardPathForMode(mode: DashboardMode, currentPath: string) {
  if (mode !== 'artist' && mode !== 'label') {
    return currentPath;
  }

  if (mode === 'label') {
    if (currentPath.startsWith('/label-dashboard')) {
      return currentPath;
    }

    if (!currentPath.startsWith('/dashboard')) {
      return '/label-dashboard';
    }

    const suffix = currentPath.slice('/dashboard'.length);
    return SHARED_DASHBOARD_SUFFIXES.has(suffix) ? `/label-dashboard${suffix}` : '/label-dashboard';
  }

  if (currentPath.startsWith('/dashboard')) {
    return currentPath;
  }

  if (!currentPath.startsWith('/label-dashboard')) {
    return '/dashboard';
  }

  const suffix = currentPath.slice('/label-dashboard'.length);
  return SHARED_DASHBOARD_SUFFIXES.has(suffix) ? `/dashboard${suffix}` : '/dashboard';
}