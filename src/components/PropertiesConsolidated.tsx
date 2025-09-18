import React, { useState } from 'react';
import { Settings, List } from 'lucide-react';
import Properties from './Properties';
import PropertyManagementAI from './PropertyManagementAI';

type PropertyTab = 'list' | 'management';

const PropertiesConsolidated: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PropertyTab>('list');

  const tabs = [
    { id: 'list' as PropertyTab, label: 'Property List', icon: List, description: 'View and manage your properties' },
    { id: 'management' as PropertyTab, label: 'Property Management', icon: Settings, description: 'Advanced property management features' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'list':
        return <Properties />;
      case 'management':
        return <PropertyManagementAI />;
      default:
        return <Properties />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 mt-1">Manage your property portfolio and settings</p>
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

export default PropertiesConsolidated;
