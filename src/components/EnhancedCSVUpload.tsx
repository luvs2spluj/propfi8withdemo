import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Building2,
  DollarSign,
  Users,
  BarChart3,
  Calendar
} from 'lucide-react';
import ApiService from '../services/api';

interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  total_units?: number;
}

interface UploadResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
}

const EnhancedCSVUpload: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedFileType, setSelectedFileType] = useState<string>('financial');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileTypes = [
    {
      id: 'financial',
      name: 'Financial Data',
      description: 'Monthly revenue, expenses, occupancy data',
      icon: DollarSign,
      exampleHeaders: 'Date,Monthly Revenue,Occupancy Rate,Total Units,Expenses,Net Income',
      color: 'green'
    },
    {
      id: 'rentroll',
      name: 'Rent Roll',
      description: 'Unit-by-unit rental information',
      icon: Users,
      exampleHeaders: 'Unit Number,Tenant Name,Monthly Rent,Lease Start,Lease End,Status',
      color: 'blue'
    },
    {
      id: 'balancesheet',
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity data',
      icon: BarChart3,
      exampleHeaders: 'Account Name,Account Type,Current Balance,Previous Balance,Change',
      color: 'purple'
    },
    {
      id: 'maintenance',
      name: 'Maintenance Log',
      description: 'Repair and maintenance records',
      icon: Building2,
      exampleHeaders: 'Date,Unit Number,Issue Description,Cost,Status,Technician',
      color: 'orange'
    }
  ];

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const response = await ApiService.getProperties();
      if (response.success && response.data) {
        setProperties(response.data);
        if (response.data.length > 0) {
          setSelectedProperty(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      setError('Failed to load properties');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedProperty) {
      setError('Please select both a file and a property');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // For now, use the existing CSV upload endpoint
      // In the future, we can create specific endpoints for different file types
      const response = await ApiService.uploadCSV(uploadFile, selectedProperty);
      
      if (response.success) {
        setSuccess(`Successfully uploaded ${selectedFileType} data!`);
        setUploadFile(null);
        
        // Trigger dashboard refresh
        window.dispatchEvent(new CustomEvent('dataUpdated'));
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(response.error || response.message || 'Upload failed');
      }
    } catch (error: any) {
      setError('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileTypeInfo = () => {
    return fileTypes.find(ft => ft.id === selectedFileType) || fileTypes[0];
  };

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'border-green-200 bg-green-50 text-green-800',
      blue: 'border-blue-200 bg-blue-50 text-blue-800',
      purple: 'border-purple-200 bg-purple-50 text-purple-800',
      orange: 'border-orange-200 bg-orange-50 text-orange-800'
    };
    return colors[color as keyof typeof colors] || colors.green;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced CSV Upload</h1>
          <p className="text-gray-600 mt-1">Upload different types of property data files</p>
        </div>
        <button
          onClick={loadProperties}
          className="btn-secondary flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Properties
        </button>
      </div>

      {/* File Type Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select File Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fileTypes.map((fileType) => {
            const IconComponent = fileType.icon;
            const isSelected = selectedFileType === fileType.id;
            
            return (
              <button
                key={fileType.id}
                onClick={() => setSelectedFileType(fileType.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected 
                    ? `${getColorClasses(fileType.color)} border-current` 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <IconComponent className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-medium text-sm mb-1">{fileType.name}</h3>
                <p className="text-xs text-gray-600">{fileType.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Upload className="w-5 h-5 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Upload {getFileTypeInfo().name}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Property
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isUploading}
            >
              <option value="">Choose a property...</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
        </div>

        {uploadFile && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center">
              <FileText className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-700">
                Selected: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!uploadFile || !selectedProperty || isUploading}
          className="btn-primary flex items-center"
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload {getFileTypeInfo().name}
            </>
          )}
        </button>
      </div>

      {/* File Format Guide */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expected Format for {getFileTypeInfo().name}</h3>
        <div className="bg-gray-50 rounded-md p-4">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Required Headers:</strong>
          </p>
          <code className="text-sm bg-white px-2 py-1 rounded border">
            {getFileTypeInfo().exampleHeaders}
          </code>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Tips:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Use CSV format with comma separators</li>
            <li>Include headers in the first row</li>
            <li>Ensure dates are in YYYY-MM-DD format</li>
            <li>Use numbers without currency symbols</li>
            <li>Check for empty rows or missing data</li>
          </ul>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedCSVUpload;
