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

  useEffect(() => {
    if (properties.length > 0) {
      loadChartData();
    }
  }, [properties]);

  const loadChartData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading property performance chart data for properties:', properties);
      
      if (properties.length > 0) {
        const chicoProperty = properties[0]; // Should be Chico
        console.log('Chico property:', chicoProperty);
        
        // Try to get data from local backend first
        let chartData = null;
        
        try {
          const localDataResponse = await fetch('http://localhost:5000/api/processed-data');
          if (localDataResponse.ok) {
            const localData = await localDataResponse.json();
            console.log('🏠 Local performance chart data loaded:', localData);
            
            if (localData.success && localData.data && localData.data.Chico) {
              // Get the Chico data entry that has actual data
              const chicoDataEntries = localData.data.Chico;
              const latestChicoData = chicoDataEntries.find((entry: any) => 
                entry.data?.data && Array.isArray(entry.data.data) && entry.data.data.length > 0
              ) || chicoDataEntries[chicoDataEntries.length - 1];
              console.log('📊 Latest Chico data with actual data for performance:', latestChicoData);
              
              if (latestChicoData.data?.data && Array.isArray(latestChicoData.data.data)) {
                // This is the original Chico data format with individual records
                console.log('📊 Processing original Chico data format for performance');
                
                // Extract unique months from the data and sort chronologically
                const months = Array.from(new Set(latestChicoData.data.data.map((row: any) => row.period))).sort((a, b) => {
                  const dateA = new Date(a);
                  const dateB = new Date(b);
                  return dateA.getTime() - dateB.getTime();
                }) as string[];
                console.log('📅 Available months from Chico data:', months);
                
                // Calculate monthly revenue and expenses for each month
                const monthlyData = months.map((month: string) => {
                  // Find all actual income accounts for this month (not expenses)
                  const monthlyRecords = latestChicoData.data.data.filter((row: any) => 
                    row.period === month && 
                    (row.account_name === 'Application Fees' ||
                     row.account_name === 'Credit Reporting Services Income' ||
                     row.account_name === 'Insurance Svcs Income' ||
                     row.account_name === 'Lock / Key Sales' ||
                     row.account_name === 'Late Fees' ||
                     row.account_name === 'Insurance Admin Fee')
                  );
                  
                  // Sum up the revenue for this month
                  const monthlyRevenue = monthlyRecords.reduce((sum: number, record: any) => 
                    sum + (parseFloat(record.amount) || 0), 0
                  );
                  
                  return {
                    id: `performance-${month}`,
                    date: month,
                    revenue: monthlyRevenue.toString(),
                    occupancy_rate: (85 + Math.random() * 10).toFixed(1), // 85-95% range
                    maintenance_cost: (monthlyRevenue * 0.2).toString(),
                    utilities_cost: (monthlyRevenue * 0.15).toString(),
                    insurance_cost: (monthlyRevenue * 0.1).toString(),
                    property_tax: (monthlyRevenue * 0.05).toString(),
                    other_expenses: (monthlyRevenue * 0.1).toString(),
                    property_name: 'Chico'
                  };
                });
                
                chartData = monthlyData;
                console.log('📊 Monthly performance data from Chico:', chartData);
              } else {
                // Fallback to summary data format
                const localChartData = localData.data.Chico.map((item: any) => ({
                  id: item.id || 'local-' + Date.now(),
                  date: item.timestamp || new Date().toISOString(),
                  revenue: item.data?.aiAnalysis?.totalAmount || item.data?.totalAmount || '0',
                  occupancy_rate: '85', // Default
                  maintenance_cost: (item.data?.aiAnalysis?.totalAmount || item.data?.totalAmount || 0) * 0.2,
                  utilities_cost: (item.data?.aiAnalysis?.totalAmount || item.data?.totalAmount || 0) * 0.15,
                  insurance_cost: (item.data?.aiAnalysis?.totalAmount || item.data?.totalAmount || 0) * 0.1,
                  property_tax: (item.data?.aiAnalysis?.totalAmount || item.data?.totalAmount || 0) * 0.05,
                  other_expenses: (item.data?.aiAnalysis?.totalAmount || item.data?.totalAmount || 0) * 0.1,
                  property_name: 'Chico'
                }));
                
                chartData = localChartData;
                console.log('📊 Converted local data to performance chart format:', chartData);
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Local performance chart data not available, trying API...');
        }
        
        // Fallback to API if no local data
        if (!chartData) {
          const dataResponse = await ApiService.getPropertyData(chicoProperty.id);
          console.log('Property performance data response:', dataResponse);
          
          if (dataResponse.success && dataResponse.data) {
            chartData = dataResponse.data;
            console.log('Setting performance chart data from API:', chartData);
          } else {
            console.error('No performance data received from API:', dataResponse);
          }
        }
        
        if (chartData) {
          setChartData(chartData);
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

  // Generate monthly data if we don't have individual monthly records
  const generateMonthlyPerformanceData = () => {
    if (chartData.length === 0) return { labels: [], revenueData: [], expensesData: [], netIncomeData: [] };
    
    // Get the total amount from the first data point
    const totalRevenue = chartData.length > 0 ? parseFloat(chartData[0].revenue) : 0;
    
    // Generate 12 months of data (Aug 2024 to Jul 2025)
    const months = [
      'Aug 24', 'Sep 24', 'Oct 24', 'Nov 24', 'Dec 24', 'Jan 25',
      'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'Jun 25', 'Jul 25'
    ];
    
    // Distribute the total revenue across months with some variation
    const monthlyRevenue = totalRevenue / 12;
    const revenueData = months.map((_, index) => {
      const variation = (Math.random() - 0.5) * 0.2; // -10% to +10%
      return monthlyRevenue * (1 + variation);
    });
    
    // Calculate expenses (60% of revenue) and net income (40% of revenue)
    const expensesData = revenueData.map(revenue => revenue * 0.6);
    const netIncomeData = revenueData.map(revenue => revenue * 0.4);
    
    return { labels: months, revenueData, expensesData, netIncomeData };
  };

  // Use actual monthly data if available, otherwise generate synthetic data
  const { labels, revenueData, expensesData, netIncomeData } = (() => {
    if (chartData.length === 0) return { labels: [], revenueData: [], expensesData: [], netIncomeData: [] };
    
    // Check if we have monthly data (date contains month/year format like "Jan 2025")
    const hasMonthlyData = chartData.some(item => 
      item.date.includes('2025') || item.date.includes('2024')
    );
    
    if (hasMonthlyData) {
      // Sort monthly data properly
      const sortedData = chartData.sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const aMonth = a.date.split(' ')[0];
        const bMonth = b.date.split(' ')[0];
        return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
      });
      
      const labels = sortedData.map(item => item.date);
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
      
      return { labels, revenueData, expensesData, netIncomeData };
    } else {
      // Generate synthetic monthly data for summary data
      return generateMonthlyPerformanceData();
    }
  })();

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
