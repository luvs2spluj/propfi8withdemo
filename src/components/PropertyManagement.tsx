import React, { useState, useEffect } from 'react';
import { Building2, Plus, Upload, FileText, Calendar, Tag, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { propertyCSVStorageService, PropertyInfo, PropertyCSVRecord, DuplicateCheckResult } from '../services/propertyCSVStorageService';

interface PropertyManagementProps {
  onPropertySelected?: (property: PropertyInfo) => void;
  onCSVUploaded?: (record: PropertyCSVRecord) => void;
  className?: string;
}

const PropertyManagement: React.FC<PropertyManagementProps> = ({
  onPropertySelected,
  onCSVUploaded,
  className = ''
}) => {
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyInfo | null>(null);
  const [csvRecords, setCsvRecords] = useState<PropertyCSVRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newProperty, setNewProperty] = useState({
    name: '',
    address: '',
    propertyType: 'residential' as 'residential' | 'commercial' | 'mixed-use'
  });
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'checking' | 'uploading' | 'success' | 'error'>('idle');

  useEffect(() => {
    initializeService();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadCSVRecords(selectedProperty.id);
    }
  }, [selectedProperty]);

  const initializeService = async () => {
    try {
      await propertyCSVStorageService.initialize();
      await loadProperties();
    } catch (error) {
      console.error('Failed to initialize property CSV storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const props = await propertyCSVStorageService.getProperties();
      setProperties(props);
      if (props.length > 0 && !selectedProperty) {
        setSelectedProperty(props[0]);
        onPropertySelected?.(props[0]);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  };

  const loadCSVRecords = async (propertyId: string) => {
    try {
      const records = await propertyCSVStorageService.getCSVRecords(propertyId);
      setCsvRecords(records);
    } catch (error) {
      console.error('Failed to load CSV records:', error);
    }
  };

  const handleAddProperty = async () => {
    if (!newProperty.name.trim()) return;

    try {
      const property = await propertyCSVStorageService.createProperty(newProperty);
      setProperties([...properties, property]);
      setSelectedProperty(property);
      onPropertySelected?.(property);
      setNewProperty({ name: '', address: '', propertyType: 'residential' });
      setShowAddProperty(false);
    } catch (error) {
      console.error('Failed to add property:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProperty) return;

    setUploadStatus('checking');
    setDuplicateCheck(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // Detect CSV type based on headers
      const csvType = detectCSVType(headers);
      
      // Extract year/month from data if possible
      const { year, month } = extractPeriodFromData(data);

      // Check for duplicates
      const duplicateResult = await propertyCSVStorageService.checkForDuplicates(
        selectedProperty.id,
        csvType,
        data,
        year,
        month
      );

      setDuplicateCheck(duplicateResult);

      if (duplicateResult.isDuplicate) {
        setUploadStatus('error');
        return;
      }

      // Process categorization (simplified)
      const categorization = {
        buckets: {
          income: { individualItems: [], totals: {} },
          expense: { individualItems: [], totals: {} },
          other: { individualItems: [], totals: {} }
        }
      };

      setUploadStatus('uploading');

      // Save the CSV record
      const record = await propertyCSVStorageService.processCSVWithDeduplication(
        selectedProperty.id,
        csvType,
        file.name,
        data,
        categorization,
        year,
        month
      );

      setCsvRecords([...csvRecords, record]);
      onCSVUploaded?.(record);
      setUploadStatus('success');

      // Reset file input
      event.target.value = '';

    } catch (error) {
      console.error('Failed to process CSV:', error);
      setUploadStatus('error');
    }
  };

  const detectCSVType = (headers: string[]): string => {
    const headerText = headers.join(' ').toLowerCase();
    
    if (headerText.includes('rent') && headerText.includes('unit')) return 'rent-roll';
    if (headerText.includes('cash') && headerText.includes('flow')) return 'cash-flow';
    if (headerText.includes('income') || headerText.includes('revenue')) return 'income';
    if (headerText.includes('balance') && headerText.includes('sheet')) return 'balance-sheet';
    if (headerText.includes('budget') || headerText.includes('forecast')) return 'budget';
    
    return 'other';
  };

  const extractPeriodFromData = (data: any[]): { year?: number; month?: number } => {
    // Look for date patterns in the data
    for (const row of data) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string') {
          const dateMatch = value.match(/(\d{4})[-\/](\d{1,2})/);
          if (dateMatch) {
            return {
              year: parseInt(dateMatch[1]),
              month: parseInt(dateMatch[2])
            };
          }
        }
      }
    }
    return {};
  };

  const getCSVTypeIcon = (type: string) => {
    switch (type) {
      case 'rent-roll': return '🏠';
      case 'cash-flow': return '💰';
      case 'income': return '📈';
      case 'balance-sheet': return '📊';
      case 'budget': return '📋';
      default: return '📄';
    }
  };

  const getCSVTypeColor = (type: string) => {
    switch (type) {
      case 'rent-roll': return 'bg-blue-100 text-blue-800';
      case 'cash-flow': return 'bg-green-100 text-green-800';
      case 'income': return 'bg-purple-100 text-purple-800';
      case 'balance-sheet': return 'bg-orange-100 text-orange-800';
      case 'budget': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading property management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Building2 className="w-6 h-6 mr-2" />
          Property CSV Management
        </h2>
        <button
          onClick={() => setShowAddProperty(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </button>
      </div>

      {/* Property Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Property
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {properties.map(property => (
            <button
              key={property.id}
              onClick={() => {
                setSelectedProperty(property);
                onPropertySelected?.(property);
              }}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                selectedProperty?.id === property.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{property.name}</div>
              {property.address && (
                <div className="text-sm text-gray-600">{property.address}</div>
              )}
              <div className="text-xs text-gray-500 capitalize mt-1">
                {property.propertyType}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Property Modal */}
      {showAddProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Property</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={newProperty.name}
                  onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 123 Main Street"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newProperty.address}
                  onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type
                </label>
                <select
                  value={newProperty.propertyType}
                  onChange={(e) => setNewProperty({ ...newProperty, propertyType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed-use">Mixed Use</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddProperty(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProperty}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Section */}
      {selectedProperty && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Upload CSV for {selectedProperty.name}
            </h3>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploadStatus === 'checking' || uploadStatus === 'uploading'}
              />
              <button
                className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
                  uploadStatus === 'checking' || uploadStatus === 'uploading'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
                disabled={uploadStatus === 'checking' || uploadStatus === 'uploading'}
              >
                <Upload className="w-4 h-4" />
                <span>
                  {uploadStatus === 'checking' ? 'Checking...' :
                   uploadStatus === 'uploading' ? 'Uploading...' : 'Upload CSV'}
                </span>
              </button>
            </div>
          </div>

          {/* Upload Status */}
          {uploadStatus === 'success' && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-md flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800">CSV uploaded successfully!</span>
            </div>
          )}

          {uploadStatus === 'error' && duplicateCheck && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">Duplicate Detected</span>
              </div>
              <div className="text-red-700 text-sm">
                {duplicateCheck.duplicateType === 'exact' && 
                  `Exact duplicate: ${duplicateCheck.existingRecord?.fileName}`}
                {duplicateCheck.duplicateType === 'property-period' && 
                  'Duplicate for same property and time period'}
                {duplicateCheck.duplicateType === 'line-item' && 
                  'Duplicate line items found in existing records'}
              </div>
              {duplicateCheck.conflictingRecords.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Conflicting records:</p>
                  <ul className="text-sm text-red-600 ml-4">
                    {duplicateCheck.conflictingRecords.map(record => (
                      <li key={record.id}>• {record.fileName}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CSV Records List */}
      {selectedProperty && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            CSV Files for {selectedProperty.name}
          </h3>
          
          {csvRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No CSV files uploaded yet</p>
              <p className="text-sm">Upload a CSV file to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {csvRecords.map(record => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getCSVTypeIcon(record.csvType)}</span>
                    <div>
                      <div className="font-medium text-gray-900">{record.fileName}</div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded-full text-xs ${getCSVTypeColor(record.csvType)}`}>
                          {record.csvType.replace('-', ' ')}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {record.uploadedAt.toLocaleDateString()}
                        </span>
                        <span>{record.metadata.totalRecords} records</span>
                        {record.metadata.duplicateKeys.length > 0 && (
                          <span className="flex items-center text-orange-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {record.metadata.duplicateKeys.length} duplicates
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // Toggle active status
                        propertyCSVStorageService.updateCSVRecord(record.id, {
                          isActive: !record.isActive
                        }).then(() => {
                          loadCSVRecords(selectedProperty.id);
                        });
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        record.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {record.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this CSV?')) {
                          propertyCSVStorageService.deleteCSVRecord(record.id).then(() => {
                            loadCSVRecords(selectedProperty.id);
                          });
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-full"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyManagement;