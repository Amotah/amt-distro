import { projectId } from '../../../utils/supabase/info';
import { getStoredAccessToken } from './auth-session';
import type { UserProfile } from './user-api';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-79198001`;

export type BillingPlan = 'artist' | 'super_artist' | 'partner' | 'promotion' | 'release';
export type BillingPeriod = 'monthly' | 'yearly';
export type PaymentHistoryType = 'subscription' | 'payout';
export type PaymentHistoryStatus = 'completed' | 'failed' | 'pending';

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
  amount: number;
  currency: 'NGN';
  provider: 'paystack';
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  callbackUrl: string;
  status: 'initialized' | 'success' | 'failed';
  gatewayStatus?: string;
  paidAt?: string;
  failureReason?: string;
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
  paidAt?: string;
  cancelledAt?: string;
  expiresAt?: string;
  billingPeriod?: BillingPeriod;
  createdAt: string;
  updatedAt: string;
}

interface RequestPayoutInput {
  amount: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
}

interface RequestPayoutResponse {
  request: BillingHistoryRecord;
}

interface AdminPayoutRequestsResponse {
  requests: BillingHistoryRecord[];
}

interface InitializePaystackPaymentInput {
  email: string;
  plan: BillingPlan;
  amount?: number;
  billingPeriod?: BillingPeriod;
  couponCode?: string;
  callbackUrl: string;
  promotionId?: string;
  releaseId?: string;
  promotionAddonPlanId?: string;
  promotionAddonAmount?: number;
  /** ISO date string — when set, the new subscription period starts from this date instead of payment date (used for mid-cycle plan upgrades) */
  scheduledStartDate?: string;
}

interface InitializePaystackPaymentResponse {
  transaction: CheckoutTransaction;
  authorizationUrl: string;
  reference: string;
  freePass?: boolean;
  activePlan?: string;
  releaseId?: string;
  message?: string;
}

interface VerifyPaystackPaymentResponse {
  transaction: CheckoutTransaction;
  user?: UserProfile | null;
}

interface BillingHistoryResponse {
  history: BillingHistoryRecord[];
}

export interface RoyaltyBalance {
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  lastPayoutDate?: string;
  lastPayoutAmount?: number;
  currency: 'NGN';
  updatedAt: string;
}

export interface RoyaltyPlatformBreakdown {
  streams: number;
  revenue: number;
}

export interface RoyaltyMonthlyTrendPoint {
  month: string;
  revenue: number;
  streams: number;
}

export interface RoyaltyEarningsStats {
  totalStreams: number;
  totalRevenue: number;
  platformBreakdown: Record<string, RoyaltyPlatformBreakdown>;
  monthlyTrend: RoyaltyMonthlyTrendPoint[];
}

export interface RoyaltyEarningRecord {
  id: string;
  userId: string;
  trackId: string;
  releaseId: string;
  platform: string;
  reportId: string;
  period: string;
  streams: number;
  grossRevenue: number;
  netRevenue: number;
  splitPercentage: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  createdAt: string;
  updatedAt: string;
}

export interface RoyaltyEarningsSummary {
  earnings: RoyaltyEarningRecord[];
  stats: RoyaltyEarningsStats;
}

export interface LabelArtistEarningsSummary {
  artistCount: number;
  totalArtistEarnings: number;
  availableArtistBalance: number;
  pendingArtistBalance: number;
  totalArtistStreams: number;
  updatedAt: string;
  platformBreakdown: Record<string, RoyaltyPlatformBreakdown>;
  monthlyTrend: RoyaltyMonthlyTrendPoint[];
  topArtists: Array<{
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
  }>;
}

export interface LabelArtistMonthlyTrend {
  artistId: string;
  userId: string;
  artistName: string;
  email: string;
  updatedAt: string;
  monthlyTrend: RoyaltyMonthlyTrendPoint[];
}

export interface LabelArtistMonthlyTrendsResponse {
  labelMonthlyTrend: RoyaltyMonthlyTrendPoint[];
  artists: LabelArtistMonthlyTrend[];
  updatedAt: string;
}

function getUserAuthToken(): string {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return token;
}

async function paymentApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getUserAuthToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export function initializePaystackPayment(input: InitializePaystackPaymentInput) {
  return paymentApiCall<InitializePaystackPaymentResponse>('/payments/paystack/initialize', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getReleaseFee(): Promise<{ activePlan: string; fee: number; releasesThisMonth?: number; partnerQuotaRemaining?: number }> {
  return paymentApiCall<{ activePlan: string; fee: number; releasesThisMonth?: number; partnerQuotaRemaining?: number }>('/payments/release-fee');
}

export function verifyPaystackPayment(reference: string) {
  return paymentApiCall<VerifyPaystackPaymentResponse>('/payments/paystack/verify', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  });
}

export async function getBillingHistory() {
  const result = await paymentApiCall<BillingHistoryResponse>('/payments/history');
  return result.history;
}

// ==================== PAYMENT DISPUTES ====================

export type DisputeType = 'failed_debit' | 'duplicate' | 'wrong_amount' | 'unauthorized' | 'other';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected' | 'escalated';

export interface PaymentDispute {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  transactionReference: string;
  transactionAmount: number;
  transactionDate?: string | null;
  disputeType: DisputeType;
  description: string;
  bankStatementNote?: string | null;
  contactPhone?: string | null;
  status: DisputeStatus;
  adminNotes?: string | null;
  resolvedBy?: string | null;
  resolution?: string | null;
  resolvedAt?: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
}

export interface SubmitDisputeInput {
  transactionReference: string;
  transactionAmount: number;
  transactionDate?: string;
  disputeType: DisputeType;
  description: string;
  bankStatementNote?: string;
  contactPhone?: string;
}

export async function submitDispute(input: SubmitDisputeInput): Promise<PaymentDispute> {
  const result = await paymentApiCall<{ dispute: PaymentDispute }>('/payments/disputes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.dispute;
}

export async function getUserDisputes(): Promise<PaymentDispute[]> {
  const result = await paymentApiCall<{ disputes: PaymentDispute[] }>('/payments/disputes');
  return result.disputes;
}

export async function getUserDispute(id: string): Promise<PaymentDispute> {
  const result = await paymentApiCall<{ dispute: PaymentDispute }>(`/payments/disputes/${id}`);
  return result.dispute;
}

export interface DisputeUpdate {
  id: string;
  disputeId: string;
  actorType: 'user' | 'admin' | 'system';
  actorLabel: string | null;
  eventType: string;
  description: string;
  createdAt: string;
}

export async function getDisputeTimeline(id: string): Promise<DisputeUpdate[]> {
  const result = await paymentApiCall<{ timeline: DisputeUpdate[] }>(`/payments/disputes/${id}/timeline`);
  return result.timeline;
}

// ==================== BANK ACCOUNT ====================

export interface BankAccountRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserBankAccount {
  approved: BankAccountRequest | null;
  pending: BankAccountRequest | null;
}

export async function getUserBankAccount(): Promise<UserBankAccount> {
  return paymentApiCall<UserBankAccount>('/payments/bank-account');
}

export async function submitBankAccountRequest(input: {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
}): Promise<BankAccountRequest> {
  const result = await paymentApiCall<{ request: BankAccountRequest }>('/payments/bank-account/request', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.request;
}

export function requestPayout(input: RequestPayoutInput) {
  return paymentApiCall<RequestPayoutResponse>('/payments/payout/request', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getAdminPayoutRequests() {
  const result = await paymentApiCall<AdminPayoutRequestsResponse>('/admin/payout-requests');
  return result.requests;
}

export async function updateAdminPayoutRequest(reference: string, status: Extract<PaymentHistoryStatus, 'completed' | 'failed'>) {
  const result = await paymentApiCall<{ request: BillingHistoryRecord }>(`/admin/payout-requests/${reference}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

  return result.request;
}

export async function getLabelArtistEarningsSummary() {
  const result = await paymentApiCall<{ summary: LabelArtistEarningsSummary }>('/users/label/earnings-summary');
  return result.summary;
}

export async function getLabelArtistMonthlyTrends() {
  const result = await paymentApiCall<{ trends: LabelArtistMonthlyTrendsResponse }>('/users/label/artist-monthly-trends');
  return result.trends;
}

export async function getRoyaltyBalance() {
  const result = await paymentApiCall<{ balance: RoyaltyBalance }>('/royalties/balance');
  return result.balance;
}

export async function getRoyaltyEarningsSummary() {
  return paymentApiCall<RoyaltyEarningsSummary>('/royalties/earnings');
}

export async function cancelPartnerSubscription() {
  return paymentApiCall<{ message: string; subscription: BillingHistoryRecord; accessRemainsUntil: string }>('/payments/subscription/partner/cancel', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getPartnerSubscriptionStatus() {
  return paymentApiCall<{ hasActiveSubscription: boolean; subscription: BillingHistoryRecord | null }>('/payments/subscription/partner/status', {
    method: 'GET',
  });
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discountPercent: number;
  description?: string;
  scopes: string[];
  error?: string;
}

/** Validate a coupon code for a given payment scope before initiating payment. */
export async function validateCoupon(code: string, scope: string): Promise<CouponValidationResult> {
  return paymentApiCall<CouponValidationResult>('/payments/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code: code.trim().toUpperCase(), scope }),
  });
}