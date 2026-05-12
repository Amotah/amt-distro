# Supabase Edge Function Deployment 403 Error - Solution Guide

## Problem
You're experiencing a **403 Forbidden** error when trying to deploy the Edge Function to Supabase. This is an **authentication/permission issue**, not a code issue.

## Root Cause
The 403 error occurs because:
1. **Supabase connection credentials have expired** in Figma Make
2. **Insufficient deployment permissions** on the Supabase project
3. **Project limitations** preventing Edge Function deployment

---

## ✅ SOLUTIONS (Try in Order)

### **Solution 1: Reconnect Supabase in Figma Make** (RECOMMENDED)

1. In Figma Make, look for the **Supabase integration panel**
2. Click on **"Disconnect"** or **"Manage Connection"**
3. **Reconnect** your Supabase project with fresh credentials
4. Ensure you're logged in with an account that has **Owner** or **Admin** access
5. Try deploying again

---

### **Solution 2: Check Supabase Project Permissions**

Go to your Supabase Dashboard and verify:

1. **Project Status**: Ensure project is not paused or suspended
2. **User Role**: You must be an **Owner** or **Admin** on the project
3. **Plan Type**: Free tier has limitations - may need upgrade for Edge Functions
4. **API Settings**: Go to Settings → API and verify Service Role Key is active

---

### **Solution 3: Manual Deployment via Supabase CLI**

If Figma Make continues to fail, deploy manually:

#### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

#### Step 2: Login to Supabase
```bash
supabase login
```

#### Step 3: Link Your Project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
*Find your project ref in Supabase Dashboard → Settings → General*

#### Step 4: Deploy the Edge Function
```bash
cd /path/to/your/project
supabase functions deploy server --no-verify-jwt
```

---

### **Solution 4: Check for Existing Function Conflict**

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Look for a function named **"make-server"** or **"server"**
3. If it exists and you don't have edit permissions:
   - Delete it first (if you have permission)
   - Or rename your function in the deployment

---

### **Solution 5: Create New Supabase Project**

If all else fails:

1. Create a **new Supabase project**
2. Connect it to Figma Make with fresh credentials
3. Deploy the Edge Function to the new project
4. Update your frontend to use the new project URL

---

## 🔍 Verify Deployment Success

After successful deployment, test the public health function with:

```bash
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/make-server-health
```

Expected response:
```json
{"status":"ok"}
```

Note:
The main `make-server-79198001` function is protected by JWT verification. Use the dedicated `make-server-health` function for unauthenticated uptime checks.

---

## 📋 Current Code Status

✅ **Code is deployment-ready** - All blocking issues have been fixed:
- Removed top-level `await` statements
- Proper `Deno.serve()` export
- Valid npm and jsr imports
- Correct async/await patterns

The issue is **purely authentication/permissions**, not code-related.

---

## 🆘 Still Having Issues?

If none of these solutions work:

1. **Check Supabase Status Page**: https://status.supabase.com/
2. **Contact Supabase Support**: support@supabase.io
3. **Provide them with**:
   - Project Reference ID
   - Error message screenshot
   - Your account email
   - Role on the project

---

## 💡 Alternative Approach

If you need to continue development while resolving the Supabase issue:

1. **Use local development** with Supabase CLI:
   ```bash
   supabase start
   supabase functions serve
   ```

2. **Mock the Edge Function** temporarily with a local Express server

3. **Use a different deployment platform** temporarily (Deno Deploy, Cloudflare Workers)

---

## Next Steps

1. ✅ Try Solution 1 first (Reconnect Supabase)
2. ✅ If that fails, try Solution 3 (Manual CLI deployment)
3. ✅ Contact Supabase support if needed

The code is ready - you just need to resolve the authentication/permission issue with Supabase.
