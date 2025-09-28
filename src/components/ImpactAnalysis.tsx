/**
 * Impact Analysis Component
 * 
 * Displays percentile-based breakdown of income and expense line items
 * by absolute dollar value to identify the most impactful items.
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronRight,
  Download,
  BarChart3,
  DollarSign,
  Percent,
  Calendar,
  FileText
} from 'lucide-react';
import { 
  ImpactAnalysis, 
  LineItem, 
  ImpactSummary,
  MonthlyTrend
} from '../types/impactAnalysis';
import { impactAnalysisService } from '../services/impactAnalysisService';
import ImpactTrendChart from './charts/ImpactTrendChart';

interface ImpactAnalysisProps {
  propertyId: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ImpactBucketProps {
  title: string;
  items: LineItem[];
  totalAmount: number;
  itemCount: number;
  color: string;
  icon: React.ReactNode;
}

const ImpactAnalysisComponent: React.FC<ImpactAnalysisProps> = ({ 
  propertyId, 
  dateRange 
}) => {
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income');
  const [expandedPercentiles, setExpandedPercentiles] = useState<Set<string>>(new Set(['top20']));
  const [selectedItem, setSelectedItem] = useState<LineItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadImpactAnalysis();
  }, [propertyId, dateRange]);

  const loadImpactAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters = dateRange ? {
        dateRange,
        minAmount: 0
      } : undefined;
      
      const analysis = await impactAnalysisService.generateImpactAnalysis(
        propertyId,
        filters
      );
      
      setImpactAnalysis(analysis);
    } catch (err) {
      console.error('Error loading impact analysis:', err);
      setError('Failed to load impact analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePercentileExpansion = (percentile: string) => {
    const newExpanded = new Set(expandedPercentiles);
    if (newExpanded.has(percentile)) {
      newExpanded.delete(percentile);
    } else {
      newExpanded.add(percentile);
    }
    setExpandedPercentiles(newExpanded);
  };

  const handleItemClick = (item: LineItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const exportToCSV = () => {
    if (!impactAnalysis) return;
    
    const csvContent = impactAnalysisService.exportToCSV(impactAnalysis);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `impact-analysis-${propertyId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading impact analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">Error loading impact analysis</div>
          <div className="text-sm text-gray-500">{error}</div>
          <button 
            onClick={loadImpactAnalysis}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!impactAnalysis) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-gray-600">No impact analysis data available</div>
        </div>
      </div>
    );
  }

  const currentBucket = activeTab === 'income' ? impactAnalysis.income : impactAnalysis.expenses;
  const summaries = impactAnalysisService.generateImpactSummaries(currentBucket);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Line Item Impact Analysis
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Identify the most impactful income and expense items by dollar value
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('income')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'income'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Income Impact
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'expenses'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Expense Impact
          </button>
        </div>
      </div>

      {/* Impact Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries.map((summary) => (
          <ImpactSummaryCard
            key={summary.percentile}
            summary={summary}
            color={activeTab === 'income' ? 'green' : 'red'}
            onClick={() => togglePercentileExpansion(summary.percentile)}
            isExpanded={expandedPercentiles.has(summary.percentile)}
          />
        ))}
      </div>

      {/* Monthly Trend Chart */}
      <ImpactTrendChart
        items={currentBucket.top20}
        title={`Top 20% ${activeTab === 'income' ? 'Income' : 'Expense'} Items Trend`}
        color={activeTab === 'income' ? 'green' : 'red'}
        maxItems={5}
      />

      {/* Detailed Breakdown */}
      <div className="card">
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          {activeTab === 'income' ? 'Income' : 'Expense'} Line Items by Impact
        </h4>
        
        <div className="space-y-4">
          {summaries.map((summary) => (
            <ImpactBucket
              key={summary.percentile}
              title={`Top ${summary.percentile.replace('top', '').replace('bottom', 'Bottom ')}%`}
              items={currentBucket[summary.percentile as keyof typeof currentBucket] as LineItem[]}
              totalAmount={summary.totalAmount}
              itemCount={summary.itemCount}
              color={activeTab === 'income' ? 'green' : 'red'}
              icon={activeTab === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            />
          ))}
        </div>
      </div>

      {/* Item Detail Modal */}
      {showModal && selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

const ImpactSummaryCard: React.FC<{
  summary: ImpactSummary;
  color: 'green' | 'red';
  onClick: () => void;
  isExpanded: boolean;
}> = ({ summary, color, onClick, isExpanded }) => {
  const colorClasses = color === 'green' 
    ? 'bg-green-50 border-green-200 text-green-800' 
    : 'bg-red-50 border-red-200 text-red-800';

  return (
    <div 
      className={`card cursor-pointer transition-all hover:shadow-md ${colorClasses}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">
            {summary.percentile.replace('top', 'Top ').replace('bottom', 'Bottom ')}%
          </div>
          <div className="text-2xl font-bold">
            ${summary.totalAmount.toLocaleString()}
          </div>
          <div className="text-xs opacity-75">
            {summary.percentageOfTotal.toFixed(1)}% of total
          </div>
        </div>
        <div className="flex items-center">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
      </div>
      <div className="mt-2 text-xs opacity-75">
        {summary.itemCount} items • Avg: ${summary.averagePerItem.toLocaleString()}
      </div>
    </div>
  );
};

const ImpactBucket: React.FC<ImpactBucketProps> = ({
  title,
  items,
  totalAmount,
  itemCount,
  color,
  icon
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const colorClasses = color === 'green' 
    ? 'text-green-600 bg-green-50' 
    : 'text-red-600 bg-red-50';

  return (
    <div className="border border-gray-200 rounded-lg">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          {icon}
          <div>
            <div className="font-medium text-gray-900">{title}</div>
            <div className="text-sm text-gray-500">
              {itemCount} items • ${totalAmount.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses}`}>
            {((totalAmount / (totalAmount + 1000)) * 100).toFixed(1)}% of total
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded border hover:shadow-sm cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.accountName}</div>
                  <div className="text-sm text-gray-500">{item.csvSource}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    ${item.totalAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.percentageOfTotal.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ItemDetailModal: React.FC<{
  item: LineItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const monthlyTrends = impactAnalysisService.getMonthlyTrends(item);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{item.accountName}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Total Amount</div>
                <div className="text-xl font-semibold">${item.totalAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Percentage of Total</div>
                <div className="text-xl font-semibold">{item.percentageOfTotal.toFixed(1)}%</div>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-2">CSV Source</div>
              <div className="text-sm font-medium">{item.csvSource}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-2">Monthly Breakdown</div>
              <div className="space-y-2">
                {monthlyTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="text-sm font-medium">{trend.month}</div>
                    <div className="text-sm">${trend.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactAnalysisComponent;
