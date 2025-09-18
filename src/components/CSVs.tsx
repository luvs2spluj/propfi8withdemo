import React, { useState, useEffect } from 'react';
import { Upload, Brain, Database, GraduationCap, FileText, CheckCircle } from 'lucide-react';
import CSVUpload from './CSVUpload';
import CSVUploadAI from './CSVUploadAI';
import CSVImportFlow from './CSVImportFlow';
import CSVManagementAI from './CSVManagementAI';
import AITraining from './AITraining';

type CSVTab = 'upload' | 'ai-parser' | 'import-flow' | 'management' | 'training';

const CSVs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CSVTab>('import-flow');
  const [aiTrainingStatus, setAiTrainingStatus] = useState<'idle' | 'training' | 'completed'>('idle');

  // Auto-train AI model when component mounts
  useEffect(() => {
    const autoTrain = async () => {
      setAiTrainingStatus('training');
      try {
        // Simulate AI training - in real implementation, this would call the training API
        await new Promise(resolve => setTimeout(resolve, 2000));
        setAiTrainingStatus('completed');
      } catch (error) {
        console.error('AI training failed:', error);
        setAiTrainingStatus('idle');
      }
    };

    autoTrain();
  }, []);

  const tabs = [
    { id: 'import-flow' as CSVTab, label: 'Import Flow', icon: Upload, description: 'AI-powered CSV import with smart mapping' },
    { id: 'upload' as CSVTab, label: 'Basic Upload', icon: FileText, description: 'Traditional CSV upload' },
    { id: 'ai-parser' as CSVTab, label: 'AI Parser', icon: Brain, description: 'Advanced AI parsing features' },
    { id: 'management' as CSVTab, label: 'Management', icon: Database, description: 'Manage uploaded CSV files' },
    { id: 'training' as CSVTab, label: 'AI Training', icon: GraduationCap, description: 'Train AI model on your data', status: aiTrainingStatus },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return <CSVUpload />;
      case 'ai-parser':
        return <CSVUploadAI />;
      case 'import-flow':
        return <CSVImportFlow />;
      case 'management':
        return <CSVManagementAI />;
      case 'training':
        return <AITraining />;
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
            {aiTrainingStatus === 'training' && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">AI Training...</span>
              </div>
            )}
            {aiTrainingStatus === 'completed' && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">AI Ready</span>
              </div>
            )}
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
                {tab.status === 'training' && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                )}
                {tab.status === 'completed' && (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                )}
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
