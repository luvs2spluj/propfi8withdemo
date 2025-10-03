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
import { X, Plus, ChevronDown, Building2 } from 'lucide-react';
import { BUCKET_DEFINITIONS, getBucketIcon, getBucketColor } from '../../types/bucketTypes';
import { propertyChartDataService, ConsolidatedChartData, PropertyChartData } from '../../services/propertyChartDataService';

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

const MultiBucketChart: React.FC<MultiBucketChartProps> = ({ properties = [] }) => {
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>(['total_income', 'total_expense', 'net_operating_income']);
  const [showDropdown, setShowDropdown] = useState(false);
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced bucket matching logic based on account categories and names
  const matchesBucket = (accountName: string, bucketId: string): boolean => {
    const name = accountName.toLowerCase();
    
    switch (bucketId) {
      case 'total_income':
        return name.includes('income') || name.includes('revenue') || name.includes('rent') || 
               name.includes('rental') || name.includes('lease') || name.includes('gross') ||
               name.includes('total operating income') || name.includes('monthly revenue');
      case 'total_expense':
        return name.includes('expense') || name.includes('cost') || name.includes('maintenance') || 
               name.includes('utilities') || name.includes('insurance') || name.includes('tax') ||
               name.includes('operating expense') || name.includes('total operating expense');
      case 'net_operating_income':
        return name.includes('net') || name.includes('operating') || name.includes('noi') ||
               name.includes('net operating income');
      case 'maintenance_cost':
        return name.includes('maintenance') || name.includes('repair') || name.includes('repairs');
      case 'utilities_cost':
        return name.includes('utilities') || name.includes('electric') || name.includes('water') || 
               name.includes('gas') || name.includes('power') || name.includes('sewer');
      case 'insurance_cost':
        return name.includes('insurance') || name.includes('liability') || name.includes('property insurance');
      case 'property_tax':
        return name.includes('tax') || name.includes('property') || name.includes('property tax');
      default:
        return false;
    }
  };

  // Load property-based chart data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log('📊 Multi-Bucket Chart: Starting data load...');
        
        await propertyChartDataService.initialize();
        const data = await propertyChartDataService.loadConsolidatedChartData();
        console.log('📊 Multi-Bucket Chart: Property data loaded:', data);
        
        setConsolidatedData(data);
      } catch (error) {
        console.error('Error loading property chart data:', error);
        // Set empty data to prevent crashes
        setConsolidatedData({
          properties: [],
          selectedProperty: null,
          allMonths: [],
          globalTotals: { income: 0, expense: 0, noi: 0 }
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Subscribe to data changes
    const unsubscribe = propertyChartDataService.subscribe((data) => {
      setConsolidatedData(data);
    });
    
    return unsubscribe;
  }, []);

  // Process data for selected buckets using property-based data
  const chartData = useMemo(() => {
    console.log('📊 Multi-Bucket Chart: Processing chart data with', consolidatedData?.properties.length || 0, 'properties');
    
    if (!consolidatedData?.selectedProperty) {
      console.log('📊 Multi-Bucket Chart: No selected property available');
      return { labels: [], datasets: [] };
    }

    const propertyData = consolidatedData.selectedProperty;
    console.log('📊 Multi-Bucket Chart: Using property:', propertyData.propertyName);

    // Use the property chart data service to format data
    const formattedData = propertyChartDataService.formatForMultiBucketChart(propertyData);
    
    console.log('📊 Multi-Bucket Chart: Formatted data:', formattedData);

    return formattedData;
  }, [consolidatedData, selectedBuckets]);

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
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Multi-Bucket Analysis
            </h3>
            {consolidatedData?.selectedProperty && (
              <div className="flex items-center space-x-2 mt-1">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {consolidatedData.selectedProperty.propertyName}
                </span>
                <span className="text-xs text-gray-500">
                  ({consolidatedData.selectedProperty.activeRecords} CSV files)
                </span>
              </div>
            )}
          </div>
          
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
