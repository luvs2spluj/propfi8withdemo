import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Save, Loader } from 'lucide-react';
import Papa from 'papaparse';
import { saveCSVData, getCSVData, deleteCSVData, saveAILearning, getAILearning } from '../lib/supabase';
import { userAuthService } from '../services/userAuthService';

// Types
interface FieldSuggestion {
  field: string;
  confidence: number;
  suggestions: string[];
}

type FileType = 'cash_flow' | 'balance_sheet' | 'rent_roll' | 'income_statement' | 'general';

interface CSVRecord {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  totalRecords: number;
  accountCategories: Record<string, string>;
  bucketAssignments: Record<string, string>;
  includedItems: Record<string, boolean>;
  tags: Record<string, string[]>;
  isActive: boolean;
  previewData: any[];
}

// Main component
export default function CSVImportFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('general');
  const [headers, setHeaders] = useState<string[]>([]);
  const [samples, setSamples] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, FieldSuggestion>>({});
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLearningData, setAiLearningData] = useState<any[]>([]);
  const [includedItems, setIncludedItems] = useState<Record<string, boolean>>({});
  const [bucketAssignments, setBucketAssignments] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  
  // Multi-select functionality
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkToolbar, setShowBulkToolbar] = useState(false);
  
  // Bulk assignment functions
  const selectAllItems = () => {
    const allSelected: Record<string, boolean> = {};
    preview.forEach(item => {
      allSelected[item.account_name] = true;
    });
    setIncludedItems(allSelected);
  };

  const deselectAllItems = () => {
    const noneSelected: Record<string, boolean> = {};
    preview.forEach(item => {
      noneSelected[item.account_name] = false;
    });
    setIncludedItems(noneSelected);
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

  const bulkAssignBucket = (bucketId: string) => {
    setBucketAssignments(prev => {
      const updated = { ...prev };
      preview.forEach(item => {
        if (includedItems[item.account_name]) {
          updated[item.account_name] = bucketId;
        }
      });
      return updated;
    });
  };
  
  // CSV Management state
  const [savedCSVs, setSavedCSVs] = useState<any[]>([]);
  const [selectedCSV, setSelectedCSV] = useState<any | null>(null);
  const [managementPreviewMode, setManagementPreviewMode] = useState(false);
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementIncludedItems, setManagementIncludedItems] = useState<Record<string, boolean>>({});
  const [managementBucketAssignments, setManagementBucketAssignments] = useState<Record<string, string>>({});
  const [accountCategories, setAccountCategories] = useState<Record<string, string>>({});
  const [editingCategories, setEditingCategories] = useState<Record<string, string>>({});
  const [editingBuckets, setEditingBuckets] = useState<Record<string, string>>({});
  const [editingTags, setEditingTags] = useState<Record<string, string[]>>({});
  const [showManagementPreview, setShowManagementPreview] = useState(false);
  
  // Bucket Management state
  const [bucketTerms, setBucketTerms] = useState<Record<string, string[]>>({});
  const [showBucketManagement, setShowBucketManagement] = useState(true);
  const [customBuckets, setCustomBuckets] = useState<Record<string, any>>({});
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [showBucketPreview, setShowBucketPreview] = useState(false);
  const [newBucketName, setNewBucketName] = useState<string>('');
  const [newBucketDescription, setNewBucketDescription] = useState<string>('');
  const [newBucketCategory, setNewBucketCategory] = useState<string>('income');
  const [bucketCategories, setBucketCategories] = useState<Record<string, string>>({});
  const [newTerm, setNewTerm] = useState<string>('');

  // Load AI learning data when file type changes
  useEffect(() => {
    const loadAILearning = async () => {
      if (fileType && fileType !== 'general') {
        try {
          console.log('🧠 Loading AI learning data for file type:', fileType);
          const currentUser = userAuthService.getCurrentUser();
          const userId = currentUser?.id;
          const learningData = await getAILearning(fileType, userId);
          
          // Convert object to array format expected by the component
          const dataArray = Object.entries(learningData).map(([account_name, user_category]) => ({
            account_name,
            user_category,
            file_type: fileType
          }));
          setAiLearningData(dataArray);
          
          console.log('🧠 AI learning data loaded:', dataArray.length, 'entries');
        } catch (error) {
          console.warn('Failed to load AI learning data in useEffect:', error);
          setAiLearningData([]);
        }
      }
    };
    
    loadAILearning();
  }, [fileType]);

  // Load CSVs on component mount
  useEffect(() => {
    loadCSVs();
  }, []);

  // Load CSV data from localStorage and Supabase
  const loadCSVs = async () => {
    try {
      // Try to get data from Supabase first, filtered by current user
      const currentUser = userAuthService.getCurrentUser();
      const userId = currentUser?.id;
      const supabaseCSVs = await getCSVData(userId);
      
      if (supabaseCSVs && supabaseCSVs.length > 0) {
        console.log('📊 Loaded CSVs from Supabase:', supabaseCSVs.length);
        setSavedCSVs(supabaseCSVs);
        
        // Also update localStorage to keep it in sync
        localStorage.setItem('savedCSVs', JSON.stringify(supabaseCSVs));
      } else {
        // Fallback to localStorage if Supabase is empty or fails
        const localCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
        console.log('📊 Loaded CSVs from localStorage:', localCSVs.length);
        setSavedCSVs(localCSVs);
      }
    } catch (error) {
      console.error('Error loading CSVs:', error);
      // Fallback to localStorage on error
      const localCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      setSavedCSVs(localCSVs);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile && uploadedFile.type === 'text/csv') {
      setFile(uploadedFile);
      setError(null);
      setSaved(false);
      setHasPreviewed(false);
      setPreview([]);
      setAccountCategories({});
      setBucketAssignments({});
      setIncludedItems({});
      
      // Parse CSV headers
      Papa.parse(uploadedFile, {
        header: true,
        preview: 5,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const firstRow = results.data[0] as any;
            setHeaders(Object.keys(firstRow));
            setSamples(results.data.slice(0, 3).map(row => Object.values(row as any)));
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
        }
      });
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const processCSV = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`);
            setLoading(false);
            return;
          }

          const data = results.data as any[];
          console.log('📊 Parsed CSV data:', data.length, 'rows');

          // Process the data for time series analysis
          const processedData = processTimeSeriesData(data);
          console.log('📊 Processed time series data:', processedData.length, 'accounts');

          setPreview(processedData);
          setHasPreviewed(true);

          // Initialize included items (all true by default)
          const initialIncludedItems: Record<string, boolean> = {};
          processedData.forEach(item => {
            initialIncludedItems[item.account_name] = true;
          });
          setIncludedItems(initialIncludedItems);

          // Try AI categorization if backend is available
          try {
            console.log('🤖 Attempting AI categorization...');
            const API = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';
            const response = await fetch(`${API}/api/categorize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                csv_data: processedData,
                file_type: fileType
              })
            });

            if (response.ok) {
              const aiCategories = await response.json();
              console.log('🤖 AI categorization successful:', Object.keys(aiCategories).length, 'categories');
              setAccountCategories(aiCategories);
              
              // Generate bucket assignments based on AI categories
              const bucketAssignments: Record<string, string> = {};
              Object.entries(aiCategories).forEach(([accountName, category]) => {
                bucketAssignments[accountName] = getSuggestedBucket(accountName, category as string);
              });
              setBucketAssignments(bucketAssignments);
            } else {
              throw new Error(`AI service responded with ${response.status}`);
            }
          } catch (aiError) {
            console.warn('🤖 AI categorization failed, using manual categorization:', aiError);
            
            // Fallback to manual categorization
            const manualCategories: Record<string, string> = {};
            const manualBuckets: Record<string, string> = {};
            
            processedData.forEach(item => {
              const category = categorizeAccount(item.account_name);
              manualCategories[item.account_name] = category;
              manualBuckets[item.account_name] = getSuggestedBucket(item.account_name, category);
            });
            
            setAccountCategories(manualCategories);
            setBucketAssignments(manualBuckets);
          }

          setLoading(false);
        },
        error: (error) => {
          setError(`Error processing CSV: ${error.message}`);
          setLoading(false);
        }
      });
    } catch (error) {
      setError(`Unexpected error: ${error}`);
      setLoading(false);
    }
  };

  // Process CSV data for time series analysis
  const processTimeSeriesData = (data: any[]) => {
    const accountMap = new Map();
    
    data.forEach(row => {
      // Handle different possible column names
      const accountName = row['Account Name'] || row['Account'] || row['account_name'] || row['account'] || 'Unknown Account';
      const date = row['Date'] || row['date'] || row['Month'] || row['month'] || 'Unknown Date';
      const amount = parseFloat(row['Amount'] || row['amount'] || row['Value'] || row['value'] || '0');
      
      if (!accountMap.has(accountName)) {
        accountMap.set(accountName, {
          account_name: accountName,
          time_series: {},
          total: 0
        });
      }
      
      const account = accountMap.get(accountName);
      account.time_series[date] = (account.time_series[date] || 0) + amount;
      account.total += amount;
    });
    
    return Array.from(accountMap.values());
  };

  // Simple categorization logic
  const categorizeAccount = (accountName: string): string => {
    const name = accountName.toLowerCase();
    
    if (name.includes('income') || name.includes('revenue') || name.includes('rent') || name.includes('rental')) {
      return 'income';
    } else if (name.includes('expense') || name.includes('cost') || name.includes('payment')) {
      return 'expense';
    } else if (name.includes('maintenance') || name.includes('repair') || name.includes('service')) {
      return 'maintenance_cost';
    } else if (name.includes('utilities') || name.includes('electric') || name.includes('water') || name.includes('gas')) {
      return 'utilities_cost';
    } else if (name.includes('insurance') || name.includes('premium')) {
      return 'insurance_cost';
    } else if (name.includes('tax') || name.includes('property tax')) {
      return 'property_tax';
    } else {
      return 'other';
    }
  };

  // Get suggested bucket based on account name and category
  const getSuggestedBucket = (accountName: string, category: string): string => {
    const name = accountName.toLowerCase();
    
    // Check for specific patterns first
    if (name.includes('total income') || name === 'income' || name === 'total revenue') {
      return 'total_income';
    } else if (name.includes('total expense') || name === 'expenses' || name === 'total costs') {
      return 'total_expense';
    } else if (name.includes('net operating income') || name.includes('noi')) {
      return 'net_operating_income';
    }
    
    // Then check by category
    switch (category) {
      case 'income':
        return 'income_item';
      case 'expense':
        return 'expense_item';
      case 'maintenance_cost':
        return 'maintenance_cost';
      case 'utilities_cost':
        return 'utilities_cost';
      case 'insurance_cost':
        return 'insurance_cost';
      case 'property_tax':
        return 'property_tax';
      default:
        return 'other_item';
    }
  };

  // Update bucket assignment for an account
  const updateBucketAssignment = async (accountName: string, bucket: string) => {
    setBucketAssignments(prev => ({
      ...prev,
      [accountName]: bucket
    }));
    
    // Save to AI learning
    try {
      const currentUser = userAuthService.getCurrentUser();
      const userId = currentUser?.id;
      await saveAILearning(fileType, accountName, bucket, userId);
      console.log(`🧠 Learned: ${accountName} → ${bucket}`);
    } catch (error) {
      console.warn('Failed to save AI learning:', error);
    }
  };

  // Save bucket assignments to AI learning
  const saveBucketAssignmentsToAI = async (csvRecord: CSVRecord) => {
    try {
      console.log('🧠 Saving bucket assignments to AI learning...');
      
      for (const [accountName, bucket] of Object.entries(csvRecord.bucketAssignments)) {
        const category = csvRecord.accountCategories[accountName] || 'other';
        if (bucket && bucket !== 'other_item') {
          const currentUser = userAuthService.getCurrentUser();
          const userId = currentUser?.id;
          await saveAILearning(csvRecord.fileType, accountName, bucket, userId);
          console.log(`🧠 Learned: ${accountName} → ${bucket} (${category})`);
        }
      }
      
      console.log('✅ Bucket assignments saved to AI learning');
    } catch (error) {
      console.error('❌ Error saving bucket assignments to AI:', error);
    }
  };

  const saveToDatabase = async () => {
    console.log('🔍 saveToDatabase called with:', {
      previewLength: preview.length,
      hasFile: !!file,
      fileName: file?.name
    });
    
    if (!preview.length || !file) {
      console.error('❌ saveToDatabase failed: Missing preview data or file');
      setError('Missing preview data or file. Please upload and process a CSV first.');
      return;
    }
    
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

      // Keep all items for edit mode, but filter for preview mode
      const includedPreviewData = preview; // Keep all items
      
      const includedAccountCategories: Record<string, string> = {};
      Object.entries(accountCategories).forEach(([accountName, category]) => {
        includedAccountCategories[accountName] = category; // Keep all categories
      });

      let csvRecord: any;
      
      if (selectedCSV) {
        // Update existing CSV record
        csvRecord = {
          ...selectedCSV,
          totalRecords: preview.length, // Use original preview length
          accountCategories: includedAccountCategories,
          bucketAssignments: generateBucketAssignments(),
          includedItems: includedItems,
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
          totalRecords: preview.length, // Use original preview length
          accountCategories: includedAccountCategories,
          bucketAssignments: generateBucketAssignments(),
          includedItems: includedItems,
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
      try {
        const currentUser = userAuthService.getCurrentUser();
        console.log('🔍 Current user for save:', {
          hasUser: !!currentUser,
          userId: currentUser?.id,
          userEmail: currentUser?.emailAddresses?.[0]?.emailAddress
        });
        
        if (currentUser) {
          console.log('💾 Saving to Supabase with user ID:', currentUser.id);
          const supabaseResult = await saveCSVData({
            id: csvRecord.id,
            file_name: csvRecord.fileName,
            file_type: csvRecord.fileType,
            uploaded_at: csvRecord.uploadedAt,
            total_records: csvRecord.totalRecords,
            account_categories: csvRecord.accountCategories,
            bucket_assignments: csvRecord.bucketAssignments,
            included_items: csvRecord.includedItems,
            tags: csvRecord.tags,
            is_active: csvRecord.isActive,
            preview_data: csvRecord.previewData
          }, currentUser.id);
          
          if (supabaseResult) {
            console.log('✅ CSV data saved to Supabase successfully');
          }
        } else {
          console.warn('⚠️ No authenticated user found, saving to localStorage only');
        }
      } catch (error) {
        console.warn('⚠️ Failed to save to Supabase, using localStorage only:', error);
      }

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
      console.log("✅ Data saved to database:", preview.length, "records");
      
      // Save AI learning for bucket assignments
      try {
        console.log('🧠 Saving bucket assignments to AI learning...');
        await saveBucketAssignmentsToAI(csvRecord);
        console.log('✅ AI learning saved successfully');
      } catch (aiError) {
        console.warn('⚠️ AI learning save failed (non-critical):', aiError);
      }
      
      // Close the edit window after saving
      setPreview([]);
      setHasPreviewed(false);
      setSelectedCSV(null);
      setAccountCategories({});
      setBucketAssignments({});
      setIncludedItems({});
      setFile(null);
      
      // Refresh the CSV list to show updated data
      await loadCSVs();
      
      // Show success message
      setTimeout(() => {
        alert(`CSV saved successfully! Go to "CSV Management" tab to review and adjust categorizations.`);
      }, 500);
      
    } catch (error: any) {
      console.error("❌ Save error:", error);
      setError(`Save failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate bucket assignments
  const generateBucketAssignments = (): Record<string, string> => {
    const assignments: Record<string, string> = {};
    
    console.log('🔧 Generating bucket assignments for accounts:', Object.keys(accountCategories));
    console.log('🔧 Current bucket assignments:', bucketAssignments);
    
    // Use existing bucket assignments first, then fall back to auto-generation
    for (const [accountName, category] of Object.entries(accountCategories)) {
      // Check if user has manually assigned a bucket
      if (bucketAssignments[accountName]) {
        assignments[accountName] = bucketAssignments[accountName];
        console.log(`🪣 ${accountName} → ${bucketAssignments[accountName]} (existing assignment)`);
        continue;
      }
      
      // Auto-generate bucket assignment for new accounts only
      const suggestedBucket = getSuggestedBucket(accountName, category);
      assignments[accountName] = suggestedBucket;
      console.log(`🤖 ${accountName} → ${suggestedBucket} (auto-generated for new account)`);
    }
    
    console.log('🔧 Final bucket assignments:', assignments);
    return assignments;
  };

  // Generate tags based on account names
  const generateTags = (): Record<string, string[]> => {
    const tags: Record<string, string[]> = {};
    
    for (const accountName of Object.keys(accountCategories)) {
      const accountLower = accountName.toLowerCase();
      const accountTags: string[] = [];
      
      // Add category-based tags
      if (accountLower.includes('income') || accountLower.includes('revenue')) {
        accountTags.push('income', 'revenue');
      }
      if (accountLower.includes('expense') || accountLower.includes('cost')) {
        accountTags.push('expense', 'cost');
      }
      if (accountLower.includes('maintenance') || accountLower.includes('repair')) {
        accountTags.push('maintenance', 'repair');
      }
      if (accountLower.includes('utilities')) {
        accountTags.push('utilities');
      }
      if (accountLower.includes('insurance')) {
        accountTags.push('insurance');
      }
      if (accountLower.includes('tax')) {
        accountTags.push('tax');
      }
      
      tags[accountName] = accountTags;
    }
    
    return tags;
  };

  // Render the component
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">CSV Import & Management</h2>
        
        {/* File Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload CSV File
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as FileType)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="general">General</option>
              <option value="cash_flow">Cash Flow</option>
              <option value="balance_sheet">Balance Sheet</option>
              <option value="rent_roll">Rent Roll</option>
              <option value="income_statement">Income Statement</option>
            </select>
          </div>
        </div>

        {/* Process Button */}
        {file && !hasPreviewed && (
          <div className="mb-6">
            <button
              onClick={processCSV}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span>{loading ? 'Processing...' : 'Process CSV'}</span>
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {hasPreviewed && preview.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Data Preview ({preview.length} accounts)
              </h3>
              <button
                onClick={saveToDatabase}
                disabled={loading || saved}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{loading ? 'Saving...' : saved ? 'Saved' : 'Save to Database'}</span>
              </button>
            </div>

            {/* Bulk Selection Controls */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
              <h4 className="text-lg font-semibold mb-3">📋 Bulk Selection Controls</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={selectAllItems}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm hover:bg-green-200"
                >
                  ✅ Select All Items
                </button>
                <button
                  onClick={deselectAllItems}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm hover:bg-red-200"
                >
                  ❌ Deselect All Items
                </button>
                <button
                  onClick={() => selectByCategory('income')}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm hover:bg-blue-200"
                >
                  💰 Select All Income
                </button>
                <button
                  onClick={() => selectByCategory('expense')}
                  className="px-3 py-1 bg-orange-100 text-orange-800 rounded-md text-sm hover:bg-orange-200"
                >
                  💸 Select All Expenses
                </button>
              </div>
              
              {/* Bulk Bucket Assignment */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700">Bulk Assign Bucket:</span>
                <button
                  onClick={() => bulkAssignBucket('total_income')}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm hover:bg-green-200"
                >
                  💰 Total Income
                </button>
                <button
                  onClick={() => bulkAssignBucket('total_expense')}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm hover:bg-red-200"
                >
                  💸 Total Expense
                </button>
                <button
                  onClick={() => bulkAssignBucket('maintenance_cost')}
                  className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm hover:bg-yellow-200"
                >
                  🔧 Maintenance
                </button>
                <button
                  onClick={() => bulkAssignBucket('utilities_cost')}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm hover:bg-blue-200"
                >
                  ⚡ Utilities
                </button>
                <button
                  onClick={() => bulkAssignBucket('other_item')}
                  className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
                >
                  📦 Other
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bucket</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Include</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.account_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {accountCategories[item.account_name] || 'Uncategorized'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select
                          value={bucketAssignments[item.account_name] || 'other_item'}
                          onChange={(e) => updateBucketAssignment(item.account_name, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="total_income">Total Income</option>
                          <option value="total_expense">Total Expense</option>
                          <option value="net_operating_income">Net Operating Income</option>
                          <option value="income_item">Income Item</option>
                          <option value="expense_item">Expense Item</option>
                          <option value="maintenance_cost">Maintenance Cost</option>
                          <option value="utilities_cost">Utilities Cost</option>
                          <option value="insurance_cost">Insurance Cost</option>
                          <option value="property_tax">Property Tax</option>
                          <option value="other_item">Other</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${item.total?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="checkbox"
                          checked={includedItems[item.account_name] || false}
                          onChange={(e) => setIncludedItems(prev => ({
                            ...prev,
                            [item.account_name]: e.target.checked
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success Message */}
        {saved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700">CSV data saved successfully!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
