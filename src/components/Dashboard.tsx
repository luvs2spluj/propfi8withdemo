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
      } else {
        // Fallback to default data if API fails
        setProperties([
          { id: '1', name: 'Downtown Plaza', address: '123 Main St, Downtown', type: 'Apartment Complex', total_units: 24, occupied: 20, occupancyRate: 83.3 },
          { id: '2', name: 'Garden Apartments', address: '456 Oak Ave, Garden District', type: 'Apartment Complex', total_units: 18, occupied: 15, occupancyRate: 83.3 },
          { id: '3', name: 'Riverside Complex', address: '789 River Rd, Riverside', type: 'Townhouse Complex', total_units: 12, occupied: 10, occupancyRate: 83.3 },
          { id: '4', name: 'Oakwood Manor', address: '321 Pine St, Oakwood', type: 'Single Family', total_units: 8, occupied: 7, occupancyRate: 87.5 },
          { id: '5', name: 'Sunset Heights', address: '654 Sunset Blvd, Heights', type: 'Apartment Complex', total_units: 30, occupied: 25, occupancyRate: 83.3 },
          { id: '6', name: 'Pine Valley', address: '987 Valley Rd, Pine Valley', type: 'Condo Complex', total_units: 16, occupied: 14, occupancyRate: 87.5 }
        ]);
      }

      // Load financial data
      const financialResponse = await ApiService.getFinancialSummary();
      if (financialResponse.success && financialResponse.data) {
        setFinancialData(financialResponse.data);
      } else {
        // Fallback financial data
        setFinancialData({
          totalRevenue: 125000,
          totalExpenses: 85000,
          netIncome: 40000,
          occupancyRate: 85.2
        });
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
      
      // Use fallback data on error
      setProperties([
        { id: '1', name: 'Downtown Plaza', address: '123 Main St, Downtown', type: 'Apartment Complex', total_units: 24, occupied: 20, occupancyRate: 83.3 },
        { id: '2', name: 'Garden Apartments', address: '456 Oak Ave, Garden District', type: 'Apartment Complex', total_units: 18, occupied: 15, occupancyRate: 83.3 },
        { id: '3', name: 'Riverside Complex', address: '789 River Rd, Riverside', type: 'Townhouse Complex', total_units: 12, occupied: 10, occupancyRate: 83.3 },
        { id: '4', name: 'Oakwood Manor', address: '321 Pine St, Oakwood', type: 'Single Family', total_units: 8, occupied: 7, occupancyRate: 87.5 },
        { id: '5', name: 'Sunset Heights', address: '654 Sunset Blvd, Heights', type: 'Apartment Complex', total_units: 30, occupied: 25, occupancyRate: 83.3 },
        { id: '6', name: 'Pine Valley', address: '987 Valley Rd, Pine Valley', type: 'Condo Complex', total_units: 16, occupied: 14, occupancyRate: 87.5 }
      ]);
      setFinancialData({
        totalRevenue: 125000,
        totalExpenses: 85000,
        netIncome: 40000,
        occupancyRate: 85.2
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalProperties = properties.length;
  const totalOccupied = properties.reduce((sum, p) => sum + (p.occupied || 0), 0);
  const avgOccupancy = properties.length > 0 ? properties.reduce((sum, p) => sum + (p.occupancyRate || 0), 0) / properties.length : 0;

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
      title: 'Monthly Revenue',
      value: `$${(financialData?.totalRevenue || 0).toLocaleString()}`,
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
      title: 'Active Tenants',
      value: totalOccupied.toString(),
      change: '+12',
      changeType: 'positive' as const,
      icon: Users,
      color: 'orange'
    }
  ];

  const recentActivities = [
    { id: 1, type: 'lease', message: 'New lease signed for Unit 4B - Downtown Plaza', time: '2 hours ago', icon: Calendar },
    { id: 2, type: 'payment', message: 'Rent payment received from Tenant #142', time: '4 hours ago', icon: DollarSign },
    { id: 3, type: 'maintenance', message: 'Maintenance request completed for Unit 2A', time: '6 hours ago', icon: AlertCircle },
    { id: 4, type: 'lease', message: 'Lease renewal signed for Unit 8C - Garden Apartments', time: '1 day ago', icon: Calendar },
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
