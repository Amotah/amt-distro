# Partner Role Downgrade - Deployment Guide

## Issue Fixed
Partner accounts were being incorrectly downgraded to 'artist' role after certain payment transactions. This has been fixed.

## Root Cause
When processing release or promotion payments, the system was incorrectly setting `subscriptionTier` to transaction types ('release', 'promotion') which are not valid subscription tier values. This caused the system to default them to 'artist', losing the partner status.

## Changes Made

### File 1: `supabase/functions/server/paystack-service.tsx`
**Lines 777-795**: Fixed payment verification logic to NOT update subscriptionTier for release or promotion payments
- Release payments are one-time transactions and should not affect subscription tier
- Promotion payments don't directly change subscriptions either
- Only subscription plan payments (artist, super_artist, partner) should update subscriptionTier

**Before:**
```typescript
} else {
  updatedUser = await userService.updateUser(updatedUser.id, {
    subscriptionTier: transaction.plan,  // BUG: includes 'release' and 'promotion'!
  });
}
```

**After:**
```typescript
} else if (transaction.plan === 'release') {
  // Release payments are one-time, don't update subscriptionTier
} else {
  // Only for subscription plans: artist, super_artist, partner
  updatedUser = await userService.updateUser(updatedUser.id, {
    subscriptionTier: transaction.plan,
  });
}
```

### File 2: `supabase/functions/server/user-service.tsx`
**Lines 286-295**: Added validation to prevent invalid subscriptionTier values
- Validates that subscriptionTier is one of: 'free', 'artist', 'super_artist', 'partner'
- Prevents future bugs of this type
- Logs warnings for debugging

## How to Deploy

### Option 1: Using Supabase CLI (Recommended)
```bash
cd e:\muisc_platform\figma-export
supabase functions deploy make-server-79198001
```

### Option 2: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Open your project (vatpvfrbgeatdeypqcrv)
3. Navigate to Edge Functions → make-server-79198001
4. Update the `index.tsx` and related files with the changes
5. Deploy

### Option 3: Using Docker (if CLI not available)
```bash
docker pull supabase/cli:latest
docker run -v ./supabase:/supabase supabase/cli functions deploy make-server-79198001
```

## Testing After Deployment

### Test Case 1: Partner Release Upload
1. Log in as a partner account
2. Upload a release
3. Complete the release payment
4. Verify user remains as 'partner' role
5. Verify subscriptionTier is not set to 'release'

### Test Case 2: Partner Promotion Payment
1. Log in as a partner account
2. Create a promotion campaign
3. Initiate promotion payment
4. Complete or fail the payment
5. Verify user remains as 'partner' role

### Test Case 3: Artist Release Upload
1. Log in as an artist account
2. Upload a release (may be free or paid depending on plan)
3. If payment required, complete it
4. Verify subscriptionTier remains valid ('free', 'artist', or 'super_artist')

## Verification SQL (Optional)
Run this query to verify no users have invalid subscription tiers:

```sql
SELECT id, email, role, "subscriptionTier"
FROM users
WHERE "subscriptionTier" NOT IN ('free', 'artist', 'super_artist', 'partner')
```

Should return no results after deployment.

## Rollback Plan
If issues occur, the previous version of these files can be restored from your version control system.

## Impact Assessment
- **Low Risk**: Changes only affect payment verification logic
- **Positive Impact**: Fixes role downgrade bug, prevents similar issues
- **No Breaking Changes**: API endpoints remain unchanged
- **Performance**: No performance impact

## Questions?
Refer to the conversation summary or check the modified files for implementation details.
