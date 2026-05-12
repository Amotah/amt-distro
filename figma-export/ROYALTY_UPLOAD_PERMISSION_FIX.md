# Royalty Upload Permission Fix

## Issue
Super admins were receiving "Access Denied" when trying to access the Royalty Upload page (`/admin/royalty-upload`), even though they should have full access to all features.

## Root Cause
The `hasPermission()` function in `/src/app/contexts/AdminContext.tsx` was not checking if the user was a super admin before checking the permissions array. This meant that super admins were only granted permissions explicitly listed in their `permissions` array, rather than having automatic access to all permissions.

## Solution
Updated the `hasPermission()` function in the `AdminContext` to check if the user is a super admin first:

```typescript
function hasPermission(permission: string): boolean {
  if (!adminUser) return false;
  if (adminUser.role === 'superadmin') return true; // Superadmin has all permissions
  return adminUser.permissions.includes(permission);
}
```

## Changes Made

### File: `/src/app/contexts/AdminContext.tsx`
**Line 176-179**: Added super admin check to the `hasPermission` function

**Before:**
```typescript
function hasPermission(permission: string): boolean {
  if (!adminUser) return false;
  return adminUser.permissions.includes(permission);
}
```

**After:**
```typescript
function hasPermission(permission: string): boolean {
  if (!adminUser) return false;
  if (adminUser.role === 'superadmin') return true; // Superadmin has all permissions
  return adminUser.permissions.includes(permission);
}
```

## Verification

### Backend Permissions
The backend service (`/supabase/functions/server/admin-service.tsx`) already correctly defines all permissions for super admins:

```typescript
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  superadmin: [
    // All permissions - full access
    'users.view', 'users.edit', 'users.delete', 'users.ban', 'users.verify',
    'artists.view', 'artists.edit', 'artists.delete', 'artists.verify',
    'releases.view', 'releases.edit', 'releases.delete', 'releases.approve', 'releases.takedown',
    'distributions.view', 'distributions.retry', 'distributions.cancel',
    'royalties.view', 'royalties.edit', 'royalties.approve', 'royalties.dispute', 'royalties.manage',
    'payments.view', 'payments.approve', 'payments.cancel', 'payments.refund',
    'reports.view', 'reports.upload',  // ← Royalty Upload permission
    'fraud.view', 'fraud.investigate', 'fraud.resolve', 'fraud.flag_users',
    'admins.view', 'admins.create', 'admins.edit', 'admins.delete',
    'system.settings', 'system.logs', 'system.analytics',
  ],
  // ... other roles
};
```

### Royalty Upload Component
The `RoyaltyUpload` component (`/src/app/components/admin/RoyaltyUpload.tsx`) checks for these permissions:
- **View Permission**: `reports.view` (line 87)
- **Upload Permission**: `reports.upload` (line 86)

Both permissions are now automatically granted to super admins via the updated `hasPermission()` function.

## Impact

### Super Admins
✅ **Full access** to Royalty Upload page
✅ **Full access** to ALL admin features
✅ No need to explicitly check each permission

### Other Admin Roles
✅ **Finance Admins** (`admin_finance`) - Has `reports.upload` permission
✅ **Other roles** - Restricted based on their specific permission sets

## Testing
After this fix, super admins should be able to:
1. ✅ Navigate to `/admin/royalty-upload`
2. ✅ See the upload form (checks `canUpload` which uses `reports.upload` permission)
3. ✅ View upload history (checks `canView` which uses `reports.view` permission)
4. ✅ Upload CSV/Excel files
5. ✅ Manage upload records

## Related Files
- `/src/app/contexts/AdminContext.tsx` - Permission checking logic ✅ FIXED
- `/src/app/components/admin/RoyaltyUpload.tsx` - Uses permission checks
- `/supabase/functions/server/admin-service.tsx` - Backend permission definitions
- `/src/app/admin-routes.tsx` - Route configuration

## Status
✅ **RESOLVED** - Super admins now have full access to Royalty Upload and all other features

## Additional Notes
The same pattern is used in the `isRole()` function, which already correctly checks for super admin status:
```typescript
function isRole(role: string): boolean {
  if (!adminUser) return false;
  if (adminUser.role === 'superadmin') return true; // Superadmin has all roles
  return adminUser.role === role;
}
```

This ensures consistency across role and permission checking throughout the admin system.
