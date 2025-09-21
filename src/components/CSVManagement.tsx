import React, { useState, useEffect } from 'react';
import { Database, Edit3, Trash2, Save, RefreshCw, Eye } from 'lucide-react';
import { getCSVData, deleteCSVData } from '../lib/supabase';

interface CSVRecord {
  id: string;
  fileName: string;
  fileType: 'cash_flow' | 'balance_sheet' | 'rent_roll' | 'income_statement' | 'general';
  uploadedAt: string;
  totalRecords: number;
  accountCategories: Record<string, string>;
  bucketAssignments: Record<string, string>;
  tags: Record<string, string[]>;
  isActive: boolean;
  previewData: any[];
}

interface DashboardBucket {
  id: string;
  name: string;
  description: string;
  calculation: string;
  color: string;
  category: 'income' | 'expense' | 'net_income' | 'cash' | 'exclude';
  icon: string;
  label: string;
}

const DASHBOARD_BUCKETS: DashboardBucket[] = [
  // Income Buckets
  {
    id: 'total_income',
    name: 'Total Income',
    description: 'Sum of all income accounts',
    calculation: 'Sum of Income accounts',
    color: 'bg-green-100 text-green-800',
    category: 'income',
    icon: '💰',
    label: 'Total Income'
  },
  {
    id: 'gross_rental_income',
    name: 'Gross Rental Income',
    description: 'Rental income from tenants',
    calculation: 'Sum of Rental Income accounts',
    color: 'bg-green-100 text-green-800',
    category: 'income',
    icon: '🏠',
    label: 'Rental Income'
  },
  {
    id: 'other_income',
    name: 'Other Income',
    description: 'Fees, charges, and other income',
    calculation: 'Sum of Other Income accounts',
    color: 'bg-green-100 text-green-800',
    category: 'income',
    icon: '💵',
    label: 'Other Income'
  },
  
  // Revenue Buckets
  {
    id: 'total_operating_income',
    name: 'Total Operating Income',
    description: 'Total operating revenue',
    calculation: 'Sum of Operating Income accounts',
    color: 'bg-emerald-100 text-emerald-800',
    category: 'income',
    icon: '📈',
    label: 'Operating Income'
  },
  
  // Expense Buckets
  {
    id: 'total_expense',
    name: 'Total Expense', 
    description: 'Sum of all expense accounts',
    calculation: 'Sum of Expense accounts',
    color: 'bg-red-100 text-red-800',
    category: 'expense',
    icon: '💸',
    label: 'Total Expense'
  },
  {
    id: 'operating_expenses',
    name: 'Operating Expenses',
    description: 'Property operating costs',
    calculation: 'Sum of Operating Expense accounts',
    color: 'bg-orange-100 text-orange-800',
    category: 'expense',
    icon: '🔧',
    label: 'Operating Expenses'
  },
  {
    id: 'maintenance_expenses',
    name: 'Maintenance Expenses',
    description: 'Repair and maintenance costs',
    calculation: 'Sum of Maintenance accounts',
    color: 'bg-orange-100 text-orange-800',
    category: 'expense',
    icon: '🛠️',
    label: 'Maintenance'
  },
  {
    id: 'management_expenses',
    name: 'Management Expenses',
    description: 'Property management costs',
    calculation: 'Sum of Management accounts',
    color: 'bg-orange-100 text-orange-800',
    category: 'expense',
    icon: '👥',
    label: 'Management'
  },
  
  // Net Income Buckets
  {
    id: 'net_operating_income',
    name: 'Net Operating Income (NOI)',
    description: 'Income minus Expenses',
    calculation: 'Total Income - Total Expense',
    color: 'bg-blue-100 text-blue-800',
    category: 'net_income',
    icon: '📊',
    label: 'Net Income'
  },
  
  // Cash Buckets
  {
    id: 'cash_amount',
    name: 'Cash Amount',
    description: 'Cash and cash equivalents',
    calculation: 'Sum of Cash accounts',
    color: 'bg-purple-100 text-purple-800',
    category: 'cash',
    icon: '💳',
    label: 'Cash Amount'
  },
  {
    id: 'cash_change',
    name: 'Cash Change',
    description: 'Changes in cash position',
    calculation: 'Cash Flow changes',
    color: 'bg-purple-100 text-purple-800',
    category: 'cash',
    icon: '💱',
    label: 'Cash Change'
  },
  
  // Exclude Bucket
  {
    id: 'exclude',
    name: 'Do Not Include',
    description: 'Exclude from dashboard calculations',
    calculation: 'Not included in totals',
    color: 'bg-gray-100 text-gray-800',
    category: 'exclude',
    icon: '❌',
    label: 'Exclude'
  }
];

export default function CSVManagement() {
  const [savedCSVs, setSavedCSVs] = useState<CSVRecord[]>([]);
  const [selectedCSV, setSelectedCSV] = useState<CSVRecord | null>(null);
  const [editingCategories, setEditingCategories] = useState<Record<string, string>>({});
  const [editingBuckets, setEditingBuckets] = useState<Record<string, string>>({});
  const [editingTags, setEditingTags] = useState<Record<string, string[]>>({});
  const [includedItems, setIncludedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Load saved CSVs from Supabase and localStorage
  useEffect(() => {
    const loadCSVs = async () => {
      try {
        // Try to get data from Supabase first
        const supabaseCSVs = await getCSVData();
        
        if (supabaseCSVs.length > 0) {
          // Convert Supabase format to CSVRecord format
          const convertedCSVs = supabaseCSVs.map((csv: any) => ({
            id: csv.id,
            fileName: csv.file_name,
            fileType: csv.file_type,
            uploadedAt: csv.uploaded_at,
            totalRecords: csv.total_records,
            accountCategories: csv.account_categories,
            bucketAssignments: csv.bucket_assignments,
            tags: csv.tags,
            isActive: csv.is_active,
            previewData: csv.preview_data
          }));
          setSavedCSVs(convertedCSVs);
          console.log('📊 Loaded CSVs from Supabase:', convertedCSVs.length);
        } else {
          // Fall back to localStorage
          const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
          setSavedCSVs(savedCSVs);
          console.log('📊 Loaded CSVs from localStorage:', savedCSVs.length);
        }
      } catch (error) {
        console.error('Error loading CSVs:', error);
        // Fall back to localStorage on error
        const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
        setSavedCSVs(savedCSVs);
      }
    };

    loadCSVs();
    
    // Listen for data updates (when new CSVs are saved)
    const handleDataUpdate = () => {
      loadCSVs();
    };
    
    window.addEventListener('dataUpdated', handleDataUpdate);
    return () => window.removeEventListener('dataUpdated', handleDataUpdate);
  }, []);

  const handleEditCSV = (csv: CSVRecord) => {
    console.log('🔍 Loading CSV for editing:', csv.fileName);
    console.log('📊 Account categories:', csv.accountCategories);
    console.log('🎯 Bucket assignments:', csv.bucketAssignments);
    console.log('🏷️ Tags:', csv.tags);
    console.log('📋 Preview data sample:', csv.previewData.slice(0, 3));
    
    // Debug: Check if account names match
    const previewAccountNames = csv.previewData.map((item: any) => item.account_name).filter(Boolean);
    const categoryAccountNames = Object.keys(csv.accountCategories);
    console.log('🔍 Preview account names:', previewAccountNames.slice(0, 5));
    console.log('🔍 Category account names:', categoryAccountNames.slice(0, 5));
    console.log('🔍 Names match check:', previewAccountNames.every(name => categoryAccountNames.includes(name)));
    
    setSelectedCSV(csv);
    setEditingCategories({ ...csv.accountCategories });
    setEditingBuckets({ ...csv.bucketAssignments });
    setEditingTags({ ...csv.tags });
    
    // Initialize included items - all items selected by default
    const initialIncludedItems: Record<string, boolean> = {};
    Object.keys(csv.accountCategories).forEach(accountName => {
      initialIncludedItems[accountName] = true;
    });
    setIncludedItems(initialIncludedItems);
    
    setShowPreview(true); // Automatically show preview
    setPreviewMode(false);
  };

  const handlePreviewCSV = (csv: CSVRecord) => {
    console.log('👁️ Loading CSV for preview:', csv.fileName);
    console.log('📊 Account categories:', csv.accountCategories);
    console.log('🎯 Bucket assignments:', csv.bucketAssignments);
    console.log('🏷️ Tags:', csv.tags);
    
    // Debug: Show actual account names and their categories
    const accountNames = Object.keys(csv.accountCategories);
    console.log('🔍 Account names with categories:', accountNames.slice(0, 5).map(name => ({
      name,
      category: csv.accountCategories[name],
      bucket: csv.bucketAssignments[name]
    })));
    
    // Debug: Show preview data account names
    const previewAccountNames = csv.previewData.map((item: any) => item.account_name).filter(Boolean);
    console.log('🔍 Preview data account names:', previewAccountNames.slice(0, 5));
    
    setSelectedCSV(csv);
    setEditingCategories({ ...csv.accountCategories });
    setEditingBuckets({ ...csv.bucketAssignments });
    setEditingTags({ ...csv.tags });
    setShowPreview(true); // Always show preview
    setPreviewMode(true);
  };

  const updateCategory = (accountName: string, category: string) => {
    setEditingCategories(prev => ({
      ...prev,
      [accountName]: category
    }));
  };

  const updateBucket = (accountName: string, bucket: string) => {
    setEditingBuckets(prev => ({
      ...prev,
      [accountName]: bucket
    }));
  };

  const updateIncludedItem = (accountName: string, included: boolean) => {
    setIncludedItems(prev => ({
      ...prev,
      [accountName]: included
    }));
  };

  const selectAllItems = () => {
    const allSelected: Record<string, boolean> = {};
    Object.keys(editingCategories).forEach(accountName => {
      allSelected[accountName] = true;
    });
    setIncludedItems(allSelected);
  };

  const deselectAllItems = () => {
    const noneSelected: Record<string, boolean> = {};
    Object.keys(editingCategories).forEach(accountName => {
      noneSelected[accountName] = false;
    });
    setIncludedItems(noneSelected);
  };

  const selectByCategory = (category: string) => {
    setIncludedItems(prev => {
      const updated = { ...prev };
      Object.entries(editingCategories).forEach(([accountName, cat]) => {
        if (cat === category) {
          updated[accountName] = true;
        }
      });
      return updated;
    });
  };

  const getSuggestedBucket = (accountName: string, category: string): string => {
    const name = accountName.toLowerCase();
    
    // Priority 1: Key metrics for dashboard
    if (name.includes('total operating income')) return 'total_operating_income';
    if (name.includes('noi') && name.includes('net operating income')) return 'net_operating_income';
    if (name.includes('total operating expense')) return 'total_operating_expense';
    
    // Priority 2: Income categories
    if (category === 'income') {
      if (name.includes('rent') || name.includes('tenant')) return 'rental_income';
      if (name.includes('fee') || name.includes('charge')) return 'other_income';
      return 'total_income';
    }
    
    // Priority 3: Expense categories
    if (category === 'expense') {
      if (name.includes('maintenance') || name.includes('repair')) return 'maintenance_expenses';
      if (name.includes('management') || name.includes('admin')) return 'management_expenses';
      return 'operating_expenses';
    }
    
    return 'unassigned';
  };

  const updateTags = (accountName: string, tags: string[]) => {
    setEditingTags(prev => ({
      ...prev,
      [accountName]: tags
    }));
  };

  const saveChanges = async () => {
    if (!selectedCSV) return;
    setSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the CSV record
      const updatedCSV = {
        ...selectedCSV,
        accountCategories: editingCategories,
        bucketAssignments: editingBuckets,
        tags: editingTags
      };
      
      // Update localStorage
      const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      const updatedCSVs = savedCSVs.map((csv: CSVRecord) => 
        csv.id === selectedCSV.id ? updatedCSV : csv
      );
      localStorage.setItem('savedCSVs', JSON.stringify(updatedCSVs));
      
      setSavedCSVs(updatedCSVs);
      setSelectedCSV(updatedCSV);
      console.log('CSV categorization saved:', updatedCSV);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleCSVActive = async (csvId: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setSavedCSVs(prev => prev.map(csv => 
        csv.id === csvId ? { ...csv, isActive: !csv.isActive } : csv
      ));
    } catch (error) {
      console.error('Toggle failed:', error);
    } finally {
      setLoading(false);
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
    
    setLoading(true);
    try {
      // Delete from Supabase first
      const supabaseResult = await deleteCSVData(csvId);
      if (supabaseResult) {
        console.log('✅ CSV deleted from Supabase');
      }
      
      // Remove from localStorage
      const updatedCSVs = savedCSVs.filter(csv => csv.id !== csvId);
      localStorage.setItem('savedCSVs', JSON.stringify(updatedCSVs));
      
      // Update state
      setSavedCSVs(updatedCSVs);
      
      // Clear selection if deleted CSV was selected
      if (selectedCSV?.id === csvId) {
        setSelectedCSV(null);
        setEditingCategories({});
        setEditingBuckets({});
        setEditingTags({});
      }
      
      // Trigger dashboard update to recalculate totals
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { 
          action: 'csv_deleted',
          csvId: csvId,
          fileName: csvToDelete.fileName
        } 
      }));
      
      // Refresh bucket totals in this component
      setTimeout(() => {
        const updatedBucketTotals = calculateAllBucketedTotals();
        console.log('📊 Updated bucket totals after deletion:', updatedBucketTotals);
      }, 100);
      
      console.log(`✅ CSV "${csvToDelete.fileName}" deleted successfully`);
      
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete CSV. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeColor = (fileType: string) => {
    const colors = {
      cash_flow: 'bg-blue-100 text-blue-800',
      balance_sheet: 'bg-green-100 text-green-800',
      rent_roll: 'bg-purple-100 text-purple-800',
      income_statement: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[fileType as keyof typeof colors] || colors.general;
  };

  const calculateTotals = () => {
    if (!selectedCSV) return { totalIncome: 0, totalExpense: 0, netIncome: 0 };
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    // Use editingCategories if available (for editing mode), otherwise use original CSV data
    const categoriesToUse = Object.keys(editingCategories).length > 0 ? editingCategories : selectedCSV.accountCategories;
    
    for (const [accountName, category] of Object.entries(categoriesToUse)) {
      const accountData = selectedCSV.previewData.find((item: any) => 
        item.account_name?.trim() === accountName
      );
      
      if (accountData) {
        let accountValue = 0;
        
        // Extract value from time series data
        if (accountData.time_series) {
          const values = Object.values(accountData.time_series).filter(v => 
            typeof v === 'number' && v !== 0
          ) as number[];
          
          if (values.length > 0) {
            accountValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          }
        }
        
        if (category === 'income') {
          totalIncome += accountValue;
        } else if (category === 'expense') {
          totalExpense += accountValue;
        }
      }
    }
    
    return {
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense
    };
  };

  const totals = calculateTotals();

  // Calculate bucketed totals for all CSVs
  const calculateAllBucketedTotals = () => {
    const bucketTotals: Record<string, number> = {};
    
    savedCSVs.forEach(csv => {
      if (!csv.isActive) return;
      
      Object.entries(csv.accountCategories).forEach(([accountName, category]) => {
        const accountData = csv.previewData.find((item: any) => 
          item.account_name === accountName
        );
        
        if (accountData && accountData.time_series) {
          const values = Object.values(accountData.time_series).filter(v => 
            typeof v === 'number' && v !== 0
          ) as number[];
          
          if (values.length > 0) {
            const accountValue = values.reduce((sum, val) => sum + val, 0) / values.length;
            
            // Assign to appropriate bucket
            if (category === 'income') {
              bucketTotals['total_income'] = (bucketTotals['total_income'] || 0) + accountValue;
              if (/rent|rental/.test(accountName.toLowerCase())) {
                bucketTotals['gross_rental_income'] = (bucketTotals['gross_rental_income'] || 0) + accountValue;
              }
            } else if (category === 'expense') {
              bucketTotals['total_expense'] = (bucketTotals['total_expense'] || 0) + accountValue;
              bucketTotals['operating_expenses'] = (bucketTotals['operating_expenses'] || 0) + accountValue;
            }
          }
        }
      });
    });
    
    // Calculate NOI
    bucketTotals['net_operating_income'] = (bucketTotals['total_income'] || 0) - (bucketTotals['total_expense'] || 0);
    
    return bucketTotals;
  };

  const allBucketTotals = calculateAllBucketedTotals();

    return (
      <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">CSV Management</h1>
          <p className="text-gray-600 mt-1">Manage your saved CSV files and categorize data for dashboard integration</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">CSV Files Management</h2>
          <p className="text-gray-600 mt-1">Edit categorizations and manage individual CSV files</p>
        </div>

        <div className="p-6">
          {/* CSV List */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Saved CSVs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCSVs.map((csv) => (
                <div key={csv.id} className={`p-4 border rounded-lg ${csv.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-gray-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">{csv.fileName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(csv.fileType)}`}>
                            {csv.fileType.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">{csv.totalRecords} records</span>
                          <span className={`w-2 h-2 rounded-full ${csv.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreviewCSV(csv)}
                        className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                        title="Preview CSV structure"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleCSVActive(csv.id)}
                        className={`p-1 rounded ${csv.isActive ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                        disabled={loading}
                        title={csv.isActive ? 'Deactivate CSV' : 'Activate CSV'}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
          <button
                        onClick={() => handleEditCSV(csv)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Edit CSV categorizations"
          >
                        <Edit3 className="w-4 h-4" />
          </button>
          <button
                        onClick={() => deleteCSV(csv.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        disabled={loading}
                        title="Delete CSV"
                      >
                        <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
                  <div className="text-xs text-gray-600">
                    Uploaded: {new Date(csv.uploadedAt).toLocaleDateString()}
                  </div>
        </div>
              ))}
            </div>
          </div>
          
          {/* CSV Editor - Full Width */}
          <div className="w-full">
              {selectedCSV ? (
          <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {previewMode ? 'Preview: ' : 'Edit: '}{selectedCSV.fileName}
                      </h3>
                      {previewMode && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          👁️ Preview Mode
              </span>
                      )}
            </div>
                    <div className="flex gap-2">
                      {previewMode ? (
                        <>
                          <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                              showPreview 
                                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                : 'bg-gray-600 text-white hover:bg-gray-700'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                            {showPreview ? 'Hide Data Preview' : 'Show Data Preview'}
                          </button>
        <button
                            onClick={() => {
                              setPreviewMode(false);
                              setShowPreview(false);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            <Edit3 className="w-4 h-4" />
                            Switch to Edit Mode
                          </button>
            </>
          ) : (
            <>
                          <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                              showPreview 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-gray-600 text-white hover:bg-gray-700'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                            {showPreview ? 'Hide Data Preview' : 'Show Data Preview'}
                          </button>
                          <button
                            onClick={saveChanges}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
            </>
          )}
                    </div>
                  </div>

                  {/* Enhanced Preview Section - Always visible when CSV is selected */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-blue-900">📊 CSV Data Overview</h4>
                      <div className="text-sm text-blue-700">
                        {selectedCSV.totalRecords} records • {selectedCSV.fileType.replace('_', ' ')} • Uploaded {new Date(selectedCSV.uploadedAt).toLocaleDateString()}
        </div>
      </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-lg font-bold text-green-600">
                          {Object.values(editingCategories).filter(cat => cat === 'income').length}
                        </div>
                        <div className="text-xs text-gray-600">Income Accounts</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-lg font-bold text-red-600">
                          {Object.values(editingCategories).filter(cat => cat === 'expense').length}
                        </div>
                        <div className="text-xs text-gray-600">Expense Accounts</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-lg font-bold text-blue-600">
                          {Object.values(editingCategories).filter(cat => ['asset', 'liability', 'equity'].includes(cat)).length}
                        </div>
                        <div className="text-xs text-gray-600">Balance Sheet</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-lg font-bold text-purple-600">
                          {Object.keys(editingBuckets).filter(bucket => editingBuckets[bucket] !== 'Unassigned').length}
                        </div>
                        <div className="text-xs text-gray-600">Assigned Buckets</div>
                      </div>
        </div>

                    {/* Sample Data Preview */}
                    <div className="bg-white rounded-lg border p-3">
                      <h5 className="text-sm font-medium mb-2 text-gray-700">Sample Account Data:</h5>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {Object.entries(editingCategories).slice(0, 5).map(([accountName, category]) => (
                          <div key={accountName} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                            <span className="font-medium text-gray-800 truncate flex-1" title={accountName}>
                              {accountName}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ml-2 ${
                              category === 'income' ? 'bg-green-100 text-green-800' :
                              category === 'expense' ? 'bg-red-100 text-red-800' :
                              category === 'asset' ? 'bg-blue-100 text-blue-800' :
                              category === 'liability' ? 'bg-orange-100 text-orange-800' :
                              category === 'equity' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {category}
                            </span>
                            <span className="text-gray-500 ml-2">
                              {editingBuckets[accountName] || 'Unassigned'}
                            </span>
                          </div>
                        ))}
                        {Object.keys(editingCategories).length > 5 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            +{Object.keys(editingCategories).length - 5} more accounts...
                          </div>
                        )}
                      </div>
        </div>
      </div>

                  {/* Totals Preview */}
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-md font-semibold mb-3 text-blue-900">📊 Categorized Totals Preview</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">${totals.totalIncome.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Total Income</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">${totals.totalExpense.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Total Expense</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${totals.netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ${totals.netIncome.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Net Income (NOI)</div>
                      </div>
                    </div>
        </div>

                  {/* Enhanced CSV Editing Interface - Same as Upload Preview */}
                  {!previewMode && (
                    <div className="space-y-6">
                      {/* Bulk Selection Controls */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="text-lg font-semibold mb-3">📋 Bulk Selection Controls</h4>
                        <div className="flex flex-wrap gap-2">
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
                      </div>

                      {/* Time Series Data Table with Sticky Headers */}
                      <div className="bg-white rounded-lg border border-gray-200">
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                          <h4 className="text-lg font-semibold">📊 CSV Data Preview</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Review and categorize your CSV data. Check/uncheck items to include/exclude from dashboard.
                          </p>
                        </div>
                        
                        <div className="overflow-x-auto max-h-96">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Include</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Account Name</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Category</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Dashboard Bucket</th>
                                {selectedCSV?.previewData?.[0]?.time_series && 
                                  Object.keys(selectedCSV.previewData[0].time_series)
                                    .filter(key => key.toLowerCase() !== 'total')
                                    .map(month => (
                                      <th key={month} className="px-3 py-2 text-right font-medium text-gray-700 border-b min-w-20">
                                        {month}
                                      </th>
                                    ))
                                }
                              </tr>
                            </thead>
                            <tbody>
                              {selectedCSV?.previewData?.map((item: any, index: number) => (
                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={includedItems[item.account_name] || false}
                                      onChange={(e) => updateIncludedItem(item.account_name, e.target.checked)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-3 py-2 font-medium text-gray-900">
                                    {item.account_name}
                                  </td>
                                  <td className="px-3 py-2">
                                    <select
                                      value={editingCategories[item.account_name] || 'income'}
                                      onChange={(e) => updateCategory(item.account_name, e.target.value)}
                                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="income">💰 Income</option>
                                      <option value="expense">💸 Expense</option>
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="space-y-2">
                                      {/* Income Buckets */}
                                      <div className="grid grid-cols-2 gap-1">
                                        {DASHBOARD_BUCKETS.filter(bucket => bucket.category === 'income').map(bucket => (
                                          <button
                                            key={bucket.id}
                                            onClick={() => updateBucket(item.account_name, bucket.id)}
                                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                              editingBuckets[item.account_name] === bucket.id
                                                ? bucket.color + ' ring-2 ring-blue-500'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                          >
                                            {bucket.icon} {bucket.label}
                                          </button>
                                        ))}
                                      </div>
                                      
                                      {/* Expense Buckets */}
                                      <div className="grid grid-cols-2 gap-1">
                                        {DASHBOARD_BUCKETS.filter(bucket => bucket.category === 'expense').map(bucket => (
                                          <button
                                            key={bucket.id}
                                            onClick={() => updateBucket(item.account_name, bucket.id)}
                                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                              editingBuckets[item.account_name] === bucket.id
                                                ? bucket.color + ' ring-2 ring-blue-500'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                          >
                                            {bucket.icon} {bucket.label}
                                          </button>
                                        ))}
                                      </div>
                                      
                                      {/* Cash Buckets */}
                                      <div className="grid grid-cols-2 gap-1">
                                        {DASHBOARD_BUCKETS.filter(bucket => bucket.category === 'cash').map(bucket => (
                                          <button
                                            key={bucket.id}
                                            onClick={() => updateBucket(item.account_name, bucket.id)}
                                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                              editingBuckets[item.account_name] === bucket.id
                                                ? bucket.color + ' ring-2 ring-blue-500'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                          >
                                            {bucket.icon} {bucket.label}
                                          </button>
                                        ))}
                                      </div>
                                      
                                      {/* Net Income Buckets */}
                                      <div className="grid grid-cols-1 gap-1">
                                        {DASHBOARD_BUCKETS.filter(bucket => bucket.category === 'net_income').map(bucket => (
                                          <button
                                            key={bucket.id}
                                            onClick={() => updateBucket(item.account_name, bucket.id)}
                                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                              editingBuckets[item.account_name] === bucket.id
                                                ? bucket.color + ' ring-2 ring-blue-500'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                          >
                                            {bucket.icon} {bucket.label}
                                          </button>
                                        ))}
                                      </div>
                                      
                                      {/* Exclude Bucket */}
                                      <div className="grid grid-cols-1 gap-1">
                                        {DASHBOARD_BUCKETS.filter(bucket => bucket.category === 'exclude').map(bucket => (
                                          <button
                                            key={bucket.id}
                                            onClick={() => updateBucket(item.account_name, bucket.id)}
                                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                              editingBuckets[item.account_name] === bucket.id
                                                ? bucket.color + ' ring-2 ring-blue-500'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                          >
                                            {bucket.icon} {bucket.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                  {item.time_series && 
                                    Object.entries(item.time_series)
                                      .filter(([key]) => key.toLowerCase() !== 'total')
                                      .map(([month, value]) => (
                                        <td key={month} className="px-3 py-2 text-right text-gray-600">
                                          {typeof value === 'number' ? `$${value.toLocaleString()}` : String(value)}
                                        </td>
                                      ))
                                  }
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Mode Message */}
                  {previewMode && !showPreview && (
                    <div className="mt-6 p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
                      <div className="text-center">
                        <Eye className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                        <h4 className="text-lg font-semibold text-purple-900 mb-2">Preview Mode Active</h4>
                        <p className="text-purple-700 mb-4">
                          You're viewing <strong>{selectedCSV.fileName}</strong> in preview mode. 
                          Click "Show Data Preview" to see the detailed CSV structure, or switch to edit mode to make changes.
                        </p>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => setShowPreview(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                          >
                            Show Data Preview
                          </button>
                          <button
                            onClick={() => {
                              setPreviewMode(false);
                              setShowPreview(false);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Switch to Edit Mode
                          </button>
                        </div>
                      </div>
                        </div>
                      )}

                  {/* Enhanced Preview Data */}
                  {showPreview && (
                    <div className="mt-6 p-6 bg-white border-2 border-blue-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-blue-900">📋 Detailed Data Preview</h4>
                        <div className="text-sm text-blue-700">
                          Showing {Math.min(20, selectedCSV.previewData.length)} of {selectedCSV.previewData.length} records
                        </div>
                      </div>
                      
                      <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm border-collapse">
                            <thead className="bg-blue-50">
                              <tr>
                                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Account Name</th>
                                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Dashboard Bucket</th>
                                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Tags</th>
                                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Financial Data</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {selectedCSV.previewData.slice(0, 20).map((row: any, index: number) => {
                                // Debug: Log what we're trying to display
                                if (index < 3) {
                                  const accountName = row.account_name;
                                  const trimmedName = accountName?.trim();
                                  const editingCategory = editingCategories[trimmedName];
                                  const csvCategory = selectedCSV.accountCategories[trimmedName];
                                  const editingBucket = editingBuckets[trimmedName];
                                  const csvBucket = selectedCSV.bucketAssignments[trimmedName];
                                  
                                  console.log(`🔍 Row ${index}:`, {
                                    accountName,
                                    trimmedName,
                                    editingCategory,
                                    csvCategory,
                                    editingBucket,
                                    csvBucket,
                                    finalCategory: editingCategory || csvCategory || 'Uncategorized',
                                    finalBucket: editingBucket || csvBucket || 'Unassigned'
                                  });
                                }
                                
                                return (
                                <tr key={index} className="hover:bg-blue-50 transition-colors">
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    <div className="max-w-xs truncate" title={row.account_name || 'N/A'}>
                                      {row.account_name || 'N/A'}
                      </div>
                    </td>
                                  <td className="px-4 py-3">
                                    {(() => {
                                      const trimmedName = row.account_name?.trim();
                                      const category = editingCategories[trimmedName] || selectedCSV.accountCategories[trimmedName];
                                      return (
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                          category === 'income' 
                                            ? 'bg-green-100 text-green-800' 
                                            : category === 'expense'
                                            ? 'bg-red-100 text-red-800'
                                            : category === 'asset'
                                            ? 'bg-blue-100 text-blue-800'
                                            : category === 'liability'
                                            ? 'bg-orange-100 text-orange-800'
                                            : category === 'equity'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {category || 'Uncategorized'}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {(() => {
                                      const trimmedName = row.account_name?.trim();
                                      const bucket = editingBuckets[trimmedName] || selectedCSV.bucketAssignments[trimmedName];
                                      return (
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          bucket && bucket !== 'Unassigned'
                                            ? 'bg-indigo-100 text-indigo-800'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {bucket || 'Unassigned'}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    <div className="max-w-xs">
                                      {(() => {
                                        const trimmedName = row.account_name?.trim();
                                        const tags = editingTags[trimmedName] || selectedCSV.tags[trimmedName];
                                        return tags?.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                                              <span key={tagIndex} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                {tag}
                                              </span>
                                            ))}
                                            {tags.length > 2 && (
                                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                                +{tags.length - 2}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 italic">No tags</span>
                                        );
                                      })()}
                      </div>
                    </td>
                                  <td className="px-4 py-3 text-sm">
                                    {row.time_series ? (
                                      <div className="max-w-xs">
                                        <div className="space-y-1">
                                          {Object.entries(row.time_series).slice(0, 3).map(([month, value]: [string, any]) => (
                                            <div key={month} className="flex justify-between text-xs">
                                              <span className="text-gray-600">{month}:</span>
                                              <span className={`font-medium ${
                                                typeof value === 'number' && value < 0 ? 'text-red-600' : 'text-green-600'
                                              }`}>
                                                ${typeof value === 'number' ? Math.abs(value).toLocaleString() : value}
                                              </span>
                                            </div>
                                          ))}
                                          {Object.keys(row.time_series).length > 3 && (
                                            <div className="text-xs text-gray-500 pt-1 border-t">
                                              +{Object.keys(row.time_series).length - 3} more periods
                                            </div>
                                          )}
                                        </div>
                      </div>
                                    ) : (
                                      <span className="text-gray-400 italic">No financial data</span>
                                    )}
                    </td>
                  </tr>
                                );
                              })}
              </tbody>
            </table>
                        </div>
                      </div>
                      
                      {selectedCSV.previewData.length > 20 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-sm text-blue-700 text-center">
                            📊 <strong>{selectedCSV.previewData.length - 20} more records</strong> available. 
                            Use the categorization editor above to manage all accounts.
                          </div>
                        </div>
                      )}
          </div>
        )}
      </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a CSV to edit categorizations</p>
              </div>
              )}
            </div>
          </div>
        </div>

      {/* Bucketed Totals Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">📊 Dashboard Bucket Totals Summary</h3>
          <p className="text-gray-600 mt-1">Calculated totals from your categorized CSV data</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {DASHBOARD_BUCKETS.map(bucket => {
              const value = allBucketTotals[bucket.id] || 0;
              return (
                <div key={bucket.id} className="p-4 border rounded-lg">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${bucket.color}`}>
                    {bucket.name}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${value.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-600">{bucket.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{bucket.calculation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dashboard Buckets Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Dashboard Buckets</h3>
          <p className="text-gray-600 text-sm">How your CSV data populates the dashboard</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DASHBOARD_BUCKETS.map(bucket => (
              <div key={bucket.id} className="p-4 border rounded-lg">
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${bucket.color}`}>
                  {bucket.name}
                </div>
                <p className="text-sm text-gray-600 mb-2">{bucket.description}</p>
                <p className="text-xs text-gray-500">{bucket.calculation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}