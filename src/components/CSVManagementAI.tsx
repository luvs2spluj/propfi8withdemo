import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Edit, 
  Trash2, 
  Eye, 
  Download,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain,
  Database,
  Plus
} from 'lucide-react';
import { aiParserService, CSVFileAI, ParsedDataAI, HeaderMatchAI } from '../config/supabaseAI';

interface CSVManagementData {
  csvFile: CSVFileAI;
  parsedData: ParsedDataAI[];
  headerMatches: HeaderMatchAI[];
  totalRecords: number;
  categories: Record<string, number>;
  totalAmount: number;
}

const CSVManagementAI: React.FC = () => {
  const [csvFiles, setCsvFiles] = useState<CSVFileAI[]>([]);
  const [csvData, setCsvData] = useState<CSVManagementData[]>([]);
  const [selectedFile, setSelectedFile] = useState<CSVFileAI | null>(null);
  const [selectedData, setSelectedData] = useState<CSVManagementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFile, setEditingFile] = useState<CSVFileAI | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    loadCSVFiles();
    loadProperties();
  }, []);

  const loadCSVFiles = async () => {
    setIsLoading(true);
    try {
      const result = await aiParserService.getCSVFiles();
      if (result.success && result.data) {
        setCsvFiles(result.data);
        
        // Load detailed data for each file
        const detailedData = await Promise.all(
          result.data.map(async (file) => {
            const parsedDataResult = await aiParserService.getParsedData(file.id);
            const parsedData = parsedDataResult.success ? parsedDataResult.data || [] : [];
            
            // Calculate summary statistics
            const totalRecords = parsedData.length;
            const categories: Record<string, number> = {};
            let totalAmount = 0;
            
            parsedData.forEach(record => {
              const category = record.category || 'other';
              categories[category] = (categories[category] || 0) + 1;
              totalAmount += record.amount || 0;
            });
            
            return {
              csvFile: file,
              parsedData,
              headerMatches: [], // We'll load this separately if needed
              totalRecords,
              categories,
              totalAmount
            };
          })
        );
        
        setCsvData(detailedData);
      }
    } catch (error) {
      console.error('Failed to load CSV files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const result = await aiParserService.getProperties();
      if (result.success && result.data) {
        setProperties(result.data);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this CSV file and all its data?')) {
      return;
    }

    try {
      const result = await aiParserService.deleteCSVFile(fileId);
      if (result.success) {
        await loadCSVFiles(); // Refresh the list
      } else {
        alert('Failed to delete file: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEditFile = (file: CSVFileAI) => {
    setEditingFile(file);
    setShowEditModal(true);
  };

  const handleViewDetails = async (file: CSVFileAI) => {
    setSelectedFile(file);
    const data = csvData.find(d => d.csvFile.id === file.id);
    setSelectedData(data || null);
    setShowDetails(true);
  };

  const handleDownloadFile = async (file: CSVFileAI) => {
    try {
      // Implement download functionality
      console.log('Downloading file:', file.file_name);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleReprocessFile = async (file: CSVFileAI) => {
    try {
      // Implement reprocessing functionality
      console.log('Reprocessing file:', file.file_name);
      await loadCSVFiles();
    } catch (error) {
      console.error('Failed to reprocess file:', error);
    }
  };

  const filteredFiles = csvFiles.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.property_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || file.upload_status === filterStatus;
    const matchesProperty = filterProperty === 'all' || file.property_id === filterProperty;
    
    return matchesSearch && matchesStatus && matchesProperty;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Database className="w-8 h-8 mr-3 text-blue-600" />
            CSV Management
          </h1>
          <p className="text-gray-600 mt-1">Manage and analyze your AI-processed CSV files</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              const event = new CustomEvent('navigateToPage', { detail: { page: 'upload-ai' } });
              window.dispatchEvent(event);
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New CSV</span>
          </button>
          <button
            onClick={loadCSVFiles}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files by name or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Properties</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 ${viewMode === 'table' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Files Display */}
      {isLoading ? (
        <div className="card text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading CSV files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No CSV files found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all' || filterProperty !== 'all' 
              ? 'No files match your current filters.' 
              : 'Upload your first CSV file to get started.'}
          </p>
          <button
            onClick={() => {
              const event = new CustomEvent('navigateToPage', { detail: { page: 'upload-ai' } });
              window.dispatchEvent(event);
            }}
            className="btn-primary"
          >
            Upload CSV File
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFiles.map(file => {
            const data = csvData.find(d => d.csvFile.id === file.id);
            return (
              <div key={file.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Brain className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 truncate">{file.file_name}</h3>
                      <p className="text-sm text-gray-500">{file.property_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(file.upload_status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.upload_status)}`}>
                      {file.upload_status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <p className="font-medium">{formatFileSize(file.file_size)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">AI Confidence:</span>
                      <p className="font-medium">{(file.ai_confidence * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Records:</span>
                      <p className="font-medium">{data?.totalRecords || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Amount:</span>
                      <p className="font-medium">${data?.totalAmount?.toLocaleString() || '0'}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-500 mb-2">Categories:</p>
                    <div className="flex flex-wrap gap-1">
                      {data && Object.entries(data.categories).slice(0, 3).map(([category, count]) => (
                        <span key={category} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {category}: {count}
                        </span>
                      ))}
                      {data && Object.keys(data.categories).length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          +{Object.keys(data.categories).length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-500 mb-2">Uploaded:</p>
                    <p className="text-sm font-medium">{formatDate(file.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewDetails(file)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReprocessFile(file)}
                      className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                      title="Reprocess"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditFile(file)}
                      className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map(file => {
                  const data = csvData.find(d => d.csvFile.id === file.id);
                  return (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Brain className="w-5 h-5 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{file.file_name}</div>
                            <div className="text-sm text-gray-500">{formatFileSize(file.file_size)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.property_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(file.upload_status)}
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.upload_status)}`}>
                            {file.upload_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(file.ai_confidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data?.totalRecords || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${data?.totalAmount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(file.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(file)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="text-green-600 hover:text-green-900"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditFile(file)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* File Details Modal */}
      {showDetails && selectedFile && selectedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">CSV File Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">File Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div><span className="font-medium">Name:</span> {selectedFile.file_name}</div>
                    <div><span className="font-medium">Size:</span> {formatFileSize(selectedFile.file_size)}</div>
                    <div><span className="font-medium">Property:</span> {selectedFile.property_name}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedFile.upload_status)}`}>
                        {selectedFile.upload_status}
                      </span>
                    </div>
                    <div><span className="font-medium">AI Confidence:</span> {(selectedFile.ai_confidence * 100).toFixed(1)}%</div>
                    <div><span className="font-medium">Format:</span> {selectedFile.format_detected}</div>
                    <div><span className="font-medium">Uploaded:</span> {formatDate(selectedFile.created_at)}</div>
                  </div>
                </div>

                {/* Data Summary */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Data Summary</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div><span className="font-medium">Total Records:</span> {selectedData.totalRecords}</div>
                    <div><span className="font-medium">Total Amount:</span> ${selectedData.totalAmount.toLocaleString()}</div>
                    <div><span className="font-medium">Categories:</span></div>
                    <div className="ml-4 space-y-1">
                      {Object.entries(selectedData.categories).map(([category, count]) => (
                        <div key={category} className="text-sm">
                          {category}: {count} records
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Data */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Data</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedData.parsedData.slice(0, 10).map((record, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.account_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.period}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.amount.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedData.parsedData.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Showing first 10 records of {selectedData.parsedData.length} total records
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit CSV File</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
                  <input
                    type="text"
                    value={editingFile.file_name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVManagementAI;
