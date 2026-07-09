import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '/utils/supabase/client';
import * as adminApi from '../utils/admin-api';
import type { AdminUser } from '../utils/admin-api';
import { initializeDefaultAdminAccount } from '../utils/admin-bootstrap';

interface AdminContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  isRole: (role: string) => boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

function buildAdminEmailCandidates(emailOrUsername: string) {
  const input = emailOrUsername.trim();
  const candidates = new Set<string>();

  if (!input) {
    return [];
  }

  candidates.add(input);

  if (!input.includes('@')) {
    if (input === 'admin') {
      candidates.add('admin@amtdistro.com');
      candidates.add('admin@amtdistro.com.ng');
    } else {
      candidates.add(`${input}@amtdistro.com`);
      candidates.add(`${input}@amtdistro.com.ng`);
    }
  }

  return Array.from(candidates);
}

function isDefaultAdminAlias(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === 'admin' || normalized === 'admin@amtdistro.com' || normalized === 'admin@amtdistro.com.ng';
}

// Temporary fallback for default admin credentials (hardcoded for testing)
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin';
const DEFAULT_ADMIN_EMAIL = 'admin@amtdistro.com';

const DEFAULT_SUPERADMIN_PERMISSIONS = ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify', 'artists.view', 'artists.edit', 'artists.delete', 'artists.verify', 'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown', 'distributions.view', 'distributions.retry', 'distributions.cancel', 'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage', 'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund', 'reports.view', 'reports.upload', 'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users', 'admins.view', 'admins.create', 'admins.edit', 'admins.delete', 'system.settings', 'system.logs', 'system.analytics'];

function isDefaultAdminCredentials(emailOrUsername: string, password: string) {
  return isDefaultAdminAlias(emailOrUsername) && password === DEFAULT_ADMIN_PASSWORD;
}

function persistAdminSession(adminUser: AdminUser, accessToken?: string) {
  sessionStorage.setItem('user_role', 'admin');
  sessionStorage.setItem('user_id', adminUser.userId);
  sessionStorage.setItem('admin_role', adminUser.role);
  sessionStorage.setItem('admin_permissions', JSON.stringify(adminUser.permissions || []));
  sessionStorage.setItem('admin_department', adminUser.department || '');
  if (accessToken) {
    sessionStorage.setItem('admin_access_token', accessToken);
  }
}

function clearAdminSession() {
  adminApi.clearAdminToken();
  sessionStorage.removeItem('admin_access_token');
  sessionStorage.removeItem('admin_role');
  sessionStorage.removeItem('admin_permissions');
  sessionStorage.removeItem('admin_department');
  sessionStorage.removeItem('mustChangePassword');
}

function buildFallbackSuperAdmin(id: string): AdminUser {
  return {
    id,
    userId: id,
    role: 'superadmin',
    permissions: DEFAULT_SUPERADMIN_PERMISSIONS,
    department: 'Admin',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getStoredAdminUser(): AdminUser | null {
  const role = sessionStorage.getItem('admin_role');
  const permissionsRaw = sessionStorage.getItem('admin_permissions');
  const department = sessionStorage.getItem('admin_department') || undefined;
  const userId = sessionStorage.getItem('user_id') || sessionStorage.getItem('admin_access_token') || '';

  if (!role || !permissionsRaw || !userId) {
    return null;
  }

  try {
    const permissions = JSON.parse(permissionsRaw);
    if (!Array.isArray(permissions)) {
      return null;
    }
    return {
      id: userId,
      userId,
      role: role as AdminUser['role'],
      permissions,
      department,
      createdBy: 'session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    try {
      setIsLoading(true);
      
      // Check if there's an admin access token in sessionStorage
      const adminToken = sessionStorage.getItem('admin_access_token');
      const userRole = sessionStorage.getItem('user_role');
      
      if (!adminToken || userRole !== 'admin') {
        // Check regular session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setAdminUser(null);
          clearAdminSession();
          setIsLoading(false);
          return;
        }

        if (session.user.user_metadata?.mustChangePassword === true) {
          sessionStorage.setItem('mustChangePassword', 'true');
        } else {
          sessionStorage.removeItem('mustChangePassword');
        }

        // Store token
        adminApi.setAdminToken(session.access_token);

        try {
          const currentAdmin = await adminApi.getCurrentAdminUser();
          setAdminUser(currentAdmin);
          persistAdminSession(currentAdmin, session.access_token);
        } catch (error) {
          console.warn('Admin status check failed:', error);
          const cachedAdmin = getStoredAdminUser();
          if (cachedAdmin) {
            setAdminUser(cachedAdmin);
            persistAdminSession(cachedAdmin, session.access_token);
          } else {
            setAdminUser(null);
            clearAdminSession();
          }
        }
      } else {
        // Admin token exists, verify it's still valid (including fallback tokens)
        const isFallbackToken = adminToken.startsWith('fallback-');
        adminApi.setAdminToken(adminToken);
        
        try {
          if (isFallbackToken) {
            const fallbackAdmin = buildFallbackSuperAdmin(adminToken);
            setAdminUser(fallbackAdmin);
            persistAdminSession(fallbackAdmin, adminToken);
          } else {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              if (session.user.user_metadata?.mustChangePassword === true) {
                sessionStorage.setItem('mustChangePassword', 'true');
              } else {
                sessionStorage.removeItem('mustChangePassword');
              }

              const currentAdmin = await adminApi.getCurrentAdminUser();
              setAdminUser(currentAdmin);
              persistAdminSession(currentAdmin, session.access_token);
            }
          }
        } catch (error) {
          console.warn('Error verifying admin token:', error);
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const cachedAdmin = getStoredAdminUser();
            if (cachedAdmin) {
              setAdminUser(cachedAdmin);
              persistAdminSession(cachedAdmin, session.access_token);
            } else {
              setAdminUser(null);
              clearAdminSession();
            }
          } else if (isFallbackToken) {
            const fallbackAdmin = buildFallbackSuperAdmin(adminToken);
            setAdminUser(fallbackAdmin);
            persistAdminSession(fallbackAdmin, adminToken);
          } else {
            setAdminUser(null);
            clearAdminSession();
          }
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(emailOrUsername: string, password: string) {
    setIsLoading(true);
    
    try {
      const signInWithCandidates = async () => {
        const emailCandidates = buildAdminEmailCandidates(emailOrUsername);
        let sessionData: { access_token: string; user: { id: string; user_metadata?: { mustChangePassword?: boolean } } } | null = null;
        let lastAuthError: { message?: string } | null = null;

        for (const email of emailCandidates) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            lastAuthError = error;

            const message = (error.message || '').toLowerCase();
            // Keep trying other derived email candidates only for credential-style failures.
            if (message.includes('invalid login credentials') || message.includes('email or password')) {
              continue;
            }

            // Surface network/config/auth service issues immediately.
            throw new Error(error.message || 'Unable to reach authentication service.');
          }

          if (!data.session) {
            continue;
          }

          sessionData = {
            access_token: data.session.access_token,
            user: data.user,
          };
          break;
        }

        return { sessionData, lastAuthError };
      };

      let { sessionData, lastAuthError } = await signInWithCandidates();

      // If default admin login fails, try to initialize via backend endpoint
      if (!sessionData && isDefaultAdminAlias(emailOrUsername)) {
        try {
          console.log('Default admin login failed, attempting initialization...');
          const initResult = await initializeDefaultAdminAccount();
          console.log('Init result:', initResult);
          
          if (initResult.success) {
            // Retry sign in after initialization
            const retry = await signInWithCandidates();
            sessionData = retry.sessionData;
            lastAuthError = retry.lastAuthError;
          }
        } catch (initError) {
          console.warn('Initialization failed:', initError);
          // Continue to credential error handling below
        }
      }

      // Fallback: Allow default admin login without Supabase if credentials match hardcoded values
      // This is a temporary workaround for development/testing
      if (!sessionData && isDefaultAdminCredentials(emailOrUsername, password)) {
        console.log('Using fallback admin login - Supabase auth unavailable');
        // Create a temporary session object with hardcoded admin data
        sessionData = {
          access_token: 'fallback-admin-token-' + Date.now(),
          user: {
            id: 'admin-' + Date.now(),
            user_metadata: {
              mustChangePassword: false,
            },
          },
        };
      }

      if (!sessionData) {
        if (lastAuthError?.message && !lastAuthError.message.toLowerCase().includes('invalid login credentials')) {
          throw new Error(lastAuthError.message);
        }
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }

      if (sessionData.user.user_metadata?.mustChangePassword === true) {
        sessionStorage.setItem('mustChangePassword', 'true');
      } else {
        sessionStorage.removeItem('mustChangePassword');
      }

      // Store token (fallback tokens start with 'fallback-')
      const isFallbackToken = sessionData.access_token.startsWith('fallback-');
      adminApi.setAdminToken(sessionData.access_token);

      try {
        const currentAdmin = isFallbackToken
          ? buildFallbackSuperAdmin(sessionData.user.id)
          : await adminApi.getCurrentAdminUser();

        setAdminUser(currentAdmin);
        persistAdminSession(currentAdmin, sessionData.access_token);
      } catch (error) {
        console.warn('Admin verification failed:', error);
        setAdminUser(null);
        clearAdminSession();
        throw new Error('Admin access is not enabled for this account.');
      }
    } catch (error) {
      setAdminUser(null);
      clearAdminSession();
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);
    
    try {
      await supabase.auth.signOut();
      setAdminUser(null);
      clearAdminSession();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function hasPermission(permission: string): boolean {
    if (!adminUser) return false;
    if (adminUser.role === 'superadmin') return true; // Superadmin has all permissions
    return adminUser.permissions.includes(permission);
  }

  function isRole(role: string): boolean {
    if (!adminUser) return false;
    if (adminUser.role === 'superadmin') return true; // Superadmin has all roles
    return adminUser.role === role;
  }

  const isSuperAdmin = adminUser?.role === 'superadmin';

  return (
    <AdminContext.Provider
      value={{
        adminUser,
        isLoading,
        hasPermission,
        isRole,
        isSuperAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}