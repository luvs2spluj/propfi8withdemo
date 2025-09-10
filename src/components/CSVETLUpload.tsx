import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Database, BarChart3 } from 'lucide-react';
import CSVETLService from '../services/csvETLService';

interface ETLStatus {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  error: string | null;
  success: string | null;
  qualityChecks: any;
  reportData: any[];
}

const CSVETLUpload: React.FC = () => {
  const [etlStatus, setETLStatus] = useState<ETLStatus>({
    isProcessing: false,
    currentStep: '',
    progress: 0,
    error: null,
    success: null,
    qualityChecks: null,
    reportData: []
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setETLStatus(prev => ({
      ...prev,
      isProcessing: true,
      currentStep: 'Reading CSV file...',
      progress: 10,
      error: null,
      success: null
    }));

    try {
      // Read file
      const text = await file.text();
      setETLStatus(prev => ({
        ...prev,
        currentStep: 'Parsing CSV data...',
        progress: 20
      }));

      // Parse CSV
      const csvData = CSVETLService.parseCSVFile(text, file.name);
      
      if (csvData.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      setETLStatus(prev => ({
        ...prev,
        currentStep: `Processing ${csvData.length} rows...`,
        progress: 30
      }));

      // Process through ETL pipeline
      const result = await CSVETLService.processCSV(csvData, file.name);
      
      setETLStatus(prev => ({
        ...prev,
        currentStep: 'Running quality checks...',
        progress: 80
      }));

      // Run quality checks
      const qaResult = await CSVETLService.runQualityChecks();
      
      setETLStatus(prev => ({
        ...prev,
        currentStep: 'Generating reports...',
        progress: 90
      }));

      // Get report data
      const reportResult = await CSVETLService.getIncomeStatementReport();

      setETLStatus(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: 'Complete!',
        progress: 100,
        success: result.message,
        qualityChecks: qaResult.qa,
        reportData: reportResult.rows || []
      }));

    } catch (error: any) {
      setETLStatus(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: 'Error occurred',
        progress: 0,
        error: error.message
      }));
    }
  };

  const runQualityChecks = async () => {
    try {
      setETLStatus(prev => ({ ...prev, error: null }));
      const result = await CSVETLService.runQualityChecks();
      setETLStatus(prev => ({
        ...prev,
        qualityChecks: result.qa,
        success: 'Quality checks completed'
      }));
    } catch (error: any) {
      setETLStatus(prev => ({ ...prev, error: error.message }));
    }
  };

  const generateReport = async () => {
    try {
      setETLStatus(prev => ({ ...prev, error: null }));
      const result = await CSVETLService.getIncomeStatementReport();
      setETLStatus(prev => ({
        ...prev,
        reportData: result.rows || [],
        success: 'Report generated successfully'
      }));
    } catch (error: any) {
      setETLStatus(prev => ({ ...prev, error: error.message }));
    }
  };

  const resetETL = () => {
    setETLStatus({
      isProcessing: false,
      currentStep: '',
      progress: 0,
      error: null,
      success: null,
      qualityChecks: null,
      reportData: []
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CSV ETL Pipeline</h1>
          <p className="text-gray-600 mt-1">Advanced CSV processing with data quality checks</p>
        </div>
        <button
          onClick={resetETL}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* File Upload */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV File</h3>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Choose a CSV file to process through the ETL pipeline</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={etlStatus.isProcessing}
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className={`btn-primary flex items-center space-x-2 mx-auto cursor-pointer ${
                etlStatus.isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Choose CSV File</span>
            </label>
          </div>
        </div>
      </div>

      {/* Processing Status */}
      {etlStatus.isProcessing && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Status</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <span className="text-gray-700">{etlStatus.currentStep}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${etlStatus.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{etlStatus.progress}% complete</p>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {etlStatus.success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{etlStatus.success}</span>
        </div>
      )}

      {etlStatus.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{etlStatus.error}</span>
        </div>
      )}

      {/* Quality Checks */}
      {etlStatus.qualityChecks && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Data Quality Checks</h3>
            <button
              onClick={runQualityChecks}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800">Unmapped Accounts</h4>
              <p className="text-2xl font-bold text-yellow-900">
                {etlStatus.qualityChecks.unmapped_accounts}
              </p>
              <p className="text-sm text-yellow-700">Need account mapping</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800">Bad Dates/Amounts</h4>
              <p className="text-2xl font-bold text-red-900">
                {etlStatus.qualityChecks.bad_dates_or_amounts}
              </p>
              <p className="text-sm text-red-700">Data quality issues</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800">Orphan Properties</h4>
              <p className="text-2xl font-bold text-blue-900">
                {etlStatus.qualityChecks.orphan_properties}
              </p>
              <p className="text-sm text-blue-700">Unknown properties</p>
            </div>
          </div>
        </div>
      )}

      {/* Report Data */}
      {etlStatus.reportData.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Income Statement Report</h3>
            <button
              onClick={generateReport}
              className="btn-secondary flex items-center space-x-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Refresh Report</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Income
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expenses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Income
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {etlStatus.reportData.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.property_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(row.month).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${row.total_income?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${row.total_expenses?.toLocaleString() || '0'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      row.net_income >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${row.net_income?.toLocaleString() || '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ETL Pipeline Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ETL Pipeline Information</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>Raw data is stored in the 'raw' schema</span>
          </div>
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Staging data is cleaned and validated</span>
          </div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Fact tables are loaded for reporting</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Quality checks ensure data integrity</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVETLUpload;
