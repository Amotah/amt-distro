# AMTDISTRO Role-Based Access Control (RBAC) System

## Overview
AMTDISTRO implements a comprehensive role-based access control system with unified login for all users. All users (artists, labels, and admins) login through the same page at `/#login` and are automatically routed based on their role.

## User Roles

### 1. Artist (`artist`)
**Access Level:** Standard User
**Dashboard:** `/dashboard` (Normal Dashboard)
**Features:**
- Upload music (limited to 2 tracks/year on free tier, unlimited on paid tier)
- View analytics and streaming data
- Manage releases and tracks
- Track royalties and earnings
- Request payouts
- Access API (on paid tier)

**Subscription Tiers:**
- **Free:** 2 uploads/year, basic features
- **Artist (₦19,990/year):** Unlimited uploads, full features, API access

---

### 2. Label (`label`)
**Access Level:** Enhanced User
**Dashboard:** `/dashboard` (Label Dashboard)
**Features:**
- All Artist features PLUS:
- **Royalty Split Management** - Distribute royalties among multiple collaborators
- Manage multiple artists under the label
- Assign tracks to artists
- View aggregated analytics across all label artists
- Advanced reporting

**Subscription Tier:**
- **Label (₦49,990/year):** Unlimited uploads, all features, multi-artist management

**Key Difference:** Labels have access to split share functionality for royalty distribution among collaborators.

---

### 3. Admin (`admin`)
**Access Level:** Administrative User
**Dashboard:** `/admin` (Admin Dashboard)
**Features:**
Based on admin role (see Admin Roles section below)

**Admin Roles:**
1. **Super Admin** (`superadmin`) - Full control over everything
2. **Operations Admin** (`admin_operations`) - Daily platform moderation
3. **Finance Admin** (`admin_finance`) - Royalties, payments, financial data
4. **Content Admin** (`admin_content`) - Releases, tracks, distributions
5. **Support Admin** (`admin_support`) - User support, disputes
6. **Fraud Admin** (`admin_fraud`) - Fraud detection, security
7. **Analytics Admin** (`admin_analytics`) - Reports, analytics, insights

---

## Admin Role Details

### 1. Super Admin (`superadmin`)
**Description:** Full control over everything  
**Use Case:** Platform owner, CTO, senior management  
**Permissions:** All 35+ permissions

### 2. Operations Admin (`admin_operations`)
**Description:** Daily platform moderation and operations team  
**Use Case:** Day-to-day platform management, upload approvals, content moderation  
**Permissions:**
- ✅ `users.view` - View all users
- ✅ `artists.view` - View all artists/labels
- ✅ `releases.view` - View all tracks and releases
- ✅ `releases.edit` - Edit release metadata
- ✅ `releases.approve` - Approve/reject uploads
- ✅ `distributions.view` - View distribution status
- ✅ `fraud.view` - View fraud reports
- ✅ `fraud.flag_users` - Flag suspicious activity
- ✅ `payments.view` - View payout requests
- ✅ `payments.approve` - Approve payouts
- ✅ `system.analytics` - View platform analytics

**Cannot Do:**
- ❌ Delete users permanently
- ❌ Edit royalty records
- ❌ Access system settings
- ❌ Create/delete other admins
- ❌ Issue refunds

### 3. Finance Admin (`admin_finance`)
**Description:** Handles all financial operations  
**Use Case:** Accounting team, finance department  
**Permissions:**
- Royalty management (view, edit, approve, disputes)
- Payment management (view, approve, cancel)
- View users, artists, releases
- System analytics

### 4. Content Admin (`admin_content`)
**Description:** Manages content and distributions  
**Use Case:** Content moderation, distribution team  
**Permissions:**
- Artist management (view, edit)
- Release management (view, edit, approve, takedown)
- Distribution management (view, retry)
- System analytics

### 5. Support Admin (`admin_support`)
**Description:** Customer support team  
**Use Case:** Handling user inquiries and disputes  
**Permissions:**
- User management (view, edit)
- Artist management (view, edit)
- View releases and payments
- Handle royalty disputes
- View fraud reports

### 6. Fraud Admin (`admin_fraud`)
**Description:** Security and fraud prevention  
**Use Case:** Detecting and preventing fraudulent activities  
**Permissions:**
- Ban users
- Flag suspicious activity
- Investigate fraud cases
- Takedown releases
- System analytics

### 7. Analytics Admin (`admin_analytics`)
**Description:** Data analysis and reporting  
**Use Case:** Business intelligence, reporting  
**Permissions:**
- View-only access to all data
- System analytics and logs
- Generate reports

---

## Default Admin Account

**Username:** admin  
**Email:** admin@amtdistro.com  
**Password:** admin  
**Role:** Super Admin  

This account is automatically created on server startup with full privileges.

---

## Login Flow

### Unified Login System
All users login through: `/#login`

```
User enters credentials (email or username)
         ↓
Authenticate with Supabase Auth
         ↓
Fetch user profile from backend
         ↓
Check user role
         ↓
    ┌────┴────┐
    ↓         ↓
  artist    label  →  Route to /dashboard
    ↓
  admin  →  Route to /admin
```

### Frontend Routing Logic

```typescript
if (role === 'admin') {
  // Redirect to admin dashboard
  window.location = '/admin';
} else if (role === 'artist' || role === 'label') {
  // Redirect to user dashboard
  window.location = '/dashboard';
}
```

---

## Permission System

### Admin Permissions (35+ granular permissions)

#### User Management
- `users.view` - View all users
- `users.edit` - Edit user profiles
- `users.delete` - Delete users
- `users.ban` - Ban users
- `users.verify` - Verify user accounts

#### Artist/Label Management
- `artists.view` - View artists
- `artists.edit` - Edit artist profiles
- `artists.delete` - Delete artists
- `artists.verify` - Verify artists

#### Release Management
- `releases.view` - View releases
- `releases.edit` - Edit releases
- `releases.delete` - Delete releases
- `releases.approve` - Approve releases
- `releases.takedown` - Take down releases

#### Distribution Management
- `distributions.view` - View distributions
- `distributions.retry` - Retry failed distributions
- `distributions.cancel` - Cancel distributions

#### Royalty Management
- `royalties.view` - View royalties
- `royalties.edit` - Edit royalty records
- `royalties.approve` - Approve royalty payments
- `royalties.dispute` - Handle disputes

#### Payment Management
- `payments.view` - View payments
- `payments.approve` - Approve payouts
- `payments.cancel` - Cancel payments
- `payments.refund` - Issue refunds

#### Fraud Management
- `fraud.view` - View fraud reports
- `fraud.investigate` - Investigate fraud
- `fraud.resolve` - Resolve fraud cases
- `fraud.flag_users` - Flag suspicious users

#### Admin Management
- `admins.view` - View admin users
- `admins.create` - Create new admins
- `admins.edit` - Edit admin roles
- `admins.delete` - Delete admins

#### System Management
- `system.settings` - Access system settings
- `system.logs` - View audit logs
- `system.analytics` - View system analytics

---

## Using Roles in Frontend

### 1. Using the Role Context

```tsx
import { useRole } from './contexts/RoleContext';

function MyComponent() {
  const { userRole, isLabel, isSuperAdmin, hasPermission } = useRole();

  return (
    <div>
      {/* Show split functionality only for labels */}
      {isLabel && (
        <RoyaltySplitManager />
      )}

      {/* Show admin features for superadmin */}
      {isSuperAdmin && (
        <SystemSettings />
      )}

      {/* Check specific permission */}
      {hasPermission('users.edit') && (
        <EditUserButton />
      )}
    </div>
  );
}
```

### 2. Session Storage Values

After login, these values are stored in `sessionStorage`:
- `user_role` - Main user role (artist, label, admin)
- `admin_role` - Admin-specific role (superadmin, admin_finance, etc.)
- `user_id` - User ID
- `access_token` - Authentication token
- `admin_permissions` - JSON array of permissions (for admins)

---

## Backend Implementation

### Role Storage
- **User role:** Stored in `user:${userId}` record with `role` field
- **Admin role:** Stored in `admin:${adminId}` record with `role` and `permissions` fields

### API Endpoints

#### Check User Profile
```
GET /make-server-79198001/users/me
Authorization: Bearer {access_token}
```

Returns user profile with role information.

#### Get Admin Users
```
GET /make-server-79198001/admin/users
Authorization: Bearer {access_token}
```

Returns all admin users (requires admin authentication).

---

## Key Features by Role

| Feature | Artist | Label | Admin |
|---------|--------|-------|-------|
| Upload Music | ✓ | ✓ | ✓ |
| View Analytics | ✓ | ✓ | ✓ |
| Track Royalties | ✓ | ✓ | ✓ |
| **Royalty Splits** | ✗ | ✓ | ✓ |
| **Manage Artists** | ✗ | ✓ | ✓ |
| **Admin Dashboard** | ✗ | ✗ | ✓ |
| **User Management** | ✗ | ✗ | ✓* |
| **System Settings** | ✗ | ✗ | ✓* |

*Depends on specific admin permissions

---

## Troubleshooting

### "Profile not found" Error
If you see this error when logging in as admin, visit:
```
https://[your-app-url]/#fix-admin
```

Click "Fix Admin Account" to reinitialize the default admin user.

### Can't Access Admin Dashboard
1. Check that you're logging in with admin credentials
2. Verify `user_role` in sessionStorage is set to 'admin'
3. Ensure you're being redirected to `/admin` route

### Missing Permissions
1. Check `admin_role` in sessionStorage
2. Verify permissions in `admin_permissions` sessionStorage key
3. Contact superadmin to update your role

---

## Security Notes

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend**
2. All admin actions are logged in audit trail
3. Permissions are checked on both frontend and backend
4. Session tokens expire and require re-authentication
5. Password reset emails are not configured (email server needed)

---

## Next Steps

1. Configure email server for password resets
2. Set up OAuth providers (Google, Apple) for social login
3. Add custom roles and permissions as needed
4. Implement two-factor authentication for admin accounts
5. Set up IP whitelisting for admin access