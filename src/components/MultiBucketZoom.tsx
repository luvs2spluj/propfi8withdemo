import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  ZoomIn, 
  ZoomOut, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  BarChart3,
  PieChart,
  LineChart,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line
} from 'recharts';
import { AccountLineItem } from '../lib/services/csvTimeSeriesService';

interface MultiBucketZoomProps {
  lineItems: AccountLineItem[];
  bucketCategory: string;
  onClose: () => void;
  onBack: () => void;
}

export default function MultiBucketZoom({ 
  lineItems, 
  bucketCategory, 
  onClose, 
  onBack 
}: MultiBucketZoomProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'name' | 'month'>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [filteredItems, setFilteredItems] = useState<AccountLineItem[]>(lineItems);

  useEffect(() => {
    let filtered = lineItems;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.account_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'name':
          aValue = a.account_name.toLowerCase();
          bValue = b.account_name.toLowerCase();
          break;
        case 'month':
          aValue = new Date(a.year, a.month - 1).getTime();
          bValue = new Date(b.year, b.month - 1).getTime();
          break;
        default:
          aValue = a.amount;
          bValue = b.amount;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredItems(filtered);
  }, [lineItems, searchQuery, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (month: number, year: number) => {
    return new Date(year, month - 1).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getBucketColor = (category: string) => {
    switch (category) {
      case 'income_item':
      case 'income_total':
        return '#10b981';
      case 'expense_item':
      case 'expense_total':
        return '#ef4444';
      case 'cash_amount':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  // Prepare chart data
  const chartData = filteredItems.map(item => ({
    name: item.account_name,
    amount: Math.abs(item.amount),
    month: formatDate(item.month, item.year),
    category: item.bucket_category
  }));

  const colors = chartData.map(item => getBucketColor(item.category));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            Amount: {formatCurrency(data.amount)}
          </p>
          <p className="text-sm text-gray-600">
            Month: {data.month}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={10}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="amount" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="amount"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={10}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const totalAmount = filteredItems.reduce((sum, item) => sum + item.amount, 0);
  const averageAmount = filteredItems.length > 0 ? totalAmount / filteredItems.length : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={onBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ZoomIn className="h-5 w-5" />
                  {bucketCategory.replace('_', ' ').toUpperCase()} - Line Item Analysis
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of {filteredItems.length} line items
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{filteredItems.length}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                <div className="text-sm text-gray-600">Total Amount</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatCurrency(averageAmount)}</div>
                <div className="text-sm text-gray-600">Average Amount</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {new Set(filteredItems.map(item => item.account_name)).size}
                </div>
                <div className="text-sm text-gray-600">Unique Accounts</div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search line items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="amount">Sort by Amount</option>
                <option value="name">Sort by Name</option>
                <option value="month">Sort by Month</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('pie')}
              >
                <PieChart className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <LineChart className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chart */}
          <Card>
            <CardContent className="p-6">
              {renderChart()}
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items ({filteredItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.account_name}</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(item.month, item.year)}
                      </div>
                      {item.ai_category && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {item.ai_category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(item.amount)}</div>
                      {item.confidence_score && (
                        <div className="text-xs text-gray-500">
                          {Math.round(item.confidence_score * 100)}% confidence
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
