import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import ApiService from '../services/api';

interface PropertyData {
  id: string;
  property_id: string;
  date: string;
  revenue: string;
  occupancy_rate: string;
  maintenance_cost: string;
  utilities_cost: string;
  insurance_cost: string;
  property_tax: string;
  other_expenses: string;
  notes: string;
  property_name: string;
}

interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  total_units?: number;
}

const Financials: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('2024');
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [propertyData, setPropertyData] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadPropertyData();
    }
  }, [selectedProperty]);

  const loadProperties = async () => {
    try {
      const response = await ApiService.getProperties();
      if (response.success && response.data) {
        setProperties(response.data);
        if (response.data.length > 0) {
          setSelectedProperty(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      setError('Failed to load properties');
    }
  };

  const loadPropertyData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await ApiService.getPropertyData(selectedProperty);
      if (response.success && response.data) {
        setPropertyData(response.data);
      } else {
        setError('Failed to load property data');
        setPropertyData([]);
      }
    } catch (error: any) {
      console.error('Error loading property data:', error);
      setError('Failed to load property data');
      setPropertyData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate financial summary from real data
  const calculateFinancialSummary = () => {
    if (!propertyData || propertyData.length === 0) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        profitMargin: 0,
        monthlyAverage: 0
      };
    }

    const totalRevenue = propertyData.reduce((sum, record) => sum + parseFloat(record.revenue), 0);
    const totalExpenses = propertyData.reduce((sum, record) => {
      const maintenance = parseFloat(record.maintenance_cost) || 0;
      const utilities = parseFloat(record.utilities_cost) || 0;
      const insurance = parseFloat(record.insurance_cost) || 0;
      const propertyTax = parseFloat(record.property_tax) || 0;
      const other = parseFloat(record.other_expenses) || 0;
      return sum + maintenance + utilities + insurance + propertyTax + other;
    }, 0);
    
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    const monthlyAverage = propertyData.length > 0 ? totalRevenue / propertyData.length : 0;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      profitMargin,
      monthlyAverage
    };
  };

  // Generate monthly data from real CSV data
  const generateMonthlyData = () => {
    if (!propertyData || propertyData.length === 0) {
      return [];
    }

    return propertyData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(record => {
        const date = new Date(record.date);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const revenue = parseFloat(record.revenue);
        const expenses = (parseFloat(record.maintenance_cost) || 0) +
                       (parseFloat(record.utilities_cost) || 0) +
                       (parseFloat(record.insurance_cost) || 0) +
                       (parseFloat(record.property_tax) || 0) +
                       (parseFloat(record.other_expenses) || 0);
        const net = revenue - expenses;
        const margin = revenue > 0 ? (net / revenue) * 100 : 0;

        return {
          month,
          revenue,
          expenses,
          net,
          margin
        };
      });
  };

  const financialSummary = calculateFinancialSummary();
  const monthlyData = generateMonthlyData();

  // Calculate expense categories from real data
  const calculateExpenseCategories = () => {
    if (!propertyData || propertyData.length === 0) {
      return [];
    }

    const totalMaintenance = propertyData.reduce((sum, record) => sum + (parseFloat(record.maintenance_cost) || 0), 0);
    const totalUtilities = propertyData.reduce((sum, record) => sum + (parseFloat(record.utilities_cost) || 0), 0);
    const totalInsurance = propertyData.reduce((sum, record) => sum + (parseFloat(record.insurance_cost) || 0), 0);
    const totalPropertyTax = propertyData.reduce((sum, record) => sum + (parseFloat(record.property_tax) || 0), 0);
    const totalOther = propertyData.reduce((sum, record) => sum + (parseFloat(record.other_expenses) || 0), 0);
    
    const totalExpenses = totalMaintenance + totalUtilities + totalInsurance + totalPropertyTax + totalOther;

    return [
      { category: 'Maintenance & Repairs', amount: totalMaintenance, percentage: totalExpenses > 0 ? (totalMaintenance / totalExpenses) * 100 : 0, color: 'red' },
      { category: 'Utilities', amount: totalUtilities, percentage: totalExpenses > 0 ? (totalUtilities / totalExpenses) * 100 : 0, color: 'yellow' },
      { category: 'Insurance', amount: totalInsurance, percentage: totalExpenses > 0 ? (totalInsurance / totalExpenses) * 100 : 0, color: 'green' },
      { category: 'Property Tax', amount: totalPropertyTax, percentage: totalExpenses > 0 ? (totalPropertyTax / totalExpenses) * 100 : 0, color: 'blue' },
      { category: 'Other Expenses', amount: totalOther, percentage: totalExpenses > 0 ? (totalOther / totalExpenses) * 100 : 0, color: 'gray' },
    ];
  };

  const expenseCategories = calculateExpenseCategories();

  const revenueSources = [
    { source: 'Rent Payments', amount: 1420000, percentage: 93.0 },
    { source: 'Late Fees', amount: 45000, percentage: 2.9 },
    { source: 'Application Fees', amount: 25000, percentage: 1.6 },
    { source: 'Pet Fees', amount: 18000, percentage: 1.2 },
    { source: 'Other Income', amount: 12450, percentage: 0.8 },
  ];

  const getColorClass = (color: string) => {
    const colors = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      gray: 'bg-gray-500'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financials</h1>
          <p className="text-gray-600 mt-1">Real-time financial data from CSV uploads</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Select Property</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
          <button 
            onClick={loadPropertyData}
            disabled={isLoading || !selectedProperty}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading financial data...</p>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!isLoading && !error && propertyData.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Financial Data</h3>
          <p className="text-gray-500 mb-4">Upload CSV files to see financial data for this property.</p>
          <button className="btn-primary">Upload CSV Data</button>
        </div>
      )}

      {/* Financial Summary Cards - Only show when data is available */}
      {!isLoading && !error && propertyData.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${financialSummary.totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-green-600 mt-1">+12.5% vs last year</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${financialSummary.totalExpenses.toLocaleString()}
              </p>
              <p className="text-sm text-red-600 mt-1">+3.2% vs last year</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${financialSummary.netIncome.toLocaleString()}
              </p>
              <p className="text-sm text-green-600 mt-1">+18.7% vs last year</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {financialSummary.profitMargin}%
              </p>
              <p className="text-sm text-green-600 mt-1">+2.1% vs last year</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Average</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${financialSummary.monthlyAverage.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">Revenue per month</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Financial Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Month</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Revenue</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Expenses</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Net Income</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Margin</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((data, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{data.month}</td>
                  <td className="py-3 px-4 text-right text-gray-900">${data.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-900">${data.expenses.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-900">${data.net.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {((data.net / data.revenue) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          <div className="space-y-4">
            {expenseCategories.map((expense, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${getColorClass(expense.color)}`}></div>
                  <span className="text-sm font-medium text-gray-900">{expense.category}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${expense.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{expense.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Sources */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Sources</h3>
          <div className="space-y-4">
            {revenueSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">{source.source}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${source.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{source.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default Financials;
