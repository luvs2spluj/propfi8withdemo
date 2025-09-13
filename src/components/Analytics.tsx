import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  AlertTriangle,
  DollarSign,
  Users,
  Building,
  Target,
  BarChart3
} from 'lucide-react';
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
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Load data from local backend
      try {
        const localDataResponse = await fetch('http://localhost:5000/api/processed-data');
        if (localDataResponse.ok) {
          const localData = await localDataResponse.json();
          console.log('📊 Analytics data loaded:', localData);
          
          if (localData.success && localData.data) {
            // Extract properties and calculate analytics
            const propertyNames = new Set<string>();
            Object.keys(localData.data).forEach(propertyName => {
              propertyNames.add(propertyName);
            });
            
            const localProperties: Property[] = Array.from(propertyNames).map(name => ({
              id: `local-${name.toLowerCase()}`,
              name: name,
              address: 'Local Data Source',
              type: 'Apartment Complex',
              total_units: 26
            }));
            
            setProperties(localProperties);
            
            // Calculate detailed analytics from sample data
            const allData = Object.values(localData.data).flat();
            let monthlyData: any[] = [];
            let totalRevenue = 0;
            let totalExpenses = 0;
            let occupancyRates: number[] = [];
            let maintenanceCosts: number[] = [];
            let utilitiesCosts: number[] = [];
            
            allData.forEach((item: any) => {
              if (item.data?.sample && Array.isArray(item.data.sample)) {
                item.data.sample.forEach((month: any) => {
                  monthlyData.push(month);
                  totalRevenue += parseFloat(month['Monthly Revenue']) || 0;
                  totalExpenses += parseFloat(month['Maintenance Cost']) || 0;
                  totalExpenses += parseFloat(month['Utilities Cost']) || 0;
                  totalExpenses += parseFloat(month['Insurance Cost']) || 0;
                  totalExpenses += parseFloat(month['Property Tax']) || 0;
                  totalExpenses += parseFloat(month['Other Expenses']) || 0;
                  
                  occupancyRates.push(parseFloat(month['Occupancy Rate']) || 0);
                  maintenanceCosts.push(parseFloat(month['Maintenance Cost']) || 0);
                  utilitiesCosts.push(parseFloat(month['Utilities Cost']) || 0);
                });
              }
            });
            
            // Calculate analytics insights
            const avgOccupancy = occupancyRates.reduce((sum, rate) => sum + rate, 0) / occupancyRates.length;
            const avgMaintenance = maintenanceCosts.reduce((sum, cost) => sum + cost, 0) / maintenanceCosts.length;
            const avgUtilities = utilitiesCosts.reduce((sum, cost) => sum + cost, 0) / utilitiesCosts.length;
            const netIncome = totalRevenue - totalExpenses;
            const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
            
            // Calculate trends and insights
            const revenuePerUnit = totalRevenue / (26 * 12); // 26 units, 12 months
            const expenseRatio = totalExpenses / totalRevenue;
            const occupancyTrend = occupancyRates.length > 6 ? 
              (occupancyRates.slice(-3).reduce((sum, rate) => sum + rate, 0) / 3) - 
              (occupancyRates.slice(0, 3).reduce((sum, rate) => sum + rate, 0) / 3) : 0;
            
            setAnalyticsData({
              totalRevenue,
              totalExpenses,
              netIncome,
              profitMargin,
              avgOccupancy,
              avgMaintenance,
              avgUtilities,
              revenuePerUnit,
              expenseRatio,
              occupancyTrend,
              monthlyData,
              totalUnits: 26,
              totalMonths: monthlyData.length
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Analytics data not available');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Property Management Analytics Metrics
  const analyticsMetrics = analyticsData ? [
    {
      title: 'Revenue per Unit',
      value: `$${analyticsData.revenuePerUnit.toLocaleString()}`,
      change: analyticsData.revenuePerUnit > 1500 ? 'Above Market' : 'Below Market',
      changeType: analyticsData.revenuePerUnit > 1500 ? 'positive' as const : 'negative' as const,
      period: 'monthly average',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Expense Ratio',
      value: `${(analyticsData.expenseRatio * 100).toFixed(1)}%`,
      change: analyticsData.expenseRatio < 0.6 ? 'Efficient' : 'High Costs',
      changeType: analyticsData.expenseRatio < 0.6 ? 'positive' as const : 'negative' as const,
      period: 'of total revenue',
      icon: TrendingDown,
      color: analyticsData.expenseRatio < 0.6 ? 'green' : 'red'
    },
    {
      title: 'Occupancy Trend',
      value: `${analyticsData.occupancyTrend > 0 ? '+' : ''}${analyticsData.occupancyTrend.toFixed(1)}%`,
      change: analyticsData.occupancyTrend > 0 ? 'Improving' : 'Declining',
      changeType: analyticsData.occupancyTrend > 0 ? 'positive' as const : 'negative' as const,
      period: 'vs previous period',
      icon: TrendingUp,
      color: analyticsData.occupancyTrend > 0 ? 'blue' : 'red'
    },
    {
      title: 'Maintenance Efficiency',
      value: `$${analyticsData.avgMaintenance.toLocaleString()}`,
      change: analyticsData.avgMaintenance < 5000 ? 'Low' : 'High',
      changeType: analyticsData.avgMaintenance < 5000 ? 'positive' as const : 'negative' as const,
      period: 'monthly average',
      icon: Building,
      color: analyticsData.avgMaintenance < 5000 ? 'green' : 'orange'
    }
  ] : [];

  // Property Management Insights
  const managementInsights = analyticsData ? [
    {
      title: 'Rent Optimization Opportunity',
      description: `Current revenue per unit is $${analyticsData.revenuePerUnit.toLocaleString()}. Market analysis suggests potential for 5-8% rent increase without affecting occupancy.`,
      type: 'opportunity',
      impact: 'High',
      action: 'Consider rent increase',
      icon: Target
    },
    {
      title: 'Expense Management Alert',
      description: `Expense ratio is ${(analyticsData.expenseRatio * 100).toFixed(1)}%. Industry benchmark is 60%. ${analyticsData.expenseRatio > 0.6 ? 'Consider cost reduction strategies.' : 'Expenses are well-controlled.'}`,
      type: analyticsData.expenseRatio > 0.6 ? 'warning' : 'positive',
      impact: analyticsData.expenseRatio > 0.6 ? 'High' : 'Low',
      action: analyticsData.expenseRatio > 0.6 ? 'Review expenses' : 'Maintain current levels',
      icon: AlertTriangle
    },
    {
      title: 'Maintenance Cost Analysis',
      description: `Average maintenance cost is $${analyticsData.avgMaintenance.toLocaleString()}/month. ${analyticsData.avgMaintenance > 5000 ? 'Consider preventive maintenance program.' : 'Maintenance costs are reasonable.'}`,
      type: analyticsData.avgMaintenance > 5000 ? 'warning' : 'info',
      impact: analyticsData.avgMaintenance > 5000 ? 'Medium' : 'Low',
      action: analyticsData.avgMaintenance > 5000 ? 'Implement preventive maintenance' : 'Continue current approach',
      icon: Building
    },
    {
      title: 'Occupancy Performance',
      description: `Average occupancy is ${analyticsData.avgOccupancy.toFixed(1)}%. ${analyticsData.occupancyTrend > 0 ? 'Trend is improving.' : 'Trend is declining - review marketing strategy.'}`,
      type: analyticsData.occupancyTrend > 0 ? 'positive' : 'warning',
      impact: 'Medium',
      action: analyticsData.occupancyTrend > 0 ? 'Maintain current strategy' : 'Review marketing efforts',
      icon: Users
    }
  ] : [];

  // Performance Benchmarks
  const performanceBenchmarks = analyticsData ? [
    {
      metric: 'Revenue per Unit',
      current: analyticsData.revenuePerUnit,
      benchmark: 1500,
      status: analyticsData.revenuePerUnit >= 1500 ? 'above' : 'below',
      unit: '$/month'
    },
    {
      metric: 'Expense Ratio',
      current: analyticsData.expenseRatio * 100,
      benchmark: 60,
      status: analyticsData.expenseRatio <= 0.6 ? 'below' : 'above',
      unit: '%'
    },
    {
      metric: 'Occupancy Rate',
      current: analyticsData.avgOccupancy,
      benchmark: 95,
      status: analyticsData.avgOccupancy >= 95 ? 'above' : 'below',
      unit: '%'
    },
    {
      metric: 'Profit Margin',
      current: analyticsData.profitMargin,
      benchmark: 25,
      status: analyticsData.profitMargin >= 25 ? 'above' : 'below',
      unit: '%'
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Management Analytics</h1>
          <p className="text-gray-600 mt-1">Actionable insights for informed property management decisions</p>
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
            <span>Export Report</span>
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

      {/* Performance Benchmarks */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance vs Industry Benchmarks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceBenchmarks.map((benchmark, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{benchmark.metric}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  benchmark.status === 'above' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {benchmark.status === 'above' ? 'Above' : 'Below'} Benchmark
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current:</span>
                  <span className="font-semibold">{benchmark.current.toFixed(1)}{benchmark.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Benchmark:</span>
                  <span className="text-sm text-gray-500">{benchmark.benchmark}{benchmark.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Management Insights */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Management Insights & Recommendations</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {managementInsights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    insight.type === 'opportunity' ? 'bg-green-100' :
                    insight.type === 'warning' ? 'bg-yellow-100' :
                    insight.type === 'positive' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      insight.type === 'opportunity' ? 'text-green-600' :
                      insight.type === 'warning' ? 'text-yellow-600' :
                      insight.type === 'positive' ? 'text-blue-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
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
                    <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary-600">{insight.action}</span>
                      <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                        Learn More →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost Analysis */}
      {analyticsData && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Analysis Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Maintenance</h4>
              <p className="text-2xl font-bold text-gray-900">${analyticsData.avgMaintenance.toLocaleString()}</p>
              <p className="text-sm text-gray-600">monthly average</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Utilities</h4>
              <p className="text-2xl font-bold text-gray-900">${analyticsData.avgUtilities.toLocaleString()}</p>
              <p className="text-sm text-gray-600">monthly average</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Total Expenses</h4>
              <p className="text-2xl font-bold text-gray-900">${analyticsData.totalExpenses.toLocaleString()}</p>
              <p className="text-sm text-gray-600">12-month total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
