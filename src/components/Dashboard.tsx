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
// import CashFlowChart from './charts/CashFlowChart';
import MultiBucketChart from './charts/MultiBucketChart';
import unifiedPropertyService from '../services/unifiedPropertyService';
import { getCSVData, deleteCSVData, migrateLocalStorageToSupabase } from '../lib/supabase';

const Dashboard: React.FC = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [hasCashFlowData, setHasCashFlowData] = useState(false);
  // const [activeCSVsCount, setActiveCSVsCount] = useState(0);

  const checkForDuplicateCSVs = useCallback(async () => {
    try {
      const activeCSVs = await getCSVData();
      
      // Group CSVs by filename
      const csvGroups = activeCSVs.reduce((groups: any, csv: any) => {
        if (!groups[csv.file_name]) {
          groups[csv.file_name] = [];
        }
        groups[csv.file_name].push(csv);
        return groups;
      }, {});
      
      // Find duplicates
      const duplicates = Object.entries(csvGroups).filter(([name, csvs]) => (csvs as any[]).length > 1);
      
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
          await cleanupDuplicateCSVs(duplicates);
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

      // Load financial data from ACTIVE CSV sources only
      console.log('📊 Loading financial data from active CSVs only...');
      
      // Calculate metrics from active CSVs only
      const csvMetrics = await calculateCSVMetrics();
      console.log('📈 CSV Metrics calculated:', csvMetrics);
      
      if (csvMetrics.totalIncome > 0 || csvMetrics.totalExpense > 0) {
        // Use CSV data for financial metrics
        const totalRevenue = csvMetrics.totalIncome;
        const totalExpenses = csvMetrics.totalExpense;
        const netIncome = totalRevenue - totalExpenses;
        const totalRecords = csvMetrics.recordCount;
        
        console.log('💰 Financial Summary from CSVs:');
        console.log(`  Total Revenue: $${totalRevenue.toLocaleString()}`);
        console.log(`  Total Expenses: $${totalExpenses.toLocaleString()}`);
        console.log(`  Net Income: $${netIncome.toLocaleString()}`);
        console.log(`  Total Records: ${totalRecords}`);
        
        setFinancialData({
          totalRevenue,
          totalExpenses,
          totalNetIncome: netIncome,
          totalRecords,
          dataSource: 'csv'
        });
      } else {
        // No active CSV data available
        console.log('⚠️ No active CSV data found. Dashboard will show empty state.');
        setFinancialData({
          totalRevenue: 0,
          totalExpenses: 0,
          totalNetIncome: 0,
          totalRecords: 0,
          dataSource: 'none'
        });
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
      
      // Check if this is a CSV deletion event
      if (event.detail?.action === 'csv_deleted') {
        console.log('🗑️ CSV deletion detected, refreshing dashboard data...');
        console.log('📋 Deleted CSV:', event.detail.fileName);
      }
      
      // Always reload dashboard data when any data update occurs
      loadDashboardData();
    };

    window.addEventListener('dataUpdated', handleDataUpdate);

    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, [checkForDuplicateCSVs, loadDashboardData]);


  const cleanupDuplicateCSVs = async (duplicates: any[]) => {
    try {
      let removedCount = 0;
      
      for (const [, csvList] of duplicates) {
        // Sort by upload date (most recent first)
        const sortedCSVs = csvList.sort((a: any, b: any) => 
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        );
        
        // Keep the most recent, remove the rest
        const toRemove = sortedCSVs.slice(1);
        for (const csvToRemove of toRemove) {
          const result = await deleteCSVData(csvToRemove.id);
          if (result) {
            removedCount++;
            console.log(`🗑️ Removed duplicate CSV: ${csvToRemove.file_name} (${csvToRemove.uploaded_at})`);
          }
        }
      }
      
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
      // First, migrate any localStorage data to Supabase
      const migrationResult = await migrateLocalStorageToSupabase();
      if (migrationResult.success && migrationResult.migrated && migrationResult.migrated > 0) {
        console.log(`🔄 Migrated ${migrationResult.migrated} CSVs from localStorage to Supabase`);
      }
      
      await unifiedPropertyService.initialize();
      console.log('🏢 Dashboard: Unified service initialized');
    } catch (error) {
      console.error('Dashboard: Failed to initialize unified service:', error);
    }
  };

  const calculateCSVMetrics = async () => {
    try {
      // Get data from Supabase only
      const activeCSVs = await getCSVData();
      console.log('📊 Using Supabase data:', activeCSVs.length, 'active CSVs');
      
      let totalIncome = 0;
      let totalExpense = 0;
      let recordCount = 0;
      
      console.log('📋 Active CSVs:', activeCSVs.map((csv: any) => ({ 
        fileName: csv.file_name, 
        isActive: csv.is_active, 
        totalRecords: csv.total_records 
      })));
      
      // Check for duplicate CSVs and warn user
      const csvNames = activeCSVs.map((csv: any) => csv.file_name);
      const duplicateNames = csvNames.filter((name: string, index: number) => csvNames.indexOf(name) !== index);
      
      if (duplicateNames.length > 0) {
        console.warn('⚠️ DUPLICATE CSVs detected:', duplicateNames);
        // You could show a warning to the user here
      }
      
      activeCSVs.forEach((csv: any) => {
        // const fileName = csv.file_name;
        const totalRecords = csv.total_records;
        const accountCategories = csv.account_categories;
        const previewData = csv.preview_data;
        const fileType = csv.file_type;
        
        console.log(`📁 Processing CSV: ${csv.file_name} (${totalRecords} records)`);
        console.log('📋 CSV Preview Data Sample:', Array.isArray(previewData) ? previewData.slice(0, 3) : previewData);
        
        // For cash flow CSVs, prioritize the THREE KEY METRICS for dashboard population
        if (fileType === 'cash_flow') {
          console.log('💰 Processing CASH FLOW CSV - Looking for KEY METRICS for dashboard...');
          
          // PRIORITY 1: Look for the three most important metrics first
          const primaryMetrics = [
            { name: 'Total Operating Income', type: 'income' },
            { name: 'NOI - Net Operating Income', type: 'net_income' },
            { name: 'Total Operating Expense', type: 'expense' }
          ];
          
          let foundKeyMetrics = false;
          
          primaryMetrics.forEach(metric => {
            const accountData = Array.isArray(previewData) ? previewData.find((item: any) => {
              const accountName = item.account_name?.trim().toLowerCase() || '';
              return accountName.includes(metric.name.toLowerCase());
            }) : null;
            
            if (accountData && accountData.time_series) {
              foundKeyMetrics = true;
              console.log(`🎯 FOUND KEY METRIC: ${accountData.account_name} (${metric.type})`);
              console.log('📊 Time Series Data:', accountData.time_series);
              
              // Get monthly values (exclude totals)
              const monthlyValues = Object.entries(accountData.time_series)
                .filter(([month, value]) => 
                  month.toLowerCase() !== 'total' && 
                  month.toLowerCase() !== 'sum' && 
                  month.toLowerCase() !== 'grand total' &&
                  typeof value === 'number'
                )
                .map(([, value]) => value as number);
              
              if (monthlyValues.length > 0) {
                // For key metrics, use the sum of all months (total for the period)
                const totalValue = monthlyValues.reduce((sum, val) => sum + val, 0);
                
                if (metric.type === 'income') {
                  totalIncome += totalValue;
                  console.log(`  💰 ${accountData.account_name}: Total Income = $${totalValue.toLocaleString()}`);
                } else if (metric.type === 'expense') {
                  totalExpense += totalValue;
                  console.log(`  💸 ${accountData.account_name}: Total Expense = $${totalValue.toLocaleString()}`);
                } else if (metric.type === 'net_income') {
                  // Net Operating Income is already calculated, so we can use it directly
                  console.log(`  📊 ${accountData.account_name}: Net Operating Income = $${totalValue.toLocaleString()}`);
                  // For dashboard purposes, we'll calculate net income as totalIncome - totalExpense
                }
              }
            }
          });
          
          // PRIORITY 2: If we found key metrics, skip individual categorization
          if (foundKeyMetrics) {
            console.log('✅ Using KEY METRICS for dashboard population');
            console.log(`💰 Total Income: $${totalIncome.toLocaleString()}`);
            console.log(`💸 Total Expense: $${totalExpense.toLocaleString()}`);
            console.log(`📊 Net Operating Income: $${(totalIncome - totalExpense).toLocaleString()}`);
          } else {
            // If we didn't find key metrics, fall back to individual account categorization
            console.log('⚠️ Key metrics not found, falling back to individual account categorization...');
            
            Object.entries(accountCategories).forEach(([accountName, category]) => {
              const accountData = previewData.find((item: any) => 
                item.account_name?.trim() === accountName
              );
              
              if (accountData && accountData.time_series) {
                console.log(`🔍 Account: ${accountName} (${category})`);
                
                // Get monthly values (exclude totals)
                const monthlyValues = Object.entries(accountData.time_series)
                  .filter(([month, value]) => 
                    month.toLowerCase() !== 'total' && 
                    month.toLowerCase() !== 'sum' && 
                    month.toLowerCase() !== 'grand total' &&
                    typeof value === 'number'
                  )
                  .map(([, value]) => value as number);
                
                if (monthlyValues.length > 0) {
                  // For cash flow, use sum of all months
                  const totalValue = monthlyValues.reduce((sum, val) => sum + val, 0);
                  
                  if (category === 'income') {
                    totalIncome += totalValue;
                    console.log(`  💰 ${accountName}: Income = $${totalValue.toLocaleString()}`);
                  } else if (category === 'expense') {
                    totalExpense += totalValue;
                    console.log(`  💸 ${accountName}: Expense = $${totalValue.toLocaleString()}`);
                  }
                }
              }
            });
          }
        } else {
          // For other file types, use the original logic
          Object.entries(accountCategories).forEach(([accountName, category]) => {
            const accountData = previewData.find((item: any) => 
              item.account_name?.trim() === accountName
            );
            
            if (accountData && accountData.time_series) {
              console.log(`🔍 Account: ${accountName} (${category})`);
              console.log('📊 Time Series Data:', accountData.time_series);
              
              // Filter out non-monthly entries and get only numeric values
              const values = Object.entries(accountData.time_series)
                .filter(([month, value]) => 
                  month.toLowerCase() !== 'total' && 
                  month.toLowerCase() !== 'sum' && 
                  month.toLowerCase() !== 'grand total' &&
                  typeof value === 'number' && 
                  value !== 0
                )
                .map(([, value]) => value as number);
              
              if (values.length > 0) {
                // Handle different file types appropriately
                let accountValue = 0;
                
                if (fileType === 'balance_sheet') {
                  // For balance sheets, use the most recent value (last month)
                  accountValue = values[values.length - 1];
                  console.log(`  💰 ${accountName} (${category}): Latest value = $${accountValue.toLocaleString()}`);
                } else if (fileType === 'rent_roll') {
                  // For rent rolls, use the average monthly value
                  accountValue = values.reduce((sum, val) => sum + val, 0) / values.length;
                  console.log(`  💰 ${accountName} (${category}): Monthly average = $${accountValue.toLocaleString()}`);
                } else {
                  // For income statements, use monthly average
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
        }
        
        recordCount += csv.totalRecords;
      });
      
      // Check if we have cash flow data
      const hasCashFlow = activeCSVs.some((csv: any) => 
        (csv.file_type || csv.fileType) === 'cash_flow'
      );
      console.log('🔍 Cash Flow Detection Debug:');
      console.log('  Active CSVs:', activeCSVs.length);
      console.log('  CSV file types:', activeCSVs.map((csv: any) => csv.file_type || csv.fileType));
      console.log('  Has cash flow:', hasCashFlow);
      // setHasCashFlowData(hasCashFlow);
      // setActiveCSVsCount(activeCSVs.length);
      
      const metrics = {
        totalIncome,
        totalExpense,
        netOperatingIncome: totalIncome - totalExpense,
        recordCount
      };
      
      console.log('📊 Final CSV metrics:', metrics);
      console.log('💰 Has cash flow data:', hasCashFlow);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Welcome back! Here's what's happening with your properties.</p>
          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
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
            Refresh
          </button>
          <button className="btn-secondary">
            Export
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
            <div key={index} className="metric-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metric.value}</p>
                  <p className={`text-sm mt-1 ${
                    metric.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {metric.change} from last month
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  metric.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' :
                  metric.color === 'green' ? 'bg-green-100 dark:bg-green-900/20' :
                  metric.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/20' :
                  'bg-orange-100 dark:bg-orange-900/20'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    metric.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    metric.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    metric.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                    'text-orange-600 dark:text-orange-400'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
          <RevenueChart properties={properties} />
        </div>
        <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Occupancy Rate</h3>
          <OccupancyChart properties={properties} />
        </div>
      </div>

      {/* Multi-Bucket Analysis Chart */}
      <div className="mt-6">
        <MultiBucketChart properties={properties} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
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
