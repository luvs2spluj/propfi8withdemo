import React, { useState, useEffect } from 'react';
import { indexedDBService, NotebookTemplate, UploadedFile, CategorizedCSV } from '../services/indexedDBService';
import { csvCategorizationService, CategorizationResult } from '../services/csvCategorizationService';
import TemplateUpload from './TemplateUpload';
import CSVBudgetImporter from './CSVBudgetImporter';

interface NotebookManagerProps {
  onCSVCategorized?: (csv: CategorizedCSV) => void;
}

export default function NotebookManager({ onCSVCategorized }: NotebookManagerProps) {
  const [templates, setTemplates] = useState<NotebookTemplate[]>([]);
  const [categorizedCSVs, setCategorizedCSVs] = useState<CategorizedCSV[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'upload' | 'csvs' | 'budget' | 'stats'>('templates');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await indexedDBService.init();
      
      const [templatesData, csvsData, filesData] = await Promise.all([
        indexedDBService.getAllTemplates(),
        indexedDBService.getCategorizedCSVs(),
        indexedDBService.getAllFiles()
      ]);
      
      setTemplates(templatesData);
      setCategorizedCSVs(csvsData);
      setUploadedFiles(filesData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle template upload
  const handleTemplateUploaded = async (template: NotebookTemplate) => {
    setTemplates(prev => [...prev, template]);
    setActiveTab('templates');
  };

  // Handle CSV file upload and categorization
  const handleCSVUpload = async (file: File) => {
    try {
      setIsLoading(true);
      
      // Read CSV content
      const content = await readFileContent(file);
      const csvData = parseCSVContent(content);
      
      // Save file to IndexedDB
      const uploadedFile: UploadedFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: 'csv',
        content,
        size: file.size,
        uploadedAt: new Date(),
        metadata: {}
      };
      
      await indexedDBService.saveFile(uploadedFile);
      setUploadedFiles(prev => [...prev, uploadedFile]);
      
      // Categorize the CSV
      const categorization = await csvCategorizationService.categorizeCSV(csvData, file.name);
      
      if (categorization) {
        // Save categorized CSV
        await csvCategorizationService.saveCategorizedCSV(csvData, file.name, categorization);
        
        // Update uploaded file metadata
        uploadedFile.metadata = {
          category: categorization.detectedType,
          detectedType: categorization.detectedType,
          confidence: categorization.confidence,
          templateId: categorization.templateId
        };
        
        await indexedDBService.saveFile(uploadedFile);
        
        // Reload categorized CSVs
        const updatedCSVs = await indexedDBService.getCategorizedCSVs();
        setCategorizedCSVs(updatedCSVs);
        
        // Notify parent component
        if (onCSVCategorized) {
          const categorizedCSV = updatedCSVs.find(csv => csv.filename === file.name);
          if (categorizedCSV) {
            onCSVCategorized(categorizedCSV);
          }
        }
        
        setActiveTab('csvs');
      } else {
        setError(`Could not categorize ${file.name}. No matching template found.`);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CSV');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseCSVContent = (content: string): Record<string, any>[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  };

  // Get statistics
  const getStats = () => {
    const stats = {
      templates: templates.length,
      categorizedCSVs: categorizedCSVs.length,
      uploadedFiles: uploadedFiles.length,
      byType: {} as Record<string, number>
    };
    
    categorizedCSVs.forEach(csv => {
      stats.byType[csv.detectedType] = (stats.byType[csv.detectedType] || 0) + 1;
    });
    
    return stats;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📚 Notebook Manager
          </h1>
          <p className="text-gray-600">
            Upload templates and categorize your CSV files automatically
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-sm text-red-600 hover:text-red-800 mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'templates', label: 'Templates', count: stats.templates },
              { id: 'upload', label: 'Upload CSV', count: null },
              { id: 'csvs', label: 'Categorized CSVs', count: stats.categorizedCSVs },
              { id: 'budget', label: 'Budget Importer', count: null },
              { id: 'stats', label: 'Statistics', count: null }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Templates</h2>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Upload Template
                </button>
              </div>
              
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No templates uploaded yet.</p>
                  <p className="text-sm">Upload a template to start categorizing CSVs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => (
                    <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-800">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="mt-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {template.category}
                        </span>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        <p>Required: {template.requiredFields.length} fields</p>
                        <p>Optional: {template.optionalFields.length} fields</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Template Upload */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Template</h2>
                  <TemplateUpload
                    onTemplateUploaded={handleTemplateUploaded}
                    onError={setError}
                  />
                </div>

                {/* CSV Upload */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload CSV</h2>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="w-12 h-12 mx-auto text-gray-400 mb-4">
                      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-4">Upload a CSV file to categorize it</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleCSVUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer"
                    >
                      Choose CSV File
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'csvs' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Categorized CSVs</h2>
              
              {categorizedCSVs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No CSV files categorized yet.</p>
                  <p className="text-sm">Upload a CSV file to see it categorized here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categorizedCSVs.map(csv => (
                    <div key={csv.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-800">{csv.filename}</h3>
                          <p className="text-sm text-gray-600">
                            Detected as: <span className="font-medium">{csv.detectedType}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Confidence: {(csv.confidence * 100).toFixed(1)}% | 
                            Records: {csv.data.length} | 
                            Categorized: {csv.categorizedAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            csv.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                            csv.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {csv.confidence > 0.8 ? 'High' : csv.confidence > 0.6 ? 'Medium' : 'Low'} Confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Budget Importer</h2>
                <div className="text-sm text-gray-500">
                  Automatically categorize income, expenses, and other items
                </div>
              </div>
              
              <CSVBudgetImporter 
                onDataLoaded={(data) => {
                  console.log('Budget data loaded:', data);
                  // You can integrate this data with your existing systems
                }}
                className="max-w-6xl"
              />
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">💡 How the Budget Importer Works</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Uploads CSV files with Account Name and monthly columns (Aug 2024 - Jul 2025)</li>
                  <li>• Automatically categorizes rows into Income, Expense, and Other buckets</li>
                  <li>• Calculates totals and Net Operating Income (NOI)</li>
                  <li>• Stores data locally in IndexedDB for offline access</li>
                  <li>• Uses predefined rules from budgets.config.json for categorization</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Statistics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-blue-800">Templates</h3>
                  <p className="text-3xl font-bold text-blue-600">{stats.templates}</p>
                  <p className="text-sm text-blue-600">Available templates</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-green-800">Categorized CSVs</h3>
                  <p className="text-3xl font-bold text-green-600">{stats.categorizedCSVs}</p>
                  <p className="text-sm text-green-600">Successfully categorized</p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-purple-800">Total Files</h3>
                  <p className="text-3xl font-bold text-purple-600">{stats.uploadedFiles}</p>
                  <p className="text-sm text-purple-600">Files uploaded</p>
                </div>
              </div>

              {Object.keys(stats.byType).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">CSVs by Type</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="text-center">
                        <p className="text-2xl font-bold text-gray-700">{count}</p>
                        <p className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
