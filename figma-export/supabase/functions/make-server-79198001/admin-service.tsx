import * as kv from './kv_store.tsx';
import * as userService from './user-service.tsx';

/**
 * Admin Service
 * Handles admin roles, permissions, and administrative actions
 */

export type AdminRole = 
  | 'superadmin'           // Full access to everything
  | 'system_admin'         // Elevated system-wide administrator
  | 'admin_operations'     // Daily platform moderation
  | 'admin_finance'        // Royalties, payments, financial data
  | 'admin_content'        // Releases, tracks, distributions
  | 'admin_support'        // User support, disputes
  | 'admin_fraud'          // Fraud detection, security
  | 'admin_analytics'      // Reports, analytics, insights
  | 'hr_manager'
  | 'hr_specialist'
  | 'hr_coordinator'
  | 'payroll_manager'
  | 'recruitment_officer'
  | 'staff';

type KnownPermission = 
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
  | 'system.analytics'

  // Frontend-only capability flags used for navigation and visibility
  | 'support.view';

export type Permission = KnownPermission | (string & {});

export type AdminStatus = 'active' | 'inactive' | 'suspended';

export interface AdminUser {
  id: string;
  userId: string;
  role: AdminRole;
  permissions: Permission[];
  department?: string;
  status?: AdminStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface AuditLog {
  id: string;
  adminUserId: string;
  adminUserEmail?: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// ── User Activity Log ──────────────────────────────────────────────────────
// Separate from the admin audit log. Tracks actions by regular users
// (artists and partners) such as submitting releases, requesting payouts, etc.

export type UserActivityAction =
  | 'profile_updated'
  | 'release_created'
  | 'release_updated'
  | 'release_submitted'
  | 'release_distributed'
  | 'track_added'
  | 'payout_requested'
  | 'payment_initialized'
  | 'payment_verified'
  | 'subscription_cancelled'
  | 'password_changed'
  | 'login';

export interface UserActivityLog {
  id: string;
  userId: string;           // the artist/partner's auth user id
  userEmail?: string;
  action: UserActivityAction;
  resource: string;         // e.g. 'release', 'track', 'payout', 'profile'
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export async function logUserActivity(
  userId: string,
  userEmail: string | undefined,
  action: UserActivityAction,
  resource: string,
  resourceId?: string,
  details?: any,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  const id = crypto.randomUUID();
  const log: UserActivityLog = {
    id,
    userId,
    userEmail,
    action,
    resource,
    resourceId,
    details,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    timestamp: new Date().toISOString(),
  };
  await kv.set(`useractivity:${id}`, log);
  await kv.set(`useractivity:user:${userId}:${id}`, id);
}

export async function getUserActivityLogs(userId: string, limit = 100): Promise<UserActivityLog[]> {
  const logIds = await kv.getByPrefix(`useractivity:user:${userId}:`);
  const logs: UserActivityLog[] = [];
  for (const logId of logIds.slice(0, limit)) {
    if (logId && typeof logId === 'string') {
      const log = await kv.get<UserActivityLog>(`useractivity:${logId}`);
      if (log) logs.push(log);
    }
  }
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getAllUserActivityLogs(limit = 300): Promise<UserActivityLog[]> {
  const entries = await kv.getByPrefix('useractivity:');
  const logs: UserActivityLog[] = [];
  for (const entry of entries) {
    if (entry && typeof entry === 'object' && (entry as any).id && (entry as any).action) {
      logs.push(entry as UserActivityLog);
    }
  }
  return logs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
// ── End User Activity Log ──────────────────────────────────────────────────

export const ALL_AVAILABLE_PERMISSIONS: Permission[] = [
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
  'support.view',
];

// Role-Permission Mapping
export const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  superadmin: [...ALL_AVAILABLE_PERMISSIONS],
  system_admin: [...ALL_AVAILABLE_PERMISSIONS],
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
    'support.view',
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
  hr_manager: [
    'users.view', 'users.create', 'users.edit',
    'payments.view', 'payments.approve',
    'reports.view',
    'admins.view',
  ],
  hr_specialist: [
    'users.view', 'users.create', 'users.edit',
    'payments.view',
    'reports.view',
  ],
  hr_coordinator: [
    'users.view',
    'payments.view',
  ],
  payroll_manager: [
    'users.view',
    'payments.view', 'payments.approve',
    'reports.view',
  ],
  recruitment_officer: [
    'users.view', 'users.create',
    'reports.view',
  ],
  staff: [],
};

function normalizeDepartment(department?: string): string {
  return String(department || '').trim().toLowerCase();
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function uniquePermissions(permissions: readonly string[] | undefined): Permission[] {
  return Array.from(new Set((permissions || []).filter((item): item is Permission => typeof item === 'string' && item.trim().length > 0)));
}

function getDefaultPermissions(role: AdminRole): Permission[] {
  return uniquePermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
}

function getEffectivePermissions(admin: AdminUser): Permission[] {
  const storedPermissions = uniquePermissions(admin.permissions);
  if (storedPermissions.length > 0) {
    return storedPermissions;
  }

  return getDefaultPermissions(admin.role);
}

function isElevatedDepartment(department?: string): boolean {
  const normalized = normalizeDepartment(department);
  return normalized === 'admin' || normalized === 'administration' || normalized === 'system administration';
}

export function isAdminActive(admin: AdminUser | null | undefined): admin is AdminUser {
  return Boolean(admin && admin.status !== 'inactive' && admin.status !== 'suspended');
}

export function hasElevatedAdminAccess(admin: AdminUser | null | undefined): boolean {
  return Boolean(admin && (admin.role === 'superadmin' || admin.role === 'system_admin' || isElevatedDepartment(admin.department)));
}

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
    permissions: getDefaultPermissions(role),
    department,
    status: 'active',
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

  const admin = await kv.get<AdminUser>(`admin:${adminId}`);
  if (!admin) return null;

  let shouldPersist = false;
  const normalizedPermissions = uniquePermissions(admin.permissions);

  if (!arraysEqual(admin.permissions || [], normalizedPermissions)) {
    admin.permissions = normalizedPermissions;
    shouldPersist = true;
  }

  if (admin.permissions.length === 0) {
    admin.permissions = getDefaultPermissions(admin.role);
    shouldPersist = true;
  }

  if (!admin.status) {
    admin.status = 'active';
    shouldPersist = true;
  }

  if (shouldPersist) {
    admin.updatedAt = new Date().toISOString();
    await kv.set(`admin:${adminId}`, admin);
  }

  return admin;
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
  admin.permissions = getDefaultPermissions(newRole);
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
  if (!isAdminActive(admin)) return false;

  if (hasElevatedAdminAccess(admin)) {
    return true;
  }

  return getEffectivePermissions(admin).includes(permission);
}

// Check if user has role
export async function hasRole(
  userId: string,
  role: AdminRole
): Promise<boolean> {
  const admin = await getAdminUser(userId);
  if (!isAdminActive(admin)) return false;

  // Elevated administrators can satisfy role checks for protected actions.
  if (admin.role === 'superadmin' || admin.role === 'system_admin') return true;

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

  let adminUserEmail: string | undefined;
  try {
    const userProfile = await kv.get<any>(`user:${adminUserId}`);
    adminUserEmail = userProfile?.email;
  } catch (_) {}

  const log: AuditLog = {
    id,
    adminUserId,
    adminUserEmail,
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

// Get all audit logs (admin view — no filter)
export async function getAllAuditLogs(limit: number = 200): Promise<AuditLog[]> {
  const entries = await kv.getByPrefix('audit:');
  const logs: AuditLog[] = [];

  for (const entry of entries) {
    // Only include entries that are full AuditLog objects (not index keys)
    if (entry && typeof entry === 'object' && (entry as any).id && (entry as any).action) {
      logs.push(entry as AuditLog);
    }
  }

  return logs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
export async function updateAdminActivity(userId: string): Promise<void> {
  const admin = await getAdminUser(userId);
  if (!isAdminActive(admin)) return;

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
    system_admin: 0,
    admin_operations: 0,
    admin_finance: 0,
    admin_content: 0,
    admin_support: 0,
    admin_fraud: 0,
    admin_analytics: 0,
    hr_manager: 0,
    hr_specialist: 0,
    hr_coordinator: 0,
    payroll_manager: 0,
    recruitment_officer: 0,
    staff: 0,
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