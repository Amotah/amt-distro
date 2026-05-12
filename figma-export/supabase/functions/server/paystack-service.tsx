import * as kv from './kv_store.tsx';
import * as userService from './user-service.tsx';
import * as promotionService from './promotion-service.tsx';

export type BillingPlan = 'artist' | 'super_artist' | 'partner' | 'promotion' | 'release';
export type BillingPeriod = 'monthly' | 'yearly';
export type CheckoutStatus = 'initialized' | 'success' | 'failed';
export type PaymentHistoryType = 'subscription' | 'payout';
export type PaymentHistoryStatus = 'completed' | 'failed' | 'pending';
const MIN_PAYOUT_AMOUNT = 50000;

export interface PayoutAccountDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
}

export interface CheckoutTransaction {
  id: string;
  userId: string;
  email: string;
  plan: BillingPlan;
  billingPeriod: BillingPeriod;
  amount: number;
  baseAmount: number;
  discountAmount: number;
  couponCode?: string;
  promotionId?: string;
  releaseId?: string;
  promotionAddonPlanId?: string;
  promotionAddonAmount?: number;
  currency: 'NGN';
  provider: 'paystack';
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  callbackUrl: string;
  status: CheckoutStatus;
  gatewayStatus?: string;
  paidAt?: string;
  failureReason?: string;
  verificationData?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface BillingHistoryRecord {
  id: string;
  userId: string;
  email: string;
  reference: string;
  type: PaymentHistoryType;
  provider: 'paystack' | 'internal';
  method: 'Paystack' | 'Bank Transfer';
  plan?: BillingPlan;
  amount: number;
  currency: 'NGN';
  status: PaymentHistoryStatus;
  description: string;
  requesterName?: string;
  requesterRole?: 'artist' | 'partner' | 'admin';
  payoutAccount?: PayoutAccountDetails;
  billingPeriod?: BillingPeriod;
  paidAt?: string;
  expiresAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentRecord extends BillingHistoryRecord {
  checkoutStatus?: CheckoutStatus;
  gatewayStatus?: string;
  billingPeriod?: BillingPeriod;
  baseAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  callbackUrl?: string;
  promotionId?: string;
  authorizationUrl?: string;
  accessCode?: string;
  failureReason?: string;
  purpose: 'release' | 'marketing' | 'payout';
  accountName?: string;
  accountRole?: userService.UserRole | 'unknown';
  releaseArtistName?: string;
  releaseTitle?: string;
}

function getAccountNameFromUser(user: userService.User | null | undefined, email: string) {
  if (!user) {
    return email;
  }

  if (user.role === 'partner') {
    return user.labelName || user.firstName || user.email;
  }

  if (user.role === 'artist') {
    return user.artistName || user.firstName || user.email;
  }

  return user.artistName || user.username || user.firstName || user.email;
}

function getReleaseTitleFromDescription(description?: string) {
  if (!description) {
    return undefined;
  }

  const normalized = description.trim();
  return normalized || undefined;
}

function getRequesterName(user: userService.User) {
  if (user.role === 'partner') {
    return user.labelName || user.firstName || user.email;
  }

  if (user.role === 'artist') {
    return user.artistName || user.firstName || user.email;
  }

  return user.artistName || user.username || user.email;
}

function isValidPayoutAccount(account?: Partial<PayoutAccountDetails> | null): account is PayoutAccountDetails {
  return Boolean(
    account &&
    typeof account.accountName === 'string' && account.accountName.trim() &&
    typeof account.bankName === 'string' && account.bankName.trim() &&
    typeof account.accountNumber === 'string' && /^\d{10}$/.test(account.accountNumber.trim()),
  );
}

function maskAccountNumber(accountNumber: string) {
  return `******${accountNumber.slice(-4)}`;
}

interface InitializeCheckoutInput {
  userId: string;
  email: string;
  plan: BillingPlan;
  billingPeriod: BillingPeriod;
  amount: number;
  baseAmount: number;
  discountAmount: number;
  couponCode?: string;
  callbackUrl: string;
  promotionId?: string;
  releaseId?: string;
  promotionAddonPlanId?: string;
  promotionAddonAmount?: number;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    amount: number;
    currency: string;
    status: string;
    reference: string;
    paid_at?: string;
    gateway_response?: string;
    customer?: {
      email?: string;
    };
    metadata?: {
      userId?: string;
      plan?: BillingPlan;
      billingPeriod?: BillingPeriod;
      couponCode?: string;
      amount?: number;
      [key: string]: unknown;
    };
  };
}

interface PaystackWebhookEvent {
  event: string;
  data?: {
    reference?: string;
    [key: string]: unknown;
  };
}

function getPaystackSecretKey() {
  const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  return secretKey;
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String(payload.message)
      : `Paystack request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function transactionKey(reference: string) {
  return `billing:transaction:${reference}`;
}

function userTransactionKey(userId: string, reference: string) {
  return `billing:user:${userId}:${reference}`;
}

function billingHistoryKey(reference: string) {
  return `billing:history:${reference}`;
}

function userBillingHistoryKey(userId: string, reference: string) {
  return `billing:history:user:${userId}:${reference}`;
}

function buildReference(plan: BillingPlan) {
  const tag = plan === 'release' ? 'REL' : plan.toUpperCase();
  return `AMT-${tag}-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function buildPayoutReference() {
  return `AMT-PAYOUT-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function getSubscriptionDescription(plan: BillingPlan, billingPeriod: BillingPeriod, extra?: { promotionAddon?: boolean }) {
  if (plan === 'release') {
    return extra?.promotionAddon ? 'Release distribution + Promotion campaign' : 'Release distribution fee';
  }

  if (plan === 'promotion') {
    return 'Promotional subscription';
  }

  if (plan === 'partner') {
    return `Partner ${billingPeriod} subscription`;
  }

  if (plan === 'super_artist') {
    return `Super Artist ${billingPeriod} subscription`;
  }

  return `Artist ${billingPeriod} subscription`;
}

function normalizeHistoryRecord(record: BillingHistoryRecord): BillingHistoryRecord {
  return {
    ...record,
    type: record.type || 'subscription',
    provider: record.provider || 'paystack',
    method: record.method || 'Paystack',
    status: record.status || 'completed',
    payoutAccount: record.payoutAccount
      ? {
          ...record.payoutAccount,
          accountNumber: maskAccountNumber(record.payoutAccount.accountNumber),
        }
      : undefined,
  };
}

function normalizeAdminHistoryRecord(record: BillingHistoryRecord): BillingHistoryRecord {
  return {
    ...record,
    type: record.type || 'subscription',
    provider: record.provider || 'paystack',
    method: record.method || 'Paystack',
    status: record.status || 'completed',
  };
}

function getPlanPurpose(plan?: BillingPlan): 'release' | 'marketing' {
  return plan === 'promotion' ? 'marketing' : 'release';
}


function mapCheckoutStatusToHistoryStatus(status: CheckoutStatus): PaymentHistoryStatus {
  if (status === 'success') {
    return 'completed';
  }

  if (status === 'failed') {
    return 'failed';
  }

  return 'pending';
}

function toAdminPaymentRecordFromHistory(record: BillingHistoryRecord): AdminPaymentRecord {
  return {
    ...normalizeAdminHistoryRecord(record),
    purpose: record.type === 'payout' ? 'payout' : getPlanPurpose(record.plan),
    accountName: record.requesterName,
    accountRole: record.requesterRole || (record.plan === 'partner' ? 'partner' : record.plan === 'artist' ? 'artist' : 'unknown'),
  };
}

function toAdminPaymentRecordFromTransaction(transaction: CheckoutTransaction): AdminPaymentRecord {
  return {
    id: transaction.id,
    userId: transaction.userId,
    email: transaction.email,
    reference: transaction.reference,
    type: 'subscription',
    provider: transaction.provider,
    method: 'Paystack',
    plan: transaction.plan,
    amount: transaction.amount,
    currency: transaction.currency,
    status: mapCheckoutStatusToHistoryStatus(transaction.status),
    description: getSubscriptionDescription(transaction.plan, transaction.billingPeriod),
    paidAt: transaction.paidAt,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    checkoutStatus: transaction.status,
    gatewayStatus: transaction.gatewayStatus,
    billingPeriod: transaction.billingPeriod,
    baseAmount: transaction.baseAmount,
    discountAmount: transaction.discountAmount,
    couponCode: transaction.couponCode,
    callbackUrl: transaction.callbackUrl,
    promotionId: transaction.promotionId,
    authorizationUrl: transaction.authorizationUrl,
    accessCode: transaction.accessCode,
    failureReason: transaction.failureReason,
    purpose: getPlanPurpose(transaction.plan),
    accountRole: transaction.plan === 'partner' ? 'partner' : 'artist',
  };
}

async function enrichAdminPaymentRecord(
  payment: AdminPaymentRecord,
  userCache: Map<string, Promise<userService.User | null>>,
  promotionCache: Map<string, Promise<promotionService.PromotionCampaignRecord | null>>,
): Promise<AdminPaymentRecord> {
  const next: AdminPaymentRecord = { ...payment };

  if (!userCache.has(payment.userId)) {
    userCache.set(payment.userId, userService.getUserByUserId(payment.userId));
  }

  const user = await userCache.get(payment.userId)!;

  if (!next.accountRole) {
    next.accountRole = user?.role || 'unknown';
  }

  if (!next.accountName) {
    next.accountName = getAccountNameFromUser(user, payment.email);
  }

  if (next.purpose === 'marketing' && next.promotionId) {
    if (!promotionCache.has(next.promotionId)) {
      promotionCache.set(
        next.promotionId,
        promotionService.getPromotionCampaignById(next.promotionId).catch(() => null),
      );
    }

    const campaign = await promotionCache.get(next.promotionId)!;
    if (campaign) {
      next.releaseArtistName = campaign.artistName || next.releaseArtistName;
      next.releaseTitle = campaign.releaseTitle || next.releaseTitle;
    }
  }

  if (!next.releaseArtistName && next.accountRole === 'artist') {
    next.releaseArtistName = next.accountName;
  }

  if (!next.releaseTitle) {
    next.releaseTitle = getReleaseTitleFromDescription(next.description);
  }

  return next;
}

export async function getCheckoutTransaction(reference: string): Promise<CheckoutTransaction | null> {
  return await kv.get<CheckoutTransaction>(transactionKey(reference));
}

async function storeBillingHistory(transaction: CheckoutTransaction) {
  const now = new Date().toISOString();
  const existing = await kv.get<BillingHistoryRecord>(billingHistoryKey(transaction.reference));

  // Calculate expiry date for subscriptions
  let expiresAt: string | undefined;
  if (transaction.status === 'success' && transaction.plan === 'partner') {
    const paidDate = new Date(transaction.paidAt || now);
    if (transaction.billingPeriod === 'monthly') {
      paidDate.setMonth(paidDate.getMonth() + 1);
    } else if (transaction.billingPeriod === 'yearly') {
      paidDate.setFullYear(paidDate.getFullYear() + 1);
    }
    expiresAt = paidDate.toISOString();
  }

  const record: BillingHistoryRecord = {
    id: existing?.id || crypto.randomUUID(),
    userId: transaction.userId,
    email: transaction.email,
    reference: transaction.reference,
    type: 'subscription',
    provider: 'paystack',
    method: 'Paystack',
    plan: transaction.plan,
    amount: transaction.amount,
    billingPeriod: transaction.billingPeriod,
    currency: 'NGN',
    status: transaction.status === 'success' ? 'completed' : 'failed',
    description: getSubscriptionDescription(transaction.plan, transaction.billingPeriod, { promotionAddon: Boolean(transaction.promotionAddonPlanId) }),
    paidAt: transaction.paidAt,
    expiresAt,
    createdAt: existing?.createdAt || transaction.createdAt,
    updatedAt: now,
  };

  await kv.set(billingHistoryKey(transaction.reference), record);
  await kv.set(userBillingHistoryKey(transaction.userId, transaction.reference), true);

  return normalizeHistoryRecord(record);
}

export async function getBillingHistory(userId: string): Promise<BillingHistoryRecord[]> {
  const entries = await kv.getEntriesByPrefix(`billing:history:user:${userId}:`);
  const references = entries
    .map((entry) => entry.key.split(':').pop())
    .filter((reference): reference is string => Boolean(reference));

  const records = await Promise.all(references.map((reference) => kv.get<BillingHistoryRecord>(billingHistoryKey(reference))));

  return records
    .filter((record): record is BillingHistoryRecord => Boolean(record))
    .map((record) => normalizeHistoryRecord(record))
    .sort((left, right) => {
      const leftDate = new Date(left.paidAt || left.createdAt).getTime();
      const rightDate = new Date(right.paidAt || right.createdAt).getTime();
      return rightDate - leftDate;
    });
}

export async function requestPayout(userId: string, email: string, amount: number, payoutAccount: PayoutAccountDetails): Promise<BillingHistoryRecord> {
  const user = await userService.getUserByUserId(userId);
  if (!user) {
    throw new Error('User profile not found');
  }

  if (!Number.isFinite(amount) || amount < MIN_PAYOUT_AMOUNT) {
    throw new Error('Minimum payout request is ₦50,000');
  }

  if (!isValidPayoutAccount(payoutAccount)) {
    throw new Error('Valid payout account details are required');
  }

  const now = new Date().toISOString();
  const reference = buildPayoutReference();
  const record: BillingHistoryRecord = {
    id: crypto.randomUUID(),
    userId,
    email,
    reference,
    type: 'payout',
    provider: 'internal',
    method: 'Bank Transfer',
    plan: user.role === 'partner' ? 'partner' : 'artist',
    amount,
    currency: 'NGN',
    status: 'pending',
    description: 'Revenue payout request',
    requesterName: getRequesterName(user),
    requesterRole: user.role,
    payoutAccount: {
      accountName: payoutAccount.accountName.trim(),
      accountNumber: payoutAccount.accountNumber.trim(),
      bankName: payoutAccount.bankName.trim(),
    },
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(billingHistoryKey(reference), record);
  await kv.set(userBillingHistoryKey(userId, reference), true);

  return normalizeHistoryRecord(record);
}

export async function getAllPayoutRequests(): Promise<BillingHistoryRecord[]> {
  const entries = await kv.getEntriesByPrefix('billing:history:');
  const records = entries
    .filter((entry) => !entry.key.includes(':user:'))
    .map((entry) => entry.value as BillingHistoryRecord)
    .filter((record) => record && record.type === 'payout')
    .map((record) => normalizeAdminHistoryRecord(record));

  return records.sort((left, right) => {
    const leftDate = new Date(left.paidAt || left.createdAt).getTime();
    const rightDate = new Date(right.paidAt || right.createdAt).getTime();
    return rightDate - leftDate;
  });
}

export async function getAllAdminPayments(): Promise<AdminPaymentRecord[]> {
  const [historyEntries, transactionEntries] = await Promise.all([
    kv.getEntriesByPrefix('billing:history:'),
    kv.getEntriesByPrefix('billing:transaction:'),
  ]);

  const byReference = new Map<string, AdminPaymentRecord>();

  for (const entry of historyEntries) {
    if (entry.key.includes(':user:')) {
      continue;
    }

    const record = entry.value as BillingHistoryRecord;
    if (!record || typeof record.reference !== 'string') {
      continue;
    }

    byReference.set(record.reference, toAdminPaymentRecordFromHistory(record));
  }

  for (const entry of transactionEntries) {
    const transaction = entry.value as CheckoutTransaction;
    if (!transaction || typeof transaction.reference !== 'string') {
      continue;
    }

    if (byReference.has(transaction.reference)) {
      continue;
    }

    byReference.set(transaction.reference, toAdminPaymentRecordFromTransaction(transaction));
  }

  const userCache = new Map<string, Promise<userService.User | null>>();
  const promotionCache = new Map<string, Promise<promotionService.PromotionCampaignRecord | null>>();

  const enriched = await Promise.all(
    Array.from(byReference.values()).map((payment) => enrichAdminPaymentRecord(payment, userCache, promotionCache)),
  );

  return enriched.sort((left, right) => {
    const leftDate = new Date(left.paidAt || left.updatedAt || left.createdAt).getTime();
    const rightDate = new Date(right.paidAt || right.updatedAt || right.createdAt).getTime();
    return rightDate - leftDate;
  });
}

export async function reconcileAdminPayment(reference: string): Promise<AdminPaymentRecord> {
  const result = await verifyCheckout(reference);
  const history = await kv.get<BillingHistoryRecord>(billingHistoryKey(reference));
  const userCache = new Map<string, Promise<userService.User | null>>();
  const promotionCache = new Map<string, Promise<promotionService.PromotionCampaignRecord | null>>();

  if (history) {
    return enrichAdminPaymentRecord(toAdminPaymentRecordFromHistory(history), userCache, promotionCache);
  }

  return enrichAdminPaymentRecord(toAdminPaymentRecordFromTransaction(result.transaction), userCache, promotionCache);
}

export async function getAllBillingHistory(): Promise<BillingHistoryRecord[]> {
  const entries = await kv.getEntriesByPrefix('billing:history:');
  
  const records: BillingHistoryRecord[] = [];
  for (const entry of entries) {
    // Skip user-specific keys
    if (entry.key.includes(':user:')) {
      continue;
    }
    
    const record = entry.value as BillingHistoryRecord;
    if (!record || typeof record.reference !== 'string') {
      continue;
    }
    
    records.push(record);
  }
  
  // Sort by paidAt date, newest first
  return records.sort((a, b) => {
    const aDate = new Date(a.paidAt || a.createdAt || '').getTime();
    const bDate = new Date(b.paidAt || b.createdAt || '').getTime();
    return bDate - aDate;
  });
}

export async function updatePayoutRequest(reference: string, status: Extract<PaymentHistoryStatus, 'completed' | 'failed'>): Promise<BillingHistoryRecord> {
  const record = await kv.get<BillingHistoryRecord>(billingHistoryKey(reference));
  if (!record || record.type !== 'payout') {
    throw new Error('Payout request not found');
  }

  const updatedRecord: BillingHistoryRecord = {
    ...record,
    status,
    paidAt: status === 'completed' ? new Date().toISOString() : record.paidAt,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(billingHistoryKey(reference), updatedRecord);
  return normalizeAdminHistoryRecord(updatedRecord);
}

export async function initializeCheckout(input: InitializeCheckoutInput): Promise<CheckoutTransaction> {
  const user = await userService.getUserByUserId(input.userId);
  if (!user) {
    throw new Error('User profile not found');
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const reference = buildReference(input.plan);
  const amountInKobo = Math.round(input.amount * 100);

  const payload = await paystackRequest<PaystackInitializeResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: amountInKobo,
      currency: 'NGN',
      reference,
      callback_url: input.callbackUrl,
      metadata: {
        userId: input.userId,
        plan: input.plan,
        billingPeriod: input.billingPeriod,
        couponCode: input.couponCode,
        amount: input.amount,
        promotionId: input.promotionId,
        releaseId: input.releaseId,
        promotionAddonPlanId: input.promotionAddonPlanId,
        promotionAddonAmount: input.promotionAddonAmount,
      },
    }),
  });

  if (!payload.status || !payload.data?.authorization_url || !payload.data?.access_code) {
    throw new Error(payload.message || 'Unable to initialize Paystack checkout');
  }

  const now = new Date().toISOString();
  const transaction: CheckoutTransaction = {
    id: crypto.randomUUID(),
    userId: input.userId,
    email: input.email,
    plan: input.plan,
    billingPeriod: input.billingPeriod,
    amount: input.amount,
    baseAmount: input.baseAmount,
    discountAmount: input.discountAmount,
    couponCode: input.couponCode,
    promotionId: input.promotionId,
    releaseId: input.releaseId,
    promotionAddonPlanId: input.promotionAddonPlanId,
    promotionAddonAmount: input.promotionAddonAmount,
    currency: 'NGN',
    provider: 'paystack',
    reference: payload.data.reference,
    authorizationUrl: payload.data.authorization_url,
    accessCode: payload.data.access_code,
    callbackUrl: input.callbackUrl,
    status: 'initialized',
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(transactionKey(transaction.reference), transaction);
  await kv.set(userTransactionKey(transaction.userId, transaction.reference), true);

  return transaction;
}

export async function verifyCheckout(reference: string, expectedUserId?: string) {
  const transaction = await getCheckoutTransaction(reference);
  if (!transaction) {
    throw new Error('Payment transaction not found');
  }

  if (expectedUserId && transaction.userId !== expectedUserId) {
    throw new Error('You are not allowed to verify this transaction');
  }

  if (transaction.status === 'success') {
    await storeBillingHistory(transaction);
    const existingUser = await userService.getUserByUserId(transaction.userId);
    return { transaction, user: existingUser };
  }

  const payload = await paystackRequest<PaystackVerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (!payload.status || !payload.data) {
    throw new Error(payload.message || 'Unable to verify Paystack payment');
  }

  const paystackData = payload.data;
  const amountInKobo = Math.round(transaction.amount * 100);
  const customerEmail = paystackData.customer?.email?.trim().toLowerCase();
  const transactionEmail = transaction.email.trim().toLowerCase();
  const metadataUserId = paystackData.metadata?.userId;
  const metadataBillingPeriod = paystackData.metadata?.billingPeriod;
  const metadataPromotionId = typeof paystackData.metadata?.promotionId === 'string' ? paystackData.metadata.promotionId : undefined;

  if (paystackData.reference !== transaction.reference) {
    throw new Error('Payment reference mismatch');
  }

  if (paystackData.amount !== amountInKobo) {
    throw new Error('Payment amount mismatch');
  }

  if (customerEmail && customerEmail !== transactionEmail) {
    throw new Error('Payment email mismatch');
  }

  if (metadataUserId && metadataUserId !== transaction.userId) {
    throw new Error('Payment user mismatch');
  }

  if (metadataBillingPeriod && metadataBillingPeriod !== transaction.billingPeriod) {
    throw new Error('Payment billing period mismatch');
  }

  if (metadataPromotionId && transaction.promotionId && metadataPromotionId !== transaction.promotionId) {
    throw new Error('Promotion payment mismatch');
  }

  const nextStatus: CheckoutStatus = paystackData.status === 'success' ? 'success' : 'failed';
  const now = new Date().toISOString();
  const updatedTransaction: CheckoutTransaction = {
    ...transaction,
    status: nextStatus,
    gatewayStatus: paystackData.status,
    paidAt: paystackData.paid_at || transaction.paidAt,
    failureReason: nextStatus === 'failed' ? paystackData.gateway_response || payload.message : undefined,
    verificationData: paystackData,
    updatedAt: now,
  };

  await kv.set(transactionKey(reference), updatedTransaction);
  await storeBillingHistory(updatedTransaction);

  let updatedUser = await userService.getUserByUserId(transaction.userId);

  if (nextStatus === 'success') {
    if (transaction.plan === 'promotion') {
      const promotionId = transaction.promotionId || metadataPromotionId;
      if (!promotionId) {
        throw new Error('Promotion transaction is missing campaign metadata');
      }

      await promotionService.activatePromotionPayment(promotionId, transaction.reference, paystackData.paid_at);
    } else if (transaction.plan === 'release') {
      // Release payments don't change subscription tier, they're one-time payments
      // Just mark the transaction as successful; no user updates needed
    } else {
      // Subscription payment (artist, super_artist, or partner plan)
      if (!updatedUser) {
        throw new Error('User profile not found');
      }

      updatedUser = await userService.updateUser(updatedUser.id, {
        subscriptionTier: transaction.plan,
      });
    }
  }

  return {
    transaction: updatedTransaction,
    user: updatedUser,
  };
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyWebhookSignature(rawPayload: string, signatureHeader?: string | null) {
  if (!signatureHeader) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getPaystackSecretKey()),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawPayload));
  return toHex(signatureBuffer) === signatureHeader.trim().toLowerCase();
}

export async function handleWebhookEvent(rawPayload: string) {
  const event = JSON.parse(rawPayload) as PaystackWebhookEvent;
  const reference = event.data?.reference;

  if (!reference) {
    return { ignored: true, reason: 'No transaction reference provided' };
  }

  if (event.event === 'charge.success') {
    const result = await verifyCheckout(reference);
    return {
      ignored: false,
      event: event.event,
      transaction: result.transaction,
    };
  }

  return {
    ignored: true,
    event: event.event,
    reason: 'Webhook event acknowledged but no action was required',
  };
}