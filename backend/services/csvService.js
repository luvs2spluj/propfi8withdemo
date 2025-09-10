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
        // Parse CSV file
        const parseResult = await this.csvProcessor.parseCSV(filePath);
        
        if (parseResult.errors.length > 0) {
          console.warn(`CSV parsing warnings: ${parseResult.errors.length} errors`);
        }

        // Clean and deduplicate data
        const cleanedData = this.csvProcessor.cleanData(parseResult.data);
        
        // Get property name for validation
        const propertyResult = await client.query(
          'SELECT name FROM properties WHERE id = $1',
          [propertyId]
        );

        if (!propertyResult.rows[0]) {
          throw new Error('Property not found');
        }

        const propertyName = propertyResult.rows[0].name;
        let processedCount = 0;
        let skippedCount = 0;

        // Process each row
        for (const row of cleanedData) {
          try {
            // Validate property name matches
            if (row.propertyName.toLowerCase() !== propertyName.toLowerCase()) {
              console.warn(`Property name mismatch: ${row.propertyName} vs ${propertyName}`);
              skippedCount++;
              continue;
            }

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
            
            processedCount++;
          } catch (rowError) {
            console.error(`Error processing row:`, rowError);
            skippedCount++;
          }
        }

        // Update upload record with results
        await client.query(
          'UPDATE csv_uploads SET rows_processed = $1, rows_inserted = $2, rows_skipped = $3, upload_status = $4, processed_at = NOW() WHERE id = $5',
          [processedCount + skippedCount, processedCount, skippedCount, 'completed', uploadId]
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
  async validateCSV(filePath) {
    try {
      const parseResult = await this.csvProcessor.parseCSV(filePath);
      const cleanedData = this.csvProcessor.cleanData(parseResult.data);
      
      return {
        isValid: parseResult.errors.length === 0,
        totalRows: cleanedData.length,
        validRows: cleanedData.length,
        invalidRows: parseResult.errors.length,
        errors: parseResult.errors,
        sampleData: cleanedData.slice(0, 3) // Return first 3 rows as sample
      };
    } catch (error) {
      return {
        isValid: false,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [error.message],
        sampleData: []
      };
    }
  }
}

module.exports = new CSVService();
