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
  Legend
);

interface PropertyData {
  id: string;
  date: string;
  revenue: string;
  occupancy_rate: string;
  maintenance_cost: string;
  utilities_cost: string;
  insurance_cost: string;
  property_tax: string;
  other_expenses: string;
  property_name: string;
}

const PropertyPerformanceChart: React.FC = () => {
  const [chartData, setChartData] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setIsLoading(true);
      // Get the Chico property ID first
      const propertiesResponse = await ApiService.getProperties();
      if (propertiesResponse.success && propertiesResponse.data && propertiesResponse.data.length > 0) {
        const chicoProperty = propertiesResponse.data[0]; // Should be Chico
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
  
  const revenueData = sortedData.map(item => parseFloat(item.revenue));
  const expensesData = sortedData.map(item => {
    const maintenance = parseFloat(item.maintenance_cost || '0');
    const utilities = parseFloat(item.utilities_cost || '0');
    const insurance = parseFloat(item.insurance_cost || '0');
    const propertyTax = parseFloat(item.property_tax || '0');
    const other = parseFloat(item.other_expenses || '0');
    return maintenance + utilities + insurance + propertyTax + other;
  });
  const netIncomeData = sortedData.map((item, index) => revenueData[index] - expensesData[index]);

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueData,
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Expenses',
        data: expensesData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Net Income',
        data: netIncomeData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 5,
        yAxisID: 'y',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(14, 165, 233, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
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
  };

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80">
      <Line data={data} options={options} />
    </div>
  );
};

export default PropertyPerformanceChart;
