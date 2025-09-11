import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Loader2
} from 'lucide-react';
import ApiService from '../services/api';

interface CSVData {
  propertyName: string;
  address: string;
  monthlyRevenue: number;
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  expenses: number;
  netIncome: number;
  date: string;
}

interface UploadedFile {
  id: number;
  file_name: string;
  file_size: number;
  records_processed: number;
  records_skipped: number;
  upload_status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  uploaded_at: string;
  property_name: string;
}

const CSVUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [properties, setProperties] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load properties and upload history on component mount
  useEffect(() => {
    checkBackendStatus();
    loadProperties();
    loadUploadHistory();
  }, []);

  const checkBackendStatus = async () => {
    try {
      await ApiService.getHealth();
      setBackendStatus('connected');
    } catch (error) {
      setBackendStatus('disconnected');
    }
  };

  const loadProperties = async () => {
    try {
      const response = await ApiService.getProperties();
      if (response.success && response.data) {
        setProperties(response.data);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  };

  const loadUploadHistory = async () => {
    try {
      const response = await ApiService.getUploadHistory();
      if (response.success) {
        setUploadedFiles(response.data);
      }
    } catch (error) {
      console.error('Failed to load upload history:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setValidationResult(null);

    try {
      // Check if backend is available
      try {
        await ApiService.getHealth();
      } catch (healthError) {
        // Backend not available, use local processing as fallback
        console.warn('Backend not available, using local processing');
        await handleLocalProcessing(file);
        return;
      }

      if (!selectedProperty) {
        setUploadError('Please select a property first');
        setIsUploading(false);
        return;
      }

      // Get property name for validation
      const selectedPropertyData = properties.find(p => p.id === selectedProperty);
      const propertyName = selectedPropertyData?.name;

      // First validate the CSV
      const validation = await ApiService.validateCSV(file, propertyName);
      setValidationResult(validation.data);

      if (!validation.data.isValid) {
        setUploadError(`CSV validation failed: ${validation.data.errors.length} errors found`);
        setIsUploading(false);
        return;
      }

      // Upload the CSV
      const result = await ApiService.uploadCSV(file, selectedProperty);
      
      if (result.success) {
        // Reload upload history
        await loadUploadHistory();
        
        // Trigger dashboard update
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
          detail: { propertyId: selectedProperty, uploadResult: result.data } 
        }));

        setUploadError(null);
      } else {
        setUploadError(result.message || 'Upload failed');
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Fallback to local processing if backend fails
      if (error.message.includes('fetch') || error.message.includes('Network')) {
        console.warn('Network error, falling back to local processing');
        await handleLocalProcessing(file);
      } else {
        setUploadError(error.message || 'Error processing CSV file');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLocalProcessing = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === headers.length && values[0]) {
          try {
            data.push({
              propertyName: values[0] || '',
              address: values[1] || '',
              monthlyRevenue: parseFloat(values[2]) || 0,
              occupancyRate: parseFloat(values[3]) || 0,
              totalUnits: parseInt(values[4]) || 0,
              occupiedUnits: parseInt(values[5]) || 0,
              expenses: parseFloat(values[6]) || 0,
              netIncome: parseFloat(values[7]) || 0,
              date: values[8] || new Date().toISOString().split('T')[0]
            });
          } catch (error) {
            console.error('Error parsing row:', error);
          }
        }
      }
      
      if (data.length === 0) {
        setUploadError('No valid data found in CSV file');
        return;
      }

      // Data processed successfully
      
      // Trigger dashboard update
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { propertyId: selectedProperty, data: data } 
      }));

      setValidationResult({
        isValid: true,
        totalRows: data.length,
        validRows: data.length,
        invalidRows: 0,
        errors: []
      });

      setUploadError(null);
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('dataUpdated'));
      
    } catch (error) {
      setUploadError('Error processing CSV file locally');
      console.error('Local processing error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CSV Data Upload</h1>
          <p className="text-gray-600 mt-1">Upload CSV files to populate your dashboard with real property data</p>
          <div className="flex items-center space-x-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' :
              backendStatus === 'disconnected' ? 'bg-red-500' :
              'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-500">
              {backendStatus === 'connected' ? 'Backend Connected' :
               backendStatus === 'disconnected' ? 'Using Local Processing' :
               'Checking Connection...'}
            </span>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Property Data</h3>
        
        <div className="space-y-4">
          {/* Property Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Property
              </label>
              <button
                onClick={() => {
                  // Navigate to property management page
                  const event = new CustomEvent('navigateToPage', { detail: { page: 'property-management' } });
                  window.dispatchEvent(event);
                }}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                + Add Property
              </button>
            </div>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Choose a property...</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors duration-200">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="btn-primary flex items-center space-x-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{isUploading ? 'Processing...' : 'Choose CSV File'}</span>
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Supported format: CSV files only
              </p>
              {!selectedProperty && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ Select a property above for best results
                </p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">{uploadError}</span>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">Validation Results</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Total Rows:</strong> {validationResult.totalRows}</p>
                <p><strong>Valid Rows:</strong> {validationResult.validRows}</p>
                <p><strong>Invalid Rows:</strong> {validationResult.invalidRows}</p>
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p><strong>Errors:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      {validationResult.errors.slice(0, 3).map((error: any, index: number) => (
                        <li key={index}>{error.error}</li>
                      ))}
                      {validationResult.errors.length > 3 && (
                        <li>... and {validationResult.errors.length - 3} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">Expected CSV Format:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Required Headers:</strong> Date, Revenue, Occupancy Rate</p>
              <p><strong>Optional Headers:</strong> Property Name (if not selecting property above), Address, Total Units, Occupied Units, Expenses, Net Income</p>
              <p><strong>Example:</strong> 2024-01-15, 45600, 95.8, 24, 23, 12000, 33600</p>
              <p className="text-green-700 font-medium">✅ Property name is optional when you select a property above!</p>
              <div className="mt-3">
                <a 
                  href="/correct-chico-data.csv" 
                  download="sample-property-data.csv"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download Sample CSV Template</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload History</h3>
          <div className="space-y-3">
            {uploadedFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{file.file_name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{file.property_name}</span>
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                      <span>{file.records_processed} processed</span>
                      {file.records_skipped > 0 && (
                        <span className="text-orange-600">{file.records_skipped} skipped</span>
                      )}
                    </div>
                    {file.error_message && (
                      <p className="text-sm text-red-600 mt-1">{file.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.upload_status)}`}>
                    {file.upload_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default CSVUpload;
