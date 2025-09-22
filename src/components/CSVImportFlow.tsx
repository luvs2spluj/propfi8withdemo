import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import HeaderMapper, { FieldSuggestion } from "./HeaderMapper";
import { saveCSVData, getAILearning, saveAILearning, getCSVData, deleteCSVData } from "../lib/supabase";
import { Database, Edit3, Trash2, Save, RefreshCw, Eye } from 'lucide-react';

const API = (process.env as any).REACT_APP_API_BASE || "http://localhost:5002";

type FileType = 'cash_flow' | 'balance_sheet' | 'rent_roll' | 'income_statement' | 'general';

// Dashboard Bucket Definitions
const DASHBOARD_BUCKETS = {
  // Primary Cash Flow Buckets (Green - Income Items)
  'income_item': {
    label: 'Income Item',
    description: 'Individual income line items (rent, fees, etc.)',
    color: 'bg-green-100 text-green-800',
    icon: '💰',
    category: 'income'
  },
  'income_total': {
    label: 'Income Total',
    description: 'Total income calculations and summaries',
    color: 'bg-green-100 text-green-800',
    icon: '📈',
    category: 'income'
  },
  
  // Primary Cash Flow Buckets (Red - Expense Items)
  'expense_item': {
    label: 'Expense Item',
    description: 'Individual expense line items (maintenance, utilities, etc.)',
    color: 'bg-red-100 text-red-800',
    icon: '💸',
    category: 'expense'
  },
  'expense_total': {
    label: 'Expense Total',
    description: 'Total expense calculations and summaries',
    color: 'bg-red-100 text-red-800',
    icon: '📉',
    category: 'expense'
  },
  
  // Primary Cash Flow Buckets (Purple - Cash)
  'cash_amount': {
    label: 'Cash Amount',
    description: 'Cash and cash equivalents',
    color: 'bg-purple-100 text-purple-800',
    icon: '💳',
    category: 'cash'
  },
  
  // Legacy Buckets (for backward compatibility)
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
    color: 'bg-green-100 text-green-800',
    icon: '💰',
    category: 'income'
  },
  'total_income': {
    label: 'Total Income',
    description: 'Sum of all income sources',
    color: 'bg-green-100 text-green-800',
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
  'operating_expenses': {
    label: 'Operating Expenses',
    description: 'Day-to-day property operations',
    color: 'bg-red-100 text-red-800',
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
    color: 'bg-red-100 text-red-800',
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
  'net_operating_income': {
    label: 'Net Operating Income',
    description: 'Income minus operating expenses',
    color: 'bg-blue-100 text-blue-800',
    icon: '📊',
    category: 'net_income'
  },
  'net_income': {
    label: 'Net Income',
    description: 'Final profit after all expenses',
    color: 'bg-blue-100 text-blue-800',
    icon: '💎',
    category: 'net_income'
  },
  'cash_change': {
    label: 'Cash Change',
    description: 'Changes in cash position',
    color: 'bg-purple-100 text-purple-800',
    icon: '💱',
    category: 'cash'
  },
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
  
  // CSV Management state
  const [savedCSVs, setSavedCSVs] = useState<any[]>([]);
  const [selectedCSV, setSelectedCSV] = useState<any | null>(null);
  const [editingCategories, setEditingCategories] = useState<Record<string, string>>({});
  const [editingBuckets, setEditingBuckets] = useState<Record<string, string>>({});
  const [editingTags, setEditingTags] = useState<Record<string, string[]>>({});
  const [managementIncludedItems, setManagementIncludedItems] = useState<Record<string, boolean>>({});
  const [managementBucketAssignments, setManagementBucketAssignments] = useState<Record<string, string>>({});
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementSaving, setManagementSaving] = useState(false);
  const [showManagementPreview, setShowManagementPreview] = useState(false);
  const [managementPreviewMode, setManagementPreviewMode] = useState(false);
  
  // Bucket Management state
  const [bucketTerms, setBucketTerms] = useState<Record<string, string[]>>({});
  const [editingBucket, setEditingBucket] = useState<string | null>(null);
  const [newTerm, setNewTerm] = useState<string>('');
  const [showBucketManagement, setShowBucketManagement] = useState(false);
  const [customBuckets, setCustomBuckets] = useState<Record<string, any>>({});
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState<string>('');
  const [newBucketDescription, setNewBucketDescription] = useState<string>('');
  const [newBucketCategory, setNewBucketCategory] = useState<string>('income');
  const [bucketCategories, setBucketCategories] = useState<Record<string, string>>({});

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

  // Load saved CSVs for management
  const loadCSVs = async () => {
    try {
      console.log('🔄 Loading CSVs from backend and localStorage...');
      
      // Get CSVs from Supabase
      const supabaseCSVs = await getCSVData();
      console.log('📊 Supabase CSVs:', supabaseCSVs.length, 'files');
      
      // Get CSVs from localStorage
      const localSavedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      console.log('💾 LocalStorage CSVs:', localSavedCSVs.length, 'files');
      
      // Combine both sources, prioritizing Supabase data
      const combinedCSVs = [...supabaseCSVs];
      
      // Add localStorage CSVs that aren't already in Supabase
      localSavedCSVs.forEach((localCSV: any) => {
        const existsInSupabase = supabaseCSVs.some((supabaseCSV: any) => 
          supabaseCSV.id === localCSV.id || 
          (supabaseCSV.file_name === localCSV.fileName && supabaseCSV.uploaded_at === localCSV.uploadedAt)
        );
        
        if (!existsInSupabase && localCSV.isActive) {
          // Convert localStorage format to match Supabase format
          const convertedCSV = {
            id: localCSV.id,
            file_name: localCSV.fileName,
            file_type: localCSV.fileType,
            uploaded_at: localCSV.uploadedAt,
            total_records: localCSV.totalRecords,
            account_categories: localCSV.accountCategories,
            bucket_assignments: localCSV.bucketAssignments,
            tags: localCSV.tags,
            is_active: localCSV.isActive,
            preview_data: localCSV.previewData,
            // Add compatibility fields
            fileName: localCSV.fileName,
            fileType: localCSV.fileType,
            uploadedAt: localCSV.uploadedAt,
            totalRecords: localCSV.totalRecords,
            accountCategories: localCSV.accountCategories,
            bucketAssignments: localCSV.bucketAssignments,
            isActive: localCSV.isActive,
            previewData: localCSV.previewData
          };
          combinedCSVs.push(convertedCSV);
        }
      });
      
      // Filter to only active CSVs
      const activeCSVs = combinedCSVs.filter((csv: any) => csv.is_active !== false && csv.isActive !== false);
      
      setSavedCSVs(activeCSVs);
      console.log('✅ Total active CSVs loaded:', activeCSVs.length, 'files');
      console.log('📋 CSV details:', activeCSVs.map((csv: any) => ({
        id: csv.id,
        fileName: csv.file_name || csv.fileName,
        fileType: csv.file_type || csv.fileType,
        totalRecords: csv.total_records || csv.totalRecords,
        isActive: csv.is_active !== false && csv.isActive !== false,
        hasPreviewData: !!(csv.preview_data || csv.previewData),
        previewDataLength: csv.preview_data?.length || csv.previewData?.length || 0,
        bucketAssignmentsCount: Object.keys(csv.bucket_assignments || csv.bucketAssignments || {}).length
      })));
      
      // Debug: Check if there are any inactive CSVs
      const allCSVs = [...supabaseCSVs, ...localSavedCSVs];
      const inactiveCSVs = allCSVs.filter((csv: any) => csv.is_active === false || csv.isActive === false);
      if (inactiveCSVs.length > 0) {
        console.log('⚠️ Found inactive CSVs:', inactiveCSVs.length, inactiveCSVs.map((csv: any) => ({
          id: csv.id,
          fileName: csv.file_name || csv.fileName,
          isActive: csv.is_active !== false && csv.isActive !== false
        })));
      }
      
    } catch (error) {
      console.error('❌ Error loading CSVs:', error);
      // Fallback to localStorage only
      try {
        const localSavedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
        const activeCSVs = localSavedCSVs.filter((csv: any) => csv.isActive);
        setSavedCSVs(activeCSVs);
        console.log('🔄 Fallback to localStorage:', activeCSVs.length, 'files');
      } catch (localError) {
        console.error('❌ Error loading from localStorage:', localError);
        setSavedCSVs([]);
      }
    }
  };

  useEffect(() => {
    loadCSVs();
  }, []);

  // Initialize bucket terms with default values
  useEffect(() => {
    const defaultBucketTerms: Record<string, string[]> = {
      // Primary Cash Flow Buckets
      'income_item': ['rent', 'rental', 'tenant', 'lease', 'monthly rent', 'rental income', 'fee', 'charge', 'late fee', 'application fee', 'pet fee', 'parking fee', 'income', 'revenue'],
      'income_total': ['total income', 'total operating income', 'gross income', 'total revenue', 'income total'],
      'expense_item': ['maintenance', 'repair', 'fix', 'service', 'upkeep', 'renovation', 'utilities', 'electric', 'water', 'gas', 'trash', 'insurance', 'tax', 'management', 'admin', 'administrative', 'office', 'management fee', 'expense', 'cost'],
      'expense_total': ['total expense', 'total operating expense', 'total costs', 'expense total'],
      'cash_amount': ['cash', 'cash equivalent', 'bank', 'checking', 'savings', 'money market'],
      
      // Legacy Buckets (for backward compatibility)
      'total_operating_income': ['total operating income', 'total income', 'operating income', 'gross income'],
      'total_operating_expense': ['total operating expense', 'total expense', 'operating expense', 'total costs'],
      'net_operating_income': ['noi', 'net operating income', 'net income', 'operating profit'],
      'rental_income': ['rent', 'rental', 'tenant', 'lease', 'monthly rent', 'rental income'],
      'other_income': ['fee', 'charge', 'late fee', 'application fee', 'pet fee', 'parking fee'],
      'operating_expenses': ['operating', 'general', 'administrative', 'office', 'utilities'],
      'maintenance_expenses': ['maintenance', 'repair', 'fix', 'service', 'upkeep', 'renovation'],
      'management_expenses': ['management', 'admin', 'administrative', 'office', 'management fee'],
      'exclude': ['total', 'sum', 'grand total', 'subtotal', 'balance', 'equity']
    };
    
    // Load saved bucket terms from localStorage or use defaults
    const savedBucketTerms = localStorage.getItem('bucketTerms');
    if (savedBucketTerms) {
      try {
        const parsed = JSON.parse(savedBucketTerms);
        setBucketTerms({ ...defaultBucketTerms, ...parsed });
      } catch (error) {
        setBucketTerms(defaultBucketTerms);
      }
    } else {
      setBucketTerms(defaultBucketTerms);
    }

    // Load custom buckets from localStorage
    const savedCustomBuckets = localStorage.getItem('customBuckets');
    if (savedCustomBuckets) {
      try {
        const parsed = JSON.parse(savedCustomBuckets);
        setCustomBuckets(parsed);
      } catch (error) {
        setCustomBuckets({});
      }
    }

    // Load bucket categories from localStorage
    const savedBucketCategories = localStorage.getItem('bucketCategories');
    if (savedBucketCategories) {
      try {
        const parsed = JSON.parse(savedBucketCategories);
        setBucketCategories(parsed);
      } catch (error) {
        setBucketCategories({});
      }
    }
  }, []);

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
          complete: async (fullR: any) => {
            const allRows = (fullR.data as any[]).filter(row => row && Object.keys(row).length > 0);
            console.log("Processing", allRows.length, "total rows from CSV");
            
            // Auto-categorize individual account line items based on names
            const accountCol = cols.find((col: string) => /account|name|description|item/.test(col.toLowerCase()));
            // Initialize empty categories - user will categorize manually in preview
            setAccountCategories({});
            
            // Process the data immediately and set preview state
            try {
              setLoading(true);
              
              // Process the data to create time series structure for dashboard
              const processedData = allRows.map((row: any, index: number) => {
                const processedRow: any = {};
                
                // Apply field mapping
                Object.entries(autoMap).forEach(([originalField, suggestion]) => {
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
                    
                    // Remove commas and handle parentheses for negatives
                    rawValue = rawValue.replace(/,/g, '');
                    if (rawValue.startsWith('(') && rawValue.endsWith(')')) {
                      rawValue = '-' + rawValue.slice(1, -1);
                    }
                    
                    const numValue = parseFloat(rawValue);
                    if (!isNaN(numValue)) {
                      timeSeries[key] = numValue;
                    }
                  }
                });
                
                processedRow.account_name = accountName;
                processedRow.time_series = timeSeries;
                processedRow.ai_category = 'unknown'; // Will be set by AI or user
                
                return processedRow;
              });
              
              // Set preview data immediately
              setPreview(processedData);
              setHasPreviewed(true);
              
              // Set all items as included by default
              const included: Record<string, boolean> = {};
              processedData.forEach((row: any) => {
                if (row.account_name) {
                  included[row.account_name] = true;
                }
              });
              setIncludedItems(included);
              
              setLoading(false);
              
              // Try to get AI categorization in the background
              try {
                const response = await fetch(`${API}/categorize`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    data: processedData,
                    file_type: fileType
                  })
                });
                
                if (response.ok) {
                  const aiResult = await response.json();
                  console.log("🤖 AI categorization complete:", aiResult.summary);
                  
                  // Update with AI-categorized data
                  setPreview(aiResult.categorized_data);
                  setCategorizationSummary(aiResult.summary);
                  
                  // Update account categories from AI results
                  const categories: Record<string, string> = {};
                  aiResult.categorized_data.forEach((row: any) => {
                    if (row.account_name) {
                      categories[row.account_name] = row.ai_category;
                    }
                  });
                  setAccountCategories(categories);
                }
              } catch (aiError) {
                console.warn("AI backend error, using manual categorization:", aiError);
              }
              
            } catch (error) {
              console.error("Data processing error:", error);
              setError(`Data processing failed: ${error}`);
              setLoading(false);
            }
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
    
    // Use customizable bucket terms for matching
    for (const [bucketKey, terms] of Object.entries(bucketTerms)) {
      for (const term of terms) {
        if (name.includes(term.toLowerCase())) {
          return bucketKey;
        }
      }
    }
    
    // For cash flow sheets, prioritize primary buckets
    if (fileType === 'cash_flow') {
      if (aiCategory === 'income') {
        return 'income_item';
      } else if (aiCategory === 'expense') {
        return 'expense_item';
      } else if (aiCategory === 'cash') {
        return 'cash_amount';
      }
    }
    
    // Fallback to category-based assignment if no term matches
    if (aiCategory === 'income') {
      return 'other_income';
    } else if (aiCategory === 'expense') {
      return 'operating_expenses';
    }
    
    // Default to exclude if uncertain
    return 'exclude';
  };

  const getBucketSuggestions = (accountName: string, aiCategory: string): string[] => {
    const name = accountName.toLowerCase();
    const suggestions: string[] = [];
    
    // Find all buckets that match this account name
    for (const [bucketKey, terms] of Object.entries(bucketTerms)) {
      for (const term of terms) {
        if (name.includes(term.toLowerCase())) {
          suggestions.push(bucketKey);
          break; // Only add each bucket once
        }
      }
    }
    
    // Add category-based suggestions if no term matches
    if (suggestions.length === 0) {
      if (fileType === 'cash_flow') {
        // For cash flow sheets, prioritize primary buckets
        if (aiCategory === 'income') {
          suggestions.push('income_item', 'income_total', 'rental_income', 'other_income');
        } else if (aiCategory === 'expense') {
          suggestions.push('expense_item', 'expense_total', 'operating_expenses', 'maintenance_expenses');
        } else if (aiCategory === 'cash') {
          suggestions.push('cash_amount', 'cash_change');
        }
      } else {
        // For other sheet types, use legacy buckets
        if (aiCategory === 'income') {
          suggestions.push('other_income', 'rental_income');
        } else if (aiCategory === 'expense') {
          suggestions.push('operating_expenses', 'maintenance_expenses', 'management_expenses');
        }
      }
    }
    
    // Always include exclude as an option
    if (!suggestions.includes('exclude')) {
      suggestions.push('exclude');
    }
    
    return suggestions;
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

      let csvRecord: any;
      
      if (selectedCSV) {
        // Update existing CSV record
        csvRecord = {
          ...selectedCSV,
          totalRecords: includedPreviewData.length,
          accountCategories: includedAccountCategories,
          bucketAssignments: generateBucketAssignments(),
          tags: generateTags(),
          previewData: includedPreviewData
        };
      } else {
        // Create new CSV record
        csvRecord = {
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
      }
      
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

      // Update localStorage
      const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      
      if (selectedCSV) {
        // Update existing CSV in localStorage
        const csvIndex = savedCSVs.findIndex((csv: any) => csv.id === selectedCSV.id);
        if (csvIndex !== -1) {
          savedCSVs[csvIndex] = csvRecord;
        }
      } else {
        // Add new CSV to localStorage
      savedCSVs.push(csvRecord);
      }
      
      localStorage.setItem('savedCSVs', JSON.stringify(savedCSVs));
      
      setSaved(true);
      console.log("Data saved to database:", preview.length, "records");
      
      // If we're editing an existing CSV, close the categorization interface
      if (selectedCSV) {
        // Clear the preview data to close the categorization interface
        setPreview([]);
        setHasPreviewed(false);
        setSelectedCSV(null);
        
        // Refresh the CSV list to show updated data
        await loadCSVs();
        
        // Show success message
        setTimeout(() => {
          alert(`CSV "${csvRecord.fileName}" updated successfully!`);
        }, 500);
      } else {
        // Show success message with link to management for new uploads
      setTimeout(() => {
        alert(`CSV saved successfully! Go to "CSV Management" tab to review and adjust categorizations.`);
      }, 500);
      }
      
    } catch (error: any) {
      console.error("Save error:", error);
      setError(`Save failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // CSV Management Functions
  const getFileTypeColor = (fileType: string) => {
    const colors: Record<string, string> = {
      'cash_flow': 'bg-blue-100 text-blue-800',
      'balance_sheet': 'bg-green-100 text-green-800',
      'rent_roll': 'bg-purple-100 text-purple-800',
      'income_statement': 'bg-orange-100 text-orange-800',
      'general': 'bg-gray-100 text-gray-800'
    };
    return colors[fileType] || colors['general'];
  };

  const handlePreviewCSV = (csv: any) => {
    setSelectedCSV(csv);
    setEditingCategories(csv.accountCategories || {});
    setEditingBuckets(csv.bucketAssignments || {});
    setManagementBucketAssignments(csv.bucketAssignments || {});
    setEditingTags(csv.tags || {});
    setManagementIncludedItems(csv.includedItems || {});
    setManagementPreviewMode(true);
    setShowManagementPreview(true);
    console.log('👁️ Previewing CSV:', csv.fileName);
  };

  const handleEditCSV = (csv: any) => {
    setSelectedCSV(csv);
    setEditingCategories(csv.accountCategories || {});
    setEditingBuckets(csv.bucketAssignments || {});
    setManagementBucketAssignments(csv.bucketAssignments || {});
    setEditingTags(csv.tags || {});
    setManagementIncludedItems(csv.includedItems || {});
    setManagementPreviewMode(false);
    setShowManagementPreview(false);
    
    // Load the CSV data into the main preview interface for editing
    setPreview(csv.previewData || []);
    setAccountCategories(csv.accountCategories || {});
    setBucketAssignments(csv.bucketAssignments || {});
    setIncludedItems(csv.includedItems || {});
    setHasPreviewed(true);
    
    console.log('✏️ Editing CSV:', csv.fileName, 'with', csv.previewData?.length, 'records');
  };

  const toggleCSVActive = async (csvId: string) => {
    setManagementLoading(true);
    try {
      const updatedCSVs = savedCSVs.map(csv => 
        csv.id === csvId ? { ...csv, isActive: !csv.isActive } : csv
      );
      setSavedCSVs(updatedCSVs);
      
      // Update in localStorage
      const localSavedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      const updatedLocalCSVs = localSavedCSVs.map((csv: any) => 
        csv.id === csvId ? { ...csv, isActive: !csv.isActive } : csv
      );
      localStorage.setItem('savedCSVs', JSON.stringify(updatedLocalCSVs));
      
      // Trigger dashboard update
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { action: 'csv_toggled', csvId } 
      }));
    } catch (error) {
      console.error('Error toggling CSV:', error);
    } finally {
      setManagementLoading(false);
    }
  };

  const deleteCSV = async (csvId: string) => {
    const csvToDelete = savedCSVs.find(csv => csv.id === csvId);
    if (!csvToDelete) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${csvToDelete.fileName}"?\n\n` +
      `This will permanently remove:\n` +
      `• ${csvToDelete.totalRecords} records\n` +
      `• All categorizations and bucket assignments\n` +
      `• Dashboard data from this CSV\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setManagementLoading(true);
    try {
      // Delete from Supabase first
      const supabaseResult = await deleteCSVData(csvId);
      if (supabaseResult) {
        console.log('✅ CSV deleted from Supabase');
      }
      
      // Remove from localStorage
      const localSavedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      const updatedCSVs = localSavedCSVs.filter((csv: any) => csv.id !== csvId);
      localStorage.setItem('savedCSVs', JSON.stringify(updatedCSVs));
      
      // Refresh CSV data from database to ensure consistency
      await loadCSVs();
      
      // Clear selection if deleted CSV was selected
      if (selectedCSV?.id === csvId) {
        setSelectedCSV(null);
        setManagementBucketAssignments({});
        setManagementIncludedItems({});
      }
      
      // Trigger dashboard update to recalculate totals
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { 
          action: 'csv_deleted',
          csvId: csvId,
          fileName: csvToDelete.fileName
        } 
      }));
      
      console.log(`✅ CSV "${csvToDelete.fileName}" deleted successfully`);
      
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete CSV. Please try again.');
    } finally {
      setManagementLoading(false);
    }
  };

  const saveManagementChanges = async () => {
    if (!selectedCSV) return;
    
    setManagementSaving(true);
    try {
      const updatedCSV = {
        ...selectedCSV,
        accountCategories: editingCategories,
        bucketAssignments: managementBucketAssignments,
        tags: editingTags,
        includedItems: managementIncludedItems
      };
      
      // Update in Supabase
      await saveCSVData({
        id: updatedCSV.id,
        file_name: updatedCSV.fileName,
        file_type: updatedCSV.fileType,
        uploaded_at: updatedCSV.uploadedAt,
        total_records: updatedCSV.totalRecords,
        account_categories: updatedCSV.accountCategories,
        bucket_assignments: updatedCSV.bucketAssignments,
        tags: updatedCSV.tags,
        is_active: updatedCSV.isActive,
        preview_data: updatedCSV.previewData
      });
      
      // Update localStorage
      const localSavedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      const updatedLocalCSVs = localSavedCSVs.map((csv: any) => 
        csv.id === updatedCSV.id ? updatedCSV : csv
      );
      localStorage.setItem('savedCSVs', JSON.stringify(updatedLocalCSVs));
      
      // Update state
      setSavedCSVs(prev => prev.map(csv => csv.id === updatedCSV.id ? updatedCSV : csv));
      setSelectedCSV(updatedCSV);
      
      // Trigger dashboard update
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { action: 'csv_updated', csvId: updatedCSV.id } 
      }));
      
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setManagementSaving(false);
    }
  };

  const calculateCurrentSessionTotals = () => {
    const bucketTotals: Record<string, number> = {};
    
    if (!preview || preview.length === 0) return bucketTotals;
    
    console.log('🔍 Calculating current session totals for', preview.length, 'items');
    
    preview.forEach((item: any) => {
      const accountName = item.account_name;
      const category = accountCategories[accountName];
      const bucket = bucketAssignments[accountName] || getSuggestedBucket(accountName, category);
      const isIncluded = includedItems[accountName] !== false;
      
      if (!isIncluded || !item.time_series) return;
      
      // Calculate total for this account - use Total column if it exists, otherwise sum months
      let total = 0;
      
      // Check if there's a "Total" column in the time_series
      if (item.time_series.Total !== undefined && item.time_series.Total !== null) {
        total = typeof item.time_series.Total === 'number' ? item.time_series.Total : 0;
        console.log(`📊 ${accountName}: Using Total column = ${total}`);
      } else {
        // No Total column, sum up the monthly values (excluding Total)
        total = Object.entries(item.time_series).reduce((sum: number, [key, value]: [string, any]) => {
          // Skip Total column and any non-numeric values
          if (key.toLowerCase() === 'total' || typeof value !== 'number') {
            return sum;
          }
          return sum + value;
        }, 0);
        console.log(`📊 ${accountName}: Summed monthly values = ${total}`);
      }
      
      console.log(`📊 ${accountName}: bucket=${bucket}, total=${total}, included=${isIncluded}`);
      
      // Add to appropriate bucket
      if (bucket && bucket !== 'exclude') {
        bucketTotals[bucket] = (bucketTotals[bucket] || 0) + total;
      }
    });
    
    console.log('💰 Current session bucket totals:', bucketTotals);
    return bucketTotals;
  };

  const calculateCombinedBucketTotals = () => {
    const bucketTotals: Record<string, number> = {};
    
    console.log('🔍 Calculating combined bucket totals for', savedCSVs.length, 'saved CSVs');
    
    // Check if we're currently editing an existing CSV
    const isEditingExistingCSV = selectedCSV && preview && preview.length > 0;
    
    // Add totals from saved CSVs (but skip the one being edited to avoid double-counting)
    savedCSVs.forEach((csv, index) => {
      if (!csv.isActive) {
        console.log(`⏭️ Skipping inactive CSV ${index + 1}:`, csv.fileName || csv.file_name);
        return;
      }
      
      // Skip the CSV being edited to avoid double-counting
      if (isEditingExistingCSV && csv.id === selectedCSV.id) {
        console.log(`⏭️ Skipping CSV being edited to avoid double-counting:`, csv.fileName || csv.file_name);
        return;
      }
      
      console.log(`📊 Processing CSV ${index + 1}:`, csv.fileName || csv.file_name, 'with', csv.previewData?.length || csv.preview_data?.length || 0, 'records');
      
      const previewData = csv.previewData || csv.preview_data || [];
      const accountCategories = csv.accountCategories || csv.account_categories || {};
      const bucketAssignments = csv.bucketAssignments || csv.bucket_assignments || {};
      const includedItems = csv.includedItems || csv.included_items || {};
      
      previewData.forEach((item: any) => {
        const accountName = item.account_name;
        const category = accountCategories[accountName];
        const bucket = bucketAssignments[accountName];
        const isIncluded = includedItems[accountName] !== false;
        
        if (!isIncluded || !item.time_series) return;
        
        // Calculate total for this account - use Total column if it exists, otherwise sum months
        let total = 0;
        
        // Check if there's a "Total" column in the time_series
        if (item.time_series.Total !== undefined && item.time_series.Total !== null) {
          total = typeof item.time_series.Total === 'number' ? item.time_series.Total : 0;
          console.log(`📊 ${accountName}: Using Total column = ${total}`);
        } else {
          // No Total column, sum up the monthly values (excluding Total)
          total = Object.entries(item.time_series).reduce((sum: number, [key, value]: [string, any]) => {
            // Skip Total column and any non-numeric values
            if (key.toLowerCase() === 'total' || typeof value !== 'number') {
              return sum;
            }
            return sum + value;
          }, 0);
          console.log(`📊 ${accountName}: Summed monthly values = ${total}`);
        }
        
        // Add to appropriate bucket
        if (bucket && bucket !== 'exclude') {
          bucketTotals[bucket] = (bucketTotals[bucket] || 0) + total;
          console.log(`💰 Added ${total} to bucket ${bucket} from ${accountName}`);
        }
      });
    });
    
    // Add totals from current session (if preview exists)
    if (preview && preview.length > 0) {
      console.log('📊 Adding current session totals for', preview.length, 'preview items');
      const currentSessionTotals = calculateCurrentSessionTotals();
      Object.entries(currentSessionTotals).forEach(([bucket, total]) => {
        bucketTotals[bucket] = (bucketTotals[bucket] || 0) + total;
        console.log(`💰 Added ${total} to bucket ${bucket} from current session`);
      });
    }
    
    console.log('📈 Final bucket totals:', bucketTotals);
    return bucketTotals;
  };

  const calculateAllBucketedTotals = () => {
    const bucketTotals: Record<string, number> = {};
    
    savedCSVs.forEach(csv => {
      if (!csv.isActive) return;
      
      const previewData = csv.previewData || [];
      const accountCategories = csv.accountCategories || {};
      const bucketAssignments = csv.bucketAssignments || {};
      const includedItems = csv.includedItems || {};
      
      previewData.forEach((item: any) => {
        const accountName = item.account_name;
        const category = accountCategories[accountName];
        const bucket = bucketAssignments[accountName];
        const isIncluded = includedItems[accountName] !== false;
        
        if (!isIncluded || !item.time_series) return;
        
        // Calculate total for this account - use Total column if it exists, otherwise sum months
        let total = 0;
        
        // Check if there's a "Total" column in the time_series
        if (item.time_series.Total !== undefined && item.time_series.Total !== null) {
          total = typeof item.time_series.Total === 'number' ? item.time_series.Total : 0;
          console.log(`📊 ${accountName}: Using Total column = ${total}`);
        } else {
          // No Total column, sum up the monthly values (excluding Total)
          total = Object.entries(item.time_series).reduce((sum: number, [key, value]: [string, any]) => {
            // Skip Total column and any non-numeric values
            if (key.toLowerCase() === 'total' || typeof value !== 'number') {
              return sum;
            }
            return sum + value;
          }, 0);
          console.log(`📊 ${accountName}: Summed monthly values = ${total}`);
        }
        
        // Add to appropriate bucket
        if (bucket && bucketTotals[bucket] !== undefined) {
          bucketTotals[bucket] += total;
        } else if (category === 'income') {
          bucketTotals['total_income'] = (bucketTotals['total_income'] || 0) + total;
        } else if (category === 'expense') {
          bucketTotals['total_expense'] = (bucketTotals['total_expense'] || 0) + total;
        }
      });
    });
    
    // Calculate NOI
    bucketTotals['net_operating_income'] = (bucketTotals['total_income'] || 0) - (bucketTotals['total_expense'] || 0);
    
    return bucketTotals;
  };

  const allBucketTotals = calculateCombinedBucketTotals();

  // Bucket Management Functions
  const addTermToBucket = (bucketKey: string, term: string) => {
    if (!term.trim()) return;
    
    const trimmedTerm = term.trim().toLowerCase();
    setBucketTerms(prev => {
      const updated = { ...prev };
      if (!updated[bucketKey]) {
        updated[bucketKey] = [];
      }
      if (!updated[bucketKey].includes(trimmedTerm)) {
        updated[bucketKey] = [...updated[bucketKey], trimmedTerm];
      }
      return updated;
    });
    setNewTerm('');
  };

  const removeTermFromBucket = (bucketKey: string, term: string) => {
    setBucketTerms(prev => {
      const updated = { ...prev };
      if (updated[bucketKey]) {
        updated[bucketKey] = updated[bucketKey].filter(t => t !== term);
      }
      return updated;
    });
  };

  const saveBucketTerms = () => {
    localStorage.setItem('bucketTerms', JSON.stringify(bucketTerms));
    localStorage.setItem('customBuckets', JSON.stringify(customBuckets));
    console.log('💾 Bucket terms and custom buckets saved:', { bucketTerms, customBuckets });
  };

  const resetBucketTerms = () => {
    const defaultBucketTerms: Record<string, string[]> = {
      'total_operating_income': ['total operating income', 'total income', 'operating income', 'gross income'],
      'total_operating_expense': ['total operating expense', 'total expense', 'operating expense', 'total costs'],
      'net_operating_income': ['noi', 'net operating income', 'net income', 'operating profit'],
      'rental_income': ['rent', 'rental', 'tenant', 'lease', 'monthly rent', 'rental income'],
      'other_income': ['fee', 'charge', 'late fee', 'application fee', 'pet fee', 'parking fee'],
      'operating_expenses': ['operating', 'general', 'administrative', 'office', 'utilities'],
      'maintenance_expenses': ['maintenance', 'repair', 'fix', 'service', 'upkeep', 'renovation'],
      'management_expenses': ['management', 'admin', 'administrative', 'office', 'management fee'],
      'exclude': ['total', 'sum', 'grand total', 'subtotal', 'balance', 'equity']
    };
    setBucketTerms(defaultBucketTerms);
    localStorage.setItem('bucketTerms', JSON.stringify(defaultBucketTerms));
  };

  // Custom Bucket Management Functions
  const addCustomBucket = () => {
    if (!newBucketName.trim() || !newBucketDescription.trim()) return;
    
    const bucketKey = newBucketName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const bucketConfig = {
      label: newBucketName.trim(),
      description: newBucketDescription.trim(),
      color: getCategoryColor(newBucketCategory),
      icon: getCategoryIcon(newBucketCategory),
      category: newBucketCategory
    };
    
    setCustomBuckets(prev => ({
      ...prev,
      [bucketKey]: bucketConfig
    }));
    
    // Initialize empty terms for the new bucket
    setBucketTerms(prev => ({
      ...prev,
      [bucketKey]: []
    }));
    
    // Reset form
    setNewBucketName('');
    setNewBucketDescription('');
    setNewBucketCategory('income');
    setShowAddBucket(false);
  };

  const removeCustomBucket = (bucketKey: string) => {
    if (!window.confirm(`Are you sure you want to delete the "${customBuckets[bucketKey]?.label}" bucket? This will also remove all associated terms.`)) {
      return;
    }
    
    setCustomBuckets(prev => {
      const updated = { ...prev };
      delete updated[bucketKey];
      return updated;
    });
    
    setBucketTerms(prev => {
      const updated = { ...prev };
      delete updated[bucketKey];
      return updated;
    });
  };

  const deleteBucket = (bucketKey: string) => {
    const allBuckets = getAllBuckets();
    const bucketLabel = (allBuckets as any)[bucketKey]?.label || bucketKey;
    
    if (!window.confirm(`Are you sure you want to delete the "${bucketLabel}" bucket? This will also remove all associated terms.`)) {
      return;
    }
    
    // Remove from custom buckets if it's a custom bucket
    if (customBuckets[bucketKey]) {
      setCustomBuckets(prev => {
        const updated = { ...prev };
        delete updated[bucketKey];
        return updated;
      });
    }
    
    // Remove bucket terms
    setBucketTerms(prev => {
      const updated = { ...prev };
      delete updated[bucketKey];
      return updated;
    });
    
    // Remove bucket category override
    setBucketCategories(prev => {
      const updated = { ...prev };
      delete updated[bucketKey];
      return updated;
    });
    
    // Save changes to localStorage
    const updatedBucketTerms = { ...bucketTerms };
    delete updatedBucketTerms[bucketKey];
    localStorage.setItem('bucketTerms', JSON.stringify(updatedBucketTerms));
    
    const updatedCustomBuckets = { ...customBuckets };
    delete updatedCustomBuckets[bucketKey];
    localStorage.setItem('customBuckets', JSON.stringify(updatedCustomBuckets));
    
    const updatedBucketCategories = { ...bucketCategories };
    delete updatedBucketCategories[bucketKey];
    localStorage.setItem('bucketCategories', JSON.stringify(updatedBucketCategories));
  };

  const getAllBuckets = () => {
    const allBuckets = { ...DASHBOARD_BUCKETS, ...customBuckets };
    
    // Apply dynamic category overrides if they exist
    Object.keys(allBuckets).forEach(bucketKey => {
      if (bucketCategories[bucketKey]) {
        (allBuckets as any)[bucketKey] = {
          ...(allBuckets as any)[bucketKey],
          category: bucketCategories[bucketKey],
          color: getCategoryColor(bucketCategories[bucketKey])
        };
      }
    });
    
    return allBuckets;
  };

  const updateBucketCategory = (bucketKey: string, newCategory: string) => {
    setBucketCategories(prev => ({
      ...prev,
      [bucketKey]: newCategory
    }));
    
    // Save to localStorage
    localStorage.setItem('bucketCategories', JSON.stringify({
      ...bucketCategories,
      [bucketKey]: newCategory
    }));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'income':
        return 'bg-green-100 text-green-800';
      case 'expense':
        return 'bg-red-100 text-red-800';
      case 'cash':
        return 'bg-purple-100 text-purple-800';
      case 'net_income':
        return 'bg-blue-100 text-blue-800';
      case 'exclude':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'income':
        return '💰';
      case 'expense':
        return '💸';
      case 'cash':
        return '💳';
      case 'net_income':
        return '📊';
      case 'exclude':
        return '🚫';
      default:
        return '📋';
    }
  };

  const getDropdownOptionStyle = (category: string) => {
    switch (category) {
      case 'income':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expense':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cash':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'net_income':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'exclude':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const ColorCodedDropdown = ({ value, onChange, options, suggestions, className }: {
    value: string;
    onChange: (value: string) => void;
    options: Array<{ key: string; bucket: any }>;
    suggestions: string[];
    className?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchTerm('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    const filteredOptions = options.filter(({ bucket }) =>
      bucket.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.key === value);

    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-left px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center justify-between ${
            selectedOption ? getDropdownOptionStyle(selectedOption.bucket.category) : 'bg-white'
          }`}
        >
          <span>
            {selectedOption ? `${selectedOption.bucket.icon} ${selectedOption.bucket.label}` : 'Select bucket...'}
          </span>
          <span className="text-gray-400">⌄</span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search buckets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {filteredOptions.map(({ key, bucket }) => {
              const isSuggested = suggestions.includes(key);
              const bucketCategory = bucket.category || 'other';
              
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between ${getDropdownOptionStyle(bucketCategory)}`}
                >
                  <span>
                    {bucket.icon} {bucket.label}
                  </span>
                  {isSuggested && <span className="text-yellow-500">✨</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
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
    <div className="space-y-6">
      {/* CSV Import with AI Parser */}
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
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" 
            onClick={previewImport}
            disabled={loading}
          >
            {loading ? "Processing..." : "🔄 Refresh Preview"}
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
              <strong>✅ Auto-Processed:</strong> {preview.length} records loaded and analyzed automatically. 
              Review the AI categorization below and click "Save to Database" when ready.
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
            
            <div className="overflow-x-auto max-h-[36rem]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Include</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Account Name</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">🤖 AI Categorization</th>
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
                            <div className="text-xs text-gray-600">
                              🤖 AI: {(() => {
                                const suggestions = getBucketSuggestions(accountName, accountCategories[accountName] || row.ai_category);
                                const allBuckets = getAllBuckets();
                                return suggestions.slice(0, 2).map(key => allBuckets[key as keyof typeof allBuckets]?.label).join(', ');
                              })()}
                              </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b">
                          <div className="space-y-1">
                            {/* Bucket Selection Dropdown */}
                            {(() => {
                              const suggestions = getBucketSuggestions(accountName, accountCategories[accountName] || row.ai_category);
                                  const currentBucket = bucketAssignments[accountName] || getSuggestedBucket(accountName, accountCategories[accountName] || row.ai_category);
                              const allBuckets = getAllBuckets();
                              const options = Object.entries(allBuckets).map(([bucketKey, bucket]) => ({
                                key: bucketKey,
                                bucket
                              }));
                                  
                                  return (
                                <ColorCodedDropdown
                                  value={currentBucket}
                                  onChange={(value) => updateBucketAssignment(accountName, value)}
                                  options={options}
                                  suggestions={suggestions}
                                  className="w-full"
                                />
                              );
                            })()}
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
          
                {/* Real-Time Dashboard Impact Preview */}
                {preview && preview.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-sm border border-green-200">
                    <div className="px-6 py-4 border-b border-green-200">
                      <h3 className="text-lg font-semibold text-green-900">🔄 Real-Time Dashboard Impact</h3>
                      <p className="text-green-700 mt-1">Live preview of how your current CSV will affect dashboard totals</p>
                    </div>
                    
                    <div className="p-6">
                      {(() => {
                        const currentSessionTotals = calculateCurrentSessionTotals();
                        const combinedTotals = allBucketTotals;
                        
                        // Calculate income totals from current session only
                        const incomeItems = ['income_item', 'rental_income', 'other_income'].reduce((sum, key) => sum + (currentSessionTotals[key] || 0), 0);
                        const incomeTotal = currentSessionTotals['income_total'] || currentSessionTotals['total_income'] || currentSessionTotals['total_operating_income'] || 0;
                        
                        // Calculate expense totals from current session only
                        const expenseItems = ['expense_item', 'operating_expenses', 'maintenance_expenses', 'management_expenses'].reduce((sum, key) => sum + (currentSessionTotals[key] || 0), 0);
                        const expenseTotal = currentSessionTotals['expense_total'] || currentSessionTotals['total_expenses'] || currentSessionTotals['total_operating_expense'] || 0;
                        
                        // Check for mismatches
                        const incomeMismatch = Math.abs(incomeItems - incomeTotal) > 0.01;
                        const expenseMismatch = Math.abs(expenseItems - expenseTotal) > 0.01;
                        
                        console.log('🔍 Real-Time Impact Debug:', {
                          currentSessionTotals,
                          incomeItems,
                          incomeTotal,
                          expenseItems,
                          expenseTotal,
                          incomeMismatch,
                          expenseMismatch
                        });
                        
                        return (
                          <div className="space-y-6">
                            {/* Income Section */}
                            <div className="space-y-3">
                              <h4 className="text-md font-semibold text-green-800 flex items-center gap-2">
                                💰 Income Summary
                                {incomeMismatch && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                    ⚠️ Mismatch
                                  </span>
                                )}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Income Total */}
                                <div className="p-4 border-2 border-green-300 bg-green-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-600">📈</span>
                                      <span className="font-semibold text-green-800">Income Total</span>
                                    </div>
                                    {incomeTotal > 0 && (
                                      <span className="text-sm text-green-600 font-medium">
                                        +${incomeTotal.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-2xl font-bold text-green-900">
                                    ${(combinedTotals['income_total'] || combinedTotals['total_income'] || combinedTotals['total_operating_income'] || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-green-700 mt-1">Total (all CSVs)</div>
                                </div>
                                
                                {/* Income Items */}
                                <div className="p-4 border border-green-200 bg-green-25 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-600">💰</span>
                                      <span className="font-semibold text-green-800">Income Items</span>
                                    </div>
                                    {incomeItems > 0 && (
                                      <span className="text-sm text-green-600 font-medium">
                                        +${incomeItems.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-2xl font-bold text-green-900">
                                    ${incomeItems.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-green-700 mt-1">Sum of all income line items (this CSV)</div>
                                </div>
                              </div>
                              
                              {incomeMismatch && (
                                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                  <div className="flex items-center gap-1 text-amber-800">
                                    <span className="text-amber-600 text-xs">⚠️</span>
                                    <span className="font-medium text-xs">Income Mismatch Detected</span>
                                  </div>
                                  <p className="text-xs text-amber-700 mt-1">
                                    Income Total (${incomeTotal.toLocaleString()}) doesn't match Income Items (${incomeItems.toLocaleString()}). 
                                    Please edit your CSV data categorization to ensure totals match.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Expense Section */}
                            <div className="space-y-3">
                              <h4 className="text-md font-semibold text-red-800 flex items-center gap-2">
                                💸 Expense Summary
                                {expenseMismatch && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                    ⚠️ Mismatch
                                  </span>
                                )}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Expense Total */}
                                <div className="p-4 border-2 border-red-300 bg-red-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-red-600">📉</span>
                                      <span className="font-semibold text-red-800">Expense Total</span>
                                    </div>
                                    {expenseTotal > 0 && (
                                      <span className="text-sm text-red-600 font-medium">
                                        +${expenseTotal.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-2xl font-bold text-red-900">
                                    ${(combinedTotals['expense_total'] || combinedTotals['total_expenses'] || combinedTotals['total_operating_expense'] || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-red-700 mt-1">Total (all CSVs)</div>
                                </div>
                                
                                {/* Expense Items */}
                                <div className="p-4 border border-red-200 bg-red-25 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-red-600">💸</span>
                                      <span className="font-semibold text-red-800">Expense Items</span>
                                    </div>
                                    {expenseItems > 0 && (
                                      <span className="text-sm text-red-600 font-medium">
                                        +${expenseItems.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-2xl font-bold text-red-900">
                                    ${expenseItems.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-red-700 mt-1">Sum of all expense line items</div>
                                </div>
                              </div>
                              
                              {expenseMismatch && (
                                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                  <div className="flex items-center gap-1 text-amber-800">
                                    <span className="text-amber-600 text-xs">⚠️</span>
                                    <span className="font-medium text-xs">Expense Mismatch Detected</span>
                                  </div>
                                  <p className="text-xs text-amber-700 mt-1">
                                    Expense Total (${expenseTotal.toLocaleString()}) doesn't match Expense Items (${expenseItems.toLocaleString()}). 
                                    Please edit your CSV data categorization to ensure totals match.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Net Income & Cash Section */}
                            <div className="space-y-3">
                              <h4 className="text-md font-semibold text-blue-800">📊 Net Income & Cash</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Net Operating Income */}
                                <div className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-blue-600">📊</span>
                                      <span className="font-semibold text-blue-800">Net Operating Income</span>
                                    </div>
                                  </div>
                                  <div className="text-2xl font-bold text-blue-900">
                                    ${(combinedTotals['net_operating_income'] || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-blue-700 mt-1">Income - Expenses</div>
                                </div>
                                
                                {/* Cash Amount */}
                                <div className="p-4 border-2 border-purple-300 bg-purple-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-purple-600">💳</span>
                                      <span className="font-semibold text-purple-800">Cash Amount</span>
                                    </div>
                                    {(currentSessionTotals['cash_amount'] || 0) > 0 && (
                                      <span className="text-sm text-purple-600 font-medium">
                                        +${(currentSessionTotals['cash_amount'] || 0).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-2xl font-bold text-purple-900">
                                    ${(combinedTotals['cash_amount'] || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-purple-700 mt-1">Cash and cash equivalents</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Live Updates Notice */}
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2 text-blue-800">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium">Live Updates</span>
                              </div>
                              <p className="text-sm text-blue-700 mt-1">
                                These totals update automatically as you change bucket assignments or include/exclude items.
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
          
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

      {/* CSV Files Management */}
      <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">CSV Files Management</h3>
              <p className="text-gray-600 text-sm">Edit categorizations and manage individual CSV files</p>
    </div>
            <div className="flex gap-2">
              <button
                onClick={loadCSVs}
                disabled={managementLoading}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-xs font-medium flex items-center gap-1"
                title="Refresh CSV list from backend"
              >
                <RefreshCw className={`w-3 h-3 ${managementLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => {
                  console.log('🔍 DEBUG: Current savedCSVs state:', savedCSVs);
                  console.log('🔍 DEBUG: LocalStorage savedCSVs:', JSON.parse(localStorage.getItem('savedCSVs') || '[]'));
                  console.log('🔍 DEBUG: All bucket totals:', calculateCombinedBucketTotals());
                }}
                className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs font-medium"
                title="Debug CSV data"
              >
                Debug
              </button>
            </div>
          </div>
          
          {/* CSV List */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Saved CSVs ({savedCSVs.length})</h4>
            
            {managementLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Loading CSVs...</p>
              </div>
            ) : savedCSVs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <Database className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-1">No CSV files found</p>
                <p className="text-xs text-gray-400">Upload a CSV file above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedCSVs.map((csv) => (
                <div key={csv.id} className={`p-3 border rounded-lg ${csv.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-gray-500" />
                      <div>
                        <h5 className="font-medium text-gray-900 text-sm">{csv.fileName}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(csv.fileType)}`}>
                            {csv.fileType.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">{csv.totalRecords} records</span>
                          <span className={`w-2 h-2 rounded-full ${csv.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePreviewCSV(csv)}
                        className={`p-2 rounded-md transition-colors ${
                          selectedCSV?.id === csv.id && managementPreviewMode 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                            : 'text-purple-600 hover:bg-purple-100'
                        }`}
                        title="Preview spreadsheet data"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditCSV(csv)}
                        className={`p-2 rounded-md transition-colors ${
                          selectedCSV?.id === csv.id && !managementPreviewMode 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'text-blue-600 hover:bg-blue-100'
                        }`}
                        title="Edit categorizations and buckets"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleCSVActive(csv.id)}
                        className={`p-2 rounded-md transition-colors ${
                          csv.isActive 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        disabled={managementLoading}
                        title={csv.isActive ? 'Deactivate CSV' : 'Activate CSV'}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCSV(csv.id)}
                        className="p-2 rounded-md text-red-600 hover:bg-red-100 transition-colors"
                        disabled={managementLoading}
                        title="Delete CSV"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Uploaded: {new Date(csv.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Compact Header Mapping */}
      {!!headers.length && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-gray-700">🔗 Header Mapping</h5>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">auto</span>
    </div>
          <div className="text-xs text-gray-600 mb-2">
            🤖 AI automatically mapped {headers.length} headers
          </div>
          <div className="max-h-32 overflow-y-auto">
            <div className="space-y-1">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded border">
                  <span className="font-medium text-gray-800 truncate max-w-xs" title={header}>
                    {header}
                  </span>
                  <span className="text-green-600 flex items-center gap-1">
                    <span className="text-green-500">✔</span>
                    {header.toLowerCase().includes('account') || header.toLowerCase().includes('name') ? 
                      'Auto-categorized by AI' : 'Auto-mapped to time-series'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSV Editor Section */}
      {selectedCSV && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {managementPreviewMode ? '👁️ Preview Mode' : '✏️ Edit Mode'}: {selectedCSV.fileName}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getFileTypeColor(selectedCSV.fileType)}`}>
                  {selectedCSV.fileType.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">{selectedCSV.totalRecords} records</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCSV(null)}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs font-medium"
                >
                  Close
                </button>
                {!managementPreviewMode && (
                  <button
                    onClick={() => {
                      // Save changes logic here
                      console.log('💾 Saving changes for:', selectedCSV.fileName);
                    }}
                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Show different content based on mode */}
            {managementPreviewMode ? (
              // Preview Mode - Visual Spreadsheet
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Spreadsheet Preview</h4>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Account Name</th>
                          {(() => {
                            // Get headers from the first row with time_series data
                            const headerRow = selectedCSV.previewData.find((row: any) => row.time_series && Object.keys(row.time_series).length > 0);
                            return headerRow?.time_series ? Object.keys(headerRow.time_series).map((key) => (
                              <th key={key} className="px-3 py-2 text-right font-medium text-gray-700 border-b">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </th>
                            )) : [];
                          })()}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedCSV.previewData.slice(0, 20).map((row: any, index: number) => {
                          const timeSeries = row.time_series || {};
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900 border-b font-medium">
                                {row.account_name || '-'}
                              </td>
                              {(() => {
                                const headerRow = selectedCSV.previewData.find((row: any) => row.time_series && Object.keys(row.time_series).length > 0);
                                const headerKeys = headerRow?.time_series ? Object.keys(headerRow.time_series) : [];
                                
                                return headerKeys.map((month, cellIndex) => (
                                  <td key={cellIndex} className="px-3 py-2 text-gray-900 border-b text-right font-mono text-xs">
                                    {timeSeries[month] !== null && timeSeries[month] !== undefined ? 
                                      new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0
                                      }).format(timeSeries[month]) : '-'}
                                  </td>
                                ));
                              })()}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {selectedCSV.previewData.length > 20 && (
                    <div className="px-3 py-2 bg-gray-50 text-sm text-gray-600 border-t">
                      Showing first 20 rows of {selectedCSV.previewData.length} total records
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Edit Mode - Show message that data is being edited in main interface
              <div className="text-center py-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="text-blue-600 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">✏️ Editing in Main Interface</h4>
                  <p className="text-blue-700 mb-4">
                    The CSV data with categorization interface is now active above. You can edit bucket assignments, 
                    include/exclude items, and make changes directly in the main categorization table.
                  </p>
                  <div className="text-sm text-blue-600">
                    <p>• Use the categorization table above to edit your data</p>
                    <p>• Changes will be saved when you click "Save to Database"</p>
                    <p>• Close this panel when you're done editing</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-width sections below */}
      <div className="space-y-6">
        {/* AI Bucket Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">🤖 AI Bucket Management</h2>
                <p className="text-gray-600 mt-1">Customize how the AI parses CSV files and assigns buckets</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowBucketManagement(!showBucketManagement)}
                  className={`px-3 py-1.5 rounded text-xs font-medium ${
                    showBucketManagement 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {showBucketManagement ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={saveBucketTerms}
                  className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAddBucket(!showAddBucket)}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-medium"
                >
                  {showAddBucket ? 'Cancel' : 'Add Bucket'}
                </button>
                <button
                  onClick={resetBucketTerms}
                  className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {showBucketManagement && (
            <div className="p-6">
              {/* Add New Bucket Form */}
              {showAddBucket && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">➕ Add New Bucket</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bucket Name</label>
                      <input
                        type="text"
                        value={newBucketName}
                        onChange={(e) => setNewBucketName(e.target.value)}
                        placeholder="e.g., Marketing Expenses"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={newBucketCategory}
                        onChange={(e) => setNewBucketCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                        <option value="net_income">Net Income</option>
                        <option value="cash">Cash</option>
                        <option value="exclude">Exclude</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={newBucketDescription}
                      onChange={(e) => setNewBucketDescription(e.target.value)}
                      placeholder="Brief description of what this bucket represents"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addCustomBucket}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-medium"
                    >
                      Add Bucket
                    </button>
                    <button
                      onClick={() => setShowAddBucket(false)}
                      className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Usage Instructions */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">💡 How It Works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Add terms:</strong> Type a term and click "Add" to include it in the bucket</li>
                  <li>• <strong>Remove terms:</strong> Click "Remove" to delete unwanted terms</li>
                  <li>• <strong>Delete buckets:</strong> Click the 🗑️ trash icon to remove entire buckets</li>
                  <li>• <strong>Adjust categories:</strong> Change bucket category to control color coding (Income=Green, Expense=Red, Cash=Purple)</li>
                  <li>• <strong>Case insensitive:</strong> Terms are automatically converted to lowercase</li>
                  <li>• <strong>Partial matching:</strong> AI looks for terms anywhere in account names</li>
                  <li>• <strong>Priority order:</strong> First matching bucket wins (order matters)</li>
                  <li>• <strong>Save changes:</strong> Click "Save Changes" to persist your settings</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Bucket Term Definitions</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add or remove terms for each bucket. The AI will use these terms to automatically categorize CSV account names.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(getAllBuckets()).map(([bucketKey, bucket]) => (
                    <div key={bucketKey} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${bucket.color}`}>
                          {bucket.icon} {bucket.label}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {bucketTerms[bucketKey]?.length || 0} terms
                          </span>
                          <button
                            onClick={() => deleteBucket(bucketKey)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                            title="Delete bucket"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      {/* Category Selector */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                        <select
                          value={bucketCategories[bucketKey] || bucket.category}
                          onChange={(e) => updateBucketCategory(bucketKey, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="income">💰 Income (Green)</option>
                          <option value="expense">💸 Expense (Red)</option>
                          <option value="cash">💳 Cash (Purple)</option>
                          <option value="net_income">📊 Net Income (Blue)</option>
                          <option value="exclude">🚫 Exclude (Gray)</option>
                        </select>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{bucket.description}</p>
                      
                      {/* Add new term */}
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={editingBucket === bucketKey ? newTerm : ''}
                          onChange={(e) => {
                            setEditingBucket(bucketKey);
                            setNewTerm(e.target.value);
                          }}
                          placeholder="Add new term..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addTermToBucket(bucketKey, newTerm);
                            }
                          }}
                        />
                        <button
                          onClick={() => addTermToBucket(bucketKey, newTerm)}
                          className="px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          Add
                        </button>
                      </div>
                      
                      {/* Existing terms */}
                      <div className="space-y-2">
                        {bucketTerms[bucketKey]?.map((term, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                            <span className="text-sm text-gray-700">{term}</span>
                            <button
                              onClick={() => removeTermFromBucket(bucketKey, term)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        )) || (
                          <div className="text-sm text-gray-500 italic">No terms defined</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Bucket Totals Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">📊 Dashboard Bucket Totals Summary</h3>
            <p className="text-gray-600 mt-1">Combined totals from all saved CSVs and current session</p>
          </div>
          
          <div className="p-6">
            {(() => {
              const combinedTotals = allBucketTotals;
              
              // Calculate income totals
              const incomeItems = ['income_item', 'rental_income', 'other_income'].reduce((sum, key) => sum + (combinedTotals[key] || 0), 0);
              const incomeTotal = combinedTotals['income_total'] || combinedTotals['total_income'] || combinedTotals['total_operating_income'] || 0;
              
              // Calculate expense totals
              const expenseItems = ['expense_item', 'operating_expenses', 'maintenance_expenses', 'management_expenses'].reduce((sum, key) => sum + (combinedTotals[key] || 0), 0);
              const expenseTotal = combinedTotals['expense_total'] || combinedTotals['total_expenses'] || combinedTotals['total_operating_expense'] || 0;
              
              // Check for mismatches
              const incomeMismatch = Math.abs(incomeItems - incomeTotal) > 0.01;
              const expenseMismatch = Math.abs(expenseItems - expenseTotal) > 0.01;
              
              return (
                <div className="space-y-6">
                  {/* Income Section */}
                  <div className="space-y-3">
                    <h4 className="text-md font-semibold text-green-800 flex items-center gap-2">
                      💰 Income Summary
                      {incomeMismatch && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          ⚠️ Mismatch
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Income Total */}
                      <div className="p-4 border-2 border-green-300 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-green-600">📈</span>
                          <span className="font-semibold text-green-800">Income Total</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">
                          ${incomeTotal.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-700 mt-1">Total income calculations</div>
                      </div>
                      
                      {/* Income Items */}
                      <div className="p-4 border border-green-200 bg-green-25 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-green-600">💰</span>
                          <span className="font-semibold text-green-800">Income Items</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">
                          ${incomeItems.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-700 mt-1">Sum of all income line items</div>
                      </div>
                    </div>
                    
                    {incomeMismatch && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-1 text-amber-800">
                          <span className="text-amber-600 text-xs">⚠️</span>
                          <span className="font-medium text-xs">Income Mismatch Detected</span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1">
                          Income Total (${incomeTotal.toLocaleString()}) doesn't match Income Items (${incomeItems.toLocaleString()}). 
                          Please review your CSV categorizations.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Expense Section */}
                  <div className="space-y-3">
                    <h4 className="text-md font-semibold text-red-800 flex items-center gap-2">
                      💸 Expense Summary
                      {expenseMismatch && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          ⚠️ Mismatch
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Expense Total */}
                      <div className="p-4 border-2 border-red-300 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-red-600">📉</span>
                          <span className="font-semibold text-red-800">Expense Total</span>
                        </div>
                        <div className="text-2xl font-bold text-red-900">
                          ${expenseTotal.toLocaleString()}
                        </div>
                        <div className="text-xs text-red-700 mt-1">Total expense calculations</div>
                      </div>
                      
                      {/* Expense Items */}
                      <div className="p-4 border border-red-200 bg-red-25 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-red-600">💸</span>
                          <span className="font-semibold text-red-800">Expense Items</span>
                        </div>
                        <div className="text-2xl font-bold text-red-900">
                          ${expenseItems.toLocaleString()}
                        </div>
                        <div className="text-xs text-red-700 mt-1">Sum of all expense line items</div>
                      </div>
                    </div>
                    
                    {expenseMismatch && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-1 text-amber-800">
                          <span className="text-amber-600 text-xs">⚠️</span>
                          <span className="font-medium text-xs">Expense Mismatch Detected</span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1">
                          Expense Total (${expenseTotal.toLocaleString()}) doesn't match Expense Items (${expenseItems.toLocaleString()}). 
                          Please review your CSV categorizations.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Net Income & Cash Section */}
                  <div className="space-y-3">
                    <h4 className="text-md font-semibold text-blue-800">📊 Net Income & Cash</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Net Operating Income */}
                      <div className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-blue-600">📊</span>
                          <span className="font-semibold text-blue-800">Net Operating Income</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">
                          ${(combinedTotals['net_operating_income'] || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-700 mt-1">Income - Expenses</div>
                      </div>
                      
                      {/* Cash Amount */}
                      <div className="p-4 border-2 border-purple-300 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-purple-600">💳</span>
                          <span className="font-semibold text-purple-800">Cash Amount</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-900">
                          ${(combinedTotals['cash_amount'] || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-purple-700 mt-1">Cash and cash equivalents</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}

