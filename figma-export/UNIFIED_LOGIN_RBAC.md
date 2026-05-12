# 🔐 Unified Login with Role-Based Access Control (RBAC)

## 🎉 Overview

AMTDISTRO now has a **unified login system** where all users (artists, labels, and admins) use the **same login page**. The system uses **Role-Based Access Control (RBAC)** to automatically route users to the appropriate dashboard based on their role.

---

## ✨ Key Features

✅ **Single Login Page** - One login for everyone  
✅ **Username or Email** - Login with either format  
✅ **Automatic Role Detection** - System checks user role after login  
✅ **Smart Routing** - Auto-redirect based on role  
✅ **Unified Authentication** - Uses Supabase Auth for all users  
✅ **Seamless Experience** - No need to know admin URL  

---

## 🚀 How It Works

### Login Flow

```
1. User enters credentials (email or username + password)
   ↓
2. System authenticates with Supabase
   ↓
3. System checks user's role:
   - Is user an admin? → Check admin table
   - Is user a regular user? → Check user profile
   ↓
4. Auto-redirect based on role:
   - Admin → /admin (Admin Dashboard)
   - Artist/Label → /dashboard (User Dashboard)
```

### Role Detection

```typescript
Login → Supabase Auth → Check Role
                           ├─→ Admin? → Admin Dashboard
                           ├─→ Artist? → Artist Dashboard
                           └─→ Label? → Label Dashboard
```

---

## 🔑 Login Methods

### Method 1: Email Address

```
Email: admin@amtdistro.com
Password: admin
```

### Method 2: Username

```
Username: admin
Password: admin
```

The system automatically converts:
- `admin` → `admin@amtdistro.com`
- `artist123` → `artist123@amtdistro.com`

---

## 👥 User Roles

### 1. **Admin Roles**

After login, admins are redirected to `/admin`:

| Role | Description | Access Level |
|------|-------------|--------------|
| **Super Admin** | Full platform control | All 35 permissions |
| **Finance Admin** | Financial operations | Royalties, payments |
| **Content Admin** | Content moderation | Releases, distribution |
| **Support Admin** | Customer support | User assistance |
| **Fraud Admin** | Security monitoring | Fraud detection |
| **Analytics Admin** | Data & reporting | Read-only analytics |

### 2. **Regular User Roles**

After login, regular users are redirected to `/dashboard`:

| Role | Description | Access Level |
|------|-------------|--------------|
| **Artist** | Individual musician | Upload music, view earnings |
| **Label** | Record label | Manage multiple artists |

---

## 📋 Test Credentials

### Admin Account

```
Username: admin
Email: admin@amtdistro.com
Password: admin
Role: Super Admin

→ Redirects to: /admin (Admin Dashboard)
```

### Artist Account (Create via Signup)

```
After signup:
Role: Artist
Subscription: Free/Artist/Label

→ Redirects to: /dashboard (Artist Dashboard)
```

---

## 🎯 Login Page Changes

### Updated UI

**Before:**
- Label: "Email Address"
- Placeholder: "you@example.com"

**After:**
- Label: "Email Address or Username"
- Placeholder: "you@example.com or username"

### Error Handling

✅ **Clear error messages:**
- "Invalid email/username or password"
- "Profile not found. Please complete signup first"
- "This account does not have admin privileges"

✅ **Loading states:**
- Button shows spinner during login
- Disabled form while processing

---

## 🔧 Technical Implementation

### Files Modified

1. **`/src/app/components/Login.tsx`**
   - Added username support
   - Integrated Supabase authentication
   - Added role detection logic
   - Auto-routing based on role

2. **`/src/app/App.tsx`**
   - Updated `handleLogin` to accept role parameter
   - Added role-based routing logic
   - Sets admin mode flag for admin users

3. **`/src/app/contexts/AdminContext.tsx`**
   - Enhanced admin verification
   - Works with unified login system
   - Checks sessionStorage for admin tokens

4. **`/supabase/functions/server/init-admin.tsx`**
   - Auto-creates test admin on server start
   - Sets up complete admin profile

---

## 🛡️ Security Features

### Session Management

```typescript
// Login stores:
sessionStorage.setItem('access_token', token);
sessionStorage.setItem('user_id', userId);
sessionStorage.setItem('user_role', role);

// For admins also stores:
sessionStorage.setItem('admin_access_token', token);
```

### Role Verification

```typescript
// System verifies role on:
1. Initial login
2. Page refresh
3. Route navigation
4. API calls
```

### Protected Routes

- Admin routes require `user_role === 'admin'`
- User routes require valid authentication
- Auto-redirect to login if not authenticated

---

## 📖 Usage Examples

### Example 1: Admin Login

```
1. Go to http://localhost:5173/#login
2. Enter: admin
3. Enter: admin
4. Click "Sign In"
5. ✅ Redirected to http://localhost:5173/admin
```

### Example 2: Artist Login with Email

```
1. Go to http://localhost:5173/#login
2. Enter: artist@example.com
3. Enter: password123
4. Click "Sign In"
5. ✅ Redirected to http://localhost:5173/dashboard
```

### Example 3: Username Login

```
1. Go to http://localhost:5173/#login
2. Enter: myusername
3. Enter: mypassword
4. Click "Sign In"
5. ✅ System converts to myusername@amtdistro.com
6. ✅ Authenticates and redirects based on role
```

---

## 🔄 Flow Diagrams

### Login Success Flow

```
┌─────────────────────────────────────────────────────┐
│          User Enters Credentials                     │
│     (email/username + password)                     │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│        Convert Username to Email                     │
│     (if needed: admin → admin@amtdistro.com)        │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│         Supabase Authentication                      │
│     (signInWithPassword)                            │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│          Fetch User Profile                          │
│     (GET /users/me)                                 │
└─────────────────┬───────────────────────────────────┘
                  │
                  ├─── ✅ Profile Found
                  │        │
                  │        ▼
                  │   ┌──────────────────────────┐
                  │   │  Check Role              │
                  │   │  - artist                │
                  │   │  - label                 │
                  │   │  - admin                 │
                  │   └─────────┬────────────────┘
                  │             │
                  │             ▼
                  │   ┌──────────────────────────┐
                  │   │  Store in sessionStorage │
                  │   │  - access_token          │
                  │   │  - user_id               │
                  │   │  - user_role             │
                  │   └─────────┬────────────────┘
                  │             │
                  │             ▼
                  │   ┌──────────────────────────┐
                  │   │  Route Based on Role     │
                  │   │                          │
                  │   │  Admin → /admin          │
                  │   │  Artist/Label → /dashboard│
                  │   └──────────────────────────┘
                  │
                  └─── ❌ Profile Not Found
                           │
                           ▼
                      ┌──────────────────────────┐
                      │  Check Admin Status      │
                      │  (GET /admin/users)      │
                      └─────────┬────────────────┘
                                │
                                ├─── ✅ Is Admin
                                │        │
                                │        ▼
                                │   Redirect to /admin
                                │
                                └─── ❌ Not Admin
                                         │
                                         ▼
                                    Show Error
```

---

## 🎨 UI Components

### Login Form Structure

```tsx
<form>
  {/* Email or Username Input */}
  <Input
    label="Email Address or Username"
    placeholder="you@example.com or username"
    type="text"
  />
  
  {/* Password Input with Show/Hide */}
  <Input
    label="Password"
    type="password"
    showToggle={true}
  />
  
  {/* Remember Me Checkbox */}
  <Checkbox label="Remember me" />
  
  {/* Submit Button with Loading State */}
  <Button type="submit" loading={isLoading}>
    {isLoading ? 'Signing in...' : 'Sign In'}
  </Button>
  
  {/* Error Message */}
  {error && <Alert type="error">{error}</Alert>}
</form>
```

---

## 🐛 Troubleshooting

### Issue: "Profile not found" error

**Cause**: User account exists in Supabase Auth but no profile in database

**Solution**:
1. Complete the signup flow to create profile
2. Or manually create profile via API
3. Admins are automatically detected even without regular profile

---

### Issue: Redirects to wrong dashboard

**Cause**: Role not properly detected or stored

**Solution**:
1. Check sessionStorage: `sessionStorage.getItem('user_role')`
2. Verify user has correct role in database
3. Clear session and login again

---

### Issue: Username login not working

**Cause**: Username-to-email conversion failing

**Solution**:
1. Try using full email instead
2. Check for typos in username
3. Verify email domain is `@amtdistro.com`

---

### Issue: Admin can't access admin panel

**Cause**: Admin record not created or session not stored

**Solution**:
1. Verify admin record exists: Check `/admin/users` API
2. Clear all session storage
3. Login again
4. Check that `user_role === 'admin'` is set

---

## 📊 Session Storage Keys

| Key | Value | Purpose |
|-----|-------|---------|
| `access_token` | JWT token | Supabase session token |
| `user_id` | UUID | User's unique ID |
| `user_role` | artist/label/admin | User's role |
| `admin_access_token` | JWT token | Admin-specific token (admins only) |

---

## 🎯 Benefits of Unified Login

✅ **Simplified UX** - One login page for everyone  
✅ **No Confusion** - Users don't need to know admin URL  
✅ **Automatic Routing** - System handles redirection  
✅ **Flexible Input** - Accept both email and username  
✅ **Role-Based Security** - Proper access control  
✅ **Unified Auth** - Single authentication system  
✅ **Easy Management** - Centralized user management  

---

## 🚀 Quick Start

### For Regular Users

1. Go to **http://localhost:5173/#login**
2. Enter your **email or username**
3. Enter your **password**
4. Click **"Sign In"**
5. ✅ **Automatically** redirected to your dashboard

### For Admins

1. Go to **http://localhost:5173/#login**
2. Enter: **admin** (or admin@amtdistro.com)
3. Enter: **admin**
4. Click **"Sign In"**
5. ✅ **Automatically** redirected to admin panel

---

## 📝 Best Practices

### For Users

- Use email for clarity
- Remember your username if set
- Enable "Remember me" for convenience

### For Admins

- Never share admin credentials
- Use strong passwords in production
- Enable 2FA when available
- Monitor audit logs regularly

### For Developers

- Always check user role before routing
- Store tokens securely in sessionStorage
- Handle authentication errors gracefully
- Verify admin status on protected routes

---

## 🎉 Summary

The unified login system provides:

✅ **One Login Page** - All users use same endpoint  
✅ **Smart Routing** - Auto-redirect based on role  
✅ **Username Support** - Login with username or email  
✅ **RBAC Integration** - Complete role-based access control  
✅ **Seamless Experience** - No manual navigation needed  

**Just login and let the system route you to the right place!** 🚀

---

## 📞 Support

For issues with unified login:
1. Check sessionStorage values
2. Verify user role in database
3. Review browser console for errors
4. Check `/ADMIN_DASHBOARD_README.md` for admin features
5. See `/ADMIN_QUICK_START.md` for setup guide

---

**Login URL**: `http://localhost:5173/#login`  
**Test Admin**: `admin / admin`  
**Auto-Routing**: ✅ Enabled  
**RBAC**: ✅ Active  

The login system is now fully unified with automatic role-based routing! 🎊
