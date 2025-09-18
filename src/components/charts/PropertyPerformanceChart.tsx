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
  month?: string;
  revenue: string;
  occupancy_rate: string;
  maintenance_cost: string;
  utilities_cost: string;
  insurance_cost: string;
  property_tax: string;
  other_expenses: string;
  expenses?: string;
  netIncome?: string;
  property_name: string;
}

interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  total_units?: number;
}

interface PropertyPerformanceChartProps {
  properties: Property[];
}

const PropertyPerformanceChart: React.FC<PropertyPerformanceChartProps> = ({ properties }) => {
  const [chartData, setChartData] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const processCSVDataForPerformanceChart = (activeCSVs: any[]): PropertyData[] => {
    const chartData: PropertyData[] = [];
    
    activeCSVs.forEach((csv: any) => {
      console.log(`📊 Processing CSV: ${csv.fileName} for performance chart data`);
      
      // Process each account in the CSV
      Object.entries(csv.accountCategories).forEach(([accountName, category]) => {
        const accountData = csv.previewData.find((item: any) => 
          item.account_name === accountName
        );
        
        if (accountData && accountData.time_series) {
          // Process time series data for all accounts
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
                  occupancy_rate: '95',
                  maintenance_cost: '0',
                  utilities_cost: '0',
                  insurance_cost: '0',
                  property_tax: '0',
                  other_expenses: '0',
                  expenses: '0',
                  netIncome: '0',
                  property_name: 'Chico'
                };
                chartData.push(existingData);
              }
              
              // Add this account's value to the appropriate category
              if (category === 'income') {
                const currentRevenue = parseFloat(existingData.revenue) || 0;
                existingData.revenue = (currentRevenue + value).toString();
              } else if (category === 'expense') {
                const currentExpenses = parseFloat(existingData.expenses) || 0;
                existingData.expenses = (currentExpenses + value).toString();
                
                // Categorize expenses into specific types
                const accountLower = accountName.toLowerCase();
                if (/maintenance|repair/.test(accountLower)) {
                  const currentMaintenance = parseFloat(existingData.maintenance_cost) || 0;
                  existingData.maintenance_cost = (currentMaintenance + value).toString();
                } else if (/utility|water|garbage|electric/.test(accountLower)) {
                  const currentUtilities = parseFloat(existingData.utilities_cost) || 0;
                  existingData.utilities_cost = (currentUtilities + value).toString();
                } else if (/insurance/.test(accountLower)) {
                  const currentInsurance = parseFloat(existingData.insurance_cost) || 0;
                  existingData.insurance_cost = (currentInsurance + value).toString();
                } else if (/tax/.test(accountLower)) {
                  const currentTax = parseFloat(existingData.property_tax) || 0;
                  existingData.property_tax = (currentTax + value).toString();
                } else {
                  const currentOther = parseFloat(existingData.other_expenses) || 0;
                  existingData.other_expenses = (currentOther + value).toString();
                }
              }
            }
          });
        }
      });
    });
    
    // Calculate net income for each month
    chartData.forEach(data => {
      const revenue = parseFloat(data.revenue) || 0;
      const expenses = parseFloat(data.expenses) || 0;
      data.netIncome = (revenue - expenses).toString();
    });
    
    // Sort by date
    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log('📈 Processed performance chart data:', chartData);
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
      console.log('Loading performance chart data from ACTIVE CSVs only:', properties);
      
      if (properties.length > 0) {
        // Get data from ACTIVE CSVs only
        let chartData = null;
        
        try {
          // Load data from active CSVs in localStorage
          const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
          const activeCSVs = savedCSVs.filter((csv: any) => csv.isActive);
          
          console.log('📊 Active CSVs for performance chart data:', activeCSVs.length);
          
          if (activeCSVs.length > 0) {
            // Process CSV data to create chart data
            const csvChartData = processCSVDataForPerformanceChart(activeCSVs);
            console.log('📈 CSV performance chart data processed:', csvChartData);
            
            if (csvChartData && csvChartData.length > 0) {
              chartData = csvChartData;
            }
          }
          
          // If no CSV data, set empty chart
          if (!chartData || chartData.length === 0) {
            console.log('📊 No active CSV data found, setting empty performance chart');
            setChartData([]);
            setIsLoading(false);
            return;
          }
          
          // Set the chart data from CSVs
          setChartData(chartData);
          setIsLoading(false);
          
        } catch (error) {
          console.error('Error processing CSV performance chart data:', error);
          setChartData([]);
          setIsLoading(false);
        }
      } else {
        console.log('📊 No properties available for performance chart data');
        setChartData([]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading performance chart data:', error);
      setChartData([]);
      setIsLoading(false);
    }
  };

  // Listen for data updates to refresh chart
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('🔄 PropertyPerformanceChart received data update event');
      loadChartData();
    };

    window.addEventListener('dataUpdated', handleDataUpdate);
    return () => window.removeEventListener('dataUpdated', handleDataUpdate);
  }, [properties]);

  // Prepare chart data
  const data = {
    labels: chartData.map(item => item.month || item.date),
    datasets: [
      {
        label: 'Revenue',
        data: chartData.map(item => parseFloat(item.revenue)),
        borderColor: '#0EA5E9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#0EA5E9',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Expenses',
        data: chartData.map(item => parseFloat(item.expenses || '0')),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Net Income',
        data: chartData.map(item => parseFloat(item.netIncome || '0')),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: false,
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
        display: true,
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
        borderColor: 'rgba(107, 114, 128, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: $${value.toLocaleString()}`;
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
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Property Performance</h3>
      </div>
      
      {/* Chart */}
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default PropertyPerformanceChart;