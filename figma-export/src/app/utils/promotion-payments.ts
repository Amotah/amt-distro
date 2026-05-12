const PROMO_SUBSCRIPTIONS_KEY = 'amt_promo_subscriptions';
const PROMO_PAYMENT_REF_KEY = 'amt_promo_payment_refs';

export interface PromoSubscriptionAsset {
  id: string;
  name: string;
  type: 'video' | 'banner' | 'graphic';
  url: string | null;
  size?: string;
  ready: boolean;
}

export interface PromoSubscription {
  id: string;
  planId: '1-week' | '2-weeks' | '4-weeks';
  planName: string;
  amount: number;
  displayPrice: string;
  purchasedAt: string;
  expiresAt: string;
  status: 'pending_payment' | 'active' | 'completed';
  releaseTitle: string;
  artistName: string;
  reference?: string;
  adminApprovalStatus?: 'pending' | 'approved';
  approvedAt?: string;
  adminNotes?: string;
  updatedAt?: string;
  assets: PromoSubscriptionAsset[];
}

interface PromotionPaymentRefs {
  [reference: string]: {
    promotionId: string;
    createdAt: string;
  };
}

function readPromotionSubscriptions(): PromoSubscription[] {
  try {
    const raw = localStorage.getItem(PROMO_SUBSCRIPTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PromoSubscription[]) : [];
  } catch {
    return [];
  }
}

export function getPromotionSubscriptions(): PromoSubscription[] {
  return readPromotionSubscriptions();
}

export function savePromotionSubscriptions(subscriptions: PromoSubscription[]) {
  localStorage.setItem(PROMO_SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
}

function writePromotionSubscriptions(subscriptions: PromoSubscription[]) {
  savePromotionSubscriptions(subscriptions);
}

function readPromotionPaymentRefs(): PromotionPaymentRefs {
  try {
    const raw = localStorage.getItem(PROMO_PAYMENT_REF_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PromotionPaymentRefs) : {};
  } catch {
    return {};
  }
}

function writePromotionPaymentRefs(refs: PromotionPaymentRefs) {
  localStorage.setItem(PROMO_PAYMENT_REF_KEY, JSON.stringify(refs));
}

export function savePromotionPaymentReference(reference: string, promotionId: string) {
  const refs = readPromotionPaymentRefs();
  refs[reference] = {
    promotionId,
    createdAt: new Date().toISOString(),
  };
  writePromotionPaymentRefs(refs);
}

export function consumePromotionPaymentReference(reference: string): string | null {
  const refs = readPromotionPaymentRefs();
  const entry = refs[reference];
  if (!entry?.promotionId) {
    return null;
  }

  delete refs[reference];
  writePromotionPaymentRefs(refs);
  return entry.promotionId;
}

export function activatePromotionSubscription(promotionId: string, reference: string) {
  const subscriptions = readPromotionSubscriptions();
  const updated = subscriptions.map((subscription) => {
    if (subscription.id !== promotionId) return subscription;

    return {
      ...subscription,
      status: 'active' as const,
      reference,
      adminApprovalStatus: subscription.adminApprovalStatus || 'pending',
      updatedAt: new Date().toISOString(),
    };
  });

  writePromotionSubscriptions(updated);
}

export function removePromotionSubscription(promotionId: string) {
  const updated = readPromotionSubscriptions().filter((subscription) => subscription.id !== promotionId);
  writePromotionSubscriptions(updated);
}

export function updatePromotionSubscription(
  promotionId: string,
  updater: (subscription: PromoSubscription) => PromoSubscription,
) {
  const updated = readPromotionSubscriptions().map((subscription) => {
    if (subscription.id !== promotionId) {
      return subscription;
    }

    return {
      ...updater(subscription),
      updatedAt: new Date().toISOString(),
    };
  });

  writePromotionSubscriptions(updated);
}

export function approvePromotionSubscription(promotionId: string, adminNotes?: string) {
  updatePromotionSubscription(promotionId, (subscription) => ({
    ...subscription,
    adminApprovalStatus: 'approved',
    approvedAt: new Date().toISOString(),
    adminNotes: adminNotes ?? subscription.adminNotes,
  }));
}

export function updatePromotionAsset(
  promotionId: string,
  assetId: string,
  updates: Partial<PromoSubscriptionAsset>,
) {
  updatePromotionSubscription(promotionId, (subscription) => ({
    ...subscription,
    assets: subscription.assets.map((asset) => (
      asset.id === assetId
        ? { ...asset, ...updates }
        : asset
    )),
  }));
}

export function updatePromotionAdminNotes(promotionId: string, adminNotes: string) {
  updatePromotionSubscription(promotionId, (subscription) => ({
    ...subscription,
    adminNotes,
  }));
}

export function markPromotionCompleted(promotionId: string) {
  updatePromotionSubscription(promotionId, (subscription) => ({
    ...subscription,
    status: 'completed',
  }));
}
