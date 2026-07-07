# GL Entry Structure & Data Flow Analysis

## Overview
The accounting system stores GL entries and real financial data in a key-value store (Supabase PostgreSQL table `kv_store_79198001`). Entries are created from four data sources: Paystack payments, artist payouts, royalty batches, and payroll runs.

---

## 1. GL Entry Structure

### GLEntry Interface
```typescript
export interface GLEntry {
  id: string;                                    // UUID
  entryNumber: string;                           // "GL-000001", "GL-000002", etc.
  entryDate: string;                             // YYYY-MM-DD
  debitAccountCode: string;                      // e.g., "1000" (Cash)
  creditAccountCode: string;                     // e.g., "4000" (Revenue)
  debitAmount: number;                           // Amount in whole units (kobo if NGN)
  creditAmount: number;                          // Must equal debitAmount
  description: string;                           // Human-readable description
  reference?: string;                            // External reference (payment ID, etc.)
  supportingDocumentUrl?: string;                // URL to supporting docs
  postedBy: string;                              // User ID who posted
  postedAt?: string;                             // ISO timestamp when posted
  status: EntryStatus;                           // 'draft' | 'posted' | 'voided'
  entryType: EntryType;                          // 'manual' | 'auto' | 'system' | 'reversal'
  requiresApproval: boolean;                     // If true, needs approval before posting
  approvalStatus: ApprovalStatus;                // 'pending' | 'approved' | 'rejected' | 'na'
  approvedBy?: string;                           // User ID who approved
  approvedAt?: string;                           // ISO timestamp when approved
  rejectionReason?: string;                      // Why was it rejected
  createdBy: string;                             // Creator user ID
  createdAt: string;                             // ISO timestamp
  updatedBy?: string;                            // Last modifier user ID
  updatedAt: string;                             // ISO timestamp
  editHistory: Array<{                           // Audit trail
    timestamp: string;
    changes: string;
    changedBy: string;
  }>;
  reconciledBy?: string;                         // Reconciliation user
  reconciledAt?: string;                         // Reconciliation timestamp
  reconciliationReference?: string;              // Bank rec reference
}
```

### Entry Status Workflow
```
draft → [requires approval check]
  ↓
  If requiresApproval=true:
    - Must be approved first (approvalStatus: pending → approved)
    - Then posted (status: draft → posted)
  
  If requiresApproval=false:
    - Posted immediately (status: draft → posted)
  ↓
posted → voided (if needed)
```

---

## 2. Chart of Accounts (COA)

Default accounts created by `ensureDefaultCOA()`:

### Assets (1000-1500)
- **1000**: Cash - NGN
- **1010**: Cash - USD
- **1020**: Cash - GBP
- **1100**: Accounts Receivable - DSP (royalty receivables)
- **1200**: Prepaid Expenses
- **1500**: Equipment & Tech

### Liabilities (2000-2500)
- **2000**: Accounts Payable - Artist Payouts
- **2100**: Payroll Payable
- **2200**: Accrued Expenses
- **2500**: Deferred Revenue

### Equity (3000-3100)
- **3000**: Founder's Capital
- **3100**: Retained Earnings

### Revenue (4000-4200)
- **4000**: DSP Revenue - Spotify
- **4010**: DSP Revenue - Apple
- **4020**: DSP Revenue - YouTube
- **4030**: DSP Revenue - Other
- **4100**: Premium Features Revenue
- **4200**: Other Revenue

### Expenses (5000-6000)
- **5000**: Artist Payouts
- **5100**: Staff Salaries & Benefits
- **5200**: Payroll Taxes
- **5300**: DSP API Fees
- **5400**: Payment Processing Fees
- **5500**: Infrastructure & Cloud Costs
- **5600**: Third-party Services
- **5700**: Marketing & Sales
- **5800**: General & Administrative
- **5900**: Legal & Compliance
- **6000**: Depreciation

---

## 3. Data Storage Architecture

### Key-Value Store Prefixes

**GL Entries:**
- Key: `accounting:entry:{entryId}`
- Value: GLEntry object

**GL Entry Numbers (lookup):**
- Key: `accounting:entry-number:{entryNumber}`
- Value: entryId string

**Chart of Accounts:**
- Key: `accounting:coa:{accountCode}`
- Value: COAAccount object

**Auto-Log Tracking (Deduplication):**
- Key: `accounting:auto-log:{sourceType}:{sourceReference}`
- Value: `{ sourceType, sourceReference, entryId, createdAt }`

**Entry Counter:**
- Key: `accounting:entry-counter`
- Value: number (incremented for each entry)

**Initialization Flag:**
- Key: `accounting:coa-initialized`
- Value: boolean

### Related Data Sources

**Paystack Data:**
- Key: `billing:history:{referenceId}` → BillingHistoryRecord
- Key: `billing:transaction:{referenceId}` → CheckoutTransaction

**Royalty Data:**
- Key: `royalty-batch:{batchId}` → RoyaltyUploadBatch
- Key: `report:{reportId}` → StreamingReport
- Key: `earning:{earningId}` → Earning

**Payroll Data:**
- Key: `payroll:state` → PayrollState (contains runs)

**Expense Data:**
- Key: `finance:expense:{expenseId}` → Expense record

---

## 4. How loadAllEntries() Works

### Function Implementation
```typescript
async function loadAllEntries(): Promise<GLEntry[]> {
  const rows = await kv.getEntriesByPrefix(ENTRY_PREFIX);
  return rows
    .map((row) => row.value as GLEntry)
    .filter((entry) => entry && typeof entry.id === 'string');
}
```

### Process Flow
1. Query KV store with prefix `accounting:entry:`
2. Gets all key-value pairs matching that prefix
3. Maps values to GLEntry objects
4. Filters out invalid entries (missing id field)
5. Returns array of GLEntry objects

### Performance Notes
- **Full table scan**: Loads ALL entries (no filtering)
- **Memory load**: Returns complete objects
- **Sorting**: Not performed in function (caller responsible)

---

## 5. Automatic GL Entry Generation

### generateAutoEntries() Function

**Purpose:** Automatically creates GL entries from business transactions

**Data Sources & Entry Types:**

#### 1. PAYSTACK PAYMENTS (Subscription Revenue)
```typescript
// Source: getAllAdminPayments()
// Condition: payment.status === 'completed' && payment.type === 'subscription'

Entry Created:
  Debit:  1000 (Cash - NGN)           | Amount: payment.amount (in kobo)
  Credit: [Revenue Account]           | 
  Description: "Revenue recognition for {reference}"
  EntryType: auto
  RequiresApproval: false
  Status: posted (immediately)

Revenue Account Mapping:
  - payment.plan === 'artist'         → 4100 (Premium Features Revenue)
  - payment.plan === 'partner'        → 4100 (Premium Features Revenue)
  - payment.purpose === 'marketing'   → 4200 (Other Revenue)
  - Default                           → 4200 (Other Revenue)
```

#### 2. ARTIST PAYOUTS (Pending & Completed)
```typescript
// Source: getAllPayoutRequests()
// Returns: BillingHistoryRecord[] with type === 'payout'

IF payout.status === 'pending':
  Entry Created (Accrual):
    Debit:  5000 (Artist Payouts)      | Amount: payout.amount
    Credit: 2000 (Accounts Payable)    |
    Description: "Accrue artist payout payable {reference}"
    Reference: payout.reference
    SourceType: payout_pending
    SourceReference: payout.reference

IF payout.status === 'completed':
  Entry 1 (Accrual - if not already created):
    [Same as pending above]
    SourceType: payout_pending
  
  Entry 2 (Settlement):
    Debit:  2000 (Accounts Payable)    | Amount: payout.amount
    Credit: 1000 (Cash - NGN)          |
    Description: "Settle artist payout payable {reference}"
    SourceType: payout_completed
    SourceReference: payout.reference

IF payout.status === 'failed':
  Entry Created (Reversal):
    Debit:  2000 (Accounts Payable)    | Amount: payout.amount
    Credit: 5000 (Artist Payouts)      |
    Description: "Reverse failed payout accrual {reference}"
    SourceType: payout_failed_reversal
    SourceReference: payout.reference
```

**Data Structure:**
```typescript
export interface BillingHistoryRecord {
  id: string;
  userId: string;
  email: string;
  reference: string;
  type: 'subscription' | 'payout';
  provider: 'paystack' | 'internal';
  method: 'Paystack' | 'Bank Transfer';
  plan?: BillingPlan;                 // 'artist', 'super_artist', 'partner', 'release'
  amount: number;                      // In Naira
  status: 'completed' | 'failed' | 'pending';
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### 3. ROYALTY BATCHES (DSP Receivables)
```typescript
// Source: listRoyaltyUploadBatches(200)
// Condition: batch.totalRevenue > 0

Entry Created:
  Debit:  1100 (Accounts Receivable - DSP)  | Amount: batch.totalRevenue
  Credit: [Platform Revenue Account]        |
  Description: "DSP receivable for {platform} royalty batch {reportPeriodLabel}"
  Reference: batch.id
  SourceType: royalty_batch
  SourceReference: royalty:{batchId}

Revenue Account by Platform:
  - 'Spotify'        → 4000 (DSP Revenue - Spotify)
  - 'Apple'          → 4010 (DSP Revenue - Apple)
  - 'YouTube'        → 4020 (DSP Revenue - YouTube)
  - Default/Other    → 4030 (DSP Revenue - Other)
```

**Data Structure:**
```typescript
export interface RoyaltyUploadBatch {
  id: string;
  uploadedByUserId: string;
  fileName: string;
  platform: string;                   // 'Spotify', 'Apple', 'YouTube', etc.
  reportMonth: string;                // 'January', 'February', etc.
  reportYear: string;                 // '2024', '2025', etc.
  reportPeriodLabel: string;          // 'January/2024'
  status: 'processed' | 'error';
  recordsProcessed: number;
  matchedRecords: number;
  unmatchedRecords: number;
  earningsCreated: number;
  totalStreams: number;
  totalRevenue: number;               // In Naira
  uploadedAt: string;
  updatedAt: string;
  errorMessage?: string;
}
```

#### 4. FINANCE EXPENSES
```typescript
// Source: kv.getEntriesByPrefix('finance:expense:')
// Condition: amount > 0

Entry Created:
  Debit:  [Expense Account (by category)]  | Amount: expense.amount
  Credit: 1000 (Cash - NGN)                |
  Description: "Finance expense: {description or category}"
  Reference: expense.id
  SourceType: finance_expense
  SourceReference: expense.id

Expense Account Mapping:
  - 'dsp' / 'api'           → 5300 (DSP API Fees)
  - 'processing' / 'payment' → 5400 (Payment Processing Fees)
  - 'cloud' / 'infrastructure' → 5500 (Infrastructure & Cloud Costs)
  - 'marketing' / 'sales'   → 5700 (Marketing & Sales)
  - 'legal' / 'compliance'  → 5900 (Legal & Compliance)
  - 'salary' / 'payroll'    → 5100 (Staff Salaries & Benefits)
  - Default                 → 5800 (General & Administrative)
```

#### 5. PAYROLL RUNS (Staff Payment)
```typescript
// Source: payrollService.payrollReports().payrollSummary
// Condition: run.net > 0

Entry Created:
  Debit:  5100 (Staff Salaries & Benefits)  | Amount: run.net
  Credit: 1000 (Cash - NGN)                 |
  Description: "Payroll cash disbursement for run {runId}"
  Reference: run.runId
  SourceType: payroll_run
  SourceReference: run.runId
```

**Data Structure:**
```typescript
// From payrollReports():
{
  runId: string;
  payDate: string;              // Date payment was made
  gross: number;
  deductions: number;
  net: number;                  // Amount actually paid
  employerCost: number;
}
```

---

## 6. Deduplication & Update Prevention

### System: dedupeKey()
```typescript
function dedupeKey(sourceType: string, sourceReference: string) {
  return `${AUTO_LOG_PREFIX}${sourceType}:${sourceReference}`;
}

// Example keys:
"accounting:auto-log:payment:ref_abc123"
"accounting:auto-log:payout_pending:ref_xyz789"
"accounting:auto-log:royalty_batch:royalty:batch-id-123"
"accounting:auto-log:payroll_run:run-id-456"
```

### Duplicate Prevention Logic
```typescript
async function createSystemEntryIfMissing(input: {...}) {
  const key = dedupeKey(input.sourceType, input.sourceReference);
  const existing = await kv.get(key);
  if (existing) {
    return null;  // Entry already exists, skip
  }
  
  // Create entry...
  
  // Store dedupe record
  await kv.set(key, {
    sourceType: input.sourceType,
    sourceReference: input.sourceReference,
    entryId: entry.id,
    createdAt: nowIso(),
  });
  
  return entry;
}
```

**Benefit:** Multiple calls to `generateAutoEntries()` won't create duplicate entries

---

## 7. Account Balance Recalculation

### Function: recalculateAccountBalances()

**Triggered by:**
- `createJournalEntry()` (if posted)
- `postJournalEntry()`
- `voidJournalEntry()`
- After `generateAutoEntries()` completes

**Logic:**
```
For each POSTED entry only:
  - Add debitAmount to account's totalDebits
  - Add creditAmount to account's totalCredits
  - Calculate balance = totalDebits - totalCredits
  - Update COAAccount record
```

**Result:** Each account has current financial position

---

## 8. Real Data Example Flow

### Scenario: Subscription Payment from Artist

1. **Paystack Payment Created**
   ```
   Payment Reference: ref_abc123
   Amount: 10,000 NGN (1,000,000 kobo)
   Plan: artist
   Status: completed
   Type: subscription
   ```

2. **generateAutoEntries() Runs**
   - Calls `getAllAdminPayments()`
   - Finds payment with status='completed'
   - Creates GL Entry:
     ```
     Entry ID: uuid-1
     Entry Number: GL-000001
     Debit: 1000 (Cash - NGN)        10,000,000 kobo
     Credit: 4100 (Premium Revenue) 10,000,000 kobo
     Description: "Revenue recognition for ref_abc123"
     Status: posted
     ```
   - Stores dedupe: `accounting:auto-log:payment:ref_abc123` → entryId

3. **Account Balances Updated**
   - Account 1000: totalDebits += 10,000,000
   - Account 4100: totalCredits += 10,000,000

4. **Query Results**
   - `loadAllEntries()` → Returns [GL-000001]
   - `getGeneralLedger()` → Can filter by date, account, status
   - `getTrialBalance()` → Shows 1000 = 10,000,000 debit, 4100 = 10,000,000 credit

---

## 9. Key Functions for Retrieval

### Load Entries
```typescript
async function loadAllEntries(): Promise<GLEntry[]>
// Returns: All GL entries stored in KV
// Filter: Only entries with valid id field

async function getGeneralLedger(filters: {...}): Promise<GLEntry[]>
// Filters:
//   - startDate / endDate
//   - accountCode (debit or credit)
//   - status ('draft', 'posted', 'voided')
//   - approvalStatus
//   - postedBy
//   - entryType
//   - searchTerm (searches description, reference, accounts)
// Returns: Filtered, sorted by date DESC
```

### Load Accounts
```typescript
async function loadAllAccounts(): Promise<COAAccount[]>
// Returns: All accounts, sorted by code

async function getChartOfAccounts(status?: 'active' | 'all'): Promise<COAAccount[]>
// Returns: Chart of accounts with updated balances
// Creates COA if not initialized
// Recalculates balances
```

### Generate Reports
```typescript
async function getTrialBalance(): Promise<TrialBalanceReport>
// Returns: All accounts with debit/credit totals and balances
// Total debits should equal total credits

async function getBalanceSheet(asAtDate?: string): Promise<BalanceSheetReport>
// Returns: Assets, Liabilities, Equity classified by account

async function getIncomeStatement(period: {...}): Promise<IncomeStatementReport>
// Returns: Revenue, Expenses, Net Income for period
```

---

## 10. Test Data / Real Data Status

### Current Data Sources

**Development State:**
- COA is initialized with default accounts
- Entries only exist if `generateAutoEntries()` has been called
- Real data pulls from:
  - Paystack API → stored in `billing:history:*` and `billing:transaction:*`
  - Royalty uploads → stored in `royalty-batch:*` and `report:*`
  - Payroll system → stored in `payroll:state`
  - Finance expenses → stored in `finance:expense:*`

**To Create Test Data:**
```typescript
// Option 1: Manually create entries
await createJournalEntry({
  entryDate: '2024-01-15',
  debitAccountCode: '1000',
  creditAccountCode: '4000',
  debitAmount: 50000,
  creditAmount: 50000,
  description: 'Test revenue entry',
  requiresApproval: false,
}, 'test-user-id');

// Option 2: Trigger auto entry generation
await generateAutoEntries('admin-user-id');
```

---

## 11. Key Insights

1. **Double-Entry Bookkeeping**: All entries follow debit=credit rule
2. **Immutability**: Posted entries create edit history, not replaced
3. **Deduplication**: Same source transaction → same GL entry
4. **Status Flow**: draft → posted → voided (one-way)
5. **Approval Gate**: Can require approval before posting
6. **Account Reconciliation**: Balances only from posted entries
7. **KV Storage**: All data is JSON-serialized in PostgreSQL JSONB column
8. **Multi-Currency**: Cash accounts in NGN, USD, GBP separated
9. **Real Data**: Entries auto-generated from Paystack, Royalty, Payroll sources
10. **Audit Trail**: Every change logged with user and timestamp

