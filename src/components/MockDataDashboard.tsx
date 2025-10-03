import React, { useState, useEffect } from 'react';
import { chartDataService } from '../services/chartDataService';
import { localStorageService } from '../services/localStorageService';
import { csvUploadService } from '../services/csvUploadService';
import { aiTrainingService } from '../services/aiTrainingService';
import ImprovedCSVUpload from './ImprovedCSVUpload';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Home,
  RefreshCw,
  Download,
  Upload,
  Brain,
  Settings
} from 'lucide-react';

export default function MockDataDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [aiMetrics, setAiMetrics] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    loadSyncStatus();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await chartDataService.generateChartData();
      setDashboardData(data);
      
      // Train AI model with current data
      const metrics = aiTrainingService.validateModel();
      setAiMetrics(metrics);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = () => {
    const status = localStorageService.getSyncStatus();
    setSyncStatus(status);
  };

  const populateMockData = async () => {
    await localStorageService.populateWithMockData();
    await loadDashboardData();
  };

  const exportData = () => {
    const allFiles = csvUploadService.getAllFiles();
    const exportData = {
      files: allFiles,
      preferences: localStorageService.getUserPreferences(),
      syncStatus: localStorageService.getSyncStatus(),
      aiModel: aiTrainingService.exportModel(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propfi-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.financialMetrics;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Home className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">PropFI Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Sync Status */}
              <div className="flex items-center text-sm">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  syncStatus?.isOnline ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-gray-600">
                  {syncStatus?.isOnline ? 'Online' : 'Offline'} 
                  {syncStatus?.pendingChanges ? ` (${syncStatus.pendingChanges} pending)` : ''}
                </span>
              </div>

              <button
                onClick={() => setShowUploader(true)}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </button>

              <button
                onClick={exportData}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>

              <button
                onClick={populateMockData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Use Sample Data
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Assets</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${metrics?.totalAssets.toLocaleString() || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Occupancy Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics?.occupancyRate.toFixed(1) || '0'}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Rent</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${metrics?.avgRent.toLocaleString() || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">AI Accuracy</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {aiMetrics?.accuracy?.toFixed(1) || '0'}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Balance Sheet Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Balance Sheet</h3>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center">
              {dashboardData?.balanceSheetChart ? (
                <div className="w-full h-full">
                  {/* Mock chart - you would replace this with actual chart component */}
                  <div className="flex items-end space-x-4 h-full">
                    {dashboardData.balanceSheetChart.datasets[0].data.map((value: number, index: number) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full rounded-t"
                          style={{
                            height: `${Math.max((value / Math.max(...dashboardData.balanceSheetChart.datasets[0].data)) * 100, 10)}%`,
                            backgroundColor: dashboardData.balanceSheetChart.datasets[0].backgroundColor[index]
                          }}
                        />
                        <span className="mt-2 text-xs text-gray-600">
                          {dashboardData.balanceSheetChart.labels[index]}
                        </span>
                        <span className="text-xs font-medium">
                          ${value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No balance sheet data available</p>
              )}
            </div>
          </div>

          {/* Occupancy Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Unit Occupancy</h3>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center">
              {dashboardData?.occupancyChart ? (
                <div className="flex items-center space-x-4">
                  {dashboardData.occupancyChart.datasets[0].data.map((value: number, index: number) => (
                    <div key={index} className="text-center">
                      <div 
                        className="w-16 h-16 rounded-full"
                        style={{ backgroundColor: dashboardData.occupancyChart.datasets[0].backgroundColor[index] }}
                      />
                      <p className="mt-2 text-sm font-medium">{dashboardData.occupancyChart.labels[index]}</p>
                      <p className="text-xs text-gray-500">{value} units</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No occupancy data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Cash Flow Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Monthly Revenue Trend</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64">
            {dashboardData?.cashFlowChart ? (
              <div className="flex items-end space-x-2 h-full">
                {dashboardData.cashFlowChart.datasets[0].data.map((value: number, index: number) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full"
                      style={{
                        height: `${Math.max((value / Math.max(...dashboardData.cashFlowChart.datasets[0].data)) * 100, 10)}%`,
                        backgroundColor: '#8B5CF6'
                      }}
                    />
                    <span className="mt-2 text-xs text-gray-600">
                      {dashboardData.cashFlowChart.labels[index]}
                    </span>
                    <span className="text-xs font-medium">
                      ${value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No cash flow data available</p>
            )}
          </div>
        </div>

        {/* Property Summary Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Property Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expenses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Income
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Occupancy
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData?.propertySummary?.slice(0, 6).map((property: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {property.propertyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${property.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${property.expenses.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(property.revenue - property.expenses).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {property.occupancyRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upload CSV Data</h2>
                <button
                  onClick={() => setShowUploader(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <ImprovedCSVUpload
                onFileUploaded={(result) => {
                  if (result.success) {
                    setShowUploader(false);
                    loadDashboardData();
                  }
                }}
                showExistingFiles={true}
                autoDetectType={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
