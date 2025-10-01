import Papa from 'papaparse';

export interface ParsedCSV {
  rows: any[];
  fields: string[];
  totalRows: number;
  errors: any[];
}

// Parse CSV with streaming support for large files
export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    let fields: string[] = [];
    let totalRows = 0;
    const errors: any[] = [];

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true,
      step: (result, parser) => {
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        }
        
        if (result.data) {
          rows.push(result.data);
          totalRows++;
          
          // For very large files, we might want to limit the in-memory rows
          // and process in chunks. For now, we'll keep all rows in memory.
        }
      },
      complete: (result) => {
        fields = result.meta?.fields ?? Object.keys(rows[0] || {});
        resolve({ 
          rows, 
          fields, 
          totalRows,
          errors: [...errors, ...(result.errors || [])]
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

// Parse CSV with row limit for sampling
export function parseCSVSample(file: File, maxRows: number = 1000): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    let fields: string[] = [];
    let totalRows = 0;
    const errors: any[] = [];

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true,
      step: (result, parser) => {
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        }
        
        if (result.data && rows.length < maxRows) {
          rows.push(result.data);
          totalRows++;
        } else if (rows.length >= maxRows) {
          // Stop parsing once we reach the limit
          parser.abort();
        }
      },
      complete: (result) => {
        fields = result.meta?.fields ?? Object.keys(rows[0] || {});
        resolve({ 
          rows, 
          fields, 
          totalRows,
          errors: [...errors, ...(result.errors || [])]
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

// Parse CSV with streaming callback for very large files
export function parseCSVStream(
  file: File, 
  onChunk: (chunk: any[], fields: string[]) => void,
  chunkSize: number = 1000
): Promise<{ fields: string[]; totalRows: number; errors: any[] }> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    let fields: string[] = [];
    let totalRows = 0;
    const errors: any[] = [];

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true,
      step: (result, parser) => {
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        }
        
        if (result.data) {
          chunks.push(result.data);
          totalRows++;
          
          // Process chunk when it reaches the specified size
          if (chunks.length >= chunkSize) {
            onChunk(chunks, fields);
            chunks.length = 0; // Clear the array
          }
        }
      },
      complete: (result) => {
        // Process remaining chunks
        if (chunks.length > 0) {
          onChunk(chunks, fields);
        }
        
        fields = result.meta?.fields ?? Object.keys(chunks[0] || {});
        resolve({ 
          fields, 
          totalRows,
          errors: [...errors, ...(result.errors || [])]
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

// Utility to detect CSV structure and types
export function analyzeCSVStructure(rows: any[]): {
  fieldTypes: Record<string, string>;
  fieldStats: Record<string, { min?: any; max?: any; unique: number; nulls: number }>;
} {
  if (rows.length === 0) {
    return { fieldTypes: {}, fieldStats: {} };
  }

  const fields = Object.keys(rows[0]);
  const fieldTypes: Record<string, string> = {};
  const fieldStats: Record<string, { min?: any; max?: any; unique: number; nulls: number }> = {};

  fields.forEach(field => {
    const values = rows.map(row => row[field]).filter(val => val !== null && val !== undefined);
    const uniqueValues = new Set(values);
    
    // Determine type
    if (values.length === 0) {
      fieldTypes[field] = 'empty';
    } else if (values.every(val => typeof val === 'number')) {
      fieldTypes[field] = 'number';
    } else if (values.every(val => !isNaN(Date.parse(val)))) {
      fieldTypes[field] = 'date';
    } else {
      fieldTypes[field] = 'string';
    }

    // Calculate stats
    fieldStats[field] = {
      unique: uniqueValues.size,
      nulls: rows.length - values.length
    };

    if (fieldTypes[field] === 'number' && values.length > 0) {
      fieldStats[field].min = Math.min(...values);
      fieldStats[field].max = Math.max(...values);
    }
  });

  return { fieldTypes, fieldStats };
}
