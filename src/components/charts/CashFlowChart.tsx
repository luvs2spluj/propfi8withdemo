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

interface CashFlowData {
  month: string;
  totalOperatingIncome: number;
  totalOperatingExpense: number;
  netOperatingIncome: number;
}

interface CashFlowChartProps {
  properties: any[];
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ properties }) => {
  const [chartData, setChartData] = useState<CashFlowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const processCSVDataForCashFlow = (activeCSVs: any[]): CashFlowData[] => {
    const cashFlowData: CashFlowData[] = [];
    
    activeCSVs.forEach((csv: any) => {
      const fileName = csv.file_name || csv.fileName;
      const fileType = csv.file_type || csv.fileType;
      const previewData = csv.preview_data || csv.previewData;
      
      console.log(`💰 Processing CSV: ${fileName} (${fileType}) for cash flow chart`);
      
      // Only process cash flow CSVs
      if (fileType === 'cash_flow') {
        console.log('💰 Processing CASH FLOW CSV for key metrics chart...');
        
        const keyMetrics = [
          { name: 'Total Operating Income', key: 'totalOperatingIncome' },
          { name: 'NOI - Net Operating Income', key: 'netOperatingIncome' },
          { name: 'Total Operating Expense', key: 'totalOperatingExpense' }
        ];
        
        keyMetrics.forEach(metric => {
          console.log(`🔍 Looking for metric: ${metric.name}`);
          const accountData = previewData.find((item: any) => {
            const accountName = item.account_name?.trim().toLowerCase() || '';
            const matches = accountName.includes(metric.name.toLowerCase());
            if (matches) {
              console.log(`✅ Found matching account: ${item.account_name}`);
            }
            return matches;
          });
          
          if (accountData && accountData.time_series) {
            console.log(`🎯 Found key metric for chart: ${accountData.account_name}`);
            console.log(`📊 Time series data structure:`, accountData.time_series);
            
            // Process time series data for this key metric
            Object.entries(accountData.time_series).forEach(([month, value]) => {
              console.log(`📅 Processing month: ${month}, value: ${value} (type: ${typeof value})`);
              // Skip non-monthly entries like "Total"
              if (month.toLowerCase() === 'total' || month.toLowerCase() === 'sum' || month.toLowerCase() === 'grand total') {
                return;
              }
              
              if (typeof value === 'number') {
                // Find existing data point for this month or create new one
                let existingData = cashFlowData.find(d => d.month === month);
                if (!existingData) {
                  existingData = {
                    month: month,
                    totalOperatingIncome: 0,
                    totalOperatingExpense: 0,
                    netOperatingIncome: 0
                  };
                  cashFlowData.push(existingData);
                }
                
                // Set the appropriate value based on metric type
                if (metric.key === 'totalOperatingIncome') {
                  existingData.totalOperatingIncome = value;
                  console.log(`💰 Set Total Operating Income for ${month}: ${value}`);
                } else if (metric.key === 'totalOperatingExpense') {
                  existingData.totalOperatingExpense = value;
                  console.log(`💸 Set Total Operating Expense for ${month}: ${value}`);
                } else if (metric.key === 'netOperatingIncome') {
                  existingData.netOperatingIncome = value;
                  console.log(`📊 Set Net Operating Income for ${month}: ${value}`);
                }
              }
            });
          }
        });
      }
    });
    
    // Sort by date
    cashFlowData.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    
    console.log('📈 Processed cash flow chart data:', cashFlowData);
    console.log('📊 Chart data summary:');
    cashFlowData.forEach(d => {
      console.log(`  ${d.month}: Operating Income=${d.totalOperatingIncome}, Operating Expense=${d.totalOperatingExpense}, NOI=${d.netOperatingIncome}`);
    });
    return cashFlowData;
  };

  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true);
      try {
        // Try to get data from Supabase first
        const supabaseCSVs = await getCSVData();
        let activeCSVs = supabaseCSVs;
        
        // If no Supabase data, fall back to localStorage
        if (supabaseCSVs.length === 0) {
          const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
          activeCSVs = savedCSVs.filter((csv: any) => csv.isActive);
          console.log('📊 No Supabase data, using localStorage for cash flow chart:', activeCSVs.length, 'active CSVs');
        } else {
          console.log('📊 Using Supabase data for cash flow chart:', activeCSVs.length, 'active CSVs');
        }
        
        const processedData = processCSVDataForCashFlow(activeCSVs);
        setChartData(processedData);
      } catch (error) {
        console.error('Error loading cash flow chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Cash Flow Trends</h3>
        <div className="text-center text-gray-500 py-8">
          No cash flow data available. Upload a cash flow CSV to see Total Income, Total Expense, and Net Operating Income trends.
        </div>
      </div>
    );
  }

  const data = {
    labels: chartData.map(d => d.month),
    datasets: [
      {
        label: 'Total Operating Income',
        data: chartData.map(d => d.totalOperatingIncome),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Total Operating Expense',
        data: chartData.map(d => d.totalOperatingExpense),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'NOI - Net Operating Income',
        data: chartData.map(d => d.netOperatingIncome),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '💰 Key Financial Metrics - Month Over Month',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            return `${context.dataset.label}: $${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Cash Flow Trends</h3>
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <p>Shows Total Operating Income, Total Operating Expense, and NOI - Net Operating Income month-over-month from cash flow CSVs.</p>
      </div>
    </div>
  );
};

export default CashFlowChart;
