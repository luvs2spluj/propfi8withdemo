import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download
} from 'lucide-react';
import RevenueChart from './charts/RevenueChart';
import OccupancyChart from './charts/OccupancyChart';
import PropertyPerformanceChart from './charts/PropertyPerformanceChart';
import ApiService from '../services/api';

interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  total_units?: number;
}

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('12m');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getProperties();
      if (response.success && response.data) {
        setProperties(response.data);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyticsMetrics = [
    {
      title: 'Total Revenue',
      value: '$1,527,450',
      change: '+12.5%',
      changeType: 'positive' as const,
      period: 'vs last year',
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Average Occupancy',
      value: '94.2%',
      change: '+2.1%',
      changeType: 'positive' as const,
      period: 'vs last year',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      title: 'Net Profit Margin',
      value: '68.4%',
      change: '+5.2%',
      changeType: 'positive' as const,
      period: 'vs last year',
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Maintenance Costs',
      value: '$45,200',
      change: '-8.3%',
      changeType: 'positive' as const,
      period: 'vs last year',
      icon: TrendingDown,
      color: 'orange'
    }
  ];

  const topPerformers = [
    { name: 'Pine Valley', revenue: 28800, occupancy: 100, growth: '+15.2%' },
    { name: 'Oakwood Manor', revenue: 16800, occupancy: 100, growth: '+12.8%' },
    { name: 'Downtown Plaza', revenue: 45600, occupancy: 95.8, growth: '+11.5%' },
    { name: 'Sunset Heights', revenue: 58800, occupancy: 93.3, growth: '+9.7%' },
    { name: 'Garden Apartments', revenue: 32400, occupancy: 94.4, growth: '+8.3%' },
  ];

  const marketInsights = [
    {
      title: 'Market Trend Analysis',
      description: 'Property values in your area have increased by 8.5% over the past year, indicating strong market growth.',
      type: 'positive',
      impact: 'High'
    },
    {
      title: 'Rent Optimization Opportunity',
      description: 'Based on market analysis, you could increase rents by an average of 5-7% without affecting occupancy.',
      type: 'opportunity',
      impact: 'Medium'
    },
    {
      title: 'Seasonal Demand Pattern',
      description: 'Peak rental season typically occurs from March to August, with 15% higher demand during these months.',
      type: 'info',
      impact: 'Low'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Deep insights into your property performance</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="12m">Last 12 months</option>
              <option value="24m">Last 24 months</option>
            </select>
          </div>
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                  <div className="flex items-center mt-1">
                    <span className={`text-sm ${
                      metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">{metric.period}</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  metric.color === 'green' ? 'bg-green-100' :
                  metric.color === 'blue' ? 'bg-blue-100' :
                  metric.color === 'purple' ? 'bg-purple-100' :
                  'bg-orange-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    metric.color === 'green' ? 'text-green-600' :
                    metric.color === 'blue' ? 'text-blue-600' :
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <div className="flex space-x-2">
              <button 
                className={`px-3 py-1 rounded-md text-sm ${
                  selectedMetric === 'revenue' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                }`}
                onClick={() => setSelectedMetric('revenue')}
              >
                Revenue
              </button>
              <button 
                className={`px-3 py-1 rounded-md text-sm ${
                  selectedMetric === 'occupancy' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                }`}
                onClick={() => setSelectedMetric('occupancy')}
              >
                Occupancy
              </button>
            </div>
          </div>
          {selectedMetric === 'revenue' ? <RevenueChart properties={properties} /> : <OccupancyChart properties={properties} />}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Performance</h3>
          <PropertyPerformanceChart properties={properties} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Properties</h3>
          <div className="space-y-4">
            {topPerformers.map((property, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-sm">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{property.name}</p>
                    <p className="text-sm text-gray-500">{property.occupancy}% occupancy</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${property.revenue.toLocaleString()}</p>
                  <p className="text-sm text-green-600">{property.growth}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Insights */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Insights</h3>
          <div className="space-y-4">
            {marketInsights.map((insight, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    insight.impact === 'High' ? 'bg-red-100 text-red-800' :
                    insight.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {insight.impact} Impact
                  </span>
                </div>
                <p className="text-sm text-gray-600">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
