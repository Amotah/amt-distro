import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { getSupabaseClient } from '../../../utils/supabase/client';

/**
 * Admin API Client
 * Handles all admin-related API calls with proper authentication
 */

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-79198001`;

// Get auth token — always use the live Supabase session so we never send expired tokens.
// Falls back to sessionStorage for backward compatibility if no active session.
async function getAuthToken(): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Keep sessionStorage in sync so other code that reads it stays current
      sessionStorage.setItem('admin_access_token', session.access_token);
      return session.access_token;
    }
  } catch {
    // fall through to sessionStorage fallback
  }
  const token = sessionStorage.getItem('admin_access_token');
  if (!token) throw new Error('Not authenticated');
  return token;
}

// Generic API call helper
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

// ==================== ADMIN USER MANAGEMENT ====================

export interface AdminUser {
  id: string;
  userId: string;
  role: 'superadmin' | 'admin_finance' | 'admin_content' | 'admin_support' | 'admin_fraud' | 'admin_analytics';
  permissions: string[];
  department?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export async function createAdminUser(data: {
  userId: string;
  role: AdminUser['role'];
  department?: string;
  defaultPassword?: string;
}): Promise<AdminUser> {
  const result = await apiCall<{ adminUser: AdminUser }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.adminUser;
}

export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const result = await apiCall<{ admins: AdminUser[] }>('/admin/users');
  return result.admins;
}

export async function updateAdminRole(userId: string, role: AdminUser['role']): Promise<AdminUser> {
  const result = await apiCall<{ adminUser: AdminUser }>(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
  return result.adminUser;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await apiCall(`/admin/admin-users/${userId}`, { method: 'DELETE' });
}

// ==================== USER MANAGEMENT ====================

export interface User {
  id: string;
  userId: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  artistName?: string;
  labelName?: string;
  role: 'artist' | 'partner' | 'admin';
  subscriptionTier: 'artist' | 'super_artist' | 'partner';
  isVerified: boolean;
  country?: string;
  state?: string;
  bio?: string;
  genres?: string[];
  socialLinks?: {
    spotify?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
  };
  verificationStatus?: 'verified' | 'pending' | 'unverified';
  verification?: {
    emailConfirmed: boolean;
    idVerified: boolean;
    idVerificationOptional: boolean;
    profileReviewed: boolean;
    idDocumentUrl?: string;
    requestNotes?: string;
    requestedAt?: string;
    reviewedAt?: string;
    reviewNotes?: string;
  };
  profileImage?: string;
  bannerImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserResult {
  user: User;
  provisioningMode?: 'auth';
}

export async function getAllUsers(): Promise<User[]> {
  const result = await apiCall<{ users: User[] }>('/admin/all-users');
  return result.users;
}

export async function createUser(data: {
  userId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  artistName?: string;
  labelName?: string;
  role: 'artist' | 'label';
  subscriptionTier?: 'free' | 'artist' | 'label';
  country?: string;
  state?: string;
  password?: string;
  defaultPassword?: string;
}): Promise<CreateUserResult> {
  const result = await apiCall<CreateUserResult>('/users/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  const result = await apiCall<{ user: User }>(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result.user;
}

export async function getCurrentUserProfile(): Promise<User> {
  const result = await apiCall<{ user: User }>('/users/profile');
  return result.user;
}

export async function updateCurrentUserProfile(updates: Partial<User>): Promise<User> {
  const result = await apiCall<{ user: User }>('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result.user;
}

export async function deleteUser(userId: string): Promise<void> {
  await apiCall(`/admin/users/${userId}`, { method: 'DELETE' });
}

// ==================== RELEASE MANAGEMENT ====================

export interface Release {
  id: string;
  userId: string;
  title: string;
  upc?: string;
  upcRequested?: boolean;
  releaseType: 'single' | 'ep' | 'album';
  releaseDate: string;
  status: 'draft' | 'submitted' | 'processing' | 'live' | 'takedown' | 'failed' | 'rejected';
  artworkUrl?: string;
  primaryArtist: string;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseTrackContributor {
  id: string;
  name: string;
  role: 'primary_artist' | 'featured_artist' | 'producer' | 'composer' | 'lyricist' | 'remixer';
}

export interface ReleaseTrack {
  id: string;
  releaseId: string;
  title: string;
  version?: string;
  trackNumber: number;
  discNumber: number;
  duration: number;
  isrc?: string;
  isrcRequested?: boolean;
  language: string;
  explicit: boolean;
  genre: string;
  subgenre?: string;
  contributors: ReleaseTrackContributor[];
  lyrics?: string;
  audioFilePath: string;
  audioFileUrl: string;
  previewStart?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAnalyticsUploadRowInput {
  date?: string;
  platform?: string;
  trackId?: string;
  isrc?: string;
  trackTitle?: string;
  artistName?: string;
  streams?: number;
  listeners?: number;
  revenue?: number;
  territory?: string;
  avgStreamDurationSeconds?: number;
  saves?: number;
  playlistAdds?: number;
  followers?: number;
  ageGroup?: string;
  gender?: string;
}

export interface AdminAnalyticsUploadReport {
  id: string;
  uploadedByUserId: string;
  fileName: string;
  reportType: string;
  platform: string;
  reportMonth: string;
  reportYear: string;
  reportPeriodLabel: string;
  status: 'processed' | 'error';
  recordsProcessed: number;
  matchedRecords: number;
  unmatchedRecords: number;
  totalStreams: number;
  totalListeners: number;
  totalRevenue: number;
  uploadedAt: string;
  updatedAt: string;
}

export interface AdminRoyaltyUploadRowInput {
  reportDate?: string;
  isrc?: string;
  trackTitle?: string;
  artistName?: string;
  streams?: number;
  revenue?: number;
  territory?: string;
}

export interface AdminRoyaltyUploadReport {
  id: string;
  uploadedByUserId: string;
  fileName: string;
  reportType: 'royalties';
  platform: string;
  reportMonth: string;
  reportYear: string;
  reportPeriodLabel: string;
  status: 'processed' | 'error';
  recordsProcessed: number;
  matchedRecords: number;
  unmatchedRecords: number;
  earningsCreated: number;
  totalStreams: number;
  totalRevenue: number;
  uploadedAt: string;
  updatedAt: string;
  fileSizeBytes?: number;
  errorMessage?: string;
}

export async function getAllReleases(): Promise<Release[]> {
  const result = await apiCall<{ releases: Release[] }>('/admin/releases');
  return result.releases;
}

export async function getAnalyticsUploadReports(): Promise<AdminAnalyticsUploadReport[]> {
  const result = await apiCall<{ reports: AdminAnalyticsUploadReport[] }>('/admin/analytics/reports');
  return result.reports;
}

export async function uploadAnalyticsReport(data: {
  fileName: string;
  reportType: string;
  platform?: string;
  reportMonth: string;
  reportYear: string;
  rows: AdminAnalyticsUploadRowInput[];
}): Promise<AdminAnalyticsUploadReport> {
  const result = await apiCall<{ report: AdminAnalyticsUploadReport }>('/admin/analytics/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return result.report;
}

export async function getRoyaltyUploadReports(): Promise<AdminRoyaltyUploadReport[]> {
  const result = await apiCall<{ reports: AdminRoyaltyUploadReport[] }>('/admin/royalty-reports');
  return result.reports;
}

export async function uploadRoyaltyReport(data: {
  fileName: string;
  platform: string;
  reportMonth: string;
  reportYear: string;
  rows: AdminRoyaltyUploadRowInput[];
  fileSizeBytes?: number;
}): Promise<AdminRoyaltyUploadReport> {
  const result = await apiCall<{ report: AdminRoyaltyUploadReport }>('/admin/royalty-reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return result.report;
}

export async function getAdminReleaseDetails(releaseId: string): Promise<{ release: Release; tracks: ReleaseTrack[] }> {
  return await apiCall<{ release: Release; tracks: ReleaseTrack[] }>(`/admin/releases/${releaseId}`);
}

export async function updateRelease(releaseId: string, updates: Partial<Release>): Promise<Release> {
  const result = await apiCall<{ release: Release }>(`/admin/releases/${releaseId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result.release;
}

export async function deleteRelease(releaseId: string): Promise<void> {
  await apiCall(`/admin/releases/${releaseId}`, {
    method: 'DELETE',
  });
}

export async function createAdminReleaseTrack(
  releaseId: string,
  data: Omit<ReleaseTrack, 'id' | 'createdAt' | 'updatedAt' | 'releaseId'>
): Promise<ReleaseTrack> {
  const result = await apiCall<{ track: ReleaseTrack }>(`/admin/releases/${releaseId}/tracks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.track;
}

export async function assignReleaseUpc(releaseId: string, upc?: string): Promise<{ release: Release; upc: string }> {
  return await apiCall<{ release: Release; upc: string }>(`/admin/releases/${releaseId}/upc`, {
    method: 'POST',
    body: JSON.stringify(upc ? { upc } : {}),
  });
}

export async function assignTrackIsrc(trackId: string, isrc?: string): Promise<{ track: ReleaseTrack; isrc: string }> {
  return await apiCall<{ track: ReleaseTrack; isrc: string }>(`/admin/tracks/${trackId}/isrc`, {
    method: 'POST',
    body: JSON.stringify(isrc ? { isrc } : {}),
  });
}

// ==================== BLOG MANAGEMENT ====================

export type BlogPostSource = 'manual' | 'release-update';

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  image?: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  source: BlogPostSource;
  sourceKey?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostInput {
  title: string;
  excerpt: string;
  content?: string;
  image?: string;
  category?: string;
  author?: string;
  date?: string;
  published?: boolean;
}

export async function getAdminBlogPosts(): Promise<BlogPost[]> {
  const result = await apiCall<{ posts: BlogPost[] }>('/admin/blog/posts');
  return result.posts;
}

export async function createAdminBlogPost(data: BlogPostInput): Promise<BlogPost> {
  const result = await apiCall<{ post: BlogPost }>('/admin/blog/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.post;
}

export async function updateAdminBlogPost(postId: string, data: Partial<BlogPostInput>): Promise<BlogPost> {
  const result = await apiCall<{ post: BlogPost }>(`/admin/blog/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return result.post;
}

export async function deleteAdminBlogPost(postId: string): Promise<void> {
  await apiCall(`/admin/blog/posts/${postId}`, {
    method: 'DELETE',
  });
}

// ==================== ROYALTY MANAGEMENT ====================

export interface Earning {
  id: string;
  userId: string;
  trackId: string;
  platform: string;
  streams: number;
  grossRevenue: number;
  netRevenue: number;
  period: string;
  status: 'pending' | 'approved' | 'paid';
  createdAt: string;
}

export async function updateRoyalty(earningId: string, updates: Partial<Earning>): Promise<Earning> {
  const result = await apiCall<{ earning: Earning }>(`/admin/royalties/${earningId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result.earning;
}

export async function approveEarnings(earningIds: string[]): Promise<void> {
  await apiCall('/admin/royalties/approve', {
    method: 'POST',
    body: JSON.stringify({ earningIds }),
  });
}

// ==================== FRAUD MANAGEMENT ====================

export interface FraudAlert {
  id: string;
  userId?: string;
  trackId?: string;
  ruleType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  metadata?: any;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

export async function getAllFraudAlerts(): Promise<FraudAlert[]> {
  const result = await apiCall<{ alerts: FraudAlert[] }>('/admin/fraud/alerts');
  return result.alerts;
}

export async function resolveFraudAlert(
  alertId: string,
  status: FraudAlert['status'],
  notes?: string
): Promise<FraudAlert> {
  const result = await apiCall<{ alert: FraudAlert }>(`/admin/fraud/${alertId}/resolve`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes }),
  });
  return result.alert;
}

// ==================== AUDIT LOGS ====================

export interface AuditLog {
  id: string;
  adminUserId: string;
  adminUserEmail?: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export async function getAuditLogs(params: {
  userId?: string;
  resource?: string;
  resourceId?: string;
}): Promise<AuditLog[]> {
  const queryParams = new URLSearchParams();
  if (params.userId) queryParams.append('userId', params.userId);
  if (params.resource) queryParams.append('resource', params.resource);
  if (params.resourceId) queryParams.append('resourceId', params.resourceId);

  const result = await apiCall<{ logs: AuditLog[] }>(
    `/admin/audit-logs?${queryParams.toString()}`
  );
  return result.logs;
}

// ==================== USER ACTIVITY LOGS ====================

export type UserActivityAction =
  | 'profile_updated'
  | 'release_created'
  | 'release_updated'
  | 'release_submitted'
  | 'release_distributed'
  | 'track_added'
  | 'payout_requested'
  | 'payment_initialized'
  | 'payment_verified'
  | 'subscription_cancelled'
  | 'password_changed'
  | 'login';

export interface UserActivityLog {
  id: string;
  userId: string;
  userEmail?: string;
  action: UserActivityAction;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export async function getUserActivityLogs(userId?: string): Promise<UserActivityLog[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const result = await apiCall<{ logs: UserActivityLog[] }>(`/admin/user-activity${query}`);
  return result.logs;
}

// ==================== STATISTICS ====================

export interface AdminStats {
  totalAdmins: number;
  adminsByRole: Record<string, number>;
  recentActions: number;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  email: string;
  reference: string;
  type: 'payout';
  provider: 'internal';
  method: 'Bank Transfer';
  amount: number;
  currency: 'NGN';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  requesterName?: string;
  requesterRole?: 'artist' | 'label' | 'admin';
  payoutAccount?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminPaymentPurpose = 'release' | 'marketing' | 'payout';

export interface AdminPaymentRecord {
  id: string;
  userId: string;
  email: string;
  reference: string;
  type: 'subscription' | 'payout';
  provider: 'paystack' | 'internal';
  method: 'Paystack' | 'Bank Transfer';
  plan?: 'artist' | 'label' | 'promotion';
  amount: number;
  currency: 'NGN';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  requesterName?: string;
  requesterRole?: 'artist' | 'label' | 'admin';
  payoutAccount?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  purpose: AdminPaymentPurpose;
  checkoutStatus?: 'initialized' | 'success' | 'failed';
  gatewayStatus?: string;
  billingPeriod?: 'monthly' | 'yearly';
  baseAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  callbackUrl?: string;
  promotionId?: string;
  authorizationUrl?: string;
  accessCode?: string;
  failureReason?: string;
  accountName?: string;
  accountRole?: 'artist' | 'label' | 'admin' | 'unknown';
  releaseArtistName?: string;
  releaseTitle?: string;
}

export async function getAdminStatistics(): Promise<AdminStats> {
  const result = await apiCall<{ stats: AdminStats }>('/admin/statistics');
  return result.stats;
}

export async function getPayoutRequests(): Promise<PayoutRequest[]> {
  const result = await apiCall<{ requests: PayoutRequest[] }>('/admin/payout-requests');
  return result.requests;
}

export async function updatePayoutRequest(reference: string, status: 'completed' | 'failed'): Promise<PayoutRequest> {
  const result = await apiCall<{ request: PayoutRequest }>(`/admin/payout-requests/${reference}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

  return result.request;
}

export async function getAdminPayments(): Promise<AdminPaymentRecord[]> {
  const result = await apiCall<{ payments: AdminPaymentRecord[] }>('/admin/payments');
  return result.payments;
}

export async function reconcileAdminPayment(reference: string): Promise<AdminPaymentRecord> {
  const result = await apiCall<{ payment: AdminPaymentRecord }>(`/admin/payments/${reference}/reconcile`, {
    method: 'PUT',
  });

  return result.payment;
}

export async function getAdminBillingHistory(): Promise<AdminPaymentRecord[]> {
  const result = await apiCall<{ billingHistory: AdminPaymentRecord[] }>('/admin/billing/history');
  return result.billingHistory;
}

// ==================== COUPON MANAGEMENT ====================

export type CouponScope = 'subscription' | 'release' | 'promotion' | 'marketing' | 'all';
export type CouponStatus = 'active' | 'inactive' | 'expired';

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountPercent: number;
  scopes: CouponScope[];
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  status: CouponStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountPercent: number;
  scopes: CouponScope[];
  maxUses?: number;
  expiresAt?: string;
}

export async function getAdminCoupons(): Promise<Coupon[]> {
  const result = await apiCall<{ coupons: Coupon[] }>('/admin/coupons');
  return result.coupons;
}

export async function createAdminCoupon(data: CreateCouponInput): Promise<Coupon> {
  const result = await apiCall<{ coupon: Coupon }>('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.coupon;
}

export async function updateAdminCoupon(couponId: string, data: Partial<CreateCouponInput & { status: CouponStatus }>): Promise<Coupon> {
  const result = await apiCall<{ coupon: Coupon }>(`/admin/coupons/${couponId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return result.coupon;
}

export async function deleteAdminCoupon(couponId: string): Promise<void> {
  await apiCall(`/admin/coupons/${couponId}`, { method: 'DELETE' });
}

export interface CouponUsage {
  id: string;
  couponId: string;
  couponCode: string;
  userId: string;
  userEmail: string;
  userName?: string;
  scope: string;
  plan: string;
  amountBefore: number;
  amountAfter: number;
  discountAmount: number;
  discountPercent: number;
  paymentReference?: string;
  createdAt: string;
}

export async function getAdminCouponUsages(couponId: string): Promise<CouponUsage[]> {
  const result = await apiCall<{ usages: CouponUsage[] }>(`/admin/coupons/${couponId}/usages`);
  return result.usages;
}

// ==================== PAYMENT DISPUTES (ADMIN) ====================

export type DisputeType = 'failed_debit' | 'duplicate' | 'wrong_amount' | 'unauthorized' | 'other';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected' | 'escalated';

export interface AdminDispute {
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

export interface DisputeStats {
  total: number;
  open: number;
  under_review: number;
  resolved: number;
  rejected: number;
  escalated: number;
  critical: number;
}

export async function getAdminDisputes(params?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<AdminDispute[]> {
  const q = new URLSearchParams();
  if (params?.status) q.append('status', params.status);
  if (params?.priority) q.append('priority', params.priority);
  if (params?.search) q.append('search', params.search);
  const result = await apiCall<{ disputes: AdminDispute[] }>(`/admin/disputes?${q.toString()}`);
  return result.disputes;
}

export async function getAdminDisputeStats(): Promise<DisputeStats> {
  const result = await apiCall<{ stats: DisputeStats }>('/admin/disputes/stats');
  return result.stats;
}

export async function updateAdminDispute(
  id: string,
  updates: { status?: DisputeStatus; adminNotes?: string; resolution?: string; priority?: AdminDispute['priority'] }
): Promise<AdminDispute> {
  const result = await apiCall<{ dispute: AdminDispute }>(`/admin/disputes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return result.dispute;
}

export interface AdminDisputeUpdate {
  id: string;
  disputeId: string;
  actorType: 'user' | 'admin' | 'system';
  actorLabel: string | null;
  eventType: string;
  description: string;
  createdAt: string;
}

export async function getAdminDisputeTimeline(id: string): Promise<AdminDisputeUpdate[]> {
  const result = await apiCall<{ timeline: AdminDisputeUpdate[] }>(`/admin/disputes/${id}/timeline`);
  return result.timeline;
}

// ==================== BANK ACCOUNT REQUESTS ====================

export interface AdminBankAccountRequest {
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

export async function getAdminBankAccountRequests(status?: string): Promise<AdminBankAccountRequest[]> {
  const qs = status && status !== 'all' ? `?status=${status}` : '';
  const result = await apiCall<{ requests: AdminBankAccountRequest[] }>(`/admin/bank-account-requests${qs}`);
  return result.requests;
}

export async function reviewBankAccountRequest(
  id: string,
  decision: { status: 'approved' | 'rejected'; adminNotes?: string }
): Promise<AdminBankAccountRequest> {
  const result = await apiCall<{ request: AdminBankAccountRequest }>(`/admin/bank-account-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(decision),
  });
  return result.request;
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem('admin_access_token', token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem('admin_access_token');
}

export function hasAdminToken(): boolean {
  return !!sessionStorage.getItem('admin_access_token');
}

// ==================== ADVANCED ANALYTICS ====================

export interface AdvancedAnalyticsUserGrowth {
  month: string;
  new: number;
  cumulative: number;
}

export interface AdvancedAnalyticsAtRiskUser {
  id: string;
  userId: string;
  email: string;
  artistName: string | null;
  createdAt: string;
  lastRelease: string | null;
  daysSince: number | null;
}

export interface AdvancedAnalyticsTopRelease {
  id: string;
  title: string;
  artist: string;
  type: string;
  genre: string;
  streams: number;
  revenue: number;
  releaseDate: string;
  status: string;
}

export interface AdvancedAnalyticsTopEarner {
  userId: string;
  name: string;
  email: string;
  earnings: number;
  availableBalance: number;
  pendingBalance: number;
}

export interface AdvancedAnalyticsData {
  userAnalytics: {
    totalUsers: number;
    artists: number;
    labels: number;
    monthlyGrowth: AdvancedAnalyticsUserGrowth[];
    subscriptionBreakdown: { tier: string; count: number }[];
    genreDistribution: { genre: string; count: number }[];
    countryDistribution: { country: string; count: number }[];
    atRiskUsers: AdvancedAnalyticsAtRiskUser[];
    churnedCount: number;
    avgReleasesPerArtist: number;
  };
  releaseAnalytics: {
    totalReleases: number;
    byType: { type: string; count: number; revenue: number; streams: number }[];
    byGenre: { genre: string; count: number; revenue: number; streams: number }[];
    byStatus: { status: string; count: number }[];
    monthlyReleases: { month: string; count: number }[];
    topReleases: AdvancedAnalyticsTopRelease[];
  };
  platformAnalytics: {
    dspBreakdown: { platform: string; streams: number; revenue: number; listeners: number; records: number }[];
    geographyBreakdown: { country: string; streams: number; revenue: number }[];
    demographics: { ageGroup: string; male: number; female: number; other: number }[];
    monthlyTrends: { month: string; streams: number; revenue: number; listeners: number }[];
    totalAnalyticsRecords: number;
    totalRoyaltyBatches: number;
  };
  financialAnalytics: {
    totalRevenue: number;
    subscriptionRevenue: number;
    royaltyRevenue: number;
    totalPaidOut: number;
    pendingPayouts: number;
    monthlyRevenue: { month: string; revenue: number; payouts: number; subscriptions: number }[];
    forecastNextMonth: number;
    topEarners: AdvancedAnalyticsTopEarner[];
  };
  meta: {
    generatedAt: string;
    usersLoaded: number;
    releasesLoaded: number;
    analyticsRecordsLoaded: number;
    royaltyBatchesLoaded: number;
  };
}

export async function getAdvancedAnalytics(): Promise<AdvancedAnalyticsData> {
  return apiCall<AdvancedAnalyticsData>('/admin/advanced-analytics');
}

// ==================== CONTENT MODERATION ====================

export type FlagReason = 'copyright' | 'explicit_content' | 'metadata_incomplete' | 'duplicate' | 'malicious_content';
export type FlagSeverity = 'critical' | 'high' | 'low';
export type FlagStatus = 'pending' | 'resolved' | 'taken_down' | 'cleared' | 'escalated';

export interface ModerationFlag {
  id: string;
  releaseId?: string;
  trackId?: string;
  userId: string;
  releaseTitle?: string;
  trackTitle?: string;
  artistName?: string;
  reason: FlagReason;
  severity: FlagSeverity;
  status: FlagStatus;
  notes?: string;
  flaggedBy: 'system' | 'admin' | 'user_report';
  flaggedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export type CopyrightClaimType = 'DMCA' | 'copyright' | 'trademark' | 'other';
export type CopyrightClaimStatus = 'pending' | 'approved' | 'disputed' | 'escalated' | 'resolved';

export interface CopyrightClaim {
  id: string;
  releaseId: string;
  releaseTitle?: string;
  artistName?: string;
  claimant: string;
  claimType: CopyrightClaimType;
  dateFiled: string;
  status: CopyrightClaimStatus;
  evidence?: string;
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export type DuplicateSource = 'title_match' | 'audio_fingerprint' | 'isrc_match';
export type DuplicateStatus = 'pending' | 'confirmed_duplicate' | 'cleared';

export interface DuplicateRecord {
  id: string;
  releaseId: string;
  releaseTitle: string;
  artistName: string;
  similarReleaseId: string;
  similarReleaseTitle: string;
  similarArtistName: string;
  confidenceScore: number;
  source: DuplicateSource;
  status: DuplicateStatus;
  adminDecision?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

export type ExplicitReviewStatus = 'pending_review' | 'confirmed' | 'flag_removed' | 'label_update_required';

export interface ExplicitContentItem {
  id: string;
  trackId: string;
  releaseId?: string;
  releaseTitle?: string;
  trackTitle?: string;
  artistName?: string;
  audioUrl?: string;
  artworkUrl?: string;
  explicitFlaggedBySystem: boolean;
  explicitSetByArtist: boolean;
  status: ExplicitReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  createdAt: string;
}

export type MetadataAlertStatus = 'pending' | 'compliant' | 'fix_requested';

export interface MetadataAlert {
  id: string;
  releaseId: string;
  releaseTitle: string;
  artistName: string;
  releaseStatus: string;
  missingFields: string[];
  validationErrors: string[];
  totalIssues: number;
  status: MetadataAlertStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  requestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationAuditLog {
  id: string;
  adminUserId: string;
  adminUserEmail?: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: any;
  timestamp: string;
}

export interface ComplianceReport {
  month: string;
  summary: {
    totalFlags: number;
    flagsThisMonth: number;
    flagsByStatus: Record<string, number>;
    flagsBySeverity: Record<string, number>;
    takedownsThisMonth: number;
    copyrightClaims: number;
    claimsThisMonth: number;
    claimsByStatus: Record<string, number>;
    duplicatesConfirmed: number;
    duplicatesCleared: number;
    moderationActions: number;
    actionBreakdown: Record<string, number>;
  };
  recentActions: ModerationAuditLog[];
}

// Flagged Content
export async function getModerationFlags(): Promise<ModerationFlag[]> {
  const r = await apiCall<{ flags: ModerationFlag[] }>('/admin/moderation/flags');
  return r.flags;
}
export async function createModerationFlag(data: Partial<ModerationFlag>): Promise<ModerationFlag> {
  const r = await apiCall<{ flag: ModerationFlag }>('/admin/moderation/flags', { method: 'POST', body: JSON.stringify(data) });
  return r.flag;
}
export async function updateModerationFlag(id: string, data: Partial<ModerationFlag> & { action?: string }): Promise<ModerationFlag> {
  const r = await apiCall<{ flag: ModerationFlag }>(`/admin/moderation/flags/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return r.flag;
}

// Copyright Claims
export async function getCopyrightClaims(): Promise<CopyrightClaim[]> {
  const r = await apiCall<{ claims: CopyrightClaim[] }>('/admin/moderation/copyright');
  return r.claims;
}
export async function createCopyrightClaim(data: Partial<CopyrightClaim>): Promise<CopyrightClaim> {
  const r = await apiCall<{ claim: CopyrightClaim }>('/admin/moderation/copyright', { method: 'POST', body: JSON.stringify(data) });
  return r.claim;
}
export async function updateCopyrightClaim(id: string, data: Partial<CopyrightClaim> & { action?: string }): Promise<CopyrightClaim> {
  const r = await apiCall<{ claim: CopyrightClaim }>(`/admin/moderation/copyright/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return r.claim;
}

// Duplicates
export async function getModerationDuplicates(): Promise<DuplicateRecord[]> {
  const r = await apiCall<{ duplicates: DuplicateRecord[] }>('/admin/moderation/duplicates');
  return r.duplicates;
}
export async function decideDuplicate(id: string, action: 'confirm_duplicate' | 'clear', notes?: string): Promise<void> {
  await apiCall(`/admin/moderation/duplicates/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ action, notes }) });
}

// Explicit Content
export async function getExplicitContentQueue(): Promise<ExplicitContentItem[]> {
  const r = await apiCall<{ items: ExplicitContentItem[] }>('/admin/moderation/explicit');
  return r.items;
}
export async function reviewExplicitContent(id: string, action: 'confirm' | 'remove_flag' | 'require_update', notes?: string): Promise<void> {
  await apiCall(`/admin/moderation/explicit/${id}`, { method: 'PUT', body: JSON.stringify({ action, notes }) });
}

// Metadata Compliance
export async function getMetadataAlerts(): Promise<MetadataAlert[]> {
  const r = await apiCall<{ alerts: MetadataAlert[] }>('/admin/moderation/metadata');
  return r.alerts;
}
export async function resolveMetadataAlert(releaseId: string, action: 'mark_compliant' | 'request_fix', notes?: string): Promise<void> {
  await apiCall(`/admin/moderation/metadata/${releaseId}`, { method: 'PUT', body: JSON.stringify({ action, notes }) });
}

// Audit + Report
export async function getModerationAuditLogs(): Promise<ModerationAuditLog[]> {
  const r = await apiCall<{ logs: ModerationAuditLog[] }>('/admin/moderation/audit');
  return r.logs;
}
export async function getComplianceReport(month?: string): Promise<ComplianceReport> {
  const qs = month ? `?month=${month}` : '';
  return apiCall<ComplianceReport>(`/admin/moderation/report${qs}`);
}

// ==================== ADMIN SECURITY PANEL ====================

export type SecurityAdminRole = 'superadmin' | 'admin_operations' | 'admin_finance' | 'admin_content' | 'admin_support' | 'admin_fraud' | 'admin_analytics';
export type AdminStatus = 'active' | 'inactive' | 'suspended';

export interface SecurityAdmin {
  id: string;           // KV admin:{id}
  userId: string;
  role: SecurityAdminRole;
  permissions: string[];
  department?: string;
  email: string;
  name: string;
  status: AdminStatus;
  lastLogin?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deactivatedAt?: string;
}

export interface SecurityAccessLog {
  id: string;
  adminUserId: string;
  adminUserEmail?: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType = 'mass_deletion' | 'after_hours_access' | 'high_volume_activity' | 'unusual_ip';

export interface SecurityAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  adminUserId: string;
  adminEmail?: string;
  message: string;
  detectedAt: string;
  relatedLogs: string[];
}

export interface ApiKey {
  id: string;
  name: string;
  description: string;
  keyValue?: string;  // full value only on creation, masked otherwise
  scopes: string[];
  rateLimit: number;
  status: 'active' | 'revoked';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  revokedAt?: string;
}

export interface SecuritySettings {
  twoFactorRequired: boolean;
  sessionTimeoutMinutes: number;
  ipWhitelist: string[];
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecial: boolean;
    expiryDays: number;
    preventReuse: number;
  };
  loginAttempts: {
    maxAttempts: number;
    lockoutMinutes: number;
  };
  alertsEnabled: boolean;
  afterHoursAlertEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const ALL_PERMISSIONS_LIST = [
  'users.view','users.create','users.edit','users.delete','users.ban','users.verify',
  'artists.view','artists.edit','artists.delete','artists.verify',
  'releases.view','releases.edit','releases.delete','releases.approve','releases.takedown',
  'distributions.view','distributions.retry','distributions.cancel',
  'royalties.view','royalties.edit','royalties.approve','royalties.dispute','royalties.manage',
  'payments.view','payments.approve','payments.cancel','payments.refund',
  'reports.view','reports.upload',
  'fraud.view','fraud.investigate','fraud.resolve','fraud.flag_users',
  'admins.view','admins.create','admins.edit','admins.delete',
  'system.settings','system.logs','system.analytics',
] as const;

export type Permission = typeof ALL_PERMISSIONS_LIST[number];

export const ROLE_LABELS: Record<SecurityAdminRole, string> = {
  superadmin: 'Super Admin',
  admin_operations: 'Operations Admin',
  admin_finance: 'Finance Admin',
  admin_content: 'Content Admin',
  admin_support: 'Support Admin',
  admin_fraud: 'Fraud Admin',
  admin_analytics: 'Analytics Admin',
};

// Admin Directory
export async function getSecurityAdmins(): Promise<SecurityAdmin[]> {
  const r = await apiCall<{ admins: SecurityAdmin[] }>('/admin/security/admins');
  return r.admins;
}

export async function createSecurityAdmin(data: { email: string; role: SecurityAdminRole; department?: string; customPermissions?: string[] }): Promise<SecurityAdmin> {
  const r = await apiCall<{ admin: SecurityAdmin }>('/admin/security/admins', { method: 'POST', body: JSON.stringify(data) });
  return r.admin;
}

export async function updateAdminPermissions(adminId: string, permissions: string[]): Promise<SecurityAdmin> {
  const r = await apiCall<{ admin: SecurityAdmin }>(`/admin/security/admins/${adminId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) });
  return r.admin;
}

export async function deactivateSecurityAdmin(adminId: string): Promise<void> {
  await apiCall(`/admin/security/admins/${adminId}/deactivate`, { method: 'PUT' });
}

export async function activateSecurityAdmin(adminId: string): Promise<void> {
  await apiCall(`/admin/security/admins/${adminId}/activate`, { method: 'PUT' });
}

// Access Logs
export async function getSecurityAccessLogs(params?: { adminId?: string; action?: string; resource?: string; startDate?: string; endDate?: string; limit?: number }): Promise<SecurityAccessLog[]> {
  const q = new URLSearchParams();
  if (params?.adminId) q.append('adminId', params.adminId);
  if (params?.action) q.append('action', params.action);
  if (params?.resource) q.append('resource', params.resource);
  if (params?.startDate) q.append('startDate', params.startDate);
  if (params?.endDate) q.append('endDate', params.endDate);
  if (params?.limit) q.append('limit', String(params.limit));
  const r = await apiCall<{ logs: SecurityAccessLog[] }>(`/admin/security/access-logs?${q.toString()}`);
  return r.logs;
}

export async function getSecurityAlerts(): Promise<SecurityAlert[]> {
  const r = await apiCall<{ alerts: SecurityAlert[] }>('/admin/security/alerts');
  return r.alerts;
}

// Permissions Matrix
export async function getPermissionsMatrix(): Promise<{ matrix: Record<string, string[]>; allPermissions: string[] }> {
  return apiCall('/admin/security/permissions-matrix');
}

export async function updatePermissionsMatrix(matrix: Record<string, string[]>): Promise<void> {
  await apiCall('/admin/security/permissions-matrix', { method: 'PUT', body: JSON.stringify({ matrix }) });
}

// API Keys
export async function getApiKeys(): Promise<ApiKey[]> {
  const r = await apiCall<{ apiKeys: ApiKey[] }>('/admin/security/api-keys');
  return r.apiKeys;
}

export async function createApiKey(data: { name: string; description?: string; expiresInDays?: number; rateLimit?: number; scopes?: string[] }): Promise<ApiKey> {
  const r = await apiCall<{ apiKey: ApiKey }>('/admin/security/api-keys', { method: 'POST', body: JSON.stringify(data) });
  return r.apiKey;
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiCall(`/admin/security/api-keys/${id}`, { method: 'DELETE' });
}

// Security Settings
export async function getSecuritySettings(): Promise<SecuritySettings> {
  const r = await apiCall<{ settings: SecuritySettings }>('/admin/security/settings');
  return r.settings;
}

export async function updateSecuritySettings(data: Partial<SecuritySettings>): Promise<SecuritySettings> {
  const r = await apiCall<{ settings: SecuritySettings }>('/admin/security/settings', { method: 'PUT', body: JSON.stringify(data) });
  return r.settings;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM CONFIG API
// ═══════════════════════════════════════════════════════════════

export interface PayoutConfig {
  minThreshold: number;
  platformFeePercent: number;
  artistPayoutPercent: number;
  supportedCurrencies: string[];
  paymentMethods: { stripe: boolean; paypal: boolean; bankTransfer: boolean };
}

export interface ReleaseConfig {
  autoApproveEnabled: boolean;
  autoApproveMinReleases: number;
  autoApproveMinDaysSinceJoin: number;
  mandatoryReview: boolean;
}

export interface ContentModerationConfig {
  autoFlagExplicitThreshold: number;
  copyrightChecksEnabled: boolean;
  autoFlagEnabled: boolean;
}

export interface PlatformSettings {
  payout: PayoutConfig;
  release: ReleaseConfig;
  contentModeration: ContentModerationConfig;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface DspConfig {
  id: string;
  name: string;
  enabled: boolean;
  syncInterval: 'hourly' | 'daily' | 'weekly';
  fallbackStrategy: 'retry' | 'skip' | 'queue';
  regions: string[];
  apiConfigured: boolean;
  updatedAt?: string;
}

export interface EmailTemplate {
  subject: string;
  enabled: boolean;
}

export interface NotificationRule {
  adminEmail: boolean;
  artistEmail: boolean;
}

export interface EmailConfig {
  templates: Record<string, EmailTemplate>;
  notificationRules: Record<string, NotificationRule>;
  sms: { enabled: boolean; provider: string; fromNumber: string };
  push: { enabled: boolean; provider: string };
  alertThresholds: { errorCountPerHour: number; revenueAnomalyPercentage: number; failedPayoutsCount: number };
  updatedAt: string | null;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercent: number;
  category: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  affectedSystems: string[];
  lastBackupAt: string | null;
  lastBackupBy: string | null;
}

export interface BackupRecord {
  id: string;
  triggeredBy: string;
  triggeredAt: string;
  status: string;
}

// Platform Settings
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const r = await apiCall<{ settings: PlatformSettings }>('/admin/sysconfig/platform');
  return r.settings;
}

export async function updatePlatformSettings(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const r = await apiCall<{ settings: PlatformSettings }>('/admin/sysconfig/platform', { method: 'PUT', body: JSON.stringify(data) });
  return r.settings;
}

// DSP Config
export async function getDspConfigs(): Promise<DspConfig[]> {
  const r = await apiCall<{ dsps: DspConfig[] }>('/admin/sysconfig/dsps');
  return r.dsps;
}

export async function updateDspConfig(dspId: string, data: Partial<DspConfig> & { apiKey?: string; clientSecret?: string }): Promise<DspConfig> {
  const r = await apiCall<{ dsp: DspConfig }>(`/admin/sysconfig/dsps/${dspId}`, { method: 'PUT', body: JSON.stringify(data) });
  return r.dsp;
}

// Email Config
export async function getEmailConfig(): Promise<EmailConfig> {
  const r = await apiCall<{ config: EmailConfig }>('/admin/sysconfig/email');
  return r.config;
}

export async function updateEmailConfig(data: Partial<EmailConfig>): Promise<EmailConfig> {
  const r = await apiCall<{ config: EmailConfig }>('/admin/sysconfig/email', { method: 'PUT', body: JSON.stringify(data) });
  return r.config;
}

// Feature Flags
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const r = await apiCall<{ flags: FeatureFlag[] }>('/admin/sysconfig/feature-flags');
  return r.flags;
}

export async function updateFeatureFlag(flagId: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
  const r = await apiCall<{ flag: FeatureFlag }>(`/admin/sysconfig/feature-flags/${flagId}`, { method: 'PUT', body: JSON.stringify(data) });
  return r.flag;
}

export async function emergencyDisableAllFlags(): Promise<FeatureFlag[]> {
  const r = await apiCall<{ flags: FeatureFlag[] }>('/admin/sysconfig/feature-flags/emergency-disable', { method: 'POST' });
  return r.flags;
}

// Maintenance
export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const r = await apiCall<{ maintenance: MaintenanceConfig }>('/admin/sysconfig/maintenance');
  return r.maintenance;
}

export async function updateMaintenanceConfig(data: Partial<MaintenanceConfig>): Promise<MaintenanceConfig> {
  const r = await apiCall<{ maintenance: MaintenanceConfig }>('/admin/sysconfig/maintenance', { method: 'PUT', body: JSON.stringify(data) });
  return r.maintenance;
}

export async function triggerManualBackup(): Promise<BackupRecord> {
  const r = await apiCall<{ backup: BackupRecord }>('/admin/sysconfig/maintenance/backup', { method: 'POST' });
  return r.backup;
}

// ── Financial Dashboard ────────────────────────────────────────────────────────
export interface FinanceKPIs {
  totalRevenue: { mtd: number; ytd: number; allTime: number };
  artistPayouts: { mtd: number; ytd: number; allTime: number };
  platformNetRevenue: { mtd: number; ytd: number };
  operatingExpenses: { mtd: number; ytd: number; allTime: number };
  netIncome: { mtd: number; ytd: number; allTime: number };
  cashFlow: { inflows: number; outflows: number; net: number };
  accountsReceivable: number;
  accountsPayable: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  payouts: number;
  expenses: number;
  netIncome: number;
}

export interface DspRevenue {
  platform: string;
  revenue: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
}

export interface WaterfallPoint {
  label: string;
  value: number;
  base: number;
  type: 'positive' | 'negative' | 'total';
}

export interface YoYPoint {
  month: string;
  current: number;
  previous: number;
}

export interface FinanceCharts {
  revenueTrend: RevenuePoint[];
  revenueComposition: DspRevenue[];
  expenseBreakdown: ExpenseCategory[];
  cashFlowWaterfall: WaterfallPoint[];
  yoyComparison: YoYPoint[];
}

export interface FinanceQuickMetrics {
  grossMarginPct: number;
  operatingMarginPct: number;
  avgTransactionValue: number;
  payoutRatioPct: number;
}

export interface FinanceDashboardData {
  kpis: FinanceKPIs;
  charts: FinanceCharts;
  quickMetrics: FinanceQuickMetrics;
  meta: {
    generatedAt: string;
    currency: string;
    dataRange: { billingRecords: number; royaltyBatches: number; payouts: number; expenses: number };
  };
}

export interface FinanceExpense {
  id: string;
  category: 'salaries' | 'dsp_fees' | 'infrastructure' | 'marketing' | 'legal' | 'other';
  description: string;
  amount: number;
  date: string;
  createdAt: string;
  createdBy: string;
}

export async function getFinanceDashboard(): Promise<FinanceDashboardData> {
  return apiCall<FinanceDashboardData>('/admin/finance/dashboard');
}

export async function getFinanceExpenses(): Promise<FinanceExpense[]> {
  const r = await apiCall<{ expenses: FinanceExpense[] }>('/admin/finance/expenses');
  return r.expenses;
}

export async function createFinanceExpense(data: Omit<FinanceExpense, 'id' | 'createdAt' | 'createdBy'>): Promise<FinanceExpense> {
  const r = await apiCall<{ expense: FinanceExpense }>('/admin/finance/expenses', { method: 'POST', body: JSON.stringify(data) });
  return r.expense;
}

export async function deleteFinanceExpense(id: string): Promise<void> {
  await apiCall<{ success: boolean }>(`/admin/finance/expenses/${id}`, { method: 'DELETE' });
}

export async function downloadFinanceStatements(): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/admin/finance/statements`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trial-balance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== CHART OF ACCOUNTS & GENERAL LEDGER ====================

export interface COAAccount {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses';
  accountType: 'balance_sheet' | 'income_statement' | 'temporary';
  status: 'active' | 'inactive' | 'archived';
  totalDebits: number; // in cents
  totalCredits: number; // in cents
  balance: number; // calculated: debits - credits (in cents)
  lastUpdatedAt?: string;
}

export interface GLEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  debitAccountCode: string;
  creditAccountCode: string;
  debitAmount: number; // in cents
  creditAmount: number; // in cents
  description: string;
  reference?: string;
  supportingDocumentUrl?: string;
  postedBy: string;
  postedAt?: string;
  status: 'draft' | 'posted' | 'voided';
  entryType: 'manual' | 'auto' | 'system' | 'reversal';
  requiresApproval: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'na';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  editHistory?: Array<{ timestamp: string; changes: string; changedBy: string }>;
  reconciledBy?: string;
  reconciledAt?: string;
  reconciliationReference?: string;
}

export interface CreateJournalEntryInput {
  entryDate: string;
  debitAccountCode: string;
  creditAccountCode: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  reference?: string;
  supportingDocumentUrl?: string;
  entryType?: 'manual' | 'auto' | 'system' | 'reversal';
  requiresApproval?: boolean;
}

export async function getChartOfAccounts(status?: 'active' | 'all'): Promise<COAAccount[]> {
  const qs = status && status !== 'all' ? `?status=${status}` : '';
  const result = await apiCall<{ accounts: COAAccount[] }>(`/admin/accounting/chart-of-accounts${qs}`);
  return result.accounts;
}

export async function getGeneralLedger(filters?: {
  startDate?: string;
  endDate?: string;
  accountCode?: string;
  status?: string;
  approvalStatus?: string;
  postedBy?: string;
  entryType?: string;
  searchTerm?: string;
}): Promise<GLEntry[]> {
  const qs = new URLSearchParams();
  if (filters?.startDate) qs.set('startDate', filters.startDate);
  if (filters?.endDate) qs.set('endDate', filters.endDate);
  if (filters?.accountCode) qs.set('accountCode', filters.accountCode);
  if (filters?.status) qs.set('status', filters.status);
  if (filters?.approvalStatus) qs.set('approvalStatus', filters.approvalStatus);
  if (filters?.postedBy) qs.set('postedBy', filters.postedBy);
  if (filters?.entryType) qs.set('entryType', filters.entryType);
  if (filters?.searchTerm) qs.set('searchTerm', filters.searchTerm);
  const result = await apiCall<{ entries: GLEntry[] }>(
    `/admin/accounting/general-ledger${qs.toString() ? '?' + qs.toString() : ''}`
  );
  return result.entries;
}

export async function createJournalEntry(data: CreateJournalEntryInput): Promise<GLEntry> {
  const result = await apiCall<{ entry: GLEntry }>('/admin/accounting/journal-entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.entry;
}

export async function postJournalEntry(entryId: string): Promise<GLEntry> {
  const result = await apiCall<{ entry: GLEntry }>(`/admin/accounting/journal-entries/${entryId}/post`, {
    method: 'PUT',
  });
  return result.entry;
}

export async function approveJournalEntry(entryId: string, comments?: string): Promise<GLEntry> {
  const result = await apiCall<{ entry: GLEntry }>(`/admin/accounting/journal-entries/${entryId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ comments }),
  });
  return result.entry;
}

export async function rejectJournalEntry(entryId: string, reason: string): Promise<GLEntry> {
  const result = await apiCall<{ entry: GLEntry }>(`/admin/accounting/journal-entries/${entryId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });
  return result.entry;
}

export async function voidJournalEntry(entryId: string): Promise<GLEntry> {
  const result = await apiCall<{ entry: GLEntry }>(`/admin/accounting/journal-entries/${entryId}/void`, {
    method: 'PUT',
  });
  return result.entry;
}

export async function getJournalEntryDetails(entryId: string): Promise<GLEntry> {
  const result = await apiCall<{ entry: GLEntry }>(`/admin/accounting/journal-entries/${entryId}`);
  return result.entry;
}

export async function generateAutoEntries(options?: { forceReconciliation?: boolean }): Promise<{ created: number; entries: GLEntry[] }> {
  const result = await apiCall<{ created: number; entries: GLEntry[] }>(
    '/admin/accounting/auto-entries/generate',
    {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }
  );
  return result;
}

// ==================== PAYROLL & HR MANAGEMENT ====================

export type PayrollEmployeeStatus = 'active' | 'inactive' | 'on_leave';
export type PayrollPayFrequency = 'weekly' | 'bi_weekly' | 'monthly';
export type PayrollPaymentMethod = 'direct_deposit' | 'check' | 'paycard';

export interface PayrollEmployee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  status: PayrollEmployeeStatus;
  hireDate: string;
  salary: number;
  lastPayDate?: string;
  currency: string;
  personalInfo: {
    email: string;
    phone: string;
    address: string;
    taxId: string;
    emergencyContact: string;
  };
  employmentDetails: {
    manager: string;
    employmentType: 'full_time' | 'part_time' | 'contractor';
  };
  compensation: {
    baseSalary: number;
    hourlyRate: number;
    payFrequency: PayrollPayFrequency;
  };
  taxInfo: {
    filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
    w4Withholding: number;
    state: string;
    localTaxRate: number;
    federalRateOverride?: number;
    stateRateOverride?: number;
  };
  benefits: {
    healthInsurance: number;
    healthInsuranceEmployer: number;
    retirement401kEnabled: boolean;
    retirement401kPercent: number;
    retirement401kEmployerMatchPercent: number;
    otherDeductions: number;
  };
  directDeposit: {
    bankName: string;
    accountNumberMasked: string;
    routingNumberMasked: string;
  };
  leave: {
    ptoAccruedHours: number;
    ptoUsedHours: number;
    sickAccruedHours: number;
    sickUsedHours: number;
    carryoverHours: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PayrollTimesheet {
  id: string;
  periodId: string;
  employeeId: string;
  regularHours: number;
  overtimeHours: number;
  paidTimeOffHours: number;
  unpaidLeaveHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  managerComment?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRunLine {
  employeeId: string;
  employeeName: string;
  department: string;
  currency: string;
  grossPay: number;
  deductions: {
    federalWithholding: number;
    socialSecurity: number;
    medicare: number;
    stateIncomeTax: number;
    localIncomeTax: number;
    healthInsurance: number;
    retirement401k: number;
    other: number;
    unpaidLeaveAdjustment: number;
  };
  employerContribution: {
    socialSecurity: number;
    medicare: number;
    futa: number;
    suta: number;
    healthInsurance: number;
    retirement401kMatch: number;
  };
  netPay: number;
  anomalyFlags: string[];
  paymentMethod: PayrollPaymentMethod;
  paymentStatus: 'pending' | 'succeeded' | 'failed';
  paymentReference?: string;
  failureReason?: string;
}

export interface PayrollRun {
  id: string;
  period: {
    id: string;
    startDate: string;
    endDate: string;
    payDate: string;
    payFrequency: PayrollPayFrequency;
  };
  status: 'draft' | 'prepared' | 'reviewed' | 'approved' | 'paid' | 'locked';
  preparedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  preparedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  lines: PayrollRunLine[];
  totals: {
    gross: number;
    deductions: number;
    net: number;
    employerCost: number;
  };
  paymentMethod: PayrollPaymentMethod;
  achBatchCsv?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollConfig {
  baseCurrency: string;
  supportedCurrencies: string[];
  exchangeRates: Record<string, number>;
  payFrequencies: PayrollPayFrequency[];
  taxRates: {
    federalIncomeTaxRate: number;
    socialSecurityRateEmployee: number;
    socialSecurityRateEmployer: number;
    medicareRateEmployee: number;
    medicareRateEmployer: number;
    futaRateEmployer: number;
    sutaRateByState: Record<string, number>;
    stateIncomeRateByState: Record<string, number>;
  };
  deductions: {
    standardDeduction: number;
    personalExemption: number;
  };
  wageRules: {
    overtimeMultiplier: number;
    overtimeAfterHours: number;
    minWageByState: Record<string, number>;
  };
  taxYearClosed: number[];
  updatedAt: string;
}

export interface PayrollOverviewResponse {
  employees: PayrollEmployee[];
  config: PayrollConfig;
  timesheets: PayrollTimesheet[];
  runs: PayrollRun[];
  dashboard: {
    employeeCount: number;
    activeEmployees: number;
    pendingTimesheets: number;
    lastRunTotals: {
      gross: number;
      deductions: number;
      net: number;
      employerCost: number;
    } | null;
    complianceAlerts: string[];
  };
}

export interface PayrollTaxSummaryResponse {
  year: number;
  totals: {
    totalWages: number;
    federalWithheld: number;
    ficaEmployee: number;
    stateWithheld: number;
    localWithheld: number;
    ficaEmployer: number;
    futa: number;
    suta: number;
  };
  quarterly941: Array<Record<string, unknown>>;
  annual: {
    w2: Array<Record<string, unknown>>;
    w3TransmittalCount: number;
    form1099: Array<Record<string, unknown>>;
  };
  alerts: string[];
}

export interface PayrollReportsResponse {
  payrollRegister: Array<Record<string, unknown>>;
  payrollSummary: Array<Record<string, unknown>>;
  deductionReport: Array<Record<string, unknown>>;
  laborCostAnalysis: Array<Record<string, unknown>>;
  payrollTaxLiability: PayrollTaxSummaryResponse;
  contractor1099: Array<Record<string, unknown>>;
  accountingEntries: Array<Record<string, unknown>>;
}

export async function getPayrollOverview(): Promise<PayrollOverviewResponse> {
  return apiCall<PayrollOverviewResponse>('/admin/payroll/overview');
}

export async function updatePayrollConfig(data: PayrollConfig): Promise<PayrollConfig> {
  const result = await apiCall<{ config: PayrollConfig }>('/admin/payroll/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return result.config;
}

export async function savePayrollEmployee(data: Partial<PayrollEmployee>): Promise<PayrollEmployee[]> {
  const result = await apiCall<{ employees: PayrollEmployee[] }>('/admin/payroll/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.employees || [];
}

export async function savePayrollTimesheet(data: Partial<PayrollTimesheet>): Promise<PayrollTimesheet[]> {
  const result = await apiCall<{ timesheets: PayrollTimesheet[] }>('/admin/payroll/timesheets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.timesheets || [];
}

export async function reviewPayrollTimesheet(data: {
  periodId: string;
  employeeId: string;
  status: 'approved' | 'rejected';
  managerComment?: string;
}): Promise<PayrollTimesheet> {
  const result = await apiCall<{ timesheet: PayrollTimesheet }>('/admin/payroll/timesheets/review', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.timesheet;
}

export async function calculatePayrollRun(data: {
  startDate: string;
  endDate: string;
  payDate: string;
  payFrequency: PayrollPayFrequency;
  paymentMethod?: PayrollPaymentMethod;
}): Promise<PayrollRun> {
  const result = await apiCall<{ run: PayrollRun }>('/admin/payroll/runs/calculate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.run;
}

export async function transitionPayrollRun(
  runId: string,
  action: 'review' | 'approve' | 'pay' | 'lock',
  paymentMethod?: PayrollPaymentMethod,
): Promise<PayrollRun> {
  const result = await apiCall<{ run: PayrollRun }>(`/admin/payroll/runs/${runId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ action, paymentMethod }),
  });
  return result.run;
}

export async function retryFailedPayrollPayments(runId: string): Promise<PayrollRun> {
  const result = await apiCall<{ run: PayrollRun }>(`/admin/payroll/runs/${runId}/retry-failed`, {
    method: 'POST',
  });
  return result.run;
}

export async function getPayrollPayStubs(runId: string): Promise<Array<Record<string, unknown>>> {
  const result = await apiCall<{ stubs: Array<Record<string, unknown>> }>(`/admin/payroll/runs/${runId}/pay-stubs`);
  return result.stubs || [];
}

export async function getPayrollTaxSummary(year: number): Promise<PayrollTaxSummaryResponse> {
  const query = encodeURIComponent(String(year));
  const result = await apiCall<{ summary: PayrollTaxSummaryResponse }>(`/admin/payroll/tax-summary?year=${query}`);
  return result.summary;
}

export async function closePayrollTaxYear(year: number): Promise<{ success: boolean; year: number }> {
  const result = await apiCall<{ result: { success: boolean; year: number } }>('/admin/payroll/tax-year/close', {
    method: 'POST',
    body: JSON.stringify({ year }),
  });
  return result.result;
}

export async function getPayrollReports(): Promise<PayrollReportsResponse> {
  const result = await apiCall<{ reports: PayrollReportsResponse }>('/admin/payroll/reports');
  return result.reports;
}

// ==================== HR MANAGEMENT ====================

export interface HrStaffMember {
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
  benefits: {
    healthInsurance: number;
    housingAllowance: number;
    transportAllowance: number;
    mealAllowance: number;
    pensionPercent: number;
    nhfPercent: number;
  };
  entitlements: {
    annualLeaveDays: number;
    sickLeaveDays: number;
    parentalLeaveDays: number;
    studyLeaveDays: number;
  };
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

export interface HrAuditLogEntry {
  id: string;
  staffId: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface HrDepartmentRecord {
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

export interface HrRoleRecord {
  id: string;
  name: string;
  department: string;
  defaultPayGrade: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface HrDepartmentFinanceLink {
  id: string;
  name: string;
  costCenterCode: string;
  expenseAccount: string;
  revenueAccount: string;
  monthlyPayroll: number;
}

export interface HrOverviewResponse {
  staff: HrStaffMember[];
  metrics: {
    totalStaff: number;
    activeStaff: number;
    onLeave: number;
    monthlyPayroll: number;
    pendingPromotions: number;
  };
  roleDistribution: Array<{ role: string; count: number }>;
  departmentDistribution: Array<{ department: string; count: number }>;
  payGrades: string[];
  departments: HrDepartmentRecord[];
  roles: HrRoleRecord[];
  departmentFinanceLinks: HrDepartmentFinanceLink[];
  auditTrail: HrAuditLogEntry[];
}

export async function getHROverview(): Promise<HrOverviewResponse> {
  return apiCall<HrOverviewResponse>('/admin/hr/overview');
}

export async function upsertHRStaff(data: Partial<HrStaffMember>): Promise<HrStaffMember[]> {
  const result = await apiCall<{ staff: HrStaffMember[] }>('/admin/hr/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.staff || [];
}

export async function upsertHRDepartment(data: Partial<HrDepartmentRecord>): Promise<HrDepartmentRecord[]> {
  const result = await apiCall<{ departments: HrDepartmentRecord[] }>('/admin/hr/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.departments || [];
}

export async function upsertHRRole(data: Partial<HrRoleRecord>): Promise<HrRoleRecord[]> {
  const result = await apiCall<{ roles: HrRoleRecord[] }>('/admin/hr/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.roles || [];
}

export async function updateHRStaffStatus(id: string, status: HrStaffMember['status']): Promise<HrStaffMember> {
  const result = await apiCall<{ staff: HrStaffMember }>(`/admin/hr/staff/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return result.staff;
}

export async function promoteHRStaff(data: {
  id: string;
  newRole?: string;
  newPayGrade?: string;
  salaryIncreasePct?: number;
}): Promise<HrStaffMember> {
  const result = await apiCall<{ staff: HrStaffMember }>(`/admin/hr/staff/${data.id}/promote`, {
    method: 'POST',
    body: JSON.stringify({
      newRole: data.newRole,
      newPayGrade: data.newPayGrade,
      salaryIncreasePct: data.salaryIncreasePct,
    }),
  });
  return result.staff;
}

export async function requestHRPromotion(data: {
  id: string;
  newRole?: string;
  newPayGrade?: string;
  salaryIncreasePct?: number;
  reason?: string;
}): Promise<HrStaffMember> {
  const result = await apiCall<{ staff: HrStaffMember }>(`/admin/hr/staff/${data.id}/promotions/request`, {
    method: 'POST',
    body: JSON.stringify({
      newRole: data.newRole,
      newPayGrade: data.newPayGrade,
      salaryIncreasePct: data.salaryIncreasePct,
      reason: data.reason,
    }),
  });
  return result.staff;
}

export async function reviewHRPromotion(id: string): Promise<HrStaffMember> {
  const result = await apiCall<{ staff: HrStaffMember }>(`/admin/hr/staff/${id}/promotions/review`, {
    method: 'POST',
  });
  return result.staff;
}

export async function approveHRPromotion(data: {
  id: string;
  newRole?: string;
  newPayGrade?: string;
  salaryIncreasePct?: number;
}): Promise<HrStaffMember> {
  const result = await apiCall<{ staff: HrStaffMember }>(`/admin/hr/staff/${data.id}/promotions/approve`, {
    method: 'POST',
    body: JSON.stringify({
      newRole: data.newRole,
      newPayGrade: data.newPayGrade,
      salaryIncreasePct: data.salaryIncreasePct,
    }),
  });
  return result.staff;
}

export async function rejectHRPromotion(id: string, reason: string): Promise<HrStaffMember> {
  const result = await apiCall<{ staff: HrStaffMember }>(`/admin/hr/staff/${id}/promotions/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return result.staff;
}

export async function bulkIncreaseHRSalary(data: {
  increasePct: number;
  department?: string;
  status?: 'all' | HrStaffMember['status'];
  reason?: string;
}): Promise<{ updatedCount: number; totalIncrement: number; staff: HrStaffMember[] }> {
  return apiCall<{ updatedCount: number; totalIncrement: number; staff: HrStaffMember[] }>('/admin/hr/salary-increase', {
    method: 'POST',
    body: JSON.stringify({
      increasePct: data.increasePct,
      department: data.department,
      status: data.status,
      reason: data.reason,
    }),
  });
}
