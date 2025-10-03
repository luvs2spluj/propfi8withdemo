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
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedChartData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log('📈 Revenue Chart: Starting data load...');
        
        await propertyChartDataService.initialize();
        const data = await propertyChartDataService.loadConsolidatedChartData();
        console.log('📈 Revenue Chart: Property data loaded:', data);
        
        setConsolidatedData(data);
        
        if (data.selectedProperty) {
          const formattedData = propertyChartDataService.formatForRevenueChart(data.selectedProperty);
          setChartData(formattedData);
        }
      } catch (error) {
        console.error('Error loading property chart data:', error);
        setConsolidatedData({
          properties: [],
          selectedProperty: null,
          allMonths: [],
          globalTotals: { income: 0, expense: 0, noi: 0 }
        });
        setChartData(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Subscribe to data changes
    const unsubscribe = propertyChartDataService.subscribe((data) => {
      setConsolidatedData(data);
      if (data.selectedProperty) {
        const formattedData = propertyChartDataService.formatForRevenueChart(data.selectedProperty);
        setChartData(formattedData);
      }
    });
    
    return unsubscribe;
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