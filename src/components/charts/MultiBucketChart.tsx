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
import { BUCKET_DEFINITIONS, getBucketIcon, getBucketColor } from '../../types/bucketTypes';
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
        setCsvData(data || []);
      } catch (error) {
        console.error('Error loading CSV data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Process data for selected buckets
  const chartData = useMemo(() => {
    if (!csvData.length) return { labels: [], datasets: [] };

    // Get all unique months from CSV data
    const months = new Set<string>();
    csvData.forEach(csv => {
      if (csv.preview_data) {
        csv.preview_data.forEach((row: any) => {
          if (row.Date) {
            months.add(row.Date);
          }
        });
      }
    });

    const sortedMonths = Array.from(months).sort();

    // Process each selected bucket
    const datasets = selectedBuckets.map(bucketId => {
      const bucket = BUCKET_DEFINITIONS[bucketId];
      if (!bucket) return null;

      const data: number[] = [];
      
      sortedMonths.forEach(month => {
        let total = 0;
        
        csvData.forEach(csv => {
          if (csv.preview_data) {
            csv.preview_data.forEach((row: any) => {
              if (row.Date === month) {
                // Check if this row matches the bucket
                const accountName = row.accountName || row.Account || '';
                const amount = parseFloat(row.amount || row.Amount || 0);
                
                if (matchesBucket(accountName, bucketId)) {
                  total += amount;
                }
              }
            });
          }
        });
        
        data.push(total);
      });

      return {
        label: bucket.label,
        data,
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
    }).filter((dataset): dataset is NonNullable<typeof dataset> => dataset !== null);

    return {
      labels: sortedMonths,
      datasets
    };
  }, [csvData, selectedBuckets]);

  // Simple bucket matching logic
  const matchesBucket = (accountName: string, bucketId: string): boolean => {
    const name = accountName.toLowerCase();
    
    switch (bucketId) {
      case 'total_income':
        return name.includes('income') || name.includes('revenue') || name.includes('rent');
      case 'total_expense':
        return name.includes('expense') || name.includes('cost') || name.includes('maintenance') || 
               name.includes('utilities') || name.includes('insurance') || name.includes('tax');
      case 'net_operating_income':
        return name.includes('net') || name.includes('operating');
      case 'maintenance_cost':
        return name.includes('maintenance') || name.includes('repair');
      case 'utilities_cost':
        return name.includes('utilities') || name.includes('electric') || name.includes('water') || name.includes('gas');
      case 'insurance_cost':
        return name.includes('insurance');
      case 'property_tax':
        return name.includes('tax') || name.includes('property');
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
    <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Multi-Bucket Analysis
          </h3>
          
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
          {chartData.datasets.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p>No data available for selected buckets</p>
                <p className="text-sm mt-1">Upload CSV data to see your financial trends</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiBucketChart;
