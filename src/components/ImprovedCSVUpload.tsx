import React, { useState, useRef, useEffect } from 'react';
import { csvUploadService, UploadResult, FileValidation } from '../services/csvUploadService';
import { localStorageService } from '../services/localStorageService';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Download, Settings } from 'lucide-react';

interface ImprovedCSVUploadProps {
  onFileUploaded?: (result: UploadResult) => void;
  showExistingFiles?: boolean;
  autoDetectType?: boolean;
}

export default function ImprovedCSVUpload({
  onFileUploaded,
  showExistingFiles = true,
  autoDetectType = true
}: ImprovedCSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [validationResult, setValidationResult] = useState<FileValidation | null>(null);
  const [propertyName, setPropertyName] = useState('');
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showExistingFiles) {
      loadExistingFiles();
    }
  }, [showExistingFiles]);

  const loadExistingFiles = () => {
    const files = csvUploadService.getAllFiles();
    setExistingFiles(files);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setValidationResult(null);

    try {
      // First validate the file
      const validation = await csvUploadService.validateFile(file);
      setValidationResult(validation);
      setShowValidation(true);

      if (!validation.isValid) {
        setUploadResult({
          success: false,
          error: 'File validation failed',
          validationErrors: validation.errors
        });
        return;
      }

    } catch (error) {
      console.error('Validation error:', error);
      setUploadResult({
        success: false,
        error: `Validation failed: ${error}`
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const result = await csvUploadService.uploadFile(file, propertyName);
      setUploadResult(result);
      
      if (result.success) {
        setShowValidation(false);
        loadExistingFiles();
        onFileUploaded?.(result);
        
        // Clear form
        setPropertyName('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        error: `Upload failed: ${error}`
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (csvUploadService.deleteFile(fileId)) {
      loadExistingFiles();
    } else {
      alert('Failed to delete file');
    }
  };

  const handleExportFile = (fileId: string) => {
    const file = csvUploadService.getFileById(fileId);
    if (file) {
      const blob = csvUploadService.exportToCSV(file);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const populateMockData = () => {
    localStorageService.populateWithMockData().then(() => {
      loadExistingFiles();
      alert('Mock data populated successfully!');
    });
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">CSV Data Management</h2>
        <button
          onClick={populateMockData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Use Sample Data
        </button>
      </div>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label htmlFor="csv-file" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Choose CSV file or drag and drop
              </span>
              <span className="mt-1 block text-sm text-gray-500">
                Supports Balance Sheets, Rent Rolls, and Cash Flow statements
              </span>
            </label>
            <input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="sr-only"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {uploading ? 'Processing...' : 'Select File'}
          </button>
        </div>

        {/* Property Name Input */}
        {validationResult && (
          <div className="mt-4">
            <input
              type="text"
              placeholder="Property name (optional)"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Validation Results */}
      {showValidation && validationResult && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">File Validation</h3>
            <div className="flex items-center space-x-2">
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                validationResult.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                Detected: {validationResult.detectedType.replace('_', ' ')}
              </span>
            </div>
          </div>

          {validationResult.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-red-600">Errors:</h4>
              <ul className="mt-1 text-sm text-red-600">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-yellow-600">Warnings:</h4>
              <ul className="mt-1 text-sm text-yellow-600">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Data */}
          {validationResult.previewData.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700">Preview (first 5 rows):</h4>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(validationResult.previewData[0]).map((header, index) => (
                        <th key={index} className="px-2 py-1 text-left font-medium text-gray-700">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.previewData.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-gray-200">
                        {Object.values(row).map((value, colIndex) => (
                          <td key={colIndex} className="px-2 py-1 text-gray-600">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Confirmation */}
          {validationResult.isValid && (
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleFileUpload}
                disabled={uploading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
              <button
                onClick={() => setShowValidation(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className={`rounded-lg p-4 ${
          uploadResult.success ? 'bg-green- validation was successful.' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {uploadResult.success ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="ml-2 text-green-700">
                  File uploaded successfully!
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="ml-2 text-red-700">
                  Upload failed: {uploadResult.error}
                </span>
              </>
            )}
          </div>
          {uploadResult.validationErrors && uploadResult.validationErrors.length > 0 && (
            <ul className="mt-2 text-sm text-red-600">
              {uploadResult.validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Existing Files */}
      {showExistingFiles && existingFiles.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Files</h3>
          <div className="space-y-3">
            {existingFiles.map((file) => (
              <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{file.filename}</h4>
                      <p className="text-xs text-gray-500">
                        {file.metadata.fileType.replace('_', ' ')} • {file.data.length} rows • {' '}
                        {new Date(file.metadata.uploadedAt).toLocaleDate()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleExportFile(file.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Export"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

