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
import ApiService from '../../services/api';

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

  useEffect(() => {
    if (properties.length > 0) {
      loadChartData();
    }
  }, [properties]);

  const loadChartData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading chart data for properties:', properties);
      
      if (properties.length > 0) {
        const chicoProperty = properties[0]; // Should be Chico
        console.log('Chico property:', chicoProperty);
        
        const dataResponse = await ApiService.getPropertyData(chicoProperty.id);
        console.log('Property data response:', dataResponse);
        
        if (dataResponse.success && dataResponse.data) {
          console.log('Setting chart data:', dataResponse.data);
          setChartData(dataResponse.data);
        } else {
          console.error('No data received:', dataResponse);
        }
      } else {
        console.error('No properties available');
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sort data by date and prepare chart data
  const sortedData = chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = sortedData.map(item => {
    const date = new Date(item.date);
    return date.toLocaleDateString('en-US', { month: 'short' });
  });
  const revenueData = sortedData.map(item => parseFloat(item.revenue));

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Chico Revenue',
        data: revenueData,
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(14, 165, 233)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
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
        borderColor: 'rgba(14, 165, 233, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `Revenue: $${context.parsed.y.toLocaleString()}`;
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
            return '$' + (value / 1000) + 'k';
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
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No chart data available</p>
          <p className="text-gray-400 text-xs mt-1">Check console for errors</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  );
};

export default RevenueChart;
