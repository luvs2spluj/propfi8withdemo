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
import unifiedPropertyService from '../services/unifiedPropertyService';

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
  const [processingMode, setProcessingMode] = useState<'supabase' | 'local'>('supabase');
  const [unifiedProperties, setUnifiedProperties] = useState<any[]>([]);
  const [localProcessingResult, setLocalProcessingResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load properties and upload history on component mount
  useEffect(() => {
    initializeUnifiedService();
    checkBackendStatus();
    loadProperties();
    loadUploadHistory();
  }, []);

  const initializeUnifiedService = async () => {
    try {
      await unifiedPropertyService.initialize();
      const allProperties = unifiedPropertyService.getAllProperties();
      setUnifiedProperties(allProperties);
      console.log('🏢 Unified properties loaded:', allProperties.length);
    } catch (error) {
      console.error('Failed to initialize unified service:', error);
    }
  };

  const checkBackendStatus = async () => {
    try {
      const status = await ApiService.checkBackendStatus();
      if (status.supabase || status.local) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
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
      if (!selectedProperty) {
        setUploadError('Please select a property first');
        setIsUploading(false);
        return;
      }

      // Get property name for processing
      const selectedPropertyData = properties.find(p => p.id === selectedProperty);
      const propertyName = selectedPropertyData?.name;

      if (processingMode === 'local') {
        // Local processing mode - use local backend
        console.log('🏠 Using local processing mode...');
        await handleLocalProcessing(file, propertyName);
        return;
      }

      // Supabase processing mode - use Supabase backend
      console.log('🗄️ Using Supabase processing mode...');
      
      // Check if Supabase backend is available
      try {
        await ApiService.getHealth();
      } catch (healthError) {
        setUploadError('Supabase backend not available. Please switch to Local mode or start the Supabase backend.');
        setIsUploading(false);
        return;
      }

      // First validate the CSV
      const validation = await ApiService.validateCSV(file, propertyName);
      setValidationResult(validation.data);

      if (!validation.data.isValid) {
        setUploadError(`CSV validation failed: ${validation.data.errors.length} errors found`);
        setIsUploading(false);
        return;
      }

      // Upload the CSV to Supabase
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
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('Network'))) {
        console.warn('Network error, falling back to local processing');
        await handleLocalProcessing(file);
      } else {
        setUploadError(error instanceof Error ? error.message : 'Error processing CSV file');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLocalProcessing = async (file: File, propertyName?: string) => {
    try {
      console.log('🏠 Processing CSV locally...');
      
      // Check if backend is available first
      let backendAvailable = false;
      try {
        await ApiService.getHealth();
        backendAvailable = true;
      } catch (error) {
        console.log('Backend not available, using pure local processing');
        backendAvailable = false;
      }
      
      if (backendAvailable) {
        // Use the new local processing API endpoint
        const result = await ApiService.processCSVLocal(file, propertyName);
        
        if (result.success) {
          setLocalProcessingResult(result.data);
          setUploadError(null);
          
          // Trigger dashboard update with local data
          window.dispatchEvent(new CustomEvent('dataUpdated', { 
            detail: { 
              propertyId: selectedProperty, 
              uploadResult: result.data,
              processingMode: 'local'
            } 
          }));
          
          console.log('✅ Local processing completed:', result.data);
        } else {
          setUploadError(result.message || 'Local processing failed');
        }
      } else {
        // Pure local processing without backend
        await handlePureLocalProcessing(file, propertyName);
      }
    } catch (error) {
      console.error('Local processing error:', error);
      setUploadError(error instanceof Error ? error.message : 'Error processing CSV file locally');
    }
  };

  const handlePureLocalProcessing = async (file: File, propertyName?: string) => {
    try {
      console.log('🏠 Pure local processing (no backend)...');
      
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('No data rows found in CSV');
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      console.log('📋 Detected columns:', headers);
      
      // Check if this is month-column format
      const monthColumns = headers.filter(header => {
        const normalizedHeader = header.toLowerCase().trim();
        return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}$/i.test(normalizedHeader);
      });
      
      const isMonthColumnFormat = monthColumns.length > 0;
      console.log('📊 Format detected:', isMonthColumnFormat ? 'month-column' : 'traditional');
      
      // Simple data processing
      const processedData = [];
      const accountNames = new Set();
      let totalAmount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) continue;
        
        const accountName = values[0];
        
        // Skip section headers
        if (!accountName || /^(income|expense|totals?)$/i.test(accountName)) {
          continue;
        }
        
        accountNames.add(accountName);
        
        if (isMonthColumnFormat) {
          // Process month columns
          for (const monthCol of monthColumns) {
            const colIndex = headers.indexOf(monthCol);
            const rawValue = values[colIndex] || '';
            const amount = parseAmount(rawValue);
            
            if (amount !== null) {
              processedData.push({
                account_name: accountName,
                period: monthCol,
                amount: amount,
                amount_raw: rawValue
              });
              totalAmount += amount || 0;
            }
          }
        } else {
          // Process traditional format
          const revenueIndex = headers.findIndex(h => h.toLowerCase().includes('revenue'));
          const amount = revenueIndex >= 0 ? parseAmount(values[revenueIndex]) : 0;
          
          processedData.push({
            account_name: accountName,
            period: '2024-01',
            amount: amount,
            amount_raw: values[revenueIndex] || ''
          });
          totalAmount += amount || 0;
        }
      }
      
      // Simple categorization
      const categorizedData = processedData.map(row => {
        const name = row.account_name.toLowerCase().trim();
        let category = 'other';
        
        // Revenue/Income accounts
        if (name.includes('rent') || name.includes('tenant') || name.includes('resident') ||
            name.includes('rental') || name.includes('short term') || name.includes('application fee') ||
            name.includes('pet fee') || name.includes('lock') || name.includes('key') ||
            name.includes('insurance svcs income') || name.includes('credit reporting services income')) {
          category = 'income';
        }
        // Utilities accounts
        else if (name.includes('utility') || name.includes('utilities') || name.includes('water') || 
                 name.includes('garbage') || name.includes('electric') || name.includes('gas') || 
                 name.includes('sewer') || name.includes('refuse disposal') || name.includes('pest control')) {
          category = 'utilities';
        }
        // Maintenance accounts
        else if (name.includes('maintenance') || name.includes('repair') || name.includes('cleaning') ||
                 name.includes('damage') || name.includes('carpet') || name.includes('r & m') ||
                 name.includes('hvac') || name.includes('plumbing') || name.includes('paint') ||
                 name.includes('appliances') || name.includes('fire & alarm') || name.includes('computers') ||
                 name.includes('server') || name.includes('phones') || name.includes('it')) {
          category = 'maintenance';
        }
        // Insurance accounts
        else if (name.includes('insurance') || name.includes('liability') || name.includes('coverage')) {
          category = 'insurance';
        }
        // Property tax accounts
        else if (name.includes('property tax') || name.includes('real property tax')) {
          category = 'property_tax';
        }
        
        return { ...row, category };
      });
      
      const result = {
        totalRows: processedData.length,
        processedRows: processedData.length,
        aiAnalysis: {
          propertyName: propertyName || 'Unknown Property',
          totalRecords: processedData.length,
          totalAmount: totalAmount,
          uniqueAccounts: accountNames.size,
          categories: {
            income: categorizedData.filter(r => r.category === 'income').length,
            utilities: categorizedData.filter(r => r.category === 'utilities').length,
            maintenance: categorizedData.filter(r => r.category === 'maintenance').length,
            insurance: categorizedData.filter(r => r.category === 'insurance').length,
            property_tax: categorizedData.filter(r => r.category === 'property_tax').length,
            other: categorizedData.filter(r => r.category === 'other').length
          },
          confidence: 0.85
        },
        data: processedData,
        format: isMonthColumnFormat ? 'month-column' : 'traditional',
        status: 'processed'
      };
      
      setLocalProcessingResult(result);
      setUploadError(null);
      
      // Trigger dashboard update with local data
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { 
          propertyId: selectedProperty, 
          uploadResult: result,
          processingMode: 'local'
        } 
      }));
      
      console.log('✅ Pure local processing completed:', result);
      
    } catch (error) {
      console.error('Pure local processing error:', error);
      throw error;
    }
  };

  const handleSaveData = async () => {
    if (!localProcessingResult) {
      setUploadError('No data to save');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      console.log('💾 Saving processed data to unified system...');

      // Get selected property info
      const selectedPropertyData = unifiedProperties.find(p => p.id === selectedProperty) || 
                                 properties.find(p => p.id === selectedProperty);
      
      if (!selectedPropertyData) {
        setUploadError('Property not found');
        setIsSaving(false);
        return;
      }

      // Ensure property exists in unified system
      const unifiedProperty = await unifiedPropertyService.addProperty({
        name: selectedPropertyData.name,
        address: selectedPropertyData.address || '',
        type: selectedPropertyData.type || 'Unknown',
        totalUnits: selectedPropertyData.totalUnits || 0
      });

      // Save property data to unified system
      if (localProcessingResult.data && Array.isArray(localProcessingResult.data)) {
        for (const row of localProcessingResult.data) {
          await unifiedPropertyService.addPropertyData({
            propertyId: unifiedProperty.id,
            propertyName: unifiedProperty.name,
            date: row.date || new Date().toISOString(),
            accountName: row.account_name || row.accountName || 'Unknown',
            amount: row.amount || 0,
            month: row.month || 'Unknown',
            category: row.category || 'other',
            source: processingMode
          });
        }
      }

      // Also save to backend for persistence
      const result = await ApiService.saveLocalData(
        localProcessingResult,
        selectedPropertyData.name,
        processingMode
      );

      if (result.success) {
        setSaveStatus('saved');
        setUploadError(null);
        console.log('✅ Data saved successfully to unified system:', result);

        // Refresh unified properties
        const updatedProperties = unifiedPropertyService.getAllProperties();
        setUnifiedProperties(updatedProperties);

        // Trigger dashboard refresh with multiple events
        window.dispatchEvent(new CustomEvent('dataUpdated', {
          detail: {
            propertyId: selectedProperty,
            uploadResult: result,
            processingMode: processingMode,
            saved: true,
            unified: true,
            source: 'local'
          }
        }));
        
        // Also trigger a specific refresh for charts
        window.dispatchEvent(new CustomEvent('chartDataUpdated', {
          detail: {
            propertyId: selectedProperty,
            data: localProcessingResult,
            source: 'local'
          }
        }));
        
        // Force a page refresh to ensure all components update
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setSaveStatus('error');
        setUploadError(result.message || 'Failed to save data');
      }
    } catch (error) {
      console.error('Save data error:', error);
      setSaveStatus('error');
      setUploadError(error instanceof Error ? error.message : 'Error saving data');
    } finally {
      setIsSaving(false);
    }
  };

  const parseAmount = (value: string): number | null => {
    if (!value || value === '—' || value.toLowerCase() === 'n/a') return null;
    
    let cleaned = value.replace(/\$/g, '').replace(/,/g, '');
    let neg = false;
    
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      neg = true;
      cleaned = cleaned.slice(1, -1);
    }
    
    const num = Number(cleaned);
    if (Number.isNaN(num)) return null;
    
    return neg ? -num : num;
  };

  const handleLocalProcessingLegacy = async (file: File) => {
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
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' :
              backendStatus === 'disconnected' ? 'bg-red-500' :
              'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-500">
              {backendStatus === 'connected' ? 
                `Backend Connected (${processingMode === 'supabase' ? 'Supabase' : 'Local'} Mode)` :
               backendStatus === 'disconnected' ? 'No Backend Available' :
               'Checking Connection...'}
            </span>
            </div>
            
            {backendStatus === 'connected' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Mode:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setProcessingMode('supabase')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      processingMode === 'supabase' 
                        ? 'bg-blue-500 text-white' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Supabase
                  </button>
                  <button
                    onClick={() => setProcessingMode('local')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      processingMode === 'local' 
                        ? 'bg-green-500 text-white' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Local
                  </button>
                </div>
              </div>
            )}
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
              {unifiedProperties.length > 0 ? (
                unifiedProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address} ({property.source})
                  </option>
                ))
              ) : (
                properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))
              )}
            </select>
            {unifiedProperties.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Showing {unifiedProperties.length} unified properties
              </p>
            )}
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

          {/* Local Processing Results */}
          {localProcessingResult && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="font-medium text-green-900 mb-2">Local Processing Results</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p><strong>Status:</strong> {localProcessingResult.status}</p>
                <p><strong>Format:</strong> {localProcessingResult.format}</p>
                <p><strong>Total Records:</strong> {localProcessingResult.totalRows}</p>
                <p><strong>Processed Records:</strong> {localProcessingResult.processedRows}</p>
                
                {localProcessingResult.aiAnalysis && (
                  <div className="mt-3">
                    <p><strong>AI Analysis:</strong></p>
                    <div className="ml-4 space-y-1">
                      <p>• Property: {localProcessingResult.aiAnalysis.propertyName}</p>
                      <p>• Confidence: {(localProcessingResult.aiAnalysis.confidence * 100).toFixed(1)}%</p>
                      {localProcessingResult.aiAnalysis.dateRange && (
                        <p>• Date Range: {localProcessingResult.aiAnalysis.dateRange.start} to {localProcessingResult.aiAnalysis.dateRange.end}</p>
                      )}
                      {localProcessingResult.aiAnalysis.revenueAnalysis && (
                        <p>• Total Revenue: ${localProcessingResult.aiAnalysis.revenueAnalysis.total.toLocaleString()}</p>
                      )}
                      {localProcessingResult.aiAnalysis.expenseAnalysis && (
                        <p>• Total Expenses: ${localProcessingResult.aiAnalysis.expenseAnalysis.total.toLocaleString()}</p>
                      )}
                      {localProcessingResult.aiAnalysis.anomalies && localProcessingResult.aiAnalysis.anomalies.length > 0 && (
                        <div>
                          <p>• Anomalies Found: {localProcessingResult.aiAnalysis.anomalies.length}</p>
                          <ul className="ml-4">
                            {localProcessingResult.aiAnalysis.anomalies.slice(0, 2).map((anomaly: any, index: number) => (
                              <li key={index} className="text-orange-600">⚠️ {anomaly.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Save Button */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {saveStatus === 'saved' && (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="text-sm">Data saved successfully!</span>
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      <span className="text-sm">Save failed</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleSaveData}
                  disabled={isSaving || saveStatus === 'saved'}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isSaving || saveStatus === 'saved'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      Saving...
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 inline" />
                      Saved
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2 inline" />
                      Save Data
                    </>
                  )}
                </button>
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
