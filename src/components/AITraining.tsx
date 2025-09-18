import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Edit,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { aiParserService, HeaderMatchAI, ParsedDataAI } from '../config/supabaseAI';

interface TrainingData {
  headerMatches: HeaderMatchAI[];
  parsedData: ParsedDataAI[];
  csvFileId: string;
}

const AITraining: React.FC = () => {
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingHeader, setEditingHeader] = useState<HeaderMatchAI | null>(null);
  const [editingData, setEditingData] = useState<ParsedDataAI | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const predefinedBuckets = [
    'income',
    'expense',
    'maintenance',
    'utilities',
    'insurance',
    'property_tax',
    'management_fees',
    'legal_fees',
    'marketing',
    'other'
  ];

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    setIsLoading(true);
    try {
      // Load CSV files with their header matches and parsed data
      const csvFilesResult = await aiParserService.getCSVFiles();
      if (csvFilesResult.success && csvFilesResult.data) {
        const trainingPromises = csvFilesResult.data.map(async (file) => {
          const [headerMatchesResult, parsedDataResult] = await Promise.all([
            aiParserService.getHeaderMatches(file.id),
            aiParserService.getParsedData(file.id)
          ]);

          return {
            csvFileId: file.id,
            headerMatches: headerMatchesResult.success ? headerMatchesResult.data || [] : [],
            parsedData: parsedDataResult.success ? parsedDataResult.data || [] : []
          };
        });

        const trainingData = await Promise.all(trainingPromises);
        setTrainingData(trainingData);
      }
    } catch (error) {
      console.error('Failed to load training data:', error);
      setError('Failed to load training data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeaderConfirmation = async (headerMatch: HeaderMatchAI, confirmedBucket: string) => {
    try {
      const result = await aiParserService.updateHeaderMatch(headerMatch.id, {
        user_confirmed: true,
        user_override: confirmedBucket,
        suggested_bucket: confirmedBucket
      });

      if (result.success) {
        setSuccess('Header categorization updated successfully!');
        await loadTrainingData();
      } else {
        setError(result.error || 'Failed to update header');
      }
    } catch (error) {
      console.error('Failed to update header:', error);
      setError('Failed to update header');
    }
  };

  const handleDataCorrection = async (parsedData: ParsedDataAI, newAmount: number, newCategory: string) => {
    try {
      const result = await aiParserService.updateParsedData(parsedData.id, {
        amount: newAmount,
        category: newCategory
      });

      if (result.success) {
        setSuccess('Data correction saved successfully!');
        await loadTrainingData();
      } else {
        setError(result.error || 'Failed to update data');
      }
    } catch (error) {
      console.error('Failed to update data:', error);
      setError('Failed to update data');
    }
  };

  const generateTrainingInsights = () => {
    const insights = {
      totalHeaders: 0,
      confirmedHeaders: 0,
      totalRecords: 0,
      correctedRecords: 0,
      categoryDistribution: {} as Record<string, number>,
      confidenceDistribution: {
        high: 0,    // > 0.8
        medium: 0,  // 0.5 - 0.8
        low: 0      // < 0.5
      }
    };

    trainingData.forEach(data => {
      insights.totalHeaders += data.headerMatches.length;
      insights.confirmedHeaders += data.headerMatches.filter(h => h.user_confirmed).length;
      insights.totalRecords += data.parsedData.length;

      data.headerMatches.forEach(header => {
        const confidence = header.confidence_score;
        if (confidence > 0.8) insights.confidenceDistribution.high++;
        else if (confidence > 0.5) insights.confidenceDistribution.medium++;
        else insights.confidenceDistribution.low++;
      });

      data.parsedData.forEach(record => {
        insights.categoryDistribution[record.category] = 
          (insights.categoryDistribution[record.category] || 0) + 1;
      });
    });

    return insights;
  };

  const selectedFileData = trainingData.find(data => data.csvFileId === selectedFile);
  const insights = generateTrainingInsights();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Brain className="w-8 h-8 mr-3 text-purple-600" />
            AI Training & Data Correction
          </h1>
          <p className="text-gray-600 mt-1">Train the AI parser with your actual data and correct any errors</p>
        </div>
        <button
          onClick={loadTrainingData}
          disabled={isLoading}
          className="btn-primary flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* Training Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Headers</p>
              <p className="text-lg font-semibold">{insights.totalHeaders}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Confirmed Headers</p>
              <p className="text-lg font-semibold">{insights.confirmedHeaders}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-lg font-semibold">{insights.totalRecords}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">AI Confidence</p>
              <p className="text-lg font-semibold">
                {insights.confidenceDistribution.high > 0 ? 'High' : 
                 insights.confidenceDistribution.medium > 0 ? 'Medium' : 'Low'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File Selection */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select CSV File to Train</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainingData.map(data => (
            <button
              key={data.csvFileId}
              onClick={() => setSelectedFile(data.csvFileId)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                selectedFile === data.csvFileId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">File {data.csvFileId.slice(0, 8)}</span>
                <span className="text-sm text-gray-500">{data.parsedData.length} records</span>
              </div>
              <div className="text-sm text-gray-600">
                <p>Headers: {data.headerMatches.length}</p>
                <p>Confirmed: {data.headerMatches.filter(h => h.user_confirmed).length}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Header Training */}
      {selectedFileData && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Header Categorization Training</h3>
          <div className="space-y-4">
            {selectedFileData.headerMatches.map(header => (
              <div key={header.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{header.original_header}</h4>
                    <p className="text-sm text-gray-600">
                      AI Suggested: <span className="font-medium">{header.suggested_bucket}</span>
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                        {Math.round(header.confidence_score * 100)}% confidence
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {header.user_confirmed ? (
                      <span className="text-green-600 text-sm flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirmed
                      </span>
                    ) : (
                      <button
                        onClick={() => setEditingHeader(header)}
                        className="text-blue-600 text-sm flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Correct
                      </button>
                    )}
                  </div>
                </div>

                {editingHeader?.id === header.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Select correct category:</p>
                    <div className="flex flex-wrap gap-2">
                      {predefinedBuckets.map(bucket => (
                        <button
                          key={bucket}
                          onClick={() => {
                            handleHeaderConfirmation(header, bucket);
                            setEditingHeader(null);
                          }}
                          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          {bucket}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Correction */}
      {selectedFileData && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Correction</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedFileData.parsedData.slice(0, 20).map(record => (
              <div key={record.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{record.account_name}</p>
                    <p className="text-sm text-gray-600">
                      {record.period} | {record.category} | ${record.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingData(record)}
                    className="text-blue-600 text-sm flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                </div>

                {editingData?.id === record.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <input
                          type="number"
                          defaultValue={record.amount}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          onChange={(e) => {
                            const newAmount = parseFloat(e.target.value);
                            if (!isNaN(newAmount)) {
                              setEditingData({ ...editingData, amount: newAmount });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          defaultValue={record.category}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          onChange={(e) => {
                            setEditingData({ ...editingData, category: e.target.value });
                          }}
                        >
                          {predefinedBuckets.map(bucket => (
                            <option key={bucket} value={bucket}>{bucket}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-3">
                      <button
                        onClick={() => setEditingData(null)}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (editingData) {
                            handleDataCorrection(editingData, editingData.amount, editingData.category);
                            setEditingData(null);
                          }
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {selectedFileData.parsedData.length > 20 && (
            <p className="text-sm text-gray-500 mt-2">
              Showing first 20 records of {selectedFileData.parsedData.length} total
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AITraining;
