import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  Eye,
  ChevronDown,
  ChevronRight,
  FileText,
  PieChart
} from 'lucide-react';
import { CSVTimeSeriesService, MonthlyData, BucketBreakdown, AccountLineItem } from '../lib/services/csvTimeSeriesService';
import BucketBreakdownChart from './BucketBreakdownChart';
import MultiBucketZoom from './MultiBucketZoom';

interface CSVTimeSeriesVisualizationProps {
  csvFileId: string;
  fileName: string;
}

export default function CSVTimeSeriesVisualization({ csvFileId, fileName }: CSVTimeSeriesVisualizationProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [bucketBreakdown, setBucketBreakdown] = useState<BucketBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [selectedLineItems, setSelectedLineItems] = useState<AccountLineItem[]>([]);
  const [showMultiBucketZoom, setShowMultiBucketZoom] = useState(false);

  useEffect(() => {
    loadData();
  }, [csvFileId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [monthly, breakdown] = await Promise.all([
        CSVTimeSeriesService.getMonthlyData(csvFileId),
        CSVTimeSeriesService.getBucketBreakdown(csvFileId)
      ]);
      
      setMonthlyData(monthly);
      setBucketBreakdown(breakdown);
    } catch (error) {
      console.error('Failed to load time series data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonthExpansion = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const handleBucketClick = async (lineItems: AccountLineItem[], bucketCategory: string) => {
    setSelectedBucket(bucketCategory);
    setSelectedLineItems(lineItems);
    setShowMultiBucketZoom(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getBucketColor = (bucketCategory: string) => {
    switch (bucketCategory) {
      case 'income_item':
      case 'income_total':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expense_item':
      case 'expense_total':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cash_amount':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBucketIcon = (bucketCategory: string) => {
    switch (bucketCategory) {
      case 'income_item':
      case 'income_total':
        return <TrendingUp className="h-4 w-4" />;
      case 'expense_item':
      case 'expense_total':
        return <TrendingDown className="h-4 w-4" />;
      case 'cash_amount':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Time Series Data...</h3>
          <p className="text-gray-600">Processing monthly breakdown for {fileName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Time Series Analysis: {fileName}
          </CardTitle>
          <CardDescription>
            Monthly breakdown with bucket categorization and line item details
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Bucket Breakdown Charts */}
      <BucketBreakdownChart 
        bucketData={bucketBreakdown}
        onLineItemClick={handleBucketClick}
        chartType="pie"
        showDetails={true}
      />

      {/* Monthly Time Series */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Time Series
          </CardTitle>
          <CardDescription>
            Expand any month to view detailed line items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((month) => {
              const monthKey = `${month.year}-${month.month}`;
              const isExpanded = expandedMonths.has(monthKey);

              return (
                <Card key={monthKey} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    {/* Month Header */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleMonthExpansion(monthKey)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold">{month.monthName} {month.year}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Income: {formatCurrency(month.income_total)}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              Expenses: {formatCurrency(month.expense_total)}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-blue-600" />
                              Net: {formatCurrency(month.net_income)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {month.income_items.length + month.expense_items.length} line items
                      </Badge>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 space-y-4">
                        {/* Income Items */}
                        {month.income_items.length > 0 && (
                          <div>
                            <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Income Items ({month.income_items.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {month.income_items.map((item) => (
                                <div key={item.id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                  <div className="font-medium text-green-900">{item.account_name}</div>
                                  <div className="text-green-700 font-semibold">
                                    {formatCurrency(item.amount)}
                                  </div>
                                  {item.ai_category && (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {item.ai_category}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expense Items */}
                        {month.expense_items.length > 0 && (
                          <div>
                            <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                              <TrendingDown className="h-4 w-4" />
                              Expense Items ({month.expense_items.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {month.expense_items.map((item) => (
                                <div key={item.id} className="bg-red-50 p-3 rounded-lg border border-red-200">
                                  <div className="font-medium text-red-900">{item.account_name}</div>
                                  <div className="text-red-700 font-semibold">
                                    {formatCurrency(item.amount)}
                                  </div>
                                  {item.ai_category && (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {item.ai_category}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Multi-Bucket Zoom Modal */}
      {showMultiBucketZoom && selectedBucket && selectedLineItems.length > 0 && (
        <MultiBucketZoom
          lineItems={selectedLineItems}
          bucketCategory={selectedBucket}
          onClose={() => {
            setShowMultiBucketZoom(false);
            setSelectedBucket(null);
            setSelectedLineItems([]);
          }}
          onBack={() => {
            setShowMultiBucketZoom(false);
          }}
        />
      )}
    </div>
  );
}
