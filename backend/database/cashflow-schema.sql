-- Cashflow ingestion schema
-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS account_monthly CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (account_name)
);

-- Create account_monthly table
CREATE TABLE IF NOT EXISTS account_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  period DATE NOT NULL,         -- use first of month (YYYY-MM-01)
  amount NUMERIC,               -- normalized
  amount_raw TEXT,              -- original cell value
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (account_id, period)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_account_monthly_period ON account_monthly(period);
CREATE INDEX IF NOT EXISTS idx_account_monthly_account_id ON account_monthly(account_id);

-- Add comments for documentation
COMMENT ON TABLE accounts IS 'Chart of accounts for cashflow data';
COMMENT ON TABLE account_monthly IS 'Monthly account balances and transactions';
COMMENT ON COLUMN account_monthly.period IS 'First day of the month (YYYY-MM-01)';
COMMENT ON COLUMN account_monthly.amount IS 'Normalized numeric value (parentheses converted to negative)';
COMMENT ON COLUMN account_monthly.amount_raw IS 'Original cell value for audit trail';
