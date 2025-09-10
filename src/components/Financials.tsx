import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download
} from 'lucide-react';

const Financials: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('2024');

  const financialSummary = {
    totalRevenue: 1527450,
    totalExpenses: 483200,
    netIncome: 1044250,
    profitMargin: 68.4,
    monthlyAverage: 127287
  };

  const monthlyData = [
    { month: 'Jan', revenue: 95000, expenses: 35000, net: 60000 },
    { month: 'Feb', revenue: 102000, expenses: 38000, net: 64000 },
    { month: 'Mar', revenue: 98000, expenses: 36000, net: 62000 },
    { month: 'Apr', revenue: 115000, expenses: 42000, net: 73000 },
    { month: 'May', revenue: 108000, expenses: 39000, net: 69000 },
    { month: 'Jun', revenue: 125000, expenses: 45000, net: 80000 },
    { month: 'Jul', revenue: 118000, expenses: 43000, net: 75000 },
    { month: 'Aug', revenue: 127450, expenses: 46000, net: 81450 },
    { month: 'Sep', revenue: 132000, expenses: 48000, net: 84000 },
    { month: 'Oct', revenue: 128000, expenses: 47000, net: 81000 },
    { month: 'Nov', revenue: 135000, expenses: 49000, net: 86000 },
    { month: 'Dec', revenue: 142000, expenses: 52000, net: 90000 },
  ];

  const expenseCategories = [
    { category: 'Maintenance & Repairs', amount: 125000, percentage: 25.9, color: 'red' },
    { category: 'Property Management', amount: 95000, percentage: 19.7, color: 'blue' },
    { category: 'Insurance', amount: 78000, percentage: 16.1, color: 'green' },
    { category: 'Utilities', amount: 65000, percentage: 13.5, color: 'yellow' },
    { category: 'Marketing & Advertising', amount: 45000, percentage: 9.3, color: 'purple' },
    { category: 'Legal & Professional', amount: 35000, percentage: 7.2, color: 'orange' },
    { category: 'Other', amount: 50200, percentage: 10.4, color: 'gray' },
  ];

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
          <p className="text-gray-600 mt-1">Comprehensive financial overview and reporting</p>
        </div>
        <div className="flex space-x-3">
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
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
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
    </div>
  );
};

export default Financials;
