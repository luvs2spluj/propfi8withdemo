// /api/supabase-etl.js
import { Pool } from "pg";

const { SUPABASE_DB_URL } = process.env;
if (!SUPABASE_DB_URL) {
  console.warn("Missing SUPABASE_DB_URL env var.");
}

const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 60000,
  idleTimeoutMillis: 30000,
  max: 3,
});

async function runSQL(sql) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

async function query(sql, params = []) {
  const client = await pool.connect();
  try { 
    return (await client.query(sql, params)).rows; 
  } finally { 
    client.release(); 
  }
}

// --- Full DB setup (schemas/tables/views/procs) ---
const SETUP_SQL = `
-- Create schemas
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS stg;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS mart;

-- Raw transactions table (landing zone for CSV data)
CREATE TABLE IF NOT EXISTS raw.transactions (
    id SERIAL PRIMARY KEY,
    source_file VARCHAR(255),
    row_num INTEGER,
    property_name VARCHAR(255),
    unit VARCHAR(100),
    txn_date_raw VARCHAR(100),
    amount_raw VARCHAR(100),
    debit_credit VARCHAR(10),
    account_raw VARCHAR(255),
    category_raw VARCHAR(255),
    memo_raw TEXT,
    vendor_raw VARCHAR(255),
    currency_raw VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Staging transactions table (cleaned data)
CREATE TABLE IF NOT EXISTS stg.transactions (
    id SERIAL PRIMARY KEY,
    source_file VARCHAR(255),
    row_num INTEGER,
    property_name VARCHAR(255),
    unit VARCHAR(100),
    txn_date DATE,
    amount DECIMAL(15,2),
    debit_credit VARCHAR(10),
    account_code VARCHAR(50),
    account_name VARCHAR(255),
    category VARCHAR(255),
    memo TEXT,
    vendor VARCHAR(255),
    currency VARCHAR(10),
    property_id UUID,
    account_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Core property dimension
CREATE TABLE IF NOT EXISTS core.property (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    address TEXT,
    type VARCHAR(100),
    total_units INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Core account dimension
CREATE TABLE IF NOT EXISTS core.account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- 'income', 'expense', 'asset', 'liability', 'equity'
    parent_code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Account mapping table (maps raw account names to standardized accounts)
CREATE TABLE IF NOT EXISTS core.account_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_account_name VARCHAR(255),
    account_code VARCHAR(50),
    confidence DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (account_code) REFERENCES core.account(code)
);

-- Fact table for general ledger
CREATE TABLE IF NOT EXISTS core.fact_gl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    account_id UUID NOT NULL,
    txn_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    debit_credit VARCHAR(10),
    source_file VARCHAR(255),
    row_num INTEGER,
    memo TEXT,
    vendor VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (property_id) REFERENCES core.property(id),
    FOREIGN KEY (account_id) REFERENCES core.account(id)
);

-- QA Views for data quality checks
CREATE OR REPLACE VIEW mart.qa_unmapped AS
SELECT DISTINCT account_raw, COUNT(*) as count
FROM raw.transactions 
WHERE account_raw NOT IN (SELECT raw_account_name FROM core.account_map)
GROUP BY account_raw
ORDER BY count DESC;

CREATE OR REPLACE VIEW mart.qa_bad_dates_amounts AS
SELECT source_file, row_num, property_name, txn_date_raw, amount_raw
FROM raw.transactions 
WHERE (txn_date_raw IS NULL OR txn_date_raw = '') 
   OR (amount_raw IS NULL OR amount_raw = '' OR amount_raw = '0')
ORDER BY source_file, row_num;

CREATE OR REPLACE VIEW mart.qa_orphan_properties AS
SELECT DISTINCT property_name
FROM raw.transactions 
WHERE property_name NOT IN (SELECT name FROM core.property)
ORDER BY property_name;

-- Reporting views
CREATE OR REPLACE VIEW mart.income_statement_rollup AS
SELECT 
    p.name as property_name,
    DATE_TRUNC('month', f.txn_date) as month,
    SUM(CASE WHEN a.type = 'income' THEN f.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN a.type = 'expense' THEN f.amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN a.type = 'income' THEN f.amount ELSE -f.amount END) as net_income
FROM core.fact_gl f
JOIN core.property p ON f.property_id = p.id
JOIN core.account a ON f.account_id = a.id
GROUP BY p.name, DATE_TRUNC('month', f.txn_date)
ORDER BY p.name, month DESC;

-- Utility function for date parsing
CREATE OR REPLACE FUNCTION core.try_date_multi(date_str TEXT)
RETURNS DATE AS $$
BEGIN
    -- Try various date formats
    BEGIN
        RETURN date_str::DATE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        RETURN TO_DATE(date_str, 'MM/DD/YYYY');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        RETURN TO_DATE(date_str, 'DD/MM/YYYY');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        RETURN TO_DATE(date_str, 'YYYY-MM-DD');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Staging refresh procedure
CREATE OR REPLACE PROCEDURE core.refresh_staging()
LANGUAGE plpgsql AS $$
BEGIN
    -- Clear staging table
    TRUNCATE TABLE stg.transactions;
    
    -- Insert cleaned data from raw
    INSERT INTO stg.transactions (
        source_file, row_num, property_name, unit, txn_date, amount_raw, 
        debit_credit, account_raw, category_raw, memo_raw, vendor_raw, currency_raw
    )
    SELECT 
        source_file,
        row_num,
        property_name,
        unit,
        core.try_date_multi(txn_date_raw) as txn_date,
        amount_raw,
        debit_credit,
        account_raw,
        category_raw,
        memo_raw,
        vendor_raw,
        currency_raw
    FROM raw.transactions
    WHERE core.try_date_multi(txn_date_raw) IS NOT NULL
      AND amount_raw IS NOT NULL 
      AND amount_raw != ''
      AND amount_raw != '0';
      
    -- Update property_id mapping
    UPDATE stg.transactions 
    SET property_id = p.id
    FROM core.property p
    WHERE stg.transactions.property_name = p.name;
    
    -- Update account mapping
    UPDATE stg.transactions 
    SET account_code = am.account_code,
        account_name = a.name
    FROM core.account_map am
    JOIN core.account a ON am.account_code = a.code
    WHERE stg.transactions.account_raw = am.raw_account_name;
END;
$$;

-- Load fact table procedure
CREATE OR REPLACE PROCEDURE core.load_fact_gl()
LANGUAGE plpgsql AS $$
BEGIN
    -- Clear fact table
    TRUNCATE TABLE core.fact_gl;
    
    -- Load fact data from staging
    INSERT INTO core.fact_gl (
        property_id, account_id, txn_date, amount, debit_credit,
        source_file, row_num, memo, vendor
    )
    SELECT 
        s.property_id,
        a.id as account_id,
        s.txn_date,
        CASE 
            WHEN s.debit_credit = 'Debit' THEN CAST(s.amount_raw AS DECIMAL(15,2))
            WHEN s.debit_credit = 'Credit' THEN -CAST(s.amount_raw AS DECIMAL(15,2))
            ELSE CAST(s.amount_raw AS DECIMAL(15,2))
        END as amount,
        s.debit_credit,
        s.source_file,
        s.row_num,
        s.memo_raw,
        s.vendor_raw
    FROM stg.transactions s
    JOIN core.account a ON s.account_code = a.code
    WHERE s.property_id IS NOT NULL
      AND s.account_code IS NOT NULL
      AND s.txn_date IS NOT NULL;
END;
$$;

-- Insert sample properties
INSERT INTO core.property (name, address, type, total_units) VALUES
('Downtown Plaza', '123 Main St, Downtown', 'Apartment Complex', 24),
('Garden Apartments', '456 Oak Ave, Garden District', 'Apartment Complex', 18),
('Riverside Complex', '789 River Rd, Riverside', 'Townhouse Complex', 12),
('Oakwood Manor', '321 Pine St, Oakwood', 'Single Family', 8),
('Sunset Heights', '654 Sunset Blvd, Heights', 'Apartment Complex', 30),
('Pine Valley', '987 Valley Rd, Pine Valley', 'Condo Complex', 16)
ON CONFLICT (name) DO NOTHING;

-- Insert sample chart of accounts
INSERT INTO core.account (code, name, type) VALUES
('4000', 'Rental Income', 'income'),
('4100', 'Late Fees', 'income'),
('4200', 'Pet Fees', 'income'),
('5000', 'Property Management', 'expense'),
('5100', 'Maintenance', 'expense'),
('5200', 'Utilities', 'expense'),
('5300', 'Insurance', 'expense'),
('5400', 'Property Tax', 'expense'),
('5500', 'Marketing', 'expense'),
('1000', 'Cash', 'asset'),
('1100', 'Accounts Receivable', 'asset'),
('2000', 'Accounts Payable', 'liability')
ON CONFLICT (code) DO NOTHING;

-- Insert sample account mappings
INSERT INTO core.account_map (raw_account_name, account_code) VALUES
('Rent', '4000'),
('Monthly Rent', '4000'),
('Rental Income', '4000'),
('Late Fee', '4100'),
('Pet Fee', '4200'),
('Management Fee', '5000'),
('Property Management', '5000'),
('Repairs', '5100'),
('Maintenance', '5100'),
('Utilities', '5200'),
('Electric', '5200'),
('Water', '5200'),
('Insurance', '5300'),
('Property Insurance', '5300'),
('Tax', '5400'),
('Property Tax', '5400'),
('Marketing', '5500'),
('Advertising', '5500')
ON CONFLICT (raw_account_name, account_code) DO NOTHING;
`;

function ok(res, data) { 
  res.status(200).json({ ok: true, ...data }); 
}

function fail(res, err) { 
  console.error(err); 
  res.status(500).json({ ok: false, error: err?.message || String(err) }); 
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const op = (url.searchParams.get("op") || "").toLowerCase();
  
  if (!SUPABASE_DB_URL) {
    return res.status(400).json({ ok: false, error: "SUPABASE_DB_URL not set." });
  }

  try {
    if (req.method === "GET" && !op) {
      return ok(res, { 
        message: "Use ?op=setup|refresh|load|qa|report or POST ?op=insertRaw",
        operations: {
          setup: "Initialize database schemas and tables",
          refresh: "Refresh staging data from raw",
          load: "Load fact table from staging",
          qa: "Run data quality checks",
          report: "Get income statement report",
          insertRaw: "POST: Insert raw CSV data"
        }
      });
    }
    
    if (op === "setup") { 
      await runSQL(SETUP_SQL); 
      return ok(res, { message: "Database setup complete." }); 
    }
    
    if (op === "refresh") { 
      await query("CALL core.refresh_staging();"); 
      return ok(res, { message: "Staging data refreshed." }); 
    }
    
    if (op === "load") { 
      await query("CALL core.load_fact_gl();"); 
      return ok(res, { message: "Fact table loaded." }); 
    }
    
    if (op === "qa") {
      const [u, b, o] = await Promise.all([
        query("SELECT COUNT(*)::int c FROM mart.qa_unmapped;"),
        query("SELECT COUNT(*)::int c FROM mart.qa_bad_dates_amounts;"),
        query("SELECT COUNT(*)::int c FROM mart.qa_orphan_properties;"),
      ]);
      return ok(res, { 
        qa: { 
          unmapped_accounts: u?.[0]?.c ?? 0, 
          bad_dates_or_amounts: b?.[0]?.c ?? 0, 
          orphan_properties: o?.[0]?.c ?? 0 
        } 
      });
    }
    
    if (op === "report") {
      const rows = await query(`
        SELECT * FROM mart.income_statement_rollup 
        ORDER BY property_name, month DESC 
        LIMIT 200;
      `);
      return ok(res, { rows });
    }
    
    if (req.method === "POST" && op === "insertraw") {
      const body = await readJsonBody(req);
      if (!Array.isArray(body) || body.length === 0) {
        return res.status(400).json({ ok: false, error: "Body must be a non-empty JSON array." });
      }
      
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const sql = `
          INSERT INTO raw.transactions
          (source_file, row_num, property_name, unit, txn_date_raw, amount_raw, debit_credit, account_raw, category_raw, memo_raw, vendor_raw, currency_raw)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12);
        `;
        for (const r of body) {
          const vals = [
            r.source_file ?? null,
            toInt(r.row_num),
            r.property_name ?? null,
            r.unit ?? null,
            r.txn_date_raw ?? null,
            r.amount_raw ?? null,
            r.debit_credit ?? null,
            r.account_raw ?? null,
            r.category_raw ?? null,
            r.memo_raw ?? null,
            r.vendor_raw ?? null,
            r.currency_raw ?? null,
          ];
          await client.query(sql, vals);
        }
        await client.query("COMMIT");
      } catch (e) { 
        try { await client.query("ROLLBACK"); } catch {} 
        throw e; 
      } finally { 
        client.release(); 
      }
      return ok(res, { inserted: body.length });
    }
    
    return res.status(400).json({ ok: false, error: "Unknown operation." });
  } catch (e) { 
    return fail(res, e); 
  }
}

function toInt(v) { 
  const n = Number.parseInt(v, 10); 
  return Number.isFinite(n) ? n : null; 
}

function readJsonBody(req) { 
  return new Promise((resolve, reject) => { 
    let d = ""; 
    req.on("data", c => d += c); 
    req.on("end", () => { 
      try { 
        resolve(d ? JSON.parse(d) : null); 
      } catch (e) { 
        reject(e); 
      } 
    }); 
    req.on("error", reject); 
  }); 
}
