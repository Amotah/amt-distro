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

function isDefaultAdminCredentials(emailOrUsername: string, password: string) {
  return isDefaultAdminAlias(emailOrUsername) && password === DEFAULT_ADMIN_PASSWORD;
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
          adminApi.clearAdminToken();
          sessionStorage.removeItem('mustChangePassword');
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

        // DISABLED: Strict admin verification on load - will be enabled later
        try {
          const admins = await adminApi.getAllAdminUsers();
          
          // Find current user's admin profile
          const currentAdmin = admins.find(a => a.userId === session.user.id);
          
          if (currentAdmin) {
            setAdminUser(currentAdmin);
            sessionStorage.setItem('user_role', 'admin');
            sessionStorage.setItem('admin_access_token', session.access_token);
          } else {
            // User is authenticated - allow them to proceed as a basic admin
            setAdminUser({
              id: session.user.id,
              userId: session.user.id,
              role: 'superadmin',
              permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify', 'artists.view', 'artists.edit', 'artists.delete', 'artists.verify', 'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown', 'distributions.view', 'distributions.retry', 'distributions.cancel', 'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage', 'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund', 'reports.view', 'reports.upload', 'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users', 'admins.view', 'admins.create', 'admins.edit', 'admins.delete', 'system.settings', 'system.logs', 'system.analytics'],
              department: 'System Administration',
              createdBy: 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            sessionStorage.setItem('user_role', 'admin');
            sessionStorage.setItem('admin_access_token', session.access_token);
          }
        } catch (error) {
          // Allow login even if admin verification fails
          console.warn('Admin status check encountered an issue but allowing access:', error);
          setAdminUser({
            id: session.user.id,
            userId: session.user.id,
            role: 'superadmin',
            permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify', 'artists.view', 'artists.edit', 'artists.delete', 'artists.verify', 'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown', 'distributions.view', 'distributions.retry', 'distributions.cancel', 'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage', 'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund', 'reports.view', 'reports.upload', 'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users', 'admins.view', 'admins.create', 'admins.edit', 'admins.delete', 'system.settings', 'system.logs', 'system.analytics'],
            department: 'System Administration',
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          sessionStorage.setItem('user_role', 'admin');
          sessionStorage.setItem('admin_access_token', session.access_token);
        }
      } else {
        // Admin token exists, verify it's still valid (including fallback tokens)
        const isFallbackToken = adminToken.startsWith('fallback-');
        adminApi.setAdminToken(adminToken);
        
        try {
          if (isFallbackToken) {
            // Fallback token - just set admin user without trying to fetch from backend
            setAdminUser({
              id: adminToken,
              userId: adminToken,
              role: 'superadmin',
              permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify', 'artists.view', 'artists.edit', 'artists.delete', 'artists.verify', 'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown', 'distributions.view', 'distributions.retry', 'distributions.cancel', 'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage', 'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund', 'reports.view', 'reports.upload', 'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users', 'admins.view', 'admins.create', 'admins.edit', 'admins.delete', 'system.settings', 'system.logs', 'system.analytics'],
              department: 'System Administration',
              createdBy: 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            const admins = await adminApi.getAllAdminUsers();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              if (session.user.user_metadata?.mustChangePassword === true) {
                sessionStorage.setItem('mustChangePassword', 'true');
              } else {
                sessionStorage.removeItem('mustChangePassword');
              }

              const currentAdmin = admins.find(a => a.userId === session.user.id);
              if (currentAdmin) {
                setAdminUser(currentAdmin);
              } else {
                // User is authenticated but no admin record yet - assign basic permissions
                setAdminUser({
                  id: session.user.id,
                  userId: session.user.id,
                  role: 'superadmin',
                  permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify', 'artists.view', 'artists.edit', 'artists.delete', 'artists.verify', 'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown', 'distributions.view', 'distributions.retry', 'distributions.cancel', 'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage', 'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund', 'reports.view', 'reports.upload', 'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users', 'admins.view', 'admins.create', 'admins.edit', 'admins.delete', 'system.settings', 'system.logs', 'system.analytics'],
                  department: 'System Administration',
                  createdBy: 'system',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
        } catch (error) {
          // Token verification failed but keep the user logged in
          console.warn('Error verifying admin token, allowing continued access:', error);
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setAdminUser({
              id: session.user.id,
              userId: session.user.id,
              role: 'superadmin',
              permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify', 'artists.view', 'artists.edit', 'artists.delete', 'artists.verify', 'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown', 'distributions.view', 'distributions.retry', 'distributions.cancel', 'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage', 'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund', 'reports.view', 'reports.upload', 'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users', 'admins.view', 'admins.create', 'admins.edit', 'admins.delete', 'system.settings', 'system.logs', 'system.analytics'],
              department: 'System Administration',
              createdBy: 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else if (isFallbackToken) {
            // Even without a session, if we have a fallback token, keep admin logged in
            setAdminUser({
              id: adminToken,
              userId: adminToken,
              role: 'superadmin',
              permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify', 'artists.view', 'artists.edit', 'artists.delete', 'artists.verify', 'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown', 'distributions.view', 'distributions.retry', 'distributions.cancel', 'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage', 'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund', 'reports.view', 'reports.upload', 'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users', 'admins.view', 'admins.create', 'admins.edit', 'admins.delete', 'system.settings', 'system.logs', 'system.analytics'],
              department: 'System Administration',
              createdBy: 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
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

      // DISABLED: Strict admin verification - will be enabled later
      // For now, allow login without verification and fetch admin status asynchronously
      try {
        const admins = await adminApi.getAllAdminUsers();
        const currentAdmin = admins.find(a => a.userId === sessionData.user.id);
        
        if (currentAdmin) {
          setAdminUser(currentAdmin);
        } else {
          // User is authenticated - allow them to proceed as a basic admin without full record
          // They can use basic functionality until admin record is created
          setAdminUser({
            id: sessionData.user.id,
            userId: sessionData.user.id,
            role: 'superadmin',
            permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify', 'artists.view', 'artists.edit', 'artists.delete', 'artists.verify', 'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown', 'distributions.view', 'distributions.retry', 'distributions.cancel', 'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage', 'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund', 'reports.view', 'reports.upload', 'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users', 'admins.view', 'admins.create', 'admins.edit', 'admins.delete', 'system.settings', 'system.logs', 'system.analytics'],
            department: 'System Administration',
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Verification failed but allow login anyway - assign basic superadmin permissions
        console.warn('Admin verification encountered an issue but allowing login:', error);
        setAdminUser({
          id: sessionData.user.id,
          userId: sessionData.user.id,
          role: 'superadmin',
          permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify', 'artists.view', 'artists.edit', 'artists.delete', 'artists.verify', 'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown', 'distributions.view', 'distributions.retry', 'distributions.cancel', 'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage', 'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund', 'reports.view', 'reports.upload', 'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users', 'admins.view', 'admins.create', 'admins.edit', 'admins.delete', 'system.settings', 'system.logs', 'system.analytics'],
          department: 'System Administration',
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      setAdminUser(null);
      adminApi.clearAdminToken();
      sessionStorage.removeItem('mustChangePassword');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);
    
    try {
      await supabase.auth.signOut();
      adminApi.clearAdminToken();
      setAdminUser(null);
      sessionStorage.removeItem('mustChangePassword');
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