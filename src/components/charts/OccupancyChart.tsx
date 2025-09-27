import React, { useState, useEffect, useCallback } from 'react';
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
// import ApiService from '../../services/api';

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

interface PropertyData {
  id: string;
  date: string;
  month?: string;
  revenue: string;
  occupancy_rate: string;
  property_name: string;
  total_units?: number;
  occupied_units?: number;
}

interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  total_units?: number;
}

interface OccupancyChartProps {
  properties: Property[];
}

const OccupancyChart: React.FC<OccupancyChartProps> = ({ properties }) => {
  const [chartData, setChartData] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  const processCSVDataForOccupancyChart = (activeCSVs: any[]): PropertyData[] => {
    const chartData: PropertyData[] = [];
    
    activeCSVs.forEach((csv: any) => {
      console.log(`📊 Processing CSV: ${csv.fileName} for occupancy chart data`);
      
      // For occupancy, we'll use a default occupancy rate since CSVs don't typically contain occupancy data
      // This is a placeholder - in a real system, occupancy would come from rent roll CSVs
      const defaultOccupancyRate = 95; // Default occupancy rate
      
      // Create monthly data points with default occupancy
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((month, index) => {
        chartData.push({
          id: `${csv.id}-${month}`,
          date: `2024-${String(index + 1).padStart(2, '0')}-01`,
          month: `${month} 2024`,
          revenue: '0',
          occupancy_rate: defaultOccupancyRate.toString(),
          property_name: 'Chico',
          total_units: 26,
          occupied_units: Math.round(26 * (defaultOccupancyRate / 100))
        });
      });
    });
    
    console.log('📈 Processed occupancy chart data:', chartData);
    return chartData;
  };

  const loadChartData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading occupancy chart data from ACTIVE CSVs only:', properties);
      
      if (properties.length > 0) {
        const chicoProperty = properties[0]; // Should be Chico
        console.log('Chico property:', chicoProperty);
        
        // Get data from ACTIVE CSVs only
        let chartData = null;
        
        try {
          // Load data from active CSVs in localStorage
          const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
          const activeCSVs = savedCSVs.filter((csv: any) => csv.isActive);
          
          console.log('📊 Active CSVs for occupancy chart data:', activeCSVs.length);
          
          if (activeCSVs.length > 0) {
            // Process CSV data to create chart data
            const csvChartData = processCSVDataForOccupancyChart(activeCSVs);
            console.log('📈 CSV occupancy chart data processed:', csvChartData);
            
            if (csvChartData && csvChartData.length > 0) {
              chartData = csvChartData;
            }
          }
          
          // If no CSV data, set empty chart
          if (!chartData || chartData.length === 0) {
            console.log('📊 No active CSV data found, setting empty occupancy chart');
            setChartData([]);
            setIsLoading(false);
            return;
          }
          
          // Set the chart data from CSVs
          setChartData(chartData);
          setIsLoading(false);
          
        } catch (error) {
          console.error('Error processing CSV occupancy chart data:', error);
          setChartData([]);
          setIsLoading(false);
        }
      } else {
        console.log('📊 No properties available for occupancy chart data');
        setChartData([]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading occupancy chart data:', error);
      setChartData([]);
      setIsLoading(false);
    }
  }, [properties]);

  useEffect(() => {
    if (properties.length > 0) {
      loadChartData();
    }
  }, [properties, loadChartData]);

  // Listen for data updates to refresh chart
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('🔄 OccupancyChart received data update event');
      loadChartData();
    };

    window.addEventListener('dataUpdated', handleDataUpdate);
    return () => window.removeEventListener('dataUpdated', handleDataUpdate);
  }, [loadChartData]);

  // Filter data based on selected property
  const filteredData = selectedProperty === 'all' 
    ? chartData 
    : chartData.filter(item => item.property_name === selectedProperty);

  // Prepare chart data
  const data = {
    labels: filteredData.map(item => item.month || item.date),
    datasets: [
      {
        label: 'Occupancy Rate',
        data: filteredData.map(item => parseFloat(item.occupancy_rate)),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(16, 185, 129, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `Occupancy: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return value.toFixed(1) + '%';
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Occupancy Rate</h3>
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.name}>
              {property.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Chart */}
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default OccupancyChart;
