import * as kv from './kv_store.tsx';
import * as paystackService from './paystack-service.tsx';
import * as payrollService from './payroll-service.tsx';
import * as royaltyService from './royalty-service.tsx';

export type AccountCategory = 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses';
export type AccountType = 'balance_sheet' | 'income_statement' | 'temporary';
export type AccountStatus = 'active' | 'inactive' | 'archived';

export type EntryStatus = 'draft' | 'posted' | 'voided';
export type EntryType = 'manual' | 'auto' | 'system' | 'reversal';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'na';

export interface COAAccount {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: AccountCategory;
  accountType: AccountType;
  status: AccountStatus;
  totalDebits: number;
  totalCredits: number;
  balance: number;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface GLEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  debitAccountCode: string;
  creditAccountCode: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  reference?: string;
  supportingDocumentUrl?: string;
  postedBy: string;
  postedAt?: string;
  status: EntryStatus;
  entryType: EntryType;
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  editHistory: Array<{ timestamp: string; changes: string; changedBy: string }>;
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
  entryType?: EntryType;
  requiresApproval?: boolean;
}

const ENTRY_PREFIX = 'accounting:entry:';
const ACCOUNT_PREFIX = 'accounting:coa:';
const AUTO_LOG_PREFIX = 'accounting:auto-log:';
const ENTRY_COUNTER_KEY = 'accounting:entry-counter';
const INIT_KEY = 'accounting:coa-initialized';

const DEFAULT_COA: Array<Pick<COAAccount, 'code' | 'name' | 'description' | 'category' | 'accountType'>> = [
  { code: '1000', name: 'Cash - NGN', description: 'Cash account in Nigerian Naira', category: 'assets', accountType: 'balance_sheet' },
  { code: '1010', name: 'Cash - USD', description: 'Cash account in US Dollars', category: 'assets', accountType: 'balance_sheet' },
  { code: '1020', name: 'Cash - GBP', description: 'Cash account in British Pounds', category: 'assets', accountType: 'balance_sheet' },
  { code: '1100', name: 'Accounts Receivable - DSP', description: 'DSP receivables', category: 'assets', accountType: 'balance_sheet' },
  { code: '1200', name: 'Prepaid Expenses', description: 'Prepaid subscriptions and services', category: 'assets', accountType: 'balance_sheet' },
  { code: '1500', name: 'Equipment & Tech', description: 'Equipment and technology assets', category: 'assets', accountType: 'balance_sheet' },

  { code: '2000', name: 'Accounts Payable - Artist Payouts', description: 'Artist payouts pending', category: 'liabilities', accountType: 'balance_sheet' },
  { code: '2100', name: 'Payroll Payable', description: 'Staff salaries pending', category: 'liabilities', accountType: 'balance_sheet' },
  { code: '2200', name: 'Accrued Expenses', description: 'Accrued but unpaid expenses', category: 'liabilities', accountType: 'balance_sheet' },
  { code: '2500', name: 'Deferred Revenue', description: 'Deferred revenue liabilities', category: 'liabilities', accountType: 'balance_sheet' },

  { code: '3000', name: "Founder's Capital", description: 'Founder capital contributions', category: 'equity', accountType: 'balance_sheet' },
  { code: '3100', name: 'Retained Earnings', description: 'Retained earnings', category: 'equity', accountType: 'balance_sheet' },

  { code: '4000', name: 'DSP Revenue - Spotify', description: 'Spotify revenue', category: 'revenue', accountType: 'income_statement' },
  { code: '4010', name: 'DSP Revenue - Apple', description: 'Apple Music revenue', category: 'revenue', accountType: 'income_statement' },
  { code: '4020', name: 'DSP Revenue - YouTube', description: 'YouTube revenue', category: 'revenue', accountType: 'income_statement' },
  { code: '4030', name: 'DSP Revenue - Other', description: 'Other DSP revenue', category: 'revenue', accountType: 'income_statement' },
  { code: '4100', name: 'Premium Features Revenue', description: 'Premium features revenue', category: 'revenue', accountType: 'income_statement' },
  { code: '4200', name: 'Other Revenue', description: 'Other revenue', category: 'revenue', accountType: 'income_statement' },

  { code: '5000', name: 'Artist Payouts', description: 'Artist payouts expense', category: 'expenses', accountType: 'income_statement' },
  { code: '5100', name: 'Staff Salaries & Benefits', description: 'Staff salaries and benefits', category: 'expenses', accountType: 'income_statement' },
  { code: '5200', name: 'Payroll Taxes', description: 'Payroll taxes expense', category: 'expenses', accountType: 'income_statement' },
  { code: '5300', name: 'DSP API Fees', description: 'DSP API fees', category: 'expenses', accountType: 'income_statement' },
  { code: '5400', name: 'Payment Processing Fees', description: 'Payment processing fees', category: 'expenses', accountType: 'income_statement' },
  { code: '5500', name: 'Infrastructure & Cloud Costs', description: 'Infrastructure and cloud costs', category: 'expenses', accountType: 'income_statement' },
  { code: '5600', name: 'Third-party Services', description: 'Third-party services', category: 'expenses', accountType: 'income_statement' },
  { code: '5700', name: 'Marketing & Sales', description: 'Marketing and sales', category: 'expenses', accountType: 'income_statement' },
  { code: '5800', name: 'General & Administrative', description: 'General and administrative', category: 'expenses', accountType: 'income_statement' },
  { code: '5900', name: 'Legal & Compliance', description: 'Legal and compliance', category: 'expenses', accountType: 'income_statement' },
  { code: '6000', name: 'Depreciation', description: 'Depreciation expense', category: 'expenses', accountType: 'income_statement' },
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

async function nextEntryNumber() {
  const current = (await kv.get(ENTRY_COUNTER_KEY)) as number | null;
  const next = (typeof current === 'number' ? current : 0) + 1;
  await kv.set(ENTRY_COUNTER_KEY, next);
  return `GL-${String(next).padStart(6, '0')}`;
}

async function loadAllEntries(): Promise<GLEntry[]> {
  const rows = await kv.getEntriesByPrefix(ENTRY_PREFIX);
  return rows
    .map((row) => row.value as GLEntry)
    .filter((entry) => entry && typeof entry.id === 'string');
}

async function loadAllAccounts(): Promise<COAAccount[]> {
  const rows = await kv.getEntriesByPrefix(ACCOUNT_PREFIX);
  return rows
    .map((row) => row.value as COAAccount)
    .filter((account) => account && typeof account.code === 'string')
    .sort((a, b) => a.code.localeCompare(b.code));
}

function getRevenueAccountForPlatform(platform?: string) {
  const normalized = (platform || '').toLowerCase();
  if (normalized.includes('spotify')) return '4000';
  if (normalized.includes('apple')) return '4010';
  if (normalized.includes('youtube')) return '4020';
  return '4030';
}

function toKobo(amount: number) {
  return Math.round(amount * 100);
}

function getRevenueAccountForPayment(payment: {
  plan?: string;
  purpose?: 'release' | 'marketing' | 'payout';
}) {
  if (payment.purpose === 'marketing') {
    return '4200';
  }

  if (payment.plan === 'artist' || payment.plan === 'super_artist' || payment.plan === 'partner') {
    return '4100';
  }

  if (payment.plan === 'release') {
    return '4200';
  }

  return '4200';
}

function getExpenseAccountForCategory(category?: string) {
  const normalized = String(category || '').toLowerCase();
  if (normalized.includes('dsp') || normalized.includes('api')) return '5300';
  if (normalized.includes('processing') || normalized.includes('payment')) return '5400';
  if (normalized.includes('cloud') || normalized.includes('infrastructure') || normalized.includes('hosting')) return '5500';
  if (normalized.includes('marketing') || normalized.includes('sales')) return '5700';
  if (normalized.includes('legal') || normalized.includes('compliance')) return '5900';
  if (normalized.includes('salary') || normalized.includes('payroll') || normalized.includes('benefit')) return '5100';
  return '5800';
}

function dedupeKey(sourceType: string, sourceReference: string) {
  return `${AUTO_LOG_PREFIX}${sourceType}:${sourceReference}`;
}

export async function ensureDefaultCOA(initializedBy?: string) {
  const initialized = await kv.get(INIT_KEY);
  if (initialized) {
    return;
  }

  const now = nowIso();
  for (const template of DEFAULT_COA) {
    const account: COAAccount = {
      id: crypto.randomUUID(),
      code: template.code,
      name: template.name,
      description: template.description,
      category: template.category,
      accountType: template.accountType,
      status: 'active',
      totalDebits: 0,
      totalCredits: 0,
      balance: 0,
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: initializedBy,
      updatedBy: initializedBy,
    };

    await kv.set(`${ACCOUNT_PREFIX}${account.code}`, account);
  }

  await kv.set(INIT_KEY, true);
}

export async function recalculateAccountBalances() {
  const [entries, accounts] = await Promise.all([loadAllEntries(), loadAllAccounts()]);

  const postedEntries = entries.filter((entry) => entry.status === 'posted');
  const debitTotals = new Map<string, number>();
  const creditTotals = new Map<string, number>();

  for (const entry of postedEntries) {
    debitTotals.set(entry.debitAccountCode, (debitTotals.get(entry.debitAccountCode) || 0) + entry.debitAmount);
    creditTotals.set(entry.creditAccountCode, (creditTotals.get(entry.creditAccountCode) || 0) + entry.creditAmount);
  }

  const now = nowIso();
  for (const account of accounts) {
    const totalDebits = debitTotals.get(account.code) || 0;
    const totalCredits = creditTotals.get(account.code) || 0;
    const updated: COAAccount = {
      ...account,
      totalDebits,
      totalCredits,
      balance: totalDebits - totalCredits,
      lastUpdatedAt: now,
      updatedAt: now,
    };
    await kv.set(`${ACCOUNT_PREFIX}${account.code}`, updated);
  }
}

export async function getChartOfAccounts(status: 'active' | 'all' = 'active') {
  await ensureDefaultCOA();
  await recalculateAccountBalances();
  const accounts = await loadAllAccounts();

  if (status === 'all') {
    return accounts;
  }

  return accounts.filter((account) => account.status === 'active');
}

export async function createJournalEntry(data: CreateJournalEntryInput, actorId: string): Promise<GLEntry> {
  await ensureDefaultCOA(actorId);

  if (!data.debitAccountCode || !data.creditAccountCode) {
    throw new Error('debitAccountCode and creditAccountCode are required');
  }

  if (data.debitAccountCode === data.creditAccountCode) {
    throw new Error('debit and credit account cannot be the same');
  }

  if (data.debitAmount <= 0 || data.creditAmount <= 0) {
    throw new Error('debitAmount and creditAmount must be greater than zero');
  }

  if (data.debitAmount !== data.creditAmount) {
    throw new Error('debit and credit amounts must be equal');
  }

  const accounts = await loadAllAccounts();
  const debitExists = accounts.some((account) => account.code === data.debitAccountCode && account.status !== 'archived');
  const creditExists = accounts.some((account) => account.code === data.creditAccountCode && account.status !== 'archived');

  if (!debitExists || !creditExists) {
    throw new Error('one or more account codes are invalid');
  }

  const requiresApproval = data.requiresApproval !== false;
  const entryType = data.entryType || 'manual';
  const now = nowIso();

  const entry: GLEntry = {
    id: crypto.randomUUID(),
    entryNumber: await nextEntryNumber(),
    entryDate: normalizeDate(data.entryDate),
    debitAccountCode: data.debitAccountCode,
    creditAccountCode: data.creditAccountCode,
    debitAmount: Math.round(data.debitAmount),
    creditAmount: Math.round(data.creditAmount),
    description: data.description,
    reference: data.reference,
    supportingDocumentUrl: data.supportingDocumentUrl,
    postedBy: actorId,
    status: requiresApproval ? 'draft' : 'posted',
    postedAt: requiresApproval ? undefined : now,
    entryType,
    requiresApproval,
    approvalStatus: requiresApproval ? 'pending' : 'na',
    createdBy: actorId,
    createdAt: now,
    updatedBy: actorId,
    updatedAt: now,
    editHistory: [
      {
        timestamp: now,
        changes: 'Entry created',
        changedBy: actorId,
      },
    ],
  };

  await kv.set(`${ENTRY_PREFIX}${entry.id}`, entry);
  await kv.set(`accounting:entry-number:${entry.entryNumber}`, entry.id);

  if (entry.status === 'posted') {
    await recalculateAccountBalances();
  }

  return entry;
}

export async function getGeneralLedger(filters: {
  startDate?: string;
  endDate?: string;
  accountCode?: string;
  status?: string;
  approvalStatus?: string;
  postedBy?: string;
  entryType?: string;
  searchTerm?: string;
} = {}) {
  const entries = await loadAllEntries();

  return entries
    .filter((entry) => {
      if (filters.startDate && entry.entryDate < filters.startDate) return false;
      if (filters.endDate && entry.entryDate > filters.endDate) return false;
      if (filters.accountCode && entry.debitAccountCode !== filters.accountCode && entry.creditAccountCode !== filters.accountCode) return false;
      if (filters.status && entry.status !== filters.status) return false;
      if (filters.approvalStatus && entry.approvalStatus !== filters.approvalStatus) return false;
      if (filters.postedBy && entry.postedBy !== filters.postedBy) return false;
      if (filters.entryType && entry.entryType !== filters.entryType) return false;
      if (filters.searchTerm) {
        const query = filters.searchTerm.toLowerCase();
        const haystack = [
          entry.entryNumber,
          entry.description,
          entry.reference || '',
          entry.debitAccountCode,
          entry.creditAccountCode,
        ].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt));
}

export async function getJournalEntryById(entryId: string) {
  const entry = (await kv.get(`${ENTRY_PREFIX}${entryId}`)) as GLEntry | null;
  if (!entry) {
    throw new Error('Entry not found');
  }
  return entry;
}

async function saveEntry(entry: GLEntry) {
  await kv.set(`${ENTRY_PREFIX}${entry.id}`, entry);
}

export async function approveJournalEntry(entryId: string, actorId: string, comments?: string) {
  const entry = await getJournalEntryById(entryId);
  if (entry.approvalStatus !== 'pending') {
    throw new Error('Only pending entries can be approved');
  }

  const now = nowIso();
  entry.approvalStatus = 'approved';
  entry.approvedBy = actorId;
  entry.approvedAt = now;
  entry.updatedBy = actorId;
  entry.updatedAt = now;
  entry.editHistory.push({
    timestamp: now,
    changes: comments?.trim() ? `Approved: ${comments.trim()}` : 'Approved',
    changedBy: actorId,
  });

  await saveEntry(entry);
  return entry;
}

export async function rejectJournalEntry(entryId: string, actorId: string, reason: string) {
  const entry = await getJournalEntryById(entryId);
  if (entry.approvalStatus !== 'pending') {
    throw new Error('Only pending entries can be rejected');
  }

  const now = nowIso();
  entry.approvalStatus = 'rejected';
  entry.rejectionReason = reason;
  entry.updatedBy = actorId;
  entry.updatedAt = now;
  entry.editHistory.push({
    timestamp: now,
    changes: `Rejected: ${reason}`,
    changedBy: actorId,
  });

  await saveEntry(entry);
  return entry;
}

export async function postJournalEntry(entryId: string, actorId: string) {
  const entry = await getJournalEntryById(entryId);
  if (entry.status !== 'draft') {
    throw new Error('Only draft entries can be posted');
  }

  if (entry.requiresApproval && entry.approvalStatus !== 'approved') {
    throw new Error('Entry must be approved before posting');
  }

  const now = nowIso();
  entry.status = 'posted';
  entry.postedAt = now;
  entry.updatedBy = actorId;
  entry.updatedAt = now;
  entry.editHistory.push({
    timestamp: now,
    changes: 'Posted to ledger',
    changedBy: actorId,
  });

  await saveEntry(entry);
  await recalculateAccountBalances();
  return entry;
}

export async function voidJournalEntry(entryId: string, actorId: string) {
  const entry = await getJournalEntryById(entryId);
  if (entry.status !== 'posted') {
    throw new Error('Only posted entries can be voided');
  }

  const now = nowIso();
  entry.status = 'voided';
  entry.updatedBy = actorId;
  entry.updatedAt = now;
  entry.editHistory.push({
    timestamp: now,
    changes: 'Voided',
    changedBy: actorId,
  });

  await saveEntry(entry);
  await recalculateAccountBalances();
  return entry;
}

async function createSystemEntryIfMissing(input: {
  sourceType: string;
  sourceReference: string;
  actorId: string;
  entryDate: string;
  debitAccountCode: string;
  creditAccountCode: string;
  amount: number;
  description: string;
  reference?: string;
}) {
  const key = dedupeKey(input.sourceType, input.sourceReference);
  const existing = await kv.get(key);
  if (existing) {
    return null;
  }

  const entry = await createJournalEntry(
    {
      entryDate: input.entryDate,
      debitAccountCode: input.debitAccountCode,
      creditAccountCode: input.creditAccountCode,
      debitAmount: input.amount,
      creditAmount: input.amount,
      description: input.description,
      reference: input.reference || input.sourceReference,
      entryType: 'auto',
      requiresApproval: false,
    },
    input.actorId,
  );

  await kv.set(key, {
    sourceType: input.sourceType,
    sourceReference: input.sourceReference,
    entryId: entry.id,
    createdAt: nowIso(),
  });

  return entry;
}

export async function generateAutoEntries(actorId: string) {
  await ensureDefaultCOA(actorId);

  const [payments, payouts, royaltyBatches, payrollReports, expenseEntries] = await Promise.all([
    paystackService.getAllAdminPayments(),
    paystackService.getAllPayoutRequests(),
    royaltyService.listRoyaltyUploadBatches(200),
    payrollService.payrollReports(),
    kv.getEntriesByPrefix('finance:expense:'),
  ]);
  const expenses = expenseEntries.map((e: any) => e.value as any).filter(Boolean);

  const created: GLEntry[] = [];

  for (const payment of payments) {
    if (payment.status !== 'completed' || payment.type !== 'subscription') {
      continue;
    }

    const revenueAccount = getRevenueAccountForPayment(payment);
    const entry = await createSystemEntryIfMissing({
      sourceType: 'payment',
      sourceReference: payment.reference,
      actorId,
      entryDate: (payment.paidAt || payment.createdAt || nowIso()).slice(0, 10),
      debitAccountCode: '1000',
      creditAccountCode: revenueAccount,
      amount: toKobo(payment.amount),
      description: `Revenue recognition for ${payment.reference}`,
      reference: payment.reference,
    });
    if (entry) created.push(entry);
  }

  for (const payout of payouts) {
    if (payout.type !== 'payout') {
      continue;
    }

    // Pending payout: accrue expense and payable
    if (payout.status === 'pending') {
      const accrualEntry = await createSystemEntryIfMissing({
        sourceType: 'payout_pending',
        sourceReference: payout.reference,
        actorId,
        entryDate: (payout.createdAt || nowIso()).slice(0, 10),
        debitAccountCode: '5000',
        creditAccountCode: '2000',
        amount: toKobo(payout.amount),
        description: `Accrue artist payout payable ${payout.reference}`,
        reference: payout.reference,
      });
      if (accrualEntry) created.push(accrualEntry);
      continue;
    }

    if (payout.status === 'completed') {
      // Ensure payable accrual exists even if we first see this payout post-completion.
      const accrualEntry = await createSystemEntryIfMissing({
        sourceType: 'payout_pending',
        sourceReference: payout.reference,
        actorId,
        entryDate: (payout.createdAt || nowIso()).slice(0, 10),
        debitAccountCode: '5000',
        creditAccountCode: '2000',
        amount: toKobo(payout.amount),
        description: `Accrue artist payout payable ${payout.reference}`,
        reference: payout.reference,
      });
      if (accrualEntry) created.push(accrualEntry);

      // Completed payout: clear payable against cash.
      const settlementEntry = await createSystemEntryIfMissing({
        sourceType: 'payout_completed',
        sourceReference: payout.reference,
        actorId,
        entryDate: (payout.paidAt || payout.updatedAt || nowIso()).slice(0, 10),
        debitAccountCode: '2000',
        creditAccountCode: '1000',
        amount: toKobo(payout.amount),
        description: `Settle artist payout payable ${payout.reference}`,
        reference: payout.reference,
      });
      if (settlementEntry) created.push(settlementEntry);
      continue;
    }

    // Failed payout: reverse previous accrual if one exists.
    if (payout.status === 'failed') {
      const reversalEntry = await createSystemEntryIfMissing({
        sourceType: 'payout_failed_reversal',
        sourceReference: payout.reference,
        actorId,
        entryDate: (payout.updatedAt || nowIso()).slice(0, 10),
        debitAccountCode: '2000',
        creditAccountCode: '5000',
        amount: toKobo(payout.amount),
        description: `Reverse failed payout accrual ${payout.reference}`,
        reference: payout.reference,
      });
      if (reversalEntry) created.push(reversalEntry);
    }
  }

  for (const batch of royaltyBatches) {
    if (batch.totalRevenue <= 0) {
      continue;
    }

    const sourceReference = `royalty:${batch.id}`;
    const entry = await createSystemEntryIfMissing({
      sourceType: 'royalty_batch',
      sourceReference,
      actorId,
      entryDate: (batch.uploadedAt || nowIso()).slice(0, 10),
      debitAccountCode: '1100',
      creditAccountCode: getRevenueAccountForPlatform(batch.platform),
      amount: toKobo(batch.totalRevenue),
      description: `DSP receivable for ${batch.platform} royalty batch ${batch.reportPeriodLabel}`,
      reference: batch.id,
    });
    if (entry) created.push(entry);
  }

  for (const expense of expenses) {
    const amount = Number(expense?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const expenseId = String(expense?.id || '').trim();
    if (!expenseId) continue;

    const entry = await createSystemEntryIfMissing({
      sourceType: 'finance_expense',
      sourceReference: expenseId,
      actorId,
      entryDate: String(expense?.date || expense?.createdAt || nowIso()).slice(0, 10),
      debitAccountCode: getExpenseAccountForCategory(expense?.category),
      creditAccountCode: '1000',
      amount: toKobo(amount),
      description: `Finance expense: ${String(expense?.description || expense?.category || 'expense').slice(0, 120)}`,
      reference: expenseId,
    });
    if (entry) created.push(entry);
  }

  for (const run of payrollReports.payrollSummary || []) {
    if (!run || !run.runId || !Number.isFinite(run.net) || run.net <= 0) {
      continue;
    }

    const payrollEntry = await createSystemEntryIfMissing({
      sourceType: 'payroll_run',
      sourceReference: run.runId,
      actorId,
      entryDate: (run.payDate || nowIso()).slice(0, 10),
      debitAccountCode: '5100',
      creditAccountCode: '1000',
      amount: toKobo(run.net),
      description: `Payroll cash disbursement for run ${run.runId}`,
      reference: run.runId,
    });
    if (payrollEntry) created.push(payrollEntry);
  }

  await recalculateAccountBalances();

  return {
    created: created.length,
    entries: created,
  };
}

// ==================== REPORT GENERATION FUNCTIONS ====================

export interface TrialBalanceReport {
  reportDate: string;
  accounts: Array<{
    code: string;
    name: string;
    category: AccountCategory;
    debit: number;
    credit: number;
    balance: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  totalBalance: number;
}

export interface BalanceSheetReport {
  reportDate: string;
  assets: {
    current: Array<{code: string; name: string; amount: number}>;
    fixed: Array<{code: string; name: string; amount: number}>;
    totalCurrent: number;
    totalFixed: number;
    totalAssets: number;
  };
  liabilities: {
    current: Array<{code: string; name: string; amount: number}>;
    longTerm: Array<{code: string; name: string; amount: number}>;
    totalCurrent: number;
    totalLongTerm: number;
    totalLiabilities: number;
  };
  equity: {
    items: Array<{code: string; name: string; amount: number}>;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
}

export interface IncomeStatementReport {
  period: { startDate: string; endDate: string };
  revenue: Array<{code: string; name: string; amount: number}>;
  totalRevenue: number;
  expenses: Array<{code: string; name: string; amount: number}>;
  totalExpenses: number;
  netIncome: number;
}

export async function getTrialBalance(): Promise<TrialBalanceReport> {
  await ensureDefaultCOA();
  await recalculateAccountBalances();
  const accounts = await loadAllAccounts();

  const sorted = accounts.sort((a, b) => a.code.localeCompare(b.code));
  let totalDebits = 0;
  let totalCredits = 0;
  let totalBalance = 0;

  const reportAccounts = sorted.map((account) => {
    totalDebits += account.totalDebits;
    totalCredits += account.totalCredits;
    totalBalance += account.balance;
    return {
      code: account.code,
      name: account.name,
      category: account.category,
      debit: account.totalDebits,
      credit: account.totalCredits,
      balance: account.balance,
    };
  });

  return {
    reportDate: nowIso().split('T')[0],
    accounts: reportAccounts,
    totalDebits,
    totalCredits,
    totalBalance,
  };
}

export async function getBalanceSheet(asAtDate?: string): Promise<BalanceSheetReport> {
  await ensureDefaultCOA();
  await recalculateAccountBalances();
  const accounts = await loadAllAccounts();

  const filterDate = asAtDate || nowIso().split('T')[0];

  // Separate assets
  const currentAssets = accounts.filter((a) => a.category === 'assets' && a.code.startsWith('10')).map((a) => ({
    code: a.code,
    name: a.name,
    amount: a.balance,
  }));
  const fixedAssets = accounts.filter((a) => a.category === 'assets' && a.code.startsWith('15')).map((a) => ({
    code: a.code,
    name: a.name,
    amount: a.balance,
  }));

  const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.amount, 0);
  const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.amount, 0);

  // Separate liabilities
  const currentLiabilities = accounts.filter((a) => a.category === 'liabilities' && a.code.startsWith('20')).map((a) => ({
    code: a.code,
    name: a.name,
    amount: Math.abs(a.balance),
  }));
  const longTermLiabilities = accounts.filter((a) => a.category === 'liabilities' && a.code.startsWith('25')).map((a) => ({
    code: a.code,
    name: a.name,
    amount: Math.abs(a.balance),
  }));

  const totalCurrentLiabilities = currentLiabilities.reduce((sum, l) => sum + l.amount, 0);
  const totalLongTermLiabilities = longTermLiabilities.reduce((sum, l) => sum + l.amount, 0);

  // Equity
  const equityAccounts = accounts.filter((a) => a.category === 'equity').map((a) => ({
    code: a.code,
    name: a.name,
    amount: a.balance,
  }));

  const totalEquity = equityAccounts.reduce((sum, e) => sum + e.amount, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

  return {
    reportDate: filterDate,
    assets: {
      current: currentAssets,
      fixed: fixedAssets,
      totalCurrent: totalCurrentAssets,
      totalFixed: totalFixedAssets,
      totalAssets,
    },
    liabilities: {
      current: currentLiabilities,
      longTerm: longTermLiabilities,
      totalCurrent: totalCurrentLiabilities,
      totalLongTerm: totalLongTermLiabilities,
      totalLiabilities,
    },
    equity: {
      items: equityAccounts,
      totalEquity,
    },
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
  };
}

export async function getIncomeStatement(startDate?: string, endDate?: string): Promise<IncomeStatementReport> {
  await ensureDefaultCOA();
  const entries = await loadAllEntries();
  const accounts = await loadAllAccounts();

  const start = startDate || '2024-01-01';
  const end = endDate || nowIso().split('T')[0];

  const postedEntries = entries.filter((e) => e.status === 'posted' && e.entryDate >= start && e.entryDate <= end);

  const revenueCreditTotals = new Map<string, number>();
  const expenseDebitTotals = new Map<string, number>();

  for (const entry of postedEntries) {
    const creditAcc = accounts.find((a) => a.code === entry.creditAccountCode);
    const debitAcc = accounts.find((a) => a.code === entry.debitAccountCode);

    if (creditAcc?.category === 'revenue') {
      revenueCreditTotals.set(entry.creditAccountCode, (revenueCreditTotals.get(entry.creditAccountCode) || 0) + entry.creditAmount);
    }
    if (debitAcc?.category === 'expenses') {
      expenseDebitTotals.set(entry.debitAccountCode, (expenseDebitTotals.get(entry.debitAccountCode) || 0) + entry.debitAmount);
    }
  }

  const revenue = accounts
    .filter((a) => a.category === 'revenue')
    .map((a) => ({
      code: a.code,
      name: a.name,
      amount: revenueCreditTotals.get(a.code) || 0,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const expenses = accounts
    .filter((a) => a.category === 'expenses')
    .map((a) => ({
      code: a.code,
      name: a.name,
      amount: expenseDebitTotals.get(a.code) || 0,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    period: { startDate: start, endDate: end },
    revenue,
    totalRevenue,
    expenses,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
  };
}
