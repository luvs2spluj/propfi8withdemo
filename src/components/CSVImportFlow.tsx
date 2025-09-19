import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import HeaderMapper, { FieldSuggestion } from "./HeaderMapper";
import { saveCSVData, getAILearning, saveAILearning } from "../lib/supabase";

const API = (process.env as any).REACT_APP_API_BASE || "http://localhost:5002";

type FileType = 'cash_flow' | 'balance_sheet' | 'rent_roll' | 'income_statement' | 'general';

// Dashboard Bucket Definitions
const DASHBOARD_BUCKETS = {
  // Revenue/Income Buckets
  'rental_income': {
    label: 'Rental Income',
    description: 'Primary rental revenue from tenants',
    color: 'bg-green-100 text-green-800',
    icon: '🏠',
    category: 'income'
  },
  'other_income': {
    label: 'Other Income',
    description: 'Additional income sources (fees, late charges, etc.)',
    color: 'bg-blue-100 text-blue-800',
    icon: '💰',
    category: 'income'
  },
  'total_income': {
    label: 'Total Income',
    description: 'Sum of all income sources',
    color: 'bg-emerald-100 text-emerald-800',
    icon: '📈',
    category: 'income'
  },
  'total_operating_income': {
    label: 'Total Operating Income',
    description: 'Primary income metric for dashboard',
    color: 'bg-green-100 text-green-800',
    icon: '💰',
    category: 'income'
  },
  
  // Expense Buckets
  'operating_expenses': {
    label: 'Operating Expenses',
    description: 'Day-to-day property operations',
    color: 'bg-orange-100 text-orange-800',
    icon: '⚙️',
    category: 'expense'
  },
  'maintenance_expenses': {
    label: 'Maintenance & Repairs',
    description: 'Property maintenance and repair costs',
    color: 'bg-red-100 text-red-800',
    icon: '🔧',
    category: 'expense'
  },
  'management_expenses': {
    label: 'Management Expenses',
    description: 'Property management and administrative costs',
    color: 'bg-purple-100 text-purple-800',
    icon: '👥',
    category: 'expense'
  },
  'total_expenses': {
    label: 'Total Expenses',
    description: 'Sum of all expense categories',
    color: 'bg-red-100 text-red-800',
    icon: '📉',
    category: 'expense'
  },
  'total_operating_expense': {
    label: 'Total Operating Expense',
    description: 'Primary expense metric for dashboard',
    color: 'bg-red-100 text-red-800',
    icon: '💸',
    category: 'expense'
  },
  
  // Net Income Buckets
  'net_operating_income': {
    label: 'Net Operating Income',
    description: 'Income minus operating expenses',
    color: 'bg-indigo-100 text-indigo-800',
    icon: '📊',
    category: 'net_income'
  },
  'net_income': {
    label: 'Net Income',
    description: 'Final profit after all expenses',
    color: 'bg-teal-100 text-teal-800',
    icon: '💎',
    category: 'net_income'
  },
  
  // Exclude Bucket
  'exclude': {
    label: 'Exclude from Dashboard',
    description: 'Do not include in dashboard calculations',
    color: 'bg-gray-100 text-gray-600',
    icon: '🚫',
    category: 'exclude'
  }
};

export default function CSVImportFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('general');
  const [headers, setHeaders] = useState<string[]>([]);
  const [samples, setSamples] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, FieldSuggestion>>({});
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCategories, setAccountCategories] = useState<Record<string, string>>({});
  const [aiLearningData, setAiLearningData] = useState<any>(null);
  const [categorizationSummary, setCategorizationSummary] = useState<any>(null);
  const [includedItems, setIncludedItems] = useState<Record<string, boolean>>({});
  const [bucketAssignments, setBucketAssignments] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  // Load AI learning data when file type changes
  useEffect(() => {
    const loadAILearning = async () => {
      if (fileType && fileType !== 'general') {
        console.log('🧠 Loading AI learning data for file type:', fileType);
        const learningData = await getAILearning(fileType);
        setAiLearningData(learningData);
        console.log('🧠 AI learning data loaded:', learningData);
      }
    };
    loadAILearning();
  }, [fileType]);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    setHasPreviewed(false);
    setSaved(false);
    
    // First try with preview to get headers quickly
    Papa.parse(f, {
      header: true,
      preview: 100, // Increased from 30 to 100 to capture more account line items
      complete: (r: any) => {
        const cols = r.meta.fields || [];
        const sampleRows = (r.data as any[]).slice(0, 5);
        setHeaders(cols);
        setSamples(sampleRows.map((row: any) => cols.map((c: string) => row[c])));
        
        // Auto-generate mapping based on file type
        const autoMap: Record<string, FieldSuggestion> = {};
        for (const col of cols) {
          const colLower = col.toLowerCase();
          if (/account|name|description|item/.test(colLower)) {
            // Skip account name columns - AI will handle them automatically
            autoMap[col] = { field: "", score: 1.0 };
          } else if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q1|q2|q3|q4|total/.test(colLower)) {
            // Auto-map time-series columns
            autoMap[col] = { field: "time_series", score: 0.9 };
          } else {
            // Default unmapped
            autoMap[col] = { field: "", score: 0 };
          }
        }
        setMap(autoMap);
        
        // Now parse the entire file to get all account line items
        Papa.parse(f, {
          header: true,
          complete: (fullR: any) => {
            const allRows = (fullR.data as any[]).filter(row => row && Object.keys(row).length > 0);
            console.log("Processing", allRows.length, "total rows from CSV");
            
            // Auto-categorize individual account line items based on names
            const accountCol = cols.find((col: string) => /account|name|description|item/.test(col.toLowerCase()));
            // Initialize empty categories - user will categorize manually in preview
            setAccountCategories({});
          }
        });
      }
    });
  };



  const updateAccountCategory = async (accountName: string, category: string) => {
    setAccountCategories(prev => ({
      ...prev,
      [accountName]: category
    }));
    
    // Send correction to AI backend for learning
    try {
      await fetch(`${API}/api/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_name: accountName,
          file_type: fileType,
          user_category: category
        })
      });
      console.log(`🧠 Learned correction: ${accountName} -> ${category}`);
    } catch (error) {
      console.warn("Failed to send correction to AI backend:", error);
    }
    
    // Also save to Supabase
    if (category !== 'uncategorized' && accountName) {
      saveAILearning(fileType, accountName, category);
    }
  };

  const updateBucketAssignment = (accountName: string, bucket: string) => {
    setBucketAssignments(prev => ({
      ...prev,
      [accountName]: bucket
    }));
    console.log(`🪣 Assigned ${accountName} to bucket: ${bucket}`);
  };

  const getSuggestedBucket = (accountName: string, aiCategory: string): string => {
    const name = accountName.toLowerCase();
    
    // Direct matches for key dashboard metrics
    if (name.includes('total operating income')) return 'total_operating_income';
    if (name.includes('noi') && name.includes('net operating income')) return 'net_operating_income';
    if (name.includes('total operating expense')) return 'total_operating_expense';
    
    // Fallback matches for similar terms
    if (name.includes('total income')) return 'total_operating_income';
    if (name.includes('total expense')) return 'total_operating_expense';
    if (name.includes('net operating income')) return 'net_operating_income';
    if (name.includes('net income')) return 'net_operating_income';
    
    // Income buckets
    if (aiCategory === 'income') {
      if (name.includes('rent') || name.includes('tenant') || name.includes('lease')) {
        return 'rental_income';
      }
      return 'other_income';
    }
    
    // Expense buckets
    if (aiCategory === 'expense') {
      if (name.includes('maintenance') || name.includes('repair') || name.includes('fix')) {
        return 'maintenance_expenses';
      }
      if (name.includes('management') || name.includes('admin') || name.includes('office')) {
        return 'management_expenses';
      }
      return 'operating_expenses';
    }
    
    // Default to exclude if uncertain
    return 'exclude';
  };

  const onChange = (orig: string, field: string) => 
    setMap(m => ({ ...m, [orig]: { field, score: 1 } }));

  const selectAllItems = () => {
    const allIncluded: Record<string, boolean> = {};
    preview.forEach((row: any) => {
      if (row.account_name) {
        allIncluded[row.account_name] = true;
      }
    });
    setIncludedItems(allIncluded);
  };

  const deselectAllItems = () => {
    const allExcluded: Record<string, boolean> = {};
    preview.forEach((row: any) => {
      if (row.account_name) {
        allExcluded[row.account_name] = false;
      }
    });
    setIncludedItems(allExcluded);
  };

  const selectByCategory = (category: string) => {
    setIncludedItems(prev => {
      const updated = { ...prev };
      Object.entries(accountCategories).forEach(([accountName, cat]) => {
        if (cat === category) {
          updated[accountName] = true;
        }
      });
      return updated;
    });
  };


  const previewImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setHasPreviewed(false);
    setSaved(false);
    
    try {
      // Parse CSV data first
      Papa.parse(file, {
        header: true,
        complete: async (result: any) => {
          const rawData = result.data as any[];
          console.log(`📊 Processing ${rawData.length} rows`);
          
          // Debug: Log sample raw data
          if (rawData.length > 0) {
            console.log(`🔍 Sample raw CSV row:`, rawData[0]);
            console.log(`🔍 Sample raw CSV row keys:`, Object.keys(rawData[0]));
          }
          
          // Process the data to create time series structure for dashboard
          const processedData = rawData.filter(row => Object.keys(row).length > 1).map((row: any, index: number) => {
            const processedRow: any = {};
            
            // Apply field mapping
            Object.entries(map).forEach(([originalField, suggestion]) => {
              if (row[originalField] !== undefined) {
                processedRow[suggestion.field] = row[originalField];
              }
            });
            
            // Find account name column
            const accountNameKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('account') || 
              key.toLowerCase().includes('name') ||
              key.toLowerCase().includes('description') ||
              key.toLowerCase().includes('item')
            ) || Object.keys(row)[0];
            
            const accountName = row[accountNameKey];
            
            // Create time series data from month columns
            const timeSeries: Record<string, number> = {};
            Object.keys(row).forEach(key => {
              if (key !== accountNameKey) {
                // Handle various number formats: commas, parentheses for negatives, etc.
                let rawValue = String(row[key] || '').trim();
                
                // Debug: Log raw values for first few rows
                if (index < 3) {
                  console.log(`🔍 Raw value for ${key}: "${rawValue}"`);
                }
                
                // Skip empty values
                if (!rawValue || rawValue === '' || rawValue === '-') {
                  timeSeries[key] = 0;
                  return;
                }
                
                // Handle parentheses for negative numbers (accounting format)
                let isNegative = false;
                if (rawValue.startsWith('(') && rawValue.endsWith(')')) {
                  isNegative = true;
                  rawValue = rawValue.slice(1, -1); // Remove parentheses
                }
                
                // Remove commas and other formatting
                rawValue = rawValue.replace(/,/g, '');
                
                // Parse the number
                const value = parseFloat(rawValue);
                
                if (!isNaN(value)) {
                  const finalValue = isNegative ? -value : value;
                  timeSeries[key] = finalValue;
                  
                  // Debug: Log parsed values for first few rows
                  if (index < 3) {
                    console.log(`✅ Parsed ${key}: ${finalValue}`);
                  }
                } else {
                  // If parsing fails, try to extract just the numeric part
                  const numericMatch = rawValue.match(/-?\d+\.?\d*/);
                  if (numericMatch) {
                    const extractedValue = parseFloat(numericMatch[0]);
                    if (!isNaN(extractedValue)) {
                      timeSeries[key] = isNegative ? -extractedValue : extractedValue;
                    } else {
                      timeSeries[key] = 0;
                    }
                  } else {
                    timeSeries[key] = 0;
                  }
                }
              }
            });
            
            processedRow.account_name = accountName;
            processedRow.time_series = timeSeries;
            processedRow.row_index = index;
            processedRow.file_type = fileType;
            
            return processedRow;
          });
          
          // Send to Python AI backend for categorization
          try {
            console.log("🤖 Sending data to AI backend for categorization...");
            const response = await fetch(`${API}/api/categorize`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                csv_data: processedData,
                file_type: fileType
              })
            });
            
            if (response.ok) {
              const aiResult = await response.json();
              console.log("🤖 AI categorization complete:", aiResult.summary);
              console.log("🤖 Sample categorized row:", aiResult.categorized_data[0]);
              
              // Update state with AI-categorized data
              setPreview(aiResult.categorized_data);
              setCategorizationSummary(aiResult.summary);
              
              // Update account categories from AI results
              const categories: Record<string, string> = {};
              const included: Record<string, boolean> = {};
              aiResult.categorized_data.forEach((row: any) => {
                if (row.account_name) {
                  categories[row.account_name] = row.ai_category;
                  // Default all items to included
                  included[row.account_name] = true;
                  // Debug: Check if time_series is preserved
                  if (!row.time_series) {
                    console.warn(`⚠️ Missing time_series for ${row.account_name}`);
                  } else {
                    console.log(`✅ time_series preserved for ${row.account_name}:`, Object.keys(row.time_series));
                  }
                }
              });
              setAccountCategories(categories);
              setIncludedItems(included);
              
            } else {
              console.warn("AI backend not available, using manual categorization");
              setPreview(processedData);
              setAccountCategories({});
              
              // Set all items as included by default for manual categorization
              const included: Record<string, boolean> = {};
              processedData.forEach((row: any) => {
                if (row.account_name) {
                  included[row.account_name] = true;
                }
              });
              setIncludedItems(included);
            }
          } catch (aiError) {
            console.warn("AI backend error, using manual categorization:", aiError);
            setPreview(processedData);
            setAccountCategories({});
            
            // Set all items as included by default for manual categorization
            const included: Record<string, boolean> = {};
            processedData.forEach((row: any) => {
              if (row.account_name) {
                included[row.account_name] = true;
              }
            });
            setIncludedItems(included);
          }
          
          setHasPreviewed(true);
          setLoading(false);
        },
        error: (error: any) => {
          console.error("CSV parsing error:", error);
          setError(`CSV parsing failed: ${error.message}`);
          setLoading(false);
        }
      });
      
    } catch (error: any) {
      console.error("Preview error:", error);
      setError(`Preview failed: ${error.message}`);
      setLoading(false);
    }
  };

  const saveToDatabase = async () => {
    if (!preview.length || !file) return;
    setLoading(true);
    setError(null);
    
    try {
      // Check for duplicates before saving
      const existingCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      const duplicateCSV = existingCSVs.find((csv: any) => 
        csv.fileName === file.name && csv.isActive
      );

      if (duplicateCSV) {
        const confirmed = window.confirm(
          `A CSV with the same filename "${file.name}" already exists.\n\n` +
          `Existing CSV: ${duplicateCSV.totalRecords} records, uploaded ${new Date(duplicateCSV.uploadedAt).toLocaleDateString()}\n` +
          `New CSV: ${preview.length} records\n\n` +
          `Do you want to replace the existing CSV with this new one?\n\n` +
          `Click "OK" to replace, or "Cancel" to keep both (rename the file to avoid conflicts).`
        );

        if (!confirmed) {
          setError('Upload cancelled. Please rename the file to avoid conflicts.');
          return;
        }

        // Remove the duplicate CSV
        const updatedCSVs = existingCSVs.filter((csv: any) => csv.id !== duplicateCSV.id);
        localStorage.setItem('savedCSVs', JSON.stringify(updatedCSVs));
        
        // Trigger dashboard update to remove old data
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
          detail: { 
            action: 'csv_replaced',
            oldCsvId: duplicateCSV.id,
            fileName: file.name
          } 
        }));
      }

      // Create CSV record for management
      // Filter out excluded items
      const includedPreviewData = preview.filter((row: any) => 
        includedItems[row.account_name] !== false
      );
      
      const includedAccountCategories: Record<string, string> = {};
      Object.entries(accountCategories).forEach(([accountName, category]) => {
        if (includedItems[accountName] !== false) {
          includedAccountCategories[accountName] = category;
        }
      });

      const csvRecord = {
        id: Date.now().toString(),
        fileName: file.name,
        fileType: fileType,
        uploadedAt: new Date().toISOString(),
        totalRecords: includedPreviewData.length,
        accountCategories: includedAccountCategories,
        bucketAssignments: generateBucketAssignments(),
        tags: generateTags(),
        isActive: true,
        previewData: includedPreviewData
      };
      
      console.log("💾 Saving CSV record:", {
        fileName: csvRecord.fileName,
        accountCategoriesCount: Object.keys(csvRecord.accountCategories).length,
        bucketAssignmentsCount: Object.keys(csvRecord.bucketAssignments).length,
        previewDataCount: csvRecord.previewData.length,
        sampleAccountNames: Object.keys(csvRecord.accountCategories).slice(0, 3),
        samplePreviewAccountNames: csvRecord.previewData.slice(0, 3).map((item: any) => item.account_name)
      });

      // Save to Supabase first
      const supabaseResult = await saveCSVData({
        id: csvRecord.id,
        file_name: csvRecord.fileName,
        file_type: csvRecord.fileType,
        uploaded_at: csvRecord.uploadedAt,
        total_records: csvRecord.totalRecords,
        account_categories: csvRecord.accountCategories,
        bucket_assignments: csvRecord.bucketAssignments,
        tags: csvRecord.tags,
        is_active: csvRecord.isActive,
        preview_data: csvRecord.previewData
      });

      // Also save to localStorage as backup
      const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      savedCSVs.push(csvRecord);
      localStorage.setItem('savedCSVs', JSON.stringify(savedCSVs));
      
      setSaved(true);
      console.log("Data saved to database:", preview.length, "records");
      
      // Show success message with link to management
      setTimeout(() => {
        alert(`CSV saved successfully! Go to "CSV Management" tab to review and adjust categorizations.`);
      }, 500);
      
    } catch (error: any) {
      console.error("Save error:", error);
      setError(`Save failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateBucketAssignments = (): Record<string, string> => {
    const assignments: Record<string, string> = {};
    
    console.log('🔧 Generating bucket assignments for accounts:', Object.keys(accountCategories));
    
    // Use manual bucket assignments first, then fall back to auto-generation
    for (const [accountName, category] of Object.entries(accountCategories)) {
      // Check if user has manually assigned a bucket
      if (bucketAssignments[accountName]) {
        assignments[accountName] = bucketAssignments[accountName];
        console.log(`🪣 ${accountName} → ${bucketAssignments[accountName]} (manual assignment)`);
        continue;
      }
      
      // Auto-generate bucket assignment
      const suggestedBucket = getSuggestedBucket(accountName, category);
      assignments[accountName] = suggestedBucket;
      console.log(`🤖 ${accountName} → ${suggestedBucket} (auto-generated)`);
    }
    
    return assignments;
  };

  const generateTags = (): Record<string, string[]> => {
    const tags: Record<string, string[]> = {};
    
    for (const accountName of Object.keys(accountCategories)) {
      const accountLower = accountName.toLowerCase();
      const accountTags: string[] = [];
      
      // Generate tags based on account name patterns
      if (/rent|rental/.test(accountLower)) accountTags.push('rental');
      if (/short term/.test(accountLower)) accountTags.push('short-term');
      if (/utility|water|garbage/.test(accountLower)) accountTags.push('utility');
      if (/management/.test(accountLower)) accountTags.push('management');
      if (/fee/.test(accountLower)) accountTags.push('fee');
      if (/income/.test(accountLower)) accountTags.push('income');
      if (/expense/.test(accountLower)) accountTags.push('expense');
      
      if (accountTags.length > 0) {
        tags[accountName] = accountTags;
      }
    }
    
    return tags;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">CSV Import with AI Parser</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Type
            </label>
            <select 
              value={fileType} 
              onChange={e => setFileType(e.target.value as FileType)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="general">General CSV</option>
              <option value="cash_flow">Cash Flow Statement</option>
              <option value="balance_sheet">Balance Sheet</option>
              <option value="rent_roll">Rent Roll</option>
              <option value="income_statement">Income Statement</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the type of financial document to get better AI mapping suggestions
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File
            </label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
      </div>
      
      {!!headers.length && (
        <div>
          <h4 className="text-md font-medium mb-2">Header Mapping</h4>
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>🤖 Fully Automatic:</strong> {
                fileType === 'cash_flow' ? 
                  'AI automatically categorizes accounts (Rental Income → income, Maintenance → expense) and maps monthly columns to time-series data. No manual mapping needed!' :
                fileType === 'rent_roll' ?
                  'AI automatically maps tenant names, unit numbers, and rent amounts to appropriate fields.' :
                fileType === 'balance_sheet' ?
                  'AI automatically categorizes assets, liabilities, and equity accounts.' :
                fileType === 'income_statement' ?
                  'AI automatically categorizes revenue and expense accounts and maps monthly columns.' :
                  'AI automatically detects and maps all relevant fields based on your file type.'
              }
            </p>
          </div>
              <HeaderMapper headers={headers} suggestions={map} onChange={onChange} fileType={fileType} />
          
          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 border rounded text-xs">
              <strong>Debug Info:</strong> Found {Object.keys(accountCategories).length} account line items
              <br />
              Headers: {headers.join(', ')}
              <br />
              Account Categories: {JSON.stringify(accountCategories, null, 2)}
              <br />
              <strong>Sample Data:</strong> {JSON.stringify(samples.slice(0, 3), null, 2)}
            </div>
          )}
          
          {/* Account Line Items Editor */}
          {Object.keys(accountCategories).length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-lg font-semibold mb-3 text-blue-900">📊 Account Line Items Categorization</h4>
              <p className="text-sm text-blue-800 mb-4">
                <strong>Manual Override:</strong> Review and adjust how each account line item is categorized. 
                The AI has made initial suggestions, but you can change any account from Income to Expense (or vice versa).
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4 bg-white">
                <div className="text-xs text-gray-500 mb-2">
                  Found {Object.keys(accountCategories).length} account line items
                </div>
                {Object.entries(accountCategories).map(([accountName, category]) => (
                  <div key={accountName} className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                    <div className="w-1/2 font-medium text-xs text-gray-800 truncate" title={accountName}>
                      {accountName}
                    </div>
                    <select 
                      className="w-1/3 border border-gray-300 rounded p-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={category}
                      onChange={e => updateAccountCategory(accountName, e.target.value)}
                    >
                      <option value="income">💰 Income</option>
                      <option value="expense">💸 Expense</option>
                    </select>
                    <div className={`w-1/6 text-xs px-2 py-1 rounded text-center font-semibold ${
                      category === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {category === 'income' ? '📈' : '📉'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Pro Tip:</strong> Values will be automatically normalized (negative values become positive) based on the category you select.
                  For example, if "Move In Specials" should be an expense, select "Expense" and the system will treat it as a cost.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {!!headers.length && (
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" 
            onClick={previewImport}
            disabled={loading}
          >
            {loading ? "Processing..." : "🔍 Preview Import"}
          </button>
          
          {hasPreviewed && (
            <button 
              className={`px-4 py-2 rounded text-white font-semibold transition-colors ${
                loading ? 'bg-gray-400 cursor-not-allowed' : saved ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
              }`}
              onClick={saveToDatabase}
              disabled={loading}
            >
              {loading ? "Saving..." : saved ? "✅ Saved!" : "💾 Save to Database"}
            </button>
          )}
        </div>
      )}
      
      {!!preview.length && (
        <div>
          <h4 className="text-md font-medium mb-2">CSV Data Preview</h4>
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>✅ Preview Complete:</strong> {preview.length} records loaded successfully. 
              Review the data below and click "Save to Database" when ready.
            </p>
          </div>
          
          {/* CSV Data Table with Categorization */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-blue-50 px-4 py-3 border-b">
              <h5 className="font-medium text-blue-900">📊 CSV Data with Categorization</h5>
              <p className="text-sm text-blue-700 mt-1">
                Review your data and categorize line items as Income or Expense. Look for "Total Income", "Total Expense", and "Net Income" sections.
              </p>
              
              {/* Bulk Selection Controls */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={selectAllItems}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  ✅ Select All
                </button>
                <button
                  onClick={deselectAllItems}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  ❌ Deselect All
                </button>
                <button
                  onClick={() => selectByCategory('income')}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  💰 Select Income Only
                </button>
                <button
                  onClick={() => selectByCategory('expense')}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  💸 Select Expense Only
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Include</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Account Name</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Category</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Dashboard Bucket</th>
                    {(() => {
                      // Find the first row with time_series data to generate headers
                      const headerRow = preview.find(row => row.time_series && Object.keys(row.time_series).length > 0);
                      return headerRow?.time_series ? Object.keys(headerRow.time_series).map((key) => (
                        <th key={key} className="px-3 py-2 text-right font-medium text-gray-700 border-b">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </th>
                      )) : [];
                    })()}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.map((row: any, index: number) => {
                    const accountName = row.account_name;
                    const timeSeries = row.time_series || {};
                    const isIncluded = includedItems[accountName] !== false; // Default to true
                    
                    // Debug: Log if time_series is missing
                    if (!row.time_series) {
                      console.warn(`⚠️ Row ${index} missing time_series:`, row);
                    }
                    
                    return (
                      <tr key={index} className={`hover:bg-gray-50 ${!isIncluded ? 'opacity-50 bg-gray-100' : ''}`}>
                        <td className="px-3 py-2 text-center border-b">
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={(e) => {
                              setIncludedItems(prev => ({
                                ...prev,
                                [accountName]: e.target.checked
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-900 border-b">
                          <div className="max-w-xs truncate font-medium" title={String(accountName)}>
                            {accountName || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b">
                          <div className="flex flex-col gap-1">
                            <select 
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              value={accountCategories[accountName] || row.ai_category || 'uncategorized'}
                              onChange={(e) => updateAccountCategory(accountName, e.target.value)}
                            >
                              <option value="uncategorized">❓ Choose...</option>
                              <option value="income">💰 Income</option>
                              <option value="expense">💸 Expense</option>
                              <option value="net_income">📊 Net Income</option>
                            </select>
                            {row.confidence_score && (
                              <div className={`text-xs px-1 py-0.5 rounded text-center ${
                                row.confidence_score > 0.8 ? 'bg-green-100 text-green-700' :
                                row.confidence_score > 0.6 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {Math.round(row.confidence_score * 100)}% confidence
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(DASHBOARD_BUCKETS).map(([bucketKey, bucket]) => {
                              const currentBucket = bucketAssignments[accountName] || getSuggestedBucket(accountName, accountCategories[accountName] || row.ai_category);
                              const isSelected = currentBucket === bucketKey;
                              
                              return (
                                <button
                                  key={bucketKey}
                                  onClick={() => updateBucketAssignment(accountName, bucketKey)}
                                  className={`px-2 py-1 text-xs rounded-full border transition-all ${
                                    isSelected 
                                      ? `${bucket.color} border-current font-semibold` 
                                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                  }`}
                                  title={bucket.description}
                                >
                                  {bucket.icon} {bucket.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        {(() => {
                          // Get the header row to ensure we show all columns
                          const headerRow = preview.find(row => row.time_series && Object.keys(row.time_series).length > 0);
                          const headerKeys = headerRow?.time_series ? Object.keys(headerRow.time_series) : [];
                          
                          return headerKeys.map((month, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 text-gray-900 border-b text-right">
                              <div className="max-w-xs truncate font-mono text-xs" title={String(timeSeries[month] || 0)}>
                                {timeSeries[month] !== null && timeSeries[month] !== undefined ? 
                                  new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                  }).format(timeSeries[month]) : '-'}
                              </div>
                            </td>
                          ));
                        })()}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 bg-gray-50 text-sm text-gray-600 border-t">
              Showing all {preview.length} records
            </div>
          </div>
          
          {/* Data Selection Summary */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-800">Total Records</div>
              <div className="text-lg font-bold text-blue-900">{preview.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-800">✅ Included</div>
              <div className="text-lg font-bold text-green-900">
                {Object.values(includedItems).filter(included => included !== false).length}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-800">❌ Excluded</div>
              <div className="text-lg font-bold text-gray-900">
                {Object.values(includedItems).filter(included => included === false).length}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-800">💰 Income</div>
              <div className="text-lg font-bold text-green-900">
                {Object.entries(accountCategories).filter(([name, cat]) => 
                  cat === 'income' && includedItems[name] !== false
                ).length}
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-sm font-medium text-red-800">💸 Expense</div>
              <div className="text-lg font-bold text-red-900">
                {Object.entries(accountCategories).filter(([name, cat]) => 
                  cat === 'expense' && includedItems[name] !== false
                ).length}
              </div>
            </div>
          </div>
          
          {/* AI Confidence Summary */}
          {categorizationSummary && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">🤖 AI Categorization Summary</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Average Confidence:</span>
                  <div className="font-semibold text-gray-900">
                    {Math.round(categorizationSummary.confidence_avg * 100)}%
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">AI Income:</span>
                  <div className="font-semibold text-green-700">{categorizationSummary.income_count}</div>
                </div>
                <div>
                  <span className="text-gray-600">AI Expense:</span>
                  <div className="font-semibold text-red-700">{categorizationSummary.expense_count}</div>
                </div>
                <div>
                  <span className="text-gray-600">Uncategorized:</span>
                  <div className="font-semibold text-gray-700">{categorizationSummary.uncategorized_count}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Raw JSON toggle */}
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              📋 View Raw JSON Data
            </summary>
            <pre className="text-xs border rounded p-2 max-h-80 overflow-auto bg-gray-50 mt-2">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}