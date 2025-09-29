import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { X, Plus, ChevronDown } from 'lucide-react';
import { BUCKET_DEFINITIONS, getBucketIcon, getBucketColor, getBucketDefinition } from '../../types/bucketTypes';
import { ChartBucketHeader } from '../BucketIcon';
import { getCSVData } from '../../lib/supabase';
import { userAuthService } from '../../services/userAuthService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MultiBucketChartProps {
  properties?: any[];
}

interface BucketData {
  bucketId: string;
  label: string;
  color: string;
  data: number[];
}

const MultiBucketChart: React.FC<MultiBucketChartProps> = ({ properties = [] }) => {
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>(['total_income', 'total_expense', 'net_operating_income']);
  const [showDropdown, setShowDropdown] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = userAuthService.getCurrentUser();
        const userId = currentUser?.id;
        const data = await getCSVData(userId);
        
        // Filter for active CSVs only
        const activeCSVs = data.filter((csv: any) => csv.isActive || csv.is_active);
        
        console.log('📊 MultiBucketChart loaded CSV data:', data?.length || 0, 'total files');
        console.log('📊 MultiBucketChart active CSVs:', activeCSVs.length, 'active files');
        console.log('📊 First CSV file structure:', activeCSVs?.[0]);
        console.log('📊 CSV data keys:', activeCSVs?.[0] ? Object.keys(activeCSVs[0]) : 'No data');
        setCsvData(activeCSVs || []);
      } catch (error) {
        console.error('Error loading CSV data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Listen for data updates to refresh chart
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('🔄 MultiBucketChart received data update event');
      const loadData = async () => {
        try {
          const currentUser = userAuthService.getCurrentUser();
          const userId = currentUser?.id;
          const data = await getCSVData(userId);
          
          // Filter for active CSVs only
          const activeCSVs = data.filter((csv: any) => csv.isActive || csv.is_active);
          
          console.log('📊 MultiBucketChart refreshed CSV data:', data?.length || 0, 'total files');
          console.log('📊 MultiBucketChart refreshed active CSVs:', activeCSVs.length, 'active files');
          setCsvData(activeCSVs || []);
        } catch (error) {
          console.error('Error refreshing CSV data:', error);
        }
      };
      loadData();
    };

    window.addEventListener('dataUpdated', handleDataUpdate);
    return () => window.removeEventListener('dataUpdated', handleDataUpdate);
  }, []);

  // Process data for selected buckets
  const chartData = useMemo(() => {
    console.log('📊 MultiBucketChart processing data for buckets:', selectedBuckets);
    console.log('📊 CSV data available:', csvData.length, 'files');
    
    // Always return chart structure, even with no data
    if (!csvData.length) {
      console.log('📊 No CSV data available for MultiBucketChart - showing empty chart');
      return { 
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], 
        datasets: selectedBuckets.map(bucketId => {
          const bucket = BUCKET_DEFINITIONS[bucketId];
          return {
            label: bucket?.label || bucketId,
            data: [0, 0, 0, 0, 0, 0],
            borderColor: getBucketColor(bucketId).includes('green') ? '#10B981' : 
                         getBucketColor(bucketId).includes('red') ? '#EF4444' : 
                         getBucketColor(bucketId).includes('blue') ? '#3B82F6' : '#6B7280',
            backgroundColor: getBucketColor(bucketId).includes('green') ? '#10B98120' : 
                            getBucketColor(bucketId).includes('red') ? '#EF444420' : 
                            getBucketColor(bucketId).includes('blue') ? '#3B82F620' : '#6B728020',
            fill: false,
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6,
          };
        })
      };
    }

    // Get all unique months from CSV data using the same logic as RevenueChart
    const months = new Set<string>();
    csvData.forEach(csv => {
      console.log('📊 Processing CSV:', csv.file_name || csv.fileName, 'with', csv.preview_data?.length || 0, 'rows');
      console.log('📊 CSV structure:', Object.keys(csv));
      console.log('📊 Has preview_data:', !!csv.preview_data);
      console.log('📊 Has previewData:', !!csv.previewData);
      
      // Check both possible field names
      const previewData = csv.preview_data || csv.previewData;
      if (previewData) {
        console.log('📊 Preview data length:', previewData.length);
        previewData.forEach((row: any, index: number) => {
          if (index < 3) { // Log first 3 rows for debugging
            console.log(`📊 Row ${index}:`, Object.keys(row));
            console.log(`📊 Row ${index} time_series:`, row.time_series);
          }
          
          if (row.time_series) {
            // Use time_series data like RevenueChart does
            Object.keys(row.time_series).forEach(month => {
              if (month.toLowerCase() !== 'total' && month.toLowerCase() !== 'sum' && month.toLowerCase() !== 'grand total') {
                months.add(month);
              }
            });
          } else if (row.Date) {
            // Fallback to Date field
            months.add(row.Date);
          }
        });
      } else {
        console.log('📊 No preview data found in CSV');
      }
    });

    const sortedMonths = Array.from(months).sort();
    console.log('📊 Available months for MultiBucketChart:', sortedMonths);

    // If no months found, use default months
    const chartLabels = sortedMonths.length > 0 ? sortedMonths : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    console.log('📊 Chart labels:', chartLabels);

    // Process each selected bucket using the same logic as RevenueChart
    const datasets = selectedBuckets.map(bucketId => {
      const bucket = BUCKET_DEFINITIONS[bucketId];
      if (!bucket) {
        console.log('📊 Bucket not found:', bucketId);
        return null;
      }

      console.log('📊 Processing bucket:', bucketId, bucket.label);
      const data: number[] = [];
      
      chartLabels.forEach(month => {
        let total = 0;
        let matchesFound = 0;
        
        csvData.forEach(csv => {
          // Check both possible field names
          const previewData = csv.preview_data || csv.previewData;
          if (previewData) {
            // For key metrics like Total Income, use the same logic as RevenueChart
            if (bucketId === 'total_income' || bucketId === 'total_expense' || bucketId === 'net_operating_income') {
              const keyMetrics = [
                { name: 'Total Income', bucket: 'total_income' },
                { name: 'Total Expense', bucket: 'total_expense' },
                { name: 'Net Operating Income', bucket: 'net_operating_income' }
              ];
              
              keyMetrics.forEach(metric => {
                if (metric.bucket === bucketId) {
                  const accountData = previewData.find((item: any) => {
                    const accountName = item.account_name?.trim().toLowerCase() || '';
                    return accountName.includes(metric.name.toLowerCase());
                  });
                  
                  if (accountData && accountData.time_series && accountData.time_series[month]) {
                    const amount = parseFloat(accountData.time_series[month]) || 0;
                    total += amount;
                    matchesFound++;
                    console.log(`📊 Key metric match for ${bucketId}: ${accountData.account_name} = $${amount} in ${month}`);
                  }
                }
              });
            } else {
              // For other buckets, use the general matching logic
              previewData.forEach((row: any) => {
                // Use time_series data like RevenueChart does
                if (row.time_series && row.time_series[month]) {
                  const accountName = row.account_name || row.accountName || '';
                  const amount = parseFloat(row.time_series[month]) || 0;
                  
                  if (matchesBucket(accountName, bucketId)) {
                    total += amount;
                    matchesFound++;
                    console.log(`📊 Match found for ${bucketId}: ${accountName} = $${amount} in ${month}`);
                  }
                } else if (row.Date === month) {
                  // Fallback to Date field
                  const accountName = row.accountName || row.Account || '';
                  const amount = parseFloat(row.amount || row.Amount || 0);
                  
                  if (matchesBucket(accountName, bucketId)) {
                    total += amount;
                    matchesFound++;
                    console.log(`📊 Match found for ${bucketId}: ${accountName} = $${amount} in ${month}`);
                  }
                }
              });
            }
          }
        });
        
        console.log(`📊 ${bucketId} total for ${month}: $${total} (${matchesFound} matches)`);
        data.push(total);
      });

      // Get distinct colors based on bucket category
      const getBucketLineColor = (bucketId: string): string => {
        const bucket = getBucketDefinition(bucketId);
        if (!bucket) return '#6B7280';
        
        switch (bucket.category) {
          case 'income':
            return '#10B981'; // Green for income
          case 'expense':
            return '#EF4444'; // Red for expense
          case 'cash':
            return '#8B5CF6'; // Purple for cash
          case 'metric':
            return '#3B82F6'; // Blue for metrics
          default:
            return '#6B7280'; // Gray for unknown
        }
      };

      const lineColor = getBucketLineColor(bucketId);

      const dataset = {
        label: bucket.label,
        data,
        borderColor: lineColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: lineColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
      
      console.log(`📊 Dataset created for ${bucketId}:`, dataset);
      return dataset;
    }).filter((dataset): dataset is NonNullable<typeof dataset> => dataset !== null);

    const result = {
      labels: chartLabels,
      datasets
    };
    
    console.log('📊 Final chart data:', result);
    return result;
  }, [csvData, selectedBuckets]);

  // Enhanced bucket matching logic using the same approach as RevenueChart
  const matchesBucket = (accountName: string, bucketId: string): boolean => {
    const name = accountName.toLowerCase();
    
    switch (bucketId) {
      case 'total_income':
        // Use exact match like RevenueChart does for key metrics
        return name.includes('total income');
      case 'total_expense':
        return name.includes('total expense');
      case 'net_operating_income':
        return name.includes('net operating income');
      case 'maintenance_cost':
        return name.includes('maintenance') || name.includes('repair') || name.includes('service');
      case 'utilities_cost':
        return name.includes('utilities') || name.includes('electric') || name.includes('water') || name.includes('gas') || name.includes('sewer') || name.includes('trash');
      case 'insurance_cost':
        return name.includes('insurance') || name.includes('premium');
      case 'property_tax':
        return name.includes('tax') || name.includes('property tax');
      case 'rental_income':
        return name.includes('rental income') || name.includes('rent') || name.includes('lease');
      case 'other_income':
        return name.includes('other income') || name.includes('miscellaneous') || name.includes('other');
      case 'expense_item':
        return name.includes('expense') || name.includes('cost') || name.includes('payment') || name.includes('fee');
      case 'income_item':
        return name.includes('income') || name.includes('revenue') || name.includes('rent') || name.includes('deposit');
      default:
        return false;
    }
  };

  // Available buckets for selection
  const availableBuckets = Object.entries(BUCKET_DEFINITIONS)
    .filter(([bucketId]) => !selectedBuckets.includes(bucketId))
    .map(([bucketId, bucket]) => ({
      id: bucketId,
      label: bucket.label,
      icon: getBucketIcon(bucketId),
      color: getBucketColor(bucketId)
    }));

  const addBucket = (bucketId: string) => {
    setSelectedBuckets(prev => [...prev, bucketId]);
    setShowDropdown(false);
  };

  const removeBucket = (bucketId: string) => {
    setSelectedBuckets(prev => prev.filter(id => id !== bucketId));
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: $${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Month'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Amount ($)'
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  if (isLoading) {
    return (
      <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <ChartBucketHeader
        chartId="multibucket-chart"
        chartName="Multiple Line Item Visualization"
        className="mb-4"
      />
      <div className="flex items-center justify-between mb-6">
        {/* Add Bucket Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bucket</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
              <div className="p-2">
                {availableBuckets.length > 0 ? (
                  availableBuckets.map(bucket => (
                    <button
                      key={bucket.id}
                      onClick={() => addBucket(bucket.id)}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                    >
                      <span className="text-lg">{bucket.icon}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {bucket.label}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    All buckets selected
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Buckets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {selectedBuckets.map(bucketId => {
          const bucket = BUCKET_DEFINITIONS[bucketId];
          if (!bucket) return null;
          
          return (
            <div
              key={bucketId}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <span className="text-lg">{getBucketIcon(bucketId)}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {bucket.label}
              </span>
              <button
                onClick={() => removeBucket(bucketId)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-96">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default MultiBucketChart;
