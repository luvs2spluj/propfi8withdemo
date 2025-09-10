import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Users,
  AlertCircle,
  Calendar,
  RefreshCw
} from 'lucide-react';
import RevenueChart from './charts/RevenueChart';
import OccupancyChart from './charts/OccupancyChart';
import PropertyPerformanceChart from './charts/PropertyPerformanceChart';
import ApiService from '../services/api';

const Dashboard: React.FC = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    // Listen for data updates from CSV uploads
    const handleDataUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener('dataUpdated', handleDataUpdate);

    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load properties from database
      const propertiesResponse = await ApiService.getProperties();
      if (propertiesResponse.success && propertiesResponse.data) {
        setProperties(propertiesResponse.data);
        console.log('✅ Properties loaded from API:', propertiesResponse.data);
      } else {
        console.error('❌ Failed to load properties from API:', propertiesResponse.error);
        setProperties([]);
      }

      // Load financial data
      const financialResponse = await ApiService.getFinancialSummary();
      if (financialResponse.success && financialResponse.data) {
        setFinancialData(financialResponse.data);
        console.log('✅ Financial data loaded from API:', financialResponse.data);
      } else {
        console.error('❌ Failed to load financial data from API:', financialResponse.error);
        setFinancialData(null);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please check if the backend server is running.');
      setProperties([]);
      setFinancialData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const totalProperties = properties.length;
  const totalOccupied = properties.reduce((sum, p) => sum + (p.total_units || 0), 0);
  const avgOccupancy = financialData?.avg_occupancy_rate || 0;

  const metrics = [
    {
      title: 'Total Properties',
      value: totalProperties.toString(),
      change: '+2',
      changeType: 'positive' as const,
      icon: Building2,
      color: 'blue'
    },
    {
      title: 'Total Revenue',
      value: `$${(parseFloat(financialData?.total_revenue || 0)).toLocaleString()}`,
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Occupancy Rate',
      value: `${avgOccupancy.toFixed(1)}%`,
      change: '+1.5%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Total Units',
      value: totalOccupied.toString(),
      change: '+12',
      changeType: 'positive' as const,
      icon: Users,
      color: 'orange'
    }
  ];

  const recentActivities = [
    { id: 1, type: 'data', message: 'CSV data uploaded for Chico property', time: 'Recently', icon: Calendar },
    { id: 2, type: 'property', message: 'Chico property added to system', time: 'Recently', icon: Building2 },
    { id: 3, type: 'revenue', message: `Total revenue: $${(parseFloat(financialData?.total_revenue || 0)).toLocaleString()}`, time: 'Current', icon: DollarSign },
    { id: 4, type: 'occupancy', message: `Occupancy rate: ${avgOccupancy.toFixed(1)}%`, time: 'Current', icon: TrendingUp },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your properties.</p>
          {error && (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={loadDashboardData}
            disabled={isLoading}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <button className="btn-secondary">
            Export Report
          </button>
          <button className="btn-primary">
            Add Property
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                  <p className={`text-sm mt-1 ${
                    metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change} from last month
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  metric.color === 'blue' ? 'bg-blue-100' :
                  metric.color === 'green' ? 'bg-green-100' :
                  metric.color === 'purple' ? 'bg-purple-100' :
                  'bg-orange-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    metric.color === 'blue' ? 'text-blue-600' :
                    metric.color === 'green' ? 'text-green-600' :
                    metric.color === 'purple' ? 'text-purple-600' :
                    'text-orange-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <RevenueChart />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Rate</h3>
          <OccupancyChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Performance</h3>
          <PropertyPerformanceChart />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
