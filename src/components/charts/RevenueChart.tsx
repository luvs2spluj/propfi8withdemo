import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Building2 } from 'lucide-react';
import { propertyChartDataService, ConsolidatedChartData } from '../../services/propertyChartDataService';
import { budgetDataBridgeService, BudgetChartData } from '../../services/budgetDataBridgeService';

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

interface RevenueChartProps {
  className?: string;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ className = '' }) => {
  const [chartData, setChartData] = useState<BudgetChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedChartData | null>(null);
  const [dataSource, setDataSource] = useState<string>('none');

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log('📈 Revenue Chart: Starting data load...');
        
        // First try to load from budget importer localStorage
        const budgetData = budgetDataBridgeService.getRevenueChartData();
        if (budgetData && budgetData.datasets.length > 0) {
          console.log('📈 Revenue Chart: Using budget importer data:', budgetData);
          setChartData(budgetData);
          setDataSource('budget-importer');
          setIsLoading(false);
          return;
        }
        
        // Fallback to property chart data service
        await propertyChartDataService.initialize();
        const data = await propertyChartDataService.loadConsolidatedChartData();
        console.log('📈 Revenue Chart: Property data loaded:', data);
        
        setConsolidatedData(data);
        
        if (data.selectedProperty) {
          const formattedData = propertyChartDataService.formatForRevenueChart(data.selectedProperty);
          setChartData(formattedData);
          setDataSource('property-system');
        } else {
          console.log('📈 Revenue Chart: No data available from any source');
          setChartData(null);
          setDataSource('none');
        }
      } catch (error) {
        console.error('Error loading revenue chart data:', error);
        setConsolidatedData({
          properties: [],
          selectedProperty: null,
          allMonths: [],
          globalTotals: { income: 0, expense: 0, noi: 0 }
        });
        setChartData(null);
        setDataSource('none');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Subscribe to budget data changes
    const unsubscribeBudget = budgetDataBridgeService.subscribe((data) => {
      if (data) {
        const budgetChartData = budgetDataBridgeService.getRevenueChartData();
        if (budgetChartData && budgetChartData.datasets.length > 0) {
          setChartData(budgetChartData);
          setDataSource('budget-importer');
        }
      }
    });
    
    // Subscribe to property data changes
    const unsubscribeProperty = propertyChartDataService.subscribe((data) => {
      if (data.selectedProperty) {
        const formattedData = propertyChartDataService.formatForRevenueChart(data.selectedProperty);
        setChartData(formattedData);
        setDataSource('property-system');
      }
    });
    
    return () => {
      unsubscribeBudget();
      unsubscribeProperty();
    };
  }, []);

  // Prepare chart data
  const data = chartData || { labels: [], datasets: [] };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Revenue Analysis',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  if (isLoading) {
    return (
      <div className={`card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading revenue data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Revenue Analysis
            </h3>
            {dataSource === 'budget-importer' && (
              <div className="flex items-center space-x-2 mt-1">
                <Building2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">
                  📊 Budget Importer Data
                </span>
              </div>
            )}
            {dataSource === 'property-system' && consolidatedData?.selectedProperty && (
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
            {dataSource === 'none' && (
              <div className="flex items-center space-x-2 mt-1">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  No data available
                </span>
              </div>
            )}
          </div>
          
          {/* Property Selector */}
          <div className="flex items-center justify-end mb-4">
            <select
              value={consolidatedData?.selectedProperty?.propertyId || 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  propertyChartDataService.setSelectedProperty(null);
                } else {
                  propertyChartDataService.setSelectedProperty(e.target.value);
                }
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Properties</option>
              {consolidatedData?.properties?.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Chart */}
        <div className="h-64">
          <Line data={data} options={options} />
        </div>
        
        {/* No Data Message */}
        {!consolidatedData?.selectedProperty && (
          <div className="mt-4 text-center text-gray-500">
            <p>No property selected or no data available.</p>
            <p className="text-sm">Add properties and upload CSV files to see revenue data.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueChart;