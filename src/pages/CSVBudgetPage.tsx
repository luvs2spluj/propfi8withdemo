import React from 'react';
import CSVBudgetImporter from '../components/CSVBudgetImporter';

export default function CSVBudgetPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📊 CSV Budget Importer
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Upload your CSV files to automatically categorize income, expenses, and other items. 
            All data is processed locally and stored in your browser.
          </p>
        </div>
        
        <CSVBudgetImporter 
          onDataLoaded={(data) => {
            console.log('Budget data loaded:', data);
            // You can add additional processing here
          }}
        />
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">
              🎯 Features
            </h2>
            <ul className="space-y-2 text-blue-700">
              <li>• <strong>Automatic Categorization:</strong> Income, Expense, and Other buckets</li>
              <li>• <strong>Real-time Calculations:</strong> Totals and NOI computed instantly</li>
              <li>• <strong>Local Storage:</strong> Data stored in IndexedDB for offline access</li>
              <li>• <strong>Drag & Drop:</strong> Easy file upload interface</li>
              <li>• <strong>Data Persistence:</strong> Load previously uploaded data</li>
            </ul>
          </div>
          
          <div className="bg-green-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4">
              📋 CSV Format Requirements
            </h2>
            <div className="space-y-3 text-green-700">
              <div>
                <strong>Required Columns:</strong>
                <ul className="ml-4 mt-1 text-sm">
                  <li>• Account Name</li>
                  <li>• Aug 2024 through Jul 2025 (monthly columns)</li>
                  <li>• Total</li>
                </ul>
              </div>
              <div>
                <strong>Sample Account Names:</strong>
                <ul className="ml-4 mt-1 text-sm">
                  <li>• Resident / Tenant Rents & Asmts</li>
                  <li>• Management Fees</li>
                  <li>• Maintenance & Repair</li>
                  <li>• NOI - Net Operating Income</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-purple-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-purple-800 mb-4">
            🔧 Technical Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-purple-700">
            <div>
              <h3 className="font-medium mb-2">Data Processing</h3>
              <p className="text-sm">
                Uses PapaParse for CSV parsing and custom bucketing algorithms for categorization.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Storage</h3>
              <p className="text-sm">
                IndexedDB with localStorage fallback for maximum browser compatibility.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Categorization</h3>
              <p className="text-sm">
                Predefined rules in budgets.config.json determine how accounts are categorized.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
