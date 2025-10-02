import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  Eye,
  ZoomIn
} from 'lucide-react';
import { BucketBreakdown, AccountLineItem } from '../lib/services/csvTimeSeriesService';

interface BucketBreakdownChartProps {
  bucketData: BucketBreakdown[];
  onLineItemClick?: (lineItems: AccountLineItem[], bucketCategory: string) => void;
  chartType?: 'pie' | 'bar' | 'line' | 'area';
  showDetails?: boolean;
}

export default function BucketBreakdownChart({ 
  bucketData, 
  onLineItemClick,
  chartType = 'pie',
  showDetails = true 
}: BucketBreakdownChartProps) {
  const [selectedChartType, setSelectedChartType] = React.useState(chartType);
  const [selectedBucket, setSelectedBucket] = React.useState<string | null>(null);

  // Prepare data for charts
  const chartData = bucketData.map(bucket => ({
    name: bucket.bucket_category.replace('_', ' ').toUpperCase(),
    value: Math.abs(bucket.total_amount),
    amount: bucket.total_amount,
    count: bucket.item_count,
    accounts: bucket.unique_accounts,
    category: bucket.bucket_category
  }));

  // Color scheme for different bucket types
  const getBucketColor = (category: string) => {
    switch (category) {
      case 'income_item':
      case 'income_total':
        return '#10b981'; // green-500
      case 'expense_item':
      case 'expense_total':
        return '#ef4444'; // red-500
      case 'cash_amount':
        return '#3b82f6'; // blue-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  const colors = chartData.map(item => getBucketColor(item.category));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleBucketClick = (bucket: BucketBreakdown) => {
    if (onLineItemClick) {
      onLineItemClick(bucket.line_items, bucket.bucket_category);
    }
    setSelectedBucket(bucket.bucket_category);
  };

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
            Items: {data.count}
          </p>
          <p className="text-sm text-gray-600">
            Accounts: {data.accounts}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (selectedChartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );

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
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Bucket Breakdown Analysis
              </CardTitle>
              <CardDescription>
                Visualize your data across different bucket categories
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={selectedChartType === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChartType('pie')}
              >
                <PieChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedChartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChartType('bar')}
              >
                <BarChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedChartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChartType('line')}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedChartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChartType('area')}
              >
                <AreaChartIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Bucket Details */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Bucket Details
            </CardTitle>
            <CardDescription>
              Click on any bucket to view detailed line items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bucketData.map((bucket) => {
                const isIncome = bucket.bucket_category.includes('income');
                const isExpense = bucket.bucket_category.includes('expense');
                const isCash = bucket.bucket_category.includes('cash');
                
                return (
                  <Card 
                    key={bucket.bucket_category}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isIncome ? 'border-green-200 hover:border-green-300' :
                      isExpense ? 'border-red-200 hover:border-red-300' :
                      isCash ? 'border-blue-200 hover:border-blue-300' :
                      'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleBucketClick(bucket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {isIncome && <TrendingUp className="h-4 w-4 text-green-600" />}
                        {isExpense && <TrendingDown className="h-4 w-4 text-red-600" />}
                        {isCash && <DollarSign className="h-4 w-4 text-blue-600" />}
                        <span className="font-medium capitalize">
                          {bucket.bucket_category.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {formatCurrency(bucket.total_amount)}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>{bucket.item_count} line items</div>
                        <div>{bucket.unique_accounts} unique accounts</div>
                      </div>
                      <div className="mt-3">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            isIncome ? 'text-green-700 border-green-300' :
                            isExpense ? 'text-red-700 border-red-300' :
                            isCash ? 'text-blue-700 border-blue-300' :
                            'text-gray-700 border-gray-300'
                          }`}
                        >
                          <ZoomIn className="h-3 w-3 mr-1" />
                          Click to view details
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
