import React from 'react';
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
import DataManager from '../../utils/dataManager';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const OccupancyChart: React.FC = () => {
  const occupancyData = DataManager.getInstance().getOccupancyData();
  
  const data = {
    labels: occupancyData.map(item => item.property),
    datasets: [
      {
        label: 'Occupancy Rate',
        data: occupancyData.map(item => item.rate),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(34, 197, 94)',
          'rgb(34, 197, 94)',
          'rgb(34, 197, 94)',
          'rgb(34, 197, 94)',
          'rgb(34, 197, 94)',
        ],
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

  return (
    <div className="h-64">
      <Bar data={data} options={options} />
    </div>
  );
};

export default OccupancyChart;
