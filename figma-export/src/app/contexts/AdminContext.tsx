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

        // Try to fetch admin users to verify admin status
        try {
          const admins = await adminApi.getAllAdminUsers();
          
          // Find current user's admin profile
          const currentAdmin = admins.find(a => a.userId === session.user.id);
          
          if (currentAdmin) {
            setAdminUser(currentAdmin);
            sessionStorage.setItem('user_role', 'admin');
            sessionStorage.setItem('admin_access_token', session.access_token);
          } else {
            // User is authenticated but not an admin
            setAdminUser(null);
            adminApi.clearAdminToken();
          }
        } catch (error) {
          // Not an admin or permission error
          console.error('Admin verification failed:', error);
          setAdminUser(null);
          adminApi.clearAdminToken();
        }
      } else {
        // Admin token exists, verify it's still valid
        adminApi.setAdminToken(adminToken);
        
        try {
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
              setAdminUser(null);
              adminApi.clearAdminToken();
              sessionStorage.removeItem('admin_access_token');
              sessionStorage.removeItem('user_role');
            }
          }
        } catch (error) {
          console.error('Error verifying admin token:', error);
          setAdminUser(null);
          adminApi.clearAdminToken();
          sessionStorage.removeItem('admin_access_token');
          sessionStorage.removeItem('user_role');
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
      let email = emailOrUsername;
      
      // Check if input is username (not an email)
      if (!emailOrUsername.includes('@')) {
        // Handle special test admin username
        if (emailOrUsername === 'admin') {
          email = 'admin@amtdistro.com';
        } else {
          // For other usernames, try to find the email
          // This would need backend support - for now append domain
          email = `${emailOrUsername}@amtdistro.com`;
        }
      }

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session created');

      if (data.user.user_metadata?.mustChangePassword === true) {
        sessionStorage.setItem('mustChangePassword', 'true');
      } else {
        sessionStorage.removeItem('mustChangePassword');
      }

      // Store token
      adminApi.setAdminToken(data.session.access_token);

      // Verify admin status
      try {
        const admins = await adminApi.getAllAdminUsers();
        const currentAdmin = admins.find(a => a.userId === data.user.id);
        
        if (!currentAdmin) {
          // User exists but is not an admin
          await supabase.auth.signOut();
          adminApi.clearAdminToken();
          throw new Error('This account does not have admin privileges');
        }

        setAdminUser(currentAdmin);
      } catch (error) {
        await supabase.auth.signOut();
        adminApi.clearAdminToken();
        throw new Error('Admin verification failed. Please contact support.');
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