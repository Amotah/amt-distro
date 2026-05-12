# Partner Role Downgrade Bug - Complete Fix Summary

## Executive Summary
✅ **FIXED**: Partner accounts were being incorrectly downgraded to 'artist' role after payment transactions. The root cause has been identified and corrected.

## The Bug

### Symptom
- Partner account user uploads a release or initiates promotion
- Makes a payment (either succeeds or fails)
- User's role changes from 'partner' to 'artist' 
- User loses access to partner features

### Root Cause
In `supabase/functions/server/paystack-service.tsx`, when verifying payments:

```typescript
// OLD BUG CODE (Line 789)
updatedUser = await userService.updateUser(updatedUser.id, {
  subscriptionTier: transaction.plan,  // transaction.plan could be 'release' or 'promotion'!
});
```

The issue: `transaction.plan` has 5 possible values:
- ✅ 'artist' (valid subscription tier)
- ✅ 'super_artist' (valid subscription tier)  
- ✅ 'partner' (valid subscription tier)
- ❌ 'release' (NOT a subscription tier - one-time transaction)
- ❌ 'promotion' (NOT a subscription tier - one-time transaction)

When a release payment succeeded, the code would set `subscriptionTier: 'release'`, which is invalid. Downstream code would then default it to 'artist', causing the role downgrade.

## The Solution

### Fix 1: Payment Verification Logic (paystack-service.tsx)

**Changed behavior for different transaction types:**

```typescript
if (nextStatus === 'success') {
  if (transaction.plan === 'promotion') {
    // Promotion: just activate the campaign, don't touch subscriptionTier
    await promotionService.activatePromotionPayment(...);
  } else if (transaction.plan === 'release') {
    // Release: one-time payment, don't update subscriptionTier
    // Just mark transaction as successful
  } else {
    // Subscription: only these change subscriptionTier
    // (artist, super_artist, or partner plans)
    updatedUser = await userService.updateUser(updatedUser.id, {
      subscriptionTier: transaction.plan,
    });
  }
}
```

### Fix 2: Validation Layer (user-service.tsx)

Added defensive validation to prevent invalid subscription tiers:

```typescript
// Validate subscriptionTier if it's being updated
if (updates.subscriptionTier && !['free', 'artist', 'super_artist', 'partner'].includes(updates.subscriptionTier)) {
  console.warn(`Invalid subscriptionTier "${updates.subscriptionTier}" provided to updateUser.`);
  // Remove the invalid value and continue
  const validUpdates = { ...updates };
  delete validUpdates.subscriptionTier;
  return updateUser(id, validUpdates);
}
```

## Files Modified

1. ✅ `supabase/functions/server/paystack-service.tsx` (lines 777-795)
   - Fixed payment verification to only update subscriptionTier for actual subscriptions
   - Added explicit handling for release and promotion payments

2. ✅ `supabase/functions/server/user-service.tsx` (lines 286-295)
   - Added validation layer to prevent invalid subscription tier values
   - Prevents similar bugs in the future

## Deployment Steps

### Recommended: Using Supabase CLI
```powershell
cd e:\muisc_platform\figma-export
supabase functions deploy make-server-79198001
```

### Alternative: Supabase Dashboard
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project (vatpvfrbgeatdeypqcrv)
3. Go to Edge Functions → make-server-79198001
4. Update the function code with the fixed files
5. Click Deploy

### Alternative: Via Git + Supabase Cloud Integration
If you have GitHub integration set up:
1. Push these changes to your repository
2. Supabase will auto-deploy on push (if configured)

## Post-Deployment Testing

### Test 1: Partner Uploads Release
```
1. Login as partner account
2. Upload a release
3. Complete payment if required
✓ Expected: Role stays "partner", subscriptionTier doesn't change
```

### Test 2: Partner Initiates Promotion  
```
1. Login as partner account
2. Create promotion campaign
3. Complete/cancel payment
✓ Expected: Role stays "partner", promotion activates on success
```

### Test 3: Artist Uploads Release
```
1. Login as artist account
2. Upload release (may require payment)
3. Complete payment
✓ Expected: subscriptionTier stays valid (free/artist/super_artist)
```

### Test 4: Verify No Invalid Data
Run in Supabase SQL Editor:
```sql
SELECT id, email, role, "subscriptionTier"
FROM users
WHERE "subscriptionTier" NOT IN ('free', 'artist', 'super_artist', 'partner', NULL);
```
Should return 0 rows.

## Impact Assessment

| Factor | Assessment |
|--------|------------|
| Risk Level | 🟢 **LOW** - Changes only affect payment verification |
| Breaking Changes | None - API endpoints unchanged |
| Performance Impact | None - No new queries added |
| Data Migration | None - No existing data needs updating |
| Backward Compatibility | ✅ Full - Existing integrations unaffected |

## Technical Details

### Payment Type Breakdown

| Plan Type | Is Subscription? | Updates Tier? | Purpose |
|-----------|-----------------|---------------|---------|
| 'artist' | ✅ Yes | ✅ Yes | Monthly/yearly artist subscription |
| 'super_artist' | ✅ Yes | ✅ Yes | Enhanced artist subscription |
| 'partner' | ✅ Yes | ✅ Yes | Label/partner subscription |
| 'release' | ❌ No | ❌ No | One-time release distribution fee |
| 'promotion' | ❌ No | ❌ No | One-time promotion campaign payment |

### Why This Bug Happened
The code incorrectly assumed all payment types would be subscriptions. The fix separates transaction types into:
- **Subscription payments**: Update user's tier
- **One-time payments**: Don't affect subscription tier

## Preventive Measures

The validation layer now catches future similar bugs:
```typescript
// If someone tries to set subscriptionTier to 'release', 'promotion', etc:
// 1. Warning is logged to console for debugging
// 2. Invalid value is removed from update
// 3. User record remains unchanged
// 4. No role downgrade occurs
```

## Questions?

If issues occur after deployment:
1. Check browser console for errors
2. Check Supabase function logs for warnings
3. Verify deployment completed successfully
4. Test with the test cases above

## Rollback (if needed)
If you need to revert:
```bash
# Using Git
git revert <commit-hash>
supabase functions deploy make-server-79198001

# Or restore from backup
# Copy previous version of paystack-service.tsx and user-service.tsx
supabase functions deploy make-server-79198001
```

---

**Last Updated**: 2025-05-03  
**Status**: Ready for Deployment  
**Severity**: Critical (fixes permission/role bug)
