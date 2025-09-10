import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ApiService from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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

interface OccupancyChartProps {
  properties: Property[];
}

const OccupancyChart: React.FC<OccupancyChartProps> = ({ properties }) => {
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
      if (properties.length > 0) {
        const chicoProperty = properties[0]; // Should be Chico
        const dataResponse = await ApiService.getPropertyData(chicoProperty.id);
        if (dataResponse.success && dataResponse.data) {
          setChartData(dataResponse.data);
        }
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
  const occupancyData = sortedData.map(item => parseFloat(item.occupancy_rate));

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Chico Occupancy Rate',
        data: occupancyData,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
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
        borderColor: 'rgba(34, 197, 94, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `Occupancy: ${context.parsed.y}%`;
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
            size: 11,
          },
          maxRotation: 45,
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
            return value + '%';
          },
        },
        min: 85,
        max: 100,
      },
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

  return (
    <div className="h-64">
      <Bar data={data} options={options} />
    </div>
  );
};

export default OccupancyChart;
