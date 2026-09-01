import * as kv from './kv_store.tsx';
import * as userService from './user-service.tsx';

/**
 * Admin Service
 * Handles admin roles, permissions, and administrative actions
 * 
 * SECURITY FIX #2: Admin users now stored in Supabase 'profiles' table with RLS protection
 * - Old: Deno KV store (no RLS, app-logic-dependent)
 * - New: Supabase profiles table (RLS-protected, database-enforced)
 */

// Note: Supabase client should be passed in or imported from context
// For now, we'll create it locally with service role key for admin operations
let supabase: any = null;

export function initSupabaseClient(client: any) {
  supabase = client;
}

export type AdminRole = 
  | 'superadmin'           // Full access to everything
  | 'admin_operations'     // Daily platform moderation
  | 'admin_finance'        // Royalties, payments, financial data
  | 'admin_content'        // Releases, tracks, distributions
  | 'admin_support'        // User support, disputes
  | 'admin_fraud'          // Fraud detection, security
  | 'admin_analytics';     // Reports, analytics, insights

export type Permission = 
  // User Management
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.ban'
  | 'users.verify'
  
  // Artist/Label Management
  | 'artists.view'
  | 'artists.edit'
  | 'artists.delete'
  | 'artists.verify'
  
  // Release Management
  | 'releases.view'
  | 'releases.edit'
  | 'releases.delete'
  | 'releases.approve'
  | 'releases.takedown'
  
  // Distribution Management
  | 'distributions.view'
  | 'distributions.retry'
  | 'distributions.cancel'
  
  // Royalty Management
  | 'royalties.view'
  | 'royalties.edit'
  | 'royalties.approve'
  | 'royalties.dispute'
  | 'royalties.manage'
  
  // Payment Management
  | 'payments.view'
  | 'payments.approve'
  | 'payments.cancel'
  | 'payments.refund'
  
  // Fraud Management
  | 'fraud.view'
  | 'fraud.investigate'
  | 'fraud.resolve'
  | 'fraud.flag_users'
  
  // Report Management
  | 'reports.view'
  | 'reports.upload'

  // Support Management
  | 'support.view'
  | 'support.manage'
  
  // Admin Management
  | 'admins.view'
  | 'admins.create'
  | 'admins.edit'
  | 'admins.delete'
  
  // System Management
  | 'system.settings'
  | 'system.logs'
  | 'system.analytics';

export interface AdminUser {
  id: string;
  userId: string;
  role: AdminRole;
  permissions: Permission[];
  department?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface AuditLog {
  id: string;
  adminUserId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// Role-Permission Mapping
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  superadmin: [
    // All permissions - full access
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban', 'users.verify',
    'artists.view', 'artists.edit', 'artists.delete', 'artists.verify',
    'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown',
    'distributions.view', 'distributions.retry', 'distributions.cancel',
    'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage',
    'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund',
    'reports.view', 'reports.upload',
    'support.view', 'support.manage',
    'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users',
    'admins.view', 'admins.create', 'admins.edit', 'admins.delete',
    'system.settings', 'system.logs', 'system.analytics',
  ],
  admin_operations: [
    // Daily platform moderation (NO ROYALTIES ACCESS)
    'users.view', 'users.create',
    'artists.view',
    'releases.view', 'releases.edit', 'releases.approve',
    'distributions.view',
    'fraud.view', 'fraud.flag_users',
    'payments.view', 'payments.approve',
    'support.view', 'support.manage',
    'system.analytics',
  ],
  admin_finance: [
    // Financial operations (FULL ROYALTIES ACCESS)
    'users.view',
    'artists.view',
    'releases.view',
    'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage',
    'payments.view', 'payments.approve', 'payments.cancel',
    'reports.view', 'reports.upload',
    'support.view', 'support.manage',
    'system.analytics',
  ],
  admin_content: [
    // Content moderation (NO ROYALTIES ACCESS)
    'users.view', 'users.create',
    'artists.view', 'artists.edit',
    'releases.view', 'releases.edit', 'releases.approve', 'releases.takedown',
    'distributions.view', 'distributions.retry',
    'support.view', 'support.manage',
    'system.analytics',
  ],
  admin_support: [
    // User support (NO ROYALTIES ACCESS)
    'users.view', 'users.create', 'users.edit',
    'artists.view', 'artists.edit',
    'releases.view',
    'payments.view',
    'support.view', 'support.manage',
    'fraud.view',
  ],
  admin_fraud: [
    // Fraud detection (NO ROYALTIES ACCESS)
    'users.view', 'users.ban',
    'artists.view',
    'releases.view', 'releases.takedown',
    'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users',
    'support.view', 'support.manage',
    'system.analytics',
  ],
  admin_analytics: [
    // Analytics and reporting (NO ROYALTIES ACCESS)
    'users.view',
    'artists.view',
    'releases.view',
    'distributions.view',
    'payments.view',
    'fraud.view',
    'support.view',
    'system.analytics', 'system.logs',
  ],
};

// Create admin user in Supabase profiles table (SECURITY FIX #2)
export async function createAdminUser(
  userId: string,
  role: AdminRole,
  createdBy: string,
  department?: string
): Promise<AdminUser> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const adminPermissions = ROLE_PERMISSIONS[role];

    if (existingProfile) {
      // Profile exists, update it to add admin access
      const { data, error } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          admin_role: role,
          admin_permissions: adminPermissions,
          admin_department: department,
          admin_status: 'active',
          updated_at: now,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      const adminUser: AdminUser = {
        id: data.id,
        userId: data.user_id,
        role: data.admin_role as AdminRole,
        permissions: data.admin_permissions || [],
        department: data.admin_department,
        createdBy,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      await logAdminAction(createdBy, 'create', 'admin', data.id, { role, userId });
      return adminUser;
    } else {
      // Create new profile with admin role
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id,
          user_id: userId,
          role: 'admin',
          admin_role: role,
          admin_permissions: adminPermissions,
          admin_department: department,
          admin_status: 'active',
          created_by: createdBy,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      const adminUser: AdminUser = {
        id: data.id,
        userId: data.user_id,
        role: data.admin_role as AdminRole,
        permissions: data.admin_permissions || [],
        department: data.admin_department,
        createdBy,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      await logAdminAction(createdBy, 'create', 'admin', id, { role, userId });
      return adminUser;
    }
  } catch (error) {
    console.error('Error creating admin user in profiles table:', error);
    throw error;
  }
}

// Get admin user by userId from Supabase profiles table (SECURITY FIX #2)
// Query the profiles table for users with role = 'admin'
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  try {
    // SECURITY FIX #2: Query profiles table (RLS-protected) instead of KV
    if (!supabase) {
      console.warn('Supabase client not initialized, falling back to KV');
      return await getAdminUserFromKV(userId);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .eq('admin_status', 'active')
      .single();

    if (error || !data) {
      // User is not an admin or doesn't exist in profiles table
      return null;
    }

    // Convert database row to AdminUser type
    const adminUser: AdminUser = {
      id: data.id,
      userId: data.user_id,
      role: data.admin_role as AdminRole,
      permissions: data.admin_permissions || [],
      department: data.admin_department,
      createdBy: data.created_by || 'system',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastActiveAt: data.last_active_at,
    };

    return adminUser;
  } catch (error) {
    console.error('Error fetching admin user from profiles table:', error);
    // Fallback to KV for backward compatibility during migration
    return await getAdminUserFromKV(userId);
  }
}

// Fallback: Get admin user from KV (used during migration period)
// This will be deprecated once all admins are migrated to profiles table
async function getAdminUserFromKV(userId: string): Promise<AdminUser | null> {
  const adminId = await kv.get<string>(`admin:user:${userId}`);
  if (!adminId) return null;
  return await kv.get<AdminUser>(`admin:${adminId}`);
}

// Alias for getAdminUser (used during login)
export async function getAdminByUserId(userId: string): Promise<AdminUser | null> {
  return getAdminUser(userId);
}

// Update admin role in Supabase profiles table (SECURITY FIX #2)
export async function updateAdminRole(
  adminUserId: string,
  newRole: AdminRole,
  updatedBy: string
): Promise<AdminUser | null> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        admin_role: newRole,
        admin_permissions: ROLE_PERMISSIONS[newRole],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', adminUserId)
      .eq('role', 'admin')
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating admin role:', error);
      return null;
    }

    const adminUser: AdminUser = {
      id: data.id,
      userId: data.user_id,
      role: data.admin_role as AdminRole,
      permissions: data.admin_permissions || [],
      department: data.admin_department,
      createdBy: data.created_by || 'system',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Log the role change
    await logAdminAction(updatedBy, 'update', 'admin', data.id, {
      action: 'role_updated',
      adminUserId,
      newRole,
    });

    return adminUser;
  } catch (error) {
    console.error('Error updating admin role in profiles table:', error);
    return null;
  }
}

// Delete admin user
export async function deleteAdminUser(
  adminUserId: string,
  deletedBy: string
): Promise<void> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Get the admin profile to log the deletion
    const { data: adminProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', adminUserId)
      .eq('role', 'admin')
      .single();

    if (fetchError || !adminProfile) {
      console.warn('Admin user not found for deletion:', adminUserId);
      return;
    }

    // Update profile to remove admin role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'user', // Demote back to regular user
        admin_role: null,
        admin_permissions: [],
        admin_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', adminUserId);

    if (updateError) {
      console.error('Error removing admin role:', updateError);
      throw updateError;
    }

    // Log the deletion
    await logAdminAction(deletedBy, 'delete', 'admin', adminProfile.id, {
      adminUserId,
      previousRole: adminProfile.admin_role,
    });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    throw error;
  }
}

// Check if user has permission
export async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const admin = await getAdminUser(userId);
  if (!admin) return false;

  const rolePermissions = ROLE_PERMISSIONS[admin.role] || [];
  if (admin.permissions.length !== rolePermissions.length || admin.permissions.some((item) => !rolePermissions.includes(item))) {
    admin.permissions = rolePermissions;
    admin.updatedAt = new Date().toISOString();
    const adminId = await kv.get<string>(`admin:user:${userId}`);
    if (adminId) {
      await kv.set(`admin:${adminId}`, admin);
    }
  }

  return rolePermissions.includes(permission);
}

// Check if user has role
export async function hasRole(
  userId: string,
  role: AdminRole
): Promise<boolean> {
  const admin = await getAdminUser(userId);
  if (!admin) return false;

  // Superadmin has access to all roles
  if (admin.role === 'superadmin') return true;

  return admin.role === role;
}

// Get all admin users
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // SECURITY FIX #2: Query profiles table (RLS-protected) instead of KV
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all admin users:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Convert database rows to AdminUser types
    return data.map((profile: any) => ({
      id: profile.id,
      userId: profile.user_id,
      role: profile.admin_role as AdminRole,
      permissions: profile.admin_permissions || [],
      department: profile.admin_department,
      createdBy: profile.created_by || 'system',
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastActiveAt: profile.last_active_at,
    }));
  } catch (error) {
    console.error('Error getting all admin users:', error);
    return [];
  }
}

// Log admin action (audit trail)
export async function logAdminAction(
  adminUserId: string,
  action: string,
  resource: string,
  resourceId: string,
  changes?: any,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const log: AuditLog = {
    id,
    adminUserId,
    action,
    resource,
    resourceId,
    changes,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    timestamp: now,
  };

  await kv.set(`audit:${id}`, log);
  // Store the log ID as the value instead of just true
  await kv.set(`audit:admin:${adminUserId}:${id}`, id);
  await kv.set(`audit:resource:${resource}:${resourceId}:${id}`, id);
}

// Get audit logs for admin
export async function getAdminAuditLogs(
  adminUserId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  const logIds = await kv.getByPrefix(`audit:admin:${adminUserId}:`);
  const logs: AuditLog[] = [];

  for (const logId of logIds.slice(0, limit)) {
    if (logId && typeof logId === 'string') {
      const log = await kv.get<AuditLog>(`audit:${logId}`);
      if (log) {
        logs.push(log);
      }
    }
  }

  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Get audit logs for resource
export async function getResourceAuditLogs(
  resource: string,
  resourceId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  const logIds = await kv.getByPrefix(`audit:resource:${resource}:${resourceId}:`);
  const logs: AuditLog[] = [];

  for (const logId of logIds.slice(0, limit)) {
    if (logId && typeof logId === 'string') {
      const log = await kv.get<AuditLog>(`audit:${logId}`);
      if (log) {
        logs.push(log);
      }
    }
  }

  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Update last active timestamp
export async function updateAdminActivity(userId: string): Promise<void> {
  const admin = await getAdminUser(userId);
  if (!admin) return;

  admin.lastActiveAt = new Date().toISOString();
  await kv.set(`admin:${admin.id}`, admin);
}

// Get admin statistics
export async function getAdminStats(): Promise<{
  totalAdmins: number;
  adminsByRole: Record<AdminRole, number>;
  recentActions: number;
}> {
  const admins = await getAllAdminUsers();

  const adminsByRole: Record<AdminRole, number> = {
    superadmin: 0,
    admin_operations: 0,
    admin_finance: 0,
    admin_content: 0,
    admin_support: 0,
    admin_fraud: 0,
    admin_analytics: 0,
  };

  for (const admin of admins) {
    adminsByRole[admin.role]++;
  }

  // Count recent actions (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const allAuditKeys = await kv.getByPrefix('audit:');
  let recentActions = 0;

  for (const auditLog of allAuditKeys) {
    if (auditLog && typeof auditLog === 'object' && auditLog.timestamp) {
      if (auditLog.timestamp > oneDayAgo) {
        recentActions++;
      }
    }
  }

  return {
    totalAdmins: admins.length,
    adminsByRole,
    recentActions,
  };
}