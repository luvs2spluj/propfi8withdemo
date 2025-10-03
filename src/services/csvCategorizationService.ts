// CSV Categorization Service
// This service analyzes CSV files against uploaded templates to categorize them

import { indexedDBService, NotebookTemplate, CategorizedCSV } from './indexedDBService';

export interface CategorizationResult {
  detectedType: string;
  confidence: number;
  templateId: string;
  matchedFields: string[];
  missingFields: string[];
  extraFields: string[];
  suggestions: string[];
}

export interface CSVAnalysis {
  headers: string[];
  sampleRows: Record<string, any>[];
  dataTypes: Record<string, string>;
  fieldPatterns: Record<string, string[]>;
}

class CSVCategorizationService {
  
  // Analyze CSV structure
  private analyzeCSV(csvData: Record<string, any>[]): CSVAnalysis {
    if (csvData.length === 0) {
      return {
        headers: [],
        sampleRows: [],
        dataTypes: {},
        fieldPatterns: {}
      };
    }

    const headers = Object.keys(csvData[0]);
    const sampleRows = csvData.slice(0, 5); // First 5 rows for analysis
    
    // Analyze data types
    const dataTypes: Record<string, string> = {};
    const fieldPatterns: Record<string, string[]> = {};
    
    headers.forEach(header => {
      const values = sampleRows.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
      
      if (values.length === 0) {
        dataTypes[header] = 'empty';
        fieldPatterns[header] = [];
        return;
      }
      
      // Detect data type
      const firstValue = values[0];
      if (typeof firstValue === 'number') {
        dataTypes[header] = 'number';
      } else if (typeof firstValue === 'string') {
        // Check if it's a date
        if (this.isDateString(firstValue)) {
          dataTypes[header] = 'date';
        }
        // Check if it's a currency
        else if (this.isCurrencyString(firstValue)) {
          dataTypes[header] = 'currency';
        }
        // Check if it's a percentage
        else if (this.isPercentageString(firstValue)) {
          dataTypes[header] = 'percentage';
        }
        else {
          dataTypes[header] = 'text';
        }
      } else {
        dataTypes[header] = 'unknown';
      }
      
      // Extract patterns
      fieldPatterns[header] = this.extractFieldPatterns(values.slice(0, 3));
    });

    return {
      headers,
      sampleRows,
      dataTypes,
      fieldPatterns
    };
  }

  // Helper methods for data type detection
  private isDateString(value: string): boolean {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    ];
    return datePatterns.some(pattern => pattern.test(value));
  }

  private isCurrencyString(value: string): boolean {
    const currencyPatterns = [
      /^\$[\d,]+\.?\d*$/, // $1,234.56
      /^[\d,]+\.?\d*\s*USD$/, // 1,234.56 USD
      /^[\d,]+\.?\d*\s*\$/, // 1,234.56 $
    ];
    return currencyPatterns.some(pattern => pattern.test(value));
  }

  private isPercentageString(value: string): boolean {
    return /^\d+\.?\d*\s*%$/.test(value);
  }

  private extractFieldPatterns(values: any[]): string[] {
    const patterns: string[] = [];
    
    values.forEach(value => {
      if (typeof value === 'string') {
        // Check for common patterns
        if (value.toLowerCase().includes('total')) patterns.push('total');
        if (value.toLowerCase().includes('subtotal')) patterns.push('subtotal');
        if (value.toLowerCase().includes('net')) patterns.push('net');
        if (value.toLowerCase().includes('gross')) patterns.push('gross');
        if (value.toLowerCase().includes('revenue')) patterns.push('revenue');
        if (value.toLowerCase().includes('expense')) patterns.push('expense');
        if (value.toLowerCase().includes('income')) patterns.push('income');
        if (value.toLowerCase().includes('asset')) patterns.push('asset');
        if (value.toLowerCase().includes('liability')) patterns.push('liability');
        if (value.toLowerCase().includes('equity')) patterns.push('equity');
        if (value.toLowerCase().includes('rent')) patterns.push('rent');
        if (value.toLowerCase().includes('occupancy')) patterns.push('occupancy');
        if (value.toLowerCase().includes('unit')) patterns.push('unit');
        if (value.toLowerCase().includes('property')) patterns.push('property');
      }
    });
    
    return [...new Set(patterns)]; // Remove duplicates
  }

  // Calculate similarity between CSV and template
  private calculateSimilarity(csvAnalysis: CSVAnalysis, template: NotebookTemplate): CategorizationResult {
    const csvHeaders = csvAnalysis.headers.map(h => h.toLowerCase());
    const templateHeaders = template.headers.map(h => h.toLowerCase());
    
    // Find exact matches
    const exactMatches = csvHeaders.filter(header => 
      templateHeaders.some(templateHeader => 
        header === templateHeader || 
        header.includes(templateHeader) || 
        templateHeader.includes(header)
      )
    );
    
    // Find partial matches (fuzzy matching)
    const partialMatches = csvHeaders.filter(header => 
      templateHeaders.some(templateHeader => 
        this.calculateStringSimilarity(header, templateHeader) > 0.6
      )
    );
    
    // Calculate confidence based on matches
    const requiredMatches = template.requiredFields.length;
    const actualMatches = exactMatches.length;
    const confidence = Math.min(actualMatches / requiredMatches, 1.0);
    
    // Find missing required fields
    const missingFields = template.requiredFields.filter(field => 
      !csvHeaders.some(header => 
        header === field.toLowerCase() || 
        header.includes(field.toLowerCase()) ||
        field.toLowerCase().includes(header)
      )
    );
    
    // Find extra fields not in template
    const extraFields = csvHeaders.filter(header => 
      !templateHeaders.some(templateHeader => 
        header === templateHeader || 
        header.includes(templateHeader) || 
        templateHeader.includes(header)
      )
    );
    
    // Generate suggestions
    const suggestions: string[] = [];
    if (missingFields.length > 0) {
      suggestions.push(`Missing required fields: ${missingFields.join(', ')}`);
    }
    if (extraFields.length > 0) {
      suggestions.push(`Extra fields detected: ${extraFields.join(', ')}`);
    }
    if (confidence < 0.8) {
      suggestions.push('Consider reviewing the template or CSV format');
    }
    
    return {
      detectedType: template.category,
      confidence,
      templateId: template.id,
      matchedFields: exactMatches,
      missingFields,
      extraFields,
      suggestions
    };
  }

  // Calculate string similarity using Levenshtein distance
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
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

  // Main categorization method
  async categorizeCSV(csvData: Record<string, any>[], filename: string): Promise<CategorizationResult | null> {
    try {
      // Initialize IndexedDB if needed
      await indexedDBService.init();
      
      // Get all available templates
      const templates = await indexedDBService.getAllTemplates();
      
      if (templates.length === 0) {
        console.warn('No templates available for categorization');
        return null;
      }
      
      // Analyze the CSV
      const csvAnalysis = this.analyzeCSV(csvData);
      
      // Test against each template and find the best match
      let bestMatch: CategorizationResult | null = null;
      let bestConfidence = 0;
      
      for (const template of templates) {
        const result = this.calculateSimilarity(csvAnalysis, template);
        
        if (result.confidence > bestConfidence) {
          bestConfidence = result.confidence;
          bestMatch = result;
        }
      }
      
      // Only return results with reasonable confidence
      if (bestMatch && bestMatch.confidence >= 0.3) {
        console.log(`📊 CSV categorized as ${bestMatch.detectedType} with ${(bestMatch.confidence * 100).toFixed(1)}% confidence`);
        return bestMatch;
      } else {
        console.warn(`⚠️ No suitable template found for ${filename}. Confidence: ${bestConfidence * 100}%`);
        return null;
      }
      
    } catch (error) {
      console.error('Error categorizing CSV:', error);
      return null;
    }
  }

  // Save categorized CSV
  async saveCategorizedCSV(
    csvData: Record<string, any>[], 
    filename: string, 
    categorization: CategorizationResult
  ): Promise<void> {
    const categorizedCSV: CategorizedCSV = {
      id: `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename,
      data: csvData,
      detectedType: categorization.detectedType,
      confidence: categorization.confidence,
      templateId: categorization.templateId,
      categorizedAt: new Date()
    };
    
    await indexedDBService.saveCategorizedCSV(categorizedCSV);
    console.log(`✅ CSV saved: ${filename} as ${categorization.detectedType}`);
  }

  // Get categorization statistics
  async getCategorizationStats(): Promise<{
    totalCategorized: number;
    byType: Record<string, number>;
    averageConfidence: number;
    recentCategorizations: CategorizedCSV[];
  }> {
    const categorizedCSVs = await indexedDBService.getCategorizedCSVs();
    
    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    
    categorizedCSVs.forEach(csv => {
      byType[csv.detectedType] = (byType[csv.detectedType] || 0) + 1;
      totalConfidence += csv.confidence;
    });
    
    const averageConfidence = categorizedCSVs.length > 0 ? totalConfidence / categorizedCSVs.length : 0;
    
    // Get recent categorizations (last 10)
    const recentCategorizations = categorizedCSVs
      .sort((a, b) => b.categorizedAt.getTime() - a.categorizedAt.getTime())
      .slice(0, 10);
    
    return {
      totalCategorized: categorizedCSVs.length,
      byType,
      averageConfidence,
      recentCategorizations
    };
  }
}

export const csvCategorizationService = new CSVCategorizationService();
