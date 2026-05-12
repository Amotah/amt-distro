# 🔧 Fix Login Error - "Invalid login credentials"

## Problem

You're seeing this error when trying to login:
```
Login error: AuthApiError: Invalid login credentials
```

This means the admin user hasn't been created in Supabase Auth yet.

---

## ✅ Quick Fix (3 Easy Steps)

### Step 1: Look for the Helper Button

When you go to the login page (`http://localhost:5173/#login`), you should see a **small button in the bottom right corner** that says:

```
┌─────────────────────────────┐
│ 🛡️ Admin Setup              │
│ Initialize test admin       │
│                             │
│ [Create Admin Account]      │
└─────────────────────────────┘
```

### Step 2: Click the Button

Click **"Create Admin Account"** button. This will:
- Create the admin user in Supabase Auth
- Create the admin profile in the database
- Set up superadmin permissions

You'll see a success message:
```
✅ Success!
Admin user created successfully! 
You can now login with: admin / admin
```

### Step 3: Login

Now try logging in again with:
- **Username**: `admin`
- **Password**: `admin`

---

## 🎯 Alternative Method (API Call)

If you don't see the button, you can manually trigger admin creation:

### Using curl:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-79198001/init-admin \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Using Browser Console:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Paste this code:

```javascript
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-79198001/init-admin', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'Content-Type': 'application/json',
  },
}).then(r => r.json()).then(console.log);
```

---

## 🔍 What Happens Behind the Scenes

When you click "Create Admin Account" or call the API:

```
1. Server creates user in Supabase Auth
   ↓
2. Sets email: admin@amtdistro.com
   ↓
3. Sets password: admin
   ↓
4. Auto-confirms email (no verification needed)
   ↓
5. Creates user profile in KV store
   ↓
6. Creates admin record with superadmin role
   ↓
7. Grants all 35 permissions
   ↓
8. ✅ Ready to login!
```

---

## 📋 Verify Admin Creation

After clicking the button, you can verify the admin was created:

### Check Server Logs

Look for this output in your Supabase function logs:

```
✅ Test admin user created in Supabase Auth
✅ Test admin user profile created in KV store
✅ Test admin user initialized successfully!

╔════════════════════════════════════════════════════════╗
║          TEST ADMIN CREDENTIALS                        ║
╠════════════════════════════════════════════════════════╣
║  Username: admin                                       ║
║  Email:    admin@amtdistro.com                        ║
║  Password: admin                                       ║
║  Role:     Super Admin                                ║
╠════════════════════════════════════════════════════════╣
║  Access:   http://localhost:5173/#login               ║
╚════════════════════════════════════════════════════════╝
```

### Test API Call

You can test if the admin API is working:

```bash
# This should NOT return 401 anymore
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-79198001/admin/statistics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🐛 Still Having Issues?

### Issue 1: Button not appearing

**Solution**: Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

---

### Issue 2: Button click does nothing

**Solution**: Check browser console (F12) for errors. Make sure your Supabase function is running.

---

### Issue 3: "Admin user already exists" message

**Solution**: Great! The admin is already created. Just login with `admin / admin`

---

### Issue 4: Still getting "Invalid credentials" after creating admin

**Possible causes**:
1. Typo in username/password (make sure it's lowercase `admin`)
2. Server hasn't finished creating the user yet (wait 5 seconds and try again)
3. Cache issue (clear browser cache and try again)

**Solution**: 
```
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Wait 10 seconds
4. Try logging in again with: admin / admin
```

---

### Issue 5: Can't access admin API endpoint

**Cause**: Server might not be running or environment variables not set.

**Solution**:
1. Check that Supabase Edge Functions are deployed
2. Verify `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` are set
3. Check function logs for errors

---

## 🎯 Success Checklist

After fixing, you should be able to:

- [ ] See the login page at `http://localhost:5173/#login`
- [ ] See "Admin Setup" button in bottom right corner
- [ ] Click "Create Admin Account" button
- [ ] See success message
- [ ] Login with username: `admin`
- [ ] Login with password: `admin`
- [ ] Be redirected to `/admin` dashboard
- [ ] See admin panel with all features

---

## 🎉 All Fixed!

Once you can login successfully:

1. **Explore the admin panel** - See all features
2. **Create more admins** - Add team members with different roles
3. **Manage platform** - Full control over users, releases, royalties
4. **View audit logs** - Track all administrative actions

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| **Login URL** | `http://localhost:5173/#login` |
| **Username** | `admin` |
| **Password** | `admin` |
| **Expected Redirect** | `/admin` |
| **Helper Button** | Bottom right corner |
| **API Endpoint** | `/make-server-79198001/init-admin` |

---

## 🔐 Security Note

⚠️ **Important**: The default credentials `admin/admin` are for **development/testing only**!

Before deploying to production:
1. Delete or disable the test admin account
2. Create new admin with strong password
3. Use environment-specific credentials
4. Enable 2FA if available

---

**The login error should now be fixed!** Just click the "Create Admin Account" button and you're ready to go! 🚀
