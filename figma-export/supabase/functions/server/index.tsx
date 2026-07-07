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
import * as supportService from "./support-service.tsx";

const DEFAULT_ADMIN_EMAIL = Deno.env.get('DEFAULT_ADMIN_EMAIL') ?? 'admin@amtdistro.com';
const DEFAULT_ADMIN_PASSWORD = Deno.env.get('DEFAULT_ADMIN_PASSWORD') ?? 'admin';
const DEFAULT_ADMIN_USERNAME = Deno.env.get('DEFAULT_ADMIN_USERNAME') ?? 'admin';

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
        username: DEFAULT_ADMIN_USERNAME,
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD
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

    return c.json({ user: updatedUser, permissions });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return c.json({ error: `Failed to update user profile: ${error.message}` }, 500);
  }
});

// Support ticket routes
app.get('/make-server-79198001/support/tickets', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const tickets = await supportService.getSupportTicketsForUser(userId);
    return c.json({ tickets });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return c.json({ error: `Failed to fetch support tickets: ${error.message}` }, 500);
  }
});

app.post('/make-server-79198001/support/tickets', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const user = await userService.getUserByUserId(userId);

    if (!user) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const ticket = await supportService.createSupportTicket({
      userId,
      userEmail: user.email,
      userName:
        [user.firstName, user.lastName].filter(Boolean).join(' ')
        || ('artistName' in user ? user.artistName : '')
        || ('labelName' in user ? user.labelName : '')
        || user.email,
      userRole: user.role,
      subject: typeof body.subject === 'string' ? body.subject : '',
      category: body.category,
      message: typeof body.message === 'string' ? body.message : '',
      priority: body.priority,
    });

    return c.json({ ticket }, 201);
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return c.json({ error: `Failed to create support ticket: ${error.message}` }, 500);
  }
});

app.get('/make-server-79198001/support/tickets/:ticketId', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const ticketId = c.req.param('ticketId');
    const ticket = await supportService.getSupportTicketForUser(ticketId, userId);

    if (!ticket) {
      return c.json({ error: 'Support ticket not found' }, 404);
    }

    return c.json({ ticket });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    return c.json({ error: `Failed to fetch support ticket: ${error.message}` }, 500);
  }
});

app.post('/make-server-79198001/support/tickets/:ticketId/messages', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const ticketId = c.req.param('ticketId');
    const body = await c.req.json();
    const user = await userService.getUserByUserId(userId);

    if (!user) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const updatedTicket = await supportService.addUserReply(ticketId, userId, user.email, body.message);
    if (!updatedTicket) {
      return c.json({ error: 'Support ticket not found' }, 404);
    }

    return c.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('Error adding support message:', error);
    return c.json({ error: `Failed to add support message: ${error.message}` }, 500);
  }
});

app.patch('/make-server-79198001/support/tickets/:ticketId/close', verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const ticketId = c.req.param('ticketId');
    const updatedTicket = await supportService.closeUserTicket(ticketId, userId);

    if (!updatedTicket) {
      return c.json({ error: 'Support ticket not found' }, 404);
    }

    return c.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('Error closing support ticket:', error);
    return c.json({ error: `Failed to close support ticket: ${error.message}` }, 500);
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

// Support tickets
app.get('/make-server-79198001/admin/support/stats', verifyAuth, verifyAdmin, requirePermission('support.view'), async (c) => {
  try {
    const stats = await supportService.getSupportTicketStats();
    return c.json({ stats });
  } catch (error) {
    console.error('Error fetching support stats:', error);
    return c.json({ error: `Failed to fetch support stats: ${error.message}` }, 500);
  }
});

app.get('/make-server-79198001/admin/support/tickets', verifyAuth, verifyAdmin, requirePermission('support.view'), async (c) => {
  try {
    const tickets = await supportService.listAllSupportTickets();
    return c.json({ tickets });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return c.json({ error: `Failed to fetch support tickets: ${error.message}` }, 500);
  }
});

app.get('/make-server-79198001/admin/support/tickets/:ticketId', verifyAuth, verifyAdmin, requirePermission('support.view'), async (c) => {
  try {
    const ticketId = c.req.param('ticketId');
    const ticket = await supportService.getSupportTicket(ticketId);

    if (!ticket) {
      return c.json({ error: 'Support ticket not found' }, 404);
    }

    return c.json({ ticket });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    return c.json({ error: `Failed to fetch support ticket: ${error.message}` }, 500);
  }
});

app.patch('/make-server-79198001/admin/support/tickets/:ticketId', verifyAuth, verifyAdmin, requirePermission('support.manage'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const ticketId = c.req.param('ticketId');
    const body = await c.req.json();

    const ticket = await supportService.updateSupportTicket(ticketId, {
      status: body.status,
      priority: body.priority,
      assignedAdminId: body.assignedAdminId,
      adminNotes: body.adminNotes,
    }, adminUserId);

    if (!ticket) {
      return c.json({ error: 'Support ticket not found' }, 404);
    }

    return c.json({ ticket });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return c.json({ error: `Failed to update support ticket: ${error.message}` }, 500);
  }
});

app.post('/make-server-79198001/admin/support/tickets/:ticketId/messages', verifyAuth, verifyAdmin, requirePermission('support.manage'), async (c) => {
  try {
    const adminUserId = c.get('userId');
    const ticketId = c.req.param('ticketId');
    const body = await c.req.json();
    const adminUser = await userService.getUserByUserId(adminUserId);

    if (!adminUser) {
      return c.json({ error: 'Admin profile not found' }, 404);
    }

    const ticket = await supportService.addAdminReply(ticketId, adminUserId, adminUser.email, body.message);
    if (!ticket) {
      return c.json({ error: 'Support ticket not found' }, 404);
    }

    return c.json({ ticket });
  } catch (error) {
    console.error('Error replying to support ticket:', error);
    return c.json({ error: `Failed to reply to support ticket: ${error.message}` }, 500);
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

// Get audit logs
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
      return c.json({ error: 'Must provide userId or resource+resourceId' }, 400);
    }

    return c.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return c.json({ error: `Failed to fetch audit logs: ${error.message}` }, 500);
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

app.get('/make-server-79198001/admin/promotions', verifyAuth, verifyAdmin, async (c) => {
  try {
    const campaigns = await promotionService.getAllPromotionCampaigns();
    return c.json({ campaigns });
  } catch (error) {
    console.error('Error loading admin promotions:', error);
    return c.json({ error: `Failed to load promotions: ${error.message}` }, 500);
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

// ==================== PAYROLL MANAGEMENT ====================

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

// ==================== PAYROLL MANAGEMENT ====================

app.get('/make-server-79198001/admin/payroll/overview', verifyAuth, verifyAdmin, requirePermission('payments.view'), async (c) => {
  try {
    const overview = await payrollService.getOverview();
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
    return c.json({ run });
  } catch (error) {
    console.error('Error transitioning payroll run:', error);
    return c.json({ error: `Failed to transition payroll run: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

app.post('/make-server-79198001/admin/payroll/runs/:runId/retry-failed', verifyAuth, verifyAdmin, requirePermission('payments.approve'), async (c) => {
  try {
    const runId = c.req.param('runId');
    const run = await payrollService.retryFailedPayments(runId);
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

Deno.serve(app.fetch);