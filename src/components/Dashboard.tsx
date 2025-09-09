import React from 'react';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Users,
  AlertCircle,
  Calendar
} from 'lucide-react';
import RevenueChart from './charts/RevenueChart';
import OccupancyChart from './charts/OccupancyChart';
import PropertyPerformanceChart from './charts/PropertyPerformanceChart';

const Dashboard: React.FC = () => {
  const metrics = [
    {
      title: 'Total Properties',
      value: '24',
      change: '+2',
      changeType: 'positive' as const,
      icon: Building2,
      color: 'blue'
    },
    {
      title: 'Monthly Revenue',
      value: '$127,450',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Occupancy Rate',
      value: '94.2%',
      change: '+1.5%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Active Tenants',
      value: '186',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your properties.</p>
        </div>
        <div className="flex space-x-3">
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
