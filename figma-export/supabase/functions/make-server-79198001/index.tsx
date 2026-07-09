import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from "./kv_store.tsx";
import * as userService from "./user-service.tsx";
import * as uploadService from "./upload-service.tsx";
import * as metadataService from "./metadata-service.tsx";
import * as isrcService from "./isrc-upc-service.tsx";
import * as distributionService from "./distribution-service.tsx";
import * as royaltyService from "./royalty-service.tsx";
import * as analyticsService from "./analytics-service.tsx";
import * as paymentService from "./payment-service.tsx";
import * as paystackService from "./paystack-service.tsx";
import * as promotionService from "./promotion-service.tsx";
import * as blogService from "./blog-service.tsx";
import * as fraudService from "./fraud-detection-service.tsx";
import * as queueService from "./queue-service.tsx";
import * as adminService from "./admin-service.tsx";
import * as initAdmin from "./init-admin.tsx";
import * as payrollService from "./payroll-service.tsx";
import * as accountingService from "./accounting-service.tsx";
import * as smartLinksService from "./smart-links-service.tsx";
import * as supportService from "./support-service.tsx";
import * as emailService from "./email-service.tsx";

const PAYSTACK_PLAN_PRICING = {
  artist: {
    monthly: 15000, // per release
    yearly: 15000,
  },
  super_artist: {
    monthly: 25000, // per release
    yearly: 25000,
  },
  partner: {
    monthly: 50000, // monthly subscription
    yearly: 600000, // 12 months
  },
} as const;

// Release distribution fee by subscription tier (per release for non-partner).
// Partner users get 5 free releases/month then pay per extra release.
const RELEASE_DISTRIBUTION_FEE_BY_PLAN: Record<string, number> = {
  free: 15000,       // same as Artist rate for free users
  artist: 15000,     // Artist plan — ₦15k per release
  super_artist: 25000, // Super Artist plan — ₦25k per release
  partner: 0,        // Partner — free within quota (handled separately)
};

// Partner plan limits
const PARTNER_MAX_RELEASES_PER_MONTH = 5;
const PARTNER_EXTRA_RELEASE_FEE = 15000; // extra releases beyond quota

const PROMOTION_UPLOAD_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const CHECKOUT_COUPONS: Record<string, { type: 'percentage'; value: number }> = {
  DISCOUNT20: { type: 'percentage', value: 20 },
};

const app = new Hono();

// Middleware
app.use('*', cors({
  // Allow browser clients from any origin. Auth is still enforced per route.
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
}));
app.use('*', logger(console.log));

// Initialize default admin user on server start (async, non-blocking)
Promise.resolve().then(async () => {
  try {
    await initAdmin.checkAndInitializeAdmin();
    console.log('✅ Admin initialization complete');
  } catch (err) {
    console.error('❌ Admin initialization error:', err);
  }
});

// Manual endpoint to create admin (for troubleshooting)
app.post('/make-server-79198001/init-admin', async (c) => {
  try {
    await initAdmin.initializeDefaultAdmin();
    return c.json({ 
      success: true, 
      message: 'Admin user initialized',
      credentials: {
        username: 'admin',
        email: 'admin@amtdistro.com',
        password: 'admin'
      }
    });
  } catch (error: any) {
    console.error('Error initializing admin:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Initialize storage buckets on startup
Promise.resolve().then(async () => {
  try {
    await uploadService.initializeStorageBuckets();
    console.log('✅ Storage buckets initialized');
  } catch (err) {
    console.error('❌ Storage initialization error:', err);
  }
});

// Middleware to verify user authentication
async function verifyAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }

  const activeUser = await userService.getUserByUserId(user.id);
  if (!activeUser) {
    return c.json({ error: 'Unauthorized: User account no longer exists' }, 401);
  }

  c.set('userId', user.id);
  c.set('userEmail', user.email);
  await next();
}

async function syncAuthUserMetadata(userId: string, updates: {
  email?: string;
  firstName?: string;
  lastName?: string;
  artistName?: string;
  labelName?: string;
  role?: 'artist' | 'partner' | 'admin';
  subscriptionTier?: 'artist' | 'super_artist' | 'partner';
  mustChangePassword?: boolean;
  temporaryPassword?: boolean;
}) {
  const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(userId);

  if (authUserError) {
    throw authUserError;
  }

  const existingMetadata = authUserData.user?.user_metadata && typeof authUserData.user.user_metadata === 'object'
    ? authUserData.user.user_metadata
    : {};

  const nextMetadata = {
    ...existingMetadata,
    ...(updates.firstName !== undefined ? { firstName: updates.firstName } : {}),
    ...(updates.lastName !== undefined ? { lastName: updates.lastName } : {}),
    ...(updates.artistName !== undefined ? { artistName: updates.artistName } : {}),
    ...(updates.labelName !== undefined ? { labelName: updates.labelName } : {}),
    ...(updates.role !== undefined ? { role: updates.role } : {}),
    ...(updates.subscriptionTier !== undefined ? { subscriptionTier: updates.subscriptionTier } : {}),
    ...(updates.mustChangePassword !== undefined ? { mustChangePassword: updates.mustChangePassword } : {}),
    ...(updates.temporaryPassword !== undefined ? { temporaryPassword: updates.temporaryPassword } : {}),
  };

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ...(updates.email ? { email: updates.email } : {}),
    user_metadata: nextMetadata,
  });

  if (error) {
    throw error;
  }
}

function isLabelAccount(user: { role?: string | null; subscriptionTier?: string | null } | null | undefined) {
  return Boolean(user && (user.role === 'partner' || user.subscriptionTier === 'partner'));
}

function isAuthProvisioningFailure(error: { message?: string | null } | null | undefined) {
  return typeof error?.message === 'string'
    && error.message.toLowerCase().includes('database error creating new user');
}

function buildInitialArtistVerification() {
  return {
    emailConfirmed: true,
    idVerified: false,
    idVerificationOptional: true,
    profileReviewed: false,
    requestedAt: new Date().toISOString(),
  };
}

function normalizeNameForMatch(value?: string | null) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/\s+/g, ' ')
    : '';
}

function getManagedArtistDisplayName(artist: userService.Artist) {
  return artist.artistName || artist.firstName || artist.email.split('@')[0] || 'Artist';
}

function getManagedArtistNameCandidates(artist: userService.Artist) {
  const fullName = [artist.firstName, artist.lastName].filter(Boolean).join(' ').trim();
  return [
    artist.artistName,
    artist.firstName,
    artist.lastName,
    fullName || undefined,
    artist.email.split('@')[0],
  ]
    .map((value) => normalizeNameForMatch(value))
    .filter(Boolean);
}

function findManagedArtistForRelease(release: metadataService.ReleaseMetadata | null, artists: userService.Artist[]) {
  const primaryArtist = normalizeNameForMatch(release?.primaryArtist);
  if (!primaryArtist) {
    return null;
  }

  return artists.find((artist) => getManagedArtistNameCandidates(artist).includes(primaryArtist)) || null;
}

type LabelOwnedArtistSummary = {
  artistId: string;
  userId: string;
  artistName: string;
  email: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalStreams: number;
  totalRevenue: number;
  updatedAt: string;
  monthlyTrend: Array<{ month: string; revenue: number; streams: number }>;
};

async function buildLabelOwnedArtistSummaries(label: userService.Label, artists: userService.Artist[]): Promise<LabelOwnedArtistSummary[]> {
  const [earnings, releases] = await Promise.all([
    royaltyService.getUserEarnings(label.userId, 1000),
    metadataService.getUserReleases(label.userId),
  ]);

  const releaseMap = new Map(releases.map((release) => [release.id, release]));
  const grouped = new Map<string, {
    artistId: string;
    userId: string;
    artistName: string;
    email: string;
    availableBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    totalStreams: number;
    totalRevenue: number;
    updatedAt: string;
    monthlyTrendMap: Map<string, { revenue: number; streams: number }>;
  }>();

  for (const earning of earnings) {
    const release = releaseMap.get(earning.releaseId) || null;
    const managedArtist = findManagedArtistForRelease(release, artists);
    const fallbackName = release?.primaryArtist?.trim() || 'Unassigned artist';
    const fallbackKey = normalizeNameForMatch(fallbackName) || earning.releaseId;
    const groupKey = managedArtist ? `managed:${managedArtist.id}` : `label-upload:${fallbackKey}`;
    const artistId = managedArtist?.id || `label-upload:${fallbackKey}`;
    const userId = managedArtist?.userId || '';
    const artistName = managedArtist ? getManagedArtistDisplayName(managedArtist) : fallbackName;
    const email = managedArtist?.email || '';
    const month = new Date(earning.createdAt).toISOString().slice(0, 7);

    const current = grouped.get(groupKey) || {
      artistId,
      userId,
      artistName,
      email,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      totalStreams: 0,
      totalRevenue: 0,
      updatedAt: earning.updatedAt,
      monthlyTrendMap: new Map<string, { revenue: number; streams: number }>(),
    };

    current.totalEarnings += earning.netRevenue;
    current.totalRevenue += earning.netRevenue;
    current.totalStreams += earning.streams;

    if (earning.status === 'pending') {
      current.pendingBalance += earning.netRevenue;
    } else if (earning.status === 'approved') {
      current.availableBalance += earning.netRevenue;
    }

    if (new Date(earning.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
      current.updatedAt = earning.updatedAt;
    }

    const monthlyPoint = current.monthlyTrendMap.get(month) || { revenue: 0, streams: 0 };
    monthlyPoint.revenue += earning.netRevenue;
    monthlyPoint.streams += earning.streams;
    current.monthlyTrendMap.set(month, monthlyPoint);

    grouped.set(groupKey, current);
  }

  return Array.from(grouped.values()).map((entry) => ({
    artistId: entry.artistId,
    userId: entry.userId,
    artistName: entry.artistName,
    email: entry.email,
    availableBalance: entry.availableBalance,
    pendingBalance: entry.pendingBalance,
    totalEarnings: entry.totalEarnings,
    totalStreams: entry.totalStreams,
    totalRevenue: entry.totalRevenue,
    updatedAt: entry.updatedAt,
    monthlyTrend: Array.from(entry.monthlyTrendMap.entries())
      .map(([month, values]) => ({ month, ...values }))
      .sort((left, right) => left.month.localeCompare(right.month)),
  }));
}

// Authenticated health route for the main API function.
// Public uptime checks should use the dedicated make-server-health function.
app.get("/make-server-79198001/health", (c) => {
  return c.json({ status: "ok" });
});

app.get('/make-server-79198001/blog/posts', async (c) => {
  try {
    const posts = await blogService.getAllBlogPosts({ publishedOnly: true });
    return c.json({ posts });
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return c.json({ error: `Failed to load blog posts: ${error.message}` }, 500);
  }
});

// ==================== USER SERVICE ROUTES ====================

// ==================== BILLING ROUTES ====================

app.post('/make-server-79198001/payments/paystack/initialize', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const body = await c.req.json();

    if (body.plan !== 'artist' && body.plan !== 'super_artist' && body.plan !== 'partner' && body.plan !== 'promotion' && body.plan !== 'release') {
      return c.json({ error: 'Invalid plan selected' }, 400);
    }

    if (body.billingPeriod !== 'monthly' && body.billingPeriod !== 'yearly') {
      return c.json({ error: 'Invalid billing period selected' }, 400);
    }

    if (!body.callbackUrl || typeof body.callbackUrl !== 'string') {
      return c.json({ error: 'A valid callback URL is required' }, 400);
    }

    let baseAmount = 0;
    let discountAmount = 0;
    let finalAmount = 0;
    let couponCode: string | undefined;
    let promotionId: string | undefined;
    let releaseId: string | undefined;
    let promotionAddonPlanId: string | undefined;
    let promotionAddonAmount: number | undefined;

    if (body.plan === 'promotion') {
      if (!body.promotionId || typeof body.promotionId !== 'string') {
        return c.json({ error: 'Promotion campaign id is required for promotion checkout' }, 400);
      }

      const campaign = await promotionService.getPromotionCampaignForUser(body.promotionId, userId);
      baseAmount = campaign.amount;
      finalAmount = campaign.amount;
      promotionId = campaign.id;
    } else if (body.plan === 'release') {
      // Release distribution payment: fee is based on the user's active subscription tier.
      const userProfile = await userService.getUserByUserId(userId);
      const activeTier: string = userProfile?.subscriptionTier || 'free';

      let releaseFee = RELEASE_DISTRIBUTION_FEE_BY_PLAN[activeTier] ?? RELEASE_DISTRIBUTION_FEE_BY_PLAN['free'];

      // Partner plan: check monthly release quota. First 5 releases/month are free.
      if (activeTier === 'partner') {
        const now = new Date();
        const monthKey = `releases:month:${userId}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const releaseCount: number = (await kv.get<number>(monthKey)) ?? 0;
        if (releaseCount < PARTNER_MAX_RELEASES_PER_MONTH) {
          releaseFee = 0;
        } else {
          releaseFee = PARTNER_EXTRA_RELEASE_FEE;
        }
      }

      baseAmount = releaseFee;
      finalAmount = releaseFee;
      releaseId = typeof body.releaseId === 'string' ? body.releaseId : undefined;

      // Optional promotion add-on lumped into the same order.
      if (body.promotionAddonPlanId && typeof body.promotionAddonPlanId === 'string') {
        const addonAmount = typeof body.promotionAddonAmount === 'number' && body.promotionAddonAmount > 0
          ? body.promotionAddonAmount
          : 0;
        promotionAddonPlanId = body.promotionAddonPlanId;
        promotionAddonAmount = addonAmount;
        finalAmount += addonAmount;
      }

      if (finalAmount <= 0) {
        // No payment required – return a synthetic success so the frontend can proceed directly.
        return c.json({
          freePass: true,
          activePlan: activeTier,
          releaseId,
          message: 'No payment required for your current plan.',
        });
      }
    } else {
      const planKey = body.plan as 'artist' | 'super_artist' | 'partner';
      baseAmount = PAYSTACK_PLAN_PRICING[planKey][body.billingPeriod as 'monthly' | 'yearly'];
      const normalizedCouponCode = typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : '';
      const coupon = normalizedCouponCode ? CHECKOUT_COUPONS[normalizedCouponCode] : null;
      discountAmount = coupon ? Math.round(baseAmount * (coupon.value / 100)) : 0;
      finalAmount = baseAmount - discountAmount;
      couponCode = coupon ? normalizedCouponCode : undefined;
    }

    // --- DB coupon resolution (applies to ALL plan types, overrides CHECKOUT_COUPONS) ---
    let dbCouponId: string | undefined;
    let dbCouponUsedCount = 0;
    const rawCouponInput = typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : '';
    if (rawCouponInput && finalAmount > 0) {
      const { data: dbCoupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', rawCouponInput)
        .eq('status', 'active')
        .single();
      if (dbCoupon) {
        const notExpired = !dbCoupon.expires_at || new Date(dbCoupon.expires_at) >= new Date();
        const withinLimit = dbCoupon.max_uses === null || dbCoupon.used_count < dbCoupon.max_uses;
        const planScope = body.plan === 'promotion' ? 'promotion' : body.plan === 'release' ? 'release' : 'subscription';
        const couponScopes: string[] = dbCoupon.scopes ?? [];
        const scopeOk = couponScopes.includes('all') || couponScopes.includes(planScope);
        if (notExpired && withinLimit && scopeOk) {
          baseAmount = finalAmount; // capture pre-discount total
          const dbDiscount = Math.round(finalAmount * (dbCoupon.discount_percent / 100));
          discountAmount = dbDiscount;
          finalAmount = finalAmount - dbDiscount;
          couponCode = rawCouponInput;
          dbCouponId = dbCoupon.id;
          dbCouponUsedCount = dbCoupon.used_count ?? 0;
        }
      }
    }

    const transaction = await paystackService.initializeCheckout({
      userId,
      email: typeof body.email === 'string' && body.email.trim() ? body.email.trim() : userEmail,
      plan: body.plan,
      billingPeriod: body.billingPeriod,
      amount: finalAmount,
      baseAmount,
      discountAmount,
      couponCode,
      callbackUrl: body.callbackUrl,
      promotionId,
      releaseId,
      promotionAddonPlanId,
      promotionAddonAmount,
    });

    sendNotification({
      userId,
      title: 'Checkout initialized',
      body: `Your ${body.plan} payment has been initialized. Complete it on Paystack to activate the next step.`,
      type: 'earnings',
      link: '/dashboard/payment-history',
    }).catch(() => {});

    // Record coupon usage if a DB coupon was applied
    if (dbCouponId && couponCode && discountAmount > 0) {
      const planScope = body.plan === 'promotion' ? 'promotion' : body.plan === 'release' ? 'release' : 'subscription';
      const userEmailForRecord = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : userEmail;
      await Promise.all([
        supabase.from('coupon_usages').insert({
          coupon_id: dbCouponId,
          coupon_code: couponCode,
          user_id: userId,
          user_email: userEmailForRecord,
          scope: planScope,
          plan: body.plan,
          amount_before: baseAmount,
          amount_after: finalAmount,
          discount_amount: discountAmount,
          discount_percent: baseAmount > 0 ? Math.round((discountAmount / baseAmount) * 100) : 0,
          payment_reference: transaction.reference,
        }),
        supabase.from('coupons').update({ used_count: dbCouponUsedCount + 1 }).eq('id', dbCouponId),
      ]);
    }

    return c.json({
      transaction,
      authorizationUrl: transaction.authorizationUrl,
      reference: transaction.reference,
    });
  } catch (error) {
    console.error('Error initializing Paystack payment:', error);
    return c.json({ error: `Failed to initialize payment: ${error.message}` }, 500);
  }
});

app.post('/make-server-79198001/payments/paystack/verify', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.reference || typeof body.reference !== 'string') {
      return c.json({ error: 'Payment reference is required' }, 400);
    }

    const result = await paystackService.verifyCheckout(body.reference, userId);

    // If this was a release payment for a partner user, increment monthly release count.
    if (result.transaction.status === 'success' && result.transaction.plan === 'release') {
      const userProfile = await userService.getUserByUserId(userId);
      if (userProfile?.subscriptionTier === 'partner') {
        const now = new Date();
        const monthKey = `releases:month:${userId}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const current: number = (await kv.get<number>(monthKey)) ?? 0;
        await kv.set(monthKey, current + 1);
      }
    }

    if (result.transaction.status === 'success') {
      sendNotification({
        userId,
        title: 'Payment successful',
        body: `Your ${result.transaction.plan} payment was confirmed successfully.`,
        type: 'earnings',
        link: '/dashboard/payment-history',
      }).catch(() => {});
    } else if (result.transaction.status === 'failed') {
      sendNotification({
        userId,
        title: 'Payment failed',
        body: `Your payment could not be confirmed. Please retry checkout or contact support if this persists.`,
        type: 'alert',
        link: '/dashboard/payment',
      }).catch(() => {});
    }

    return c.json(result);
  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    return c.json({ error: `Failed to verify payment: ${(error as Error).message}` }, 500);
  }
});

app.get('/make-server-79198001/payments/release-fee', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userProfile = await userService.getUserByUserId(userId);
    const activePlan: string = userProfile?.subscriptionTier || 'free';

    let fee = RELEASE_DISTRIBUTION_FEE_BY_PLAN[activePlan] ?? RELEASE_DISTRIBUTION_FEE_BY_PLAN['free'];
    let releasesThisMonth = 0;
    let partnerQuotaRemaining = 0;

    if (activePlan === 'partner') {
      const now = new Date();
      const monthKey = `releases:month:${userId}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      releasesThisMonth = (await kv.get<number>(monthKey)) ?? 0;
      partnerQuotaRemaining = Math.max(0, PARTNER_MAX_RELEASES_PER_MONTH - releasesThisMonth);
      fee = partnerQuotaRemaining > 0 ? 0 : PARTNER_EXTRA_RELEASE_FEE;
    }

    return c.json({ activePlan, fee, releasesThisMonth, partnerQuotaRemaining });
  } catch (error) {
    console.error('Error fetching release fee:', error);
    return c.json({ error: `Failed to fetch release fee: ${(error as Error).message}` }, 500);
  }
});

app.get('/make-server-79198001/payments/history', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const history = await paystackService.getBillingHistory(userId);
    return c.json({ history });
  } catch (error) {
    console.error('Error loading billing history:', error);
    return c.json({ error: `Failed to load billing history: ${error.message}` }, 500);
  }
});

// Get partner subscription status
app.get('/make-server-79198001/payments/subscription/partner/status', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    const history = await paystackService.getBillingHistory(userId);
    const now = new Date();
    
    const activeSubscription = history.find(
      (record) => {
        // Must be a completed partner subscription
        if (record.type !== 'subscription' || record.plan !== 'partner' || record.status !== 'completed' || record.provider !== 'paystack') {
          return false;
        }
        // Must not be cancelled
        if (record.cancelledAt) {
          return false;
        }
        // If expiresAt is set, check expiry
        if (record.expiresAt && new Date(record.expiresAt) <= now) {
          return false;
        }
        // Subscription is valid
        return true;
      }
    );

    return c.json({ 
      hasActiveSubscription: !!activeSubscription,
      subscription: activeSubscription || null,
      message: activeSubscription ? 'Active subscription found' : 'No active subscription'
    });
  } catch (error: any) {
    console.error('Error checking subscription status:', error);
    return c.json({ 
      hasActiveSubscription: false,
      subscription: null,
      error: error?.message || 'Failed to check subscription status'
    }, 500);
  }
});

// Cancel partner subscription
app.post('/make-server-79198001/payments/subscription/partner/cancel', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    const history = await paystackService.getBillingHistory(userId);
    const now = new Date().toISOString();

    // Find the active subscription
    const activeSubscriptionIndex = history.findIndex(
      (record) => {
        // Must be a completed partner subscription
        if (record.type !== 'subscription' || record.plan !== 'partner' || record.status !== 'completed' || record.provider !== 'paystack') {
          return false;
        }
        // Must not be cancelled
        if (record.cancelledAt) {
          return false;
        }
        // If expiresAt is set, check expiry
        if (record.expiresAt && new Date(record.expiresAt) <= new Date()) {
          return false;
        }
        // Subscription is valid
        return true;
      }
    );

    if (activeSubscriptionIndex === -1) {
      return c.json({ error: 'No active subscription found to cancel' }, 404);
    }

    const subscription = history[activeSubscriptionIndex];
    
    // Mark subscription as cancelled
    const cancelledRecord = {
      ...subscription,
      cancelledAt: now,
      updatedAt: now,
    };

    // Store the updated subscription record using the correct key format
    const billingKey = `billing:history:${subscription.reference}`;
    await kv.set(billingKey, cancelledRecord);

    return c.json({ 
      message: 'Subscription cancelled successfully',
      subscription: cancelledRecord,
      accessRemainsUntil: subscription.expiresAt
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return c.json({ error: error?.message || 'Failed to cancel subscription' }, 500);
  }
});

app.get('/make-server-79198001/analytics/summary', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const range = c.req.query('range') || '30days';
    const summary = await analyticsService.getAnalyticsSummaryForAuthUser(userId, range);
    return c.json({ summary });
  } catch (error) {
    console.error('Error loading analytics summary:', error);
    return c.json({ error: `Failed to load analytics summary: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get('/make-server-79198001/analytics/catalog-performance', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const range = c.req.query('range') || 'all';
    const performance = await analyticsService.getAnalyticsCatalogPerformanceForAuthUser(userId, range);
    return c.json({ performance });
  } catch (error) {
    console.error('Error loading analytics catalog performance:', error);
    return c.json({ error: `Failed to load analytics catalog performance: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/payments/payout/request', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const body = await c.req.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount)) {
      return c.json({ error: 'A valid payout amount is required' }, 400);
    }

    if (
      !body ||
      typeof body.accountName !== 'string' || !body.accountName.trim() ||
      typeof body.bankName !== 'string' || !body.bankName.trim() ||
      typeof body.accountNumber !== 'string' || !/^\d{10}$/.test(body.accountNumber.trim())
    ) {
      return c.json({ error: 'Valid payout account details are required' }, 400);
    }

    const request = await paystackService.requestPayout(userId, userEmail, amount, {
      accountName: body.accountName.trim(),
      bankName: body.bankName.trim(),
      accountNumber: body.accountNumber.trim(),
    });
    await adminService.logUserActivity(userId, userEmail, 'payout_requested', 'payout', request?.id, { amount, bankName: body.bankName.trim(), accountNumber: body.accountNumber.trim().replace(/.(?=.{4})/g, '*') }).catch(() => {});
    return c.json({ request });
  } catch (error) {
    console.error('Error creating payout request:', error);
    return c.json({ error: `Failed to create payout request: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/payments/paystack/webhook', async (c) => {
  try {
    const rawPayload = await c.req.text();
    const signatureHeader = c.req.header('x-paystack-signature');
    const signatureValid = await paystackService.verifyWebhookSignature(rawPayload, signatureHeader);

    if (!signatureValid) {
      return c.json({ error: 'Invalid Paystack webhook signature' }, 401);
    }

    const result = await paystackService.handleWebhookEvent(rawPayload);
    return c.json({ ok: true, ...result });
  } catch (error) {
    console.error('Error handling Paystack webhook:', error);
    return c.json({ error: `Failed to handle webhook: ${error.message}` }, 500);
  }
});

// Create artist profile
app.post("/make-server-79198001/users/artist", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    // Check if user already exists
    const existingUser = await userService.getUserByUserId(userId);
    if (existingUser) {
      return c.json({ error: 'User profile already exists' }, 400);
    }

    const artist = await userService.createArtist({
      userId,
      firstName: body.firstName,
      lastName: body.lastName,
      artistName: body.artistName,
      email: body.email,
      profileImage: body.profileImage,
      bannerImage: body.bannerImage,
      bio: body.bio,
      genres: body.genres,
      socialLinks: body.socialLinks,
      verification: buildInitialArtistVerification(),
      verificationStatus: 'pending',
      isVerified: false,
      subscriptionTier: body.subscriptionTier || 'free',
    });

    await syncAuthUserMetadata(userId, {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      artistName: body.artistName,
      role: 'artist',
      subscriptionTier: body.subscriptionTier || 'free',
    });

    const permissions = userService.getUserPermissions(artist);

    return c.json({ artist, permissions });
  } catch (error) {
    console.error('Error creating artist profile:', error);
    return c.json({ error: `Failed to create artist profile: ${error.message}` }, 500);
  }
});

// Create label profile
app.post("/make-server-79198001/users/label", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    // Check if user already exists
    const existingUser = await userService.getUserByUserId(userId);
    if (existingUser) {
      return c.json({ error: 'User profile already exists' }, 400);
    }

    const label = await userService.createLabel({
      userId,
      firstName: body.firstName,
      lastName: body.lastName,
      labelName: body.labelName,
      email: body.email,
      profileImage: body.profileImage,
      bannerImage: body.bannerImage,
      description: body.description,
      website: body.website,
      artists: [],
      isVerified: false,
      subscriptionTier: 'partner',
    });

    await syncAuthUserMetadata(userId, {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      labelName: body.labelName,
      role: 'partner',
      subscriptionTier: 'partner',
    });

    const permissions = userService.getUserPermissions(label);

    return c.json({ label, permissions });
  } catch (error) {
    console.error('Error creating label profile:', error);
    return c.json({ error: `Failed to create label profile: ${error.message}` }, 500);
  }
});

app.post("/make-server-79198001/users/create", verifyAuth, verifyAdmin, requirePermission('users.create'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const body = await c.req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = body.role === 'partner' ? 'partner' : 'artist';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
    const artistName = typeof body.artistName === 'string' ? body.artistName.trim() : undefined;
    const labelName = typeof body.labelName === 'string' ? body.labelName.trim() : undefined;
    const password = typeof body.password === 'string'
      ? body.password.trim()
      : typeof body.defaultPassword === 'string'
      ? body.defaultPassword.trim()
      : '';
    let userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    let createdAuthUserId: string | null = null;

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    if (!password) {
      return c.json({ error: 'Password is required' }, 400);
    }

    const existingEmailUser = await userService.getUserByEmail(email);
    if (existingEmailUser) {
      return c.json({ error: 'A user profile with this email already exists' }, 400);
    }

    if (!userId) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          firstName,
          lastName,
          artistName,
          labelName,
          role,
          subscriptionTier: role === 'partner' ? 'partner' : body.subscriptionTier === 'artist' ? 'artist' : 'super_artist',
          mustChangePassword: true,
          temporaryPassword: true,
        },
      });

      if (error) {
        if (isAuthProvisioningFailure(error)) {
          return c.json({
            error: 'Supabase Auth cannot create new accounts right now. Existing accounts can still sign in, but new user provisioning is blocked in the live project auth database.',
          }, 503);
        }

        return c.json({ error: `Failed to create auth user: ${error.message}` }, 400);
      }

      if (!data.user) {
        return c.json({ error: 'Auth user creation returned no user record' }, 500);
      }

      userId = data.user.id;
      createdAuthUserId = data.user.id;
    }

    const existingUser = await userService.getUserByUserId(userId);
    if (existingUser) {
      return c.json({ user: existingUser, provisioningMode: 'auth' });
    }

    if (role === 'artist') {
      if (!artistName) {
        return c.json({ error: 'Artist name is required' }, 400);
      }

      try {
        const user = await userService.createArtist({
          userId,
          firstName,
          lastName,
          artistName,
          email,
          country: typeof body.country === 'string' ? body.country.trim() : undefined,
          state: typeof body.state === 'string' ? body.state.trim() : undefined,
          profileImage: body.profileImage,
          bannerImage: body.bannerImage,
          bio: body.bio,
          genres: body.genres,
          socialLinks: body.socialLinks,
            verification: buildInitialArtistVerification(),
            verificationStatus: 'pending',
            isVerified: false,
          subscriptionTier: body.subscriptionTier === 'artist' ? 'artist' : 'free',
        });

        await adminService.logAdminAction(adminUserId, 'create', 'user', user.id, {
          role,
          email,
          userId,
          provisioningMode: 'auth',
        });

        return c.json({ user, provisioningMode: 'auth' });
      } catch (error) {
        if (createdAuthUserId) {
          await supabase.auth.admin.deleteUser(createdAuthUserId);
        }
        throw error;
      }
    }

    if (!labelName) {
      return c.json({ error: 'Label name is required' }, 400);
    }

    try {
      const user = await userService.createLabel({
        userId,
        firstName,
        lastName,
        labelName,
        email,
        country: typeof body.country === 'string' ? body.country.trim() : undefined,
        state: typeof body.state === 'string' ? body.state.trim() : undefined,
        profileImage: body.profileImage,
        bannerImage: body.bannerImage,
        description: body.description,
        website: body.website,
        artists: [],
        isVerified: true,
        subscriptionTier: role === 'partner' ? 'partner' : (body.subscriptionTier === 'artist' ? 'artist' : 'super_artist'),
      });

      await adminService.logAdminAction(adminUserId, 'create', 'user', user.id, {
        role,
        email,
        userId,
        provisioningMode: 'auth',
      });

      return c.json({ user, provisioningMode: 'auth' });
    } catch (error) {
      if (createdAuthUserId) {
        await supabase.auth.admin.deleteUser(createdAuthUserId);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating user profile from admin:', error);
    return c.json({ error: `Failed to create user profile: ${error.message}` }, 500);
  }
});

// Get current user profile
app.get("/make-server-79198001/users/me", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const user = await userService.getUserByUserId(userId);

    if (!user) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const permissions = userService.getUserPermissions(user);

    return c.json({ user, permissions });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return c.json({ error: `Failed to fetch user profile: ${error.message}` }, 500);
  }
});

// Update user profile
app.put("/make-server-79198001/users/me", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const user = await userService.getUserByUserId(userId);
    if (!user) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const updatedUser = await userService.updateUser(user.id, body);
    await syncAuthUserMetadata(user.userId, {
      email: updatedUser?.email,
      firstName: updatedUser?.firstName,
      lastName: updatedUser?.lastName,
      artistName: updatedUser?.role === 'artist' ? updatedUser.artistName : undefined,
      labelName: updatedUser?.role === 'partner' ? updatedUser.labelName : undefined,
      role: updatedUser?.role,
      subscriptionTier: updatedUser?.subscriptionTier,
    });
    const permissions = userService.getUserPermissions(updatedUser!);
    await adminService.logUserActivity(userId, c.get('userEmail'), 'profile_updated', 'profile', user.id, { fields: Object.keys(body) }).catch(() => {});

    return c.json({ user: updatedUser, permissions });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return c.json({ error: `Failed to update user profile: ${error.message}` }, 500);
  }
});

// Add artist to label
app.post("/make-server-79198001/users/label/artists", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const label = await userService.getUserByUserId(userId);
    const hasPartnerAccess = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
    if (!hasPartnerAccess) {
      return c.json({ error: 'Only partner accounts can add managed artists' }, 403);
    }

    const success = await userService.addArtistToLabel(label.id, body.artistId);
    if (!success) {
      return c.json({ error: 'Failed to add artist to label' }, 400);
    }

    const artists = await userService.getLabelArtists(label.id);
    return c.json({ artists });
  } catch (error) {
    console.error('Error adding artist to label:', error);
    return c.json({ error: `Failed to add artist: ${error.message}` }, 500);
  }
});

// Link an existing artist account to the current label by email
app.post("/make-server-79198001/users/label/artists/link", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return c.json({ error: 'Artist email is required' }, 400);
    }

    const label = await userService.getUserByUserId(userId);
    const hasPartnerAccess = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
    if (!hasPartnerAccess) {
      return c.json({ error: 'Only partner accounts can link artists' }, 403);
    }

    const existingUser = await userService.getUserByEmail(email);
    if (!existingUser) {
      return c.json({ error: 'No existing artist account was found for this email' }, 404);
    }

    if (existingUser.role !== 'artist') {
      return c.json({ error: 'This email belongs to a non-artist account and cannot be linked here' }, 400);
    }

    const labelArtists = await userService.getLabelArtists(label.id);
    if (labelArtists.some((artist) => artist.id === existingUser.id)) {
      return c.json({ error: 'This artist is already linked to your label' }, 400);
    }

    const success = await userService.addArtistToLabel(label.id, existingUser.id);
    if (!success) {
      return c.json({ error: 'Failed to link artist to label' }, 400);
    }

    const artists = await userService.getLabelArtists(label.id);
    return c.json({ artist: existingUser, artists });
  } catch (error) {
    console.error('Error linking existing artist to label:', error);
    return c.json({ error: `Failed to link existing artist: ${error.message}` }, 500);
  }
});

app.post("/make-server-79198001/users/label/artists/create", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const artistName = typeof body.artistName === 'string' ? body.artistName.trim() : '';
    const password = typeof body.password === 'string'
      ? body.password.trim()
      : typeof body.defaultPassword === 'string'
        ? body.defaultPassword.trim()
        : 'Password@1';

    if (!email) {
      return c.json({ error: 'Artist email is required' }, 400);
    }

    if (!artistName) {
      return c.json({ error: 'Artist name is required' }, 400);
    }

    if (!password) {
      return c.json({ error: 'A default password is required' }, 400);
    }

    const label = await userService.getUserByUserId(userId);
    
    // Allow partners to create artists under them
    // Check for role === 'partner' OR subscriptionTier === 'partner'
    const hasPartnerAccess = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
    
    if (!hasPartnerAccess) {
      return c.json({ 
        error: 'Only partner accounts can create managed artists. Please upgrade to a partner subscription or contact support.' 
      }, 403);
    }

    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      return c.json({ error: 'A user profile with this email already exists' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName: body.firstName,
        lastName: body.lastName,
        artistName,
        role: 'artist',
        subscriptionTier: 'free',
        mustChangePassword: true,
        temporaryPassword: true,
      },
    });

    if (error) {
      if (isAuthProvisioningFailure(error)) {
        return c.json({
          error: 'Supabase Auth cannot create new accounts right now. Existing accounts can still sign in, but new artist provisioning is blocked in the live project auth database.',
        }, 503);
      }

      return c.json({ error: `Failed to create auth user: ${error.message}` }, 400);
    }

    if (!data.user) {
      return c.json({ error: 'Auth user creation returned no user record' }, 500);
    }

    try {
      const artist = await userService.createArtist({
        userId: data.user.id,
        firstName: body.firstName,
        lastName: body.lastName,
        artistName,
        email,
        country: typeof body.country === 'string' ? body.country.trim() : undefined,
        state: typeof body.state === 'string' ? body.state.trim() : undefined,
        profileImage: body.profileImage,
        bannerImage: body.bannerImage,
        bio: body.bio,
        genres: body.genres,
        socialLinks: body.socialLinks,
        verification: buildInitialArtistVerification(),
        verificationStatus: 'pending',
        isVerified: false,
        subscriptionTier: 'free',
      });

      const success = await userService.addArtistToLabel(label.id, artist.id);
      if (!success) {
        await supabase.auth.admin.deleteUser(data.user.id);
        return c.json({ error: 'Failed to link artist to label' }, 400);
      }

      const artists = await userService.getLabelArtists(label.id);
      return c.json({ artist, artists, provisioningMode: 'auth' });
    } catch (creationError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      throw creationError;
    }
  } catch (error) {
    console.error('Error creating label-managed artist account:', error);
    return c.json({ error: `Failed to create artist account: ${error.message}` }, 500);
  }
});

// Get label artists
app.get("/make-server-79198001/users/label/artists", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');

    const label = await userService.getUserByUserId(userId);
    const hasPartnerAccess = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
    if (!hasPartnerAccess) {
      return c.json({ error: 'Only partner accounts can view their artists' }, 403);
    }

    const artists = await userService.getLabelArtists(label.id);
    return c.json({ artists });
  } catch (error) {
    console.error('Error fetching label artists:', error);
    return c.json({ error: `Failed to fetch artists: ${error.message}` }, 500);
  }
});

app.get("/make-server-79198001/users/label/earnings-summary", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');

    const label = await userService.getUserByUserId(userId);
    const hasPartnerAccess = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
    if (!hasPartnerAccess) {
      return c.json({ error: 'Only partner accounts can view artist earnings summary' }, 403);
    }

    const artists = await userService.getLabelArtists(label.id);
    const [balance, stats, artistSummaries] = await Promise.all([
      royaltyService.getUserBalance(label.userId),
      royaltyService.getUserEarningsStats(label.userId),
      buildLabelOwnedArtistSummaries(label, artists),
    ]);

    const topArtists = artistSummaries
      .slice()
      .sort((left, right) => right.totalRevenue - left.totalRevenue)
      .slice(0, 4);

    const latestUpdatedAt = [balance.updatedAt, ...artistSummaries.map((artist) => artist.updatedAt)]
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || new Date().toISOString();

    return c.json({
      summary: {
        artistCount: artistSummaries.length,
        totalArtistEarnings: balance.totalEarnings,
        availableArtistBalance: balance.availableBalance,
        pendingArtistBalance: balance.pendingBalance,
        totalArtistStreams: stats.totalStreams,
        platformBreakdown: stats.platformBreakdown,
        monthlyTrend: stats.monthlyTrend,
        topArtists,
        updatedAt: latestUpdatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching label earnings summary:', error);
    return c.json({ error: `Failed to fetch label earnings summary: ${error.message}` }, 500);
  }
});

app.get("/make-server-79198001/users/label/artist-monthly-trends", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');

    const label = await userService.getUserByUserId(userId);
    const hasPartnerAccess = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
    if (!hasPartnerAccess) {
      return c.json({ error: 'Only partner accounts can view artist monthly trends' }, 403);
    }

    const artists = await userService.getLabelArtists(label.id);
    const [stats, artistTrendSummaries] = await Promise.all([
      royaltyService.getUserEarningsStats(label.userId),
      buildLabelOwnedArtistSummaries(label, artists),
    ]);

    const latestUpdatedAt = artistTrendSummaries
      .map((artist) => artist.updatedAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || new Date().toISOString();

    return c.json({
      trends: {
        labelMonthlyTrend: stats.monthlyTrend,
        artists: artistTrendSummaries,
        updatedAt: latestUpdatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching label artist monthly trends:', error);
    return c.json({ error: `Failed to fetch label artist monthly trends: ${error.message}` }, 500);
  }
});

app.put("/make-server-79198001/users/label/artists/:artistId/verification", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const artistId = c.req.param('artistId');
    const body = await c.req.json();

    const label = await userService.getUserByUserId(userId);
    const hasPartnerAccess = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
    if (!hasPartnerAccess) {
      return c.json({ error: 'Only partner accounts can review artist verification' }, 403);
    }

    const labelArtists = await userService.getLabelArtists(label.id);
    const artist = labelArtists.find((entry) => entry.id === artistId);
    if (!artist) {
      return c.json({ error: 'Artist not found in this label roster' }, 404);
    }

    const currentVerification = {
      emailConfirmed: artist.verification?.emailConfirmed === true,
      idVerified: artist.verification?.idVerified === true,
      idVerificationOptional: artist.verification?.idVerificationOptional !== false,
      profileReviewed: artist.verification?.profileReviewed === true,
      requestedAt: artist.verification?.requestedAt || artist.createdAt,
      reviewedAt: artist.verification?.reviewedAt,
      reviewNotes: artist.verification?.reviewNotes,
    };

    const incomingVerification = body?.verification && typeof body.verification === 'object' ? body.verification : body;
    const nextVerification = {
      ...currentVerification,
      ...(typeof incomingVerification.emailConfirmed === 'boolean' ? { emailConfirmed: incomingVerification.emailConfirmed } : {}),
      ...(typeof incomingVerification.idVerified === 'boolean' ? { idVerified: incomingVerification.idVerified } : {}),
      ...(typeof incomingVerification.idVerificationOptional === 'boolean' ? { idVerificationOptional: incomingVerification.idVerificationOptional } : {}),
      ...(typeof incomingVerification.profileReviewed === 'boolean' ? { profileReviewed: incomingVerification.profileReviewed } : {}),
      ...(typeof incomingVerification.reviewNotes === 'string' ? { reviewNotes: incomingVerification.reviewNotes.trim() } : {}),
      requestedAt: currentVerification.requestedAt || new Date().toISOString(),
      reviewedAt: incomingVerification.profileReviewed === true
        ? new Date().toISOString()
        : incomingVerification.profileReviewed === false
          ? undefined
          : currentVerification.reviewedAt,
    };

    const updatedArtist = await userService.updateUser(artist.id, {
      verification: nextVerification,
    });

    return c.json({ artist: updatedArtist });
  } catch (error) {
    console.error('Error updating artist verification:', error);
    return c.json({ error: `Failed to update verification: ${error.message}` }, 500);
  }
});

app.post("/make-server-79198001/users/label/artists/:artistId/remove", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const artistId = c.req.param('artistId');
    const body = await c.req.json().catch(() => ({}));
    const retentionOption = body?.retentionOption;
    const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : undefined;

    if (
      retentionOption !== 'retain-all'
      && retentionOption !== 'retain-financials'
      && retentionOption !== 'remove-roster-only'
    ) {
      return c.json({ error: 'A valid data retention option is required' }, 400);
    }

    const label = await userService.getUserByUserId(userId);
    const hasPartnerAccess = label && (label.role === 'partner' || label.subscriptionTier === 'partner');
    if (!hasPartnerAccess) {
      return c.json({ error: 'Only partner accounts can remove artists from the roster' }, 403);
    }

    const labelArtists = await userService.getLabelArtists(label.id);
    const artist = labelArtists.find((entry) => entry.id === artistId);
    if (!artist) {
      return c.json({ error: 'Artist not found in this label roster' }, 404);
    }

    const success = await userService.removeArtistFromLabel(label.id, artistId, {
      artistName: artist.artistName,
      artistEmail: artist.email,
      retentionOption,
      reason,
    });
    if (!success) {
      return c.json({ error: 'Failed to remove artist from label roster' }, 400);
    }

    const artists = await userService.getLabelArtists(label.id);
    return c.json({ artists, removedArtistId: artistId });
  } catch (error) {
    console.error('Error removing artist from label roster:', error);
    return c.json({ error: `Failed to remove artist: ${error.message}` }, 500);
  }
});

// ==================== UPLOAD SERVICE ROUTES ====================

// Create upload session
app.post("/make-server-79198001/upload/session", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    // Validate file type
    const validAudioTypes = ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'];
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (body.fileType === 'audio' && !validAudioTypes.includes(body.mimeType)) {
      return c.json({ error: 'Invalid audio format. Only WAV and FLAC are supported.' }, 400);
    }

    if (body.fileType === 'artwork' && !validImageTypes.includes(body.mimeType)) {
      return c.json({ error: 'Invalid image format. Only JPEG, PNG, and WebP are supported.' }, 400);
    }

    const session = await uploadService.createUploadSession(
      userId,
      body.fileName,
      body.fileSize,
      body.fileType,
      body.mimeType,
      body.totalChunks
    );

    return c.json({ session });
  } catch (error) {
    console.error('Error creating upload session:', error);
    return c.json({ error: `Failed to create upload session: ${error.message}` }, 500);
  }
});

app.post("/make-server-79198001/upload/signed-url", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const validAudioTypes = ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'];
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (body.fileType === 'audio' && !validAudioTypes.includes(body.mimeType)) {
      return c.json({ error: 'Invalid audio format. Only WAV and FLAC are supported.' }, 400);
    }

    if (body.fileType === 'artwork' && !validImageTypes.includes(body.mimeType)) {
      return c.json({ error: 'Invalid image format. Only JPEG, PNG, and WebP are supported.' }, 400);
    }

    const target = await uploadService.createSignedUploadTarget(
      userId,
      body.fileName,
      body.fileType,
    );

    return c.json({ target });
  } catch (error) {
    console.error('Error creating signed upload URL:', error);
    return c.json({ error: `Failed to create upload target: ${error.message}` }, 500);
  }
});

// Upload chunk
app.post("/make-server-79198001/upload/chunk", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const session = await uploadService.getUploadSession(body.sessionId);
    if (!session) {
      return c.json({ error: 'Upload session not found' }, 404);
    }

    if (session.userId !== userId) {
      return c.json({ error: 'Unauthorized: Session belongs to different user' }, 403);
    }

    // Decode base64 chunk data
    const chunkData = Uint8Array.from(atob(body.chunkData), c => c.charCodeAt(0));

    const result = await uploadService.uploadChunk(
      body.sessionId,
      body.chunkIndex,
      chunkData.buffer
    );

    return c.json(result);
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return c.json({ error: `Failed to upload chunk: ${error.message}` }, 500);
  }
});

// Complete upload
app.post("/make-server-79198001/upload/complete", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const session = await uploadService.getUploadSession(body.sessionId);
    if (!session) {
      return c.json({ error: 'Upload session not found' }, 404);
    }

    if (session.userId !== userId) {
      return c.json({ error: 'Unauthorized: Session belongs to different user' }, 403);
    }

    const result = await uploadService.completeUpload(body.sessionId);

    return c.json(result);
  } catch (error) {
    console.error('Error completing upload:', error);
    return c.json({ error: `Failed to complete upload: ${error.message}` }, 500);
  }
});

app.post("/make-server-79198001/upload/finalize", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const result = await uploadService.finalizeSignedUpload(
      userId,
      body.path,
      body.fileType,
    );

    return c.json(result);
  } catch (error) {
    console.error('Error finalizing signed upload:', error);
    return c.json({ error: `Failed to finalize upload: ${error.message}` }, 500);
  }
});

// Cancel upload
app.post("/make-server-79198001/upload/cancel", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const session = await uploadService.getUploadSession(body.sessionId);
    if (!session) {
      return c.json({ error: 'Upload session not found' }, 404);
    }

    if (session.userId !== userId) {
      return c.json({ error: 'Unauthorized: Session belongs to different user' }, 403);
    }

    const success = await uploadService.cancelUpload(body.sessionId);

    return c.json({ success });
  } catch (error) {
    console.error('Error canceling upload:', error);
    return c.json({ error: `Failed to cancel upload: ${error.message}` }, 500);
  }
});

// Get upload session status
app.get("/make-server-79198001/upload/session/:sessionId", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');

    const session = await uploadService.getUploadSession(sessionId);
    if (!session) {
      return c.json({ error: 'Upload session not found' }, 404);
    }

    if (session.userId !== userId) {
      return c.json({ error: 'Unauthorized: Session belongs to different user' }, 403);
    }

    return c.json({ session });
  } catch (error) {
    console.error('Error fetching upload session:', error);
    return c.json({ error: `Failed to fetch upload session: ${error.message}` }, 500);
  }
});

app.post('/make-server-79198001/promotions', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const body = await c.req.json();

    if (!body.releaseTitle || typeof body.releaseTitle !== 'string') {
      return c.json({ error: 'Release title is required' }, 400);
    }

    if (!body.artistName || typeof body.artistName !== 'string') {
      return c.json({ error: 'Artist name is required' }, 400);
    }

    const campaign = await promotionService.createPromotionCampaign({
      userId,
      email: userEmail,
      planId: body.planId,
      releaseTitle: body.releaseTitle.trim(),
      artistName: body.artistName.trim(),
      releaseId: typeof body.releaseId === 'string' ? body.releaseId.trim() : null,
      releaseImageUrl: typeof body.releaseImageUrl === 'string' ? body.releaseImageUrl.trim() : null,
      releaseType: typeof body.releaseType === 'string' ? body.releaseType.trim() : null,
      releaseGenre: typeof body.releaseGenre === 'string' ? body.releaseGenre.trim() : null,
    });

    return c.json({ campaign });
  } catch (error) {
    console.error('Error creating promotion campaign:', error);
    return c.json({ error: `Failed to create promotion campaign: ${error.message}` }, 500);
  }
});

app.get('/make-server-79198001/promotions', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const campaigns = await promotionService.getUserPromotionCampaigns(userId);
    return c.json({ campaigns });
  } catch (error) {
    console.error('Error loading promotion campaigns:', error);
    return c.json({ error: `Failed to load promotion campaigns: ${error.message}` }, 500);
  }
});

// ==================== METADATA SERVICE ROUTES ====================

// Get genres and languages
app.get("/make-server-79198001/metadata/reference-data", (c) => {
  return c.json({
    genres: metadataService.getGenres(),
    languages: metadataService.getLanguages(),
  });
});

// Create release
app.post("/make-server-79198001/releases", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const release = await metadataService.createReleaseMetadata({
      userId,
      ...body,
      trackIds: [],
    });
    await adminService.logUserActivity(userId, c.get('userEmail'), 'release_created', 'release', release.id, { title: release.title, releaseType: release.releaseType }).catch(() => {});
    sendNotification({
      userId,
      title: 'Release draft created',
      body: `"${release.title}" has been saved as a draft. Complete the tracks and artwork to submit.`,
      type: 'release',
      link: `/dashboard/releases`,
    }).catch(() => {});

    return c.json({ release });
  } catch (error) {
    console.error('Error creating release:', error);
    return c.json({ error: `Failed to create release: ${error.message}` }, 500);
  }
});

// Get user releases
app.get("/make-server-79198001/releases", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const releases = await metadataService.getUserReleases(userId);
    return c.json({ releases });
  } catch (error) {
    console.error('Error fetching releases:', error);
    return c.json({ error: `Failed to fetch releases: ${error.message}` }, 500);
  }
});

// Get release by ID
app.get("/make-server-79198001/releases/:releaseId", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const releaseId = c.req.param('releaseId');

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    if (release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const tracks = await metadataService.getReleaseTracks(releaseId);

    return c.json({ release, tracks });
  } catch (error) {
    console.error('Error fetching release:', error);
    return c.json({ error: `Failed to fetch release: ${error.message}` }, 500);
  }
});

// Update release
app.put("/make-server-79198001/releases/:releaseId", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const releaseId = c.req.param('releaseId');
    const body = await c.req.json();

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    if (release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const updatedRelease = await metadataService.updateReleaseMetadata(releaseId, body);
    const isSubmit = body.status === 'submitted';
    await adminService.logUserActivity(userId, c.get('userEmail'), isSubmit ? 'release_submitted' : 'release_updated', 'release', releaseId, isSubmit ? { title: updatedRelease?.title } : { fields: Object.keys(body) }).catch(() => {});
    if (isSubmit) {
      sendNotification({
        userId,
        title: 'Release submitted for distribution',
        body: `"${updatedRelease?.title ?? 'Your release'}" has been submitted and is under review. We'll notify you when it goes live.`,
        type: 'release',
        link: `/dashboard/releases`,
        sendEmail: true,
        emailSubject: `Release submitted: ${updatedRelease?.title ?? 'Your release'}`,
      }).catch(() => {});
    }

    return c.json({ release: updatedRelease });
  } catch (error) {
    console.error('Error updating release:', error);
    return c.json({ error: `Failed to update release: ${error.message}` }, 500);
  }
});

// Create track
app.post("/make-server-79198001/releases/:releaseId/tracks", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const releaseId = c.req.param('releaseId');
    const body = await c.req.json();

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    if (release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const track = await metadataService.createTrackMetadata({
      releaseId,
      ...body,
    });

    // Add track to release
    await metadataService.updateReleaseMetadata(releaseId, {
      trackIds: [...release.trackIds, track.id],
    });

    return c.json({ track });
  } catch (error) {
    console.error('Error creating track:', error);
    return c.json({ error: `Failed to create track: ${error.message}` }, 500);
  }
});

// Update track
app.put("/make-server-79198001/tracks/:trackId", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const trackId = c.req.param('trackId');
    const body = await c.req.json();

    const track = await metadataService.getTrackById(trackId);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    const release = await metadataService.getReleaseById(track.releaseId);
    if (!release || release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const updatedTrack = await metadataService.updateTrackMetadata(trackId, body);

    return c.json({ track: updatedTrack });
  } catch (error) {
    console.error('Error updating track:', error);
    return c.json({ error: `Failed to update track: ${error.message}` }, 500);
  }
});

app.delete("/make-server-79198001/tracks/:trackId", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const trackId = c.req.param('trackId');

    const track = await metadataService.getTrackById(trackId);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    const release = await metadataService.getReleaseById(track.releaseId);
    if (!release || release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const deletedTrack = await metadataService.deleteTrackMetadata(trackId);

    return c.json({ success: true, track: deletedTrack });
  } catch (error) {
    console.error('Error deleting track:', error);
    return c.json({ error: `Failed to delete track: ${error.message}` }, 500);
  }
});

// Validate release
app.post("/make-server-79198001/releases/:releaseId/validate", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const releaseId = c.req.param('releaseId');

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    if (release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const validation = await metadataService.validateRelease(releaseId);

    return c.json(validation);
  } catch (error) {
    console.error('Error validating release:', error);
    return c.json({ error: `Failed to validate release: ${error.message}` }, 500);
  }
});

// ==================== ISRC/UPC SERVICE ROUTES ====================

// Generate and assign ISRC to track
app.post("/make-server-79198001/tracks/:trackId/isrc", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const trackId = c.req.param('trackId');

    const track = await metadataService.getTrackById(trackId);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    const release = await metadataService.getReleaseById(track.releaseId);
    if (!release || release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const isrc = await isrcService.assignISRCToTrack(trackId);
    await metadataService.updateTrackMetadata(trackId, { isrc });

    return c.json({ isrc });
  } catch (error) {
    console.error('Error assigning ISRC:', error);
    return c.json({ error: `Failed to assign ISRC: ${error.message}` }, 500);
  }
});

// Generate and assign UPC to release
app.post("/make-server-79198001/releases/:releaseId/upc", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const releaseId = c.req.param('releaseId');

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    if (release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const upc = await isrcService.assignUPCToRelease(releaseId);
    await metadataService.updateReleaseMetadata(releaseId, { upc });

    return c.json({ upc });
  } catch (error) {
    console.error('Error assigning UPC:', error);
    return c.json({ error: `Failed to assign UPC: ${error.message}` }, 500);
  }
});

// Get code statistics
app.get("/make-server-79198001/codes/statistics", verifyAuth, async (c) => {
  try {
    const stats = await isrcService.getCodeStatistics();
    return c.json(stats);
  } catch (error) {
    console.error('Error fetching code statistics:', error);
    return c.json({ error: `Failed to fetch statistics: ${error.message}` }, 500);
  }
});

// ==================== DISTRIBUTION SERVICE ROUTES ====================

// Create distribution batch
app.post("/make-server-79198001/releases/:releaseId/distribute", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const releaseId = c.req.param('releaseId');
    const body = await c.req.json();

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    if (release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const batch = await distributionService.createDistributionBatch(
      releaseId,
      userId,
      body.platforms
    );
    await adminService.logUserActivity(userId, c.get('userEmail'), 'release_distributed', 'release', releaseId, { platforms: body.platforms, batchId: batch?.id }).catch(() => {});

    return c.json({ batch });
  } catch (error) {
    console.error('Error creating distribution batch:', error);
    return c.json({ error: `Failed to create distribution: ${error.message}` }, 500);
  }
});

// Get release deliveries
app.get("/make-server-79198001/releases/:releaseId/deliveries", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const releaseId = c.req.param('releaseId');

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    if (release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const deliveries = await distributionService.getReleaseDeliveries(releaseId);

    return c.json({ deliveries });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return c.json({ error: `Failed to fetch deliveries: ${error.message}` }, 500);
  }
});

// Update delivery status
app.put("/make-server-79198001/deliveries/:deliveryId/status", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const deliveryId = c.req.param('deliveryId');
    const body = await c.req.json();

    const delivery = await distributionService.getDeliveryById(deliveryId);
    if (!delivery) {
      return c.json({ error: 'Delivery not found' }, 404);
    }

    const release = await metadataService.getReleaseById(delivery.releaseId);
    if (!release || release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const updatedDelivery = await distributionService.updateDeliveryStatus(
      deliveryId,
      body.status,
      body
    );

    return c.json({ delivery: updatedDelivery });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    return c.json({ error: `Failed to update delivery status: ${error.message}` }, 500);
  }
});

// Get DDEX XML for release
app.get("/make-server-79198001/releases/:releaseId/ddex", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const releaseId = c.req.param('releaseId');

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    if (release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const ddexXml = await distributionService.generateDDEXXML(releaseId);

    return new Response(ddexXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="release_${releaseId}.xml"`,
      },
    });
  } catch (error) {
    console.error('Error generating DDEX XML:', error);
    return c.json({ error: `Failed to generate DDEX XML: ${error.message}` }, 500);
  }
});

// Get delivery statistics
app.get("/make-server-79198001/deliveries/statistics", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const stats = await distributionService.getUserDeliveryStats(userId);
    return c.json(stats);
  } catch (error) {
    console.error('Error fetching delivery statistics:', error);
    return c.json({ error: `Failed to fetch statistics: ${error.message}` }, 500);
  }
});

// ==================== ROYALTY SERVICE ROUTES ====================

// Ingest streaming report (CSV)
app.post("/make-server-79198001/royalties/ingest", verifyAuth, async (c) => {
  try {
    const body = await c.req.json();
    
    const reports = royaltyService.parseCSVReport(body.csvContent);
    const reportIds = await royaltyService.ingestStreamingReport(
      body.platform,
      body.reportPeriod,
      reports
    );

    // Queue processing jobs
    for (const reportId of reportIds) {
      await queueService.enqueueJob('report_ingestion', { reportId });
    }

    return c.json({ success: true, reportCount: reportIds.length, reportIds });
  } catch (error) {
    console.error('Error ingesting report:', error);
    return c.json({ error: `Failed to ingest report: ${error.message}` }, 500);
  }
});

// Set royalty splits for track
app.post("/make-server-79198001/tracks/:trackId/splits", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const trackId = c.req.param('trackId');
    const body = await c.req.json();

    const track = await metadataService.getTrackById(trackId);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    const release = await metadataService.getReleaseById(track.releaseId);
    if (!release || release.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await royaltyService.setTrackRoyaltySplits(trackId, body.splits);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error setting royalty splits:', error);
    return c.json({ error: `Failed to set royalty splits: ${error.message}` }, 500);
  }
});

// Get user balance
app.get("/make-server-79198001/royalties/balance", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const balance = await royaltyService.getUserBalance(userId);
    return c.json({ balance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return c.json({ error: `Failed to fetch balance: ${error.message}` }, 500);
  }
});

// Get user earnings
app.get("/make-server-79198001/royalties/earnings", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const earnings = await royaltyService.getUserEarnings(userId);
    const stats = await royaltyService.getUserEarningsStats(userId);
    return c.json({ earnings, stats });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return c.json({ error: `Failed to fetch earnings: ${error.message}` }, 500);
  }
});

// ==================== PAYMENT SERVICE ROUTES ====================

// Add payment details
app.post("/make-server-79198001/payments/details", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const details = await paymentService.addPaymentDetails(
      userId,
      body.method,
      body.details,
      body.isPrimary
    );

    return c.json({ details });
  } catch (error) {
    console.error('Error adding payment details:', error);
    return c.json({ error: `Failed to add payment details: ${error.message}` }, 500);
  }
});

// Get user payment details
app.get("/make-server-79198001/payments/details", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const details = await paymentService.getUserPaymentDetails(userId);
    return c.json({ details });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return c.json({ error: `Failed to fetch payment details: ${error.message}` }, 500);
  }
});

// Request payout
app.post("/make-server-79198001/payments/payout", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const payout = await paymentService.requestPayout(
      userId,
      body.amount,
      body.paymentDetailsId
    );

    // Queue payment processing
    await queueService.enqueueJob('payment_processing', { payoutId: payout.id });
    sendNotification({
      userId,
      title: 'Payout request received',
      body: `Your payout request has been received and is being processed. You'll be notified once it's approved.`,
      type: 'earnings',
      link: '/dashboard/earnings',
      sendEmail: true,
      emailSubject: 'Payout request received',
    }).catch(() => {});

    return c.json({ payout });
  } catch (error) {
    console.error('Error requesting payout:', error);
    return c.json({ error: `Failed to request payout: ${error.message}` }, 500);
  }
});

// Get user payouts
app.get("/make-server-79198001/payments/payouts", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const payouts = await paymentService.getUserPayouts(userId);
    const stats = await paymentService.getPayoutStatistics(userId);
    return c.json({ payouts, stats });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return c.json({ error: `Failed to fetch payouts: ${error.message}` }, 500);
  }
});

// Get available banks
app.get("/make-server-79198001/payments/banks", (c) => {
  const banks = paymentService.getAvailableBanks();
  return c.json({ banks });
});

// Verify bank account
app.post("/make-server-79198001/payments/verify-account", verifyAuth, async (c) => {
  try {
    const body = await c.req.json();
    const result = await paymentService.verifyBankAccount(
      body.accountNumber,
      body.bankCode
    );
    return c.json(result);
  } catch (error) {
    console.error('Error verifying account:', error);
    return c.json({ error: `Failed to verify account: ${error.message}` }, 500);
  }
});

// ==================== FRAUD DETECTION ROUTES ====================

// Analyze streaming pattern
app.post("/make-server-79198001/fraud/analyze", verifyAuth, async (c) => {
  try {
    const body = await c.req.json();
    
    const alerts = await fraudService.analyzeStreamingPattern(
      body.trackId,
      body.pattern
    );

    return c.json({ alerts });
  } catch (error) {
    console.error('Error analyzing pattern:', error);
    return c.json({ error: `Failed to analyze pattern: ${error.message}` }, 500);
  }
});

// Get user fraud score
app.get("/make-server-79198001/fraud/score", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const score = await fraudService.calculateUserFraudScore(userId);
    return c.json({ score });
  } catch (error) {
    console.error('Error calculating fraud score:', error);
    return c.json({ error: `Failed to calculate fraud score: ${error.message}` }, 500);
  }
});

// Get user fraud alerts
app.get("/make-server-79198001/fraud/alerts", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const alerts = await fraudService.getUserFraudAlerts(userId);
    return c.json({ alerts });
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    return c.json({ error: `Failed to fetch fraud alerts: ${error.message}` }, 500);
  }
});

// ==================== QUEUE SERVICE ROUTES ====================

// Get queue statistics
app.get("/make-server-79198001/queue/stats", verifyAuth, async (c) => {
  try {
    const stats = await queueService.getQueueStats();
    return c.json({ stats });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return c.json({ error: `Failed to fetch queue stats: ${error.message}` }, 500);
  }
});

// Get job status
app.get("/make-server-79198001/jobs/:jobId", verifyAuth, async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const job = await queueService.getJob(jobId);
    
    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    return c.json({ job });
  } catch (error) {
    console.error('Error fetching job:', error);
    return c.json({ error: `Failed to fetch job: ${error.message}` }, 500);
  }
});

// ==================== ADMIN SERVICE ROUTES ====================

// Middleware to verify admin access
async function verifyAdmin(c: any, next: any) {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const admin = await adminService.getAdminUser(userId);
  if (!admin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  if (!adminService.isAdminActive(admin)) {
    return c.json({ error: 'Admin account is inactive' }, 403);
  }

  c.set('adminUser', admin);
  await adminService.updateAdminActivity(userId);
  await next();
}

// Middleware to check specific permission
function requirePermission(permission: adminService.Permission) {
  return async (c: any, next: any) => {
    const userId = c.get('userId');
    const hasAccess = await adminService.hasPermission(userId, permission);
    
    if (!hasAccess) {
      return c.json({ error: `Permission denied: ${permission} required` }, 403);
    }

    await next();
  };
}

// Create admin user (superadmin only)
app.post("/make-server-79198001/admin/users", verifyAuth, verifyAdmin, requirePermission('admins.create'), async (c) => {
  try {
    const createdBy = c.get('userId');
    const body = await c.req.json();

    const adminUser = await adminService.createAdminUser(
      body.userId,
      body.role,
      createdBy,
      body.department
    );

    return c.json({ adminUser });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return c.json({ error: `Failed to create admin user: ${error.message}` }, 500);
  }
});

// Get current admin user's details (no permission required - used during login)
app.get("/make-server-79198001/admin/me", verifyAuth, verifyAdmin, async (c) => {
  try {
    const userId = c.get('userId');
    const adminUser = await adminService.getAdminByUserId(userId);
    
    if (!adminUser) {
      return c.json({ error: 'Admin user not found' }, 404);
    }
    
    return c.json({ admin: adminUser });
  } catch (error) {
    console.error('Error fetching current admin:', error);
    return c.json({ error: `Failed to fetch admin details: ${error.message}` }, 500);
  }
});

app.get('/make-server-79198001/admin/analytics/reports', verifyAuth, verifyAdmin, requirePermission('reports.view'), async (c) => {
  try {
    const reports = await analyticsService.listAnalyticsUploads();
    return c.json({ reports });
  } catch (error) {
    console.error('Error loading analytics upload history:', error);
    return c.json({ error: `Failed to load analytics upload history: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/analytics/reports', verifyAuth, verifyAdmin, requirePermission('reports.upload'), async (c) => {
  try {
    const uploadedByUserId = c.get('userId');
    const body = await c.req.json();

    if (!body || typeof body.fileName !== 'string' || !body.fileName.trim()) {
      return c.json({ error: 'A file name is required' }, 400);
    }

    if (!body.reportType || typeof body.reportType !== 'string') {
      return c.json({ error: 'A report type is required' }, 400);
    }

    if (!body.reportMonth || typeof body.reportMonth !== 'string') {
      return c.json({ error: 'A report month is required' }, 400);
    }

    if (!body.reportYear || typeof body.reportYear !== 'string') {
      return c.json({ error: 'A report year is required' }, 400);
    }

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return c.json({ error: 'Analytics rows are required' }, 400);
    }

    const report = await analyticsService.ingestAnalyticsReport({
      uploadedByUserId,
      fileName: body.fileName.trim(),
      reportType: body.reportType,
      platform: typeof body.platform === 'string' ? body.platform : undefined,
      reportMonth: body.reportMonth,
      reportYear: body.reportYear,
      rows: body.rows,
    });

    await adminService.logAdminAction(uploadedByUserId, 'upload', 'analytics-report', report.id, {
      fileName: report.fileName,
      platform: report.platform,
      recordsProcessed: report.recordsProcessed,
      matchedRecords: report.matchedRecords,
      unmatchedRecords: report.unmatchedRecords,
    });

    return c.json({ report });
  } catch (error) {
    console.error('Error uploading analytics report:', error);
    return c.json({ error: `Failed to upload analytics report: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get('/make-server-79198001/admin/royalty-reports', verifyAuth, verifyAdmin, requirePermission('reports.view'), async (c) => {
  try {
    const reports = await royaltyService.listRoyaltyUploadBatches();
    return c.json({ reports });
  } catch (error) {
    console.error('Error loading royalty upload history:', error);
    return c.json({ error: `Failed to load royalty upload history: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/royalty-reports', verifyAuth, verifyAdmin, requirePermission('reports.upload'), async (c) => {
  try {
    const uploadedByUserId = c.get('userId');
    const body = await c.req.json();

    if (!body || typeof body.fileName !== 'string' || !body.fileName.trim()) {
      return c.json({ error: 'A file name is required' }, 400);
    }

    if (!body.platform || typeof body.platform !== 'string') {
      return c.json({ error: 'A royalty platform is required' }, 400);
    }

    if (!body.reportMonth || typeof body.reportMonth !== 'string') {
      return c.json({ error: 'A report month is required' }, 400);
    }

    if (!body.reportYear || typeof body.reportYear !== 'string') {
      return c.json({ error: 'A report year is required' }, 400);
    }

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return c.json({ error: 'Royalty rows are required' }, 400);
    }

    const report = await royaltyService.ingestRoyaltyUploadBatch({
      uploadedByUserId,
      fileName: body.fileName.trim(),
      platform: body.platform,
      reportMonth: body.reportMonth,
      reportYear: body.reportYear,
      rows: body.rows,
      fileSizeBytes: typeof body.fileSizeBytes === 'number' ? body.fileSizeBytes : undefined,
    });

    await adminService.logAdminAction(uploadedByUserId, 'upload', 'royalty-report', report.id, {
      fileName: report.fileName,
      platform: report.platform,
      recordsProcessed: report.recordsProcessed,
      matchedRecords: report.matchedRecords,
      unmatchedRecords: report.unmatchedRecords,
      earningsCreated: report.earningsCreated,
    });

    return c.json({ report });
  } catch (error) {
    console.error('Error uploading royalty report:', error);
    return c.json({ error: `Failed to upload royalty report: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Get all admin users
app.get("/make-server-79198001/admin/users", verifyAuth, verifyAdmin, requirePermission('admins.view'), async (c) => {
  try {
    const admins = await adminService.getAllAdminUsers();
    return c.json({ admins });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return c.json({ error: `Failed to fetch admin users: ${error.message}` }, 500);
  }
});

// Update admin role
app.put("/make-server-79198001/admin/users/:userId/role", verifyAuth, verifyAdmin, requirePermission('admins.edit'), async (c) => {
  try {
    const updatedBy = c.get('userId');
    const targetUserId = c.req.param('userId');
    const body = await c.req.json();

    const adminUser = await adminService.updateAdminRole(
      targetUserId,
      body.role,
      updatedBy
    );

    if (!adminUser) {
      return c.json({ error: 'Admin user not found' }, 404);
    }

    return c.json({ adminUser });
  } catch (error) {
    console.error('Error updating admin role:', error);
    return c.json({ error: `Failed to update admin role: ${error.message}` }, 500);
  }
});

// Delete admin user (dedicated path to avoid collision with platform user deletion)
app.delete("/make-server-79198001/admin/admin-users/:userId", verifyAuth, verifyAdmin, requirePermission('admins.delete'), async (c) => {
  try {
    const deletedBy = c.get('userId');
    const targetUserId = c.req.param('userId');

    // Cannot delete yourself
    if (deletedBy === targetUserId) {
      return c.json({ error: 'Cannot delete your own admin account' }, 400);
    }

    await adminService.deleteAdminUser(targetUserId, deletedBy);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return c.json({ error: `Failed to delete admin user: ${error.message}` }, 500);
  }
});

// Get audit logs (admin actions)
app.get("/make-server-79198001/admin/audit-logs", verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const userId = c.req.query('userId');
    const resource = c.req.query('resource');
    const resourceId = c.req.query('resourceId');

    let logs;
    if (userId) {
      logs = await adminService.getAdminAuditLogs(userId);
    } else if (resource && resourceId) {
      logs = await adminService.getResourceAuditLogs(resource, resourceId);
    } else {
      // No filter — return all logs
      logs = await adminService.getAllAuditLogs();
    }

    return c.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return c.json({ error: `Failed to fetch audit logs: ${error.message}` }, 500);
  }
});

// Get user activity logs (admin view)
app.get("/make-server-79198001/admin/user-activity", verifyAuth, verifyAdmin, requirePermission('users.view'), async (c) => {
  try {
    const userId = c.req.query('userId');
    const logs = userId
      ? await adminService.getUserActivityLogs(userId)
      : await adminService.getAllUserActivityLogs();
    return c.json({ logs });
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    return c.json({ error: `Failed to fetch user activity logs: ${error.message}` }, 500);
  }
});

// Get admin statistics
app.get("/make-server-79198001/admin/statistics", verifyAuth, verifyAdmin, async (c) => {
  try {
    const stats = await adminService.getAdminStats();
    return c.json({ stats });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    return c.json({ error: `Failed to fetch statistics: ${error.message}` }, 500);
  }
});

// Advanced Analytics & Reporting Dashboard
app.get('/make-server-79198001/admin/advanced-analytics', verifyAuth, verifyAdmin, requirePermission('system.analytics'), async (c) => {
  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // ── Load all data sources in parallel ──────────────────────────────────
    const [users, analyticsReports, royaltyBatches, payments, billingHistory] = await Promise.all([
      userService.getAllUsers().catch(() => []),
      analyticsService.listAnalyticsUploads(200).catch(() => []),
      royaltyService.listRoyaltyUploadBatches(200).catch(() => []),
      paystackService.getAllAdminPayments().catch(() => []),
      paystackService.getAllBillingHistory().catch(() => []),
    ]);

    // Analytics records (limit 1500 for performance, skip index keys)
    const analyticsRecordEntries = await kv.getEntriesByPrefix('analytics-record:').catch(() => []);
    const analyticsRecords = analyticsRecordEntries
      .filter((e: any) => e && e.key && !e.key.includes('report:') && !e.key.includes('track:') && !e.key.includes('user:'))
      .map((e: any) => e.value)
      .filter((r: any) => r && typeof r === 'object' && r.id)
      .slice(0, 1500) as any[];

    // Balance entries for top earners
    const balanceEntries = await kv.getEntriesByPrefix('balance:').catch(() => []);
    const balances = (balanceEntries as any[])
      .map((e: any) => ({ userId: (e.key as string).replace('balance:', ''), ...(e.value as any) }))
      .filter((b: any) => b.totalEarnings > 0);

    // All releases
    const releaseIndexEntries = await kv.getEntriesByPrefix('release:user:').catch(() => []);
    const releases: any[] = [];
    for (const entry of (releaseIndexEntries as any[]).slice(0, 500)) {
      const parts = (entry.key as string).split(':');
      const releaseId = parts[parts.length - 1];
      if (releaseId && releaseId.length > 8) {
        const release = await metadataService.getReleaseById(releaseId).catch(() => null);
        if (release) releases.push(release);
      }
    }

    // ── User Analytics ─────────────────────────────────────────────────────
    const userGrowthMap = new Map<string, number>();
    for (const user of users) {
      const month = (user.createdAt || '').slice(0, 7);
      if (month) userGrowthMap.set(month, (userGrowthMap.get(month) ?? 0) + 1);
    }
    let cumulative = 0;
    const monthlyGrowth = [...userGrowthMap.keys()].sort().slice(-12).map(month => {
      cumulative += userGrowthMap.get(month) ?? 0;
      return { month, new: userGrowthMap.get(month) ?? 0, cumulative };
    });

    const subscriptionMap = new Map<string, number>();
    for (const user of users) {
      const tier = (user as any).subscriptionTier ?? 'free';
      subscriptionMap.set(tier, (subscriptionMap.get(tier) ?? 0) + 1);
    }
    const subscriptionBreakdown = [...subscriptionMap.entries()].map(([tier, count]) => ({ tier, count }));

    const genreMap = new Map<string, number>();
    for (const user of users) {
      if (user.role === 'artist') {
        const genres = (user as any).genres;
        if (Array.isArray(genres)) {
          for (const g of genres) {
            if (typeof g === 'string') genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
          }
        }
      }
    }
    const genreDistribution = [...genreMap.entries()].map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    const countryMap = new Map<string, number>();
    for (const user of users) {
      const country = (user as any).country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
    }
    const countryDistribution = [...countryMap.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 15);

    // At-risk: artists with no release in last 90 days
    const recentUploaderIds = new Set(releases.filter(r => r.createdAt >= ninetyDaysAgo).map(r => r.userId));
    const artistUsers = users.filter(u => u.role === 'artist');
    const atRiskUsers = artistUsers
      .filter(u => !recentUploaderIds.has(u.userId))
      .slice(0, 50)
      .map(u => {
        const lastRelease = releases.filter(r => r.userId === u.userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        return {
          id: u.id,
          userId: u.userId,
          email: u.email,
          artistName: (u as any).artistName ?? null,
          createdAt: u.createdAt,
          lastRelease: lastRelease?.createdAt ?? null,
          daysSince: lastRelease ? Math.floor((now.getTime() - new Date(lastRelease.createdAt).getTime()) / 86400000) : null,
        };
      });

    // ── Release Analytics ──────────────────────────────────────────────────
    const releaseStreamsMap = new Map<string, number>();
    const releaseRevenueMap = new Map<string, number>();
    for (const rec of analyticsRecords) {
      if (rec.releaseId) {
        releaseStreamsMap.set(rec.releaseId, (releaseStreamsMap.get(rec.releaseId) ?? 0) + (rec.streams ?? 0));
        releaseRevenueMap.set(rec.releaseId, (releaseRevenueMap.get(rec.releaseId) ?? 0) + (rec.revenue ?? 0));
      }
    }
    const typeMap = new Map<string, { count: number; revenue: number; streams: number }>();
    const releaseGenreMap = new Map<string, { count: number; revenue: number; streams: number }>();
    const statusMap = new Map<string, number>();
    const releaseMonthMap = new Map<string, number>();
    for (const release of releases) {
      const streams = releaseStreamsMap.get(release.id) ?? 0;
      const revenue = releaseRevenueMap.get(release.id) ?? 0;
      const tb = typeMap.get(release.type) ?? { count: 0, revenue: 0, streams: 0 };
      tb.count++; tb.revenue += revenue; tb.streams += streams;
      typeMap.set(release.type, tb);
      const genre = release.genre || 'Unknown';
      const gb = releaseGenreMap.get(genre) ?? { count: 0, revenue: 0, streams: 0 };
      gb.count++; gb.revenue += revenue; gb.streams += streams;
      releaseGenreMap.set(genre, gb);
      statusMap.set(release.status, (statusMap.get(release.status) ?? 0) + 1);
      const month = (release.createdAt || '').slice(0, 7);
      if (month) releaseMonthMap.set(month, (releaseMonthMap.get(month) ?? 0) + 1);
    }
    const topReleases = releases.map(r => ({
      id: r.id, title: r.title, artist: r.primaryArtist, type: r.type, genre: r.genre,
      streams: releaseStreamsMap.get(r.id) ?? 0,
      revenue: releaseRevenueMap.get(r.id) ?? 0,
      releaseDate: r.releaseDate, status: r.status,
    })).sort((a, b) => b.streams - a.streams).slice(0, 20);

    // ── Platform Analytics ─────────────────────────────────────────────────
    const dspMap = new Map<string, { streams: number; revenue: number; listeners: number; records: number }>();
    const geoMap = new Map<string, { streams: number; revenue: number }>();
    const demoMap = new Map<string, { male: number; female: number; other: number }>();
    const platformMonthMap = new Map<string, { streams: number; revenue: number; listeners: number }>();
    for (const rec of analyticsRecords) {
      const platform = rec.platform || 'Unknown';
      const db = dspMap.get(platform) ?? { streams: 0, revenue: 0, listeners: 0, records: 0 };
      db.streams += rec.streams ?? 0; db.revenue += rec.revenue ?? 0; db.listeners += rec.listeners ?? 0; db.records++;
      dspMap.set(platform, db);
      if (rec.territory) {
        const geo = geoMap.get(rec.territory) ?? { streams: 0, revenue: 0 };
        geo.streams += rec.streams ?? 0; geo.revenue += rec.revenue ?? 0;
        geoMap.set(rec.territory, geo);
      }
      if (rec.ageGroup && rec.gender) {
        const demo = demoMap.get(rec.ageGroup) ?? { male: 0, female: 0, other: 0 };
        const g = rec.gender as string;
        if (g === 'male') demo.male += rec.listeners ?? rec.streams ?? 0;
        else if (g === 'female') demo.female += rec.listeners ?? rec.streams ?? 0;
        else demo.other += rec.listeners ?? rec.streams ?? 0;
        demoMap.set(rec.ageGroup, demo);
      }
      const month = (rec.date || rec.createdAt || '').slice(0, 7);
      if (month) {
        const mb = platformMonthMap.get(month) ?? { streams: 0, revenue: 0, listeners: 0 };
        mb.streams += rec.streams ?? 0; mb.revenue += rec.revenue ?? 0; mb.listeners += rec.listeners ?? 0;
        platformMonthMap.set(month, mb);
      }
    }
    // Also pull totals from royalty batches (these have real platform aggregations)
    for (const batch of royaltyBatches) {
      const platform = batch.platform || 'Unknown';
      const db = dspMap.get(platform) ?? { streams: 0, revenue: 0, listeners: 0, records: 0 };
      // only add streams/revenue if no analytics records exist for this platform yet
      if (db.records === 0) {
        db.streams += batch.totalStreams ?? 0;
        db.revenue += batch.totalRevenue ?? 0;
      }
      dspMap.set(platform, db);
    }

    // ── Financial Analytics ────────────────────────────────────────────────
    const completedPayments = (payments as any[]).filter((p: any) => p.status === 'completed');
    const totalRevenue = completedPayments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    const subscriptionPayments = (billingHistory as any[]).filter((b: any) => b.status === 'completed' && b.type === 'subscription');
    const subscriptionRevenue = subscriptionPayments.reduce((s: number, b: any) => s + (b.amount ?? 0), 0);
    const royaltyRevenue = royaltyBatches.reduce((s, b) => s + (b.totalRevenue ?? 0), 0);

    const revMonthMap = new Map<string, { revenue: number; payouts: number; subscriptions: number }>();
    for (const p of completedPayments as any[]) {
      const month = (p.createdAt || '').slice(0, 7);
      if (!month) continue;
      const b = revMonthMap.get(month) ?? { revenue: 0, payouts: 0, subscriptions: 0 };
      b.revenue += p.amount ?? 0;
      if (p.type === 'payout' || p.purpose === 'payout') b.payouts += p.amount ?? 0;
      revMonthMap.set(month, b);
    }
    for (const b of subscriptionPayments as any[]) {
      const month = (b.createdAt || '').slice(0, 7);
      if (!month) continue;
      const bkt = revMonthMap.get(month) ?? { revenue: 0, payouts: 0, subscriptions: 0 };
      bkt.subscriptions += b.amount ?? 0;
      bkt.revenue += b.amount ?? 0;
      revMonthMap.set(month, bkt);
    }
    const monthlyRevenue = [...revMonthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, v]) => ({ month, ...v }));

    // Linear regression forecast
    const last3 = monthlyRevenue.slice(-3);
    let forecastNextMonth = 0;
    if (last3.length >= 2) {
      const n = last3.length;
      const xs = last3.map((_: any, i: number) => i);
      const ys = last3.map((p: any) => p.revenue);
      const xMean = xs.reduce((s: number, x: number) => s + x, 0) / n;
      const yMean = ys.reduce((s: number, y: number) => s + y, 0) / n;
      const denom = xs.reduce((s: number, x: number) => s + (x - xMean) ** 2, 0.001);
      const slope = xs.reduce((s: number, x: number, i: number) => s + (x - xMean) * (ys[i] - yMean), 0) / denom;
      forecastNextMonth = Math.max(0, yMean + slope * (n - xMean));
    } else if (last3.length === 1) {
      forecastNextMonth = last3[0].revenue;
    }

    const topEarners = balances.sort((a: any, b: any) => b.totalEarnings - a.totalEarnings).slice(0, 10).map((b: any) => {
      const user = users.find(u => u.userId === b.userId);
      return {
        userId: b.userId,
        name: (user as any)?.artistName || user?.email || b.userId,
        email: user?.email || '',
        earnings: b.totalEarnings ?? 0,
        availableBalance: b.availableBalance ?? 0,
        pendingBalance: b.pendingBalance ?? 0,
      };
    });

    return c.json({
      userAnalytics: {
        totalUsers: users.length,
        artists: artistUsers.length,
        labels: users.filter(u => u.role === 'partner').length,
        monthlyGrowth,
        subscriptionBreakdown,
        genreDistribution,
        countryDistribution,
        atRiskUsers,
        churnedCount: atRiskUsers.length,
        avgReleasesPerArtist: artistUsers.length > 0 ? parseFloat((releases.length / Math.max(1, artistUsers.length)).toFixed(2)) : 0,
      },
      releaseAnalytics: {
        totalReleases: releases.length,
        byType: [...typeMap.entries()].map(([type, v]) => ({ type, ...v })),
        byGenre: [...releaseGenreMap.entries()].map(([genre, v]) => ({ genre, ...v })).sort((a, b) => b.streams - a.streams).slice(0, 12),
        byStatus: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
        monthlyReleases: [...releaseMonthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, count]) => ({ month, count })),
        topReleases,
      },
      platformAnalytics: {
        dspBreakdown: [...dspMap.entries()].map(([platform, v]) => ({ platform, ...v })).sort((a, b) => b.streams - a.streams),
        geographyBreakdown: [...geoMap.entries()].map(([country, v]) => ({ country, ...v })).sort((a, b) => b.streams - a.streams).slice(0, 20),
        demographics: [...demoMap.entries()].map(([ageGroup, v]) => ({ ageGroup, ...v })).sort((a, b) => a.ageGroup.localeCompare(b.ageGroup)),
        monthlyTrends: [...platformMonthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, v]) => ({ month, ...v })),
        totalAnalyticsRecords: analyticsRecords.length,
        totalRoyaltyBatches: royaltyBatches.length,
      },
      financialAnalytics: {
        totalRevenue,
        subscriptionRevenue,
        royaltyRevenue,
        totalPaidOut: completedPayments.filter((p: any) => p.type === 'payout' || p.purpose === 'payout').reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
        pendingPayouts: (payments as any[]).filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
        monthlyRevenue,
        forecastNextMonth,
        topEarners,
      },
      meta: {
        generatedAt: now.toISOString(),
        usersLoaded: users.length,
        releasesLoaded: releases.length,
        analyticsRecordsLoaded: analyticsRecords.length,
        royaltyBatchesLoaded: royaltyBatches.length,
      },
    });
  } catch (error) {
    console.error('Error generating advanced analytics:', error);
    return c.json({ error: `Failed to generate analytics: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get('/make-server-79198001/admin/promotions', verifyAuth, verifyAdmin, async (c) => {
  try {
    const campaigns = await promotionService.getAllPromotionCampaigns();
    return c.json({ campaigns });
  } catch (error) {
    console.error('Error loading admin promotions:', error);
    return c.json({ error: `Failed to load promotions: ${error.message}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT MODERATION & COMPLIANCE
// ══════════════════════════════════════════════════════════════════════════════

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getAllReleasesFull() {
  const entries = await kv.getEntriesByPrefix('release:user:');
  const seen = new Set<string>();
  const releases: any[] = [];
  for (const entry of entries) {
    const parts = (entry.key as string).split(':');
    const releaseId = parts[parts.length - 1];
    if (releaseId && releaseId.length > 8 && !seen.has(releaseId)) {
      seen.add(releaseId);
      const r = await metadataService.getReleaseById(releaseId).catch(() => null);
      if (r) releases.push(r);
    }
  }
  return releases;
}

async function getAllTracksFull(releases: any[]) {
  const tracks: any[] = [];
  for (const r of releases) {
    const ts = await metadataService.getReleaseTracks(r.id).catch(() => []);
    for (const t of ts) tracks.push({ ...t, releaseTitle: r.title, artistName: r.primaryArtist, releaseId: r.id });
  }
  return tracks;
}

function titleSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const na = norm(a), nb = norm(b);
  if (na === nb) return 100;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length <= nb.length ? na : nb;
  if (longer.includes(shorter) && shorter.length > 4) return 85;
  // Jaccard on bigrams
  const bigrams = (s: string) => {
    const bg = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2));
    return bg;
  };
  const bA = bigrams(na), bB = bigrams(nb);
  const intersection = [...bA].filter(b => bB.has(b)).length;
  const union = new Set([...bA, ...bB]).size;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

// ── Flagged Content ───────────────────────────────────────────────────────────
app.get('/make-server-79198001/admin/moderation/flags', verifyAuth, verifyAdmin, requirePermission('releases.view'), async (c) => {
  try {
    const stored = await kv.getByPrefix('moderation:flag:').catch(() => []);
    const flags = (stored as any[]).filter(f => f && f.id && f.reason);

    // Auto-generate system flags from rejected releases (not already flagged)
    const releases = await getAllReleasesFull();
    const flaggedReleaseIds = new Set(flags.map((f: any) => f.releaseId).filter(Boolean));
    for (const r of releases) {
      if (r.status === 'rejected' && !flaggedReleaseIds.has(r.id)) {
        const user = await kv.get<any>(`user:${r.userId}`).catch(() => null);
        flags.push({
          id: `sys-${r.id}`,
          releaseId: r.id,
          releaseTitle: r.title,
          artistName: r.primaryArtist || user?.artistName || user?.email || r.userId,
          userId: r.userId,
          reason: 'metadata_incomplete',
          severity: 'high',
          status: 'pending',
          flaggedBy: 'system',
          flaggedAt: r.updatedAt || r.createdAt,
          notes: (r.validationErrors || []).join('; ') || 'Release rejected — validation errors',
        });
      }
    }

    return c.json({ flags: flags.sort((a: any, b: any) => new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime()) });
  } catch (error) {
    console.error('Error fetching moderation flags:', error);
    return c.json({ error: `Failed to fetch flags: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/moderation/flags', verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const flag: any = {
      id, ...body,
      flaggedBy: 'admin',
      flaggedAt: now,
      status: body.status || 'pending',
      severity: body.severity || 'high',
    };
    await kv.set(`moderation:flag:${id}`, flag);
    await adminService.logAdminAction(adminUserId, 'create', 'moderation:flag', id, flag);
    return c.json({ flag });
  } catch (error) {
    return c.json({ error: `Failed to create flag: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/moderation/flags/:id', verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = new Date().toISOString();

    // System flags (id starts with "sys-") are derived — create a real record on first update
    let flag = await kv.get<any>(`moderation:flag:${id}`);
    if (!flag && id.startsWith('sys-')) {
      flag = { id, status: 'pending', flaggedBy: 'system', flaggedAt: now };
    }
    if (!flag) return c.json({ error: 'Flag not found' }, 404);

    const updated = { ...flag, ...body, updatedAt: now, resolvedBy: adminUserId, resolvedAt: body.status && body.status !== 'pending' ? now : flag.resolvedAt };
    await kv.set(`moderation:flag:${id}`, updated);

    // If action is takedown, update release status
    if (body.action === 'takedown' && flag.releaseId && !flag.releaseId.startsWith('sys-')) {
      await metadataService.updateReleaseMetadata(flag.releaseId, { status: 'rejected' });
    }

    await adminService.logAdminAction(adminUserId, body.action || 'update', 'moderation:flag', id, { ...body, flagId: id });
    return c.json({ flag: updated });
  } catch (error) {
    return c.json({ error: `Failed to update flag: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

// ── Copyright Claims ──────────────────────────────────────────────────────────
app.get('/make-server-79198001/admin/moderation/copyright', verifyAuth, verifyAdmin, requirePermission('releases.view'), async (c) => {
  try {
    const items = await kv.getByPrefix('moderation:copyright:').catch(() => []);
    const claims = (items as any[]).filter(c => c && c.id && c.claimant);
    return c.json({ claims: claims.sort((a: any, b: any) => new Date(b.dateFiled).getTime() - new Date(a.dateFiled).getTime()) });
  } catch (error) {
    return c.json({ error: `Failed to fetch copyright claims: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/moderation/copyright', verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const body = await c.req.json();
    if (!body.claimant || !body.releaseId) return c.json({ error: 'claimant and releaseId are required' }, 400);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const claim: any = { id, ...body, dateFiled: body.dateFiled || now, status: 'pending', createdAt: now };
    await kv.set(`moderation:copyright:${id}`, claim);
    await adminService.logAdminAction(adminUserId, 'create', 'moderation:copyright', id, claim);
    return c.json({ claim });
  } catch (error) {
    return c.json({ error: `Failed to create copyright claim: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/moderation/copyright/:id', verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const id = c.req.param('id');
    const body = await c.req.json();
    const claim = await kv.get<any>(`moderation:copyright:${id}`);
    if (!claim) return c.json({ error: 'Claim not found' }, 404);
    const now = new Date().toISOString();
    const updated = { ...claim, ...body, updatedAt: now, resolvedBy: adminUserId, resolvedAt: body.status && body.status !== 'pending' ? now : claim.resolvedAt };
    await kv.set(`moderation:copyright:${id}`, updated);
    if (body.action === 'approve' && claim.releaseId) {
      await metadataService.updateReleaseMetadata(claim.releaseId, { status: 'rejected' }).catch(() => {});
    }
    await adminService.logAdminAction(adminUserId, body.action || 'update', 'moderation:copyright', id, body);
    return c.json({ claim: updated });
  } catch (error) {
    return c.json({ error: `Failed to update copyright claim: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

// ── Duplicate Detection ───────────────────────────────────────────────────────
app.get('/make-server-79198001/admin/moderation/duplicates', verifyAuth, verifyAdmin, requirePermission('releases.view'), async (c) => {
  try {
    const releases = await getAllReleasesFull();
    // Fetch any admin decisions stored
    const storedEntries = await kv.getEntriesByPrefix('moderation:duplicate:').catch(() => []);
    const decisions = new Map<string, any>();
    for (const e of storedEntries as any[]) {
      if (e.value && e.value.id) decisions.set(e.value.id, e.value);
    }

    const duplicates: any[] = [];
    for (let i = 0; i < releases.length; i++) {
      for (let j = i + 1; j < releases.length; j++) {
        const r1 = releases[i], r2 = releases[j];
        // Skip if same user
        if (r1.userId === r2.userId) continue;
        let confidence = 0;
        let source = 'title_match';
        // ISRC match on tracks
        const tracks1 = await metadataService.getReleaseTracks(r1.id).catch(() => []);
        const tracks2 = await metadataService.getReleaseTracks(r2.id).catch(() => []);
        const isrcs1 = new Set(tracks1.map((t: any) => t.isrc).filter(Boolean));
        const isrcs2 = tracks2.map((t: any) => t.isrc).filter(Boolean);
        const isrcMatch = isrcs2.some((isrc: string) => isrcs1.has(isrc));
        if (isrcMatch) { confidence = 99; source = 'isrc_match'; }
        else {
          confidence = titleSimilarity(r1.title, r2.title);
          if (r1.primaryArtist && r2.primaryArtist) {
            const artistSim = titleSimilarity(r1.primaryArtist, r2.primaryArtist);
            confidence = Math.round((confidence + artistSim) / 2);
          }
        }
        if (confidence >= 75) {
          const pairId = [r1.id, r2.id].sort().join(':');
          const stored = decisions.get(pairId);
          duplicates.push({
            id: pairId,
            releaseId: r1.id,
            releaseTitle: r1.title,
            artistName: r1.primaryArtist,
            similarReleaseId: r2.id,
            similarReleaseTitle: r2.title,
            similarArtistName: r2.primaryArtist,
            confidenceScore: confidence,
            source,
            status: stored?.status || 'pending',
            adminDecision: stored?.adminDecision,
            decidedBy: stored?.decidedBy,
            decidedAt: stored?.decidedAt,
            createdAt: r1.createdAt,
          });
        }
      }
    }
    return c.json({ duplicates: duplicates.sort((a: any, b: any) => b.confidenceScore - a.confidenceScore) });
  } catch (error) {
    return c.json({ error: `Failed to detect duplicates: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/moderation/duplicates/:id', verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const id = c.req.param('id');
    const body = await c.req.json(); // { action: 'confirm_duplicate' | 'clear', notes? }
    const now = new Date().toISOString();
    const record: any = { id, status: body.action === 'confirm_duplicate' ? 'confirmed_duplicate' : 'cleared', adminDecision: body.notes || body.action, decidedBy: adminUserId, decidedAt: now };
    await kv.set(`moderation:duplicate:${id}`, record);
    if (body.action === 'confirm_duplicate') {
      const [releaseId] = id.split(':');
      await metadataService.updateReleaseMetadata(releaseId, { status: 'rejected' }).catch(() => {});
    }
    await adminService.logAdminAction(adminUserId, body.action, 'moderation:duplicate', id, body);
    return c.json({ record });
  } catch (error) {
    return c.json({ error: `Failed to process duplicate decision: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

// ── Explicit Content Review ───────────────────────────────────────────────────
app.get('/make-server-79198001/admin/moderation/explicit', verifyAuth, verifyAdmin, requirePermission('releases.view'), async (c) => {
  try {
    const releases = await getAllReleasesFull();
    const tracks = await getAllTracksFull(releases);
    // Load stored review decisions
    const storedEntries = await kv.getEntriesByPrefix('moderation:explicit:').catch(() => []);
    const decisions = new Map<string, any>();
    for (const e of storedEntries as any[]) {
      if (e.value && e.value.id) decisions.set(e.value.id, e.value);
    }
    const items: any[] = [];
    for (const t of tracks) {
      // Flag tracks marked explicit OR tracks with suspicious keywords in title
      const suspiciousTitle = /fuck|shit|bitch|nigga|sex|explicit|nsfw/i.test(t.title || '');
      if (!t.explicit && !suspiciousTitle) continue;
      const stored = decisions.get(t.id);
      if (stored?.status === 'confirmed' || stored?.status === 'flag_removed') {
        items.push({ ...t, ...stored, trackId: t.id });
        continue;
      }
      items.push({
        id: t.id,
        trackId: t.id,
        releaseId: t.releaseId,
        releaseTitle: t.releaseTitle,
        trackTitle: t.title,
        artistName: t.artistName,
        audioUrl: t.audioFileUrl,
        artworkUrl: releases.find((r: any) => r.id === t.releaseId)?.artworkUrl,
        explicitFlaggedBySystem: suspiciousTitle && !t.explicit,
        explicitSetByArtist: t.explicit,
        status: stored?.status || 'pending_review',
        reviewedBy: stored?.reviewedBy,
        reviewedAt: stored?.reviewedAt,
        notes: stored?.notes,
        createdAt: t.createdAt,
      });
    }
    return c.json({ items: items.sort((a: any, b: any) => {
      if (a.status === 'pending_review' && b.status !== 'pending_review') return -1;
      if (a.status !== 'pending_review' && b.status === 'pending_review') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })});
  } catch (error) {
    return c.json({ error: `Failed to fetch explicit content: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/moderation/explicit/:id', verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const id = c.req.param('id');
    const body = await c.req.json(); // { action: 'confirm' | 'remove_flag' | 'require_update', notes? }
    const now = new Date().toISOString();
    const statusMap: Record<string, string> = { confirm: 'confirmed', remove_flag: 'flag_removed', require_update: 'label_update_required' };
    const record: any = { id, status: statusMap[body.action] || body.action, reviewedBy: adminUserId, reviewedAt: now, notes: body.notes };
    await kv.set(`moderation:explicit:${id}`, record);
    if (body.action === 'remove_flag') {
      await metadataService.updateTrackMetadata(id, { explicit: false }).catch(() => {});
    } else if (body.action === 'confirm') {
      await metadataService.updateTrackMetadata(id, { explicit: true }).catch(() => {});
    }
    await adminService.logAdminAction(adminUserId, body.action, 'moderation:explicit', id, body);
    return c.json({ record });
  } catch (error) {
    return c.json({ error: `Failed to review explicit content: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

// ── Metadata Compliance ───────────────────────────────────────────────────────
app.get('/make-server-79198001/admin/moderation/metadata', verifyAuth, verifyAdmin, requirePermission('releases.view'), async (c) => {
  try {
    const releases = await getAllReleasesFull();
    // Load stored decisions
    const storedEntries = await kv.getEntriesByPrefix('moderation:metadata:').catch(() => []);
    const decisions = new Map<string, any>();
    for (const e of storedEntries as any[]) {
      if (e.value && e.value.releaseId) decisions.set(e.value.releaseId, e.value);
    }
    const alerts: any[] = [];
    for (const r of releases) {
      const tracks = await metadataService.getReleaseTracks(r.id).catch(() => []);
      const missing: string[] = [];
      const errors: string[] = [];
      if (!r.upc && !r.upcRequested) missing.push('UPC');
      if (!r.copyrightText) missing.push('Copyright Text');
      if (!r.publishingRights) missing.push('Publishing Rights');
      if (!r.genre) missing.push('Genre');
      if (!r.language) missing.push('Language');
      if (tracks.length === 0) errors.push('No tracks attached');
      for (const t of tracks) {
        if (!t.isrc && !t.isrcRequested) missing.push(`Track "${t.title}" — ISRC missing`);
        if (!t.contributors || t.contributors.length === 0) errors.push(`Track "${t.title}" — no contributors`);
        if (!t.audioFileUrl && !t.audioFilePath) errors.push(`Track "${t.title}" — no audio file`);
      }
      if (missing.length === 0 && errors.length === 0) continue;
      const stored = decisions.get(r.id);
      const user = await kv.get<any>(`user:${r.userId}`).catch(() => null);
      alerts.push({
        id: r.id,
        releaseId: r.id,
        releaseTitle: r.title,
        artistName: r.primaryArtist || user?.artistName || r.userId,
        releaseStatus: r.status,
        missingFields: missing,
        validationErrors: errors,
        totalIssues: missing.length + errors.length,
        status: stored?.status || (r.status === 'rejected' ? 'pending' : 'pending'),
        resolvedBy: stored?.resolvedBy,
        resolvedAt: stored?.resolvedAt,
        requestedAt: stored?.requestedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      });
    }
    return c.json({ alerts: alerts.sort((a: any, b: any) => b.totalIssues - a.totalIssues) });
  } catch (error) {
    return c.json({ error: `Failed to fetch metadata alerts: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/moderation/metadata/:releaseId', verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const releaseId = c.req.param('releaseId');
    const body = await c.req.json(); // { action: 'mark_compliant' | 'request_fix', notes? }
    const now = new Date().toISOString();
    const statusMap: Record<string, string> = { mark_compliant: 'compliant', request_fix: 'fix_requested' };
    const record: any = { releaseId, status: statusMap[body.action] || body.action, resolvedBy: adminUserId, resolvedAt: body.action === 'mark_compliant' ? now : undefined, requestedAt: body.action === 'request_fix' ? now : undefined, notes: body.notes };
    await kv.set(`moderation:metadata:${releaseId}`, record);
    await adminService.logAdminAction(adminUserId, body.action, 'moderation:metadata', releaseId, body);
    return c.json({ record });
  } catch (error) {
    return c.json({ error: `Failed to update metadata compliance: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

// ── Moderation Audit Log ──────────────────────────────────────────────────────
app.get('/make-server-79198001/admin/moderation/audit', verifyAuth, verifyAdmin, requirePermission('releases.view'), async (c) => {
  try {
    const entries = await kv.getEntriesByPrefix('audit:resource:moderation:').catch(() => []);
    const logIds = (entries as any[]).map(e => e.value).filter(v => typeof v === 'string');
    const logs: any[] = [];
    for (const logId of logIds.slice(0, 200)) {
      const log = await kv.get<any>(`audit:${logId}`).catch(() => null);
      if (log) logs.push(log);
    }
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return c.json({ logs });
  } catch (error) {
    return c.json({ error: `Failed to fetch audit logs: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});

// ── Compliance Report ─────────────────────────────────────────────────────────
app.get('/make-server-79198001/admin/moderation/report', verifyAuth, verifyAdmin, requirePermission('releases.view'), async (c) => {
  try {
    const month = (c.req.query('month') || new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [flags, claims, dupeEntries, auditEntries] = await Promise.all([
      kv.getByPrefix('moderation:flag:').catch(() => []),
      kv.getByPrefix('moderation:copyright:').catch(() => []),
      kv.getEntriesByPrefix('moderation:duplicate:').catch(() => []),
      kv.getEntriesByPrefix('audit:resource:moderation:').catch(() => []),
    ]);
    const inMonth = (d: string) => d && d.startsWith(month);
    const flagList = (flags as any[]).filter(f => f && f.id);
    const claimList = (claims as any[]).filter(c => c && c.id);
    const dupeList = (dupeEntries as any[]).map(e => e.value).filter(v => v && v.id);

    // Fetch audit log details for the month
    const logIds = (auditEntries as any[]).map(e => e.value).filter(v => typeof v === 'string');
    const auditLogs: any[] = [];
    for (const logId of logIds.slice(0, 500)) {
      const log = await kv.get<any>(`audit:${logId}`).catch(() => null);
      if (log && inMonth(log.timestamp)) auditLogs.push(log);
    }

    return c.json({
      month,
      summary: {
        totalFlags: flagList.length,
        flagsThisMonth: flagList.filter((f: any) => inMonth(f.flaggedAt)).length,
        flagsByStatus: Object.fromEntries(['pending','resolved','taken_down','cleared','escalated'].map(s => [s, flagList.filter((f: any) => f.status === s).length])),
        flagsBySeverity: Object.fromEntries(['critical','high','low'].map(s => [s, flagList.filter((f: any) => f.severity === s).length])),
        takedownsThisMonth: flagList.filter((f: any) => inMonth(f.flaggedAt) && f.status === 'taken_down').length,
        copyrightClaims: claimList.length,
        claimsThisMonth: claimList.filter((c: any) => inMonth(c.dateFiled)).length,
        claimsByStatus: Object.fromEntries(['pending','approved','disputed','escalated','resolved'].map(s => [s, claimList.filter((c: any) => c.status === s).length])),
        duplicatesConfirmed: dupeList.filter((d: any) => d.status === 'confirmed_duplicate').length,
        duplicatesCleared: dupeList.filter((d: any) => d.status === 'cleared').length,
        moderationActions: auditLogs.length,
        actionBreakdown: auditLogs.reduce((acc: Record<string, number>, log: any) => { acc[log.action] = (acc[log.action] || 0) + 1; return acc; }, {}),
      },
      recentActions: auditLogs.slice(0, 20),
    });
  } catch (error) {
    return c.json({ error: `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown'}` }, 500);
  }
});


app.put('/make-server-79198001/admin/promotions/:campaignId', verifyAuth, verifyAdmin, async (c) => {
  try {
    const campaignId = c.req.param('campaignId');
    const body = await c.req.json();

    if (body.approve === true) {
      const campaign = await promotionService.approvePromotionCampaign(
        campaignId,
        typeof body.adminNotes === 'string' ? body.adminNotes : undefined,
      );
      return c.json({ campaign });
    }

    const campaign = await promotionService.updatePromotionCampaign(campaignId, {
      adminNotes: typeof body.adminNotes === 'string' ? body.adminNotes : undefined,
      status: body.status,
    });

    return c.json({ campaign });
  } catch (error) {
    console.error('Error updating promotion campaign:', error);
    return c.json({ error: `Failed to update promotion campaign: ${error.message}` }, 500);
  }
});

app.post('/make-server-79198001/admin/promotions/:campaignId/assets/:assetId/upload-target', verifyAuth, verifyAdmin, async (c) => {
  try {
    const campaignId = c.req.param('campaignId');
    const assetId = c.req.param('assetId');
    const body = await c.req.json();

    if (!body.fileName || typeof body.fileName !== 'string') {
      return c.json({ error: 'A file name is required' }, 400);
    }

    if (!body.mimeType || typeof body.mimeType !== 'string' || !PROMOTION_UPLOAD_MIME_TYPES.includes(body.mimeType)) {
      return c.json({ error: 'Unsupported promotion asset format' }, 400);
    }

    const target = await promotionService.createPromotionAssetUploadTarget(campaignId, assetId, body.fileName);
    return c.json({ target });
  } catch (error) {
    console.error('Error creating promotion asset upload target:', error);
    return c.json({ error: `Failed to create upload target: ${error.message}` }, 500);
  }
});

app.post('/make-server-79198001/admin/promotions/:campaignId/assets/:assetId/finalize', verifyAuth, verifyAdmin, async (c) => {
  try {
    const campaignId = c.req.param('campaignId');
    const assetId = c.req.param('assetId');
    const body = await c.req.json();

    if (!body.path || typeof body.path !== 'string') {
      return c.json({ error: 'A storage path is required' }, 400);
    }

    const campaign = await promotionService.finalizePromotionAssetUpload(campaignId, assetId, body.path, body.ready !== false);
    return c.json({ campaign });
  } catch (error) {
    console.error('Error finalizing promotion asset upload:', error);
    return c.json({ error: `Failed to finalize upload: ${error.message}` }, 500);
  }
});

app.get("/make-server-79198001/admin/payout-requests", verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const requests = await paystackService.getAllPayoutRequests();
    return c.json({ requests });
  } catch (error) {
    console.error('Error fetching payout requests:', error);
    return c.json({ error: `Failed to fetch payout requests: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.put("/make-server-79198001/admin/payout-requests/:reference", verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const reference = c.req.param('reference');
    const body = await c.req.json();

    if (body.status !== 'completed' && body.status !== 'failed') {
      return c.json({ error: 'Valid payout status is required' }, 400);
    }

    const request = await paystackService.updatePayoutRequest(reference, body.status);

    await adminService.logAdminAction(
      adminUserId,
      'update',
      'payout-request',
      reference,
      { status: body.status },
    );

    sendNotification({
      userId: request.userId,
      title: body.status === 'completed' ? 'Payout completed' : 'Payout request update',
      body: body.status === 'completed'
        ? `Your payout request ${reference} has been approved and completed.`
        : `Your payout request ${reference} was not approved. Please review your payout details and try again.`,
      type: body.status === 'completed' ? 'earnings' : 'alert',
      link: '/dashboard/earnings',
      sendEmail: body.status === 'completed',
      emailSubject: body.status === 'completed' ? 'Payout completed' : 'Payout request update',
    }).catch(() => {});

    await syncFinanceAutomation(String(adminUserId || 'system'));

    return c.json({ request });
  } catch (error) {
    console.error('Error updating payout request:', error);
    return c.json({ error: `Failed to update payout request: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get("/make-server-79198001/admin/payments", verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const payments = await paystackService.getAllAdminPayments();
    return c.json({ payments });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return c.json({ error: `Failed to fetch payments: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.put("/make-server-79198001/admin/payments/:reference/reconcile", verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const reference = c.req.param('reference');
    const payment = await paystackService.reconcileAdminPayment(reference);

    await adminService.logAdminAction(
      adminUserId,
      'update',
      'payment',
      reference,
      {
        action: 'reconcile',
        status: payment.status,
        gatewayStatus: payment.gatewayStatus,
      },
    );

    await syncFinanceAutomation(String(adminUserId || 'system'));

    return c.json({ payment });
  } catch (error) {
    console.error('Error reconciling payment:', error);
    return c.json({ error: `Failed to reconcile payment: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get("/make-server-79198001/admin/billing/history", verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const billingHistory = await paystackService.getAllBillingHistory();
    return c.json({ billingHistory });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    return c.json({ error: `Failed to fetch billing history: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Get all users (admin only)
app.get("/make-server-79198001/admin/all-users", verifyAuth, verifyAdmin, requirePermission('users.view'), async (c) => {
  try {
    const users = await userService.getAllUsers();
    return c.json({ users });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return c.json({ error: `Failed to fetch users: ${error.message}` }, 500);
  }
});

// Update any user (admin only)
app.put("/make-server-79198001/admin/users/:userId", verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const targetUserId = c.req.param('userId');
    const body = await c.req.json();

    const user = await userService.getUserById(targetUserId) || await userService.getUserByUserId(targetUserId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const updatedUser = await userService.updateUser(user.id, body);

    // Sync Supabase Auth metadata so the role change is reflected on next login
    if (updatedUser) {
      await syncAuthUserMetadata(user.userId, {
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        artistName: updatedUser.role === 'artist' ? updatedUser.artistName : undefined,
        labelName: updatedUser.role === 'partner' ? updatedUser.labelName : undefined,
        role: updatedUser.role,
        subscriptionTier: updatedUser.subscriptionTier,
      });
    }

    await adminService.logAdminAction(
      adminUserId,
      'update',
      'user',
      user.id,
      { changes: body }
    );

    return c.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: `Failed to update user: ${error.message}` }, 500);
  }
});

// Delete any user (admin only)
app.delete("/make-server-79198001/admin/users/:userId", verifyAuth, verifyAdmin, requirePermission('users.delete'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const targetUserId = c.req.param('userId');

    const user = await userService.getUserById(targetUserId) || await userService.getUserByUserId(targetUserId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Delete user releases and tracks first
    const releases = await metadataService.getUserReleases(user.userId);
    for (const release of releases) {
      await kv.del(`release:${release.id}`);
    }

    await userService.deleteUser(user.id);

    if (user.userId) {
      await supabase.auth.admin.deleteUser(user.userId).catch((authDeleteError) => {
        console.error('Error deleting auth user:', authDeleteError);
      });
    }

    await adminService.logAdminAction(
      adminUserId,
      'delete',
      'user',
      user.id,
      { user }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: `Failed to delete user: ${error.message}` }, 500);
  }
});

// Update royalties (admin only)
app.put("/make-server-79198001/admin/royalties/:earningId", verifyAuth, verifyAdmin, requirePermission('royalties.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const earningId = c.req.param('earningId');
    const body = await c.req.json();

    const earning = await kv.get(`earning:${earningId}`);
    if (!earning) {
      return c.json({ error: 'Earning not found' }, 404);
    }

    const updatedEarning = { ...earning, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`earning:${earningId}`, updatedEarning);

    await adminService.logAdminAction(
      adminUserId,
      'update',
      'earning',
      earningId,
      { changes: body }
    );

    return c.json({ earning: updatedEarning });
  } catch (error) {
    console.error('Error updating royalties:', error);
    return c.json({ error: `Failed to update royalties: ${error.message}` }, 500);
  }
});

// Approve earnings (admin only)
app.post("/make-server-79198001/admin/royalties/approve", verifyAuth, verifyAdmin, requirePermission('royalties.approve'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const body = await c.req.json();

    await royaltyService.approveEarnings(body.earningIds);

    await adminService.logAdminAction(
      adminUserId,
      'approve',
      'earnings',
      'batch',
      { earningIds: body.earningIds }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Error approving earnings:', error);
    return c.json({ error: `Failed to approve earnings: ${error.message}` }, 500);
  }
});

// Get all releases (admin only)
app.get("/make-server-79198001/admin/releases", verifyAuth, verifyAdmin, requirePermission('releases.view'), async (c) => {
  try {
    const releaseKeys = await kv.getEntriesByPrefix('release:user:');
    const releases = [];

    for (const key of releaseKeys) {
      const releaseId = key?.key?.split(':').pop();
      if (releaseId && key?.key?.includes(':')) {
        const release = await metadataService.getReleaseById(releaseId);
        if (release) {
          releases.push(release);
        }
      }
    }

    return c.json({ releases });
  } catch (error) {
    console.error('Error fetching releases:', error);
    return c.json({ error: `Failed to fetch releases: ${error.message}` }, 500);
  }
});

app.get("/make-server-79198001/admin/releases/:releaseId", verifyAuth, verifyAdmin, requirePermission('releases.view'), async (c) => {
  try {
    const releaseId = c.req.param('releaseId');

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    const tracks = await metadataService.getReleaseTracks(releaseId);
    return c.json({ release, tracks });
  } catch (error) {
    console.error('Error fetching admin release details:', error);
    return c.json({ error: `Failed to fetch release details: ${error.message}` }, 500);
  }
});

// Update any release (admin only)
app.put("/make-server-79198001/admin/releases/:releaseId", verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const releaseId = c.req.param('releaseId');
    const body = await c.req.json();

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    const previousStatus = release.status;

    const updatedRelease = await metadataService.updateReleaseMetadata(releaseId, body);

    if (updatedRelease?.status === 'live' && updatedRelease.type === 'single') {
      await blogService.ensureReleaseUpdatePost(updatedRelease);
    }

    await adminService.logAdminAction(
      adminUserId,
      'update',
      'release',
      releaseId,
      { changes: body }
    );

    if (updatedRelease && updatedRelease.status !== previousStatus) {
      const nextStatus = updatedRelease.status;
      if (nextStatus === 'live') {
        sendNotification({
          userId: updatedRelease.userId,
          title: 'Release approved and live',
          body: `"${updatedRelease.title}" has been approved by admin and is now live.`,
          type: 'release',
          link: '/dashboard/releases',
          sendEmail: true,
          emailSubject: `Release approved: ${updatedRelease.title}`,
        }).catch(() => {});
      } else if (nextStatus === 'rejected') {
        sendNotification({
          userId: updatedRelease.userId,
          title: 'Release update required',
          body: `"${updatedRelease.title}" needs updates before it can be approved. Please review and resubmit.`,
          type: 'alert',
          link: '/dashboard/releases',
          sendEmail: true,
          emailSubject: `Release needs changes: ${updatedRelease.title}`,
        }).catch(() => {});
      }
    }

    return c.json({ release: updatedRelease });
  } catch (error) {
    console.error('Error updating release:', error);
    return c.json({ error: `Failed to update release: ${error.message}` }, 500);
  }
});

app.get('/make-server-79198001/admin/blog/posts', verifyAuth, verifyAdmin, async (c) => {
  try {
    const posts = await blogService.getAllBlogPosts();
    return c.json({ posts });
  } catch (error) {
    console.error('Error loading admin blog posts:', error);
    return c.json({ error: `Failed to load admin blog posts: ${error.message}` }, 500);
  }
});

app.post('/make-server-79198001/admin/blog/posts', verifyAuth, verifyAdmin, async (c) => {
  try {
    const adminUserId = c.get('userId');
    const adminUser = await adminService.getAdminByUserId(adminUserId);
    const body = await c.req.json();

    if (!body.title || !body.excerpt) {
      return c.json({ error: 'Title and excerpt are required' }, 400);
    }

    const post = await blogService.createBlogPost({
      title: body.title,
      excerpt: body.excerpt,
      content: body.content,
      image: body.image,
      category: body.category,
      author: body.author || adminUser?.role || 'AMT DISTRO Admin',
      date: body.date,
      published: body.published !== false,
      source: 'manual',
    });

    await adminService.logAdminAction(adminUserId, 'create', 'blog-post', post.id, post);
    return c.json({ post });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return c.json({ error: `Failed to create blog post: ${error.message}` }, 500);
  }
});

app.put('/make-server-79198001/admin/blog/posts/:postId', verifyAuth, verifyAdmin, async (c) => {
  try {
    const adminUserId = c.get('userId');
    const postId = c.req.param('postId');
    const body = await c.req.json();
    const post = await blogService.updateBlogPost(postId, body);

    if (!post) {
      return c.json({ error: 'Blog post not found' }, 404);
    }

    await adminService.logAdminAction(adminUserId, 'update', 'blog-post', postId, body);
    return c.json({ post });
  } catch (error) {
    console.error('Error updating blog post:', error);
    return c.json({ error: `Failed to update blog post: ${error.message}` }, 500);
  }
});

app.delete('/make-server-79198001/admin/blog/posts/:postId', verifyAuth, verifyAdmin, async (c) => {
  try {
    const adminUserId = c.get('userId');
    const postId = c.req.param('postId');
    await blogService.deleteBlogPost(postId);
    await adminService.logAdminAction(adminUserId, 'delete', 'blog-post', postId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return c.json({ error: `Failed to delete blog post: ${error.message}` }, 500);
  }
});

app.delete("/make-server-79198001/admin/releases/:releaseId", verifyAuth, verifyAdmin, requirePermission('releases.delete'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const releaseId = c.req.param('releaseId');

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    const tracks = await metadataService.getReleaseTracks(releaseId);
    for (const track of tracks) {
      await metadataService.deleteTrackMetadata(track.id);
    }

    await kv.del(`release:${releaseId}`);
    await kv.del(`release:user:${release.userId}:${releaseId}`);

    await adminService.logAdminAction(
      adminUserId,
      'delete',
      'release',
      releaseId,
      { release, trackCount: tracks.length }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting release:', error);
    return c.json({ error: `Failed to delete release: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post("/make-server-79198001/admin/releases/:releaseId/tracks", verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const releaseId = c.req.param('releaseId');
    const body = await c.req.json();

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    const track = await metadataService.createTrackMetadata({
      releaseId,
      ...body,
    });

    await metadataService.updateReleaseMetadata(releaseId, {
      trackIds: [...release.trackIds, track.id],
      status: 'draft',
      validationErrors: undefined,
    });

    await adminService.logAdminAction(
      adminUserId,
      'create',
      'track',
      track.id,
      { releaseId, title: track.title }
    );

    return c.json({ track });
  } catch (error) {
    console.error('Error creating admin track:', error);
    return c.json({ error: `Failed to create track: ${error.message}` }, 500);
  }
});

app.post("/make-server-79198001/admin/releases/:releaseId/upc", verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const releaseId = c.req.param('releaseId');
    const body = await c.req.json().catch(() => ({}));

    const release = await metadataService.getReleaseById(releaseId);
    if (!release) {
      return c.json({ error: 'Release not found' }, 404);
    }

    const requestedUPC = typeof body.upc === 'string' ? body.upc.trim() : '';
    const upc = requestedUPC
      ? await isrcService.setUPCForRelease(releaseId, requestedUPC)
      : await isrcService.assignUPCToRelease(releaseId);
    const updatedRelease = await metadataService.updateReleaseMetadata(releaseId, { upc, upcRequested: false });

    await adminService.logAdminAction(adminUserId, 'assign', 'release-upc', releaseId, { upc });

    return c.json({ release: updatedRelease, upc });
  } catch (error) {
    console.error('Error assigning admin UPC:', error);
    return c.json({ error: `Failed to assign UPC: ${error.message}` }, 500);
  }
});

app.post("/make-server-79198001/admin/tracks/:trackId/isrc", verifyAuth, verifyAdmin, requirePermission('releases.edit'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const trackId = c.req.param('trackId');
    const body = await c.req.json().catch(() => ({}));

    const track = await metadataService.getTrackById(trackId);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }

    const requestedISRC = typeof body.isrc === 'string' ? body.isrc.trim() : '';
    const isrc = requestedISRC
      ? await isrcService.setISRCForTrack(trackId, requestedISRC)
      : await isrcService.assignISRCToTrack(trackId);
    const updatedTrack = await metadataService.updateTrackMetadata(trackId, { isrc, isrcRequested: false });

    await adminService.logAdminAction(adminUserId, 'assign', 'track-isrc', trackId, { isrc });

    return c.json({ track: updatedTrack, isrc });
  } catch (error) {
    console.error('Error assigning admin ISRC:', error);
    return c.json({ error: `Failed to assign ISRC: ${error.message}` }, 500);
  }
});

// Resolve fraud alert (admin only)
app.put("/make-server-79198001/admin/fraud/:alertId/resolve", verifyAuth, verifyAdmin, requirePermission('fraud.resolve'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const alertId = c.req.param('alertId');
    const body = await c.req.json();

    const alert = await fraudService.resolveAlert(
      alertId,
      body.status,
      adminUserId,
      body.notes
    );

    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    return c.json({ alert });
  } catch (error) {
    console.error('Error resolving fraud alert:', error);
    return c.json({ error: `Failed to resolve alert: ${error.message}` }, 500);
  }
});

// Get all fraud alerts (admin only)
app.get("/make-server-79198001/admin/fraud/alerts", verifyAuth, verifyAdmin, requirePermission('fraud.view'), async (c) => {
  try {
    const alertKeys = await kv.getByPrefix('fraud:alert:');
    const alerts = [];

    for (const key of alertKeys) {
      if (!key.key.includes('user:') && !key.key.includes('track:')) {
        const alert = key.value;
        if (alert) {
          alerts.push(alert);
        }
      }
    }

    return c.json({ alerts });
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    return c.json({ error: `Failed to fetch alerts: ${error.message}` }, 500);
  }
});

// ─── Coupon Management ────────────────────────────────────────────────────────

// GET /admin/coupons — list all coupons
app.get("/make-server-79198001/admin/coupons", verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const coupons = (data ?? []).map(mapCoupon);
    return c.json({ coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return c.json({ error: `Failed to fetch coupons: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// POST /admin/coupons — create a coupon
app.post("/make-server-79198001/admin/coupons", verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const adminPayload = c.get('adminPayload' as any) as any;
    const body = await c.req.json();
    const { code, description, discountPercent, scopes, maxUses, expiresAt, status } = body;

    if (!code || typeof code !== 'string') return c.json({ error: 'Coupon code is required' }, 400);
    if (!discountPercent || discountPercent < 1 || discountPercent > 100) return c.json({ error: 'discountPercent must be 1–100' }, 400);
    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) return c.json({ error: 'At least one scope is required' }, 400);

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: code.trim().toUpperCase(),
        description: description || null,
        discount_percent: Number(discountPercent),
        scopes,
        max_uses: maxUses ? Number(maxUses) : null,
        used_count: 0,
        expires_at: expiresAt || null,
        status: status || 'active',
        created_by: adminPayload?.adminId || adminPayload?.sub || 'admin',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return c.json({ error: 'A coupon with this code already exists' }, 409);
      throw error;
    }
    return c.json({ coupon: mapCoupon(data) }, 201);
  } catch (error) {
    console.error('Error creating coupon:', error);
    return c.json({ error: `Failed to create coupon: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// PUT /admin/coupons/:id — update a coupon
app.put("/make-server-79198001/admin/coupons/:id", verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const updates: Record<string, any> = {};
    if (body.description !== undefined) updates.description = body.description;
    if (body.discountPercent !== undefined) updates.discount_percent = Number(body.discountPercent);
    if (body.scopes !== undefined) updates.scopes = body.scopes;
    if (body.maxUses !== undefined) updates.max_uses = body.maxUses ? Number(body.maxUses) : null;
    if (body.expiresAt !== undefined) updates.expires_at = body.expiresAt || null;
    if (body.status !== undefined) updates.status = body.status;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return c.json({ coupon: mapCoupon(data) });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return c.json({ error: `Failed to update coupon: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// DELETE /admin/coupons/:id — delete a coupon
app.delete("/make-server-79198001/admin/coupons/:id", verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return c.json({ error: `Failed to delete coupon: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// GET /admin/coupons/:id/usages — list usage records for a specific coupon
app.get("/make-server-79198001/admin/coupons/:id/usages", verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from('coupon_usages')
      .select('*')
      .eq('coupon_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const usages = (data ?? []).map((r: any) => ({
      id: r.id,
      couponId: r.coupon_id,
      couponCode: r.coupon_code,
      userId: r.user_id,
      userEmail: r.user_email,
      userName: r.user_name ?? null,
      scope: r.scope,
      plan: r.plan,
      amountBefore: r.amount_before,
      amountAfter: r.amount_after,
      discountAmount: r.discount_amount,
      discountPercent: r.discount_percent,
      paymentReference: r.payment_reference ?? null,
      createdAt: r.created_at,
    }));
    return c.json({ usages });
  } catch (error) {
    console.error('Error fetching coupon usages:', error);
    return c.json({ error: `Failed to fetch usages: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// POST /payments/coupons/validate — validate a coupon code (user-facing)
app.post("/make-server-79198001/payments/coupons/validate", verifyAuth, async (c) => {
  try {
    const body = await c.req.json();
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const scope = typeof body.scope === 'string' ? body.scope : 'all';

    if (!code) return c.json({ valid: false, error: 'No coupon code provided' });

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('status', 'active')
      .single();

    if (error || !data) return c.json({ valid: false, error: 'Invalid or expired coupon code' });

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return c.json({ valid: false, error: 'This coupon has expired' });
    }
    // Check max uses
    if (data.max_uses !== null && data.used_count >= data.max_uses) {
      return c.json({ valid: false, error: 'This coupon has reached its maximum uses' });
    }
    // Check scope
    const couponScopes: string[] = data.scopes ?? [];
    if (!couponScopes.includes('all') && !couponScopes.includes(scope)) {
      return c.json({ valid: false, error: `This coupon is not valid for ${scope} payments` });
    }

    return c.json({
      valid: true,
      code: data.code,
      discountPercent: data.discount_percent,
      description: data.description || `${data.discount_percent}% discount applied`,
      scopes: couponScopes,
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return c.json({ valid: false, error: 'Could not validate coupon' });
  }
});

// ==================== PAYMENT DISPUTES ====================

// Helper to map dispute DB row → frontend shape
function mapDispute(r: any) {
  return {
    id: r.id,
    userId: r.user_id,
    userEmail: r.user_email,
    userName: r.user_name ?? null,
    transactionReference: r.transaction_reference,
    transactionAmount: r.transaction_amount,
    transactionDate: r.transaction_date ?? null,
    disputeType: r.dispute_type,
    description: r.description,
    bankStatementNote: r.bank_statement_note ?? null,
    contactPhone: r.contact_phone ?? null,
    status: r.status,
    adminNotes: r.admin_notes ?? null,
    resolvedBy: r.resolved_by ?? null,
    resolution: r.resolution ?? null,
    resolvedAt: r.resolved_at ?? null,
    priority: r.priority,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapDisputeUpdate(r: any) {
  return {
    id: r.id,
    disputeId: r.dispute_id,
    actorType: r.actor_type,
    actorLabel: r.actor_label ?? null,
    eventType: r.event_type,
    description: r.description,
    createdAt: r.created_at,
  };
}

async function insertTimelineEvent(disputeId: string, actorType: string, actorLabel: string | null, eventType: string, description: string) {
  try {
    await supabase.from('dispute_updates').insert({ dispute_id: disputeId, actor_type: actorType, actor_label: actorLabel, event_type: eventType, description });
  } catch (_) { /* timeline failures are non-fatal */ }
}

// GET /payments/disputes/:id/timeline — user get own dispute activity (MUST be before plain /:id)
app.get("/make-server-79198001/payments/disputes/:id/timeline", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const id = c.req.param('id');
    // Verify ownership
    const { data: dispute } = await supabase.from('payment_disputes').select('id').eq('id', id).eq('user_id', userId).maybeSingle();
    if (!dispute) return c.json({ error: 'Dispute not found' }, 404);
    const { data, error } = await supabase.from('dispute_updates').select('*').eq('dispute_id', id).order('created_at', { ascending: true });
    if (error) throw error;
    return c.json({ timeline: (data ?? []).map(mapDisputeUpdate) });
  } catch (err) {
    return c.json({ error: 'Failed to fetch timeline' }, 500);
  }
});

// POST /payments/disputes — user submits a dispute
app.post("/make-server-79198001/payments/disputes", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const userEmail = c.get('userEmail') as string;
    const body = await c.req.json();
    const { transactionReference, transactionAmount, transactionDate, disputeType, description, bankStatementNote, contactPhone } = body;

    if (!transactionReference || !transactionAmount || !disputeType || !description) {
      return c.json({ error: 'transactionReference, transactionAmount, disputeType, and description are required' }, 400);
    }
    const VALID_TYPES = ['failed_debit', 'duplicate', 'wrong_amount', 'unauthorized', 'other'];
    if (!VALID_TYPES.includes(disputeType)) {
      return c.json({ error: 'Invalid dispute type' }, 400);
    }
    if (description.trim().length < 20) {
      return c.json({ error: 'Description must be at least 20 characters' }, 400);
    }

    // Check for duplicate open dispute on same reference
    const { data: existing } = await supabase
      .from('payment_disputes')
      .select('id, status')
      .eq('user_id', userId)
      .eq('transaction_reference', transactionReference)
      .in('status', ['open', 'under_review', 'escalated'])
      .maybeSingle();
    if (existing) {
      return c.json({ error: 'An open dispute already exists for this transaction. Please wait for resolution before filing another.' }, 409);
    }

    // Fetch profile name if available
    const { data: profile } = await supabase.from('profiles').select('first_name, last_name, artist_name').eq('id', userId).maybeSingle();
    const userName = profile
      ? (profile.artist_name ?? (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.first_name ?? null))
      : null;

    const { data, error } = await supabase
      .from('payment_disputes')
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        transaction_reference: transactionReference,
        transaction_amount: transactionAmount,
        transaction_date: transactionDate ?? null,
        dispute_type: disputeType,
        description: description.trim(),
        bank_statement_note: bankStatementNote?.trim() ?? null,
        contact_phone: contactPhone?.trim() ?? null,
        status: 'open',
        priority: 'medium',
      })
      .select()
      .single();
    if (error) throw error;
    // Record timeline: submitted
    await insertTimelineEvent(data.id, 'user', userEmail, 'submitted', `Dispute filed for transaction ${transactionReference} — ${disputeType.replace('_', ' ')}`);
    return c.json({ dispute: mapDispute(data) }, 201);
  } catch (err) {
    console.error('Error creating dispute:', err);
    return c.json({ error: `Failed to create dispute: ${err instanceof Error ? err.message : 'Unknown error'}` }, 500);
  }
});

// GET /payments/disputes — list user's own disputes
app.get("/make-server-79198001/payments/disputes", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { data, error } = await supabase
      .from('payment_disputes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return c.json({ disputes: (data ?? []).map(mapDispute) });
  } catch (err) {
    console.error('Error fetching disputes:', err);
    return c.json({ error: `Failed to fetch disputes: ${err instanceof Error ? err.message : 'Unknown error'}` }, 500);
  }
});

// GET /payments/disputes/:id — get single dispute (own)
app.get("/make-server-79198001/payments/disputes/:id", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from('payment_disputes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error || !data) return c.json({ error: 'Dispute not found' }, 404);
    return c.json({ dispute: mapDispute(data) });
  } catch (err) {
    return c.json({ error: 'Failed to fetch dispute' }, 500);
  }
});

// --- Admin dispute endpoints ---

// GET /admin/disputes/stats — summary counts by status (MUST be before /:id)
app.get("/make-server-79198001/admin/disputes/stats", verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const { data, error } = await supabase.from('payment_disputes').select('status, priority');
    if (error) throw error;
    const rows = data ?? [];
    const stats = {
      total: rows.length,
      open: rows.filter((r: any) => r.status === 'open').length,
      under_review: rows.filter((r: any) => r.status === 'under_review').length,
      resolved: rows.filter((r: any) => r.status === 'resolved').length,
      rejected: rows.filter((r: any) => r.status === 'rejected').length,
      escalated: rows.filter((r: any) => r.status === 'escalated').length,
      critical: rows.filter((r: any) => r.priority === 'critical').length,
    };
    return c.json({ stats });
  } catch (err) {
    return c.json({ error: 'Failed to fetch dispute stats' }, 500);
  }
});

// GET /admin/disputes
app.get("/make-server-79198001/admin/disputes", verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const search = c.req.query('search');
    let query = supabase.from('payment_disputes').select('*');
    if (status && status !== 'all') query = query.eq('status', status);
    if (priority && priority !== 'all') query = query.eq('priority', priority);
    if (search) {
      query = query.or(`transaction_reference.ilike.%${search}%,user_email.ilike.%${search}%,user_name.ilike.%${search}%`);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return c.json({ disputes: (data ?? []).map(mapDispute) });
  } catch (err) {
    console.error('Error fetching admin disputes:', err);
    return c.json({ error: 'Failed to fetch disputes' }, 500);
  }
});

// GET /admin/disputes/:id
app.get("/make-server-79198001/admin/disputes/:id", verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const id = c.req.param('id');
    const { data, error } = await supabase.from('payment_disputes').select('*').eq('id', id).single();
    if (error || !data) return c.json({ error: 'Dispute not found' }, 404);
    return c.json({ dispute: mapDispute(data) });
  } catch (err) {
    return c.json({ error: 'Failed to fetch dispute' }, 500);
  }
});

// PATCH /admin/disputes/:id — update status, notes, resolution, priority
app.patch("/make-server-79198001/admin/disputes/:id", verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const adminUserId = c.get('userId') as string;
    const id = c.req.param('id');
    const body = await c.req.json();
    const VALID_STATUSES = ['open', 'under_review', 'resolved', 'rejected', 'escalated'];
    const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) return c.json({ error: 'Invalid status' }, 400);
      updates.status = body.status;
      if (['resolved', 'rejected'].includes(body.status)) {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = adminUserId ?? 'admin';
      }
    }
    if (body.adminNotes !== undefined) updates.admin_notes = body.adminNotes;
    if (body.resolution !== undefined) updates.resolution = body.resolution;
    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) return c.json({ error: 'Invalid priority' }, 400);
      updates.priority = body.priority;
    }

    const { data, error } = await supabase.from('payment_disputes').update(updates).eq('id', id).select().single();
    if (error) throw error;

    // Record timeline events
    if (body.status !== undefined) {
      const statusLabels: Record<string, string> = { open: 'Open', under_review: 'Under Review', resolved: 'Resolved', rejected: 'Rejected', escalated: 'Escalated' };
      await insertTimelineEvent(id, 'admin', adminUserId, 'status_changed', `Status updated to "${statusLabels[body.status] ?? body.status}"`);
    }
    if (body.priority !== undefined) {
      await insertTimelineEvent(id, 'admin', adminUserId, 'priority_changed', `Priority changed to "${body.priority}"`);
    }
    if (body.resolution !== undefined && body.resolution.trim()) {
      await insertTimelineEvent(id, 'admin', adminUserId, 'resolution_added', 'Resolution message provided');
    }
    if (body.adminNotes !== undefined && body.adminNotes.trim()) {
      await insertTimelineEvent(id, 'admin', adminUserId, 'notes_updated', 'Admin notes updated');
    }

    return c.json({ dispute: mapDispute(data) });
  } catch (err) {
    console.error('Error updating dispute:', err);
    return c.json({ error: `Failed to update dispute: ${err instanceof Error ? err.message : 'Unknown error'}` }, 500);
  }
});

// GET /admin/disputes/:id/timeline — admin get activity timeline (MUST be before plain /:id)
app.get("/make-server-79198001/admin/disputes/:id/timeline", verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from('dispute_updates')
      .select('*')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return c.json({ timeline: (data ?? []).map(mapDisputeUpdate) });
  } catch (err) {
    return c.json({ error: 'Failed to fetch timeline' }, 500);
  }
});

// Helper to map DB row → frontend Coupon shape
function mapCoupon(row: any) {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountPercent: row.discount_percent,
    scopes: row.scopes ?? [],
    maxUses: row.max_uses,
    usedCount: row.used_count ?? 0,
    expiresAt: row.expires_at,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== BANK ACCOUNT CHANGE REQUESTS ====================

function mapBankAccountRequest(r: any) {
  return {
    id: r.id,
    userId: r.user_id,
    userEmail: r.user_email,
    userName: r.user_name ?? null,
    accountName: r.account_name,
    accountNumber: r.account_number,
    bankName: r.bank_name,
    bankCode: r.bank_code ?? null,
    status: r.status,
    adminNotes: r.admin_notes ?? null,
    reviewedBy: r.reviewed_by ?? null,
    reviewedAt: r.reviewed_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// POST /payments/bank-account/request — user submits a bank account update request
app.post("/make-server-79198001/payments/bank-account/request", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const userEmail = c.get('userEmail') as string;
    const body = await c.req.json();
    const { accountName, accountNumber, bankName, bankCode } = body;
    if (!accountName?.trim() || !accountNumber?.trim() || !bankName?.trim()) {
      return c.json({ error: 'accountName, accountNumber, and bankName are required' }, 400);
    }
    if (!/^\d{10}$/.test(accountNumber.trim())) {
      return c.json({ error: 'Account number must be exactly 10 digits' }, 400);
    }
    // Cancel any existing pending request for this user
    await supabase.from('bank_account_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'pending');

    // Fetch profile name
    const { data: profile } = await supabase.from('profiles').select('first_name, last_name, artist_name').eq('id', userId).maybeSingle();
    const userName = profile
      ? (profile.artist_name ?? (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.first_name ?? null))
      : null;

    const { data, error } = await supabase.from('bank_account_requests').insert({
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      account_name: accountName.trim(),
      account_number: accountNumber.trim(),
      bank_name: bankName.trim(),
      bank_code: bankCode?.trim() ?? null,
      status: 'pending',
    }).select().single();
    if (error) throw error;
    return c.json({ request: mapBankAccountRequest(data) }, 201);
  } catch (err) {
    console.error('Error creating bank account request:', err);
    return c.json({ error: `Failed to submit bank account request: ${err instanceof Error ? err.message : 'Unknown error'}` }, 500);
  }
});

// GET /payments/bank-account — user gets their current approved account + any pending request
app.get("/make-server-79198001/payments/bank-account", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { data, error } = await supabase
      .from('bank_account_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['approved', 'pending'])
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    const rows = data ?? [];
    const approved = rows.find((r: any) => r.status === 'approved') ?? null;
    const pending = rows.find((r: any) => r.status === 'pending') ?? null;
    return c.json({
      approved: approved ? mapBankAccountRequest(approved) : null,
      pending: pending ? mapBankAccountRequest(pending) : null,
    });
  } catch (err) {
    return c.json({ error: 'Failed to fetch bank account' }, 500);
  }
});

// GET /admin/bank-account-requests — admin list all requests
app.get("/make-server-79198001/admin/bank-account-requests", verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const status = c.req.query('status');
    let query = supabase.from('bank_account_requests').select('*');
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return c.json({ requests: (data ?? []).map(mapBankAccountRequest) });
  } catch (err) {
    return c.json({ error: 'Failed to fetch bank account requests' }, 500);
  }
});

// PATCH /admin/bank-account-requests/:id — admin approve or reject
app.patch("/make-server-79198001/admin/bank-account-requests/:id", verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const adminUserId = c.get('userId') as string;
    const id = c.req.param('id');
    const body = await c.req.json();
    const VALID_STATUSES = ['approved', 'rejected'];
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return c.json({ error: 'status must be "approved" or "rejected"' }, 400);
    }
    const updates: Record<string, any> = {
      status: body.status,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (body.adminNotes !== undefined) updates.admin_notes = body.adminNotes;
    const { data, error } = await supabase.from('bank_account_requests').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json({ request: mapBankAccountRequest(data) });
  } catch (err) {
    console.error('Error reviewing bank account request:', err);
    return c.json({ error: `Failed to review request: ${err instanceof Error ? err.message : 'Unknown error'}` }, 500);
  }
});

// ==================== ACCOUNTING (CHART OF ACCOUNTS + GENERAL LEDGER) ====================

app.get('/make-server-79198001/admin/accounting/chart-of-accounts', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const status = c.req.query('status');
    const accounts = await accountingService.getChartOfAccounts(status === 'all' ? 'all' : 'active');
    return c.json({ accounts });
  } catch (error) {
    console.error('Error loading chart of accounts:', error);
    return c.json({ error: `Failed to load chart of accounts: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get('/make-server-79198001/admin/accounting/general-ledger', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const entries = await accountingService.getGeneralLedger({
      startDate: c.req.query('startDate') || undefined,
      endDate: c.req.query('endDate') || undefined,
      accountCode: c.req.query('accountCode') || undefined,
      status: c.req.query('status') || undefined,
      approvalStatus: c.req.query('approvalStatus') || undefined,
      postedBy: c.req.query('postedBy') || undefined,
      entryType: c.req.query('entryType') || undefined,
      searchTerm: c.req.query('searchTerm') || undefined,
    });
    return c.json({ entries });
  } catch (error) {
    console.error('Error loading general ledger:', error);
    return c.json({ error: `Failed to load general ledger: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/accounting/journal-entries', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const actorId = c.get('userId') as string;
    const body = await c.req.json();
    const entry = await accountingService.createJournalEntry(body, actorId);

    await adminService.logAdminAction(
      actorId,
      'create',
      'journal-entry',
      entry.id,
      {
        entryNumber: entry.entryNumber,
        debitAccountCode: entry.debitAccountCode,
        creditAccountCode: entry.creditAccountCode,
        amount: entry.debitAmount,
        entryType: entry.entryType,
      },
    );

    return c.json({ entry });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return c.json({ error: `Failed to create journal entry: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get('/make-server-79198001/admin/accounting/journal-entries/:entryId', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const entryId = c.req.param('entryId');
    const entry = await accountingService.getJournalEntryById(entryId);
    return c.json({ entry });
  } catch (error) {
    console.error('Error loading journal entry:', error);
    return c.json({ error: `Failed to load journal entry: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/accounting/journal-entries/:entryId/approve', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const actorId = c.get('userId') as string;
    const entryId = c.req.param('entryId');
    const body = await c.req.json().catch(() => ({}));
    const entry = await accountingService.approveJournalEntry(entryId, actorId, body.comments);

    await adminService.logAdminAction(actorId, 'approve', 'journal-entry', entryId, {
      entryNumber: entry.entryNumber,
      comments: body.comments,
    });

    return c.json({ entry });
  } catch (error) {
    console.error('Error approving journal entry:', error);
    return c.json({ error: `Failed to approve journal entry: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/accounting/journal-entries/:entryId/reject', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const actorId = c.get('userId') as string;
    const entryId = c.req.param('entryId');
    const body = await c.req.json();
    if (!body.reason || typeof body.reason !== 'string') {
      return c.json({ error: 'reason is required' }, 400);
    }
    const entry = await accountingService.rejectJournalEntry(entryId, actorId, body.reason);

    await adminService.logAdminAction(actorId, 'reject', 'journal-entry', entryId, {
      entryNumber: entry.entryNumber,
      reason: body.reason,
    });

    return c.json({ entry });
  } catch (error) {
    console.error('Error rejecting journal entry:', error);
    return c.json({ error: `Failed to reject journal entry: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/accounting/journal-entries/:entryId/post', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const actorId = c.get('userId') as string;
    const entryId = c.req.param('entryId');
    const entry = await accountingService.postJournalEntry(entryId, actorId);

    await adminService.logAdminAction(actorId, 'post', 'journal-entry', entryId, {
      entryNumber: entry.entryNumber,
    });

    return c.json({ entry });
  } catch (error) {
    console.error('Error posting journal entry:', error);
    return c.json({ error: `Failed to post journal entry: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/accounting/journal-entries/:entryId/void', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const actorId = c.get('userId') as string;
    const entryId = c.req.param('entryId');
    const entry = await accountingService.voidJournalEntry(entryId, actorId);

    await adminService.logAdminAction(actorId, 'void', 'journal-entry', entryId, {
      entryNumber: entry.entryNumber,
    });

    return c.json({ entry });
  } catch (error) {
    console.error('Error voiding journal entry:', error);
    return c.json({ error: `Failed to void journal entry: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/accounting/auto-entries/generate', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const actorId = c.get('userId') as string;
    const result = await accountingService.generateAutoEntries(actorId);

    await adminService.logAdminAction(actorId, 'create', 'auto-journal-entries', 'batch', {
      created: result.created,
    });

    return c.json(result);
  } catch (error) {
    console.error('Error generating auto entries:', error);
    return c.json({ error: `Failed to generate auto entries: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// ==================== ACCOUNTING REPORTS ====================

app.post('/make-server-79198001/admin/accounting/sync-entries', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const actorId = c.get('userId') as string;
    const result = await accountingService.generateAutoEntries(actorId);
    
    await adminService.logAdminAction(actorId, 'sync', 'accounting-entries', 'batch', {
      entriesCreated: result.created,
    });

    return c.json({ 
      success: true, 
      entriesCreated: result.created, 
      message: `${result.created} accounting entries synchronized` 
    });
  } catch (error) {
    console.error('Error syncing accounting entries:', error);
    return c.json({ error: `Failed to sync accounting entries: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN SECURITY PANEL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Admin Directory ──────────────────────────────────────────────────────────

// GET /admin/security/admins — enriched admin list (email, name, status)
app.get('/make-server-79198001/admin/security/admins', verifyAuth, verifyAdmin, requirePermission('admins.view'), async (c) => {
  try {
    const admins = await adminService.getAllAdminUsers();
    const enriched = await Promise.all(admins.map(async (a) => {
      const profile = await kv.get<any>(`user:${a.userId}`);
      return {
        ...a,
        email: profile?.email || '',
        name: profile?.name || profile?.artistName || profile?.label_name || '',
        status: (a as any).status || 'active',
        lastLogin: (a as any).lastActiveAt || null,
      };
    }));
    return c.json({ admins: enriched });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// POST /admin/security/admins — create admin by looking up an existing user's email
app.post('/make-server-79198001/admin/security/admins', verifyAuth, verifyAdmin, requirePermission('admins.create'), async (c) => {
  try {
    const actorId = c.get('userId');
    const body = await c.req.json();
    const { email, role, department, customPermissions } = body;
    if (!email || !role) return c.json({ error: 'email and role are required' }, 400);

    // Find user by email
    const users = await kv.getByPrefix('user:');
    let targetUser: any = null;
    for (const u of users) {
      if (u && typeof u === 'object' && (u as any).email === email) { targetUser = u; break; }
    }
    if (!targetUser) return c.json({ error: `No user with email ${email}. They must register first.` }, 404);

    const uid = targetUser.userId || targetUser.id;
    const admin = await adminService.createAdminUser(uid, role, actorId, department);

    if (customPermissions && Array.isArray(customPermissions)) {
      const adminId = await kv.get<string>(`admin:user:${uid}`);
      if (adminId) {
        const adminRecord = await kv.get<any>(`admin:${adminId}`);
        if (adminRecord) {
          adminRecord.permissions = customPermissions;
          adminRecord.updatedAt = new Date().toISOString();
          await kv.set(`admin:${adminId}`, adminRecord);
        }
      }
    }

    await adminService.logAdminAction(actorId, 'create', 'admin', admin.id, { role, email, department });
    return c.json({ admin: { ...admin, email, name: targetUser.name || targetUser.artistName || '' } }, 201);
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// PUT /admin/security/admins/:adminId/permissions
app.put('/make-server-79198001/admin/security/admins/:adminId/permissions', verifyAuth, verifyAdmin, requirePermission('admins.edit'), async (c) => {
  try {
    const actorId = c.get('userId');
    const adminId = c.req.param('adminId');
    const { permissions } = await c.req.json();
    if (!Array.isArray(permissions)) return c.json({ error: 'permissions must be an array' }, 400);

    const admin = await kv.get<any>(`admin:${adminId}`);
    if (!admin) return c.json({ error: 'Admin not found' }, 404);

    const old = admin.permissions;
    admin.permissions = permissions;
    admin.updatedAt = new Date().toISOString();
    await kv.set(`admin:${adminId}`, admin);

    await adminService.logAdminAction(actorId, 'update_permissions', 'admin', adminId, { old, new: permissions });
    return c.json({ admin });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// PUT /admin/security/admins/:adminId/deactivate
app.put('/make-server-79198001/admin/security/admins/:adminId/deactivate', verifyAuth, verifyAdmin, requirePermission('admins.edit'), async (c) => {
  try {
    const actorId = c.get('userId');
    const adminId = c.req.param('adminId');
    const admin = await kv.get<any>(`admin:${adminId}`);
    if (!admin) return c.json({ error: 'Admin not found' }, 404);
    if (admin.userId === actorId) return c.json({ error: 'Cannot deactivate yourself' }, 400);

    admin.status = 'inactive';
    admin.deactivatedAt = new Date().toISOString();
    admin.deactivatedBy = actorId;
    admin.updatedAt = new Date().toISOString();
    await kv.set(`admin:${adminId}`, admin);

    await adminService.logAdminAction(actorId, 'deactivate', 'admin', adminId, { userId: admin.userId });
    return c.json({ admin });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// PUT /admin/security/admins/:adminId/activate
app.put('/make-server-79198001/admin/security/admins/:adminId/activate', verifyAuth, verifyAdmin, requirePermission('admins.edit'), async (c) => {
  try {
    const actorId = c.get('userId');
    const adminId = c.req.param('adminId');
    const admin = await kv.get<any>(`admin:${adminId}`);
    if (!admin) return c.json({ error: 'Admin not found' }, 404);

    admin.status = 'active';
    admin.updatedAt = new Date().toISOString();
    delete admin.deactivatedAt;
    delete admin.deactivatedBy;
    await kv.set(`admin:${adminId}`, admin);

    await adminService.logAdminAction(actorId, 'activate', 'admin', adminId, { userId: admin.userId });
    return c.json({ admin });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// ── Access Logs ──────────────────────────────────────────────────────────────

// GET /admin/security/access-logs — filtered admin audit trail
app.get('/make-server-79198001/admin/security/access-logs', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const q = c.req.query();
    const adminId = q['adminId'];
    const action = q['action'];
    const resource = q['resource'];
    const startDate = q['startDate'];
    const endDate = q['endDate'];
    const limit = parseInt(q['limit'] || '200', 10);

    const all = await adminService.getAllAuditLogs(limit * 3);
    let logs = all;
    if (adminId) logs = logs.filter(l => l.adminUserId === adminId || (l.adminUserEmail || '').includes(adminId));
    if (action) logs = logs.filter(l => l.action.includes(action));
    if (resource) logs = logs.filter(l => l.resource.includes(resource));
    if (startDate) logs = logs.filter(l => new Date(l.timestamp) >= new Date(startDate));
    if (endDate) logs = logs.filter(l => new Date(l.timestamp) <= new Date(endDate));

    return c.json({ logs: logs.slice(0, limit) });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// GET /admin/security/alerts — suspicious activity detection
app.get('/make-server-79198001/admin/security/alerts', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const logs = await adminService.getAllAuditLogs(500);
    const alerts: any[] = [];
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Mass deletions: >5 deletes in 1 hour by same admin
    const deleteLogs = logs.filter(l => l.action === 'delete' && (now - new Date(l.timestamp).getTime()) < oneHour);
    const deletesByAdmin: Record<string, typeof deleteLogs> = {};
    for (const l of deleteLogs) {
      if (!deletesByAdmin[l.adminUserId]) deletesByAdmin[l.adminUserId] = [];
      deletesByAdmin[l.adminUserId].push(l);
    }
    for (const [adminId, aLogs] of Object.entries(deletesByAdmin)) {
      if (aLogs.length >= 5) {
        alerts.push({ id: crypto.randomUUID(), type: 'mass_deletion', severity: 'critical', adminUserId: adminId, adminEmail: aLogs[0].adminUserEmail, message: `${aLogs.length} deletion actions in the past hour`, detectedAt: new Date().toISOString(), relatedLogs: aLogs.slice(0, 5).map(l => l.id) });
      }
    }

    // After-hours access (outside 06:00–22:00 UTC)
    const recentLogs = logs.filter(l => (now - new Date(l.timestamp).getTime()) < oneDay);
    const seenAdminHours = new Set<string>();
    for (const l of recentLogs) {
      const hour = new Date(l.timestamp).getUTCHours();
      if (hour < 6 || hour >= 22) {
        const key = `${l.adminUserId}:${new Date(l.timestamp).toISOString().slice(0, 13)}`;
        if (!seenAdminHours.has(key)) {
          seenAdminHours.add(key);
          alerts.push({ id: crypto.randomUUID(), type: 'after_hours_access', severity: 'medium', adminUserId: l.adminUserId, adminEmail: l.adminUserEmail, message: `Access at off-hours (UTC ${String(hour).padStart(2,'0')}:00) — action: ${l.action}`, detectedAt: l.timestamp, relatedLogs: [l.id] });
        }
      }
    }

    // High-volume actions: >20 write actions in 1 hour by same admin
    const writeLogs = logs.filter(l => ['create','update','delete','approve','takedown'].includes(l.action) && (now - new Date(l.timestamp).getTime()) < oneHour);
    const writesByAdmin: Record<string, number> = {};
    for (const l of writeLogs) writesByAdmin[l.adminUserId] = (writesByAdmin[l.adminUserId] || 0) + 1;
    for (const [adminId, count] of Object.entries(writesByAdmin)) {
      if (count >= 20) {
        const adminLog = writeLogs.find(l => l.adminUserId === adminId);
        alerts.push({ id: crypto.randomUUID(), type: 'high_volume_activity', severity: 'high', adminUserId: adminId, adminEmail: adminLog?.adminUserEmail, message: `${count} write actions in the last hour`, detectedAt: new Date().toISOString(), relatedLogs: [] });
      }
    }

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));
    return c.json({ alerts: alerts.slice(0, 50) });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// ── Permissions Matrix ───────────────────────────────────────────────────────

const DEFAULT_ROLE_PERMS: Record<string, string[]> = Object.fromEntries(
  Object.entries(adminService.DEFAULT_ROLE_PERMISSIONS).map(([role, permissions]) => [role, [...permissions]])
);

const ALL_PERMISSIONS = [...adminService.ALL_AVAILABLE_PERMISSIONS];

// GET /admin/security/permissions-matrix
app.get('/make-server-79198001/admin/security/permissions-matrix', verifyAuth, verifyAdmin, requirePermission('admins.view'), async (c) => {
  try {
    const customOverrides = await kv.get<Record<string, string[]>>('security:permissions-matrix') || {};
    const matrix: Record<string, string[]> = {};
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMS)) {
      matrix[role] = customOverrides[role] || perms;
    }
    return c.json({ matrix, allPermissions: ALL_PERMISSIONS });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// PUT /admin/security/permissions-matrix — elevated admins only
app.put('/make-server-79198001/admin/security/permissions-matrix', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const actorId = c.get('userId');
    const actorAdmin = await adminService.getAdminUser(actorId);
    if (!adminService.hasElevatedAdminAccess(actorAdmin)) {
      return c.json({ error: 'Only elevated admin accounts can modify the permissions matrix' }, 403);
    }
    const { matrix } = await c.req.json();
    if (!matrix || typeof matrix !== 'object') return c.json({ error: 'matrix is required' }, 400);

    await kv.set('security:permissions-matrix', matrix);
    await adminService.logAdminAction(actorId, 'update_permissions_matrix', 'system', 'permissions-matrix', { rolesUpdated: Object.keys(matrix) });
    return c.json({ success: true, matrix });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// ── API Key Management ───────────────────────────────────────────────────────

// GET /admin/security/api-keys — masked list
app.get('/make-server-79198001/admin/security/api-keys', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const entries = await kv.getByPrefix('security:api-key:');
    const apiKeys: any[] = [];
    for (const k of entries) {
      if (k && typeof k === 'object' && (k as any).id) {
        const key = k as any;
        apiKeys.push({ ...key, keyValue: key.keyValue ? `${key.keyValue.slice(0, 10)}...${key.keyValue.slice(-4)}` : undefined });
      }
    }
    return c.json({ apiKeys: apiKeys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// POST /admin/security/api-keys — generate new key (full value returned once)
app.post('/make-server-79198001/admin/security/api-keys', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const actorId = c.get('userId');
    const { name, description, expiresInDays, rateLimit, scopes } = await c.req.json();
    if (!name) return c.json({ error: 'name is required' }, 400);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const rawBytes = new Uint8Array(32);
    crypto.getRandomValues(rawBytes);
    const keyValue = 'sk_' + Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString() : null;

    const apiKey = { id, name, description: description || '', keyValue, scopes: scopes || [], rateLimit: rateLimit || 1000, status: 'active', createdBy: actorId, createdAt: now, updatedAt: now, expiresAt, usageCount: 0, lastUsedAt: null };

    await kv.set(`security:api-key:${id}`, apiKey);
    await adminService.logAdminAction(actorId, 'create', 'api-key', id, { name, scopes, rateLimit, expiresAt });

    // Return full key value only at creation
    return c.json({ apiKey }, 201);
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// DELETE /admin/security/api-keys/:id — revoke
app.delete('/make-server-79198001/admin/security/api-keys/:id', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const actorId = c.get('userId');
    const id = c.req.param('id');
    const key = await kv.get<any>(`security:api-key:${id}`);
    if (!key) return c.json({ error: 'API key not found' }, 404);

    key.status = 'revoked';
    key.revokedAt = new Date().toISOString();
    key.revokedBy = actorId;
    key.updatedAt = new Date().toISOString();
    await kv.set(`security:api-key:${id}`, key);

    await adminService.logAdminAction(actorId, 'revoke', 'api-key', id, { name: key.name });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// ── Security Settings ────────────────────────────────────────────────────────

const DEFAULT_SECURITY_SETTINGS = {
  twoFactorRequired: false,
  sessionTimeoutMinutes: 480,
  ipWhitelist: [] as string[],
  passwordPolicy: { minLength: 8, requireUppercase: true, requireNumbers: true, requireSpecial: true, expiryDays: 90, preventReuse: 5 },
  loginAttempts: { maxAttempts: 5, lockoutMinutes: 30 },
  alertsEnabled: true,
  afterHoursAlertEnabled: true,
};

// GET /admin/security/settings
app.get('/make-server-79198001/admin/security/settings', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const stored = await kv.get<any>('security:settings');
    return c.json({ settings: stored ? { ...DEFAULT_SECURITY_SETTINGS, ...stored } : DEFAULT_SECURITY_SETTINGS });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// PUT /admin/security/settings
app.put('/make-server-79198001/admin/security/settings', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const actorId = c.get('userId');
    const body = await c.req.json();
    const existing = await kv.get<any>('security:settings') || DEFAULT_SECURITY_SETTINGS;
    const merged = { ...existing, ...body, updatedAt: new Date().toISOString(), updatedBy: actorId };
    await kv.set('security:settings', merged);
    await adminService.logAdminAction(actorId, 'update_settings', 'system', 'security-settings', body);
    return c.json({ settings: merged });
  } catch (err) {
    return c.json({ error: `Failed: ${(err as Error).message}` }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// END ADMIN SECURITY PANEL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM CONFIG PANEL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Platform Settings ────────────────────────────────────────────────────────
const PLATFORM_SETTINGS_KEY = 'sysconfig:platform-settings';
const DEFAULT_PLATFORM_SETTINGS = {
  payout: {
    minThreshold: 10,
    platformFeePercent: 15,
    artistPayoutPercent: 85,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'NGN'],
    paymentMethods: { stripe: true, paypal: true, bankTransfer: true },
  },
  release: {
    autoApproveEnabled: true,
    autoApproveMinReleases: 5,
    autoApproveMinDaysSinceJoin: 90,
    mandatoryReview: false,
  },
  contentModeration: {
    autoFlagExplicitThreshold: 0.8,
    copyrightChecksEnabled: true,
    autoFlagEnabled: true,
  },
  updatedAt: null as string | null,
  updatedBy: null as string | null,
};

app.get('/make-server-79198001/admin/sysconfig/platform', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const stored = await kv.get(PLATFORM_SETTINGS_KEY);
    const settings = stored ? { ...DEFAULT_PLATFORM_SETTINGS, ...stored } : DEFAULT_PLATFORM_SETTINGS;
    return c.json({ settings });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put('/make-server-79198001/admin/sysconfig/platform', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const body = await c.req.json();
    const current = await kv.get(PLATFORM_SETTINGS_KEY) || DEFAULT_PLATFORM_SETTINGS;
    const updated = { ...current, ...body, updatedAt: new Date().toISOString(), updatedBy: (c as any).get?.('adminEmail') || 'admin' };
    await kv.set(PLATFORM_SETTINGS_KEY, updated);
    const adminUserId = (c as any).get?.('adminId') || 'system';
    await adminService.logAdminAction(adminUserId, undefined, 'update', 'system', 'platform-settings', { changes: body });
    return c.json({ settings: updated });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── DSP Configuration ────────────────────────────────────────────────────────
const DSP_CONFIG_KEY = 'sysconfig:dsp-config';
const DEFAULT_DSP_LIST = [
  { id: 'spotify', name: 'Spotify', enabled: true, syncInterval: 'daily', fallbackStrategy: 'retry', regions: [], apiConfigured: false },
  { id: 'apple_music', name: 'Apple Music', enabled: true, syncInterval: 'daily', fallbackStrategy: 'retry', regions: [], apiConfigured: false },
  { id: 'youtube_music', name: 'YouTube Music', enabled: true, syncInterval: 'daily', fallbackStrategy: 'skip', regions: [], apiConfigured: false },
  { id: 'deezer', name: 'Deezer', enabled: false, syncInterval: 'weekly', fallbackStrategy: 'skip', regions: [], apiConfigured: false },
  { id: 'tidal', name: 'Tidal', enabled: false, syncInterval: 'weekly', fallbackStrategy: 'queue', regions: [], apiConfigured: false },
  { id: 'amazon_music', name: 'Amazon Music', enabled: false, syncInterval: 'daily', fallbackStrategy: 'retry', regions: [], apiConfigured: false },
];

app.get('/make-server-79198001/admin/sysconfig/dsps', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const stored = await kv.get(DSP_CONFIG_KEY);
    const dsps = stored || DEFAULT_DSP_LIST;
    return c.json({ dsps });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put('/make-server-79198001/admin/sysconfig/dsps/:dspId', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const dspId = c.req.param('dspId');
    const body = await c.req.json();
    const current: any[] = await kv.get(DSP_CONFIG_KEY) || DEFAULT_DSP_LIST;
    const idx = current.findIndex((d: any) => d.id === dspId);
    if (idx === -1) return c.json({ error: 'DSP not found' }, 404);
    // Never store raw API credentials — store only whether configured
    const { apiKey: _ak, clientSecret: _cs, ...safeBody } = body;
    if (_ak || _cs) safeBody.apiConfigured = true;
    current[idx] = { ...current[idx], ...safeBody, updatedAt: new Date().toISOString() };
    await kv.set(DSP_CONFIG_KEY, current);
    const adminUserId = (c as any).get?.('adminId') || 'system';
    await adminService.logAdminAction(adminUserId, undefined, 'update', 'system', `dsp:${dspId}`, { changes: safeBody });
    return c.json({ dsp: current[idx] });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Email / Notification Config ───────────────────────────────────────────────
const EMAIL_CONFIG_KEY = 'sysconfig:email-config';
const DEFAULT_EMAIL_CONFIG = {
  templates: {
    welcome: { subject: 'Welcome to the platform!', enabled: true },
    releaseApproved: { subject: 'Your release has been approved', enabled: true },
    releaseRejected: { subject: 'Release review update', enabled: true },
    payoutProcessed: { subject: 'Your payout is on the way', enabled: true },
    alertCritical: { subject: '[ALERT] Critical platform event', enabled: true },
  },
  notificationRules: {
    releaseApproved: { adminEmail: true, artistEmail: true },
    releaseRejected: { adminEmail: true, artistEmail: true },
    payoutProcessed: { adminEmail: false, artistEmail: true },
    errorThreshold: { adminEmail: true, artistEmail: false },
    revenueAnomaly: { adminEmail: true, artistEmail: false },
  },
  sms: { enabled: false, provider: 'twilio', fromNumber: '' },
  push: { enabled: false, provider: 'firebase' },
  alertThresholds: {
    errorCountPerHour: 50,
    revenueAnomalyPercentage: 30,
    failedPayoutsCount: 5,
  },
  updatedAt: null as string | null,
};

app.get('/make-server-79198001/admin/sysconfig/email', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const stored = await kv.get(EMAIL_CONFIG_KEY);
    return c.json({ config: stored || DEFAULT_EMAIL_CONFIG });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put('/make-server-79198001/admin/sysconfig/email', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const body = await c.req.json();
    const current = await kv.get(EMAIL_CONFIG_KEY) || DEFAULT_EMAIL_CONFIG;
    const updated = { ...current, ...body, updatedAt: new Date().toISOString() };
    await kv.set(EMAIL_CONFIG_KEY, updated);
    const adminUserId = (c as any).get?.('adminId') || 'system';
    await adminService.logAdminAction(adminUserId, undefined, 'update', 'system', 'email-config', {});
    return c.json({ config: updated });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Feature Flags ─────────────────────────────────────────────────────────────
const FEATURE_FLAGS_KEY = 'sysconfig:feature-flags';
const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  { id: 'beta_smart_links', name: 'Smart Links Beta', description: 'Enable smart link creation for artists', enabled: false, rolloutPercent: 0, category: 'artist', createdAt: new Date().toISOString() },
  { id: 'ai_mastering', name: 'AI Mastering', description: 'AI-powered mastering service integration', enabled: false, rolloutPercent: 0, category: 'release', createdAt: new Date().toISOString() },
  { id: 'multi_label', name: 'Multi-Label Support', description: 'Allow artists to belong to multiple labels', enabled: false, rolloutPercent: 0, category: 'artist', createdAt: new Date().toISOString() },
  { id: 'revenue_analytics_v2', name: 'Revenue Analytics v2', description: 'New revenue dashboard with DSP breakdowns', enabled: true, rolloutPercent: 100, category: 'analytics', createdAt: new Date().toISOString() },
  { id: 'auto_split_royalties', name: 'Auto Split Royalties', description: 'Automatic royalty splitting between collaborators', enabled: false, rolloutPercent: 0, category: 'finance', createdAt: new Date().toISOString() },
  { id: 'dsp_tidal', name: 'Tidal Distribution', description: 'Enable Tidal as a distribution channel', enabled: false, rolloutPercent: 0, category: 'distribution', createdAt: new Date().toISOString() },
  { id: 'new_moderation_rules', name: 'Enhanced Moderation Rules', description: 'Experimental moderation ruleset v2', enabled: false, rolloutPercent: 0, category: 'moderation', createdAt: new Date().toISOString() },
  { id: 'instant_payouts', name: 'Instant Payouts', description: 'Same-day payout processing (requires Stripe)', enabled: false, rolloutPercent: 0, category: 'finance', createdAt: new Date().toISOString() },
];

interface FeatureFlag {
  id: string; name: string; description: string;
  enabled: boolean; rolloutPercent: number;
  category: string; createdAt: string; updatedAt?: string;
}

app.get('/make-server-79198001/admin/sysconfig/feature-flags', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const stored = await kv.get(FEATURE_FLAGS_KEY);
    return c.json({ flags: stored || DEFAULT_FEATURE_FLAGS });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put('/make-server-79198001/admin/sysconfig/feature-flags/:flagId', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const flagId = c.req.param('flagId');
    const body = await c.req.json();
    const current: FeatureFlag[] = await kv.get(FEATURE_FLAGS_KEY) || DEFAULT_FEATURE_FLAGS;
    const idx = current.findIndex(f => f.id === flagId);
    if (idx === -1) return c.json({ error: 'Flag not found' }, 404);
    current[idx] = { ...current[idx], ...body, updatedAt: new Date().toISOString() };
    await kv.set(FEATURE_FLAGS_KEY, current);
    const adminUserId = (c as any).get?.('adminId') || 'system';
    await adminService.logAdminAction(adminUserId, undefined, 'update', 'system', `feature-flag:${flagId}`, { changes: body });
    return c.json({ flag: current[idx] });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Emergency kill-all flags
app.post('/make-server-79198001/admin/sysconfig/feature-flags/emergency-disable', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const current: FeatureFlag[] = await kv.get(FEATURE_FLAGS_KEY) || DEFAULT_FEATURE_FLAGS;
    const disabled = current.map(f => ({ ...f, enabled: false, rolloutPercent: 0, updatedAt: new Date().toISOString() }));
    await kv.set(FEATURE_FLAGS_KEY, disabled);
    const adminUserId = (c as any).get?.('adminId') || 'system';
    await adminService.logAdminAction(adminUserId, undefined, 'update', 'system', 'feature-flags', { action: 'emergency-disable-all' });
    return c.json({ flags: disabled });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Maintenance Mode ──────────────────────────────────────────────────────────
const MAINTENANCE_KEY = 'sysconfig:maintenance';
const DEFAULT_MAINTENANCE = {
  enabled: false,
  message: 'We are performing scheduled maintenance. We will be back shortly.',
  scheduledStart: null as string | null,
  scheduledEnd: null as string | null,
  affectedSystems: [] as string[],
  lastBackupAt: null as string | null,
  lastBackupBy: null as string | null,
};

app.get('/make-server-79198001/admin/sysconfig/maintenance', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const stored = await kv.get(MAINTENANCE_KEY);
    return c.json({ maintenance: stored || DEFAULT_MAINTENANCE });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put('/make-server-79198001/admin/sysconfig/maintenance', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const body = await c.req.json();
    const current = await kv.get(MAINTENANCE_KEY) || DEFAULT_MAINTENANCE;
    const updated = { ...current, ...body, updatedAt: new Date().toISOString() };
    await kv.set(MAINTENANCE_KEY, updated);
    const adminUserId = (c as any).get?.('adminId') || 'system';
    const action = body.enabled ? 'maintenance-enabled' : 'maintenance-disabled';
    await adminService.logAdminAction(adminUserId, undefined, 'update', 'system', 'maintenance', { action, changes: body });
    return c.json({ maintenance: updated });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/make-server-79198001/admin/sysconfig/maintenance/backup', verifyAuth, verifyAdmin, requirePermission('system.settings'), async (c) => {
  try {
    const adminUserId = (c as any).get?.('adminId') || 'system';
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const backupId = `backup-${Date.now()}`;
    const backupRecord = { id: backupId, triggeredBy: adminEmail, triggeredAt: new Date().toISOString(), status: 'initiated' };
    await kv.set(`backup:${backupId}`, backupRecord);
    const maint = await kv.get(MAINTENANCE_KEY) || DEFAULT_MAINTENANCE;
    maint.lastBackupAt = new Date().toISOString();
    maint.lastBackupBy = adminEmail;
    await kv.set(MAINTENANCE_KEY, maint);
    await adminService.logAdminAction(adminUserId, adminEmail, 'create', 'system', backupId, { action: 'manual-backup' });
    return c.json({ backup: backupRecord });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// END SYSTEM CONFIG PANEL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// FINANCIAL DASHBOARD ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

interface FinanceExpenseRecord {
  id: string;
  category: 'salaries' | 'dsp_fees' | 'infrastructure' | 'marketing' | 'legal' | 'other';
  description: string;
  amount: number;
  date: string;
  createdAt: string;
  createdBy: string;
}

interface HrStaffBenefitPack {
  healthInsurance: number;
  housingAllowance: number;
  transportAllowance: number;
  mealAllowance: number;
  pensionPercent: number;
  nhfPercent: number;
}

interface HrStaffEntitlements {
  annualLeaveDays: number;
  sickLeaveDays: number;
  parentalLeaveDays: number;
  studyLeaveDays: number;
}

interface HrStaffRecord {
  id: string;
  staffId: string;
  payrollEmployeeId?: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  manager: string;
  employmentType: 'full_time' | 'part_time' | 'contractor';
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  joinDate: string;
  promotionStatus: 'none' | 'requested' | 'reviewing' | 'approved' | 'rejected';
  promotionRequest?: {
    requestedBy: string;
    requestedAt: string;
    currentRole: string;
    requestedRole: string;
    currentPayGrade: string;
    requestedPayGrade: string;
    salaryIncreasePct: number;
    reason: string;
    reviewedBy?: string;
    reviewedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
  };
  payGrade: string;
  baseSalary: number;
  currency: string;
  benefits: HrStaffBenefitPack;
  entitlements: HrStaffEntitlements;
  tax: {
    taxId: string;
    stateCode: string;
  };
  bank: {
    bankName: string;
    accountNumber: string;
    bankCode: string;
  };
  leaveBalance: {
    annualLeaveDays: number;
    sickLeaveDays: number;
    parentalLeaveDays: number;
    studyLeaveDays: number;
    lastAccruedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface HrAuditLogEntry {
  id: string;
  staffId: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface HrDepartmentRecord {
  id: string;
  name: string;
  description: string;
  costCenterCode: string;
  expenseAccount: string;
  revenueAccount: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface HrRoleRecord {
  id: string;
  name: string;
  department: string;
  defaultPayGrade: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const HR_STAFF_KEY = 'hr:staff:v1';
const HR_AUDIT_LOG_KEY = 'hr:audit:v1';
const HR_DEPARTMENTS_KEY = 'hr:departments:v1';
const HR_ROLES_KEY = 'hr:roles:v1';

const HR_DEFAULT_DEPARTMENT_SEEDS: Array<Partial<HrDepartmentRecord>> = [
  {
    name: 'Content',
    description: 'Content planning, production, and publishing operations',
    expenseAccount: 'Content Payroll Expense',
  },
  {
    name: 'Finance',
    description: 'Finance, payroll, treasury, and accounting operations',
    expenseAccount: 'Finance Payroll Expense',
  },
  {
    name: 'Operations',
    description: 'Operational delivery, service coordination, and execution',
    expenseAccount: 'Operations Payroll Expense',
  },
  {
    name: 'HR',
    description: 'Human resources, recruitment, and people operations',
    expenseAccount: 'HR Payroll Expense',
  },
  {
    name: 'Admin',
    description: 'Administration, governance, and executive support',
    expenseAccount: 'Admin Payroll Expense',
  },
];

const HR_DEFAULT_ROLE_SEEDS: Array<Partial<HrRoleRecord>> = [
  { department: 'Content', name: 'Content', defaultPayGrade: 'PG-1A' },
  { department: 'Finance', name: 'Finance', defaultPayGrade: 'PG-1A' },
  { department: 'Operations', name: 'Operations', defaultPayGrade: 'PG-1A' },
  { department: 'HR', name: 'HR', defaultPayGrade: 'PG-1A' },
  { department: 'Admin', name: 'Admin', defaultPayGrade: 'PG-1A' },
];

function hrNowIso() {
  return new Date().toISOString();
}

function generateStaffId(name: string, count: number) {
  const initials = (name || 'staff')
    .split(' ')
    .map((p) => p.trim()[0] || '')
    .join('')
    .slice(0, 3)
    .toUpperCase() || 'STF';
  return `HR-${initials}-${String(count + 1).padStart(4, '0')}`;
}

async function loadHrStaff(): Promise<HrStaffRecord[]> {
  const data = await kv.get(HR_STAFF_KEY);
  if (!Array.isArray(data)) return [];
  return data as HrStaffRecord[];
}

function normalizeOptionalEmail(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function findHrStaffRecord(staff: HrStaffRecord[], userId: string | undefined, userEmail: string | null | undefined) {
  const normalizedEmail = normalizeOptionalEmail(userEmail);
  return staff.find((member) => {
    if (userId && member.id === userId) {
      return true;
    }
    return Boolean(normalizedEmail) && normalizeOptionalEmail(member.email) === normalizedEmail;
  }) || null;
}

function getAuthenticatedActorName(activeUser: any, authUser: any, staffMember: HrStaffRecord | null) {
  if (staffMember?.fullName) return staffMember.fullName;

  const fullName = [activeUser?.firstName, activeUser?.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (activeUser?.artistName) return activeUser.artistName;
  if (activeUser?.labelName) return activeUser.labelName;
  if (typeof authUser?.user_metadata?.fullName === 'string' && authUser.user_metadata.fullName.trim()) {
    return authUser.user_metadata.fullName.trim();
  }
  if (typeof authUser?.user_metadata?.name === 'string' && authUser.user_metadata.name.trim()) {
    return authUser.user_metadata.name.trim();
  }
  return authUser?.email || 'User';
}

async function resolvePortalActor(c: any, required = true): Promise<Response | { activeUser: any; staffMember: HrStaffRecord | null } | null> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return required ? c.json({ error: 'Unauthorized: No token provided' }, 401) : null;
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return required ? c.json({ error: 'Unauthorized: Invalid token' }, 401) : null;
  }

  const activeUser = await userService.getUserByUserId(user.id).catch(() => null);
  const staff = await loadHrStaff();
  const staffMember = findHrStaffRecord(staff, user.id, user.email);

  if (!activeUser && !staffMember) {
    return required ? c.json({ error: 'Unauthorized: User account no longer exists' }, 401) : null;
  }

  c.set('userId', user.id);
  c.set('userEmail', user.email);
  c.set('userName', getAuthenticatedActorName(activeUser, user, staffMember));
  c.set('userRole', staffMember ? 'staff' : (activeUser?.role || user.user_metadata?.role || 'user'));
  if (activeUser) c.set('activeUser', activeUser);
  if (staffMember) c.set('staffMember', staffMember);

  return { activeUser, staffMember };
}

async function verifyStaffPortalAuth(c: any, next: any) {
  const actor = await resolvePortalActor(c, true);
  if (actor instanceof Response) {
    return actor;
  }

  await next();
}

async function saveHrStaff(staff: HrStaffRecord[]) {
  await kv.set(HR_STAFF_KEY, staff);
}

async function loadHrAuditLog(): Promise<HrAuditLogEntry[]> {
  const data = await kv.get(HR_AUDIT_LOG_KEY);
  if (!Array.isArray(data)) return [];
  return data as HrAuditLogEntry[];
}

async function loadHrDepartments(): Promise<HrDepartmentRecord[]> {
  const data = await kv.get(HR_DEPARTMENTS_KEY);
  const items = Array.isArray(data) ? data as HrDepartmentRecord[] : [];
  const merged = items.slice();
  let changed = false;

  for (const seed of HR_DEFAULT_DEPARTMENT_SEEDS) {
    const exists = merged.some((item) => item.name.toLowerCase() === String(seed.name || '').toLowerCase());
    if (!exists) {
      merged.push(normalizeHrDepartment(seed, 'system'));
      changed = true;
    }
  }

  if (changed) {
    await saveHrDepartments(merged);
  }

  return merged;
}

async function saveHrDepartments(items: HrDepartmentRecord[]) {
  await kv.set(HR_DEPARTMENTS_KEY, items);
}

async function loadHrRoles(): Promise<HrRoleRecord[]> {
  const data = await kv.get(HR_ROLES_KEY);
  const items = Array.isArray(data) ? data as HrRoleRecord[] : [];
  const merged = items.slice();
  let changed = false;

  for (const seed of HR_DEFAULT_ROLE_SEEDS) {
    const department = String(seed.department || '').toLowerCase();
    const name = String(seed.name || '').toLowerCase();
    const exists = merged.some((item) => item.department.toLowerCase() === department && item.name.toLowerCase() === name);
    if (!exists) {
      merged.push(normalizeHrRole(seed, 'system'));
      changed = true;
    }
  }

  if (changed) {
    await saveHrRoles(merged);
  }

  return merged;
}

async function saveHrRoles(items: HrRoleRecord[]) {
  await kv.set(HR_ROLES_KEY, items);
}

function normalizeHrDepartment(input: Partial<HrDepartmentRecord>, adminEmail: string): HrDepartmentRecord {
  const now = hrNowIso();
  const name = String(input.name || '').trim();
  return {
    id: input.id || crypto.randomUUID(),
    name,
    description: String(input.description || '').trim(),
    costCenterCode: String(input.costCenterCode || name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'HR-GENERAL').slice(0, 40),
    expenseAccount: String(input.expenseAccount || 'Payroll Expense').trim(),
    revenueAccount: String(input.revenueAccount || 'N/A').trim(),
    createdAt: input.createdAt || now,
    updatedAt: now,
    createdBy: input.createdBy || adminEmail,
  };
}

function normalizeHrRole(input: Partial<HrRoleRecord>, adminEmail: string): HrRoleRecord {
  const now = hrNowIso();
  return {
    id: input.id || crypto.randomUUID(),
    name: String(input.name || '').trim(),
    department: String(input.department || 'General').trim(),
    defaultPayGrade: String(input.defaultPayGrade || 'PG-1A').trim(),
    createdAt: input.createdAt || now,
    updatedAt: now,
    createdBy: input.createdBy || adminEmail,
  };
}

async function logHrAudit(staffId: string, action: string, actor: string, details?: Record<string, unknown>) {
  const log = await loadHrAuditLog();
  log.unshift({
    id: crypto.randomUUID(),
    staffId,
    action,
    actor,
    timestamp: hrNowIso(),
    details,
  });
  await kv.set(HR_AUDIT_LOG_KEY, log.slice(0, 1500));
}

function leaveAccrualRateByType(type: HrStaffRecord['employmentType']) {
  if (type === 'contractor') {
    return { annual: 0, sick: 0, parental: 0, study: 0 };
  }
  if (type === 'part_time') {
    return { annual: 0.5, sick: 0.25, parental: 0.15, study: 0.1 };
  }
  return { annual: 1, sick: 0.5, parental: 0.25, study: 0.15 };
}

function monthsBetween(aIso: string, b: Date) {
  const a = new Date(aIso);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function applyLeaveAccrualIfDue(staff: HrStaffRecord, nowDate: Date) {
  if (staff.status !== 'active') return { changed: false, staff };

  const lastAccrued = staff.leaveBalance?.lastAccruedAt || staff.joinDate || nowDate.toISOString();
  const deltaMonths = Math.max(0, monthsBetween(lastAccrued, nowDate));
  if (deltaMonths <= 0) return { changed: false, staff };

  const rate = leaveAccrualRateByType(staff.employmentType);
  const next = {
    ...staff,
    leaveBalance: {
      annualLeaveDays: Number((staff.leaveBalance.annualLeaveDays + (rate.annual * deltaMonths)).toFixed(2)),
      sickLeaveDays: Number((staff.leaveBalance.sickLeaveDays + (rate.sick * deltaMonths)).toFixed(2)),
      parentalLeaveDays: Number((staff.leaveBalance.parentalLeaveDays + (rate.parental * deltaMonths)).toFixed(2)),
      studyLeaveDays: Number((staff.leaveBalance.studyLeaveDays + (rate.study * deltaMonths)).toFixed(2)),
      lastAccruedAt: nowDate.toISOString(),
    },
    updatedAt: hrNowIso(),
  };
  return { changed: true, staff: next };
}

function normalizeHrStaff(input: Partial<HrStaffRecord>, existingCount: number, adminEmail: string): HrStaffRecord {
  const now = hrNowIso();
  return {
    id: input.id || crypto.randomUUID(),
    staffId: input.staffId || generateStaffId(input.fullName || '', existingCount),
    payrollEmployeeId: input.payrollEmployeeId,
    fullName: String(input.fullName || '').trim(),
    email: String(input.email || '').trim().toLowerCase(),
    phone: String(input.phone || '').trim(),
    department: String(input.department || 'General').trim(),
    role: String(input.role || 'Staff').trim(),
    manager: String(input.manager || '').trim(),
    employmentType: input.employmentType || 'full_time',
    status: input.status || 'active',
    joinDate: input.joinDate || new Date().toISOString().slice(0, 10),
    promotionStatus: input.promotionStatus || 'none',
    payGrade: String(input.payGrade || 'PG-1').trim(),
    baseSalary: Math.max(0, Number(input.baseSalary) || 0),
    currency: String(input.currency || 'NGN').toUpperCase(),
    benefits: {
      healthInsurance: Math.max(0, Number(input.benefits?.healthInsurance) || 0),
      housingAllowance: Math.max(0, Number(input.benefits?.housingAllowance) || 0),
      transportAllowance: Math.max(0, Number(input.benefits?.transportAllowance) || 0),
      mealAllowance: Math.max(0, Number(input.benefits?.mealAllowance) || 0),
      pensionPercent: Math.max(0, Number(input.benefits?.pensionPercent) || 0),
      nhfPercent: Math.max(0, Number(input.benefits?.nhfPercent) || 0),
    },
    entitlements: {
      annualLeaveDays: Math.max(0, Number(input.entitlements?.annualLeaveDays) || 0),
      sickLeaveDays: Math.max(0, Number(input.entitlements?.sickLeaveDays) || 0),
      parentalLeaveDays: Math.max(0, Number(input.entitlements?.parentalLeaveDays) || 0),
      studyLeaveDays: Math.max(0, Number(input.entitlements?.studyLeaveDays) || 0),
    },
    tax: {
      taxId: String(input.tax?.taxId || '').trim(),
      stateCode: String(input.tax?.stateCode || 'LA').toUpperCase(),
    },
    bank: {
      bankName: String(input.bank?.bankName || '').trim(),
      accountNumber: String(input.bank?.accountNumber || '').trim(),
      bankCode: String(input.bank?.bankCode || '').trim(),
    },
    leaveBalance: {
      annualLeaveDays: Math.max(0, Number(input.leaveBalance?.annualLeaveDays) || 0),
      sickLeaveDays: Math.max(0, Number(input.leaveBalance?.sickLeaveDays) || 0),
      parentalLeaveDays: Math.max(0, Number(input.leaveBalance?.parentalLeaveDays) || 0),
      studyLeaveDays: Math.max(0, Number(input.leaveBalance?.studyLeaveDays) || 0),
      lastAccruedAt: input.leaveBalance?.lastAccruedAt || now,
    },
    promotionRequest: input.promotionRequest,
    createdAt: input.createdAt || now,
    updatedAt: now,
    createdBy: input.createdBy || adminEmail,
  };
}

async function syncHrStaffToPayroll(staff: HrStaffRecord) {
  const annualBaseSalary = Math.max(0, Number(staff.baseSalary || 0)) * 12;

  const employees = await payrollService.upsertEmployee({
    id: staff.payrollEmployeeId,
    employeeId: staff.staffId,
    name: staff.fullName,
    department: staff.department,
    position: staff.role,
    status: staff.status === 'terminated' ? 'inactive' : (staff.status as any),
    hireDate: staff.joinDate,
    salary: annualBaseSalary,
    currency: staff.currency,
    personalInfo: {
      email: staff.email,
      phone: staff.phone,
      taxId: staff.tax.taxId,
      address: '',
      emergencyContact: '',
    },
    employmentDetails: {
      manager: staff.manager,
      employmentType: staff.employmentType,
    },
    compensation: {
      baseSalary: annualBaseSalary,
      hourlyRate: 0,
      payFrequency: 'monthly',
    },
    taxInfo: {
      filingStatus: 'single',
      w4Withholding: 0,
      state: staff.tax.stateCode,
      localTaxRate: 0,
    },
    benefits: {
      healthInsurance: staff.benefits.healthInsurance,
      healthInsuranceEmployer: 0,
      housingAllowance: staff.benefits.housingAllowance,
      transportAllowance: staff.benefits.transportAllowance,
      mealAllowance: staff.benefits.mealAllowance,
      pensionEmployeePercent: staff.benefits.pensionPercent,
      nhfEmployeePercent: staff.benefits.nhfPercent,
      retirement401kEnabled: false,
      retirement401kPercent: 0,
      retirement401kEmployerMatchPercent: 0,
      otherDeductions: 0,
    },
    directDeposit: {
      bankName: staff.bank.bankName,
      accountNumberMasked: staff.bank.accountNumber,
      routingNumberMasked: staff.bank.bankCode,
    },
  });

  const match = employees.find((e: any) => e.employeeId === staff.staffId) || employees.find((e: any) => e.name === staff.fullName);
  return match?.id || staff.payrollEmployeeId;
}

function finMonthKey(d: string): string { return d.slice(0, 7); }
function finIsMTD(d: string): boolean {
  const n = new Date();
  return d.startsWith(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`);
}
function finIsYTD(d: string): boolean { return d.startsWith(String(new Date().getFullYear())); }
function finIsPrevYear(d: string): boolean { return d.startsWith(String(new Date().getFullYear() - 1)); }

function finExpenseAccountCode(category?: string) {
  const normalized = String(category || '').toLowerCase();
  if (normalized.includes('dsp') || normalized.includes('api')) return '5300';
  if (normalized.includes('processing') || normalized.includes('payment')) return '5400';
  if (normalized.includes('cloud') || normalized.includes('infrastructure') || normalized.includes('hosting')) return '5500';
  if (normalized.includes('marketing') || normalized.includes('sales')) return '5700';
  if (normalized.includes('legal') || normalized.includes('compliance')) return '5900';
  if (normalized.includes('salary') || normalized.includes('payroll') || normalized.includes('benefit')) return '5100';
  return '5800';
}

async function syncFinanceAutomation(actorId: string) {
  try {
    return await accountingService.generateAutoEntries(actorId || 'system');
  } catch (error) {
    console.error('Finance automation sync failed:', error);
    return null;
  }
}

app.get('/make-server-79198001/admin/finance/dashboard', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const [billingEntries, royaltyBatchEntries, payoutEntries, expenseEntries, royaltyReportEntries, payrollReports] = await Promise.all([
      kv.getEntriesByPrefix('billing:history:'),
      kv.getEntriesByPrefix('royalty-batch:'),
      kv.getEntriesByPrefix('payout:'),
      kv.getEntriesByPrefix('finance:expense:'),
      kv.getEntriesByPrefix('royalty-report:'),
      payrollService.payrollReports(),
    ]);

    // Filter out index entries for payouts (payout:user:x:y keys hold boolean, not objects)
    const allBillings = billingEntries.map((e: any) => e.value as any).filter(Boolean);
    const billings = allBillings.filter((b: any) => b?.status === 'completed');
    const pendingBillings = allBillings.filter((b: any) => b?.status === 'pending');
    const royaltyBatches = royaltyBatchEntries
      .filter((e: any) => {
        const parts = (e.key as string).split(':');
        return parts.length === 2; // only royalty-batch:{id}, not royalty-batch-report:* or royalty-batch-admin:*
      })
      .map((e: any) => e.value as any).filter(Boolean);
    const payouts = payoutEntries
      .filter((e: any) => {
        const key = e.key as string;
        return !key.includes(':user:') && typeof e.value === 'object' && e.value !== null && (e.value as any).id;
      })
      .map((e: any) => e.value as any);
    const expenses = expenseEntries.map((e: any) => e.value as FinanceExpenseRecord).filter(Boolean);
    const paidPayrollRuns = (payrollReports?.payrollSummary || []).filter((run: any) => run && run.runId && Number.isFinite(run.net));
    const royaltyReports = royaltyReportEntries
      .filter((e: any) => { const p = (e.key as string).split(':'); return p.length === 2; })
      .map((e: any) => e.value as any).filter(Boolean);

    // ── Revenue aggregations ──────────────────────────────────────────────
    let subRevMTD = 0, subRevYTD = 0, subRevAll = 0, prevYearSubRev = 0;
    for (const b of billings) {
      const d = b.createdAt || b.updatedAt || '';
      subRevAll += b.amount ?? 0;
      if (finIsYTD(d)) subRevYTD += b.amount ?? 0;
      if (finIsMTD(d)) subRevMTD += b.amount ?? 0;
      if (finIsPrevYear(d)) prevYearSubRev += b.amount ?? 0;
    }
    let royRevMTD = 0, royRevYTD = 0, royRevAll = 0, prevYearRoyRev = 0;
    for (const b of royaltyBatches) {
      const d = b.createdAt || '';
      royRevAll += b.totalRevenue ?? 0;
      if (finIsYTD(d)) royRevYTD += b.totalRevenue ?? 0;
      if (finIsMTD(d)) royRevMTD += b.totalRevenue ?? 0;
      if (finIsPrevYear(d)) prevYearRoyRev += b.totalRevenue ?? 0;
    }
    const revMTD = subRevMTD + royRevMTD;
    const revYTD = subRevYTD + royRevYTD;
    const revAll = subRevAll + royRevAll;

    // ── Payout aggregations ───────────────────────────────────────────────
    const completedPayouts = payouts.filter((p: any) => p.status === 'completed' || p.status === 'processing');
    const pendingPayoutsArr = payouts.filter((p: any) => p.status === 'pending');
    let payoutsMTD = 0, payoutsYTD = 0, payoutsAll = 0;
    for (const p of completedPayouts) {
      const d = p.createdAt || p.initiatedAt || '';
      payoutsAll += p.amount ?? 0;
      if (finIsYTD(d)) payoutsYTD += p.amount ?? 0;
      if (finIsMTD(d)) payoutsMTD += p.amount ?? 0;
    }
    const accountsPayable = pendingPayoutsArr.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);

    // ── Expense aggregations ──────────────────────────────────────────────
    let expMTD = 0, expYTD = 0, expAll = 0;
    const expByCat: Record<string, number> = {};
    for (const e of expenses) {
      const d = e.date || e.createdAt || '';
      expAll += e.amount ?? 0;
      if (finIsYTD(d)) expYTD += e.amount ?? 0;
      if (finIsMTD(d)) expMTD += e.amount ?? 0;
      expByCat[e.category] = (expByCat[e.category] ?? 0) + (e.amount ?? 0);
    }

    let payrollMTD = 0, payrollYTD = 0, payrollAll = 0;
    for (const run of paidPayrollRuns) {
      const amount = Number(run.net || 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const d = String(run.payDate || '');
      payrollAll += amount;
      if (finIsYTD(d)) payrollYTD += amount;
      if (finIsMTD(d)) payrollMTD += amount;
    }

    expMTD += payrollMTD;
    expYTD += payrollYTD;
    expAll += payrollAll;
    expByCat.payroll = (expByCat.payroll ?? 0) + payrollAll;

    // ── Derived totals ────────────────────────────────────────────────────
    const platformNetRevMTD = revMTD - payoutsMTD;
    const platformNetRevYTD = revYTD - payoutsYTD;
    const netIncomeMTD = revMTD - payoutsMTD - expMTD;
    const netIncomeYTD = revYTD - payoutsYTD - expYTD;
    const netIncomeAll = revAll - payoutsAll - expAll;
    const accountsReceivable = pendingBillings.reduce((s: number, b: any) => s + (b.amount ?? 0), 0);

    // ── Monthly Trend (last 12 months) ────────────────────────────────────
    const now = new Date();
    const monthMap = new Map<string, { revenue: number; payouts: number; expenses: number; netIncome: number }>();
    for (let i = 11; i >= 0; i--) {
      const d2 = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { revenue: 0, payouts: 0, expenses: 0, netIncome: 0 });
    }
    for (const b of billings) {
      const mk = finMonthKey(b.createdAt || '');
      if (monthMap.has(mk)) { const m = monthMap.get(mk)!; m.revenue += b.amount ?? 0; }
    }
    for (const b of royaltyBatches) {
      const mk = finMonthKey(b.createdAt || '');
      if (monthMap.has(mk)) { const m = monthMap.get(mk)!; m.revenue += b.totalRevenue ?? 0; }
    }
    for (const p of completedPayouts) {
      const mk = finMonthKey(p.createdAt || p.initiatedAt || '');
      if (monthMap.has(mk)) { const m = monthMap.get(mk)!; m.payouts += p.amount ?? 0; }
    }
    for (const e of expenses) {
      const mk = finMonthKey(e.date || e.createdAt || '');
      if (monthMap.has(mk)) { const m = monthMap.get(mk)!; m.expenses += e.amount ?? 0; }
    }
    for (const run of paidPayrollRuns) {
      const mk = finMonthKey(String(run.payDate || ''));
      if (monthMap.has(mk)) {
        const m = monthMap.get(mk)!;
        m.expenses += Number(run.net || 0);
      }
    }
    for (const [, m] of monthMap) { m.netIncome = m.revenue - m.payouts - m.expenses; }
    const revenueTrend = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));

    // ── Revenue Composition by DSP ────────────────────────────────────────
    const dspRevMap = new Map<string, number>();
    for (const r of royaltyReports) {
      const platform = (r.platform || 'Other').toLowerCase().replace(/[\s-]+/g, '_');
      dspRevMap.set(platform, (dspRevMap.get(platform) ?? 0) + (r.revenue ?? 0));
    }
    // Add subscription revenue bucket
    if (subRevAll > 0) dspRevMap.set('subscriptions', (dspRevMap.get('subscriptions') ?? 0) + subRevAll);
    const revenueComposition = [...dspRevMap.entries()].sort(([, a], [, b]) => b - a).map(([platform, revenue]) => ({ platform, revenue }));

    // ── Expense Breakdown ─────────────────────────────────────────────────
    const expenseBreakdown = Object.entries(expByCat).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

    // ── Cash Flow Waterfall ───────────────────────────────────────────────
    let runningTotal = 0;
    const cashFlowWaterfall = [
      (() => { const v = royRevYTD; runningTotal += v; return { label: 'DSP Revenue', value: v, base: 0, type: 'positive' }; })(),
      (() => { const base = runningTotal - royRevYTD; const v = subRevYTD; runningTotal += v; return { label: 'Subscriptions', value: v, base, type: 'positive' }; })(),
      (() => { const base = runningTotal - payoutsYTD; const v = payoutsYTD; runningTotal -= v; return { label: 'Artist Payouts', value: v, base, type: 'negative' }; })(),
      (() => { const base = runningTotal; const v = expYTD; runningTotal -= v; return { label: 'Op. Costs', value: v, base, type: 'negative' }; })(),
      { label: 'Net Balance', value: netIncomeYTD, base: 0, type: 'total' },
    ];

    // ── YoY Comparison ────────────────────────────────────────────────────
    const currentYear = String(now.getFullYear());
    const prevYear2 = String(now.getFullYear() - 1);
    const yoyMap = new Map<string, { current: number; previous: number }>();
    for (let m = 1; m <= 12; m++) { yoyMap.set(String(m).padStart(2, '0'), { current: 0, previous: 0 }); }
    for (const b of billings) {
      const d = b.createdAt || ''; const yr = d.slice(0, 4); const mo = d.slice(5, 7);
      if (yr === currentYear && yoyMap.has(mo)) yoyMap.get(mo)!.current += b.amount ?? 0;
      else if (yr === prevYear2 && yoyMap.has(mo)) yoyMap.get(mo)!.previous += b.amount ?? 0;
    }
    for (const b of royaltyBatches) {
      const d = b.createdAt || ''; const yr = d.slice(0, 4); const mo = d.slice(5, 7);
      if (yr === currentYear && yoyMap.has(mo)) yoyMap.get(mo)!.current += b.totalRevenue ?? 0;
      else if (yr === prevYear2 && yoyMap.has(mo)) yoyMap.get(mo)!.previous += b.totalRevenue ?? 0;
    }
    const yoyComparison = [...yoyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));

    // ── Quick Metrics ─────────────────────────────────────────────────────
    const grossMarginPct = revYTD > 0 ? (platformNetRevYTD / revYTD * 100) : 0;
    const operatingMarginPct = revYTD > 0 ? (netIncomeYTD / revYTD * 100) : 0;
    const totalTx = billings.length + royaltyBatches.length;
    const avgTransactionValue = totalTx > 0 ? revAll / totalTx : 0;
    const payoutRatioPct = revYTD > 0 ? (payoutsYTD / revYTD * 100) : 0;

    return c.json({
      kpis: {
        totalRevenue: { mtd: revMTD, ytd: revYTD, allTime: revAll },
        artistPayouts: { mtd: payoutsMTD, ytd: payoutsYTD, allTime: payoutsAll },
        platformNetRevenue: { mtd: platformNetRevMTD, ytd: platformNetRevYTD },
        operatingExpenses: { mtd: expMTD, ytd: expYTD, allTime: expAll },
        payrollSalaries: { mtd: payrollMTD, ytd: payrollYTD, allTime: payrollAll },
        netIncome: { mtd: netIncomeMTD, ytd: netIncomeYTD, allTime: netIncomeAll },
        cashFlow: { inflows: revYTD, outflows: payoutsYTD + expYTD, net: netIncomeYTD },
        accountsReceivable,
        accountsPayable,
      },
      charts: { revenueTrend, revenueComposition, expenseBreakdown, cashFlowWaterfall, yoyComparison },
      quickMetrics: {
        grossMarginPct: parseFloat(grossMarginPct.toFixed(2)),
        operatingMarginPct: parseFloat(operatingMarginPct.toFixed(2)),
        avgTransactionValue: Math.round(avgTransactionValue),
        payoutRatioPct: parseFloat(payoutRatioPct.toFixed(2)),
      },
      meta: {
        generatedAt: now.toISOString(),
        currency: 'NGN',
        dataRange: { billingRecords: billings.length, royaltyBatches: royaltyBatches.length, payouts: payouts.length, expenses: expenses.length, payrollRuns: paidPayrollRuns.length },
      },
    });
  } catch (err) {
    console.error('Finance dashboard error:', err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get('/make-server-79198001/admin/finance/expenses', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const entries = await kv.getEntriesByPrefix('finance:expense:');
    const expenses = entries.map((e: any) => e.value as FinanceExpenseRecord).filter(Boolean);
    expenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return c.json({ expenses });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/make-server-79198001/admin/finance/expenses', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const body = await c.req.json();
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const adminUserId = String(c.get('userId') || 'system');
    const id = crypto.randomUUID();
    const expense: FinanceExpenseRecord = {
      id,
      category: body.category ?? 'other',
      description: String(body.description ?? '').slice(0, 500),
      amount: Math.max(0, Number(body.amount) || 0),
      date: body.date || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      createdBy: adminEmail,
    };
    await kv.set(`finance:expense:${id}`, expense);
    await syncFinanceAutomation(adminUserId);
    return c.json({ expense }, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete('/make-server-79198001/admin/finance/expenses/:id', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const id = c.req.param('id');
    const adminUserId = String(c.get('userId') || 'system');
    const existing = await kv.get(`finance:expense:${id}`) as FinanceExpenseRecord | null;

    if (existing && Number(existing.amount) > 0) {
      try {
        await accountingService.createJournalEntry({
          entryDate: String(existing.date || existing.createdAt || new Date().toISOString()).slice(0, 10),
          debitAccountCode: '1000',
          creditAccountCode: finExpenseAccountCode(existing.category),
          debitAmount: Math.round(Number(existing.amount) * 100),
          creditAmount: Math.round(Number(existing.amount) * 100),
          description: `Expense reversal (deleted): ${String(existing.description || existing.category || id).slice(0, 120)}`,
          reference: `expense-reversal:${id}`,
          entryType: 'system',
          requiresApproval: false,
        }, adminUserId);
      } catch (entryError) {
        console.error('Failed to post expense reversal entry:', entryError);
      }
    }

    await kv.del(`finance:expense:${id}`);
    await syncFinanceAutomation(adminUserId);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get('/make-server-79198001/admin/finance/statements', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const [billingEntries, royaltyBatchEntries, payoutEntries, expenseEntries, payrollReports] = await Promise.all([
      kv.getEntriesByPrefix('billing:history:'),
      kv.getEntriesByPrefix('royalty-batch:'),
      kv.getEntriesByPrefix('payout:'),
      kv.getEntriesByPrefix('finance:expense:'),
      payrollService.payrollReports(),
    ]);
    const billings = billingEntries.map((e: any) => e.value as any).filter((b: any) => b?.status === 'completed');
    const royaltyBatches = royaltyBatchEntries
      .filter((e: any) => (e.key as string).split(':').length === 2)
      .map((e: any) => e.value as any).filter(Boolean);
    const payouts = payoutEntries
      .filter((e: any) => !(e.key as string).includes(':user:') && (e.value as any)?.id && ['completed', 'processing'].includes((e.value as any).status))
      .map((e: any) => e.value as any);
    const expenses = expenseEntries.map((e: any) => e.value as FinanceExpenseRecord).filter(Boolean);
    const payrollTotal = (payrollReports?.payrollSummary || []).reduce((s: number, run: any) => s + (Number(run?.net) || 0), 0);
    const subRev = billings.reduce((s: number, b: any) => s + (b.amount ?? 0), 0);
    const dspRev = royaltyBatches.reduce((s: number, b: any) => s + (b.totalRevenue ?? 0), 0);
    const totalRev = subRev + dspRev;
    const totalPay = payouts.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    const totalExp = expenses.reduce((s: number, e: any) => s + (e.amount ?? 0), 0) + payrollTotal;
    const netIncome2 = totalRev - totalPay - totalExp;
    const lines = [
      'TRIAL BALANCE — AMTDISTRO',
      `Generated: ${new Date().toUTCString()}`,
      '',
      'Account,Debit (NGN),Credit (NGN)',
      `Subscription & Release Revenue,,${subRev.toFixed(2)}`,
      `DSP Royalty Revenue,,${dspRev.toFixed(2)}`,
      `Artist Payouts,${totalPay.toFixed(2)},`,
      `Staff Salaries & Payroll,${payrollTotal.toFixed(2)},`,
      `Operating Expenses,${totalExp.toFixed(2)},`,
      netIncome2 >= 0
        ? `Net Income,,${netIncome2.toFixed(2)}`
        : `Net Loss,${(-netIncome2).toFixed(2)},`,
      '',
      `TOTALS,${(totalPay + totalExp + Math.max(0, -netIncome2)).toFixed(2)},${(totalRev + Math.max(0, netIncome2)).toFixed(2)}`,
    ];
    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="trial-balance-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ==================== HR MANAGEMENT ====================

app.get('/make-server-79198001/admin/hr/overview', verifyAuth, verifyAdmin, requirePermission('users.view'), async (c) => {
  try {
    const existingStaff = await loadHrStaff();
    const existingDepartments = await loadHrDepartments();
    const existingRoles = await loadHrRoles();
    const nowDate = new Date();
    const nextStaff: HrStaffRecord[] = [];
    let changed = false;

    for (const item of existingStaff) {
      const normalized = normalizeHrStaff(item, existingStaff.length, item.createdBy || 'system');
      const accrued = applyLeaveAccrualIfDue(normalized, nowDate);
      if (accrued.changed) changed = true;
      nextStaff.push(accrued.staff);
    }

    const departmentSeedNames = Array.from(new Set(nextStaff.map((s) => String(s.department || '').trim()).filter(Boolean)));
    const roleSeedPairs = Array.from(new Set(nextStaff.map((s) => `${String(s.department || '').trim()}|||${String(s.role || '').trim()}|||${String(s.payGrade || 'PG-1A').trim()}`)));

    let departments = existingDepartments.slice();
    for (const deptName of departmentSeedNames) {
      const exists = departments.some((d) => d.name.toLowerCase() === deptName.toLowerCase());
      if (!exists) {
        departments.push(normalizeHrDepartment({ name: deptName, description: `Auto-created from staff records` }, 'system'));
        changed = true;
      }
    }

    let roles = existingRoles.slice();
    for (const pair of roleSeedPairs) {
      const [department, roleName, defaultPayGrade] = pair.split('|||');
      if (!roleName) continue;
      const exists = roles.some((r) => r.department.toLowerCase() === department.toLowerCase() && r.name.toLowerCase() === roleName.toLowerCase());
      if (!exists) {
        roles.push(normalizeHrRole({ department, name: roleName, defaultPayGrade }, 'system'));
        changed = true;
      }
    }

    if (changed) {
      await saveHrStaff(nextStaff);
      await saveHrDepartments(departments);
      await saveHrRoles(roles);
    }

    const auditTrail = await loadHrAuditLog();
    const staff = nextStaff;
    const active = staff.filter((s) => s.status === 'active').length;
    const onLeave = staff.filter((s) => s.status === 'on_leave').length;
    const payrollTotal = staff.filter((s) => s.status !== 'terminated').reduce((sum, s) => sum + (s.baseSalary || 0), 0);
    const pendingPromotions = staff.filter((s) => s.promotionStatus === 'requested' || s.promotionStatus === 'reviewing').length;

    const roleDistribution = Object.entries(
      staff.reduce((acc: Record<string, number>, s) => {
        acc[s.role] = (acc[s.role] || 0) + 1;
        return acc;
      }, {})
    ).map(([role, count]) => ({ role, count }));

    const departmentDistribution = Object.entries(
      staff.reduce((acc: Record<string, number>, s) => {
        acc[s.department] = (acc[s.department] || 0) + 1;
        return acc;
      }, {})
    ).map(([department, count]) => ({ department, count }));

    const deptPayrollByName = staff
      .filter((s) => s.status !== 'terminated')
      .reduce((acc: Record<string, number>, s) => {
        const key = s.department;
        acc[key] = (acc[key] || 0) + Number(s.baseSalary || 0);
        return acc;
      }, {});

    const departmentFinanceLinks = departments
      .map((dept) => ({
        id: dept.id,
        name: dept.name,
        costCenterCode: dept.costCenterCode,
        expenseAccount: dept.expenseAccount,
        revenueAccount: dept.revenueAccount,
        monthlyPayroll: Number((deptPayrollByName[dept.name] || 0)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return c.json({
      staff,
      metrics: {
        totalStaff: staff.length,
        activeStaff: active,
        onLeave,
        monthlyPayroll: payrollTotal,
        pendingPromotions,
      },
      roleDistribution,
      departmentDistribution,
      payGrades: Array.from(new Set(staff.map((s) => s.payGrade))).sort(),
      departments: departments.sort((a, b) => a.name.localeCompare(b.name)),
      roles: roles.sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name)),
      departmentFinanceLinks,
      auditTrail: auditTrail.slice(0, 100),
    });
  } catch (error) {
    console.error('Error fetching HR overview:', error);
    return c.json({ error: `Failed to fetch HR overview: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/hr/departments', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const body = await c.req.json();
    const normalized = normalizeHrDepartment(body || {}, adminEmail);
    if (!normalized.name) {
      return c.json({ error: 'name is required' }, 400);
    }

    const departments = await loadHrDepartments();
    const idx = departments.findIndex((d) => d.id === normalized.id || d.name.toLowerCase() === normalized.name.toLowerCase());
    if (idx >= 0) {
      departments[idx] = {
        ...departments[idx],
        ...normalized,
        createdAt: departments[idx].createdAt,
      };
    } else {
      departments.unshift(normalized);
    }

    await saveHrDepartments(departments);
    await logHrAudit('SYSTEM', 'department.upserted', adminEmail, {
      name: normalized.name,
      costCenterCode: normalized.costCenterCode,
      expenseAccount: normalized.expenseAccount,
      revenueAccount: normalized.revenueAccount,
    });
    return c.json({ departments });
  } catch (error) {
    console.error('Error upserting HR department:', error);
    return c.json({ error: `Failed to save department: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/hr/roles', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const body = await c.req.json();
    const normalized = normalizeHrRole(body || {}, adminEmail);
    if (!normalized.name || !normalized.department) {
      return c.json({ error: 'name and department are required' }, 400);
    }

    const roles = await loadHrRoles();
    const idx = roles.findIndex((r) => r.id === normalized.id || (r.department.toLowerCase() === normalized.department.toLowerCase() && r.name.toLowerCase() === normalized.name.toLowerCase()));
    if (idx >= 0) {
      roles[idx] = {
        ...roles[idx],
        ...normalized,
        createdAt: roles[idx].createdAt,
      };
    } else {
      roles.unshift(normalized);
    }

    await saveHrRoles(roles);
    await logHrAudit('SYSTEM', 'role.upserted', adminEmail, {
      name: normalized.name,
      department: normalized.department,
      defaultPayGrade: normalized.defaultPayGrade,
    });
    return c.json({ roles });
  } catch (error) {
    console.error('Error upserting HR role:', error);
    return c.json({ error: `Failed to save role: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/hr/staff', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const body = await c.req.json();
    const staff = await loadHrStaff();
    const departments = await loadHrDepartments();
    const roles = await loadHrRoles();

    const normalized = normalizeHrStaff(body || {}, staff.length, adminEmail);
    if (!normalized.fullName || !normalized.email || !normalized.department || !normalized.role) {
      return c.json({ error: 'fullName, email, department, and role are required' }, 400);
    }

    const idx = staff.findIndex((s) => s.id === normalized.id || s.staffId === normalized.staffId || s.email === normalized.email);
    if (idx >= 0) {
      const merged = {
        ...staff[idx],
        ...normalized,
        benefits: { ...staff[idx].benefits, ...normalized.benefits },
        entitlements: { ...staff[idx].entitlements, ...normalized.entitlements },
        tax: { ...staff[idx].tax, ...normalized.tax },
        bank: { ...staff[idx].bank, ...normalized.bank },
        createdAt: staff[idx].createdAt,
        updatedAt: hrNowIso(),
      } as HrStaffRecord;
      const payrollEmployeeId = await syncHrStaffToPayroll(merged);
      merged.payrollEmployeeId = payrollEmployeeId;
      staff[idx] = merged;
      await logHrAudit(merged.staffId, 'staff.updated', adminEmail, {
        role: merged.role,
        department: merged.department,
        payGrade: merged.payGrade,
      });
    } else {
      normalized.payrollEmployeeId = await syncHrStaffToPayroll(normalized);
      staff.unshift(normalized);
      await logHrAudit(normalized.staffId, 'staff.created', adminEmail, {
        role: normalized.role,
        department: normalized.department,
        payGrade: normalized.payGrade,
      });
    }

    const hasDepartment = departments.some((d) => d.name.toLowerCase() === normalized.department.toLowerCase());
    if (!hasDepartment) {
      departments.push(normalizeHrDepartment({ name: normalized.department, description: 'Auto-created from staff profile' }, adminEmail));
      await saveHrDepartments(departments);
    }
    const hasRole = roles.some((r) => r.department.toLowerCase() === normalized.department.toLowerCase() && r.name.toLowerCase() === normalized.role.toLowerCase());
    if (!hasRole) {
      roles.push(normalizeHrRole({ name: normalized.role, department: normalized.department, defaultPayGrade: normalized.payGrade }, adminEmail));
      await saveHrRoles(roles);
    }

    await saveHrStaff(staff);
    return c.json({ staff });
  } catch (error) {
    console.error('Error upserting HR staff:', error);
    return c.json({ error: `Failed to save HR staff: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.patch('/make-server-79198001/admin/hr/staff/:id/status', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const id = c.req.param('id');
    const body = await c.req.json();
    const nextStatus = String(body?.status || '').toLowerCase();
    if (!['active', 'inactive', 'on_leave', 'terminated'].includes(nextStatus)) {
      return c.json({ error: 'status must be active, inactive, on_leave, or terminated' }, 400);
    }

    const staff = await loadHrStaff();
    const idx = staff.findIndex((s) => s.id === id || s.staffId === id);
    if (idx === -1) {
      return c.json({ error: 'Staff not found' }, 404);
    }

    staff[idx] = {
      ...staff[idx],
      status: nextStatus as HrStaffRecord['status'],
      updatedAt: hrNowIso(),
    };
    staff[idx].payrollEmployeeId = await syncHrStaffToPayroll(staff[idx]);
    await logHrAudit(staff[idx].staffId, 'staff.status.changed', adminEmail, {
      status: staff[idx].status,
    });

    await saveHrStaff(staff);
    return c.json({ staff: staff[idx] });
  } catch (error) {
    console.error('Error updating HR status:', error);
    return c.json({ error: `Failed to update staff status: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/hr/salary-increase', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const body = await c.req.json();
    const increasePct = Number(body?.increasePct);
    const department = String(body?.department || 'all').trim();
    const status = String(body?.status || 'all').toLowerCase();
    const reason = String(body?.reason || '').slice(0, 300);

    if (!Number.isFinite(increasePct) || increasePct <= 0) {
      return c.json({ error: 'increasePct must be a positive number' }, 400);
    }
    if (!['all', 'active', 'inactive', 'on_leave'].includes(status)) {
      return c.json({ error: 'status must be one of all, active, inactive, or on_leave' }, 400);
    }

    const staff = await loadHrStaff();
    const targetIndexes: number[] = [];
    for (let i = 0; i < staff.length; i += 1) {
      const member = staff[i];
      if (member.status === 'terminated') continue;
      if (department !== 'all' && member.department !== department) continue;
      if (status !== 'all' && member.status !== status) continue;
      targetIndexes.push(i);
    }

    if (targetIndexes.length === 0) {
      return c.json({ updatedCount: 0, totalIncrement: 0, staff });
    }

    let totalIncrement = 0;
    for (const idx of targetIndexes) {
      const current = staff[idx];
      const previousSalary = Number(current.baseSalary || 0);
      const nextSalary = Math.round(previousSalary * (1 + increasePct / 100));
      totalIncrement += Math.max(0, nextSalary - previousSalary);

      const updated: HrStaffRecord = {
        ...current,
        baseSalary: nextSalary,
        updatedAt: hrNowIso(),
      };

      updated.payrollEmployeeId = await syncHrStaffToPayroll(updated);
      staff[idx] = updated;

      await logHrAudit(updated.staffId, 'salary.bulk.increase', adminEmail, {
        increasePct,
        previousSalary,
        nextSalary,
        department: department === 'all' ? undefined : department,
        status: status === 'all' ? undefined : status,
        reason,
      });
    }

    await saveHrStaff(staff);
    return c.json({
      updatedCount: targetIndexes.length,
      totalIncrement,
      increasePct,
      staff,
    });
  } catch (error) {
    console.error('Error applying HR salary increase:', error);
    return c.json({ error: `Failed to apply salary increase: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/hr/staff/:id/promotions/request', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const id = c.req.param('id');
    const body = await c.req.json();
    const staff = await loadHrStaff();
    const idx = staff.findIndex((s) => s.id === id || s.staffId === id);
    if (idx === -1) {
      return c.json({ error: 'Staff not found' }, 404);
    }

    const current = staff[idx];
    const requested = {
      ...current,
      promotionStatus: 'requested' as const,
      promotionRequest: {
        requestedBy: adminEmail,
        requestedAt: hrNowIso(),
        currentRole: current.role,
        requestedRole: String(body?.newRole || current.role),
        currentPayGrade: current.payGrade,
        requestedPayGrade: String(body?.newPayGrade || current.payGrade),
        salaryIncreasePct: Math.max(0, Number(body?.salaryIncreasePct) || 0),
        reason: String(body?.reason || '').slice(0, 300),
      },
      updatedAt: hrNowIso(),
    };

    staff[idx] = requested;
    await saveHrStaff(staff);
    await logHrAudit(requested.staffId, 'promotion.requested', adminEmail, {
      requestedRole: requested.promotionRequest?.requestedRole,
      requestedPayGrade: requested.promotionRequest?.requestedPayGrade,
      salaryIncreasePct: requested.promotionRequest?.salaryIncreasePct,
    });
    return c.json({ staff: requested });
  } catch (error) {
    console.error('Error requesting promotion:', error);
    return c.json({ error: `Failed to request promotion: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/hr/staff/:id/promotions/review', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const id = c.req.param('id');
    const staff = await loadHrStaff();
    const idx = staff.findIndex((s) => s.id === id || s.staffId === id);
    if (idx === -1) {
      return c.json({ error: 'Staff not found' }, 404);
    }
    if (!staff[idx].promotionRequest) {
      return c.json({ error: 'No promotion request found for this staff member' }, 400);
    }

    staff[idx] = {
      ...staff[idx],
      promotionStatus: 'reviewing',
      promotionRequest: {
        ...staff[idx].promotionRequest,
        reviewedBy: adminEmail,
        reviewedAt: hrNowIso(),
      },
      updatedAt: hrNowIso(),
    };

    await saveHrStaff(staff);
    await logHrAudit(staff[idx].staffId, 'promotion.reviewed', adminEmail);
    return c.json({ staff: staff[idx] });
  } catch (error) {
    console.error('Error reviewing promotion:', error);
    return c.json({ error: `Failed to review promotion: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/hr/staff/:id/promotions/approve', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const id = c.req.param('id');
    const body = await c.req.json();
    const staff = await loadHrStaff();
    const idx = staff.findIndex((s) => s.id === id || s.staffId === id);
    if (idx === -1) {
      return c.json({ error: 'Staff not found' }, 404);
    }

    const current = staff[idx];
    if (!current.promotionRequest) {
      return c.json({ error: 'No promotion request found for this staff member' }, 400);
    }

    const increasePct = Math.max(0, Number(body?.salaryIncreasePct ?? current.promotionRequest.salaryIncreasePct) || 0);
    const promoted = {
      ...current,
      role: String(body?.newRole || current.promotionRequest.requestedRole || current.role),
      payGrade: String(body?.newPayGrade || current.promotionRequest.requestedPayGrade || current.payGrade),
      promotionStatus: 'approved' as const,
      baseSalary: Math.round(current.baseSalary * (1 + increasePct / 100)),
      promotionRequest: {
        ...current.promotionRequest,
        approvedBy: adminEmail,
        approvedAt: hrNowIso(),
      },
      updatedAt: hrNowIso(),
    };

    promoted.payrollEmployeeId = await syncHrStaffToPayroll(promoted);
    staff[idx] = promoted;
    await saveHrStaff(staff);
    await logHrAudit(promoted.staffId, 'promotion.approved', adminEmail, {
      newRole: promoted.role,
      newPayGrade: promoted.payGrade,
      salaryIncreasePct: increasePct,
    });
    return c.json({ staff: promoted });
  } catch (error) {
    console.error('Error approving promotion:', error);
    return c.json({ error: `Failed to approve promotion: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/hr/staff/:id/promotions/reject', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const adminEmail = (c as any).get?.('adminEmail') || 'admin';
    const id = c.req.param('id');
    const body = await c.req.json();
    const staff = await loadHrStaff();
    const idx = staff.findIndex((s) => s.id === id || s.staffId === id);
    if (idx === -1) {
      return c.json({ error: 'Staff not found' }, 404);
    }
    if (!staff[idx].promotionRequest) {
      return c.json({ error: 'No promotion request found for this staff member' }, 400);
    }

    staff[idx] = {
      ...staff[idx],
      promotionStatus: 'rejected',
      promotionRequest: {
        ...staff[idx].promotionRequest,
        reviewedBy: adminEmail,
        reviewedAt: hrNowIso(),
        rejectionReason: String(body?.reason || '').slice(0, 300),
      },
      updatedAt: hrNowIso(),
    };

    await saveHrStaff(staff);
    await logHrAudit(staff[idx].staffId, 'promotion.rejected', adminEmail, {
      reason: staff[idx].promotionRequest?.rejectionReason,
    });
    return c.json({ staff: staff[idx] });
  } catch (error) {
    console.error('Error rejecting promotion:', error);
    return c.json({ error: `Failed to reject promotion: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Backward compatibility endpoint for existing callers that still use /promote
app.post('/make-server-79198001/admin/hr/staff/:id/promote', verifyAuth, verifyAdmin, requirePermission('users.edit'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const result = await (async () => {
      const adminEmail = (c as any).get?.('adminEmail') || 'admin';
      const staff = await loadHrStaff();
      const idx = staff.findIndex((s) => s.id === id || s.staffId === id);
      if (idx === -1) return c.json({ error: 'Staff not found' }, 404);
      const current = staff[idx];
      const increasePct = Math.max(0, Number(body?.salaryIncreasePct) || 0);
      const promoted = {
        ...current,
        role: String(body?.newRole || current.role),
        payGrade: String(body?.newPayGrade || current.payGrade),
        promotionStatus: 'approved' as const,
        baseSalary: Math.round(current.baseSalary * (1 + increasePct / 100)),
        promotionRequest: {
          ...(current.promotionRequest || {
            requestedBy: adminEmail,
            requestedAt: hrNowIso(),
            currentRole: current.role,
            requestedRole: String(body?.newRole || current.role),
            currentPayGrade: current.payGrade,
            requestedPayGrade: String(body?.newPayGrade || current.payGrade),
            salaryIncreasePct: increasePct,
            reason: 'Legacy direct promotion action',
          }),
          approvedBy: adminEmail,
          approvedAt: hrNowIso(),
        },
        updatedAt: hrNowIso(),
      };
      promoted.payrollEmployeeId = await syncHrStaffToPayroll(promoted);
      staff[idx] = promoted;
      await saveHrStaff(staff);
      await logHrAudit(promoted.staffId, 'promotion.approved', adminEmail, {
        legacyEndpoint: true,
        newRole: promoted.role,
        newPayGrade: promoted.payGrade,
        salaryIncreasePct: increasePct,
      });
      return c.json({ staff: promoted });
    })();
    return result;
  } catch (error) {
    console.error('Error promoting staff:', error);
    return c.json({ error: `Failed to promote staff: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// ==================== PAYROLL MANAGEMENT ====================

app.get('/make-server-79198001/admin/payroll/overview', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const overview = await payrollService.getOverview();
    const staff = await loadHrStaff();
    if (staff.length > 0) {
      const byStaffId = new Map(staff.map((s) => [s.staffId, s]));
      const byName = new Map(staff.map((s) => [s.fullName.toLowerCase(), s]));
      overview.employees = overview.employees.map((employee: any) => {
        const linked = byStaffId.get(employee.employeeId) || byName.get(String(employee.name || '').toLowerCase());
        if (!linked) return employee;
        return {
          ...employee,
          department: linked.department,
          position: linked.role,
          salary: linked.baseSalary,
          currency: linked.currency,
          status: linked.status === 'terminated' ? 'inactive' : linked.status,
          personalInfo: {
            ...employee.personalInfo,
            email: linked.email,
            phone: linked.phone,
            taxId: linked.tax.taxId,
          },
          taxInfo: {
            ...employee.taxInfo,
            state: linked.tax.stateCode,
          },
          directDeposit: {
            ...employee.directDeposit,
            bankName: linked.bank.bankName,
            accountNumberMasked: linked.bank.accountNumber,
            routingNumberMasked: linked.bank.bankCode,
          },
          benefits: {
            ...employee.benefits,
            housingAllowance: linked.benefits.housingAllowance,
            transportAllowance: linked.benefits.transportAllowance,
            mealAllowance: linked.benefits.mealAllowance,
            pensionEmployeePercent: linked.benefits.pensionPercent,
            nhfEmployeePercent: linked.benefits.nhfPercent,
            retirement401kEnabled: false,
            retirement401kPercent: 0,
            retirement401kEmployerMatchPercent: 0,
          },
        };
      });
      overview.dashboard.employeeCount = overview.employees.length;
      overview.dashboard.activeEmployees = overview.employees.filter((e: any) => e.status === 'active').length;
    }
    return c.json(overview);
  } catch (error) {
    console.error('Error loading payroll overview:', error);
    return c.json({ error: `Failed to load payroll overview: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.put('/make-server-79198001/admin/payroll/config', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const body = await c.req.json();
    const config = await payrollService.saveConfig(body || {});
    return c.json({ config });
  } catch (error) {
    console.error('Error saving payroll config:', error);
    return c.json({ error: `Failed to save payroll config: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/payroll/employees', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const body = await c.req.json();
    const employees = await payrollService.upsertEmployee(body || {});

    const latest = employees.find((e: any) => e.id === body?.id)
      || employees.find((e: any) => e.employeeId === body?.employeeId)
      || employees.find((e: any) => e.name === body?.name);

    if (latest) {
      const adminEmail = (c as any).get?.('adminEmail') || 'admin';
      const staff = await loadHrStaff();
      const staffIndex = staff.findIndex((s) => s.payrollEmployeeId === latest.id || s.staffId === latest.employeeId || s.email === latest.personalInfo?.email);
      const normalized = normalizeHrStaff({
        ...(staffIndex >= 0 ? staff[staffIndex] : {}),
        staffId: latest.employeeId,
        payrollEmployeeId: latest.id,
        fullName: latest.name,
        email: latest.personalInfo?.email || '',
        phone: latest.personalInfo?.phone || '',
        department: latest.department,
        role: latest.position,
        manager: latest.employmentDetails?.manager || '',
        employmentType: latest.employmentDetails?.employmentType || 'full_time',
        status: latest.status,
        joinDate: latest.hireDate,
        payGrade: (staffIndex >= 0 ? staff[staffIndex].payGrade : 'PG-1'),
        baseSalary: Number(latest.salary || latest.compensation?.baseSalary || 0),
        currency: latest.currency || 'NGN',
        tax: {
          taxId: latest.personalInfo?.taxId || '',
          stateCode: latest.taxInfo?.state || 'LA',
        },
        bank: {
          bankName: latest.directDeposit?.bankName || '',
          accountNumber: latest.directDeposit?.accountNumberMasked || '',
          bankCode: latest.directDeposit?.routingNumberMasked || '',
        },
      }, staff.length, adminEmail);

      if (staffIndex >= 0) {
        staff[staffIndex] = {
          ...staff[staffIndex],
          ...normalized,
          createdAt: staff[staffIndex].createdAt,
          updatedAt: hrNowIso(),
        };
      } else {
        staff.unshift(normalized);
      }
      await saveHrStaff(staff);
    }

    return c.json({ employees });
  } catch (error) {
    console.error('Error saving payroll employee:', error);
    return c.json({ error: `Failed to save payroll employee: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/payroll/timesheets', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const body = await c.req.json();
    if (!body.periodId || !body.employeeId) {
      return c.json({ error: 'periodId and employeeId are required' }, 400);
    }
    const timesheets = await payrollService.saveTimesheet(body);
    return c.json({ timesheets });
  } catch (error) {
    console.error('Error saving payroll timesheet:', error);
    return c.json({ error: `Failed to save payroll timesheet: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/payroll/timesheets/review', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const body = await c.req.json();
    if (!body.periodId || !body.employeeId || !body.status) {
      return c.json({ error: 'periodId, employeeId, and status are required' }, 400);
    }
    if (body.status !== 'approved' && body.status !== 'rejected') {
      return c.json({ error: 'status must be approved or rejected' }, 400);
    }
    const approvedBy = c.get('userId') as string;
    const item = await payrollService.reviewTimesheet(body.periodId, body.employeeId, body.status, approvedBy, body.managerComment);
    return c.json({ timesheet: item });
  } catch (error) {
    console.error('Error reviewing payroll timesheet:', error);
    return c.json({ error: `Failed to review payroll timesheet: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/payroll/runs/calculate', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const body = await c.req.json();
    if (!body.startDate || !body.endDate || !body.payDate || !body.payFrequency) {
      return c.json({ error: 'startDate, endDate, payDate, and payFrequency are required' }, 400);
    }
    const run = await payrollService.calculateRun({
      startDate: body.startDate,
      endDate: body.endDate,
      payDate: body.payDate,
      payFrequency: body.payFrequency,
      paymentMethod: body.paymentMethod,
      preparedBy: c.get('userId') as string,
    });
    return c.json({ run });
  } catch (error) {
    console.error('Error calculating payroll run:', error);
    return c.json({ error: `Failed to calculate payroll run: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/payroll/runs/:runId/transition', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const runId = c.req.param('runId');
    const body = await c.req.json();
    if (!body.action) {
      return c.json({ error: 'action is required' }, 400);
    }
    const actorId = c.get('userId') as string;
    const run = await payrollService.transitionRun(runId, body.action, actorId, body.paymentMethod);
    if (body.action === 'pay' || body.action === 'lock') {
      await syncFinanceAutomation(actorId);
    }
    return c.json({ run });
  } catch (error) {
    console.error('Error transitioning payroll run:', error);
    return c.json({ error: `Failed to transition payroll run: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/payroll/runs/:runId/retry-failed', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const runId = c.req.param('runId');
    const actorId = String(c.get('userId') || 'system');
    const run = await payrollService.retryFailedPayments(runId);
    await syncFinanceAutomation(actorId);
    return c.json({ run });
  } catch (error) {
    console.error('Error retrying failed payroll payments:', error);
    return c.json({ error: `Failed to retry failed payroll payments: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get('/make-server-79198001/admin/payroll/runs/:runId/pay-stubs', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const runId = c.req.param('runId');
    const stubs = await payrollService.getPayStubs(runId);
    return c.json({ stubs });
  } catch (error) {
    console.error('Error fetching payroll stubs:', error);
    return c.json({ error: `Failed to fetch payroll stubs: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get('/make-server-79198001/admin/payroll/tax-summary', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const yearInput = c.req.query('year');
    const year = Number(yearInput) || new Date().getFullYear();
    const summary = await payrollService.taxSummary(year);
    return c.json({ summary });
  } catch (error) {
    console.error('Error fetching payroll tax summary:', error);
    return c.json({ error: `Failed to fetch payroll tax summary: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/payroll/tax-year/close', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const body = await c.req.json();
    const year = Number(body?.year);
    if (!year) {
      return c.json({ error: 'year is required' }, 400);
    }
    const result = await payrollService.closeTaxYear(year);
    return c.json({ result });
  } catch (error) {
    console.error('Error closing payroll tax year:', error);
    return c.json({ error: `Failed to close payroll tax year: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.get('/make-server-79198001/admin/payroll/reports', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const reports = await payrollService.payrollReports();
    return c.json({ reports });
  } catch (error) {
    console.error('Error loading payroll reports:', error);
    return c.json({ error: `Failed to load payroll reports: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// END FINANCIAL DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS  — user-facing bell + email
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper used throughout the server to insert an in-app notification for a
 * user AND (optionally) enqueue an email job.
 *
 * type: 'info' | 'release' | 'earnings' | 'news' | 'promo' | 'alert'
 */
async function sendNotification(opts: {
  userId: string;
  title: string;
  body: string;
  type?: string;
  link?: string;
  sendEmail?: boolean;
  emailSubject?: string;
}) {
  try {
    await supabase.from('user_notifications').insert({
      user_id: opts.userId,
      title: opts.title,
      body: opts.body,
      type: opts.type ?? 'info',
      link: opts.link ?? null,
    });

    if (opts.sendEmail) {
      await queueService.enqueueJob('email_notification', {
        userId: opts.userId,
        subject: opts.emailSubject ?? opts.title,
        body: opts.body,
      }).catch(() => {/* non-critical */});
    }
  } catch (err) {
    console.error('[sendNotification] error:', err);
  }
}

// GET /notifications — fetch current user's notifications (newest first)
app.get('/make-server-79198001/notifications', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return c.json({ notifications: data ?? [] });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({ error: `Failed to fetch notifications: ${(error as Error).message}` }, 500);
  }
});

// PATCH /notifications/:id/read — mark one notification as read
app.patch('/make-server-79198001/notifications/:id/read', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId);  // RLS double-check
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: `Failed to mark notification read: ${(error as Error).message}` }, 500);
  }
});

// PATCH /notifications/read-all — mark all as read
app.patch('/make-server-79198001/notifications/read-all', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: `Failed to mark all read: ${(error as Error).message}` }, 500);
  }
});

// POST /notifications/send — admin/service endpoint to push a notification to any user
app.post('/make-server-79198001/notifications/send', verifyAuth, verifyAdmin, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.userId || !body.title || !body.message) {
      return c.json({ error: 'userId, title, and message are required' }, 400);
    }
    await sendNotification({
      userId: body.userId,
      title: body.title,
      body: body.message,
      type: typeof body.type === 'string' ? body.type : 'info',
      link: typeof body.link === 'string' ? body.link : undefined,
      sendEmail: body.sendEmail === true,
      emailSubject: typeof body.emailSubject === 'string' ? body.emailSubject : undefined,
    });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: `Failed to send notification: ${(error as Error).message}` }, 500);
  }
});

// ==================== SMART LINKS ANALYTICS ====================

// POST /smart-links/click — record a click event for a smart link
app.post("/make-server-79198001/smart-links/click", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { linkId, platform, deviceType, os, country, referrer } = body;

    if (!linkId || !platform || !deviceType || !os) {
      return c.json({ error: 'linkId, platform, deviceType, and os are required' }, 400);
    }

    const event = await smartLinksService.recordClickEvent(
      linkId,
      userId,
      {
        platform,
        deviceType: deviceType as 'mobile' | 'tablet' | 'desktop',
        os,
        country: country || undefined,
        referrer: referrer || undefined,
      }
    );

    return c.json({ event, success: true });
  } catch (error) {
    console.error('Error recording click event:', error);
    return c.json({ error: `Failed to record click event: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// GET /smart-links/:linkId/analytics — get aggregated analytics for a smart link
app.get("/make-server-79198001/smart-links/:linkId/analytics", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const linkId = c.req.param('linkId');
    const days = parseInt(c.req.query('range') || '7', 10);

    // Validate days parameter
    if (![7, 14, 30, 90].includes(days)) {
      return c.json({ error: 'Invalid range. Must be 7, 14, 30, or 90' }, 400);
    }

    const analytics = await smartLinksService.getSmartLinkAnalytics(
      linkId,
      userId,
      days
    );

    return c.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return c.json({ error: `Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Wire sendNotification into existing release / earnings events
// ─────────────────────────────────────────────────────────────────────────────
// These are lightweight fire-and-forget calls added inline; if they fail the
// main operation is not affected.

// (Exported so callers within this module can reuse it)
export { sendNotification };

// ─────────────────────────────────────────────────────────────────────────────
// Admin API Routes
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/users — get all admin users
app.get('/make-server-79198001/admin/users', verifyAuth, async (c) => {
  try {
    const admins = await adminService.getAllAdminUsers();
    return c.json({ admins });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return c.json({ error: `Failed to fetch admin users: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// GET /admin/users/:userId — get specific admin user
app.get('/make-server-79198001/admin/users/:userId', verifyAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    const admin = await adminService.getAdminByUserId(userId);
    
    if (!admin) {
      return c.json({ error: 'Admin user not found' }, 404);
    }
    
    return c.json({ adminUser: admin });
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return c.json({ error: `Failed to fetch admin user: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// POST /admin/users — create admin user
app.post('/make-server-79198001/admin/users', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.userId || typeof body.userId !== 'string') {
      return c.json({ error: 'userId is required' }, 400);
    }

    if (!body.role || typeof body.role !== 'string') {
      return c.json({ error: 'role is required' }, 400);
    }

    const admin = await adminService.createAdminUser(
      body.userId,
      body.role,
      userId,
      body.department
    );

    return c.json({ adminUser: admin });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return c.json({ error: `Failed to create admin user: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// PUT /admin/users/:userId/role — update admin role
app.put('/make-server-79198001/admin/users/:userId/role', verifyAuth, async (c) => {
  try {
    const currentUserId = c.get('userId');
    const targetUserId = c.req.param('userId');
    const body = await c.req.json();

    if (!body.role || typeof body.role !== 'string') {
      return c.json({ error: 'role is required' }, 400);
    }

    const admin = await adminService.updateAdminRole(targetUserId, body.role, currentUserId);
    
    if (!admin) {
      return c.json({ error: 'Admin user not found' }, 404);
    }

    return c.json({ adminUser: admin });
  } catch (error) {
    console.error('Error updating admin role:', error);
    return c.json({ error: `Failed to update admin role: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// DELETE /admin/users/:userId — delete admin user
app.delete('/make-server-79198001/admin/users/:userId', verifyAuth, async (c) => {
  try {
    const currentUserId = c.get('userId');
    const targetUserId = c.req.param('userId');

    await adminService.deleteAdminUser(targetUserId, currentUserId);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return c.json({ error: `Failed to delete admin user: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// ==================== SUPPORT TICKET ROUTES ====================

// POST /support/tickets - Create a new support ticket (public or authenticated)
app.post('/make-server-79198001/support/tickets', async (c) => {
  try {
    await resolvePortalActor(c, false);
    const body = await c.req.json();
    const { subject, category, message, priority } = body;

    // Get user info if authenticated
    const userId = c.get('userId');
    const userName = c.get('userName');
    const userRole = c.get('userRole');
    const userEmail: string = c.get('userEmail') || body.email;

    if (!subject || !category || !message || !userEmail) {
      return c.json({ error: 'Missing required fields: subject, category, message, email' }, 400);
    }

    // Create the ticket
    const ticket = await supportService.createSupportTicket(
      userEmail,
      userId,
      userName,
      userRole,
      subject,
      category,
      message,
      priority || 'normal'
    );

    // Send confirmation email to user
    await emailService.sendTicketCreationEmail(ticket);

    // Notify admins
    await emailService.sendNewTicketNotificationToAdmins(ticket);

    return c.json({ ticket, message: 'Support ticket created successfully' }, 201);
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return c.json({ error: `Failed to create support ticket: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// GET /support/tickets - Get all tickets for authenticated user
app.get('/make-server-79198001/support/tickets', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    const [userTickets, emailTickets] = await Promise.all([
      supportService.getUserSupportTickets(userId),
      userEmail ? supportService.getEmailSupportTickets(userEmail) : Promise.resolve([]),
    ]);

    const deduped = new Map<string, any>();
    for (const ticket of [...userTickets, ...emailTickets]) {
      deduped.set(ticket.id, ticket);
    }

    const tickets = [...deduped.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ tickets }, 200);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return c.json({ error: `Failed to fetch support tickets: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// GET /support/tickets/:ticketId - Get a specific ticket
app.get('/make-server-79198001/support/tickets/:ticketId', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const ticketId = c.req.param('ticketId');
    const ticket = await supportService.getSupportTicket(ticketId);

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    const ownsTicket = ticket.userId === userId || normalizeOptionalEmail(ticket.userEmail) === normalizeOptionalEmail(userEmail);
    if (!ownsTicket) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    return c.json({ ticket }, 200);
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    return c.json({ error: `Failed to fetch support ticket: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// POST /support/tickets/:ticketId/messages - Add a message to a ticket
app.post('/make-server-79198001/support/tickets/:ticketId/messages', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const ticketId = c.req.param('ticketId');
    const body = await c.req.json();
    const { message } = body;

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const existingTicket = await supportService.getSupportTicket(ticketId);
    if (!existingTicket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    const ownsTicket = existingTicket.userId === userId || normalizeOptionalEmail(existingTicket.userEmail) === normalizeOptionalEmail(userEmail);
    if (!ownsTicket) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const ticket = await supportService.addMessageToTicket(
      ticketId,
      'user',
      userId,
      userEmail,
      c.get('userName'),
      message
    );

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // If ticket was waiting on user and they replied, reset status
    if (userId) {
      await emailService.sendNewTicketNotificationToAdmins(ticket);
    }

    return c.json({ ticket }, 200);
  } catch (error) {
    console.error('Error adding message to ticket:', error);
    return c.json({ error: `Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// PATCH /support/tickets/:ticketId/close - Close a ticket
app.patch('/make-server-79198001/support/tickets/:ticketId/close', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const ticketId = c.req.param('ticketId');
    const existingTicket = await supportService.getSupportTicket(ticketId);

    if (!existingTicket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    const ownsTicket = existingTicket.userId === userId || normalizeOptionalEmail(existingTicket.userEmail) === normalizeOptionalEmail(userEmail);
    if (!ownsTicket) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const ticket = await supportService.updateTicketStatus(ticketId, 'closed');

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Send status change email
    await emailService.sendStatusChangeEmail(ticket, ticket.status);

    return c.json({ ticket }, 200);
  } catch (error) {
    console.error('Error closing ticket:', error);
    return c.json({ error: `Failed to close ticket: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// ==================== ADMIN SUPPORT ROUTES ====================

// GET /admin/support/tickets - Get all support tickets (admin)
app.get('/make-server-79198001/admin/support/tickets', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const tickets = await supportService.getAllSupportTickets();
    return c.json({ tickets }, 200);
  } catch (error) {
    console.error('Error fetching admin support tickets:', error);
    return c.json({ error: `Failed to fetch tickets: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// GET /admin/support/tickets/:ticketId - Get a specific ticket (admin)
app.get('/make-server-79198001/admin/support/tickets/:ticketId', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const ticketId = c.req.param('ticketId');
    const ticket = await supportService.getSupportTicket(ticketId);

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    return c.json({ ticket }, 200);
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    return c.json({ error: `Failed to fetch ticket: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// PATCH /admin/support/tickets/:ticketId - Update ticket (admin)
app.patch('/make-server-79198001/admin/support/tickets/:ticketId', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const ticketId = c.req.param('ticketId');
    const body = await c.req.json();
    const { status, priority, assignedAdminId, assignedAdminEmail, adminNotes } = body;

    let ticket = await supportService.getSupportTicket(ticketId);
    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    const oldStatus = ticket.status;

    // Update status if provided
    if (status) {
      ticket = await supportService.updateTicketStatus(ticketId, status);
      
      // Send status change email to user
      if (status !== oldStatus) {
        await emailService.sendStatusChangeEmail(ticket!, oldStatus);
      }
    }

    // Update priority if provided
    if (priority) {
      ticket = await supportService.updateTicketPriority(ticketId, priority);
    }

    // Assign to admin if provided
    if (assignedAdminId && assignedAdminEmail) {
      ticket = await supportService.assignTicketToAdmin(ticketId, assignedAdminId, assignedAdminEmail);
    }

    // Set admin notes if provided
    if (adminNotes !== undefined) {
      ticket = await supportService.setAdminNotes(ticketId, adminNotes);
    }

    return c.json({ ticket }, 200);
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return c.json({ error: `Failed to update ticket: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// POST /admin/support/tickets/:ticketId/messages - Admin reply to ticket
app.post('/make-server-79198001/admin/support/tickets/:ticketId/messages', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const ticketId = c.req.param('ticketId');
    const body = await c.req.json();
    const { message } = body;

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const adminId = c.get('userId');
    const adminEmail = c.get('userEmail') || c.get('email');
    const adminName = c.get('userName');

    const ticket = await supportService.addMessageToTicket(
      ticketId,
      'admin',
      adminId,
      adminEmail,
      adminName,
      message
    );

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Update status to in_progress if it was acknowledged
    if (ticket.status === 'acknowledged') {
      await supportService.updateTicketStatus(ticketId, 'in_progress');
    }

    // Send email to user about admin response
    const lastMessage = ticket.messages[ticket.messages.length - 1];
    await emailService.sendAdminResponseEmail(ticket, lastMessage, adminName);

    // Update ticket after sending email
    const updatedTicket = await supportService.getSupportTicket(ticketId);

    return c.json({ ticket: updatedTicket }, 200);
  } catch (error) {
    console.error('Error adding admin message to ticket:', error);
    return c.json({ error: `Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// GET /admin/support/stats - Get support statistics (admin)
app.get('/make-server-79198001/admin/support/stats', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const stats = await supportService.getSupportStats();
    return c.json({ stats }, 200);
  } catch (error) {
    console.error('Error fetching support stats:', error);
    return c.json({ error: `Failed to fetch stats: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// ==================== ACCOUNTING REPORTS ROUTES ====================

// POST /admin/accounting/sync-entries - Generate GL entries from real transaction data
app.post('/make-server-79198001/admin/accounting/sync-entries', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const adminUser = c.get('adminUser');
    
    // Generate auto entries from real data
    const syncResult = await accountingService.generateAutoEntries(adminUser.id);
    
    // Recalculate balances
    await accountingService.recalculateAccountBalances();

    return c.json({ 
      success: true,
      entriesCreated: syncResult.created,
      message: `Synced ${syncResult.created} GL entries from transaction data`
    });
  } catch (error) {
    console.error('Error syncing GL entries:', error);
    return c.json({ error: 'Failed to sync entries' }, 500);
  }
});

// GET /admin/accounting/trial-balance - Get trial balance report
app.get('/make-server-79198001/admin/accounting/trial-balance', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const adminUser = c.get('adminUser');

    // Auto-sync entries before generating report
    await accountingService.generateAutoEntries(adminUser.id);

    const report = await accountingService.getTrialBalance();
    return c.json(report);
  } catch (error) {
    console.error('Error fetching trial balance:', error);
    return c.json({ error: 'Failed to fetch trial balance' }, 500);
  }
});

// GET /admin/accounting/balance-sheet - Get balance sheet report
app.get('/make-server-79198001/admin/accounting/balance-sheet', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const adminUser = c.get('adminUser');

    // Auto-sync entries before generating report
    await accountingService.generateAutoEntries(adminUser.id);

    const asAtDate = c.req.query('date');
    const report = await accountingService.getBalanceSheet(asAtDate);
    return c.json(report);
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    return c.json({ error: 'Failed to fetch balance sheet' }, 500);
  }
});

// GET /admin/accounting/income-statement - Get income statement report
app.get('/make-server-79198001/admin/accounting/income-statement', verifyAuth, verifyAdmin, requirePermission('system.logs'), async (c) => {
  try {
    const adminUser = c.get('adminUser');

    // Auto-sync entries before generating report
    await accountingService.generateAutoEntries(adminUser.id);

    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const report = await accountingService.getIncomeStatement(startDate, endDate);
    return c.json(report);
  } catch (error) {
    console.error('Error fetching income statement:', error);
    return c.json({ error: 'Failed to fetch income statement' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STAFF PORTAL ENDPOINTS (self-service for authenticated staff users)
// ═══════════════════════════════════════════════════════════════════════════

// ── Leave Management ────────────────────────────────────────────────────────

app.post('/make-server-79198001/staff-portal/leave/apply', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const body = await c.req.json();
    const { leaveType, startDate, endDate, reason } = body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return c.json({ error: 'leaveType, startDate, endDate, and reason are required' }, 400);
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return c.json({ error: 'Invalid date range' }, 400);
    }
    const diffMs = end.getTime() - start.getTime();
    const numberOfDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

    const staff = await loadHrStaff();
  const member = findHrStaffRecord(staff, userId, userEmail);
    const staffName = member?.fullName || 'Staff Member';

    const id = crypto.randomUUID();
    const application = {
      id,
      staffId: userId,
      staffName,
      leaveType,
      startDate,
      endDate,
      numberOfDays,
      reason: String(reason).slice(0, 500),
      status: 'pending',
      appliedAt: new Date().toISOString(),
      appliedBy: userId,
    };
    const existing: any[] = await kv.get('staff-portal:leave:applications') || [];
    existing.unshift(application);
    await kv.set('staff-portal:leave:applications', existing.slice(0, 2000));
    return c.json({ application }, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get('/make-server-79198001/staff-portal/leave/applications', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const statusFilter = c.req.query('status');
    const all: any[] = await kv.get('staff-portal:leave:applications') || [];
    let apps = all.filter((a: any) => a.staffId === userId);
    if (statusFilter) apps = apps.filter((a: any) => a.status === statusFilter);
    return c.json({ applications: apps });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get('/make-server-79198001/staff-portal/leave/balance', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const staff = await loadHrStaff();
    const member = findHrStaffRecord(staff, userId, userEmail);

    const leaveTypes: string[] = ['annual', 'sick', 'parental', 'study'];
    const typeToBalance: Record<string, number> = {
      annual: member?.leaveBalance?.annualLeaveDays ?? 0,
      sick: member?.leaveBalance?.sickLeaveDays ?? 0,
      parental: member?.leaveBalance?.parentalLeaveDays ?? 0,
      study: member?.leaveBalance?.studyLeaveDays ?? 0,
    };
    const typeToEntitlement: Record<string, number> = {
      annual: member?.entitlements?.annualLeaveDays ?? 20,
      sick: member?.entitlements?.sickLeaveDays ?? 10,
      parental: member?.entitlements?.parentalLeaveDays ?? 90,
      study: member?.entitlements?.studyLeaveDays ?? 5,
    };

    const allApps: any[] = await kv.get('staff-portal:leave:applications') || [];
    const myApps = allApps.filter((a: any) => a.staffId === userId);

    const balances = leaveTypes.map((lt) => {
      const used = myApps.filter((a: any) => a.leaveType === lt && a.status === 'approved').reduce((s: number, a: any) => s + (a.numberOfDays || 0), 0);
      const pending = myApps.filter((a: any) => a.leaveType === lt && a.status === 'pending').reduce((s: number, a: any) => s + (a.numberOfDays || 0), 0);
      const totalAllowed = typeToEntitlement[lt];
      const available = Math.max(0, (typeToBalance[lt] || totalAllowed) - used - pending);
      return {
        staffId: userId,
        staffName: member?.fullName || 'Staff Member',
        leaveType: lt,
        totalAllowed,
        used,
        pending,
        available,
      };
    });
    return c.json({ balances });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/make-server-79198001/staff-portal/leave/applications/:id/cancel', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const all: any[] = await kv.get('staff-portal:leave:applications') || [];
    const idx = all.findIndex((a: any) => a.id === id && a.staffId === userId);
    if (idx === -1) return c.json({ error: 'Application not found' }, 404);
    if (all[idx].status !== 'pending') return c.json({ error: 'Only pending applications can be cancelled' }, 400);
    all[idx] = { ...all[idx], status: 'cancelled', cancelledAt: new Date().toISOString() };
    await kv.set('staff-portal:leave:applications', all);
    return c.json({ application: all[idx] });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Staff Portal Management (admin: approve/reject leave) ──────────────────

app.get('/make-server-79198001/admin/staff-portal/leave/applications', verifyAuth, verifyAdmin, async (c) => {
  try {
    const statusFilter = c.req.query('status');
    const all: any[] = await kv.get('staff-portal:leave:applications') || [];
    const apps = statusFilter ? all.filter((a: any) => a.status === statusFilter) : all;
    return c.json({ applications: apps });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/make-server-79198001/admin/staff-portal/leave/applications/:id/approve', verifyAuth, verifyAdmin, async (c) => {
  try {
    const adminId = c.get('userId');
    const id = c.req.param('id');
    const all: any[] = await kv.get('staff-portal:leave:applications') || [];
    const idx = all.findIndex((a: any) => a.id === id);
    if (idx === -1) return c.json({ error: 'Application not found' }, 404);
    all[idx] = { ...all[idx], status: 'approved', approvedBy: adminId, approvedAt: new Date().toISOString() };
    await kv.set('staff-portal:leave:applications', all);
    return c.json({ application: all[idx] });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/make-server-79198001/admin/staff-portal/leave/applications/:id/reject', verifyAuth, verifyAdmin, async (c) => {
  try {
    const adminId = c.get('userId');
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const all: any[] = await kv.get('staff-portal:leave:applications') || [];
    const idx = all.findIndex((a: any) => a.id === id);
    if (idx === -1) return c.json({ error: 'Application not found' }, 404);
    all[idx] = { ...all[idx], status: 'rejected', rejectedBy: adminId, rejectedAt: new Date().toISOString(), rejectionReason: body.reason || '' };
    await kv.set('staff-portal:leave:applications', all);
    return c.json({ application: all[idx] });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Payslips ─────────────────────────────────────────────────────────────────

function roundPayslipAmount(value: unknown) {
  const numeric = Number(value || 0);
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function formatPayslipAmount(amount: number, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: String(currency || 'NGN').toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundPayslipAmount(amount));
  } catch {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundPayslipAmount(amount));
  }
}

function buildPayslipId(runId: string, employeeId: string) {
  return `${runId}~${employeeId}`;
}

function parsePayslipId(rawId: string) {
  const tildeIndex = rawId.indexOf('~');
  if (tildeIndex >= 0) {
    return {
      runId: rawId.slice(0, tildeIndex),
      employeeId: rawId.slice(tildeIndex + 1),
    };
  }

  const legacyEmployeeMarker = rawId.indexOf('-emp_');
  if (legacyEmployeeMarker >= 0) {
    return {
      runId: rawId.slice(0, legacyEmployeeMarker),
      employeeId: rawId.slice(legacyEmployeeMarker + 1),
    };
  }

  return { runId: '', employeeId: '' };
}

function portalPayslipStatus(runStatus?: string) {
  if (runStatus === 'paid' || runStatus === 'locked') return 'paid';
  if (runStatus === 'draft') return 'draft';
  return 'finalized';
}

function totalStubDeductions(stub: any) {
  const deductionSummary = stub?.deductionSummary || {};
  const deductions = stub?.deductions || {};
  return roundPayslipAmount(
    Number(deductionSummary.paye ?? deductions.federalWithholding ?? 0)
      + Number(deductionSummary.pension ?? deductions.socialSecurity ?? 0)
      + Number(deductionSummary.nhf ?? deductions.medicare ?? 0)
      + Number(deductionSummary.stateLevy ?? deductions.stateIncomeTax ?? 0)
      + Number(deductionSummary.localLevy ?? deductions.localIncomeTax ?? 0)
      + Number(deductionSummary.healthInsurance ?? deductions.healthInsurance ?? 0)
      + Number(deductionSummary.voluntaryRetirement ?? deductions.retirement401k ?? 0)
      + Number(deductionSummary.other ?? deductions.other ?? 0)
      + Number(deductionSummary.unpaidLeaveAdjustment ?? deductions.unpaidLeaveAdjustment ?? 0),
  );
}

function totalStubEmployerContributions(stub: any) {
  const employerContributionSummary = stub?.employerContributionSummary || {};
  const employerContribution = stub?.employerContribution || {};
  return roundPayslipAmount(
    Number(employerContributionSummary.pension ?? employerContribution.socialSecurity ?? 0)
      + Number(employerContributionSummary.nhf ?? employerContribution.medicare ?? 0)
      + Number(employerContributionSummary.nsitf ?? employerContribution.futa ?? 0)
      + Number(employerContributionSummary.stateLevy ?? employerContribution.suta ?? 0)
      + Number(employerContributionSummary.healthInsurance ?? employerContribution.healthInsurance ?? 0)
      + Number(employerContributionSummary.voluntaryRetirementMatch ?? employerContribution.retirement401kMatch ?? 0),
  );
}

function staffOwnsPortalPayslip(stub: any, member: HrStaffRecord | null, userEmail: string | null | undefined) {
  const normalizedUserEmail = normalizeOptionalEmail(userEmail);

  if (member?.payrollEmployeeId && stub?.employeeId === member.payrollEmployeeId) {
    return true;
  }

  if (member?.staffId && stub?.employeeId === member.staffId) {
    return true;
  }

  if (member?.fullName && String(stub?.employeeName || '').trim().toLowerCase() === member.fullName.trim().toLowerCase()) {
    return true;
  }

  return Boolean(normalizedUserEmail) && normalizeOptionalEmail(stub?.employeeEmail) === normalizedUserEmail;
}

function buildPortalPayslip(run: any, stub: any, member: HrStaffRecord | null, authUserId: string) {
  const payslipId = buildPayslipId(String(run?.id || stub?.runId || ''), String(stub?.employeeId || ''));
  const payDate = String(stub?.period?.payDate || run?.period?.payDate || '');
  const deductionSummary = stub?.deductionSummary || {};
  const deductions = stub?.deductions || {};
  const employerContributionSummary = stub?.employerContributionSummary || {};
  const employerContribution = stub?.employerContribution || {};
  const baseSalary = roundPayslipAmount(stub?.earnings?.basePay ?? member?.baseSalary ?? 0);
  const housingAllowance = roundPayslipAmount(stub?.earnings?.housingAllowance ?? member?.benefits?.housingAllowance ?? 0);
  const transportAllowance = roundPayslipAmount(stub?.earnings?.transportAllowance ?? member?.benefits?.transportAllowance ?? 0);
  const mealAllowance = roundPayslipAmount(stub?.earnings?.mealAllowance ?? member?.benefits?.mealAllowance ?? 0);
  const allowances = roundPayslipAmount(housingAllowance + transportAllowance + mealAllowance);
  const grossSalary = roundPayslipAmount(stub?.grossPay || 0);
  const tax = roundPayslipAmount((deductionSummary.paye ?? deductions.federalWithholding) || 0);
  const pension = roundPayslipAmount((deductionSummary.pension ?? deductions.socialSecurity) || 0);
  const nhf = roundPayslipAmount((deductionSummary.nhf ?? deductions.medicare) || 0);
  const stateLevy = roundPayslipAmount((deductionSummary.stateLevy ?? deductions.stateIncomeTax) || 0);
  const localLevy = roundPayslipAmount((deductionSummary.localLevy ?? deductions.localIncomeTax) || 0);
  const insurancePremium = roundPayslipAmount((deductionSummary.healthInsurance ?? deductions.healthInsurance ?? member?.benefits?.healthInsurance) || 0);
  const otherDeductions = roundPayslipAmount(
    Number(deductionSummary.voluntaryRetirement ?? deductions.retirement401k ?? 0)
      + Number(deductionSummary.other ?? deductions.other ?? 0)
      + Number(deductionSummary.unpaidLeaveAdjustment ?? deductions.unpaidLeaveAdjustment ?? 0),
  );

  return {
    id: payslipId,
    staffId: member?.staffId || member?.id || authUserId,
    staffName: member?.fullName || stub?.employeeName || 'Staff Member',
    payGrade: member?.payGrade || '',
    department: member?.department || '',
    role: member?.role || '',
    payPeriod: `${String(stub?.period?.startDate || run?.period?.startDate || '')} – ${String(stub?.period?.endDate || run?.period?.endDate || '')}`,
    payDate,
    baseSalary,
    allowances,
    grossSalary,
    deductions: roundPayslipAmount(stub?.deductionSummary?.total ?? totalStubDeductions(stub)),
    netSalary: roundPayslipAmount(stub?.netPay || 0),
    currency: String(stub?.currency || member?.currency || 'NGN').toUpperCase(),
    tax,
    pension,
    nhf,
    stateLevy,
    localLevy,
    insurancePremium,
    otherDeductions,
    employerPension: roundPayslipAmount((employerContributionSummary.pension ?? employerContribution.socialSecurity) || 0),
    employerStatutory: roundPayslipAmount(employerContributionSummary.total ?? totalStubEmployerContributions(stub)),
    status: portalPayslipStatus(run?.status),
    downloadUrl: `/make-server-79198001/staff-portal/payslips/${payslipId}/download`,
    createdAt: payDate || new Date().toISOString(),
  };
}

app.get('/make-server-79198001/staff-portal/payslips', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const yearQ = c.req.query('year');
    const monthQ = c.req.query('month');

    const staff = await loadHrStaff();
    const member = findHrStaffRecord(staff, userId, userEmail);
    const overview = await payrollService.getOverview();
    const allRuns = Array.isArray((overview as any).runs) ? (overview as any).runs : [];

    const payslips: any[] = [];
    for (const run of allRuns) {
      if (!run?.id) continue;
      try {
        const stubs = await payrollService.getPayStubs(run.id);
        for (const stub of stubs) {
          if (!staffOwnsPortalPayslip(stub, member, userEmail)) continue;

          const payDate = stub.period?.payDate || run.period?.payDate || '';
          if (yearQ && !payDate.startsWith(yearQ)) continue;
          if (monthQ && !payDate.startsWith(`${yearQ || payDate.slice(0, 4)}-${String(monthQ).padStart(2, '0')}`)) continue;
          payslips.push(buildPortalPayslip(run, stub, member, userId));
        }
      } catch (_) { /* skip runs with no stubs */ }
    }
    payslips.sort((a, b) => b.payDate.localeCompare(a.payDate));
    return c.json({ payslips });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get('/make-server-79198001/staff-portal/payslips/:id', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const { runId, employeeId } = parsePayslipId(c.req.param('id'));
    if (!runId || !employeeId) return c.json({ error: 'Invalid payslip id' }, 400);

    const overview = await payrollService.getOverview();
    const run = (Array.isArray((overview as any).runs) ? (overview as any).runs : []).find((item: any) => item.id === runId) || null;
    const stubs = await payrollService.getPayStubs(runId);
    const stub = stubs.find((s: any) => s.employeeId === employeeId);
    if (!stub) return c.json({ error: 'Payslip not found' }, 404);

    const staff = await loadHrStaff();
    const member = findHrStaffRecord(staff, userId, userEmail);
    if (!staffOwnsPortalPayslip(stub, member, userEmail)) {
      return c.json({ error: 'Payslip not found' }, 404);
    }

    return c.json({
      payslip: buildPortalPayslip(run || { id: runId, status: 'finalized', period: stub.period }, stub, member, userId),
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get('/make-server-79198001/staff-portal/payslips/:id/download', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const payslipId = c.req.param('id');
    const { runId, employeeId } = parsePayslipId(payslipId);
    if (!runId || !employeeId) return c.json({ error: 'Invalid payslip id' }, 400);

    const overview = await payrollService.getOverview();
    const run = (Array.isArray((overview as any).runs) ? (overview as any).runs : []).find((item: any) => item.id === runId) || null;
    const stubs = await payrollService.getPayStubs(runId);
    const stub = stubs.find((s: any) => s.employeeId === employeeId);
    if (!stub) return c.json({ error: 'Payslip not found' }, 404);

    const staff = await loadHrStaff();
    const member = findHrStaffRecord(staff, userId, userEmail);
    if (!staffOwnsPortalPayslip(stub, member, userEmail)) {
      return c.json({ error: 'Payslip not found' }, 404);
    }

    const payslip = buildPortalPayslip(run || { id: runId, status: 'finalized', period: stub.period }, stub, member, userId);
    const lines = [
      'PAYSLIP',
      'Nigeria Payroll Format',
      `Employee: ${payslip.staffName}`,
      `Staff ID: ${member?.staffId || userId}`,
      `Department: ${payslip.department || '-'}`,
      `Role: ${payslip.role || '-'}`,
      `Pay Grade: ${payslip.payGrade || '-'}`,
      `Period: ${String(stub.period?.startDate || '')} to ${String(stub.period?.endDate || '')}`,
      `Pay Date: ${payslip.payDate}`,
      `Status: ${String(payslip.status || 'finalized').toUpperCase()}`,
      '',
      'EARNINGS',
      `Base Salary: ${formatPayslipAmount(payslip.baseSalary, payslip.currency)}`,
      `Housing Allowance: ${formatPayslipAmount(stub?.earnings?.housingAllowance || 0, payslip.currency)}`,
      `Transport Allowance: ${formatPayslipAmount(stub?.earnings?.transportAllowance || 0, payslip.currency)}`,
      `Meal Allowance: ${formatPayslipAmount(stub?.earnings?.mealAllowance || 0, payslip.currency)}`,
      `Variable Pay: ${formatPayslipAmount(stub?.earnings?.variablePay || 0, payslip.currency)}`,
      `Gross Pay: ${formatPayslipAmount(payslip.grossSalary, payslip.currency)}`,
      '',
      'DEDUCTIONS',
      `PAYE: ${formatPayslipAmount(payslip.tax, payslip.currency)}`,
      `Pension: ${formatPayslipAmount(payslip.pension, payslip.currency)}`,
      `NHF: ${formatPayslipAmount(payslip.nhf, payslip.currency)}`,
      `State Levy: ${formatPayslipAmount(payslip.stateLevy, payslip.currency)}`,
      `LGA Levy: ${formatPayslipAmount(payslip.localLevy, payslip.currency)}`,
      `Health Insurance: ${formatPayslipAmount(payslip.insurancePremium || 0, payslip.currency)}`,
      `Other Deductions: ${formatPayslipAmount(payslip.otherDeductions || 0, payslip.currency)}`,
      `Total Deductions: ${formatPayslipAmount(payslip.deductions, payslip.currency)}`,
      '',
      'NET PAY',
      `Net Salary: ${formatPayslipAmount(payslip.netSalary, payslip.currency)}`,
      '',
      'EMPLOYER CONTRIBUTIONS',
      `Employer Pension: ${formatPayslipAmount(payslip.employerPension || 0, payslip.currency)}`,
      `Total Statutory Cost: ${formatPayslipAmount(payslip.employerStatutory || 0, payslip.currency)}`,
    ];
    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="payslip-${payslipId}.txt"`,
      },
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Trainings ─────────────────────────────────────────────────────────────────

const TRAININGS_KEY = 'staff-portal:trainings';
const TRAINING_ENROLLMENTS_KEY = 'staff-portal:training-enrollments';

async function loadTrainings(): Promise<any[]> {
  return await kv.get(TRAININGS_KEY) || [];
}
async function loadEnrollments(): Promise<any[]> {
  return await kv.get(TRAINING_ENROLLMENTS_KEY) || [];
}

app.get('/make-server-79198001/staff-portal/trainings/available', verifyStaffPortalAuth, async (c) => {
  try {
    const trainings = await loadTrainings();
    const enrollments = await loadEnrollments();
    const now = new Date().toISOString();
    const available = trainings.filter((t: any) => {
      if (t.status === 'cancelled') return false;
      if (t.endDate && t.endDate < now.slice(0, 10)) return false;
      return true;
    }).map((t: any) => ({
      ...t,
      currentParticipants: enrollments.filter((e: any) => e.trainingId === t.id && e.status !== 'cancelled').length,
    }));
    return c.json({ trainings: available });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get('/make-server-79198001/staff-portal/trainings/my-trainings', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const enrollments = await loadEnrollments();
    const trainings = await loadTrainings();
    const myEnrollments = enrollments
      .filter((e: any) => e.staffId === userId)
      .map((e: any) => ({
        ...e,
        trainingTitle: trainings.find((t: any) => t.id === e.trainingId)?.title || e.trainingTitle,
      }));
    return c.json({ trainings: myEnrollments });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/make-server-79198001/staff-portal/trainings/enroll', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const { trainingId } = await c.req.json();
    if (!trainingId) return c.json({ error: 'trainingId is required' }, 400);

    const trainings = await loadTrainings();
    const training = trainings.find((t: any) => t.id === trainingId);
    if (!training) return c.json({ error: 'Training not found' }, 404);

    const enrollments = await loadEnrollments();
    const already = enrollments.find((e: any) => e.staffId === userId && e.trainingId === trainingId && e.status !== 'cancelled');
    if (already) return c.json({ error: 'Already enrolled' }, 400);

    const currentCount = enrollments.filter((e: any) => e.trainingId === trainingId && e.status !== 'cancelled').length;
    if (training.maxParticipants && currentCount >= training.maxParticipants) {
      return c.json({ error: 'Training is full' }, 400);
    }

    const staff = await loadHrStaff();
  const member = findHrStaffRecord(staff, userId, userEmail);
    const enrollment = {
      id: crypto.randomUUID(),
      staffId: userId,
      staffName: member?.fullName || 'Staff Member',
      trainingId,
      trainingTitle: training.title,
      enrolledAt: new Date().toISOString(),
      status: 'enrolled',
    };
    enrollments.push(enrollment);
    await kv.set(TRAINING_ENROLLMENTS_KEY, enrollments);
    return c.json({ enrollment }, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete('/make-server-79198001/staff-portal/trainings/enroll/:id', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const enrollments = await loadEnrollments();
    const idx = enrollments.findIndex((e: any) => e.id === id && e.staffId === userId);
    if (idx === -1) return c.json({ error: 'Enrollment not found' }, 404);
    enrollments[idx] = { ...enrollments[idx], status: 'cancelled', cancelledAt: new Date().toISOString() };
    await kv.set(TRAINING_ENROLLMENTS_KEY, enrollments);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/make-server-79198001/staff-portal/trainings/enroll/:id/feedback', verifyStaffPortalAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const { score, feedback } = await c.req.json();
    const enrollments = await loadEnrollments();
    const idx = enrollments.findIndex((e: any) => e.id === id && e.staffId === userId);
    if (idx === -1) return c.json({ error: 'Enrollment not found' }, 404);
    enrollments[idx] = { ...enrollments[idx], score, feedback, status: 'completed', completedAt: new Date().toISOString() };
    await kv.set(TRAINING_ENROLLMENTS_KEY, enrollments);
    return c.json({ enrollment: enrollments[idx] });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Admin: manage trainings ───────────────────────────────────────────────────

app.get('/make-server-79198001/admin/staff-portal/trainings', verifyAuth, verifyAdmin, async (c) => {
  try {
    const trainings = await loadTrainings();
    const enrollments = await loadEnrollments();
    return c.json({
      trainings: trainings.map((t: any) => ({
        ...t,
        currentParticipants: enrollments.filter((e: any) => e.trainingId === t.id && e.status !== 'cancelled').length,
      })),
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/make-server-79198001/admin/staff-portal/trainings', verifyAuth, verifyAdmin, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.title || !body.startDate) return c.json({ error: 'title and startDate are required' }, 400);
    const trainings = await loadTrainings();
    const training = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description || '',
      category: body.category || 'general',
      instructor: body.instructor || '',
      startDate: body.startDate,
      endDate: body.endDate || body.startDate,
      duration: body.duration || 1,
      location: body.location || '',
      isOnline: body.isOnline ?? false,
      meetingLink: body.meetingLink || '',
      maxParticipants: body.maxParticipants || null,
      currentParticipants: 0,
      status: 'scheduled',
      tags: body.tags || [],
      createdAt: new Date().toISOString(),
    };
    trainings.unshift(training);
    await kv.set(TRAININGS_KEY, trainings);
    return c.json({ training }, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// END STAFF PORTAL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(app.fetch);