import React, { useState, useEffect } from 'react';
import { unifiedCSVDataService, UnifiedCSVData } from '../services/unifiedCSVDataService';
import { 
  Trash2, 
  Eye, 
  EyeOff, 
  Upload, 
  FileText, 
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Plus
} from 'lucide-react';

interface CSVManagementProps {
  onCSVSelected?: (csv: UnifiedCSVData) => void;
  onCSVDeleted?: (csvId: string) => void;
  showUploadButton?: boolean;
  className?: string;
}

export default function CSVManagement({ 
  onCSVSelected, 
  onCSVDeleted, 
  showUploadButton = true,
  className = '' 
}: CSVManagementProps) {
  const [csvs, setCsvs] = useState<UnifiedCSVData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedCSV, setSelectedCSV] = useState<string | null>(null);

  useEffect(() => {
    loadCSVData();
    
    // Subscribe to data changes
    const unsubscribe = unifiedCSVDataService.subscribe(() => {
      loadCSVData();
    });

    return unsubscribe;
  }, []);

  const loadCSVData = async () => {
    try {
      setLoading(true);
      const csvData = await unifiedCSVDataService.loadCSVData();
      setCsvs(csvData);
      setStats(unifiedCSVDataService.getCSVStats());
    } catch (error) {
      console.error('Error loading CSV data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (csvId: string) => {
    const success = await unifiedCSVDataService.toggleCSVActive(csvId);
    if (success) {
      // Data will be updated via subscription
    }
  };

  const handleDeleteCSV = async (csvId: string) => {
    const csvToDelete = csvs.find(csv => csv.id === csvId);
    if (!csvToDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${csvToDelete.fileName}"?\n\n` +
      `This will permanently remove:\n` +
      `• All data from this CSV\n` +
      `• All categorizations and bucket assignments\n` +
      `• Dashboard data from this CSV\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      console.log('🗑️ Deleting CSV:', csvToDelete.fileName);
      
      // Call the unified service delete method
      const success = await unifiedCSVDataService.deleteCSV(csvId);
      
      if (success) {
        console.log('✅ CSV deleted successfully');
        
        // Call the callback if provided
        if (onCSVDeleted) {
          onCSVDeleted(csvId);
        }
        
        // The data will be updated via subscription, but let's also reload manually
        await loadCSVData();
      } else {
        console.error('❌ Failed to delete CSV');
        alert('Failed to delete CSV. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error deleting CSV:', error);
      alert('Failed to delete CSV. Please try again.');
    }
  };

  const handleCSVSelect = (csv: UnifiedCSVData) => {
    setSelectedCSV(csv.id);
    if (onCSVSelected) {
      onCSVSelected(csv);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'budget':
      case 'income_statement':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'rent_roll':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'balance_sheet':
        return <BarChart3 className="w-4 h-4 text-purple-600" />;
      case 'cash_flow':
        return <TrendingUp className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'budget':
      case 'income_statement':
        return 'bg-green-100 text-green-800';
      case 'rent_roll':
        return 'bg-blue-100 text-blue-800';
      case 'balance_sheet':
        return 'bg-purple-100 text-purple-800';
      case 'cash_flow':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading CSV data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">CSV Management</h3>
            <p className="text-sm text-gray-600">Manage your uploaded CSV files and their chart data</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadCSVData}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {showUploadButton && (
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Add CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Files</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(stats.byType).length}
              </div>
              <div className="text-sm text-gray-600">File Types</div>
            </div>
          </div>
        )}
      </div>

      {/* CSV List */}
      <div className="p-6">
        {csvs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No CSV files found</h4>
            <p className="text-gray-600 mb-4">Upload CSV files to start managing your data</p>
            {showUploadButton && (
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto">
                <Upload className="w-4 h-4" />
                <span>Upload CSV</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {csvs.map((csv) => (
              <div
                key={csv.id}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  selectedCSV === csv.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${!csv.isActive ? 'opacity-60' : ''}`}
                onClick={() => handleCSVSelect(csv)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileTypeIcon(csv.fileType)}
                    <div>
                      <div className="font-medium text-gray-900">{csv.fileName}</div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getFileTypeColor(csv.fileType)}`}>
                          {csv.fileType}
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(csv.uploadedAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Chart Data Preview */}
                    {csv.chartData && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                        <span className="text-green-600">
                          {csv.chartData.incomeItems?.length || 0} income
                        </span>
                        <span className="text-red-600">
                          {csv.chartData.expenseItems?.length || 0} expense
                        </span>
                        <span className="text-blue-600">
                          {csv.chartData.otherItems?.length || 0} other
                        </span>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(csv.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          csv.isActive
                            ? 'text-green-600 hover:bg-green-100'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={csv.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {csv.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCSV(csv.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete CSV"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Additional Info */}
                {csv.categorization && (
                  <div className="mt-2 text-xs text-gray-500">
                    Categorized: {csv.categorization.income?.length || 0} income, {csv.categorization.expense?.length || 0} expense, {csv.categorization.other?.length || 0} other
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}