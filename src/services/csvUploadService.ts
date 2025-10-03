import { localStorageService, LocalCSVData } from './localStorageService';

export interface UploadResult {
  success: boolean;
  data?: LocalCSVData;
  error?: string;
  validationErrors?: string[];
}

export interface FileValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedType: 'balance_sheet' | 'rent_roll' | 'cash_flow';
  previewData: any[];
}

class CSVUploadService {
  
  // Validate CSV file before upload
  async validateFile(file: File, delimiter: string = ','): Promise<FileValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // File size check
      if (file.size > 50 * 10204 * 1024) { // 50MB
        errors.push('File size exceeds 50MB limit');
      }

      // Read and parse CSV
      const content = await this.readFileContent(file);
      const previewData = localStorageService.parseCSVContent(content, delimiter);
      
      if (previewData.length === 0) {
        errors.push('CSV file appears to be empty or malformed');
      }

      // Detect file type
      const detectedType = localStorageService.detectFileType(previewData);
      
      // Type-specific validation
      if (detectedType === 'balance_sheet') {
        this.validateBalanceSheet(previewData, errors, warnings);
      } else if (detectedType === 'rent_roll') {
        this.validateRentRoll(previewData, errors, warnings);
      } else if (detectedType === 'cash_flow') {
        this.validateCashFlow(previewData, errors, warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        detectedType,
        previewData: previewData.slice(0, 10) // Return first 10 rows for preview
      };

    } catch (error) {
      errors.push(`Failed to validate file: ${error}`);
      return {
        isValid: false,
        errors,
        warnings,
        detectedType: 'balance_sheet',
        previewData: []
      };
    }
  }

  // Upload CSV file to local storage
  async uploadFile(
    file: File, 
    propertyName?: string,
    customBucketAssignments?: { [key: string]: string }
  ): Promise<UploadResult> {
    try {
      // First validate the file
      const validation = await this.validateFile(file);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: 'File validation failed',
          validationErrors: validation.errors
        };
      }

      // Read full file content
      const content = await this.readFileContent(file);
      const fullData = localStorageService.parseCSVContent(content);

      // Generate unique ID
      const id = `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create CSV data object
      const csvData: LocalCSVData = {
        id,
        filename: file.name,
        data: fullData,
        metadata: {
          uploadedAt: new Date(),
          fileType: validation.detectedType,
          propertyName: propertyName || 'Unknown Property',
          lastModified: new Date()
        },
        preferences: {
          bucketAssignments: customBucketAssignments || this.getDefaultBucketAssignments(validation.detectedType),
          customMappings: {}
        }
      };

      // Save to local storage
      localStorageService.saveCSVData(csvData);

      return {
        success: true,
        data: csvData
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: `Upload failed: ${error}`
      };
    }
  }

  // Read file content as string
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  }

  // Get default bucket assignments based on file type
  private getDefaultBucketAssignments(fileType: string): { [key: string]: string } {
    const defaults: { [key: string]: { [key: string]: string } } = {
      balance_sheet: {
        'Account Name': 'Account',
        'Balance': 'Amount',
        'Assets': 'Assets',
        'Cash': 'Current Assets',
        'Liabilities': 'Liabilities',
        'Capital': 'Equity'
      },
      rent_roll: {
        'Unit': 'Property Information',
        'Tenant': 'Tenant Information', 
        'Market Rent': 'Revenue',
        'Rent': 'Revenue',
        'Status': 'Tenant Status',
        'Past Due': 'Receivables'
      },
      cash_flow: {
        'Account Name': 'Account',
        'Income': 'Revenue',
        'Expense': 'Expenses',
        'Operating Income': 'Revenue',
        'Operating Expense': 'Expenses',
        'Total': 'Summary'
      }
    };

    return defaults[fileType] || defaults.balance_sheet;
  }

  // Validation methods for different file types
  private validateBalanceSheet(data: any[], errors: string[], warnings: string[]): void {
    const headers = Object.keys(data[0] || {});
    
    if (!headers.some(h => h.toLowerCase().includes('account'))) {
      errors.push('Balance sheet should contain an "Account" or "Account Name" column');
    }
    
    if (!headers.some(h => h.toLowerCase().includes('balance'))) {
      errors.push('Balance sheet should contain a "Balance" column');
    }

    // Check for numeric values in balance column
    const balanceCol = headers.find(h => h.toLowerCase().includes('balance'));
    if (balanceCol) {
      const hasNumericValues = data.some(row => {
        const value = row[balanceCol];
        return value && !isNaN(parseFloat(value.toString().replace(/[^0-9.-]/g, '')));
      });
      
      if (!hasNumericValues) {
        warnings.push('Balance column should contain numeric values');
      }
    }
  }

  private validateRentRoll(data: any[], errors: string[], warnings: string[]): void {
    const headers = Object.keys(data[0] || {});
    
    if (!headers.some(h => h.toLowerCase().includes('unit'))) {
      errors.push('Rent roll should contain a "Unit" column');
    }
    
    if (!headers.some(h => h.toLowerCase().includes('tenant'))) {
      warnings.push('Rent roll typically contains a "Tenant" column');
    }
    
    if (!headers.some(h => h.toLowerCase().includes('rent'))) {
      errors.push('Rent roll should contain a "Rent" column');
    }
  }

  private validateCashFlow(data: any[], errors: string[], warnings: string[]): void {
    const headers = Object.keys(data[0] || {});
    
    if (!headers.some(h => h.toLowerCase().includes('account'))) {
      errors.push('Cash flow shouldcontain an "Account" or "Account Name" column');
    }

    // Check for month columns
    const monthHeaders = headers.filter(h => 
      h.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|month|2024|2025/i)
    );
    
    if (monthHeaders.length === 0) {
      warnings.push('Cash flow typically contains month or period columns');
    }
  }

  // Get all uploaded CSV files
  getAllFiles(): LocalCSVData[] {
    return localStorageService.getAllCSVData();
  }

  // Get file by ID
  getFileById(id: string): LocalCSVData | null {
    return localStorageService.getCSVDataById(id);
  }

  // Delete file
  deleteFile(id: string): boolean {
    try {
      localStorageService.deleteCSVData(id);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Update file preferences
  updateFilePreferences(id: string, preferences: { bucketAssignments?: { [key: string]: string }, customMappings?: { [key: string]: string } }): boolean {
    try {
      const file = localStorageService.getCSVDataById(id);
      if (!file) return false;

      file.preferences = {
        ...file.preferences,
        ...preferences
      };

      localStorageService.saveCSVData(file);
      return true;
    } catch (error) {
      console.error('Error updating file preferences:', error);
      return false;
    }
  }

  // Export CSV data
  exportToCSV(data: LocalCSVData): Blob {
    const csvContent = this.convertToCSVString(data.data);
    return new Blob([csvContent], { type: 'text/csv' });
  }

  private convertToCSVString(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        const stringValue = value.toString();
        // Escape commas and quotes
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }
}

export const csvUploadService = new CSVUploadService();

