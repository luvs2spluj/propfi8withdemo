/**
 * AI-Powered CSV Parser for Property Data
 * 
 * This module provides intelligent CSV header detection and categorization
 * using fuzzy logic to automatically assign CSV headers to predefined buckets.
 * Adapted from the Python CSV parser AI for integration into the React dashboard.
 */

export interface HeaderBucket {
  keywords: string[];
  description: string;
}

export interface HeaderMatch {
  originalHeader: string;
  suggestedBucket: string;
  confidenceScore: number;
  alternativeBuckets: Array<{
    bucket: string;
    score: number;
    matchedKeyword: string;
  }>;
}

export interface ParsedCSVResult {
  headers: string[];
  headerMatches: HeaderMatch[];
  bucketAssignments: Record<string, string[]>;
  confidenceScores: Record<string, number>;
  needsUserConfirmation: boolean;
  lowConfidenceHeaders: HeaderMatch[];
  parsedData: any[];
  format: 'month-column' | 'traditional';
  aiAnalysis: {
    propertyName: string;
    totalRecords: number;
    totalAmount: number;
    uniqueAccounts: number;
    categories: Record<string, number>;
    confidence: number;
    dateRange?: {
      start: string;
      end: string;
    };
    revenueAnalysis?: {
      total: number;
      average: number;
    };
    expenseAnalysis?: {
      total: number;
      average: number;
    };
    anomalies?: Array<{
      message: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
}

export class CSVHeaderDetector {
  private headerBuckets: Record<string, HeaderBucket>;

  constructor() {
    this.headerBuckets = this.initializeHeaderBuckets();
  }

  private initializeHeaderBuckets(): Record<string, HeaderBucket> {
    return {
      income: {
        keywords: [
          "income", "revenue", "rent", "rental", "cashflow", "cash flow",
          "gross income", "total income", "monthly income", "annual income",
          "rental income", "property income", "lease income", "tenant income",
          "application fee", "pet fee", "lock", "key", "insurance svcs income",
          "credit reporting services income", "short term"
        ],
        description: "Income and revenue related columns"
      },
      expenses: {
        keywords: [
          "expense", "cost", "maintenance", "repair", "utilities", "insurance",
          "property tax", "management fee", "legal fee", "advertising",
          "cleaning", "landscaping", "security", "trash", "water", "electric",
          "gas", "heating", "cooling", "hvac", "plumbing", "electrical",
          "damage", "carpet", "r & m", "paint", "appliances", "fire & alarm",
          "computers", "server", "phones", "it", "refuse disposal", "pest control"
        ],
        description: "Expense and cost related columns"
      },
      tenant_info: {
        keywords: [
          "tenant", "renter", "lease", "lease start", "lease end", "move in",
          "move out", "occupancy", "vacancy", "unit", "apartment", "suite",
          "tenant name", "contact", "phone", "email", "address", "resident"
        ],
        description: "Tenant and lease information"
      },
      financial_metrics: {
        keywords: [
          "net income", "net profit", "profit", "loss", "ebitda", "noi",
          "net operating income", "cap rate", "cash on cash", "roi",
          "return on investment", "yield", "margin", "profit margin"
        ],
        description: "Financial performance metrics"
      },
      property_details: {
        keywords: [
          "property", "building", "address", "location", "city", "state",
          "zip", "zipcode", "square feet", "sqft", "sq ft", "bedrooms",
          "bathrooms", "units", "floors", "year built", "property type"
        ],
        description: "Property and building details"
      },
      dates: {
        keywords: [
          "date", "month", "year", "quarter", "period", "jan", "feb", "mar",
          "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
          "january", "february", "march", "april", "may", "june", "july",
          "august", "september", "october", "november", "december", "q1", "q2", "q3", "q4"
        ],
        description: "Date and time period columns"
      },
      amounts: {
        keywords: [
          "amount", "value", "price", "rate", "fee", "deposit", "security deposit",
          "rent amount", "monthly rent", "annual rent", "total", "sum", "balance"
        ],
        description: "Monetary amounts and values"
      },
      status: {
        keywords: [
          "status", "active", "inactive", "occupied", "vacant", "available",
          "leased", "unleased", "paid", "unpaid", "current", "past due",
          "overdue", "collected", "outstanding"
        ],
        description: "Status and condition indicators"
      }
    };
  }

  private normalizeHeader(header: string): string {
    // Convert to lowercase
    let normalized = header.toLowerCase().trim();
    
    // Remove special characters and extra spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ');
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Handle common abbreviations and variations
    const replacements: Record<string, string> = {
      'sqft': 'square feet',
      'sq ft': 'square feet',
      'noi': 'net operating income',
      'roi': 'return on investment',
      'ebitda': 'earnings before interest taxes depreciation amortization'
    };
    
    for (const [abbrev, full] of Object.entries(replacements)) {
      normalized = normalized.replace(abbrev, full);
    }
    
    return normalized;
  }

  private extractDateInfo(header: string): {
    hasDate: boolean;
    months: string[];
    years: string[];
    isDateColumn: boolean;
  } {
    const headerLower = header.toLowerCase();
    
    // Month patterns
    const months: Record<string, string> = {
      'jan': 'january', 'feb': 'february', 'mar': 'march', 'apr': 'april',
      'may': 'may', 'jun': 'june', 'jul': 'july', 'aug': 'august',
      'sep': 'september', 'oct': 'october', 'nov': 'november', 'dec': 'december'
    };
    
    // Year patterns
    const yearPattern = /\b(19|20)\d{2}\b/;
    const years = header.match(yearPattern) ? [header.match(yearPattern)![0]] : [];
    
    // Month patterns
    const foundMonths: string[] = [];
    for (const [abbrev, full] of Object.entries(months)) {
      if (headerLower.includes(abbrev) || headerLower.includes(full)) {
        foundMonths.push(full);
      }
    }
    
    return {
      hasDate: foundMonths.length > 0 || years.length > 0,
      months: foundMonths,
      years,
      isDateColumn: foundMonths.length > 0 || years.length > 0
    };
  }

  private fuzzyMatch(text: string, keywords: string[]): { score: number; matchedKeyword: string } | null {
    let bestScore = 0;
    let bestMatch = '';
    
    for (const keyword of keywords) {
      const score = this.calculateSimilarity(text, keyword);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = keyword;
      }
    }
    
    return bestScore > 0 ? { score: bestScore, matchedKeyword: bestMatch } : null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation based on common characters and length
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - distance) / longer.length) * 100;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private matchHeaderToBucket(header: string, threshold: number = 60.0): {
    bucket: string;
    score: number;
    alternatives: Array<{ bucket: string; score: number; matchedKeyword: string }>;
  } {
    const normalizedHeader = this.normalizeHeader(header);
    
    // Check for date patterns first
    const dateInfo = this.extractDateInfo(header);
    if (dateInfo.isDateColumn) {
      return { bucket: "dates", score: 95.0, alternatives: [] };
    }
    
    let bestMatch = '';
    let bestScore = 0.0;
    const alternatives: Array<{ bucket: string; score: number; matchedKeyword: string }> = [];
    
    for (const [bucketName, bucketData] of Object.entries(this.headerBuckets)) {
      const matchResult = this.fuzzyMatch(normalizedHeader, bucketData.keywords);
      
      if (matchResult) {
        const score = matchResult.score;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = bucketName;
        }
        
        // Collect alternatives with scores above threshold
        if (score >= threshold) {
          alternatives.push({
            bucket: bucketName,
            score: score,
            matchedKeyword: matchResult.matchedKeyword
          });
        }
      }
    }
    
    // Sort alternatives by score
    alternatives.sort((a, b) => b.score - a.score);
    
    // Return best match if above threshold, otherwise return "unknown"
    if (bestScore >= threshold) {
      return {
        bucket: bestMatch,
        score: bestScore,
        alternatives: alternatives.filter(alt => alt.bucket !== bestMatch)
      };
    } else {
      return { bucket: "unknown", score: bestScore, alternatives };
    }
  }

  private parseAmount(value: string): number | null {
    if (!value || value === '—' || value.toLowerCase() === 'n/a') return null;
    
    let cleaned = value.replace(/\$/g, '').replace(/,/g, '');
    let neg = false;
    
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      neg = true;
      cleaned = cleaned.slice(1, -1);
    }
    
    const num = Number(cleaned);
    if (Number.isNaN(num)) return null;
    
    return neg ? -num : num;
  }

  private categorizeAccount(accountName: string): string {
    const name = accountName.toLowerCase().trim();
    
    // Revenue/Income accounts
    if (name.includes('rent') || name.includes('tenant') || name.includes('resident') ||
        name.includes('rental') || name.includes('short term') || name.includes('application fee') ||
        name.includes('pet fee') || name.includes('lock') || name.includes('key') ||
        name.includes('insurance svcs income') || name.includes('credit reporting services income')) {
      return 'income';
    }
    // Utilities accounts
    else if (name.includes('utility') || name.includes('utilities') || name.includes('water') || 
             name.includes('garbage') || name.includes('electric') || name.includes('gas') || 
             name.includes('sewer') || name.includes('refuse disposal') || name.includes('pest control')) {
      return 'utilities';
    }
    // Maintenance accounts
    else if (name.includes('maintenance') || name.includes('repair') || name.includes('cleaning') ||
             name.includes('damage') || name.includes('carpet') || name.includes('r & m') ||
             name.includes('hvac') || name.includes('plumbing') || name.includes('paint') ||
             name.includes('appliances') || name.includes('fire & alarm') || name.includes('computers') ||
             name.includes('server') || name.includes('phones') || name.includes('it')) {
      return 'maintenance';
    }
    // Insurance accounts
    else if (name.includes('insurance') || name.includes('liability') || name.includes('coverage')) {
      return 'insurance';
    }
    // Property tax accounts
    else if (name.includes('property tax') || name.includes('real property tax')) {
      return 'property_tax';
    }
    
    return 'other';
  }

  public parseCSVHeaders(csvData: string[][], propertyName: string = 'Unknown Property'): ParsedCSVResult {
    const headers = csvData[0] || [];
    const headerMatches: HeaderMatch[] = [];
    const bucketAssignments: Record<string, string[]> = {};
    const confidenceScores: Record<string, number> = {};
    
    // Analyze headers
    for (const header of headers) {
      const { bucket, score, alternatives } = this.matchHeaderToBucket(header);
      
      const headerMatch: HeaderMatch = {
        originalHeader: header,
        suggestedBucket: bucket,
        confidenceScore: score,
        alternativeBuckets: alternatives
      };
      
      headerMatches.push(headerMatch);
      
      // Group headers by bucket
      if (!bucketAssignments[bucket]) {
        bucketAssignments[bucket] = [];
      }
      bucketAssignments[bucket].push(header);
      
      confidenceScores[header] = score;
    }
    
    // Determine if user confirmation is needed
    const lowConfidenceHeaders = headerMatches.filter(match => match.confidenceScore < 70.0);
    const needsUserConfirmation = lowConfidenceHeaders.length > 0;
    
    // Detect format
    const monthColumns = headers.filter(header => {
      const normalizedHeader = header.toLowerCase().trim();
      return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}$/i.test(normalizedHeader);
    });
    
    const format = monthColumns.length >= 3 ? 'month-column' : 'traditional';
    
    // Process data for AI analysis
    const processedData = this.processCSVData(csvData, format, propertyName);
    const aiAnalysis = this.generateAIAnalysis(processedData, propertyName);
    
    return {
      headers,
      headerMatches,
      bucketAssignments,
      confidenceScores,
      needsUserConfirmation,
      lowConfidenceHeaders,
      parsedData: processedData,
      format,
      aiAnalysis
    };
  }

  private processCSVData(csvData: string[][], format: string, propertyName: string): any[] {
    const processedData: any[] = [];
    const accountNames = new Set<string>();
    
    for (let i = 1; i < csvData.length; i++) {
      const row = csvData[i];
      if (!row || row.length === 0) continue;
      
      const accountName = row[0]?.trim();
      
      // Skip section headers
      if (!accountName || /^(income|expense|totals?)$/i.test(accountName)) {
        continue;
      }
      
      accountNames.add(accountName);
      
      if (format === 'month-column') {
        // Process month columns
        const headers = csvData[0];
        const monthColumns = headers.filter(header => {
          const normalizedHeader = header.toLowerCase().trim();
          return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}$/i.test(normalizedHeader);
        });
        
        for (const monthCol of monthColumns) {
          const colIndex = headers.indexOf(monthCol);
          const rawValue = row[colIndex] || '';
          const amount = this.parseAmount(rawValue);
          
          if (amount !== null) {
            processedData.push({
              account_name: accountName,
              period: monthCol,
              amount: amount,
              amount_raw: rawValue,
              category: this.categorizeAccount(accountName)
            });
          }
        }
      } else {
        // Process traditional format
        const headers = csvData[0];
        const revenueIndex = headers.findIndex((h: string) => h.toLowerCase().includes('revenue'));
        const amount = revenueIndex >= 0 ? this.parseAmount(row[revenueIndex]) : 0;
        
        processedData.push({
          account_name: accountName,
          period: '2024-01',
          amount: amount,
          amount_raw: row[revenueIndex] || '',
          category: this.categorizeAccount(accountName)
        });
      }
    }
    
    return processedData;
  }

  private generateAIAnalysis(processedData: any[], propertyName: string): ParsedCSVResult['aiAnalysis'] {
    const totalRecords = processedData.length;
    const totalAmount = processedData.reduce((sum, row) => sum + (row.amount || 0), 0);
    const uniqueAccounts = new Set(processedData.map(row => row.account_name)).size;
    
    // Calculate categories
    const categories: Record<string, number> = {};
    processedData.forEach(row => {
      const category = row.category || 'other';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    // Calculate revenue and expense analysis
    const incomeData = processedData.filter(row => row.category === 'income');
    const expenseData = processedData.filter(row => ['utilities', 'maintenance', 'insurance', 'property_tax'].includes(row.category));
    
    const revenueAnalysis = incomeData.length > 0 ? {
      total: incomeData.reduce((sum, row) => sum + (row.amount || 0), 0),
      average: incomeData.reduce((sum, row) => sum + (row.amount || 0), 0) / incomeData.length
    } : undefined;
    
    const expenseAnalysis = expenseData.length > 0 ? {
      total: expenseData.reduce((sum, row) => sum + (row.amount || 0), 0),
      average: expenseData.reduce((sum, row) => sum + (row.amount || 0), 0) / expenseData.length
    } : undefined;
    
    // Detect anomalies
    const anomalies: Array<{ message: string; severity: 'low' | 'medium' | 'high' }> = [];
    
    if (totalAmount < 0) {
      anomalies.push({
        message: 'Negative total amount detected',
        severity: 'high'
      });
    }
    
    if (totalRecords === 0) {
      anomalies.push({
        message: 'No valid data records found',
        severity: 'high'
      });
    }
    
    return {
      propertyName,
      totalRecords,
      totalAmount,
      uniqueAccounts,
      categories,
      confidence: 0.85,
      revenueAnalysis,
      expenseAnalysis,
      anomalies
    };
  }

  public getBucketDescription(bucketName: string): string {
    return this.headerBuckets[bucketName]?.description || "Unknown bucket";
  }

  public addCustomBucket(bucketName: string, keywords: string[], description: string = ""): void {
    this.headerBuckets[bucketName] = {
      keywords,
      description
    };
  }
}

// Export a default instance
export const csvHeaderDetector = new CSVHeaderDetector();
