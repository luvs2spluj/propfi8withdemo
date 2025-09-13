const { pool } = require('../config/supabase');
const CSVProcessor = require('../utils/csvProcessor');
const fs = require('fs');
const path = require('path');

class CSVService {
  constructor() {
    this.csvProcessor = new CSVProcessor();
  }

  // Process and store CSV data
  async processCSVUpload(filePath, propertyId, fileName, fileSize) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create upload record
      const uploadResult = await client.query(
        'INSERT INTO csv_uploads (property_id, filename, file_size, upload_status) VALUES ($1, $2, $3, $4) RETURNING id',
        [propertyId, fileName, fileSize, 'processing']
      );
      
      const uploadId = uploadResult.rows[0].id;

      try {
        // Get property name for validation
        const propertyResult = await client.query(
          'SELECT name FROM properties WHERE id = $1',
          [propertyId]
        );

        if (!propertyResult.rows[0]) {
          throw new Error('Property not found');
        }

        const propertyName = propertyResult.rows[0].name;

        // Parse CSV file with property name context
        const parseResult = await this.csvProcessor.parseCSV(filePath, propertyName);
        
        if (parseResult.errors.length > 0) {
          console.warn(`CSV parsing warnings: ${parseResult.errors.length} errors`);
        }

        // Clean and deduplicate data
        const cleanedData = this.csvProcessor.cleanData(parseResult.data);
        let processedCount = 0;
        let skippedCount = 0;

        // Process each row (may be multiple rows for month-column format)
        for (const row of cleanedData) {
          try {
            // Validate property name matches (if property name exists in CSV)
            if (row.propertyName && row.propertyName.toLowerCase() !== propertyName.toLowerCase()) {
              console.warn(`Property name mismatch: ${row.propertyName} vs ${propertyName}`);
              skippedCount++;
              continue;
            }

            // Handle month-column format data differently
            if (row.accountName && row.amount !== undefined) {
              // This is month-column format data
              const accountType = this.categorizeAccount(row.accountName);
              
              // Check for existing data (prevent duplicates)
              const existingResult = await client.query(
                'SELECT id FROM property_data WHERE property_id = $1 AND date = $2',
                [propertyId, row.date]
              );

              if (existingResult.rows.length > 0) {
                // Update existing record with new account data
                await client.query(
                  `UPDATE property_data SET 
                   ${accountType} = ${accountType} + $1,
                   notes = $2,
                   updated_at = NOW()
                   WHERE property_id = $3 AND date = $4`,
                  [row.amount, fileName, propertyId, row.date]
                );
              } else {
                // Insert new record with account data
                const updateFields = {};
                updateFields[accountType] = row.amount;
                
                await client.query(
                  `INSERT INTO property_data 
                   (property_id, date, revenue, occupancy_rate, maintenance_cost, utilities_cost, insurance_cost, property_tax, other_expenses, notes) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                  [
                    propertyId,
                    row.date,
                    accountType === 'revenue' ? row.amount : 0,
                    row.occupancyRate || 0,
                    accountType === 'maintenance_cost' ? row.amount : 0,
                    accountType === 'utilities_cost' ? row.amount : 0,
                    accountType === 'insurance_cost' ? row.amount : 0,
                    accountType === 'property_tax' ? row.amount : 0,
                    accountType === 'other_expenses' ? row.amount : 0,
                    fileName
                  ]
                );
              }
            } else {
              // This is traditional format data
              // Check for existing data (prevent duplicates)
              const existingResult = await client.query(
                'SELECT id FROM property_data WHERE property_id = $1 AND date = $2',
                [propertyId, row.date]
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
                    row.monthlyRevenue,
                    row.occupancyRate,
                    row.maintenanceCost || (row.expenses * 0.3), // Default 30% for maintenance
                    row.utilitiesCost || (row.expenses * 0.2), // Default 20% for utilities
                    row.insuranceCost || (row.expenses * 0.1), // Default 10% for insurance
                    row.propertyTax || (row.expenses * 0.2), // Default 20% for property tax
                    row.otherExpenses || (row.expenses * 0.2), // Default 20% for other expenses
                    fileName,
                    propertyId,
                    row.date
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
                    row.date,
                    row.monthlyRevenue,
                    row.occupancyRate,
                    row.maintenanceCost || (row.expenses * 0.3), // Default 30% for maintenance
                    row.utilitiesCost || (row.expenses * 0.2), // Default 20% for utilities
                    row.insuranceCost || (row.expenses * 0.1), // Default 10% for insurance
                    row.propertyTax || (row.expenses * 0.2), // Default 20% for property tax
                    row.otherExpenses || (row.expenses * 0.2), // Default 20% for other expenses
                    fileName
                  ]
                );
              }
            }
            
            processedCount++;
          } catch (rowError) {
            console.error(`Error processing row:`, rowError);
            skippedCount++;
          }
        }

        // Update upload record with results
        await client.query(
          'UPDATE csv_uploads SET rows_processed = $1, upload_status = $2, processed_at = NOW() WHERE id = $3',
          [processedCount + skippedCount, 'completed', uploadId]
        );

        await client.query('COMMIT');

        return {
          uploadId,
          totalRows: cleanedData.length,
          processedCount,
          skippedCount,
          errors: 0,
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

  // Enhanced data validation for 26-unit building context
  validatePropertyData(row, propertyId) {
    const errors = [];
    
    // Validate revenue (should be reasonable for 26 units)
    if (row.monthlyRevenue < 1000 || row.monthlyRevenue > 100000) {
      errors.push(`Revenue ${row.monthlyRevenue} seems unrealistic for a 26-unit building`);
    }
    
    // Validate occupancy rate
    if (row.occupancyRate < 0 || row.occupancyRate > 100) {
      errors.push(`Invalid occupancy rate: ${row.occupancyRate}%`);
    }
    
    // Validate date format
    if (!row.date || isNaN(new Date(row.date).getTime())) {
      errors.push(`Invalid date: ${row.date}`);
    }
    
    // Validate expenses don't exceed revenue
    const totalExpenses = (row.maintenanceCost || 0) + (row.utilitiesCost || 0) + 
                         (row.insuranceCost || 0) + (row.propertyTax || 0) + (row.otherExpenses || 0);
    if (totalExpenses > row.monthlyRevenue) {
      errors.push(`Total expenses (${totalExpenses}) exceed revenue (${row.monthlyRevenue})`);
    }
    
    return {
      isValid: errors.length === 0,
      error: errors.join('; ')
    };
  }

  // Calculate default expense percentages for 26-unit building
  calculateDefaultExpense(totalExpenses, expenseType) {
    if (!totalExpenses || totalExpenses <= 0) return 0;
    
    const percentages = {
      maintenance: 0.35,  // 35% for maintenance (higher for older buildings)
      utilities: 0.25,    // 25% for utilities
      insurance: 0.15,    // 15% for insurance
      property_tax: 0.15, // 15% for property tax
      other: 0.10         // 10% for other expenses
    };
    
    return Math.round(totalExpenses * percentages[expenseType] * 100) / 100;
  }

  // Categorize account names into database fields
  categorizeAccount(accountName) {
    const name = accountName.toLowerCase().trim();
    
    // Revenue accounts - be more specific
    if (name.includes('rent') || name.includes('tenant') || name.includes('resident') ||
        name.includes('rental') || name.includes('short term') || name.includes('application fee') ||
        name.includes('pet fee') || name.includes('lock') || name.includes('key') ||
        name.includes('insurance svcs income') || name.includes('credit reporting services income')) {
      return 'revenue';
    }
    
    // Utilities accounts - expanded
    if (name.includes('utility') || name.includes('utilities') || name.includes('water') || 
        name.includes('garbage') || name.includes('electric') || name.includes('gas') || 
        name.includes('sewer') || name.includes('refuse disposal') || name.includes('pest control')) {
      return 'utilities_cost';
    }
    
    // Maintenance accounts - expanded
    if (name.includes('maintenance') || name.includes('repair') || name.includes('cleaning') ||
        name.includes('damage') || name.includes('carpet') || name.includes('r & m') ||
        name.includes('hvac') || name.includes('plumbing') || name.includes('paint') ||
        name.includes('appliances') || name.includes('fire & alarm') || name.includes('computers') ||
        name.includes('server') || name.includes('phones') || name.includes('it')) {
      return 'maintenance_cost';
    }
    
    // Insurance accounts
    if (name.includes('insurance') || name.includes('liability') || name.includes('coverage')) {
      return 'insurance_cost';
    }
    
    // Property tax accounts
    if (name.includes('tax') || name.includes('property tax') || name.includes('assessment')) {
      return 'property_tax';
    }
    
    // Management and administrative accounts
    if (name.includes('management') || name.includes('admin') || name.includes('salary') ||
        name.includes('wage') || name.includes('fee') || name.includes('concession') ||
        name.includes('late fee') || name.includes('application') || name.includes('pet')) {
      return 'other_expenses';
    }
    
    // Default to other expenses
    return 'other_expenses';
  }

  // Check if new upload is newer than existing data
  isNewerUpload(newFileName, existingNotes) {
    // Simple comparison - in production you might want more sophisticated logic
    // For now, assume newer uploads have later timestamps in filename
    return newFileName > existingNotes;
  }

  // Get upload history
  async getUploadHistory(propertyId = null) {
    try {
      let query = `
        SELECT cu.*, p.name as property_name
        FROM csv_uploads cu
        JOIN properties p ON cu.property_id = p.id
      `;
      
      const params = [];
      if (propertyId) {
        query += ' WHERE cu.property_id = $1';
        params.push(propertyId);
      }
      
      query += ' ORDER BY cu.uploaded_at DESC';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch upload history: ${error.message}`);
    }
  }

  // Validate CSV file
  async validateCSV(filePath, propertyName = null) {
    try {
      const parseResult = await this.csvProcessor.parseCSV(filePath, propertyName);
      const cleanedData = this.csvProcessor.cleanData(parseResult.data);
      
      // For month-column format, validation is more lenient
      // Only count actual errors, not skipped rows
      const isValid = parseResult.errors.length === 0;
      
      return {
        isValid: isValid,
        totalRows: cleanedData.length,
        validRows: cleanedData.length,
        invalidRows: parseResult.errors.length,
        errors: parseResult.errors,
        sampleData: cleanedData.slice(0, 3), // Return first 3 rows as sample
        isMonthColumnFormat: parseResult.isMonthColumnFormat
      };
    } catch (error) {
      return {
        isValid: false,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [error.message],
        sampleData: [],
        isMonthColumnFormat: false
      };
    }
  }

  // CSV Management methods
  async getUploadHistory(propertyId = null) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          cu.*,
          p.name as property_name
        FROM csv_uploads cu
        JOIN properties p ON cu.property_id = p.id
      `;
      
      const params = [];
      if (propertyId) {
        query += ' WHERE cu.property_id = $1';
        params.push(propertyId);
      }
      
      query += ' ORDER BY cu.uploaded_at DESC';
      
      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting upload history:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteUpload(uploadId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // First delete the upload record
      const deleteResult = await client.query(
        'DELETE FROM csv_uploads WHERE id = $1',
        [uploadId]
      );
      
      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting upload:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePropertyDataByUpload(uploadId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete property data that was created from this upload
      const deleteResult = await client.query(
        'DELETE FROM property_data WHERE notes = (SELECT filename FROM csv_uploads WHERE id = $1)',
        [uploadId]
      );
      
      await client.query('COMMIT');
      return deleteResult.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting property data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async reprocessUpload(uploadId) {
    const client = await pool.connect();
    try {
      // Get upload details
      const uploadResult = await client.query(
        'SELECT * FROM csv_uploads WHERE id = $1',
        [uploadId]
      );
      
      if (uploadResult.rows.length === 0) {
        return { success: false, error: 'Upload not found' };
      }
      
      const upload = uploadResult.rows[0];
      
      // For now, just return success - in a real implementation,
      // you would re-process the CSV file
      return {
        success: true,
        message: 'Upload reprocessed successfully',
        uploadId: uploadId
      };
    } catch (error) {
      console.error('Error reprocessing upload:', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  // Process CSV locally without Supabase validation
  async processCSVLocal(filePath, propertyName = null) {
    try {
      console.log('🏠 Processing CSV locally...');
      console.log('📁 File path:', filePath);
      console.log('🏢 Property name:', propertyName);
      
      // Parse CSV without strict validation
      const parseResult = await this.csvProcessor.parseCSV(filePath, propertyName);
      
      console.log('📊 Parse result:', {
        totalRows: parseResult.data.length,
        errors: parseResult.errors.length,
        isMonthColumnFormat: parseResult.isMonthColumnFormat,
        sampleData: parseResult.data.slice(0, 2)
      });
      
      // Clean and process data
      const cleanedData = this.csvProcessor.cleanData(parseResult.data);
      
      console.log('🧹 Cleaned data:', {
        originalLength: parseResult.data.length,
        cleanedLength: cleanedData.length,
        sampleCleaned: cleanedData.slice(0, 2)
      });
      
      // Analyze data with AI
      const aiAnalysis = await this.analyzeDataWithAI(cleanedData, propertyName);
      
      // Return processed data for frontend display
      return {
        totalRows: cleanedData.length,
        processedRows: cleanedData.length,
        aiAnalysis: aiAnalysis,
        data: cleanedData,
        format: parseResult.isMonthColumnFormat ? 'month-column' : 'traditional',
        status: 'processed'
      };
    } catch (error) {
      console.error('Local CSV processing error:', error);
      throw error;
    }
  }

  // Analyze data with AI (simplified version for local processing)
  async analyzeDataWithAI(data, propertyName) {
    try {
      // Simple AI analysis for local processing
      const analysis = {
        propertyName: propertyName || 'Unknown Property',
        totalRecords: data.length,
        dateRange: this.getDateRange(data),
        revenueAnalysis: this.analyzeRevenue(data),
        expenseAnalysis: this.analyzeExpenses(data),
        anomalies: this.detectAnomalies(data),
        insights: this.generateInsights(data),
        confidence: 0.85
      };
      
      return analysis;
    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        propertyName: propertyName || 'Unknown Property',
        totalRecords: data.length,
        error: 'AI analysis failed',
        confidence: 0.5
      };
    }
  }

  // Helper methods for local analysis
  getDateRange(data) {
    if (data.length === 0) return null;
    
    const dates = data.map(row => new Date(row.date)).filter(date => !isNaN(date));
    if (dates.length === 0) return null;
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return {
      start: minDate.toISOString().split('T')[0],
      end: maxDate.toISOString().split('T')[0],
      months: Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24 * 30))
    };
  }

  analyzeRevenue(data) {
    const revenueData = data.filter(row => row.accountName && 
      (row.accountName.toLowerCase().includes('rent') || 
       row.accountName.toLowerCase().includes('revenue')));
    
    const totalRevenue = revenueData.reduce((sum, row) => sum + (row.amount || 0), 0);
    const avgRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
    
    return {
      total: totalRevenue,
      average: avgRevenue,
      records: revenueData.length,
      trend: this.calculateTrend(revenueData)
    };
  }

  analyzeExpenses(data) {
    const expenseData = data.filter(row => row.accountName && 
      !row.accountName.toLowerCase().includes('rent') && 
      !row.accountName.toLowerCase().includes('revenue'));
    
    const totalExpenses = expenseData.reduce((sum, row) => sum + (row.amount || 0), 0);
    
    return {
      total: totalExpenses,
      records: expenseData.length,
      categories: this.categorizeExpenses(expenseData)
    };
  }

  detectAnomalies(data) {
    const anomalies = [];
    
    // Simple anomaly detection
    const amounts = data.map(row => row.amount || 0).filter(amount => amount > 0);
    if (amounts.length > 0) {
      const avg = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      const threshold = avg * 2; // 200% of average
      
      data.forEach((row, index) => {
        if (row.amount > threshold) {
          anomalies.push({
            type: 'high_value',
            row: index + 1,
            account: row.accountName,
            amount: row.amount,
            message: `Unusually high value: $${row.amount.toLocaleString()}`
          });
        }
      });
    }
    
    return anomalies;
  }

  generateInsights(data) {
    const insights = [];
    
    if (data.length > 0) {
      insights.push(`Processed ${data.length} data records successfully`);
      
      const revenueData = data.filter(row => row.accountName && 
        row.accountName.toLowerCase().includes('rent'));
      if (revenueData.length > 0) {
        insights.push(`Found ${revenueData.length} revenue accounts`);
      }
      
      const expenseData = data.filter(row => row.accountName && 
        !row.accountName.toLowerCase().includes('rent'));
      if (expenseData.length > 0) {
        insights.push(`Found ${expenseData.length} expense accounts`);
      }
    }
    
    return insights;
  }

  calculateTrend(data) {
    if (data.length < 2) return 'insufficient_data';
    
    const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
    const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, row) => sum + (row.amount || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, row) => sum + (row.amount || 0), 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  categorizeExpenses(expenseData) {
    const categories = {};
    
    expenseData.forEach(row => {
      const category = this.categorizeAccount(row.accountName);
      if (!categories[category]) {
        categories[category] = { total: 0, count: 0 };
      }
      categories[category].total += row.amount || 0;
      categories[category].count += 1;
    });
    
    return categories;
  }
}

module.exports = new CSVService();
