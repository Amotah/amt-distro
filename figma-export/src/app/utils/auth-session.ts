type PersistedSupabaseSession = {
  access_token?: string;
  currentSession?: {
    access_token?: string;
  };
};

const SUPABASE_STORAGE_KEY = 'amtdistro-auth-token';

function parsePersistedSession(rawValue: string | null): PersistedSupabaseSession | null {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PersistedSupabaseSession;
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  const sessionToken = sessionStorage.getItem('access_token');
  if (sessionToken) {
    return sessionToken;
  }

  const persistedSession = parsePersistedSession(localStorage.getItem(SUPABASE_STORAGE_KEY));
  const persistedToken = persistedSession?.access_token || persistedSession?.currentSession?.access_token || null;

  if (persistedToken) {
    sessionStorage.setItem('access_token', persistedToken);
    return persistedToken;
  }

  return null;
}

export function getAuthStorageSnapshot() {
  return {
    hasSessionStorageToken: Boolean(sessionStorage.getItem('access_token')),
    hasPersistedSupabaseSession: Boolean(localStorage.getItem(SUPABASE_STORAGE_KEY)),
  };
}