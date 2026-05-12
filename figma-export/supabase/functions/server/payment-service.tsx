import * as kv from './kv_store.tsx';
import * as royaltyService from './royalty-service.tsx';
import { verifyPaystackBankAccount } from './integration-service.tsx';

/**
 * Payment Service
 * Handles local payouts via bank transfer and mobile money
 */

export type PaymentMethod = 'bank_transfer' | 'mobile_money';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface BankAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string; // Nigerian bank code
}

export interface MobileMoneyAccount {
  phoneNumber: string;
  provider: 'mtn' | 'airtel' | 'glo' | '9mobile';
  accountName: string;
}

export interface PaymentDetails {
  id: string;
  userId: string;
  method: PaymentMethod;
  bankAccount?: BankAccount;
  mobileMoneyAccount?: MobileMoneyAccount;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  userId: string;
  amount: number;
  currency: 'NGN';
  method: PaymentMethod;
  paymentDetailsId: string;
  status: PaymentStatus;
  fee: number;
  netAmount: number; // Amount after fees
  reference: string; // External payment reference
  initiatedAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

// Nigerian bank codes (sample - would be comprehensive in production)
const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '999992' },
  { name: 'PalmPay', code: '999991' },
];

// Minimum payout amount
const MIN_PAYOUT_AMOUNT = 5000; // ₦5,000

// Payment fees
const PAYMENT_FEES = {
  bank_transfer: 50, // ₦50 flat fee
  mobile_money: 100, // ₦100 flat fee
};

// Add payment details
export async function addPaymentDetails(
  userId: string,
  method: PaymentMethod,
  details: BankAccount | MobileMoneyAccount,
  isPrimary: boolean = false
): Promise<PaymentDetails> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Validate details
  if (method === 'bank_transfer') {
    const bankAccount = details as BankAccount;
    if (!bankAccount.accountNumber || !bankAccount.bankCode) {
      throw new Error('Invalid bank account details');
    }
    // Validate bank code
    const validBank = NIGERIAN_BANKS.find(b => b.code === bankAccount.bankCode);
    if (!validBank) {
      throw new Error('Invalid bank code');
    }
  } else if (method === 'mobile_money') {
    const mobileAccount = details as MobileMoneyAccount;
    if (!mobileAccount.phoneNumber || !mobileAccount.provider) {
      throw new Error('Invalid mobile money details');
    }
    // Validate phone number format (Nigerian)
    if (!/^(\+234|234|0)[789][01]\d{8}$/.test(mobileAccount.phoneNumber)) {
      throw new Error('Invalid Nigerian phone number');
    }
  }

  // If setting as primary, unset other primary accounts
  if (isPrimary) {
    const existingDetails = await getUserPaymentDetails(userId);
    for (const detail of existingDetails) {
      if (detail.isPrimary) {
        detail.isPrimary = false;
        await kv.set(`payment:details:${detail.id}`, detail);
      }
    }
  }

  const paymentDetails: PaymentDetails = {
    id,
    userId,
    method,
    ...(method === 'bank_transfer' 
      ? { bankAccount: details as BankAccount }
      : { mobileMoneyAccount: details as MobileMoneyAccount }
    ),
    isPrimary,
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`payment:details:${id}`, paymentDetails);
  await kv.set(`payment:user:${userId}:${id}`, true);

  return paymentDetails;
}

// Get user payment details
export async function getUserPaymentDetails(userId: string): Promise<PaymentDetails[]> {
  const keys = await kv.getByPrefix(`payment:user:${userId}:`);
  const details: PaymentDetails[] = [];

  for (const key of keys) {
    const detailId = key.key.split(':').pop();
    if (detailId) {
      const detail = await kv.get<PaymentDetails>(`payment:details:${detailId}`);
      if (detail) {
        details.push(detail);
      }
    }
  }

  return details.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
}

// Request payout
export async function requestPayout(
  userId: string,
  amount: number,
  paymentDetailsId?: string
): Promise<Payout> {
  // Validate minimum amount
  if (amount < MIN_PAYOUT_AMOUNT) {
    throw new Error(`Minimum payout amount is ₦${MIN_PAYOUT_AMOUNT.toLocaleString()}`);
  }

  // Check user balance
  const balance = await royaltyService.getUserBalance(userId);
  if (balance.availableBalance < amount) {
    throw new Error(`Insufficient balance. Available: ₦${balance.availableBalance.toLocaleString()}`);
  }

  // Get payment details
  let paymentDetails: PaymentDetails | null = null;
  if (paymentDetailsId) {
    paymentDetails = await kv.get<PaymentDetails>(`payment:details:${paymentDetailsId}`);
    if (!paymentDetails || paymentDetails.userId !== userId) {
      throw new Error('Invalid payment details');
    }
  } else {
    // Use primary payment method
    const allDetails = await getUserPaymentDetails(userId);
    paymentDetails = allDetails.find(d => d.isPrimary) || allDetails[0];
    if (!paymentDetails) {
      throw new Error('No payment details found. Please add a payment method.');
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const fee = PAYMENT_FEES[paymentDetails.method];
  const netAmount = amount - fee;

  const payout: Payout = {
    id,
    userId,
    amount,
    currency: 'NGN',
    method: paymentDetails.method,
    paymentDetailsId: paymentDetails.id,
    status: 'pending',
    fee,
    netAmount,
    reference: `AMTDISTRO-${Date.now()}-${id.slice(0, 8).toUpperCase()}`,
    initiatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`payout:${id}`, payout);
  await kv.set(`payout:user:${userId}:${id}`, true);

  // Deduct from available balance
  balance.availableBalance -= amount;
  balance.updatedAt = now;
  await kv.set(`balance:${userId}`, balance);

  return payout;
}

// Update payout status
export async function updatePayoutStatus(
  payoutId: string,
  status: PaymentStatus,
  metadata?: { failureReason?: string; externalReference?: string }
): Promise<Payout | null> {
  const payout = await kv.get<Payout>(`payout:${payoutId}`);
  if (!payout) return null;

  const now = new Date().toISOString();
  payout.status = status;
  payout.updatedAt = now;

  if (status === 'processing' && !payout.processedAt) {
    payout.processedAt = now;
  }

  if (status === 'completed' && !payout.completedAt) {
    payout.completedAt = now;
    
    // Update user balance
    const balance = await royaltyService.getUserBalance(payout.userId);
    balance.lastPayoutDate = now;
    balance.lastPayoutAmount = payout.amount;
    await kv.set(`balance:${payout.userId}`, balance);
  }

  if (status === 'failed' || status === 'cancelled') {
    // Refund to available balance
    const balance = await royaltyService.getUserBalance(payout.userId);
    balance.availableBalance += payout.amount;
    balance.updatedAt = now;
    await kv.set(`balance:${payout.userId}`, balance);

    if (metadata?.failureReason) {
      payout.failureReason = metadata.failureReason;
    }
  }

  if (metadata?.externalReference) {
    payout.reference = metadata.externalReference;
  }

  await kv.set(`payout:${payoutId}`, payout);
  return payout;
}

// Get user payouts
export async function getUserPayouts(userId: string, limit: number = 50): Promise<Payout[]> {
  const keys = await kv.getByPrefix(`payout:user:${userId}:`);
  const payouts: Payout[] = [];

  for (const key of keys.slice(0, limit)) {
    const payoutId = key.key.split(':').pop();
    if (payoutId) {
      const payout = await kv.get<Payout>(`payout:${payoutId}`);
      if (payout) {
        payouts.push(payout);
      }
    }
  }

  return payouts.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get payout by ID
export async function getPayoutById(payoutId: string): Promise<Payout | null> {
  return await kv.get<Payout>(`payout:${payoutId}`);
}

// Initiate payout processing via payment gateway
export async function processPayment(payoutId: string): Promise<void> {
  const payout = await getPayoutById(payoutId);
  if (!payout) {
    throw new Error('Payout not found');
  }

  if (payout.status !== 'pending') {
    throw new Error('Payout is not in pending status');
  }

  // Mark as processing — final status is set via Paystack webhook callback
  await updatePayoutStatus(payoutId, 'processing');
}

// Get available banks
export function getAvailableBanks(): Array<{ name: string; code: string }> {
  return NIGERIAN_BANKS;
}

// Validate bank account via Paystack
export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  if (accountNumber.length !== 10) {
    return { valid: false, error: 'Account number must be 10 digits' };
  }

  const bank = NIGERIAN_BANKS.find(b => b.code === bankCode);
  if (!bank) {
    return { valid: false, error: 'Invalid bank code' };
  }

  const result = await verifyPaystackBankAccount(accountNumber, bankCode);
  if (result.success && result.account_name) {
    return { valid: true, accountName: result.account_name };
  }
  return { valid: false, error: result.error ?? 'Could not verify account. Check the number and bank.' };
}

// Get payout statistics
export async function getPayoutStatistics(userId: string): Promise<{
  totalPayouts: number;
  totalAmount: number;
  successfulPayouts: number;
  pendingPayouts: number;
  failedPayouts: number;
  averagePayoutAmount: number;
}> {
  const payouts = await getUserPayouts(userId, 1000);

  const stats = {
    totalPayouts: payouts.length,
    totalAmount: 0,
    successfulPayouts: 0,
    pendingPayouts: 0,
    failedPayouts: 0,
    averagePayoutAmount: 0,
  };

  for (const payout of payouts) {
    stats.totalAmount += payout.amount;
    
    if (payout.status === 'completed') stats.successfulPayouts++;
    if (payout.status === 'pending' || payout.status === 'processing') stats.pendingPayouts++;
    if (payout.status === 'failed') stats.failedPayouts++;
  }

  stats.averagePayoutAmount = stats.totalPayouts > 0 
    ? stats.totalAmount / stats.totalPayouts 
    : 0;

  return stats;
}
