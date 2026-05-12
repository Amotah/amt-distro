-- Chart of Accounts Table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('assets', 'liabilities', 'equity', 'revenue', 'expenses')),
  account_type TEXT NOT NULL CHECK (account_type IN ('balance_sheet', 'income_statement', 'temporary')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  balance_debit BIGINT DEFAULT 0, -- in cents
  balance_credit BIGINT DEFAULT 0, -- in cents
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- General Ledger Entries
CREATE TABLE IF NOT EXISTS general_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  debit_account_code TEXT NOT NULL REFERENCES chart_of_accounts(code),
  credit_account_code TEXT NOT NULL REFERENCES chart_of_accounts(code),
  debit_amount BIGINT NOT NULL, -- in cents
  credit_amount BIGINT NOT NULL, -- in cents
  description TEXT NOT NULL,
  reference TEXT, -- e.g., invoice number, payment reference
  supporting_document_url TEXT,
  posted_by uuid NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('manual', 'auto', 'system', 'reversal')),
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT true,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'na')),
  approved_by uuid,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Audit trail
  created_by uuid NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by uuid,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  edit_history JSONB DEFAULT '[]'::jsonb, -- track changes
  
  -- Reconciliation
  reconciled_by uuid,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciliation_reference TEXT
);

-- Auto-generated Entries Log
CREATE TABLE IF NOT EXISTS auto_entry_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES general_ledger_entries(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('revenue_recognition', 'payout_recording', 'expense_recording', 'accrual_adjustment', 'depreciation', 'fee_processing')),
  source_id TEXT, -- e.g., royalty report ID, payout request ID, payment ID
  source_reference TEXT,
  auto_rules_applied TEXT[], -- which rules triggered this entry
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Account Balances View (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS account_balances AS
SELECT 
  c.id,
  c.code,
  c.name,
  c.category,
  c.account_type,
  c.status,
  COALESCE(SUM(CASE WHEN g.status = 'posted' THEN g.debit_amount ELSE 0 END), 0) as total_debits,
  COALESCE(SUM(CASE WHEN g.status = 'posted' THEN g.credit_amount ELSE 0 END), 0) as total_credits,
  COALESCE(SUM(CASE WHEN g.status = 'posted' THEN g.debit_amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN g.status = 'posted' THEN g.credit_amount ELSE 0 END), 0) as balance
FROM chart_of_accounts c
LEFT JOIN general_ledger_entries g ON (
  (c.code = g.debit_account_code) OR (c.code = g.credit_account_code)
)
GROUP BY c.id, c.code, c.name, c.category, c.account_type, c.status;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coa_category ON chart_of_accounts(category);
CREATE INDEX IF NOT EXISTS idx_coa_status ON chart_of_accounts(status);
CREATE INDEX IF NOT EXISTS idx_gle_entry_date ON general_ledger_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_gle_status ON general_ledger_entries(status);
CREATE INDEX IF NOT EXISTS idx_gle_approval ON general_ledger_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_gle_entry_type ON general_ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_gle_debit_account ON general_ledger_entries(debit_account_code);
CREATE INDEX IF NOT EXISTS idx_gle_credit_account ON general_ledger_entries(credit_account_code);
CREATE INDEX IF NOT EXISTS idx_auto_entry_logs_source ON auto_entry_logs(source_type, source_id);

-- Insert standard Chart of Accounts
INSERT INTO chart_of_accounts (code, name, description, category, account_type, status) VALUES
-- ASSETS
('1000', 'Cash - NGN', 'Cash account in Nigerian Naira', 'assets', 'balance_sheet', 'active'),
('1010', 'Cash - USD', 'Cash account in US Dollars', 'assets', 'balance_sheet', 'active'),
('1020', 'Cash - GBP', 'Cash account in British Pounds', 'assets', 'balance_sheet', 'active'),
('1100', 'Accounts Receivable - DSP', 'Digital Service Provider receivables', 'assets', 'balance_sheet', 'active'),
('1110', 'Accounts Receivable - Artists', 'Artist advance receivables', 'assets', 'balance_sheet', 'active'),
('1200', 'Prepaid Expenses', 'Prepaid subscriptions and services', 'assets', 'balance_sheet', 'active'),
('1500', 'Equipment & Technology', 'Office equipment and tech infrastructure', 'assets', 'balance_sheet', 'active'),
('1510', 'Accumulated Depreciation - Equipment', 'Depreciation contra-account', 'assets', 'balance_sheet', 'active'),
-- LIABILITIES
('2000', 'Accounts Payable - Artists', 'Outstanding artist payout obligations', 'liabilities', 'balance_sheet', 'active'),
('2010', 'Accounts Payable - Vendors', 'Outstanding vendor payments', 'liabilities', 'balance_sheet', 'active'),
('2100', 'Payroll Payable', 'Outstanding staff salaries', 'liabilities', 'balance_sheet', 'active'),
('2200', 'Accrued Expenses', 'Expenses incurred but not yet paid', 'liabilities', 'balance_sheet', 'active'),
('2300', 'Payroll Tax Payable', 'Outstanding payroll tax obligations', 'liabilities', 'balance_sheet', 'active'),
('2500', 'Deferred Revenue', 'Advance payments from customers', 'liabilities', 'balance_sheet', 'active'),
-- EQUITY
('3000', 'Founder Capital', 'Initial investment and contributions', 'equity', 'balance_sheet', 'active'),
('3100', 'Retained Earnings', 'Cumulative net income/losses', 'equity', 'balance_sheet', 'active'),
('3200', 'Current Year Earnings', 'Profit/loss for current period', 'equity', 'income_statement', 'active'),
-- REVENUE
('4000', 'DSP Revenue - Spotify', 'Revenue from Spotify streams', 'revenue', 'income_statement', 'active'),
('4010', 'DSP Revenue - Apple Music', 'Revenue from Apple Music', 'revenue', 'income_statement', 'active'),
('4020', 'DSP Revenue - YouTube', 'Revenue from YouTube Music', 'revenue', 'income_statement', 'active'),
('4030', 'DSP Revenue - Other', 'Revenue from other DSPs', 'revenue', 'income_statement', 'active'),
('4100', 'Premium Features Revenue', 'Revenue from premium subscriptions', 'revenue', 'income_statement', 'active'),
('4200', 'Other Revenue', 'Miscellaneous revenue', 'revenue', 'income_statement', 'active'),
-- EXPENSES
('5000', 'Artist Payouts', 'Direct payments to artists', 'expenses', 'income_statement', 'active'),
('5100', 'Staff Salaries & Benefits', 'Employee compensation and benefits', 'expenses', 'income_statement', 'active'),
('5200', 'Payroll Taxes', 'Employer payroll taxes', 'expenses', 'income_statement', 'active'),
('5300', 'DSP API Fees', 'Fees charged by digital service providers', 'expenses', 'income_statement', 'active'),
('5400', 'Payment Processing Fees', 'Credit card, bank transfer, and gateway fees', 'expenses', 'income_statement', 'active'),
('5500', 'Infrastructure & Cloud Costs', 'AWS, Vercel, hosting, and CDN expenses', 'expenses', 'income_statement', 'active'),
('5600', 'Third-party Services', 'Plaid, email providers, SMS, analytics', 'expenses', 'income_statement', 'active'),
('5700', 'Marketing & Sales', 'Advertising and promotional expenses', 'expenses', 'income_statement', 'active'),
('5800', 'General & Administrative', 'Office supplies, utilities, insurance', 'expenses', 'income_statement', 'active'),
('5900', 'Legal & Compliance', 'Legal services and compliance costs', 'expenses', 'income_statement', 'active'),
('6000', 'Depreciation Expense', 'Monthly depreciation on fixed assets', 'expenses', 'income_statement', 'active')
ON CONFLICT (code) DO NOTHING;
