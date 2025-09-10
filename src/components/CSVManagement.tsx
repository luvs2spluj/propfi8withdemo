import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Download, 
  Eye, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  FileText,
  RefreshCw
} from 'lucide-react';
import ApiService from '../services/api';

interface CSVUpload {
  id: string;
  property_id: string;
  filename: string;
  file_size: number;
  rows_processed: number;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  upload_status: string;
  error_message?: string;
  uploaded_at: string;
  processed_at?: string;
  property_name: string;
}

interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  total_units?: number;
}

const CSVManagement: React.FC = () => {
  const [uploads, setUploads] = useState<CSVUpload[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProperty, setUploadProperty] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadUploads();
    }
  }, [selectedProperty]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load properties
      const propertiesResponse = await ApiService.getProperties();
      if (propertiesResponse.success && propertiesResponse.data) {
        setProperties(propertiesResponse.data);
        if (propertiesResponse.data.length > 0) {
          setSelectedProperty(propertiesResponse.data[0].id);
        }
      }
    } catch (error: any) {
      setError('Failed to load data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUploads = async () => {
    try {
      const response = await ApiService.getUploadHistory();
      if (response.success && response.data) {
        // Filter uploads by selected property
        const filteredUploads = selectedProperty 
          ? response.data.filter((upload: CSVUpload) => upload.property_id === selectedProperty)
          : response.data;
        setUploads(filteredUploads);
      }
    } catch (error: any) {
      console.error('Error loading uploads:', error);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    try {
      // First delete the associated property data
      await ApiService.deletePropertyDataByUpload(uploadId);
      
      // Then delete the upload record
      const response = await ApiService.deleteUpload(uploadId);
      if (response.success) {
        setUploads(uploads.filter(upload => upload.id !== uploadId));
        setDeleteConfirm(null);
        setError(null); // Clear any previous errors
      } else {
        setError('Failed to delete upload: ' + response.error);
      }
    } catch (error: any) {
      setError('Failed to delete upload: ' + error.message);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadProperty) {
      setError('Please select both a file and a property');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading file...');
    setError(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await ApiService.uploadCSV(uploadFile, uploadProperty);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('Processing complete!');

      if (response.success) {
        setUploadStatus('Upload successful!');
        setUploadFile(null);
        setUploadProperty('');
        
        // Refresh the uploads list
        await loadData();
        
        // Clear status after 3 seconds
        setTimeout(() => {
          setUploadStatus('');
          setUploadProgress(0);
        }, 3000);
      } else {
        setError(response.error || 'Upload failed');
        setUploadStatus('Upload failed');
      }
    } catch (error: any) {
      setError('Upload failed: ' + error.message);
      setUploadStatus('Upload failed');
    } finally {
      setIsUploading(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading CSV management...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CSV Management</h1>
          <p className="text-gray-600 mt-1">Upload, manage, and process CSV files for your properties.</p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Upload className="w-5 h-5 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Upload New CSV File</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Property
            </label>
            <select
              value={uploadProperty}
              onChange={(e) => setUploadProperty(e.target.value)}
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

        {uploadStatus && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{uploadStatus}</span>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!uploadFile || !uploadProperty || isUploading}
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
              Upload CSV
            </>
          )}
        </button>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Expected CSV format:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Date (YYYY-MM-DD format)</li>
            <li>Monthly Revenue (or Revenue, Income)</li>
            <li>Occupancy Rate (0-100%)</li>
            <li>Total Units (optional)</li>
            <li>Expenses (optional)</li>
            <li>Net Income (optional - calculated automatically)</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Property Selector */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Property:</label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={properties.length === 0}
          >
            <option value="">All Properties</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          {selectedProperty && (
            <span className="text-sm text-gray-500">
              Showing uploads for: {properties.find(p => p.id === selectedProperty)?.name}
            </span>
          )}
        </div>
      </div>

      {/* Uploads Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Uploaded CSV Files</h3>
          <p className="text-sm text-gray-600 mt-1">
            {uploads.length} file{uploads.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>

        {uploads.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No CSV files uploaded yet.</p>
            <p className="text-sm text-gray-400 mt-2">Upload CSV files to see them here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processing Results
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
                {uploads.map((upload) => (
                  <tr key={upload.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {upload.filename}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(upload.file_size)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(upload.upload_status)}
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(upload.upload_status)}`}>
                          {upload.upload_status}
                        </span>
                      </div>
                      {upload.error_message && (
                        <div className="text-xs text-red-600 mt-1">
                          {upload.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>Processed: {upload.rows_processed}</div>
                        <div className="text-green-600">Inserted: {upload.rows_inserted}</div>
                        <div className="text-blue-600">Updated: {upload.rows_updated}</div>
                        <div className="text-yellow-600">Skipped: {upload.rows_skipped}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(upload.uploaded_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setDeleteConfirm(upload.id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                          title="Delete upload and data"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete CSV Upload</h3>
              <p className="text-sm text-gray-500 mb-4">
                This will permanently delete the CSV file and all associated data. This action cannot be undone.
              </p>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUpload(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVManagement;
