// Smart CSV Service with AI Integration
// Enhanced CSV processing with automatic data recognition and categorization

const AISpreadsheetAnalyzer = require('./aiSpreadsheetAnalyzer');
const { pool } = require('../config/supabase');
const CSVProcessor = require('../utils/csvProcessor');
const fs = require('fs');

class SmartCSVService {
  constructor() {
    this.aiAnalyzer = new AISpreadsheetAnalyzer();
    this.csvProcessor = new CSVProcessor();
  }

  // Enhanced CSV upload with AI analysis
  async processSmartCSVUpload(filePath, propertyId, fileName, fileSize) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create upload record
      const uploadResult = await client.query(
        'INSERT INTO csv_uploads (property_id, filename, file_size, upload_status) VALUES ($1, $2, $3, $4) RETURNING id',
        [propertyId, fileName, fileSize, 'analyzing']
      );
      
      const uploadId = uploadResult.rows[0].id;

      try {
        // Get property name for context
        const propertyResult = await client.query(
          'SELECT name FROM properties WHERE id = $1',
          [propertyId]
        );

        if (!propertyResult.rows[0]) {
          throw new Error('Property not found');
        }

        const propertyName = propertyResult.rows[0].name;

        // Step 1: AI Analysis
        console.log('🤖 Starting AI analysis...');
        const csvData = await this.parseCSVToObjects(filePath);
        const aiAnalysis = await this.aiAnalyzer.analyzeCSV(csvData, fileName);
        
        console.log('📊 AI Analysis Results:', {
          format: aiAnalysis.format.type,
          confidence: aiAnalysis.confidence,
          categories: aiAnalysis.categorization.categories.length,
          quality: aiAnalysis.dataQuality.quality
        });

        // Update upload record with analysis results
        await client.query(
          'UPDATE csv_uploads SET upload_status = $1, error_message = $2 WHERE id = $3',
          ['processing', `AI Analysis: ${aiAnalysis.confidence.toFixed(2)} confidence, ${aiAnalysis.format.type} format`, uploadId]
        );

        // Step 2: Smart Processing
        console.log('⚡ Starting smart processing...');
        const processingResult = await this.smartProcessData(
          csvData, 
          propertyId, 
          propertyName, 
          fileName, 
          aiAnalysis
        );

        // Step 3: Update upload record with final results
        await client.query(
          'UPDATE csv_uploads SET rows_processed = $1, upload_status = $2, processed_at = NOW() WHERE id = $3',
          [processingResult.totalProcessed, 'completed', uploadId]
        );

        await client.query('COMMIT');

        return {
          uploadId,
          aiAnalysis: aiAnalysis,
          processingResult: processingResult,
          status: 'completed'
        };

      } catch (processingError) {
        await client.query('ROLLBACK');
        
        // Update upload record with error
        await client.query(
          'UPDATE csv_uploads SET upload_status = $1, error_message = $2 WHERE id = $3',
          ['failed', processingError.message, uploadId]
        );
        
        throw processingError;
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Parse CSV to objects for AI analysis
  async parseCSVToObjects(filePath) {
    return new Promise((resolve, reject) => {
      const csv = require('csv-parser');
      const results = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  // Smart data processing based on AI analysis
  async smartProcessData(csvData, propertyId, propertyName, fileName, aiAnalysis) {
    const client = await pool.connect();
    
    try {
      let processedCount = 0;
      let skippedCount = 0;
      const processingLog = [];

      if (aiAnalysis.format.type === 'month_column') {
        // Process month-column format with AI categorization
        const result = await this.processMonthColumnFormat(csvData, propertyId, propertyName, fileName, aiAnalysis);
        processedCount = result.processedCount;
        skippedCount = result.skippedCount;
        processingLog.push(...result.log);
      } else {
        // Process traditional format with AI enhancement
        const result = await this.processTraditionalFormat(csvData, propertyId, propertyName, fileName, aiAnalysis);
        processedCount = result.processedCount;
        skippedCount = result.skippedCount;
        processingLog.push(...result.log);
      }

      return {
        totalProcessed: processedCount,
        totalSkipped: skippedCount,
        processingLog: processingLog,
        aiInsights: {
          format: aiAnalysis.format.type,
          confidence: aiAnalysis.confidence,
          categories: aiAnalysis.categorization.categories.length,
          quality: aiAnalysis.dataQuality.quality
        }
      };

    } finally {
      client.release();
    }
  }

  // Process month-column format with AI categorization
  async processMonthColumnFormat(csvData, propertyId, propertyName, fileName, aiAnalysis) {
    const client = await pool.connect();
    let processedCount = 0;
    let skippedCount = 0;
    const log = [];

    try {
      const headers = Object.keys(csvData[0]);
      const monthColumns = headers.filter(header => 
        aiAnalysis.format.monthColumns.includes(header)
      );

      // Get AI categorization for better account classification
      const categoryMap = {};
      aiAnalysis.categorization.categories.forEach(cat => {
        categoryMap[cat.column] = cat.category;
      });

      for (const row of csvData) {
        const accountName = row['Account Name'] || row['account name'] || row['account_name'];
        
        if (!accountName || accountName.trim() === '') {
          skippedCount++;
          log.push(`Skipped row: No account name`);
          continue;
        }

        // Skip total/summary rows
        if (accountName.toLowerCase().includes('total') || 
            accountName.toLowerCase().includes('subtotal') ||
            accountName.toLowerCase().includes('summary')) {
          skippedCount++;
          log.push(`Skipped row: ${accountName} (summary row)`);
          continue;
        }

        // Process each month column
        for (const monthHeader of monthColumns) {
          const value = this.extractNumber(row[monthHeader]);
          
          if (value !== null && value !== 0) {
            const date = this.parseMonthHeader(monthHeader);
            
            if (date) {
              // Use AI categorization or fallback to smart categorization
              const category = categoryMap[accountName] || this.smartCategorizeAccount(accountName);
              
              try {
                // Check for existing data
                const existingResult = await client.query(
                  'SELECT id FROM property_data WHERE property_id = $1 AND date = $2',
                  [propertyId, date]
                );

                if (existingResult.rows.length > 0) {
                  // Update existing record
                  await client.query(
                    `UPDATE property_data SET 
                     ${category} = ${category} + $1,
                     notes = $2,
                     updated_at = NOW()
                     WHERE property_id = $3 AND date = $4`,
                    [value, fileName, propertyId, date]
                  );
                } else {
                  // Insert new record
                  await client.query(
                    `INSERT INTO property_data 
                     (property_id, date, revenue, occupancy_rate, maintenance_cost, utilities_cost, insurance_cost, property_tax, other_expenses, notes) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                      propertyId,
                      date,
                      category === 'revenue' ? value : 0,
                      0, // occupancy_rate
                      category === 'maintenance_cost' ? value : 0,
                      category === 'utilities_cost' ? value : 0,
                      category === 'insurance_cost' ? value : 0,
                      category === 'property_tax' ? value : 0,
                      category === 'other_expenses' ? value : 0,
                      fileName
                    ]
                  );
                }
                
                processedCount++;
                log.push(`Processed: ${accountName} (${monthHeader}) = $${value} → ${category}`);
                
              } catch (error) {
                skippedCount++;
                log.push(`Error processing ${accountName} (${monthHeader}): ${error.message}`);
              }
            }
          }
        }
      }

      return { processedCount, skippedCount, log };

    } finally {
      client.release();
    }
  }

  // Process traditional format with AI enhancement
  async processTraditionalFormat(csvData, propertyId, propertyName, fileName, aiAnalysis) {
    const client = await pool.connect();
    let processedCount = 0;
    let skippedCount = 0;
    const log = [];

    try {
      for (const row of csvData) {
        try {
          // Use AI analysis to enhance data processing
          const enhancedRow = this.enhanceRowWithAI(row, aiAnalysis);
          
          // Check for existing data
          const existingResult = await client.query(
            'SELECT id FROM property_data WHERE property_id = $1 AND date = $2',
            [propertyId, enhancedRow.date]
          );

          if (existingResult.rows.length > 0) {
            // Update existing record
            await client.query(
              `UPDATE property_data SET 
               revenue = $1, 
               occupancy_rate = $2, 
               maintenance_cost = $3, 
               utilities_cost = $4, 
               insurance_cost = $5,
               property_tax = $6,
               other_expenses = $7,
               notes = $8,
               updated_at = NOW()
               WHERE property_id = $9 AND date = $10`,
              [
                enhancedRow.monthlyRevenue,
                enhancedRow.occupancyRate,
                enhancedRow.maintenanceCost || (enhancedRow.expenses * 0.3),
                enhancedRow.utilitiesCost || (enhancedRow.expenses * 0.2),
                enhancedRow.insuranceCost || (enhancedRow.expenses * 0.1),
                enhancedRow.propertyTax || (enhancedRow.expenses * 0.2),
                enhancedRow.otherExpenses || (enhancedRow.expenses * 0.2),
                fileName,
                propertyId,
                enhancedRow.date
              ]
            );
          } else {
            // Insert new record
            await client.query(
              `INSERT INTO property_data 
               (property_id, date, revenue, occupancy_rate, maintenance_cost, utilities_cost, insurance_cost, property_tax, other_expenses, notes) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                propertyId,
                enhancedRow.date,
                enhancedRow.monthlyRevenue,
                enhancedRow.occupancyRate,
                enhancedRow.maintenanceCost || (enhancedRow.expenses * 0.3),
                enhancedRow.utilitiesCost || (enhancedRow.expenses * 0.2),
                enhancedRow.insuranceCost || (enhancedRow.expenses * 0.1),
                enhancedRow.propertyTax || (enhancedRow.expenses * 0.2),
                enhancedRow.otherExpenses || (enhancedRow.expenses * 0.2),
                fileName
              ]
            );
          }
          
          processedCount++;
          log.push(`Processed traditional row: ${enhancedRow.date} - Revenue: $${enhancedRow.monthlyRevenue}`);
          
        } catch (error) {
          skippedCount++;
          log.push(`Error processing row: ${error.message}`);
        }
      }

      return { processedCount, skippedCount, log };

    } finally {
      client.release();
    }
  }

  // Enhance row data using AI analysis
  enhanceRowWithAI(row, aiAnalysis) {
    // Use AI categorization to improve data mapping
    const enhancedRow = { ...row };
    
    // Apply AI insights to improve data quality
    aiAnalysis.categorization.categories.forEach(cat => {
      if (cat.confidence > 0.8) {
        // High confidence categorization - use it to enhance the row
        const value = this.extractNumber(row[cat.column]);
        if (value !== null) {
          enhancedRow[cat.category] = value;
        }
      }
    });

    return enhancedRow;
  }

  // Smart account categorization (fallback when AI doesn't have high confidence)
  smartCategorizeAccount(accountName) {
    const name = accountName.toLowerCase();
    
    if (name.includes('rent') || name.includes('revenue') || name.includes('income') || 
        name.includes('tenant') || name.includes('resident')) {
      return 'revenue';
    }
    
    if (name.includes('maintenance') || name.includes('repair') || name.includes('cleaning') ||
        name.includes('damage') || name.includes('carpet') || name.includes('lock') || 
        name.includes('key')) {
      return 'maintenance_cost';
    }
    
    if (name.includes('utility') || name.includes('water') || name.includes('garbage') ||
        name.includes('electric') || name.includes('gas') || name.includes('sewer')) {
      return 'utilities_cost';
    }
    
    if (name.includes('insurance') || name.includes('liability') || name.includes('coverage')) {
      return 'insurance_cost';
    }
    
    if (name.includes('tax') || name.includes('property tax') || name.includes('assessment')) {
      return 'property_tax';
    }
    
    return 'other_expenses';
  }

  // Utility methods
  extractNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const cleaned = String(value).replace(/[,$]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  parseMonthHeader(monthHeader) {
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };

    const match = monthHeader.toLowerCase().trim().match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})$/);
    if (match) {
      const [, month, year] = match;
      const monthNum = monthMap[month];
      if (monthNum) {
        return `${year}-${monthNum}-15`;
      }
    }
    return null;
  }

  // Get AI analysis for a CSV file
  async getAIAnalysis(filePath, fileName = 'unknown') {
    try {
      const csvData = await this.parseCSVToObjects(filePath);
      return await this.aiAnalyzer.analyzeCSV(csvData, fileName);
    } catch (error) {
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }
}

module.exports = new SmartCSVService();
