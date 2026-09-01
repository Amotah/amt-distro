import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '/utils/supabase/client';
import * as adminApi from '../utils/admin-api';
import type { AdminUser } from '../utils/admin-api';

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
    candidates.add(`${input}@amtdistro.com`);
    candidates.add(`${input}@amtdistro.com.ng`);
  }

  return Array.from(candidates);
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
      
      // ALWAYS check Supabase session first - this is the source of truth
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no valid Supabase session, user is NOT authenticated
      if (!session) {
        setAdminUser(null);
        clearAdminSession();
        setIsLoading(false);
        return;
      }

      // User has a valid Supabase session, check if they're an admin
      if (session.user.user_metadata?.mustChangePassword === true) {
        sessionStorage.setItem('mustChangePassword', 'true');
      } else {
        sessionStorage.removeItem('mustChangePassword');
      }

      // Store token
      adminApi.setAdminToken(session.access_token);

      try {
        // Verify admin status with the server
        const currentAdmin = await adminApi.getCurrentAdminUser();
        setAdminUser(currentAdmin);
        persistAdminSession(currentAdmin, session.access_token);
      } catch (error) {
        console.warn('Admin status check failed:', error);
        // User is authenticated but not an admin - clear admin session
        setAdminUser(null);
        clearAdminSession();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminUser(null);
      clearAdminSession();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(emailOrUsername: string, password: string) {
    setIsLoading(true);
    
    try {
      const emailCandidates = buildAdminEmailCandidates(emailOrUsername);
      let sessionData: { access_token: string; user: { id: string; user_metadata?: { mustChangePassword?: boolean } } } | null = null;
      let lastAuthError: { message?: string } | null = null;

      // Try all email candidates
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

      // Store token
      adminApi.setAdminToken(sessionData.access_token);

      try {
        // Verify admin status with the server - this is the ONLY way to get admin access
        const currentAdmin = await adminApi.getCurrentAdminUser();
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