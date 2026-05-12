import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CURRENT_USER_PROFILE_UPDATED_EVENT } from '../utils/user-api';

type UserRole = 'artist' | 'partner' | 'admin';
type AdminRole = 'superadmin' | 'admin_operations' | 'admin_finance' | 'admin_content' | 'admin_support' | 'admin_fraud' | 'admin_analytics';

interface RoleContextType {
  userRole: UserRole | null;
  adminRole: AdminRole | null;
  userId: string | null;
  subscriptionTier: 'artist' | 'super_artist' | 'partner' | null;
  permissions: string[];
  isArtist: boolean;
  isLabel: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permission: string) => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<'artist' | 'super_artist' | 'partner' | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const syncFromStorage = () => {
      const storedUserRole = sessionStorage.getItem('user_role') as UserRole | null;
      const storedAdminRole = sessionStorage.getItem('admin_role') as AdminRole | null;
      const storedUserId = sessionStorage.getItem('user_id');
      const storedSubscriptionTier = sessionStorage.getItem('user_subscription_tier') as 'artist' | 'super_artist' | 'partner' | null;
      const storedPermissions = sessionStorage.getItem('admin_permissions');

      setUserRole(storedUserRole);
      setAdminRole(storedAdminRole);
      setUserId(storedUserId);
      setSubscriptionTier(storedSubscriptionTier);

      if (storedPermissions) {
        try {
          setPermissions(JSON.parse(storedPermissions));
        } catch {
          setPermissions([]);
        }
      } else {
        setPermissions([]);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromStorage();
      }
    };

    syncFromStorage();

    window.addEventListener(CURRENT_USER_PROFILE_UPDATED_EVENT, syncFromStorage as EventListener);
    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('focus', syncFromStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener(CURRENT_USER_PROFILE_UPDATED_EVENT, syncFromStorage as EventListener);
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('focus', syncFromStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const value: RoleContextType = {
    userRole,
    adminRole,
    userId,
    subscriptionTier,
    permissions,
    isArtist: userRole === 'artist',
    isLabel: userRole === 'partner' || subscriptionTier === 'partner',
    isAdmin: userRole === 'admin',
    isSuperAdmin: adminRole === 'superadmin',
    hasPermission,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}