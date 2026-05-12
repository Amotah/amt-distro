import * as kv from './kv_store.tsx';
import * as userService from './user-service.tsx';

/**
 * Admin Service
 * Handles admin roles, permissions, and administrative actions
 */

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
    'system.analytics',
  ],
  admin_content: [
    // Content moderation (NO ROYALTIES ACCESS)
    'users.view', 'users.create',
    'artists.view', 'artists.edit',
    'releases.view', 'releases.edit', 'releases.approve', 'releases.takedown',
    'distributions.view', 'distributions.retry',
    'system.analytics',
  ],
  admin_support: [
    // User support (NO ROYALTIES ACCESS)
    'users.view', 'users.create', 'users.edit',
    'artists.view', 'artists.edit',
    'releases.view',
    'payments.view',
    'fraud.view',
  ],
  admin_fraud: [
    // Fraud detection (NO ROYALTIES ACCESS)
    'users.view', 'users.ban',
    'artists.view',
    'releases.view', 'releases.takedown',
    'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users',
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
    'system.analytics', 'system.logs',
  ],
};

// Create admin user
export async function createAdminUser(
  userId: string,
  role: AdminRole,
  createdBy: string,
  department?: string
): Promise<AdminUser> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Check if user profile exists in KV store
  let userProfile = await kv.get(`user:${userId}`);
  
  if (!userProfile) {
    // Create a basic admin user profile if it doesn't exist
    const adminProfile: any = {
      id: userId,
      userId: userId,
      email: '', // Will be filled from Supabase auth
      role: 'admin',
      subscriptionTier: 'label',
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    
    await kv.set(`user:${userId}`, adminProfile);
  } else {
    // Update existing user profile to admin role
    const updatedProfile: any = {
      ...userProfile,
      role: 'admin',
      updatedAt: now,
    };
    await kv.set(`user:${userId}`, updatedProfile);
  }

  const adminUser: AdminUser = {
    id,
    userId,
    role,
    permissions: ROLE_PERMISSIONS[role],
    department,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`admin:${id}`, adminUser);
  await kv.set(`admin:user:${userId}`, id);

  await logAdminAction(createdBy, 'create', 'admin', id, { role, userId });

  return adminUser;
}

// Get admin user
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const adminId = await kv.get<string>(`admin:user:${userId}`);
  if (!adminId) return null;

  return await kv.get<AdminUser>(`admin:${adminId}`);
}

// Alias for getAdminUser (used during login)
export async function getAdminByUserId(userId: string): Promise<AdminUser | null> {
  return getAdminUser(userId);
}

// Update admin role
export async function updateAdminRole(
  adminUserId: string,
  newRole: AdminRole,
  updatedBy: string
): Promise<AdminUser | null> {
  const adminId = await kv.get<string>(`admin:user:${adminUserId}`);
  if (!adminId) return null;

  const admin = await kv.get<AdminUser>(`admin:${adminId}`);
  if (!admin) return null;

  const oldRole = admin.role;
  admin.role = newRole;
  admin.permissions = ROLE_PERMISSIONS[newRole];
  admin.updatedAt = new Date().toISOString();

  await kv.set(`admin:${adminId}`, admin);

  await logAdminAction(updatedBy, 'update', 'admin', adminId, {
    oldRole,
    newRole,
  });

  return admin;
}

// Delete admin user
export async function deleteAdminUser(
  adminUserId: string,
  deletedBy: string
): Promise<void> {
  const adminId = await kv.get<string>(`admin:user:${adminUserId}`);
  if (!adminId) return;

  const admin = await kv.get<AdminUser>(`admin:${adminId}`);
  if (!admin) return;

  // Update user role back to artist/label
  const user = await kv.get(`user:${adminUserId}`);
  if (user && typeof user === 'object' && 'role' in user) {
    (user as any).role = 'artist'; // Default back to artist
    await kv.set(`user:${adminUserId}`, user);
  }

  await kv.del(`admin:${adminId}`);
  await kv.del(`admin:user:${adminUserId}`);

  await logAdminAction(deletedBy, 'delete', 'admin', adminId, admin);
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
  const adminUserMappings = await kv.getByPrefix('admin:user:');
  const admins: AdminUser[] = [];

  for (const adminId of adminUserMappings) {
    if (adminId && typeof adminId === 'string') {
      const admin = await kv.get<AdminUser>(`admin:${adminId}`);
      if (admin) {
        admins.push(admin);
      }
    }
  }

  return admins.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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