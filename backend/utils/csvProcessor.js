const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');

class CSVProcessor {
  constructor() {
    this.supportedFormats = [
      'property name', 'address', 'monthly revenue', 'occupancy rate',
      'total units', 'occupied units', 'expenses', 'net income', 'date'
    ];
  }

  // Parse CSV file and return structured data
  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          try {
            const processedRow = this.processRow(data);
            if (processedRow) {
              results.push(processedRow);
            }
          } catch (error) {
            errors.push({
              row: data,
              error: error.message
            });
          }
        })
        .on('end', () => {
          resolve({
            data: results,
            errors: errors,
            totalRows: results.length + errors.length,
            validRows: results.length,
            invalidRows: errors.length
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  // Process individual CSV row
  processRow(row) {
    // Normalize column names (case insensitive, trim whitespace)
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = key.toLowerCase().trim();
      normalizedRow[normalizedKey] = row[key];
    });

    // Extract and validate data
    const propertyName = this.extractString(normalizedRow, ['property name', 'property_name', 'property']);
    const address = this.extractString(normalizedRow, ['address', 'property_address']);
    const monthlyRevenue = this.extractNumber(normalizedRow, ['monthly revenue', 'monthly_revenue', 'revenue']);
    const occupancyRate = this.extractNumber(normalizedRow, ['occupancy rate', 'occupancy_rate', 'occupancy']);
    const totalUnits = this.extractNumber(normalizedRow, ['total units', 'total_units', 'units']);
    const occupiedUnits = this.extractNumber(normalizedRow, ['occupied units', 'occupied_units', 'occupied']);
    const expenses = this.extractNumber(normalizedRow, ['expenses', 'expense', 'costs']);
    const netIncome = this.extractNumber(normalizedRow, ['net income', 'net_income', 'profit']);
    const date = this.extractDate(normalizedRow, ['date', 'data_date', 'month', 'period']);

    // Validate required fields
    if (!propertyName) {
      throw new Error('Property name is required');
    }

    if (!date) {
      throw new Error('Date is required');
    }

    // Calculate missing values if possible
    let calculatedOccupiedUnits = occupiedUnits;
    let calculatedOccupancyRate = occupancyRate;

    if (!occupiedUnits && totalUnits && occupancyRate) {
      calculatedOccupiedUnits = Math.round((totalUnits * occupancyRate) / 100);
    }

    if (!occupancyRate && totalUnits && occupiedUnits) {
      calculatedOccupancyRate = (occupiedUnits / totalUnits) * 100;
    }

    if (!netIncome && monthlyRevenue && expenses) {
      netIncome = monthlyRevenue - expenses;
    }

    return {
      propertyName: propertyName.trim(),
      address: address ? address.trim() : '',
      monthlyRevenue: monthlyRevenue || 0,
      occupancyRate: calculatedOccupancyRate || 0,
      totalUnits: totalUnits || 0,
      occupiedUnits: calculatedOccupiedUnits || 0,
      expenses: expenses || 0,
      netIncome: netIncome || 0,
      date: date
    };
  }

  // Extract string value from row
  extractString(row, possibleKeys) {
    for (const key of possibleKeys) {
      if (row[key] && row[key].toString().trim()) {
        return row[key].toString().trim();
      }
    }
    return null;
  }

  // Extract and parse number from row
  extractNumber(row, possibleKeys) {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        const value = row[key].toString().replace(/[,$]/g, ''); // Remove commas and dollar signs
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  // Extract and parse date from row
  extractDate(row, possibleKeys) {
    for (const key of possibleKeys) {
      if (row[key] && row[key].toString().trim()) {
        const dateStr = row[key].toString().trim();
        const parsedDate = moment(dateStr, ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM', 'MM/YYYY'], true);
        
        if (parsedDate.isValid()) {
          return parsedDate.format('YYYY-MM-DD');
        }
      }
    }
    return null;
  }

  // Validate CSV headers
  validateHeaders(headers) {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const requiredFields = ['property name', 'date'];
    
    const missingFields = requiredFields.filter(field => 
      !normalizedHeaders.some(header => 
        header.includes(field) || field.includes(header)
      )
    );

    return {
      isValid: missingFields.length === 0,
      missingFields: missingFields,
      detectedFields: normalizedHeaders
    };
  }

  // Detect duplicate data within the CSV
  detectDuplicates(data) {
    const seen = new Map();
    const duplicates = [];

    data.forEach((row, index) => {
      const key = `${row.propertyName}-${row.date}`;
      if (seen.has(key)) {
        duplicates.push({
          index: index,
          duplicateOf: seen.get(key),
          data: row
        });
      } else {
        seen.set(key, index);
      }
    });

    return duplicates;
  }

  // Clean and deduplicate data
  cleanData(data) {
    const cleaned = [];
    const seen = new Map();

    data.forEach(row => {
      const key = `${row.propertyName}-${row.date}`;
      if (!seen.has(key)) {
        cleaned.push(row);
        seen.set(key, true);
      }
    });

    return cleaned;
  }
}

module.exports = CSVProcessor;
