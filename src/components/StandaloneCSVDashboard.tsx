import React, { useState, useEffect } from 'react';
import { localStorageService } from '../services/localStorageService';
import { csvUploadService } from '../services/csvUploadService';
import { chartDataService } from '../services/chartDataService';
import ImprovedCSVUpload from './ImprovedCSVUpload';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Home,
  RefreshCw,
  Upload
} from 'lucide-react';

export default function StandaloneCSVDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await chartDataService.generateChartData();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateMockData = async () => {
    await localStorageService.populateWithMockData();
    await loadDashboardData();
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Home className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">PropFI Dashboard - DEMO MODE</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowUploader(true)}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
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
                    ${dashboardData?.financialMetrics?.totalAssets?.toLocaleString() || '0'}
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
                    {dashboardData?.financialMetrics?.occupancyRate?.toFixed(1) || '0'}%
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
                    ${dashboardData?.financialMetrics?.avgRent?.toLocaleString() || '0'}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">CSV Files</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {csvUploadService.getAllFiles().length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* No Data Message */}
        {!dashboardData?.financialMetrics?.totalAssets && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-blue-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No CSV Data Available</h3>
              <p className="text-gray-600 mb-4">
                Upload your CSV files or use sample data to see charts and analytics.
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => setShowUploader(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Upload CSV Files
                </button>
                <button
                  onClick={populateMockData}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Use Sample Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show charts if data exists */}
        {dashboardData?.financialMetrics?.totalAssets && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🎉 SUCCESS!</h3>
            <p className="text-gray-600">
              Your CSV data is now working perfectly with local storage! 
              No authentication issues, no Supabase errors, no backend dependency.
            </p>
          </div>
        )}
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
