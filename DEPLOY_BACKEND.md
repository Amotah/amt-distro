# Backend Deployment Guide

## Quick Deploy (Recommended)

Run this command from the `figma-export` folder:

```bash
npx --yes supabase@latest functions deploy make-server-79198001 --project-ref vatpvfrbgeatdeypqcrv
```

Or if you have Supabase CLI installed globally:
```bash
supabase functions deploy make-server-79198001 --project-ref vatpvfrbgeatdeypqcrv
```

## What Gets Deployed

- Function: `make-server-79198001`
- Source: `supabase/functions/server/index.tsx`
- This contains all the fixes for:
  - Partner artist creation permission checks (role OR subscriptionTier)
  - Subscription validation with/without expiresAt field
  - Admin billing history endpoint
  - 7 artist management endpoints with updated hasPartnerAccess checks

## Verification After Deploy

1. Wait 5-10 seconds for Supabase to process the deployment
2. Try creating a managed artist as a partner role
3. Clear browser cache if you still see the old error
4. Check browser DevTools → Network tab to see if the error response changes

## If Deploy Fails

Check that:
1. You're in the correct folder: `e:\muisc_platform\figma-export\`
2. Your PAT (if needed) is valid
3. Project ref matches: `vatpvfrbgeatdeypqcrv`
4. The function file exists: `supabase/functions/server/index.tsx`

## File Changes Deployed

**supabase/functions/server/index.tsx**:
- Line 1103-1109: Added `hasPartnerAccess` check for `/users/label/artists/create` endpoint
- Similar checks applied to 6 other artist management endpoints
- All now check: `label.role === 'partner' || label.subscriptionTier === 'partner'`

**supabase/functions/server/paystack-service.tsx**:
- Added `getAllBillingHistory()` function for admin access

**src/app/utils/admin-api.tsx** (frontend):
- Added `getAdminBillingHistory()` function

**src/app/admin-routes.tsx** (frontend):
- Added lazy route for AdminSubscriptions at `/admin/subscriptions`
