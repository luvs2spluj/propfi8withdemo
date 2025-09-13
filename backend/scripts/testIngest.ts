#!/usr/bin/env ts-node

import { normalizeFromFile } from '../lib/csvNormalize';
import { createAnalyzer } from '../lib/analyzers/bucketer';
import { supabaseService } from '../lib/supabaseService';
import * as fs from 'fs';
import * as path from 'path';

async function testIngest(csvFilePath: string) {
  console.log('🧪 Starting CSV ingestion test...');
  console.log(`📁 File: ${csvFilePath}`);
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }
  
  try {
    // Step 1: Normalize CSV
    console.log('\n📊 Step 1: Normalizing CSV...');
    const normalizeResult = normalizeFromFile(csvFilePath);
    
    console.log('\n📋 Normalization Results:');
    console.log(`  Total rows in CSV: ${normalizeResult.stats.totalRows}`);
    console.log(`  Dropped section rows: ${normalizeResult.stats.droppedSectionRows}`);
    console.log(`  Parsed data rows: ${normalizeResult.stats.parsedRows}`);
    console.log(`  Invalid currency cells: ${normalizeResult.stats.invalidCurrencyCells}`);
    console.log(`  Unique accounts: ${normalizeResult.stats.accountNames.length}`);
    
    // Show top 10 account names
    console.log('\n📝 Top 10 Account Names:');
    normalizeResult.stats.accountNames.slice(0, 10).forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    
    // Show sample parsed data
    console.log('\n📊 Sample Parsed Data (first 5 rows):');
    normalizeResult.rows.slice(0, 5).forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.account_name} | ${row.period} | $${row.amount || 0} | "${row.amount_raw}"`);
    });
    
    // Step 2: Analyze with bucketer
    console.log('\n🔍 Step 2: Analyzing data...');
    const analyzer = createAnalyzer('rules');
    const analysisResults = await analyzer.analyze(normalizeResult.rows);
    
    console.log('\n📈 Analysis Results:');
    const bucketCounts = analysisResults.reduce((acc, result) => {
      acc[result.bucket] = (acc[result.bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(bucketCounts).forEach(([bucket, count]) => {
      console.log(`  ${bucket}: ${count} accounts`);
    });
    
    // Show sample analysis results
    console.log('\n🔍 Sample Analysis Results (first 5):');
    analysisResults.slice(0, 5).forEach((result, index) => {
      const accountName = normalizeResult.stats.accountNames[index];
      console.log(`  ${index + 1}. ${accountName} → ${result.bucket} (${Math.round(result.confidence * 100)}%) - ${result.reasoning}`);
    });
    
    // Step 3: Dry run upsert
    console.log('\n💾 Step 3: Dry run upsert...');
    const dryRunResult = await supabaseService.dryRunUpsert(normalizeResult.rows, analysisResults);
    
    console.log('\n📊 Dry Run Summary:');
    console.log(`  Total accounts: ${dryRunResult.stats.totalAccounts}`);
    console.log(`  Total monthly records: ${dryRunResult.stats.totalMonthlyRecords}`);
    console.log(`  Total amount: $${dryRunResult.stats.totalAmount.toLocaleString()}`);
    
    // Summary table
    console.log('\n📋 SUMMARY TABLE:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ CSV Ingestion Test Results                                  │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│ Total CSV Rows: ${normalizeResult.stats.totalRows.toString().padStart(40)} │`);
    console.log(`│ Dropped Section Rows: ${normalizeResult.stats.droppedSectionRows.toString().padStart(35)} │`);
    console.log(`│ Parsed Data Rows: ${normalizeResult.stats.parsedRows.toString().padStart(38)} │`);
    console.log(`│ Invalid Currency Cells: ${normalizeResult.stats.invalidCurrencyCells.toString().padStart(32)} │`);
    console.log(`│ Unique Accounts: ${normalizeResult.stats.accountNames.length.toString().padStart(40)} │`);
    console.log(`│ Income Accounts: ${(bucketCounts.income || 0).toString().padStart(40)} │`);
    console.log(`│ Utilities Accounts: ${(bucketCounts.utilities || 0).toString().padStart(35)} │`);
    console.log(`│ Maintenance Accounts: ${(bucketCounts.maintenance || 0).toString().padStart(33)} │`);
    console.log(`│ Other Accounts: ${(bucketCounts.other || 0).toString().padStart(40)} │`);
    console.log(`│ Total Amount: $${dryRunResult.stats.totalAmount.toLocaleString().padStart(35)} │`);
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Main execution
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('Usage: ts-node scripts/testIngest.ts <csv-file-path>');
  console.error('Example: ts-node scripts/testIngest.ts ./test_cashflow_clean.csv');
  process.exit(1);
}

testIngest(csvFilePath);
