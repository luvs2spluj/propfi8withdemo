/**
 * Impact Trend Chart Component
 * 
 * Displays monthly trends for top impact items over time
 */

import React from 'react';
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
import { LineItem, MonthlyTrend } from '../../types/impactAnalysis';
import { ChartBucketHeader } from '../BucketIcon';

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

interface ImpactTrendChartProps {
  items: LineItem[];
  title: string;
  color: string;
  maxItems?: number;
}

const ImpactTrendChart: React.FC<ImpactTrendChartProps> = ({
  items,
  title,
  color,
  maxItems = 5
}) => {
  // Get top items by total amount
  const topItems = items
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, maxItems);

  if (topItems.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-gray-500">No data available for {title}</div>
        </div>
      </div>
    );
  }

  // Get all unique months
  const allMonths = new Set<string>();
  topItems.forEach(item => {
    Object.keys(item.monthlyBreakdown).forEach(month => {
      allMonths.add(month);
    });
  });

  const sortedMonths = Array.from(allMonths).sort();

  // Prepare chart data
  const datasets = topItems.map((item, index) => {
    const monthlyData = sortedMonths.map(month => 
      item.monthlyBreakdown[month] || 0
    );

    // Generate color variations
    const hue = color === 'green' ? 120 : 0; // Green or Red base
    const saturation = 70;
    const lightness = 50 - (index * 8); // Vary lightness

    return {
      label: item.accountName,
      data: monthlyData,
      borderColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.1)`,
      fill: false,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  });

  const chartData = {
    labels: sortedMonths,
    datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        }
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
        },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Amount ($)'
        },
        beginAtZero: true,
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

  return (
    <div className="card">
      <ChartBucketHeader
        chartId="impact-trend-chart"
        chartName={title}
        className="mb-4"
      />
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            ${topItems.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Impact</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {topItems.length}
          </div>
          <div className="text-sm text-gray-500">Top Items</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {sortedMonths.length}
          </div>
          <div className="text-sm text-gray-500">Months Tracked</div>
        </div>
      </div>
    </div>
  );
};

export default ImpactTrendChart;
