import React from 'react';
import NotebookManager from '../components/NotebookManager';

export default function NotebookDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📚 Notebook System Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Upload templates and automatically categorize your CSV files using AI-powered detection. 
            All data is stored locally in your browser using IndexedDB.
          </p>
        </div>
        
        <NotebookManager 
          onCSVCategorized={(csv) => {
            console.log('CSV categorized:', csv);
          }}
        />
        
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            🚀 How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-medium text-blue-800 mb-2">Upload Templates</h3>
              <p className="text-sm text-blue-600">
                Upload JSON or CSV template files to define how different types of spreadsheets should be structured.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-medium text-blue-800 mb-2">Upload CSVs</h3>
              <p className="text-sm text-blue-600">
                Upload your CSV files and the system will automatically analyze them against your templates.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-medium text-blue-800 mb-2">Auto-Categorize</h3>
              <p className="text-sm text-blue-600">
                Get instant categorization with confidence scores and suggestions for improvement.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-green-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-800 mb-4">
            📁 Sample Templates Available
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h3 className="font-medium text-green-800">Balance Sheet</h3>
              <p className="text-sm text-green-600 mt-1">
                Template for balance sheet data with assets, liabilities, and equity.
              </p>
              <p className="text-xs text-green-500 mt-2">
                File: sample-balance-sheet-template.json
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h3 className="font-medium text-green-800">Cash Flow</h3>
              <p className="text-sm text-green-600 mt-1">
                Template for monthly cash flow statements with revenue and expenses.
              </p>
              <p className="text-xs text-green-500 mt-2">
                File: sample-cash-flow-template.json
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h3 className="font-medium text-green-800">Rent Roll</h3>
              <p className="text-sm text-green-600 mt-1">
                Template for property rent rolls with unit and tenant information.
              </p>
              <p className="text-xs text-green-500 mt-2">
                File: sample-rent-roll-template.json
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
