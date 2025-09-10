// CSV ETL Service for Horton Properties Dashboard
// Integrates with the Supabase ETL pipeline

interface CSVRow {
  source_file: string;
  row_num: number;
  property_name: string;
  unit?: string;
  txn_date_raw: string;
  amount_raw: string;
  debit_credit?: string;
  account_raw: string;
  category_raw?: string;
  memo_raw?: string;
  vendor_raw?: string;
  currency_raw?: string;
}

interface ETLResponse {
  ok: boolean;
  message?: string;
  error?: string;
  inserted?: number;
  qa?: {
    unmapped_accounts: number;
    bad_dates_or_amounts: number;
    orphan_properties: number;
  };
  rows?: any[];
}

class CSVETLService {
  private baseUrl: string;

  constructor() {
    // Use Vercel API routes if deployed, otherwise local
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api' 
      : 'http://localhost:3000/api';
  }

  // Initialize the ETL pipeline (run once)
  async setup(): Promise<ETLResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/supabase-etl?op=setup`);
      return await response.json();
    } catch (error) {
      console.error('ETL setup failed:', error);
      throw new Error('Failed to setup ETL pipeline');
    }
  }

  // Process CSV data through the ETL pipeline
  async processCSV(csvData: CSVRow[], filename: string): Promise<ETLResponse> {
    try {
      // Add source file info to each row
      const processedData = csvData.map((row, index) => ({
        ...row,
        source_file: filename,
        row_num: index + 1
      }));

      // Insert raw data
      const insertResponse = await fetch(`${this.baseUrl}/supabase-etl?op=insertRaw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      const insertResult = await insertResponse.json();
      
      if (!insertResult.ok) {
        throw new Error(insertResult.error || 'Failed to insert CSV data');
      }

      // Refresh staging data
      await this.refreshStaging();
      
      // Load fact table
      await this.loadFactTable();

      return {
        ok: true,
        message: `Successfully processed ${insertResult.inserted} rows from ${filename}`,
        inserted: insertResult.inserted
      };

    } catch (error: any) {
      console.error('CSV processing failed:', error);
      throw new Error(`Failed to process CSV: ${error?.message || String(error)}`);
    }
  }

  // Refresh staging data from raw
  async refreshStaging(): Promise<ETLResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/supabase-etl?op=refresh`);
      return await response.json();
    } catch (error: any) {
      console.error('Staging refresh failed:', error);
      throw new Error('Failed to refresh staging data');
    }
  }

  // Load fact table from staging
  async loadFactTable(): Promise<ETLResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/supabase-etl?op=load`);
      return await response.json();
    } catch (error: any) {
      console.error('Fact table load failed:', error);
      throw new Error('Failed to load fact table');
    }
  }

  // Run data quality checks
  async runQualityChecks(): Promise<ETLResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/supabase-etl?op=qa`);
      return await response.json();
    } catch (error: any) {
      console.error('Quality checks failed:', error);
      throw new Error('Failed to run quality checks');
    }
  }

  // Get income statement report
  async getIncomeStatementReport(): Promise<ETLResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/supabase-etl?op=report`);
      return await response.json();
    } catch (error: any) {
      console.error('Report generation failed:', error);
      throw new Error('Failed to generate income statement report');
    }
  }

  // Parse CSV file to CSVRow format
  parseCSVFile(csvText: string, filename: string): CSVRow[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const rows: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length < headers.length) continue;
      
      const row: CSVRow = {
        source_file: filename,
        row_num: i,
        property_name: this.getValue(values, headers, ['property', 'property_name', 'propertyname']),
        unit: this.getValue(values, headers, ['unit', 'unit_number', 'unitnumber']),
        txn_date_raw: this.getValue(values, headers, ['date', 'transaction_date', 'txn_date', 'transactiondate']),
        amount_raw: this.getValue(values, headers, ['amount', 'value', 'price', 'cost']),
        debit_credit: this.getValue(values, headers, ['debit_credit', 'debitcredit', 'type', 'transaction_type']),
        account_raw: this.getValue(values, headers, ['account', 'account_name', 'accountname', 'category']),
        category_raw: this.getValue(values, headers, ['category', 'subcategory', 'sub_category']),
        memo_raw: this.getValue(values, headers, ['memo', 'description', 'note', 'notes']),
        vendor_raw: this.getValue(values, headers, ['vendor', 'payee', 'merchant', 'company']),
        currency_raw: this.getValue(values, headers, ['currency', 'curr'])
      };
      
      // Only add rows with essential data
      if (row.property_name && row.txn_date_raw && row.amount_raw && row.account_raw) {
        rows.push(row);
      }
    }
    
    return rows;
  }

  private getValue(values: string[], headers: string[], possibleKeys: string[]): string {
    for (const key of possibleKeys) {
      const index = headers.indexOf(key);
      if (index !== -1 && values[index]) {
        return values[index];
      }
    }
    return '';
  }

  // Get ETL pipeline status
  async getStatus(): Promise<ETLResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/supabase-etl`);
      return await response.json();
    } catch (error: any) {
      console.error('Status check failed:', error);
      throw new Error('Failed to get ETL pipeline status');
    }
  }
}

export default new CSVETLService();
