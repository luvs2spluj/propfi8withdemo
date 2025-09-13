import { Pool } from 'pg';
import { NormalizedRow } from './csvNormalize';
import { BucketResult } from './analyzers/bucketer';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL || 'postgresql://postgres:your_password@db.iqwhrvtcrseidfyznqaf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
  statement_timeout: 60000,
  idleTimeoutMillis: 30000,
  max: 3,
});

export interface UpsertResult {
  accountsUpserted: number;
  monthlyDataUpserted: number;
  errors: string[];
}

export class SupabaseService {
  async upsertCashflowData(
    normalizedRows: NormalizedRow[], 
    analysisResults: BucketResult[]
  ): Promise<UpsertResult> {
    console.log('💾 Starting Supabase upsert...');
    
    const client = await pool.connect();
    const result: UpsertResult = {
      accountsUpserted: 0,
      monthlyDataUpserted: 0,
      errors: []
    };
    
    try {
      await client.query('BEGIN');
      
      // Create account name to analysis mapping
      const accountAnalysis = new Map<string, BucketResult>();
      const uniqueAccountNames = [...new Set(normalizedRows.map(row => row.account_name))];
      
      for (let i = 0; i < uniqueAccountNames.length; i++) {
        const accountName = uniqueAccountNames[i];
        const analysis = analysisResults[i] || { bucket: 'other', confidence: 0.5, reasoning: 'No analysis available' };
        accountAnalysis.set(accountName, analysis);
      }
      
      // Upsert accounts
      for (const accountName of uniqueAccountNames) {
        try {
          const analysis = accountAnalysis.get(accountName)!;
          const insertResult = await client.query(
            `INSERT INTO accounts (account_name) 
             VALUES ($1) 
             ON CONFLICT (account_name) DO NOTHING 
             RETURNING id`,
            [accountName]
          );
          
          if (insertResult.rows.length > 0) {
            result.accountsUpserted++;
            console.log(`✅ Upserted account: ${accountName}`);
          } else {
            console.log(`ℹ️ Account already exists: ${accountName}`);
          }
        } catch (error) {
          const errorMsg = `Failed to upsert account ${accountName}: ${error}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
      
      // Get account IDs for monthly data upsert
      const accountIdMap = new Map<string, string>();
      for (const accountName of uniqueAccountNames) {
        const idResult = await client.query(
          'SELECT id FROM accounts WHERE account_name = $1',
          [accountName]
        );
        if (idResult.rows.length > 0) {
          accountIdMap.set(accountName, idResult.rows[0].id);
        }
      }
      
      // Upsert monthly data
      for (const row of normalizedRows) {
        try {
          const accountId = accountIdMap.get(row.account_name);
          if (!accountId) {
            throw new Error(`Account ID not found for: ${row.account_name}`);
          }
          
          // Convert period to first day of month
          const periodDate = `${row.period}-01`;
          
          const insertResult = await client.query(
            `INSERT INTO account_monthly (account_id, period, amount, amount_raw) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (account_id, period) 
             DO UPDATE SET 
               amount = EXCLUDED.amount,
               amount_raw = EXCLUDED.amount_raw,
               created_at = NOW()
             RETURNING id`,
            [accountId, periodDate, row.amount, row.amount_raw]
          );
          
          result.monthlyDataUpserted++;
          
        } catch (error) {
          const errorMsg = `Failed to upsert monthly data for ${row.account_name} ${row.period}: ${error}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Supabase upsert completed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      const errorMsg = `Transaction failed: ${error}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      throw error;
    } finally {
      client.release();
    }
    
    return result;
  }
  
  async dryRunUpsert(
    normalizedRows: NormalizedRow[], 
    analysisResults: BucketResult[]
  ): Promise<any> {
    console.log('🧪 Running dry-run upsert...');
    
    const uniqueAccountNames = [...new Set(normalizedRows.map(row => row.account_name))];
    const accountAnalysis = new Map<string, BucketResult>();
    
    for (let i = 0; i < uniqueAccountNames.length; i++) {
      const accountName = uniqueAccountNames[i];
      const analysis = analysisResults[i] || { bucket: 'other', confidence: 0.5, reasoning: 'No analysis available' };
      accountAnalysis.set(accountName, analysis);
    }
    
    const dryRunData = {
      accounts: uniqueAccountNames.map(name => ({
        account_name: name,
        analysis: accountAnalysis.get(name)
      })),
      monthlyData: normalizedRows.map(row => ({
        account_name: row.account_name,
        period: `${row.period}-01`,
        amount: row.amount,
        amount_raw: row.amount_raw
      })),
      stats: {
        totalAccounts: uniqueAccountNames.length,
        totalMonthlyRecords: normalizedRows.length,
        totalAmount: normalizedRows.reduce((sum, row) => sum + (row.amount || 0), 0)
      }
    };
    
    // Write to debug file
    const fs = require('fs');
    const path = require('path');
    const debugDir = path.join(process.cwd(), '.debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const debugFile = path.join(debugDir, 'out.json');
    fs.writeFileSync(debugFile, JSON.stringify(dryRunData, null, 2));
    console.log(`📁 Dry-run data written to: ${debugFile}`);
    
    return dryRunData;
  }
}

export const supabaseService = new SupabaseService();
