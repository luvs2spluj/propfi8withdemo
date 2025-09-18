import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Users,
  AlertCircle,
  Calendar,
  RefreshCw
} from 'lucide-react';
import RevenueChart from './charts/RevenueChart';
import OccupancyChart from './charts/OccupancyChart';
import PropertyPerformanceChart from './charts/PropertyPerformanceChart';
import unifiedPropertyService from '../services/unifiedPropertyService';

const Dashboard: React.FC = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkForDuplicateCSVs = useCallback(() => {
    try {
      const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      const activeCSVs = savedCSVs.filter((csv: any) => csv.isActive);
      
      // Group CSVs by filename
      const csvGroups = activeCSVs.reduce((groups: any, csv: any) => {
        if (!groups[csv.fileName]) {
          groups[csv.fileName] = [];
        }
        groups[csv.fileName].push(csv);
        return groups;
      }, {});
      
      // Find duplicates
      const duplicates = Object.entries(csvGroups).filter(([name, csvs]: [string, any]) => csvs.length > 1);
      
      if (duplicates.length > 0) {
        console.warn('⚠️ DUPLICATE CSVs detected:', duplicates);
        
        // Show warning to user
        const duplicateNames = duplicates.map(([name]) => name).join(', ');
        const confirmed = window.confirm(
          `⚠️ DUPLICATE DATA DETECTED!\n\n` +
          `The following CSV files have been uploaded multiple times:\n` +
          `• ${duplicateNames}\n\n` +
          `This is causing inflated dashboard values (e.g., $600k instead of $400k).\n\n` +
          `Would you like to automatically remove the older duplicates and keep only the most recent uploads?\n\n` +
          `Click "OK" to clean up duplicates, or "Cancel" to handle manually in CSV Management.`
        );
        
        if (confirmed) {
          cleanupDuplicateCSVs(duplicates);
        }
      }
    } catch (error) {
      console.error('Error checking for duplicate CSVs:', error);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Loading dashboard data from unified system...');
      
      // Load unified properties first
      const unifiedProperties = unifiedPropertyService.getAllProperties();
      console.log('🏢 Unified properties:', unifiedProperties);
      
      if (unifiedProperties && unifiedProperties.length > 0) {
        setProperties(unifiedProperties);
        
        // Properties loaded successfully
        console.log('✅ Properties loaded:', unifiedProperties.length);
      }

      // Load financial data from multiple sources
      
      // Try to get data from local backend first
      try {
        const localDataResponse = await fetch('http://localhost:5001/api/processed-data');
        if (localDataResponse.ok) {
          const localData = await localDataResponse.json();
          console.log('🏠 Local data loaded:', localData);
          
          if (localData.success && localData.data) {
            // Calculate financial metrics from local data
            const allData = Object.values(localData.data).flat();
            const totalRevenue = allData.reduce((sum: number, item: any) => {
              // Check if we have Chico summary data
              if (item.data?.sample && Array.isArray(item.data.sample)) {
                const monthlyRevenue = item.data.sample.reduce((monthSum: number, row: any) => {
                  return monthSum + (parseFloat(row['Monthly Revenue']) || 0);
                }, 0);
                return sum + monthlyRevenue;
              }
              // Fallback to aiAnalysis totalAmount
              const amount = parseFloat(item.data?.aiAnalysis?.totalAmount || item.data?.totalAmount || 0);
              return sum + amount;
            }, 0);
            
            const totalRecords = allData.reduce((sum: number, item: any) => {
              return sum + (item.data?.aiAnalysis?.totalRecords || 0);
            }, 0);
            
            // Calculate actual expenses and net income from Chico data
            const totalExpenses = allData.reduce((sum: number, item: any) => {
              if (item.data?.sample && Array.isArray(item.data.sample)) {
                const monthlyExpenses = item.data.sample.reduce((monthSum: number, row: any) => {
                  const maintenance = parseFloat(row['Maintenance Cost']) || 0;
                  const utilities = parseFloat(row['Utilities Cost']) || 0;
                  const insurance = parseFloat(row['Insurance Cost']) || 0;
                  const taxes = parseFloat(row['Property Tax']) || 0;
                  const other = parseFloat(row['Other Expenses']) || 0;
                  return monthSum + maintenance + utilities + insurance + taxes + other;
                }, 0);
                return sum + monthlyExpenses;
              }
              return sum + (totalRevenue * 0.6); // Fallback estimate
            }, 0);

            const totalNetIncome = totalRevenue - totalExpenses;

            // Add CSV-based metrics from localStorage
            const csvMetrics = calculateCSVMetrics();
            console.log('📊 CSV-based metrics:', csvMetrics);
            
            // Use CSV data if available, otherwise use local data
            // CSV data represents monthly averages, so we need to scale appropriately
            let finalRevenue, finalExpenses, finalNetIncome;
            
            if (csvMetrics.totalIncome > 0) {
              // CSV data is available - use it as the primary source
              finalRevenue = csvMetrics.totalIncome;
              finalExpenses = csvMetrics.totalExpense;
              finalNetIncome = csvMetrics.netOperatingIncome;
              console.log('📊 Using CSV data as primary source:', { finalRevenue, finalExpenses, finalNetIncome });
            } else {
              // No CSV data - use local backend data
              finalRevenue = totalRevenue;
              finalExpenses = totalExpenses;
              finalNetIncome = totalNetIncome;
              console.log('📊 Using local backend data as primary source:', { finalRevenue, finalExpenses, finalNetIncome });
            }

            // Calculate average occupancy from Chico data
            const avgOccupancyRate = allData.reduce((sum: number, item: any) => {
              if (item.data?.sample && Array.isArray(item.data.sample)) {
                const monthlyOccupancy = item.data.sample.reduce((monthSum: number, row: any) => {
                  return monthSum + (parseFloat(row['Occupancy Rate']) || 0);
                }, 0);
                return sum + (monthlyOccupancy / item.data.sample.length);
              }
              return sum + 95; // Fallback
            }, 0) / Math.max(1, allData.length);

            // Calculate total units
            const totalUnits = allData.reduce((sum: number, item: any) => {
              if (item.data?.sample && Array.isArray(item.data.sample)) {
                return sum + (parseFloat(item.data.sample[0]?.['Total Units']) || 0);
              }
              return sum + 26; // Fallback for Chico
            }, 0);

            setFinancialData({
              totalRevenue: finalRevenue,
              totalExpenses: finalExpenses,
              totalNetIncome: finalNetIncome,
              totalRecords: totalRecords + csvMetrics.recordCount,
              avgOccupancyRate: avgOccupancyRate,
              totalUnits: totalUnits,
              csvMetrics: csvMetrics
            });
          }
        }
      } catch (error) {
        console.error('Failed to load local data:', error);
      }

    } catch (error) {
      console.error('Dashboard: Failed to load data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeUnifiedService();
    loadDashboardData();
    checkForDuplicateCSVs();
    
    // Listen for data updates from CSV uploads and deletions
    const handleDataUpdate = (event: any) => {
      console.log('🔄 Dashboard received data update event:', event.detail);
      loadDashboardData();
    };

    window.addEventListener('dataUpdated', handleDataUpdate);

    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, [checkForDuplicateCSVs, loadDashboardData]);


  const cleanupDuplicateCSVs = (duplicates: any[]) => {
    try {
      const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      let cleanedCSVs = [...savedCSVs];
      let removedCount = 0;
      
      duplicates.forEach(([fileName, csvList]: [string, any]) => {
        // Sort by upload date (most recent first)
        const sortedCSVs = csvList.sort((a: any, b: any) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        
        // Keep the most recent, remove the rest
        const toRemove = sortedCSVs.slice(1);
        toRemove.forEach((csvToRemove: any) => {
          cleanedCSVs = cleanedCSVs.filter(csv => csv.id !== csvToRemove.id);
          removedCount++;
          console.log(`🗑️ Removed duplicate CSV: ${csvToRemove.fileName} (${csvToRemove.uploadedAt})`);
        });
      });
      
      localStorage.setItem('savedCSVs', JSON.stringify(cleanedCSVs));
      
      // Trigger dashboard update
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { 
          action: 'duplicates_cleaned',
          removedCount: removedCount
        } 
      }));
      
      alert(`✅ Cleaned up ${removedCount} duplicate CSV(s). Dashboard values should now be accurate.`);
      
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      alert('Failed to clean up duplicates. Please handle manually in CSV Management.');
    }
  };

  const initializeUnifiedService = async () => {
    try {
      await unifiedPropertyService.initialize();
      console.log('🏢 Dashboard: Unified service initialized');
    } catch (error) {
      console.error('Dashboard: Failed to initialize unified service:', error);
    }
  };

  const calculateCSVMetrics = () => {
    try {
      const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      let totalIncome = 0;
      let totalExpense = 0;
      let recordCount = 0;
      
      console.log('📊 Calculating CSV metrics from', savedCSVs.length, 'CSVs');
      
      // Check for duplicate CSVs and warn user
      const csvNames = savedCSVs.filter((csv: any) => csv.isActive).map((csv: any) => csv.fileName);
      const duplicateNames = csvNames.filter((name: string, index: number) => csvNames.indexOf(name) !== index);
      
      if (duplicateNames.length > 0) {
        console.warn('⚠️ DUPLICATE CSVs detected:', duplicateNames);
        // You could show a warning to the user here
      }
      
      savedCSVs.forEach((csv: any) => {
        if (!csv.isActive) return;
        
        console.log(`📁 Processing CSV: ${csv.fileName} (${csv.totalRecords} records)`);
        console.log('📋 CSV Preview Data Sample:', csv.previewData.slice(0, 3));
        
        Object.entries(csv.accountCategories).forEach(([accountName, category]) => {
          const accountData = csv.previewData.find((item: any) => 
            item.account_name === accountName
          );
          
          if (accountData && accountData.time_series) {
            console.log(`🔍 Account: ${accountName} (${category})`);
            console.log('📊 Time Series Data:', accountData.time_series);
            
            const values = Object.values(accountData.time_series).filter(v => 
              typeof v === 'number' && v !== 0
            ) as number[];
            
            if (values.length > 0) {
              // Handle different file types appropriately
              let accountValue = 0;
              
              if (csv.fileType === 'balance_sheet') {
                // For balance sheets, use the most recent value (last month)
                accountValue = values[values.length - 1];
                console.log(`  💰 ${accountName} (${category}): Latest value = $${accountValue.toLocaleString()}`);
              } else if (csv.fileType === 'rent_roll') {
                // For rent rolls, use the average monthly value
                accountValue = values.reduce((sum, val) => sum + val, 0) / values.length;
                console.log(`  💰 ${accountName} (${category}): Monthly average = $${accountValue.toLocaleString()}`);
              } else {
                // For cash flow and income statements, use monthly average
                accountValue = values.reduce((sum, val) => sum + val, 0) / values.length;
                console.log(`  💰 ${accountName} (${category}): Monthly average = $${accountValue.toLocaleString()}`);
              }
              
              // Categorize based on account type
              if (category === 'income' || category === 'revenue') {
                totalIncome += accountValue;
              } else if (category === 'expense') {
                totalExpense += accountValue;
              } else if (category === 'asset') {
                // For balance sheets, assets don't affect income/expense totals
                console.log(`  📊 Asset account: ${accountName} = $${accountValue.toLocaleString()}`);
              } else if (category === 'liability') {
                // For balance sheets, liabilities don't affect income/expense totals
                console.log(`  📊 Liability account: ${accountName} = $${accountValue.toLocaleString()}`);
              } else if (category === 'equity') {
                // For balance sheets, equity doesn't affect income/expense totals
                console.log(`  📊 Equity account: ${accountName} = $${accountValue.toLocaleString()}`);
              }
            }
          }
        });
        
        recordCount += csv.totalRecords;
      });
      
      const metrics = {
        totalIncome,
        totalExpense,
        netOperatingIncome: totalIncome - totalExpense,
        recordCount
      };
      
      console.log('📊 Final CSV metrics:', metrics);
      return metrics;
    } catch (error) {
      console.error('Error calculating CSV metrics:', error);
      return { totalIncome: 0, totalExpense: 0, netOperatingIncome: 0, recordCount: 0 };
    }
  };


  const totalProperties = properties.length;
  const totalUnits = properties.reduce((sum, p) => sum + (p.total_units || 0), 0);
  const avgOccupancy = parseFloat(financialData?.avgOccupancy || financialData?.avg_occupancy_rate || '0');
  const totalRevenue = parseFloat(financialData?.totalRevenue || financialData?.total_revenue || '0');
  const totalExpenses = parseFloat(financialData?.totalExpenses || financialData?.total_expenses || '0');
  const totalNetIncome = parseFloat(financialData?.totalNetIncome || financialData?.total_net_income || '0');
  const totalRecords = parseInt(financialData?.recordCount || financialData?.total_records || '0');

  // Debug logging
  console.log('🔍 Dashboard calculated values:');
  console.log('  - totalProperties:', totalProperties);
  console.log('  - totalUnits:', totalUnits);
  console.log('  - avgOccupancy:', avgOccupancy);
  console.log('  - totalRevenue:', totalRevenue);
  console.log('  - totalExpenses:', totalExpenses);
  console.log('  - totalNetIncome:', totalNetIncome);
  console.log('  - totalRecords:', totalRecords);

  // Calculate additional metrics
  const avgMonthlyRevenue = totalRecords > 0 ? totalRevenue / totalRecords : 0;
  const profitMargin = totalRevenue > 0 ? (totalNetIncome / totalRevenue) * 100 : 0;
  // const avgMonthlyExpenses = totalRecords > 0 ? totalExpenses / totalRecords : 0; // Unused variable

  const metrics = [
    {
      title: 'Total Properties',
      value: totalProperties.toString(),
      change: totalProperties > 0 ? 'Active' : 'None',
      changeType: totalProperties > 0 ? 'positive' as const : 'neutral' as const,
      icon: Building2,
      color: 'blue'
    },
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      change: `$${avgMonthlyRevenue.toLocaleString()}/month avg`,
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Net Income',
      value: `$${totalNetIncome.toLocaleString()}`,
      change: `${profitMargin.toFixed(1)}% margin`,
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Occupancy Rate',
      value: `${avgOccupancy.toFixed(1)}%`,
      change: `${totalUnits} total units`,
      changeType: 'positive' as const,
      icon: Users,
      color: 'orange'
    },
  ];

  const recentActivities = [
    { id: 1, type: 'data', message: `${totalRecords} CSV records uploaded for Chico property`, time: 'Current', icon: Calendar },
    { id: 2, type: 'property', message: `${totalProperties} active property in system`, time: 'Current', icon: Building2 },
    { id: 3, type: 'revenue', message: `Total revenue: $${totalRevenue.toLocaleString()}`, time: 'Current', icon: DollarSign },
    { id: 4, type: 'income', message: `Net income: $${totalNetIncome.toLocaleString()} (${profitMargin.toFixed(1)}% margin)`, time: 'Current', icon: TrendingUp },
    { id: 5, type: 'occupancy', message: `Average occupancy: ${avgOccupancy.toFixed(1)}%`, time: 'Current', icon: Users },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your properties.</p>
          {error && (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={loadDashboardData}
            disabled={isLoading}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <button className="btn-secondary">
            Export Report
          </button>
          <button className="btn-primary">
            Add Property
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                  <p className={`text-sm mt-1 ${
                    metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change} from last month
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  metric.color === 'blue' ? 'bg-blue-100' :
                  metric.color === 'green' ? 'bg-green-100' :
                  metric.color === 'purple' ? 'bg-purple-100' :
                  'bg-orange-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    metric.color === 'blue' ? 'text-blue-600' :
                    metric.color === 'green' ? 'text-green-600' :
                    metric.color === 'purple' ? 'text-purple-600' :
                    'text-orange-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <RevenueChart properties={properties} />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Rate</h3>
          <OccupancyChart properties={properties} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Performance</h3>
          <PropertyPerformanceChart properties={properties} />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
