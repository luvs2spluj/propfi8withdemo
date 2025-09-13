import { parse } from 'csv-parse/sync';
import fs from 'fs';

const MONTHS = ["Aug 2024","Sep 2024","Oct 2024","Nov 2024","Dec 2024","Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025"];

const monthToYyyyMm = (m: string): string => {
  const [mon, yr] = m.split(' ');
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const idx = monthNames.indexOf(mon);
  if (idx < 0) throw new Error(`Unknown month header: ${m}`);
  const mm = String(idx + 1).padStart(2, '0');
  return `${yr}-${mm}`;
};

const SECTION_RE = /^(income( & expense)?|expenses?|totals?)$/i;

const toNumber = (v: string | null | undefined): number | null => {
  if (v == null) return null;
  let t = String(v).trim();
  if (!t || t === '—' || t.toLowerCase() === 'n/a') return null;
  
  let neg = false;
  if (t.startsWith('(') && t.endsWith(')')) { 
    neg = true; 
    t = t.slice(1, -1); 
  }
  
  t = t.replace(/\$/g, '').replace(/,/g, '');
  const f = Number(t);
  if (Number.isNaN(f)) return null;
  return neg ? -f : f;
};

export interface NormalizedRow {
  account_name: string;
  period: string;
  amount: number | null;
  amount_raw: string | null;
}

export interface NormalizeResult {
  rows: NormalizedRow[];
  stats: {
    totalRows: number;
    droppedSectionRows: number;
    parsedRows: number;
    invalidCurrencyCells: number;
    accountNames: string[];
  };
}

export function normalize(csvBuffer: Buffer): NormalizeResult {
  console.log('📊 Starting CSV normalization...');
  
  const rows: Record<string, string>[] = parse(csvBuffer, { 
    columns: true, 
    skip_empty_lines: true,
    trim: true
  });
  
  if (!rows.length) throw new Error('No rows parsed');
  
  const cols = Object.keys(rows[0]);
  console.log('📋 Detected columns:', cols);
  
  if (cols[0] !== 'Account Name') {
    throw new Error(`First column must be "Account Name" but got "${cols[0]}"`);
  }
  
  // Validate month columns
  for (const m of MONTHS) {
    if (!cols.includes(m)) {
      throw new Error(`Missing month column: ${m}`);
    }
  }
  
  const long: NormalizedRow[] = [];
  let droppedSectionRows = 0;
  let invalidCurrencyCells = 0;
  const accountNames = new Set<string>();
  
  for (const r of rows) {
    const name = (r['Account Name'] ?? '').toString().trim();
    
    if (!name || SECTION_RE.test(name)) {
      droppedSectionRows++;
      console.log(`🚫 Dropped section row: "${name}"`);
      continue;
    }
    
    accountNames.add(name);
    
    for (const m of MONTHS) {
      const raw = r[m] ?? null;
      const amt = toNumber(raw);
      
      if (raw && amt === null) {
        invalidCurrencyCells++;
        console.log(`⚠️ Invalid currency cell: "${raw}" for account "${name}" in ${m}`);
      }
      
      long.push({ 
        account_name: name, 
        period: monthToYyyyMm(m), 
        amount: amt, 
        amount_raw: raw 
      });
    }
  }
  
  const stats = {
    totalRows: rows.length,
    droppedSectionRows,
    parsedRows: long.length,
    invalidCurrencyCells,
    accountNames: Array.from(accountNames)
  };
  
  console.log('✅ Normalization complete:', stats);
  
  return { rows: long, stats };
}

export function normalizeFromFile(filePath: string): NormalizeResult {
  console.log(`📁 Reading CSV file: ${filePath}`);
  const buffer = fs.readFileSync(filePath);
  return normalize(buffer);
}
