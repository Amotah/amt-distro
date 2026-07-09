import type { AdminUser } from './admin-api';

export type AdminDepartmentKey = 'content' | 'finance' | 'operations' | 'hr' | 'admin';

type AdminAccessUser = Pick<AdminUser, 'role' | 'department' | 'permissions'> | null | undefined;

type AdminAccessRule = {
  path: string;
  exact?: boolean;
  departments?: AdminDepartmentKey[];
  permission?: string;
  elevatedOnly?: boolean;
};

const ADMIN_ROUTE_ACCESS_RULES: AdminAccessRule[] = [
  { path: '/staff-portal', exact: true },
  { path: '/admin/staff-portal-management', exact: true, departments: ['hr', 'operations', 'admin'] },

  { path: '/admin/users', exact: true, departments: ['operations', 'admin'], permission: 'users.view' },
  { path: '/admin/artist-label', exact: true, departments: ['content', 'operations', 'admin'], permission: 'users.view' },
  { path: '/admin/user-activity', exact: true, departments: ['operations', 'admin'], permission: 'users.view' },
  { path: '/admin/releases', exact: true, departments: ['content', 'admin'], permission: 'releases.view' },
  { path: '/admin/track-upload', exact: true, departments: ['content', 'admin'], permission: 'releases.edit' },
  { path: '/admin/content-moderation', exact: true, departments: ['content', 'admin'], permission: 'releases.approve' },
  { path: '/admin/content-moderation-panel', exact: true, departments: ['content', 'admin'], permission: 'releases.approve' },

  { path: '/admin/analytics', exact: true, departments: ['operations', 'admin'], permission: 'system.analytics' },
  { path: '/admin/advanced-analytics', exact: true, departments: ['operations', 'admin'], permission: 'system.analytics' },
  { path: '/admin/analytics-upload', exact: true, departments: ['operations', 'admin'] },

  { path: '/admin/promotions', exact: true, departments: ['content', 'operations', 'admin'] },

  { path: '/admin/revenue', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/financial-dashboard', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/expenses', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/accounting-ledger', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/trial-balance', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/balance-sheet', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/income-statement', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/payments', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/subscriptions', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/coupons', exact: true, departments: ['finance', 'admin'], permission: 'payments.approve' },
  { path: '/admin/bank-accounts', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/bank-reconciliation', exact: true, departments: ['finance', 'admin'], permission: 'payments.view' },
  { path: '/admin/unmatched-records', exact: true, departments: ['finance', 'admin'], permission: 'royalties.view' },
  { path: '/admin/disputes', exact: true, departments: ['finance', 'operations', 'admin'], permission: 'payments.view' },

  { path: '/admin/hr-dashboard', exact: true, departments: ['hr', 'admin'], permission: 'users.view' },
  { path: '/admin/payroll', exact: true, departments: ['finance', 'hr', 'admin'], permission: 'payments.view' },
  { path: '/admin/admins', exact: true, departments: ['hr', 'admin'], permission: 'admins.view' },
  { path: '/admin/internal-users', exact: true, departments: ['hr', 'admin'], permission: 'admins.create', elevatedOnly: true },

  { path: '/admin/fraud', exact: true, departments: ['operations', 'admin'], permission: 'fraud.view' },
  { path: '/admin/copyright', exact: true, departments: ['content', 'admin'], permission: 'releases.approve' },
  { path: '/admin/audit-logs', exact: true, departments: ['admin'], permission: 'system.logs', elevatedOnly: true },
  { path: '/admin/access-control', exact: true, departments: ['admin'], permission: 'admins.view', elevatedOnly: true },
  { path: '/admin/security', exact: true, departments: ['admin'], permission: 'admins.view', elevatedOnly: true },
  { path: '/admin/system-config', exact: true, departments: ['admin'], permission: 'system.settings', elevatedOnly: true },
  { path: '/admin/support', exact: true, departments: ['operations', 'admin'], permission: 'support.view' },

  { path: '/admin/blog-posts', exact: true, departments: ['content', 'admin'] },
  { path: '/admin/contracts', exact: true, departments: ['content', 'admin'] },

  { path: '/admin/settings', exact: true, departments: ['admin'], elevatedOnly: true },
  { path: '/admin', exact: true },
];

function normalizeValue(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

export function getNormalizedAdminDepartment(user: AdminAccessUser): AdminDepartmentKey | null {
  const department = normalizeValue(user?.department);
  if (department === 'content') return 'content';
  if (department === 'finance') return 'finance';
  if (department === 'operations') return 'operations';
  if (department === 'hr' || department === 'human resources') return 'hr';
  if (department === 'admin' || department === 'administration' || department === 'system administration') return 'admin';

  const role = normalizeValue(user?.role);
  if (role === 'superadmin' || role === 'system_admin') return 'admin';
  if (role === 'admin_content') return 'content';
  if (role === 'admin_finance' || role === 'payroll_manager') return 'finance';
  if (role === 'hr_manager' || role === 'hr_specialist' || role === 'hr_coordinator' || role === 'recruitment_officer') return 'hr';
  if (role === 'admin_operations' || role === 'admin_support' || role === 'admin_fraud' || role === 'admin_analytics') return 'operations';

  return null;
}

export function hasElevatedAdminAccess(user: AdminAccessUser) {
  const role = normalizeValue(user?.role);
  return role === 'superadmin' || role === 'system_admin' || getNormalizedAdminDepartment(user) === 'admin';
}

function matchesRule(pathname: string, rule: AdminAccessRule) {
  if (rule.exact) {
    return pathname === rule.path;
  }
  return pathname === rule.path || pathname.startsWith(`${rule.path}/`);
}

function getAccessRule(pathname: string) {
  return [...ADMIN_ROUTE_ACCESS_RULES]
    .sort((left, right) => right.path.length - left.path.length)
    .find((rule) => matchesRule(pathname, rule)) || null;
}

export function canAccessAdminPath(user: AdminAccessUser, pathname: string) {
  if (!user) return false;

  const rule = getAccessRule(pathname);
  if (!rule) {
    return hasElevatedAdminAccess(user);
  }

  const elevated = hasElevatedAdminAccess(user);
  if (rule.elevatedOnly && !elevated) {
    return false;
  }

  if (rule.permission && !elevated && !user.permissions.includes(rule.permission)) {
    return false;
  }

  if (!rule.departments || rule.departments.length === 0 || elevated) {
    return true;
  }

  const department = getNormalizedAdminDepartment(user);
  return Boolean(department && rule.departments.includes(department));
}
