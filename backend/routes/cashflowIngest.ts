import express from 'express';
import multer from 'multer';
import path from 'path';
import { normalize } from '../lib/csvNormalize';
import { createAnalyzer } from '../lib/analyzers/bucketer';
import { supabaseService } from '../lib/supabaseService';

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
    const analyzerType = req.body.analyzerType || 'rules';
    const dryRun = req.body.dryRun === 'true';
    
    console.log(`📁 Processing file: ${req.file.originalname}`);
    console.log(`🔍 Analyzer type: ${analyzerType}`);
    console.log(`🧪 Dry run: ${dryRun}`);
    
    // Step 1: Normalize CSV
    console.log('📊 Step 1: Normalizing CSV...');
    const fs = require('fs');
    const csvBuffer = fs.readFileSync(filePath);
    const normalizeResult = normalize(csvBuffer);
    
    console.log('✅ Normalization complete:', {
      totalRows: normalizeResult.stats.totalRows,
      droppedSectionRows: normalizeResult.stats.droppedSectionRows,
      parsedRows: normalizeResult.stats.parsedRows,
      invalidCurrencyCells: normalizeResult.stats.invalidCurrencyCells,
      uniqueAccounts: normalizeResult.stats.accountNames.length
    });
    
    // Step 2: Analyze with bucketer
    console.log('🔍 Step 2: Analyzing data...');
    const analyzer = createAnalyzer(analyzerType as 'rules' | 'ai');
    const analysisResults = await analyzer.analyze(normalizeResult.rows);
    
    console.log('✅ Analysis complete:', {
      totalAnalyses: analysisResults.length,
      buckets: analysisResults.reduce((acc, result) => {
        acc[result.bucket] = (acc[result.bucket] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    // Step 3: Upsert to Supabase or dry run
    console.log('💾 Step 3: Upserting data...');
    let upsertResult;
    
    if (dryRun || !process.env.SUPABASE_DB_URL) {
      console.log('🧪 Running in dry-run mode');
      upsertResult = await supabaseService.dryRunUpsert(normalizeResult.rows, analysisResults);
    } else {
      upsertResult = await supabaseService.upsertCashflowData(normalizeResult.rows, analysisResults);
    }
    
    console.log('✅ Upsert complete:', {
      accountsUpserted: upsertResult.accountsUpserted,
      monthlyDataUpserted: upsertResult.monthlyDataUpserted,
      errors: upsertResult.errors.length
    });
    
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
          }, {} as Record<string, number>),
          topAccounts: normalizeResult.stats.accountNames.slice(0, 10)
        },
        upsert: upsertResult,
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
      const fs = require('fs');
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

export default router;
