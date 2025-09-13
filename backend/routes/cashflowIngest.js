const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Simple CSV normalization function (JavaScript version)
function normalizeCSV(csvBuffer) {
  console.log('📊 Starting CSV normalization...');
  
  const csvString = csvBuffer.toString('utf-8');
  const lines = csvString.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('No data rows found');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('📋 Detected columns:', headers);
  
  if (headers[0] !== 'Account Name') {
    throw new Error(`First column must be "Account Name" but got "${headers[0]}"`);
  }
  
  // Expected month columns
  const MONTHS = ["Aug 2024","Sep 2024","Oct 2024","Nov 2024","Dec 2024","Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025"];
  
  // Validate month columns
  for (const m of MONTHS) {
    if (!headers.includes(m)) {
      throw new Error(`Missing month column: ${m}`);
    }
  }
  
  const SECTION_RE = /^(income( & expense)?|expenses?|totals?)$/i;
  
  const toNumber = (v) => {
    if (v == null || v === '') return null;
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
  
  const monthToYyyyMm = (m) => {
    const [mon, yr] = m.split(' ');
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const idx = monthNames.indexOf(mon);
    if (idx < 0) throw new Error(`Unknown month header: ${m}`);
    const mm = String(idx + 1).padStart(2, '0');
    return `${yr}-${mm}`;
  };
  
  const long = [];
  let droppedSectionRows = 0;
  let invalidCurrencyCells = 0;
  const accountNames = new Set();
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;
    
    const name = values[0];
    
    if (!name || SECTION_RE.test(name)) {
      droppedSectionRows++;
      console.log(`🚫 Dropped section row: "${name}"`);
      continue;
    }
    
    accountNames.add(name);
    
    for (const m of MONTHS) {
      const colIndex = headers.indexOf(m);
      const raw = values[colIndex] || null;
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
    totalRows: lines.length - 1,
    droppedSectionRows,
    parsedRows: long.length,
    invalidCurrencyCells,
    accountNames: Array.from(accountNames)
  };
  
  console.log('✅ Normalization complete:', stats);
  
  return { rows: long, stats };
}

// Simple analyzer function (JavaScript version)
function analyzeData(rows) {
  console.log('🔍 Starting rules-based analysis...');
  
  const accountGroups = new Map();
  
  // Group rows by account name
  for (const row of rows) {
    if (!accountGroups.has(row.account_name)) {
      accountGroups.set(row.account_name, []);
    }
    accountGroups.get(row.account_name).push(row);
  }
  
  console.log(`📊 Analyzing ${accountGroups.size} unique accounts`);
  
  const results = [];
  
  for (const [accountName, accountRows] of accountGroups) {
    const bucket = categorizeAccount(accountName);
    const confidence = calculateConfidence(accountName, bucket);
    const reasoning = generateReasoning(accountName, bucket);
    
    results.push({
      bucket,
      confidence,
      reasoning
    });
    
    console.log(`📋 ${accountName} → ${bucket} (${confidence}%)`);
  }
  
  return results;
}

function categorizeAccount(accountName) {
  const name = accountName.toLowerCase();
  
  // Income patterns
  if (name.match(/(rent|income|revenue|tenant|resident)/i)) {
    return 'income';
  }
  
  // Utilities patterns
  if (name.match(/(utilities|pg&e|water|trash|electric|gas|sewer)/i)) {
    return 'utilities';
  }
  
  // Maintenance patterns
  if (name.match(/(maintenance|repairs|repair)/i)) {
    return 'maintenance';
  }
  
  return 'other';
}

function calculateConfidence(accountName, bucket) {
  const name = accountName.toLowerCase();
  
  // High confidence for exact matches
  if (name.includes('rent') || name.includes('utilities') || name.includes('maintenance')) {
    return 0.95;
  }
  
  // Medium confidence for partial matches
  if (name.includes('income') || name.includes('revenue') || name.includes('repair')) {
    return 0.80;
  }
  
  // Low confidence for other
  return bucket === 'other' ? 0.50 : 0.70;
}

function generateReasoning(accountName, bucket) {
  const name = accountName.toLowerCase();
  
  if (bucket === 'income') {
    if (name.includes('rent')) return 'Contains "rent" keyword';
    if (name.includes('income')) return 'Contains "income" keyword';
    if (name.includes('revenue')) return 'Contains "revenue" keyword';
    return 'Revenue-related account name';
  }
  
  if (bucket === 'utilities') {
    if (name.includes('utilities')) return 'Contains "utilities" keyword';
    if (name.includes('water')) return 'Contains "water" keyword';
    if (name.includes('electric')) return 'Contains "electric" keyword';
    return 'Utility-related account name';
  }
  
  if (bucket === 'maintenance') {
    if (name.includes('maintenance')) return 'Contains "maintenance" keyword';
    if (name.includes('repair')) return 'Contains "repair" keyword';
    return 'Maintenance-related account name';
  }
  
  return 'No specific category match found';
}

// POST /api/ingest-cashflow
router.post('/ingest-cashflow', upload.single('csvFile'), async (req, res) => {
  try {
    console.log('🚀 Starting cashflow ingestion...');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No CSV file uploaded' 
      });
    }
    
    const filePath = req.file.path;
    const dryRun = req.body.dryRun === 'true';
    
    console.log(`📁 Processing file: ${req.file.originalname}`);
    console.log(`🧪 Dry run: ${dryRun}`);
    
    // Step 1: Normalize CSV
    console.log('📊 Step 1: Normalizing CSV...');
    const csvBuffer = fs.readFileSync(filePath);
    const normalizeResult = normalizeCSV(csvBuffer);
    
    console.log('✅ Normalization complete:', {
      totalRows: normalizeResult.stats.totalRows,
      droppedSectionRows: normalizeResult.stats.droppedSectionRows,
      parsedRows: normalizeResult.stats.parsedRows,
      invalidCurrencyCells: normalizeResult.stats.invalidCurrencyCells,
      uniqueAccounts: normalizeResult.stats.accountNames.length
    });
    
    // Step 2: Analyze with bucketer
    console.log('🔍 Step 2: Analyzing data...');
    const analysisResults = analyzeData(normalizeResult.rows);
    
    console.log('✅ Analysis complete:', {
      totalAnalyses: analysisResults.length,
      buckets: analysisResults.reduce((acc, result) => {
        acc[result.bucket] = (acc[result.bucket] || 0) + 1;
        return acc;
      }, {})
    });
    
    // Step 3: Dry run (for now)
    console.log('💾 Step 3: Dry run processing...');
    
    const dryRunData = {
      accounts: normalizeResult.stats.accountNames.map(name => ({
        account_name: name,
        analysis: analysisResults.find(r => r.account_name === name) || { bucket: 'other', confidence: 0.5, reasoning: 'No analysis available' }
      })),
      monthlyData: normalizeResult.rows.map(row => ({
        account_name: row.account_name,
        period: `${row.period}-01`,
        amount: row.amount,
        amount_raw: row.amount_raw
      })),
      stats: {
        totalAccounts: normalizeResult.stats.accountNames.length,
        totalMonthlyRecords: normalizeResult.rows.length,
        totalAmount: normalizeResult.rows.reduce((sum, row) => sum + (row.amount || 0), 0)
      }
    };
    
    // Write to debug file
    const debugDir = path.join(process.cwd(), '.debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const debugFile = path.join(debugDir, 'out.json');
    fs.writeFileSync(debugFile, JSON.stringify(dryRunData, null, 2));
    console.log(`📁 Dry-run data written to: ${debugFile}`);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    // Return comprehensive result
    res.json({
      success: true,
      message: 'Cashflow ingestion completed successfully',
      data: {
        normalization: normalizeResult.stats,
        analysis: {
          totalAnalyses: analysisResults.length,
          buckets: analysisResults.reduce((acc, result) => {
            acc[result.bucket] = (acc[result.bucket] || 0) + 1;
            return acc;
          }, {}),
          topAccounts: normalizeResult.stats.accountNames.slice(0, 10)
        },
        dryRun: dryRunData,
        sampleData: {
          normalizedRows: normalizeResult.rows.slice(0, 5),
          analysisResults: analysisResults.slice(0, 5)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Cashflow ingestion failed:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

module.exports = router;
