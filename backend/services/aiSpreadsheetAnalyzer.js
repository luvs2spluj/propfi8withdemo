// AI-Powered Spreadsheet Analyzer for Horton Properties Dashboard
// Automatically recognizes data patterns and categorizes CSV content

class AISpreadsheetAnalyzer {
  constructor() {
    this.dataPatterns = {
      // Revenue patterns
      revenue: {
        keywords: ['rent', 'revenue', 'income', 'tenant', 'resident', 'lease', 'rental', 'gross income', 'rental income'],
        patterns: [/rent/i, /revenue/i, /income/i, /tenant/i, /resident/i, /lease/i],
        category: 'revenue',
        confidence: 0.9
      },
      
      // Maintenance patterns
      maintenance: {
        keywords: ['maintenance', 'repair', 'cleaning', 'damage', 'carpet', 'lock', 'key', 'plumbing', 'electrical', 'hvac'],
        patterns: [/maintenance/i, /repair/i, /cleaning/i, /damage/i, /carpet/i, /lock/i, /key/i, /plumbing/i, /electrical/i, /hvac/i],
        category: 'maintenance_cost',
        confidence: 0.85
      },
      
      // Utilities patterns
      utilities: {
        keywords: ['utility', 'water', 'garbage', 'electric', 'gas', 'sewer', 'trash', 'electricity', 'power'],
        patterns: [/utility/i, /water/i, /garbage/i, /electric/i, /gas/i, /sewer/i, /trash/i, /electricity/i, /power/i],
        category: 'utilities_cost',
        confidence: 0.9
      },
      
      // Insurance patterns
      insurance: {
        keywords: ['insurance', 'liability', 'coverage', 'policy', 'premium', 'claim'],
        patterns: [/insurance/i, /liability/i, /coverage/i, /policy/i, /premium/i, /claim/i],
        category: 'insurance_cost',
        confidence: 0.95
      },
      
      // Property tax patterns
      propertyTax: {
        keywords: ['tax', 'property tax', 'assessment', 'property assessment', 'real estate tax'],
        patterns: [/tax/i, /assessment/i, /property tax/i, /real estate tax/i],
        category: 'property_tax',
        confidence: 0.9
      },
      
      // Management patterns
      management: {
        keywords: ['management', 'admin', 'salary', 'wage', 'fee', 'concession', 'late fee', 'application', 'pet'],
        patterns: [/management/i, /admin/i, /salary/i, /wage/i, /fee/i, /concession/i, /late fee/i, /application/i, /pet/i],
        category: 'other_expenses',
        confidence: 0.8
      }
    };

    this.datePatterns = [
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}$/i,
      /^\d{4}-(0[1-9]|1[0-2])$/,
      /^(0[1-9]|1[0-2])-\d{4}$/,
      /^\d{4}\/\d{2}$/,
      /^\d{2}\/\d{4}$/
    ];

    this.numberPatterns = [
      /^\$?[\d,]+\.?\d*$/,
      /^\d+\.\d{2}$/,
      /^\d+$/
    ];
  }

  // Main analysis function
  async analyzeCSV(csvData, filename = 'unknown') {
    try {
      const analysis = {
        filename,
        timestamp: new Date().toISOString(),
        format: this.detectFormat(csvData),
        structure: this.analyzeStructure(csvData),
        dataQuality: this.assessDataQuality(csvData),
        categorization: this.categorizeData(csvData),
        recommendations: [],
        confidence: 0
      };

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);
      
      // Calculate overall confidence
      analysis.confidence = this.calculateConfidence(analysis);

      return analysis;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  // Detect CSV format (traditional vs month-column)
  detectFormat(csvData) {
    if (!csvData || csvData.length === 0) {
      return { type: 'unknown', confidence: 0 };
    }

    const headers = Object.keys(csvData[0]);
    const monthColumns = headers.filter(header => 
      this.datePatterns.some(pattern => pattern.test(header.toLowerCase().trim()))
    );

    if (monthColumns.length >= 3) {
      return {
        type: 'month_column',
        confidence: 0.95,
        monthColumns: monthColumns,
        description: 'Data organized with months as columns and accounts as rows'
      };
    } else {
      return {
        type: 'traditional',
        confidence: 0.9,
        description: 'Data organized with each row representing a time period'
      };
    }
  }

  // Analyze data structure
  analyzeStructure(csvData) {
    if (!csvData || csvData.length === 0) {
      return { columns: 0, rows: 0, structure: 'empty' };
    }

    const headers = Object.keys(csvData[0]);
    const structure = {
      columns: headers.length,
      rows: csvData.length,
      headers: headers,
      dataTypes: this.inferDataTypes(csvData),
      structure: this.classifyStructure(csvData)
    };

    return structure;
  }

  // Infer data types for each column
  inferDataTypes(csvData) {
    const headers = Object.keys(csvData[0]);
    const dataTypes = {};

    headers.forEach(header => {
      const values = csvData.slice(0, Math.min(10, csvData.length)).map(row => row[header]);
      dataTypes[header] = this.classifyColumnType(values, header);
    });

    return dataTypes;
  }

  // Classify individual column type
  classifyColumnType(values, headerName) {
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    if (nonEmptyValues.length === 0) {
      return { type: 'empty', confidence: 1.0 };
    }

    // Check for date patterns
    if (this.datePatterns.some(pattern => pattern.test(headerName.toLowerCase()))) {
      return { type: 'date', confidence: 0.95 };
    }

    // Check for numeric patterns
    const numericCount = nonEmptyValues.filter(v => 
      this.numberPatterns.some(pattern => pattern.test(String(v).trim()))
    ).length;

    const numericRatio = numericCount / nonEmptyValues.length;

    if (numericRatio > 0.8) {
      return { type: 'numeric', confidence: numericRatio };
    }

    // Check for text patterns
    if (numericRatio < 0.2) {
      return { type: 'text', confidence: 1 - numericRatio };
    }

    return { type: 'mixed', confidence: 0.5 };
  }

  // Classify overall structure
  classifyStructure(csvData) {
    const headers = Object.keys(csvData[0]);
    const dataTypes = this.inferDataTypes(csvData);

    // Count different data types
    const typeCounts = {};
    Object.values(dataTypes).forEach(type => {
      typeCounts[type.type] = (typeCounts[type.type] || 0) + 1;
    });

    if (typeCounts.date > 3) {
      return 'financial_report'; // Month columns format
    } else if (typeCounts.numeric > headers.length * 0.6) {
      return 'financial_data'; // Traditional format
    } else if (typeCounts.text > headers.length * 0.5) {
      return 'descriptive_data';
    } else {
      return 'mixed_data';
    }
  }

  // Assess data quality
  assessDataQuality(csvData) {
    if (!csvData || csvData.length === 0) {
      return { score: 0, issues: ['No data provided'] };
    }

    const issues = [];
    let score = 100;

    // Check for empty rows
    const emptyRows = csvData.filter(row => 
      Object.values(row).every(value => !value || value.toString().trim() === '')
    );
    
    if (emptyRows.length > 0) {
      issues.push(`${emptyRows.length} empty rows found`);
      score -= emptyRows.length * 5;
    }

    // Check for missing values
    const headers = Object.keys(csvData[0]);
    headers.forEach(header => {
      const missingCount = csvData.filter(row => !row[header] || row[header].toString().trim() === '').length;
      if (missingCount > csvData.length * 0.5) {
        issues.push(`Column '${header}' has ${missingCount} missing values`);
        score -= 10;
      }
    });

    // Check for data consistency
    const dataTypes = this.inferDataTypes(csvData);
    Object.entries(dataTypes).forEach(([header, type]) => {
      if (type.confidence < 0.7) {
        issues.push(`Column '${header}' has inconsistent data types`);
        score -= 5;
      }
    });

    return {
      score: Math.max(0, score),
      issues: issues,
      totalRows: csvData.length,
      emptyRows: emptyRows.length,
      quality: score > 80 ? 'high' : score > 60 ? 'medium' : 'low'
    };
  }

  // Categorize data using AI patterns
  categorizeData(csvData) {
    if (!csvData || csvData.length === 0) {
      return { categories: [], confidence: 0 };
    }

    const headers = Object.keys(csvData[0]);
    const categories = [];

    headers.forEach(header => {
      const category = this.categorizeColumn(header);
      if (category.confidence > 0.5) {
        categories.push({
          column: header,
          category: category.category,
          confidence: category.confidence,
          keywords: category.keywords,
          description: category.description
        });
      }
    });

    return {
      categories: categories,
      confidence: categories.length > 0 ? 
        categories.reduce((sum, cat) => sum + cat.confidence, 0) / categories.length : 0
    };
  }

  // Categorize individual column
  categorizeColumn(columnName) {
    const name = columnName.toLowerCase().trim();
    
    // Check against all patterns
    for (const [categoryName, pattern] of Object.entries(this.dataPatterns)) {
      const keywordMatch = pattern.keywords.some(keyword => name.includes(keyword));
      const regexMatch = pattern.patterns.some(regex => regex.test(name));
      
      if (keywordMatch || regexMatch) {
        return {
          category: pattern.category,
          confidence: pattern.confidence,
          keywords: pattern.keywords.filter(k => name.includes(k)),
          description: this.getCategoryDescription(pattern.category)
        };
      }
    }

    // Default categorization
    return {
      category: 'other_expenses',
      confidence: 0.3,
      keywords: [],
      description: 'Uncategorized expense'
    };
  }

  // Get category description
  getCategoryDescription(category) {
    const descriptions = {
      'revenue': 'Income from rental operations',
      'maintenance_cost': 'Property maintenance and repairs',
      'utilities_cost': 'Utility expenses (water, electric, gas)',
      'insurance_cost': 'Insurance premiums and coverage',
      'property_tax': 'Property taxes and assessments',
      'other_expenses': 'Administrative and other operating expenses'
    };
    return descriptions[category] || 'Uncategorized expense';
  }

  // Generate recommendations
  generateRecommendations(analysis) {
    const recommendations = [];

    // Data quality recommendations
    if (analysis.dataQuality.score < 80) {
      recommendations.push({
        type: 'data_quality',
        priority: 'high',
        message: `Data quality score is ${analysis.dataQuality.score}. Consider cleaning the data before processing.`,
        actions: analysis.dataQuality.issues
      });
    }

    // Format recommendations
    if (analysis.format.type === 'month_column') {
      recommendations.push({
        type: 'format',
        priority: 'medium',
        message: 'Detected month-column format. This will be processed as individual month/account combinations.',
        actions: ['Data will be automatically categorized by account type', 'Each month will create separate database entries']
      });
    }

    // Categorization recommendations
    const uncategorized = analysis.categorization.categories.filter(cat => cat.confidence < 0.7);
    if (uncategorized.length > 0) {
      recommendations.push({
        type: 'categorization',
        priority: 'medium',
        message: `${uncategorized.length} columns have low categorization confidence.`,
        actions: uncategorized.map(cat => `Review column '${cat.column}' - currently categorized as ${cat.category}`)
      });
    }

    return recommendations;
  }

  // Calculate overall confidence
  calculateConfidence(analysis) {
    let confidence = 0;
    let factors = 0;

    // Format confidence
    if (analysis.format.confidence) {
      confidence += analysis.format.confidence * 0.3;
      factors += 0.3;
    }

    // Data quality confidence
    const qualityConfidence = analysis.dataQuality.score / 100;
    confidence += qualityConfidence * 0.3;
    factors += 0.3;

    // Categorization confidence
    if (analysis.categorization.confidence) {
      confidence += analysis.categorization.confidence * 0.4;
      factors += 0.4;
    }

    return factors > 0 ? confidence / factors : 0;
  }

  // Generate processing plan
  generateProcessingPlan(analysis) {
    const plan = {
      steps: [],
      estimatedRecords: 0,
      processingTime: 'unknown'
    };

    if (analysis.format.type === 'month_column') {
      const monthColumns = analysis.format.monthColumns || [];
      const accountRows = analysis.structure.rows;
      plan.estimatedRecords = monthColumns.length * accountRows;
      plan.steps = [
        'Parse month columns into dates',
        'Extract account names from rows',
        'Categorize accounts automatically',
        'Create database entries for each month/account combination',
        'Apply data quality filters'
      ];
    } else {
      plan.estimatedRecords = analysis.structure.rows;
      plan.steps = [
        'Parse traditional CSV format',
        'Validate data types',
        'Apply categorization rules',
        'Create database entries',
        'Apply data quality filters'
      ];
    }

    return plan;
  }
}

module.exports = AISpreadsheetAnalyzer;
