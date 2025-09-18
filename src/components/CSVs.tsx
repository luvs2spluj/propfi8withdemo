import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import CSVUpload from './CSVUpload';
import CSVImportFlow from './CSVImportFlow';

type CSVTab = 'upload' | 'import-flow';

const CSVs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CSVTab>('import-flow');

      const tabs = [
        { id: 'import-flow' as CSVTab, label: 'Import Flow', icon: Upload, description: 'AI-powered CSV import with smart mapping' },
        { id: 'upload' as CSVTab, label: 'Basic Upload', icon: FileText, description: 'Traditional CSV upload' },
      ];

      const renderTabContent = () => {
        switch (activeTab) {
          case 'upload':
            return <CSVUpload />;
          case 'import-flow':
            return <CSVImportFlow />;
          default:
            return <CSVImportFlow />;
        }
      };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CSV Management</h1>
              <p className="text-gray-600 mt-1">Upload, parse, and manage your property data files</p>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="px-6 py-4 border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default CSVs;
