import React, { useState, useRef } from 'react';
import { indexedDBService, NotebookTemplate } from '../services/indexedDBService';

interface TemplateUploadProps {
  onTemplateUploaded?: (template: NotebookTemplate) => void;
  onError?: (error: string) => void;
}

export default function TemplateUpload({ onTemplateUploaded, onError }: TemplateUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Read file content
      const content = await readFileContent(file);
      setUploadProgress(30);

      // Parse template from file content
      const template = await parseTemplateFromFile(file, content);
      setUploadProgress(60);

      // Save to IndexedDB
      await indexedDBService.saveTemplate(template);
      setUploadProgress(90);

      // Notify parent component
      if (onTemplateUploaded) {
        onTemplateUploaded(template);
      }

      setUploadProgress(100);
      console.log('✅ Template uploaded successfully:', template.name);

    } catch (error) {
      console.error('❌ Error uploading template:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Failed to upload template');
      }
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Parse template from file content
  const parseTemplateFromFile = async (file: File, content: string): Promise<NotebookTemplate> => {
    try {
      // Try to parse as JSON first (structured template)
      if (file.name.endsWith('.json')) {
        const templateData = JSON.parse(content);
        return {
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: templateData.name || file.name.replace('.json', ''),
          description: templateData.description || '',
          category: templateData.category || 'custom',
          headers: templateData.headers || [],
          requiredFields: templateData.requiredFields || [],
          optionalFields: templateData.optionalFields || [],
          sampleData: templateData.sampleData || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      // Parse CSV file as template
      if (file.name.endsWith('.csv')) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          throw new Error('CSV file is empty');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const sampleRows = lines.slice(1, 4).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: Record<string, any> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        // Detect category based on headers
        const category = detectCategoryFromHeaders(headers);

        return {
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace('.csv', ''),
          description: `Template created from ${file.name}`,
          category,
          headers,
          requiredFields: headers.slice(0, Math.min(3, headers.length)), // First 3 fields as required
          optionalFields: headers.slice(3),
          sampleData: sampleRows,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      throw new Error('Unsupported file format. Please upload a .json or .csv file.');

    } catch (error) {
      throw new Error(`Failed to parse template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Detect category from headers
  const detectCategoryFromHeaders = (headers: string[]): NotebookTemplate['category'] => {
    const headerText = headers.join(' ').toLowerCase();

    if (headerText.includes('asset') || headerText.includes('liability') || headerText.includes('equity')) {
      return 'balance_sheet';
    }
    if (headerText.includes('revenue') || headerText.includes('expense') || headerText.includes('income')) {
      return 'income_statement';
    }
    if (headerText.includes('cash') || headerText.includes('flow') || headerText.includes('month')) {
      return 'cash_flow';
    }
    if (headerText.includes('rent') || headerText.includes('unit') || headerText.includes('occupancy')) {
      return 'rent_roll';
    }

    return 'custom';
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          📚 Upload Notebook Template
        </h2>
        
        <p className="text-gray-600 mb-6">
          Upload a template file (.json or .csv) to help categorize your spreadsheets automatically.
        </p>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              </div>
              <p className="text-lg font-medium text-gray-700">Uploading template...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">{uploadProgress}% complete</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto text-gray-400">
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Drop your template file here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Choose File
              </button>
              <p className="text-xs text-gray-400">
                Supports .json and .csv files
              </p>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Template Format Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">📋 Template Format Examples</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-700">JSON Template:</p>
              <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
{`{
  "name": "Balance Sheet Template",
  "description": "Standard balance sheet format",
  "category": "balance_sheet",
  "headers": ["Account Name", "Balance"],
  "requiredFields": ["Account Name", "Balance"],
  "optionalFields": ["Notes"],
  "sampleData": [
    {"Account Name": "Total Assets", "Balance": "1000000"},
    {"Account Name": "Total Liabilities", "Balance": "300000"}
  ]
}`}
              </pre>
            </div>
            <div>
              <p className="font-medium text-gray-700">CSV Template:</p>
              <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
{`Account Name,Balance,Notes
Total Assets,1000000,Current assets
Total Liabilities,300000,Current liabilities
Total Equity,700000,Owner equity`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
