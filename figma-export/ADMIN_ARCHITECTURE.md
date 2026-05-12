# AMTDISTRO Admin System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AMTDISTRO PLATFORM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │   Main Website   │              │  Admin Dashboard │        │
│  │                  │              │                  │        │
│  │  /               │              │  /admin/login    │        │
│  │  /get-started    │              │  /admin          │        │
│  │  /login          │              │  /admin/users    │        │
│  │  /dashboard      │              │  /admin/releases │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
│           │                                 │                   │
│           │         ┌───────────────────────┘                   │
│           │         │                                           │
│           ▼         ▼                                           │
│  ┌─────────────────────────────────────────────────┐          │
│  │         Supabase Authentication                 │          │
│  │  (Shared between Main App and Admin Panel)     │          │
│  └─────────────────────────────────────────────────┘          │
│                      │                                          │
│                      ▼                                          │
│  ┌─────────────────────────────────────────────────┐          │
│  │         Backend API Server                      │          │
│  │  (Hono + Supabase Edge Functions)              │          │
│  │                                                  │          │
│  │  ├── User Service                               │          │
│  │  ├── Upload Service                             │          │
│  │  ├── Metadata Service                           │          │
│  │  ├── Distribution Service                       │          │
│  │  ├── Royalty Service                            │          │
│  │  ├── Payment Service                            │          │
│  │  ├── Fraud Detection Service                    │          │
│  │  └── Admin Service ← NEW                        │          │
│  │                                                  │          │
│  └─────────────────┬────────────────────────────────┘          │
│                    │                                            │
│                    ▼                                            │
│  ┌─────────────────────────────────────────────────┐          │
│  │         Supabase Database                       │          │
│  │  (Key-Value Store: kv_store_79198001)          │          │
│  │                                                  │          │
│  │  ├── user:*          (User data)                │          │
│  │  ├── admin:*         (Admin users) ← NEW       │          │
│  │  ├── release:*       (Releases)                 │          │
│  │  ├── earning:*       (Royalties)                │          │
│  │  ├── fraud:alert:*   (Fraud alerts)             │          │
│  │  └── audit:*         (Audit logs) ← NEW        │          │
│  │                                                  │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Admin Dashboard Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD                            │
└───────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  1. AUTHENTICATION LAYER                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AdminLogin.tsx                                             │
│      │                                                       │
│      ├─► Supabase Auth (signInWithPassword)                │
│      │                                                       │
│      └─► AdminContext                                       │
│             │                                                │
│             ├─► Verify admin status via API                │
│             ├─► Store access token                         │
│             └─► Set adminUser state                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  2. LAYOUT & NAVIGATION                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AdminLayout.tsx                                            │
│      │                                                       │
│      ├─► Sidebar Navigation                                │
│      │     ├─► Dashboard                                   │
│      │     ├─► Users                                       │
│      │     ├─► Releases                                    │
│      │     ├─► Royalties                                   │
│      │     ├─► Fraud                                       │
│      │     ├─► Admins                                      │
│      │     ├─► Audit Logs                                  │
│      │     └─► Settings                                    │
│      │                                                       │
│      ├─► Header (Logout, User Info)                        │
│      │                                                       │
│      └─► Main Content Area                                 │
│             └─► <Outlet /> (React Router)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  3. COMPONENT LAYER                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Each Component:                                            │
│      │                                                       │
│      ├─► useAdmin() hook                                   │
│      │     ├─► Get adminUser                               │
│      │     ├─► Check permissions (hasPermission)           │
│      │     └─► Check role (isSuperAdmin, isRole)           │
│      │                                                       │
│      ├─► Admin API Client                                  │
│      │     ├─► GET requests (fetch data)                   │
│      │     ├─► PUT requests (update data)                  │
│      │     ├─► POST requests (create data)                 │
│      │     └─► DELETE requests (remove data)               │
│      │                                                       │
│      └─► UI Rendering                                      │
│            ├─► Tables with data                            │
│            ├─► Forms for editing                           │
│            ├─► Modals for details                          │
│            └─► Permission-based UI                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  4. API CLIENT LAYER                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  admin-api.ts                                               │
│      │                                                       │
│      ├─► getAuthToken() from sessionStorage                │
│      │                                                       │
│      ├─► apiCall<T>(endpoint, options)                     │
│      │     ├─► Add Authorization header                    │
│      │     ├─► Add Content-Type header                     │
│      │     ├─► Fetch from backend                          │
│      │     └─► Handle errors                               │
│      │                                                       │
│      └─► Typed Functions                                   │
│            ├─► createAdminUser()                           │
│            ├─► getAllUsers()                               │
│            ├─► updateRelease()                             │
│            ├─► resolveFraudAlert()                         │
│            └─► ... (20+ more)                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  5. BACKEND API LAYER                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /make-server-79198001/admin/*                             │
│      │                                                       │
│      ├─► Middleware: verifyAuth                            │
│      │     └─► Check Supabase access token                │
│      │                                                       │
│      ├─► Middleware: verifyAdmin                           │
│      │     ├─► Check if user is admin                      │
│      │     ├─► Load admin profile                          │
│      │     └─► Update last activity                        │
│      │                                                       │
│      ├─► Middleware: requirePermission(permission)         │
│      │     └─► Check if admin has specific permission     │
│      │                                                       │
│      └─► Route Handlers                                    │
│            ├─► Execute action                              │
│            ├─► Log to audit trail                          │
│            └─► Return response                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  6. SERVICE LAYER                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  admin-service.tsx                                          │
│      │                                                       │
│      ├─► createAdminUser()                                 │
│      ├─► getAdminUser()                                    │
│      ├─► updateAdminRole()                                 │
│      ├─► deleteAdminUser()                                 │
│      ├─► hasPermission()                                   │
│      ├─► hasRole()                                         │
│      ├─► logAdminAction()                                  │
│      ├─► getAdminAuditLogs()                               │
│      └─► getAdminStats()                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  7. DATA LAYER (Key-Value Store)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  KV Store Keys:                                             │
│                                                              │
│  admin:{adminId}                                            │
│      └─► AdminUser object with role & permissions         │
│                                                              │
│  admin:user:{userId}                                        │
│      └─► Admin ID lookup                                   │
│                                                              │
│  audit:{logId}                                              │
│      └─► AuditLog with action details                     │
│                                                              │
│  audit:admin:{adminUserId}:{logId}                         │
│      └─► Index for admin's actions                        │
│                                                              │
│  audit:resource:{resource}:{resourceId}:{logId}            │
│      └─► Index for resource changes                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Permission Flow

```
┌──────────────────────────────────────────────────────────────┐
│  PERMISSION CHECKING FLOW                                     │
└──────────────────────────────────────────────────────────────┘

User Action in UI
       │
       ▼
┌─────────────────────┐
│ hasPermission()     │ ◄── Component checks permission
│ check in component  │
└─────────┬───────────┘
          │
          ├─── ✅ Has Permission
          │        │
          │        ▼
          │   ┌──────────────────┐
          │   │ Show UI element  │
          │   │ Enable button    │
          │   └────────┬─────────┘
          │            │
          │            ▼
          │   ┌──────────────────┐
          │   │ API Call         │
          │   └────────┬─────────┘
          │            │
          │            ▼
          │   ┌──────────────────────────┐
          │   │ Backend Middleware       │
          │   │ - verifyAuth            │
          │   │ - verifyAdmin           │
          │   │ - requirePermission()   │
          │   └────────┬─────────────────┘
          │            │
          │            ├─── ✅ Authorized
          │            │        │
          │            │        ▼
          │            │   ┌──────────────────┐
          │            │   │ Execute Action   │
          │            │   └────────┬─────────┘
          │            │            │
          │            │            ▼
          │            │   ┌──────────────────┐
          │            │   │ Log to Audit     │
          │            │   └────────┬─────────┘
          │            │            │
          │            │            ▼
          │            │   ┌──────────────────┐
          │            │   │ Return Success   │
          │            │   └──────────────────┘
          │            │
          │            └─── ❌ Not Authorized
          │                     │
          │                     ▼
          │                ┌──────────────────┐
          │                │ Return 403 Error │
          │                └──────────────────┘
          │
          └─── ❌ No Permission
                   │
                   ▼
              ┌──────────────────┐
              │ Hide UI element  │
              │ Disable button   │
              └──────────────────┘
```

---

## Role-Permission Matrix

```
┌──────────────────────────────────────────────────────────────┐
│  ROLES VS PERMISSIONS                                         │
└──────────────────────────────────────────────────────────────┘

Permission              Super  Finance  Content  Support  Fraud  Analytics
─────────────────────────────────────────────────────────────────────────
users.view                ✅      ✅       ✅       ✅      ✅      ✅
users.edit                ✅      ❌       ❌       ✅      ❌      ❌
users.delete              ✅      ❌       ❌       ❌      ❌      ❌
users.ban                 ✅      ❌       ❌       ❌      ✅      ❌
users.verify              ✅      ❌       ❌       ❌      ❌      ❌

artists.view              ✅      ✅       ✅       ✅      ✅      ✅
artists.edit              ✅      ❌       ✅       ✅      ❌      ❌
artists.delete            ✅      ❌       ❌       ❌      ❌      ❌
artists.verify            ✅      ❌       ❌       ❌      ❌      ❌

releases.view             ✅      ✅       ✅       ✅      ✅      ✅
releases.edit             ✅      ❌       ✅       ❌      ❌      ❌
releases.delete           ✅      ❌       ❌       ❌      ❌      ❌
releases.approve          ✅      ❌       ✅       ❌      ❌      ❌
releases.takedown         ✅      ❌       ✅       ❌      ✅      ❌

distributions.view        ✅      ❌       ✅       ❌      ❌      ✅
distributions.retry       ✅      ❌       ✅       ❌      ❌      ❌
distributions.cancel      ✅      ❌       ❌       ❌      ❌      ❌

royalties.view            ✅      ✅       ❌       ✅      ✅      ✅
royalties.edit            ✅      ✅       ❌       ❌      ❌      ❌
royalties.approve         ✅      ✅       ❌       ❌      ❌      ❌
royalties.dispute         ✅      ✅       ❌       ✅      ❌      ❌

payments.view             ✅      ✅       ❌       ✅      ❌      ✅
payments.approve          ✅      ✅       ❌       ❌      ❌      ❌
payments.cancel           ✅      ✅       ❌       ❌      ❌      ❌
payments.refund           ✅      ❌       ❌       ❌      ❌      ❌

fraud.view                ✅      ❌       ❌       ✅      ✅      ✅
fraud.investigate         ✅      ❌       ❌       ❌      ✅      ❌
fraud.resolve             ✅      ❌       ❌       ❌      ✅      ❌
fraud.flag_users          ✅      ❌       ❌       ❌      ✅      ❌

admins.view               ✅      ❌       ❌       ❌      ❌      ❌
admins.create             ✅      ❌       ❌       ❌      ❌      ❌
admins.edit               ✅      ❌       ❌       ❌      ❌      ❌
admins.delete             ✅      ❌       ❌       ❌      ❌      ❌

system.settings           ✅      ❌       ❌       ❌      ❌      ❌
system.logs               ✅      ❌       ❌       ❌      ❌      ✅
system.analytics          ✅      ✅       ✅       ❌      ✅      ✅

─────────────────────────────────────────────────────────────────────────
TOTAL PERMISSIONS         35      11       10       9       10      9
```

---

## Data Flow Example: Approving a Release

```
1. Admin clicks "Approve" button
         │
         ▼
2. Component checks hasPermission('releases.approve')
         │
         ├─── ❌ No → Button is disabled/hidden
         │
         └─── ✅ Yes
                │
                ▼
3. API call: updateRelease(releaseId, { status: 'live' })
         │
         ▼
4. Backend receives request
         │
         ▼
5. Middleware: verifyAuth → Check access token
         │
         ├─── ❌ Invalid token → 401 Unauthorized
         │
         └─── ✅ Valid
                │
                ▼
6. Middleware: verifyAdmin → Check if user is admin
         │
         ├─── ❌ Not admin → 403 Forbidden
         │
         └─── ✅ Is admin
                │
                ▼
7. Middleware: requirePermission('releases.edit')
         │
         ├─── ❌ No permission → 403 Forbidden
         │
         └─── ✅ Has permission
                │
                ▼
8. Execute: metadataService.updateReleaseMetadata()
         │
         ▼
9. Update KV store: release:{releaseId}
         │
         ▼
10. Log action: logAdminAction(adminId, 'update', 'release', releaseId, changes)
         │
         ▼
11. Save to KV store: audit:{logId}
         │
         ▼
12. Return success response to frontend
         │
         ▼
13. Frontend updates UI
         │
         ▼
14. Show success message to admin
```

---

## Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  SECURITY LAYERS                                              │
└──────────────────────────────────────────────────────────────┘

Layer 1: Authentication
    ├─► Supabase Auth (JWT tokens)
    ├─► Session storage (sessionStorage)
    └─► Auto token refresh

Layer 2: Admin Verification
    ├─► Check user has admin role
    ├─► Load admin permissions
    └─► Verify admin status on every request

Layer 3: Permission Checking
    ├─► Frontend: Hide/disable unauthorized UI
    ├─► Backend: Reject unauthorized API calls
    └─► Superadmin bypass

Layer 4: Audit Logging
    ├─► Log all admin actions
    ├─► Track changes made
    ├─► Record IP and user agent
    └─► Immutable audit trail

Layer 5: Data Protection
    ├─► Can't delete own admin account
    ├─► Type-safe API calls
    ├─► Input validation
    └─► Error handling
```

---

## File Structure

```
AMTDISTRO/
│
├── src/app/
│   ├── App.tsx                          # Main app (updated for admin routing)
│   ├── admin-routes.tsx                 # Admin routing configuration
│   │
│   ├── contexts/
│   │   └── AdminContext.tsx             # Admin auth & permissions context
│   │
│   ├── utils/
│   │   └── admin-api.ts                 # Admin API client
│   │
│   └── components/admin/
│       ├── AdminLayout.tsx              # Layout with sidebar
│       ├── AdminLogin.tsx               # Login page
│       ├── AdminDashboard.tsx           # Dashboard home
│       ├── UserManagement.tsx           # User management
│       ├── ReleaseManagement.tsx        # Release management
│       ├── RoyaltyManagement.tsx        # Royalty management
│       ├── FraudMonitoring.tsx          # Fraud monitoring
│       ├── AdminUserManagement.tsx      # Admin user management
│       ├── AuditLogs.tsx                # Audit logs
│       └── AdminSettings.tsx            # Settings
│
├── supabase/functions/server/
│   ├── index.tsx                        # Main server (updated with admin routes)
│   └── admin-service.tsx                # Admin service (NEW)
│
└── Documentation/
    ├── ADMIN_DASHBOARD_README.md        # User guide
    ├── ADMIN_SYSTEM_DOCUMENTATION.md    # Technical docs
    ├── ADMIN_QUICK_START.md             # Quick start guide
    ├── ADMIN_IMPLEMENTATION_SUMMARY.md  # Implementation summary
    └── ADMIN_ARCHITECTURE.md            # This file
```

---

This architecture provides a scalable, secure, and maintainable admin system that integrates seamlessly with the existing AMTDISTRO platform! 🚀
