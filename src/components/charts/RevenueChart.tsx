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
import { getCSVData } from '../../lib/supabase';

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
}

interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  total_units?: number;
}

interface RevenueChartProps {
  properties: Property[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ properties }) => {
  const [chartData, setChartData] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [metricType] = useState<'revenue' | 'occupancy'>('revenue');

  const processCSVDataForChart = (activeCSVs: any[]): PropertyData[] => {
    const chartData: PropertyData[] = [];
    
    activeCSVs.forEach((csv: any) => {
      const fileName = csv.file_name || csv.fileName;
      const accountCategories = csv.account_categories || csv.accountCategories;
      const previewData = csv.preview_data || csv.previewData;
      
      console.log(`📊 Processing CSV: ${fileName} for chart data`);
      
      // Process each account in the CSV
      Object.entries(accountCategories).forEach(([accountName, category]) => {
        const accountData = previewData.find((item: any) => 
          item.account_name === accountName
        );
        
        if (accountData && accountData.time_series && category === 'income') {
          // Process time series data for income accounts
          Object.entries(accountData.time_series).forEach(([month, value]) => {
            if (typeof value === 'number' && value > 0) {
              // Find existing data point for this month or create new one
              let existingData = chartData.find(d => d.date === month);
              if (!existingData) {
                existingData = {
                  id: `${csv.id}-${month}`,
                  date: month,
                  month: month,
                  revenue: '0',
                  occupancy_rate: '0',
                  property_name: 'Chico'
                };
                chartData.push(existingData);
              }
              
              // Add this account's revenue to the total for this month
              const currentRevenue = parseFloat(existingData.revenue) || 0;
              existingData.revenue = (currentRevenue + value).toString();
            }
          });
        }
      });
    });
    
    // Sort by date
    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log('📈 Processed chart data:', chartData);
    return chartData;
  };

  useEffect(() => {
    if (properties.length > 0) {
      loadChartData();
    }
  }, [properties]);

  const loadChartData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading chart data from ACTIVE CSVs only:', properties);
      
      if (properties.length > 0) {
        const chicoProperty = properties[0]; // Should be Chico
        console.log('Chico property:', chicoProperty);
        
        // Get data from ACTIVE CSVs only
        let chartData = null;
        
        try {
          // Try to get data from Supabase first
          const supabaseCSVs = await getCSVData();
          let activeCSVs = supabaseCSVs;
          
          // If no Supabase data, fall back to localStorage
          if (supabaseCSVs.length === 0) {
            const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
            activeCSVs = savedCSVs.filter((csv: any) => csv.isActive);
            console.log('📊 No Supabase data, using localStorage for chart:', activeCSVs.length, 'active CSVs');
          } else {
            console.log('📊 Using Supabase data for chart:', activeCSVs.length, 'active CSVs');
          }
          
          console.log('📊 Active CSVs for chart data:', activeCSVs.length);
          
          if (activeCSVs.length > 0) {
            // Process CSV data to create chart data
            const csvChartData = processCSVDataForChart(activeCSVs);
            console.log('📈 CSV chart data processed:', csvChartData);
            
            if (csvChartData && csvChartData.length > 0) {
              chartData = csvChartData;
            }
          }
          
          // If no CSV data, set empty chart
          if (!chartData || chartData.length === 0) {
            console.log('📊 No active CSV data found, setting empty chart');
            setChartData([]);
            setIsLoading(false);
            return;
          }
          
          // Set the chart data from CSVs
          setChartData(chartData);
          setIsLoading(false);
          
        } catch (error) {
          console.error('Error processing CSV chart data:', error);
          setChartData([]);
          setIsLoading(false);
        }
      } else {
        console.log('📊 No properties available for chart data');
        setChartData([]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartData([]);
      setIsLoading(false);
    }
  };

  // Listen for data updates to refresh chart
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('🔄 RevenueChart received data update event');
      loadChartData();
    };

    window.addEventListener('dataUpdated', handleDataUpdate);
    return () => window.removeEventListener('dataUpdated', handleDataUpdate);
  }, [properties]);

  // Filter data based on selected property
  const filteredData = selectedProperty === 'all' 
    ? chartData 
    : chartData.filter(item => item.property_name === selectedProperty);

  // Prepare chart data
  const data = {
    labels: filteredData.map(item => item.month || item.date),
    datasets: [
      {
        label: metricType === 'revenue' ? 'Revenue' : 'Occupancy Rate',
        data: filteredData.map(item => 
          metricType === 'revenue' 
            ? parseFloat(item.revenue) 
            : parseFloat(item.occupancy_rate)
        ),
        borderColor: metricType === 'revenue' ? '#0EA5E9' : '#10B981',
        backgroundColor: metricType === 'revenue' 
          ? 'rgba(14, 165, 233, 0.1)' 
          : 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: metricType === 'revenue' ? '#0EA5E9' : '#10B981',
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
        borderColor: metricType === 'revenue' 
          ? 'rgba(14, 165, 233, 0.5)' 
          : 'rgba(16, 185, 129, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            if (metricType === 'revenue') {
              return `Revenue: $${context.parsed.y.toLocaleString()}`;
            } else {
              return `Occupancy: ${context.parsed.y.toFixed(1)}%`;
            }
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
            if (metricType === 'revenue') {
              return '$' + (value / 1000) + 'k';
            } else {
              return value.toFixed(1) + '%';
            }
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {metricType === 'revenue' ? 'Revenue Trend' : 'Occupancy Rate'}
        </h3>
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

export default RevenueChart;
