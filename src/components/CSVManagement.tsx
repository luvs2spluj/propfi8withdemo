import React, { useState, useEffect } from 'react';
import { Database, Edit3, Trash2, Save, RefreshCw, Eye } from 'lucide-react';

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
}

const DASHBOARD_BUCKETS: DashboardBucket[] = [
  {
    id: 'total_income',
    name: 'Total Income',
    description: 'Sum of all income accounts',
    calculation: 'Sum of Income accounts',
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'total_expense',
    name: 'Total Expense', 
    description: 'Sum of all expense accounts',
    calculation: 'Sum of Expense accounts',
    color: 'bg-red-100 text-red-800'
  },
  {
    id: 'net_operating_income',
    name: 'Net Operating Income (NOI)',
    description: 'Income minus Expenses',
    calculation: 'Total Income - Total Expense',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'gross_rental_income',
    name: 'Gross Rental Income',
    description: 'Rental income from tenants',
    calculation: 'Sum of Rental Income accounts',
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'operating_expenses',
    name: 'Operating Expenses',
    description: 'Property operating costs',
    calculation: 'Sum of Operating Expense accounts',
    color: 'bg-orange-100 text-orange-800'
  }
];

export default function CSVManagement() {
  const [savedCSVs, setSavedCSVs] = useState<CSVRecord[]>([]);
  const [selectedCSV, setSelectedCSV] = useState<CSVRecord | null>(null);
  const [editingCategories, setEditingCategories] = useState<Record<string, string>>({});
  const [editingBuckets, setEditingBuckets] = useState<Record<string, string>>({});
  const [editingTags, setEditingTags] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Load saved CSVs from localStorage
  useEffect(() => {
    const loadCSVs = () => {
      try {
        const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
        setSavedCSVs(savedCSVs);
      } catch (error) {
        console.error('Error loading CSVs:', error);
        setSavedCSVs([]);
      }
    };

    loadCSVs();
    
    // Listen for storage changes (when new CSVs are saved)
    const handleStorageChange = () => {
      loadCSVs();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleEditCSV = (csv: CSVRecord) => {
    setSelectedCSV(csv);
    setEditingCategories({ ...csv.accountCategories });
    setEditingBuckets({ ...csv.bucketAssignments });
    setEditingTags({ ...csv.tags });
    setShowPreview(false);
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
    
    for (const [accountName, category] of Object.entries(editingCategories)) {
      const accountData = selectedCSV.previewData.find((item: any) => 
        item.account_name === accountName
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
      {/* Bucketed Totals Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">CSV Management</h1>
          <p className="text-gray-600 mt-1">Manage your saved CSV files and categorize data for dashboard integration</p>
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Dashboard Bucket Totals Summary</h3>
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">CSV Files Management</h2>
          <p className="text-gray-600 mt-1">Edit categorizations and manage individual CSV files</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CSV List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Saved CSVs</h3>
              <div className="space-y-3">
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
                          onClick={() => toggleCSVActive(csv.id)}
                          className={`p-1 rounded ${csv.isActive ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                          disabled={loading}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditCSV(csv)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCSV(csv.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          disabled={loading}
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

            {/* CSV Editor */}
            <div>
              {selectedCSV ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Edit: {selectedCSV.fileName}</h3>
                    <div className="flex gap-2">
                <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                        <Eye className="w-4 h-4" />
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button
                        onClick={saveChanges}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                </button>
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

                  {/* Account Line Items Editor - Same as CSV Import Flow */}
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <h4 className="text-md font-medium mb-3">Account Line Items Categorization</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Review and adjust how each account line item is categorized. Values will be normalized (negative values → positive).
                    </p>
                    <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-4 bg-white">
                      <div className="text-xs text-gray-500 mb-2">
                        Found {Object.keys(editingCategories).length} account line items
                      </div>
                      {Object.entries(editingCategories).map(([accountName, category]) => (
                        <div key={accountName} className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                          <div className="w-1/2 font-medium text-xs text-gray-800 truncate" title={accountName}>
                            {accountName}
                          </div>
                          <select 
                            className="w-1/3 border border-gray-300 rounded p-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            value={category}
                            onChange={e => updateCategory(accountName, e.target.value)}
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
                    
                    {/* Bucket Assignment */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Dashboard Bucket Assignment</h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-white">
                        {Object.entries(editingCategories).map(([accountName, category]) => (
                          <div key={accountName} className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                            <div className="w-1/2 font-medium text-xs text-gray-800 truncate" title={accountName}>
                              {accountName}
                            </div>
                            <select 
                              className="w-1/2 border border-gray-300 rounded p-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              value={editingBuckets[accountName] || ''}
                              onChange={e => updateBucket(accountName, e.target.value)}
                            >
                              <option value="">Select bucket...</option>
                              {DASHBOARD_BUCKETS.map(bucket => (
                                <option key={bucket.id} value={bucket.id}>
                                  {bucket.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Tags</h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-white">
                        {Object.entries(editingCategories).map(([accountName, category]) => (
                          <div key={accountName} className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                            <div className="w-1/2 font-medium text-xs text-gray-800 truncate" title={accountName}>
                              {accountName}
                            </div>
                            <input
                              type="text"
                              value={editingTags[accountName]?.join(', ') || ''}
                              onChange={e => updateTags(accountName, e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                              placeholder="Enter tags separated by commas"
                              className="w-1/2 p-2 border rounded text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview Data */}
                  {showPreview && (
                    <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
                      <h4 className="text-md font-semibold mb-3">📋 Data Preview</h4>
                      <div className="max-h-96 overflow-auto">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-2 py-1 text-left">Account Name</th>
                                <th className="border border-gray-300 px-2 py-1 text-left">Category</th>
                                <th className="border border-gray-300 px-2 py-1 text-left">Bucket</th>
                                <th className="border border-gray-300 px-2 py-1 text-left">Tags</th>
                                <th className="border border-gray-300 px-2 py-1 text-left">Time Series Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedCSV.previewData.slice(0, 20).map((row: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-2 py-1 font-medium">
                                    {row.account_name || 'N/A'}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      editingCategories[row.account_name] === 'income' 
                                        ? 'bg-green-100 text-green-800' 
                                        : editingCategories[row.account_name] === 'expense'
                                        ? 'bg-red-100 text-red-800'
                                        : editingCategories[row.account_name] === 'asset'
                                        ? 'bg-blue-100 text-blue-800'
                                        : editingCategories[row.account_name] === 'liability'
                                        ? 'bg-orange-100 text-orange-800'
                                        : editingCategories[row.account_name] === 'equity'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {editingCategories[row.account_name] || 'Uncategorized'}
                                    </span>
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1">
                                    {editingBuckets[row.account_name] || 'Unassigned'}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1">
                                    {editingTags[row.account_name]?.join(', ') || 'No tags'}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1">
                                    {row.time_series ? (
                                      <div className="max-w-xs">
                                        {Object.entries(row.time_series).slice(0, 3).map(([month, value]: [string, any]) => (
                                          <div key={month} className="text-xs">
                                            {month}: ${typeof value === 'number' ? value.toLocaleString() : value}
                                          </div>
                                        ))}
                                        {Object.keys(row.time_series).length > 3 && (
                                          <div className="text-xs text-gray-500">
                                            +{Object.keys(row.time_series).length - 3} more...
                                          </div>
                                        )}
                                      </div>
                                    ) : 'No time series data'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {selectedCSV.previewData.length > 20 && (
                          <div className="mt-2 text-xs text-gray-500 text-center">
                            Showing first 20 rows of {selectedCSV.previewData.length} total rows
                          </div>
                        )}
                      </div>
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