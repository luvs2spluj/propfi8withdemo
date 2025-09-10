import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Building2,
  DollarSign,
  Users,
  Calendar
} from 'lucide-react';

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
  id: string;
  name: string;
  size: number;
  data: CSVData[];
  uploadedAt: Date;
  propertyId: string;
}

const CSVUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const properties = [
    { id: '1', name: 'Downtown Plaza' },
    { id: '2', name: 'Garden Apartments' },
    { id: '3', name: 'Riverside Complex' },
    { id: '4', name: 'Oakwood Manor' },
    { id: '5', name: 'Sunset Heights' },
    { id: '6', name: 'Pine Valley' },
  ];

  const parseCSV = (csvText: string): CSVData[] => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const data: CSVData[] = [];
    
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
    
    return data;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedProperty) {
      setUploadError('Please select a property first');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const text = await file.text();
      const csvData = parseCSV(text);
      
      if (csvData.length === 0) {
        setUploadError('No valid data found in CSV file');
        setIsUploading(false);
        return;
      }

      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        data: csvData,
        uploadedAt: new Date(),
        propertyId: selectedProperty
      };

      setUploadedFiles(prev => [...prev, newFile]);
      
      // Store in localStorage for persistence
      const existingData = JSON.parse(localStorage.getItem('propertyData') || '{}');
      existingData[selectedProperty] = csvData;
      localStorage.setItem('propertyData', JSON.stringify(existingData));
      
      // Trigger dashboard update
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { propertyId: selectedProperty, data: csvData } 
      }));

    } catch (error) {
      setUploadError('Error processing CSV file');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPropertyName = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CSV Data Upload</h1>
          <p className="text-gray-600 mt-1">Upload CSV files to populate your dashboard with real property data</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Property Data</h3>
        
        <div className="space-y-4">
          {/* Property Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Property
            </label>
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
                disabled={isUploading || !selectedProperty}
                className="btn-primary flex items-center space-x-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Choose CSV File'}</span>
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Supported format: CSV files only
              </p>
            </div>
          </div>

          {/* Error Display */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">{uploadError}</span>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">Expected CSV Format:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Headers:</strong> Property Name, Address, Monthly Revenue, Occupancy Rate, Total Units, Occupied Units, Expenses, Net Income, Date</p>
              <p><strong>Example:</strong> Downtown Plaza, 123 Main St, 45600, 95.8, 24, 23, 12000, 33600, 2024-01-15</p>
              <div className="mt-3">
                <a 
                  href="/sample-data.csv" 
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Files</h3>
          <div className="space-y-3">
            {uploadedFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{file.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{getPropertyName(file.propertyId)}</span>
                      <span>{formatFileSize(file.size)}</span>
                      <span>{file.uploadedAt.toLocaleDateString()}</span>
                      <span>{file.data.length} records</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Uploaded</span>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Preview */}
      {uploadedFiles.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {uploadedFiles.map(file => {
              const totalRevenue = file.data.reduce((sum, record) => sum + record.monthlyRevenue, 0);
              const avgOccupancy = file.data.reduce((sum, record) => sum + record.occupancyRate, 0) / file.data.length;
              const totalUnits = file.data.reduce((sum, record) => sum + record.totalUnits, 0);
              const totalExpenses = file.data.reduce((sum, record) => sum + record.expenses, 0);

              return (
                <div key={file.id} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{getPropertyName(file.propertyId)}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Revenue:</span>
                      <span className="font-medium">${totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Avg Occupancy:</span>
                      <span className="font-medium">{avgOccupancy.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Units:</span>
                      <span className="font-medium">{totalUnits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Expenses:</span>
                      <span className="font-medium">${totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVUpload;
