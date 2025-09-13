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
      let isMonthColumnFormat = false;
      let headers = [];
      let isFirstRow = true;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          try {
            // Check if this is the first row to determine format
            if (isFirstRow) {
              headers = Object.keys(data);
              isMonthColumnFormat = this.detectMonthColumnFormat(headers);
              // Format detection logging removed for production
              isFirstRow = false;
            }

            let processedRows;
            if (isMonthColumnFormat) {
              processedRows = this.processMonthColumnRow(data, defaultPropertyName, headers);
            } else {
              const processedRow = this.processRow(data, defaultPropertyName);
              processedRows = processedRow ? [processedRow] : null;
            }
            
            if (processedRows) {
              // Flatten the results since processMonthColumnRow returns an array
              results.push(...processedRows);
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
            invalidRows: errors.length,
            isMonthColumnFormat: isMonthColumnFormat
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

    // Debug logging removed for production

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
        const parsedDate = moment(dateStr, ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM', 'MM/YYYY', 'YYYY/MM/DD', 'DD-MM-YYYY'], true);
        
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
    console.log('🧹 Cleaning data:', {
      inputLength: data.length,
      sampleInput: data.slice(0, 2)
    });
    
    const cleaned = [];
    const seen = new Map();

    data.forEach((row, index) => {
      const key = `${row.propertyName}-${row.date}`;
      if (!seen.has(key)) {
        cleaned.push(row);
        seen.set(key, true);
      } else {
        // Only log first few duplicates to avoid spam
        if (index < 5) {
          console.log(`🔄 Duplicate found at index ${index}:`, key);
        }
      }
    });

    console.log('🧹 Cleaned data result:', {
      outputLength: cleaned.length,
      sampleOutput: cleaned.slice(0, 2)
    });

    return cleaned;
  }

  // Detect if CSV uses month columns format (e.g., "Aug 2024", "Sep 2024")
  detectMonthColumnFormat(headers) {
    const monthPatterns = [
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}$/i,
      /^\d{4}-(0[1-9]|1[0-2])$/,
      /^(0[1-9]|1[0-2])-\d{4}$/
    ];
    
    let monthColumns = 0;
    const matchedHeaders = [];
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      if (monthPatterns.some(pattern => pattern.test(normalizedHeader))) {
        monthColumns++;
        matchedHeaders.push(header);
      }
    });
    
    // Debug logging removed for production
    
    // If more than 3 columns look like months, assume it's month-column format
    return monthColumns >= 3;
  }

  // Process row from month-column format CSV
  processMonthColumnRow(row, defaultPropertyName, headers) {
    const results = [];
    const monthColumns = headers.filter(header => {
      const normalizedHeader = header.toLowerCase().trim();
      return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}$/i.test(normalizedHeader);
    });

    // Extract account/category name (first column)
    const accountName = this.extractString(row, ['Account Name', 'account name', 'account_name', 'category', 'description']);
    
    // Skip rows without account names or with empty account names
    if (!accountName || accountName.trim() === '') {
      return null;
    }

    // Skip only main section headers (not indented account rows)
    const trimmedName = accountName.trim();
    if (trimmedName === 'Operating Income & Expense' ||
        trimmedName === 'Income' ||
        trimmedName === 'Expense' ||
        trimmedName === 'GENERAL & ADMINISTRATIVE EXPENSE' ||
        trimmedName === 'FACILITY EXPENSE' ||
        trimmedName === 'GROUNDS LANDSCAPING EXPENSE' ||
        trimmedName === 'MAJOR REPAIR & REPLACEMENTS' ||
        trimmedName === 'Other Items') {
      return null;
    }

    // Process each month column
    monthColumns.forEach(monthHeader => {
      const value = this.extractNumber(row, [monthHeader]);
      if (value !== null && value !== 0) {
        const date = this.parseMonthHeader(monthHeader);
        if (date) {
          results.push({
            propertyName: defaultPropertyName || 'Unknown Property',
            address: '',
            monthlyRevenue: 0,
            occupancyRate: 0,
            totalUnits: 0,
            occupiedUnits: 0,
            expenses: 0,
            netIncome: 0,
            date: date,
            accountName: accountName,
            amount: value,
            month: monthHeader
          });
        }
      }
    });
    return results.length > 0 ? results : null;
  }

  // Parse month header like "Aug 2024" into YYYY-MM-DD format
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
        // Use the 15th of the month as a default date
        return `${year}-${monthNum}-15`;
      }
    }
    return null;
  }
}

module.exports = CSVProcessor;
