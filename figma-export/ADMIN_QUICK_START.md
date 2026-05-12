# 🚀 Admin Dashboard Quick Start Guide

## Step 1: Access the Admin Login

Navigate to the admin login page:
```
http://localhost:5173/admin/login
```

## Step 2: Create Your First Superadmin

You cannot login yet because no admin users exist. You need to create the first superadmin using the backend API.

### Option A: Using the Backend API Directly

1. **First, create a regular user account:**
   - Go to the main website signup: `http://localhost:5173/#get-started`
   - Complete the signup process
   - Note down your email and password

2. **Get your user ID:**
   - After signup, check the browser console or network tab
   - Look for the user ID in the response (it's a UUID)
   - Or query the database: `SELECT * FROM users WHERE email = 'your-email@example.com'`

3. **Create the superadmin via API:**

Using `curl`:
```bash
# First, login to get an access token
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/auth/v1/signup' \
  -H 'Content-Type: application/json' \
  -H 'apikey: YOUR_ANON_KEY' \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'

# Use the access_token from the response
# Then create the admin user
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-79198001/admin/users' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "your-user-id-here",
    "role": "superadmin",
    "department": "Executive"
  }'
```

### Option B: Using the Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run this SQL command:

```sql
-- First, get your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then, manually insert into the KV store
-- Replace 'YOUR_USER_ID' with the actual UUID from above
INSERT INTO kv_store_79198001 (key, value, created_at, updated_at)
VALUES (
  'admin:YOUR_USER_ID',
  '{
    "id": "admin-uuid-generate-random",
    "userId": "YOUR_USER_ID",
    "role": "superadmin",
    "permissions": [
      "users.view", "users.edit", "users.delete", "users.ban", "users.verify",
      "artists.view", "artists.edit", "artists.delete", "artists.verify",
      "releases.view", "releases.edit", "releases.delete", "releases.approve", "releases.takedown",
      "distributions.view", "distributions.retry", "distributions.cancel",
      "royalties.view", "royalties.edit", "royalties.approve", "royalties.dispute",
      "payments.view", "payments.approve", "payments.cancel", "payments.refund",
      "fraud.view", "fraud.investigate", "fraud.resolve", "fraud.flag_users",
      "admins.view", "admins.create", "admins.edit", "admins.delete",
      "system.settings", "system.logs", "system.analytics"
    ],
    "department": "Executive",
    "createdBy": "system",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }',
  NOW(),
  NOW()
),
(
  'admin:user:YOUR_USER_ID',
  '"admin-uuid-generate-random"',
  NOW(),
  NOW()
);

-- Also update the user role
UPDATE kv_store_79198001 
SET value = jsonb_set(value::jsonb, '{role}', '"admin"')
WHERE key = 'user:YOUR_USER_ID';
```

### Option C: Using Browser Console (Easiest)

1. **Signup for an account** at `http://localhost:5173/#get-started`

2. **After signup, open browser console** (F12)

3. **Run this code** in the console:

```javascript
// This will create a superadmin for the currently logged-in user
const projectId = 'YOUR_PROJECT_ID';
const publicAnonKey = 'YOUR_ANON_KEY';

// Get current session
const supabase = window.supabase || await import('@supabase/supabase-js').then(m => 
  m.createClient(`https://${projectId}.supabase.co`, publicAnonKey)
);

const { data: { session } } = await supabase.auth.getSession();
const userId = session.user.id;
const accessToken = session.access_token;

// Create superadmin
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-79198001/admin/users`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: userId,
      role: 'superadmin',
      department: 'Executive'
    })
  }
);

const result = await response.json();
console.log('✅ Superadmin created:', result);
```

## Step 3: Login to Admin Dashboard

1. Go to: `http://localhost:5173/admin/login`
2. Enter your email and password (same as your regular account)
3. Click "Sign In"
4. You'll be redirected to the admin dashboard!

## Step 4: Create Additional Admin Users

Once logged in as superadmin:

1. Go to **Admin Users** in the sidebar
2. Click **Add Admin** button
3. Enter the user ID of an existing user
4. Select the appropriate role:
   - `admin_finance` - For finance team
   - `admin_content` - For content moderators
   - `admin_support` - For customer support
   - `admin_fraud` - For security team
   - `admin_analytics` - For data analysts
5. Optional: Add department name
6. Click **Create Admin**

## 🎯 Quick Reference

### Admin Roles
- **superadmin** - Full access to everything
- **admin_finance** - Royalties & payments
- **admin_content** - Releases & distribution
- **admin_support** - Customer support
- **admin_fraud** - Security & fraud detection
- **admin_analytics** - Read-only analytics

### Admin Routes
- `/admin/login` - Login page
- `/admin` - Dashboard home
- `/admin/users` - User management
- `/admin/releases` - Release management
- `/admin/royalties` - Royalty management
- `/admin/fraud` - Fraud monitoring
- `/admin/admins` - Admin user management
- `/admin/audit-logs` - Audit logs
- `/admin/settings` - Settings

## 🆘 Troubleshooting

### "This account does not have admin privileges"
- You successfully logged in but the user isn't an admin
- Follow Step 2 to create the admin user first

### "Admin verification failed"
- The backend admin service isn't running
- Check that your Supabase functions are deployed
- Verify the server is running at the correct URL

### Cannot access certain features
- Check your admin role
- Some features require specific permissions
- Contact a superadmin to update your role

## 🎉 You're All Set!

Your admin dashboard is now ready to use. Explore the different sections and manage your AMTDISTRO platform with ease!

For detailed documentation, see:
- `/ADMIN_DASHBOARD_README.md` - Complete feature guide
- `/ADMIN_SYSTEM_DOCUMENTATION.md` - Technical API documentation
- `/DATABASE_SCHEMA.md` - Database schema reference
