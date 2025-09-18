import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Brain,
  Loader2,
  Eye
} from 'lucide-react';
import { csvHeaderDetector, ParsedCSVResult } from '../utils/csvParserAI';
import { aiParserService } from '../config/supabaseAI';

interface UploadedFileAI {
  id: string;
  file_name: string;
  file_size: number;
  property_id: string;
  property_name: string;
  upload_status: 'uploading' | 'processing' | 'completed' | 'failed';
  processing_mode: 'ai_parser' | 'traditional';
  ai_confidence: number;
  format_detected: 'month-column' | 'traditional';
  created_at: string;
  error_message?: string;
}

interface PropertyAI {
  id: string;
  name: string;
  address: string;
  type: string;
  total_units: number;
  ai_parser_enabled: boolean;
}

const CSVUploadAI: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileAI[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [properties, setProperties] = useState<PropertyAI[]>([]);
  const [parsingResult, setParsingResult] = useState<ParsedCSVResult | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [showParsingDetails, setShowParsingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load properties and upload history on component mount
  useEffect(() => {
    checkBackendStatus();
    loadProperties();
    loadUploadHistory();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const result = await aiParserService.healthCheck();
      setBackendStatus(result.success ? 'connected' : 'disconnected');
    } catch (error) {
      setBackendStatus('disconnected');
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

  const loadUploadHistory = async () => {
    try {
      const result = await aiParserService.getCSVFiles();
      if (result.success && result.data) {
        setUploadedFiles(result.data);
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
    setParsingResult(null);

    try {
      if (!selectedProperty) {
        setUploadError('Please select a property first');
        setIsUploading(false);
        return;
      }

      // Get property name for processing
      const selectedPropertyData = properties.find(p => p.id === selectedProperty);
      const propertyName = selectedPropertyData?.name;

      if (!propertyName) {
        setUploadError('Property not found');
        setIsUploading(false);
        return;
      }

      console.log('🤖 Starting AI-powered CSV processing...');

      // Step 1: Upload file to Supabase
      const uploadResult = await aiParserService.uploadCSVFile(file, selectedProperty, propertyName);
      
      if (!uploadResult.success || !uploadResult.data) {
        setUploadError(uploadResult.error || 'Failed to upload file');
        setIsUploading(false);
        return;
      }

      const csvFile = uploadResult.data;
      console.log('📁 File uploaded:', csvFile);

      // Step 2: Parse CSV content
      const csvContent = await parseCSVFile(file);
      console.log('📊 CSV parsed:', csvContent.length, 'rows');

      // Step 3: AI-powered header detection and parsing
      const aiResult = csvHeaderDetector.parseCSVHeaders(csvContent, propertyName);
      console.log('🧠 AI analysis completed:', aiResult);

      setParsingResult(aiResult);

      // Step 4: Save parsed data to Supabase
      await saveParsedDataToSupabase(csvFile.id, aiResult);

      // Step 5: Update file status
      await aiParserService.updateProcessingJob(csvFile.id, {
        status: 'completed',
        progress: 100,
        ai_analysis: aiResult.aiAnalysis
      });

      // Reload upload history
      await loadUploadHistory();

      setUploadError(null);
      console.log('✅ AI processing completed successfully');

    } catch (error: any) {
      console.error('AI processing error:', error);
      setUploadError(error instanceof Error ? error.message : 'Error processing CSV file with AI');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parseCSVFile = async (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          const csvData = lines.map(line => {
            // Simple CSV parsing - handle quoted fields
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          });
          resolve(csvData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const saveParsedDataToSupabase = async (csvFileId: string, aiResult: ParsedCSVResult) => {
    try {
      // Save parsed data
      const parsedDataResult = await aiParserService.saveParsedData(csvFileId, aiResult.parsedData);
      if (!parsedDataResult.success) {
        throw new Error(parsedDataResult.error || 'Failed to save parsed data');
      }

      // Save header matches
      const headerMatchesResult = await aiParserService.saveHeaderMatches(csvFileId, aiResult.headerMatches);
      if (!headerMatchesResult.success) {
        throw new Error(headerMatchesResult.error || 'Failed to save header matches');
      }

      console.log('💾 Data saved to Supabase successfully');
    } catch (error) {
      console.error('Failed to save to Supabase:', error);
      throw error;
    }
  };

  const handleSaveData = async () => {
    if (!parsingResult) {
      setUploadError('No data to save');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      console.log('💾 Saving AI-processed data...');

      // Trigger dashboard update with AI data
      window.dispatchEvent(new CustomEvent('dataUpdated', {
        detail: {
          propertyId: selectedProperty,
          uploadResult: parsingResult,
          processingMode: 'ai_parser',
          saved: true,
          source: 'ai_parser'
        }
      }));

      // Also trigger a specific refresh for charts
      window.dispatchEvent(new CustomEvent('chartDataUpdated', {
        detail: {
          propertyId: selectedProperty,
          data: parsingResult,
          source: 'ai_parser'
        }
      }));

      setSaveStatus('saved');
      setUploadError(null);
      console.log('✅ AI data saved successfully');

      // Force a page refresh to ensure all components update
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Save data error:', error);
      setSaveStatus('error');
      setUploadError(error instanceof Error ? error.message : 'Error saving data');
    } finally {
      setIsSaving(false);
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Brain className="w-8 h-8 mr-3 text-purple-600" />
            AI-Powered CSV Parser
          </h1>
          <p className="text-gray-600 mt-1">Upload CSV files with intelligent header detection and categorization</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected' ? 'bg-green-500' :
                backendStatus === 'disconnected' ? 'bg-red-500' :
                'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-500">
                {backendStatus === 'connected' ? 'AI Parser Backend Connected' :
                 backendStatus === 'disconnected' ? 'AI Parser Backend Disconnected' :
                 'Checking Connection...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          Upload Property Data with AI Processing
        </h3>
        
        <div className="space-y-4">
          {/* Property Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Property
              </label>
              <button
                onClick={() => {
                  const event = new CustomEvent('navigateToPage', { detail: { page: 'property-management-ai' } });
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
                  {property.name} - {property.address}
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
                  <Brain className="w-4 h-4" />
                )}
                <span>{isUploading ? 'AI Processing...' : 'Choose CSV File'}</span>
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

          {/* AI Parsing Results */}
          {parsingResult && (
            <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-purple-900 flex items-center">
                  <Brain className="w-4 h-4 mr-2" />
                  AI Analysis Results
                </h4>
                <button
                  onClick={() => setShowParsingDetails(!showParsingDetails)}
                  className="text-sm text-purple-600 hover:text-purple-800 flex items-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {showParsingDetails ? 'Hide' : 'Show'} Details
                </button>
              </div>
              
              <div className="text-sm text-purple-800 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Format Detected:</strong> {parsingResult.format}</p>
                    <p><strong>Total Headers:</strong> {parsingResult.headers.length}</p>
                    <p><strong>AI Confidence:</strong> 
                      <span className={`ml-1 ${getConfidenceColor(parsingResult.aiAnalysis.confidence)}`}>
                        {(parsingResult.aiAnalysis.confidence * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                  <div>
                    <p><strong>Total Records:</strong> {parsingResult.aiAnalysis.totalRecords}</p>
                    <p><strong>Unique Accounts:</strong> {parsingResult.aiAnalysis.uniqueAccounts}</p>
                    <p><strong>Total Amount:</strong> ${parsingResult.aiAnalysis.totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                {parsingResult.needsUserConfirmation && (
                  <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mt-2">
                    <p className="text-yellow-800">
                      ⚠️ {parsingResult.lowConfidenceHeaders.length} headers need user confirmation
                    </p>
                  </div>
                )}

                {showParsingDetails && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <h5 className="font-medium mb-2">Header Categorization:</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(parsingResult.bucketAssignments).map(([bucket, headers]) => (
                          <div key={bucket} className="bg-white p-2 rounded border">
                            <div className="font-medium text-gray-700">{bucket}</div>
                            <div className="text-gray-600">{headers.length} headers</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Category Breakdown:</h5>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {Object.entries(parsingResult.aiAnalysis.categories).map(([category, count]) => (
                          <div key={category} className="bg-white p-2 rounded border">
                            <div className="font-medium text-gray-700">{category}</div>
                            <div className="text-gray-600">{count} records</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {parsingResult.aiAnalysis.anomalies && parsingResult.aiAnalysis.anomalies.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">Anomalies Detected:</h5>
                        <div className="space-y-1">
                          {parsingResult.aiAnalysis.anomalies.map((anomaly, index) => (
                            <div key={index} className="text-orange-600 text-xs">
                              ⚠️ {anomaly.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                      : 'bg-purple-600 text-white hover:bg-purple-700'
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
                      <Brain className="w-4 h-4 mr-2 inline" />
                      Save AI Data
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* AI Parser Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              AI Parser Features:
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Intelligent Header Detection:</strong> Automatically categorizes CSV headers into predefined buckets</p>
              <p>• <strong>Format Recognition:</strong> Detects month-column vs traditional formats</p>
              <p>• <strong>Confidence Scoring:</strong> Provides confidence levels for each header match</p>
              <p>• <strong>Anomaly Detection:</strong> Identifies potential data issues</p>
              <p>• <strong>Category Analysis:</strong> Automatically categorizes income, expenses, utilities, etc.</p>
              <p className="text-green-700 font-medium">✅ Works with any CSV format - no specific headers required!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Processing History</h3>
          <div className="space-y-3">
            {uploadedFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{file.file_name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{file.property_name}</span>
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      <span className={`${getConfidenceColor(file.ai_confidence)}`}>
                        AI: {(file.ai_confidence * 100).toFixed(0)}%
                      </span>
                      <span className="capitalize">{file.format_detected}</span>
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

export default CSVUploadAI;
