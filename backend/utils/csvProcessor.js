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
  async parseCSV(filePath, defaultPropertyName = null) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          try {
            const processedRow = this.processRow(data, defaultPropertyName);
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

  // Process individual CSV row with enhanced flexibility
  processRow(row, defaultPropertyName = null) {
    // Normalize column names (case insensitive, trim whitespace)
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = key.toLowerCase().trim();
      normalizedRow[normalizedKey] = row[key];
    });

    // Extract and validate data with enhanced field mapping
    const propertyName = this.extractString(normalizedRow, ['property name', 'property_name', 'property', 'building', 'site']) || defaultPropertyName;
    const address = this.extractString(normalizedRow, ['address', 'property_address', 'location']);
    const monthlyRevenue = this.extractNumber(normalizedRow, ['monthly revenue', 'monthly_revenue', 'revenue', 'income', 'rental income', 'gross revenue']);
    const occupancyRate = this.extractNumber(normalizedRow, ['occupancy rate', 'occupancy_rate', 'occupancy', 'occupancy %', 'occupancy_percent']);
    const totalUnits = this.extractNumber(normalizedRow, ['total units', 'total_units', 'units', 'total_apartments', 'apartments']);
    const occupiedUnits = this.extractNumber(normalizedRow, ['occupied units', 'occupied_units', 'occupied', 'rented units', 'rented']);
    const expenses = this.extractNumber(normalizedRow, ['expenses', 'expense', 'costs', 'total expenses', 'operating expenses']);
    const netIncome = this.extractNumber(normalizedRow, ['net income', 'net_income', 'profit', 'net profit', 'net_operating_income']);
    const date = this.extractDate(normalizedRow, ['date', 'data_date', 'month', 'period', 'reporting_date', 'period_end']);

    // Enhanced validation with better error messages
    if (!propertyName) {
      throw new Error('Property name is required. Either include it in the CSV or select a property before uploading.');
    }

    if (!date) {
      throw new Error('Date is required. Please include a date column (e.g., "Date", "Month", "Period").');
    }

    // Validate data ranges for 26-unit building context
    if (monthlyRevenue && (monthlyRevenue < 1000 || monthlyRevenue > 100000)) {
      throw new Error(`Revenue $${monthlyRevenue} seems unrealistic for a 26-unit building. Expected range: $1,000 - $100,000`);
    }

    if (occupancyRate && (occupancyRate < 0 || occupancyRate > 100)) {
      throw new Error(`Invalid occupancy rate: ${occupancyRate}%. Must be between 0-100%.`);
    }

    if (totalUnits && (totalUnits < 1 || totalUnits > 100)) {
      throw new Error(`Invalid total units: ${totalUnits}. Expected range: 1-100 units.`);
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
