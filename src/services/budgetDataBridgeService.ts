import { propertyCSVStorageService, PropertyInfo, PropertyCSVRecord } from './propertyCSVStorageService';

export interface BudgetChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill?: boolean;
    tension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
    borderDash?: number[];
  }>;
}

export interface BudgetFinancialData {
  totalRevenue: number;
  totalExpenses: number;
  totalNetIncome: number;
  totalRecords: number;
  dataSource: string;
}

class BudgetDataBridgeService {
  private subscribers: Set<(data: any) => void> = new Set();

  subscribe(callback: (data: any) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(data: any) {
    this.subscribers.forEach(callback => callback(data));
  }

  // Load budget data from localStorage (from CSV budget importer)
  loadBudgetDataFromLocalStorage(): any {
    try {
      // Check for budget data in localStorage
      const bucketsData = localStorage.getItem('buckets');
      const uploadedCSVs = localStorage.getItem('uploadedCSVs');
      
      console.log('🔍 Checking localStorage for budget data...');
      console.log('  buckets:', bucketsData ? 'found' : 'not found');
      console.log('  uploadedCSVs:', uploadedCSVs ? 'found' : 'not found');

      if (bucketsData) {
        const buckets = JSON.parse(bucketsData);
        console.log('📊 Budget buckets loaded from localStorage:', buckets);
        return this.convertBucketsToChartData(buckets);
      }

      if (uploadedCSVs) {
        const csvs = JSON.parse(uploadedCSVs);
        console.log('📊 Uploaded CSVs loaded from localStorage:', csvs);
        if (csvs.length > 0) {
          // Use the most recent CSV
          const latestCSV = csvs[csvs.length - 1];
          if (latestCSV.data && latestCSV.data.buckets) {
            return this.convertBucketsToChartData(latestCSV.data.buckets);
          }
        }
      }

      console.log('❌ No budget data found in localStorage');
      return null;
    } catch (error) {
      console.error('Error loading budget data from localStorage:', error);
      return null;
    }
  }

  // Convert budget buckets to chart-ready data
  private convertBucketsToChartData(buckets: any): any {
    if (!buckets || !buckets.income || !buckets.expense) {
      console.log('❌ Invalid buckets structure:', buckets);
      return null;
    }

    console.log('🔄 Converting buckets to chart data...');
    console.log('  Income items:', buckets.income.individualItems?.length || 0);
    console.log('  Expense items:', buckets.expense.individualItems?.length || 0);

    // Extract month columns (skip 'Account Name' and 'Total')
    const incomeItems = buckets.income.individualItems || [];
    const expenseItems = buckets.expense.individualItems || [];
    
    if (incomeItems.length === 0 && expenseItems.length === 0) {
      console.log('❌ No income or expense items found');
      return null;
    }

    // Get month columns from the first item
    const sampleItem = incomeItems[0] || expenseItems[0];
    const monthColumns = Object.keys(sampleItem).filter(key => 
      key !== 'Account Name' && 
      key !== 'Total' && 
      !key.toLowerCase().includes('total')
    ).sort();

    console.log('📅 Month columns found:', monthColumns);

    // Create chart data structure
    const chartData = {
      labels: monthColumns,
      datasets: [] as any[],
      financialData: this.calculateFinancialData(buckets, monthColumns)
    };

    // Add income datasets
    incomeItems.forEach((item: any, index: number) => {
      const accountName = item['Account Name'];
      const data = monthColumns.map(month => parseFloat(item[month]) || 0);
      
      chartData.datasets.push({
        label: `${accountName} (Income)`,
        data: data,
        borderColor: `rgba(0, 128, 0, ${0.7 - (index * 0.1)})`, // Green shades
        backgroundColor: `rgba(0, 128, 0, 0.1)`,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderDash: index > 0 ? [5, 5] : undefined // Dashed for individual items
      });
    });

    // Add expense datasets
    expenseItems.forEach((item: any, index: number) => {
      const accountName = item['Account Name'];
      const data = monthColumns.map(month => parseFloat(item[month]) || 0);
      
      chartData.datasets.push({
        label: `${accountName} (Expense)`,
        data: data,
        borderColor: `rgba(255, 0, 0, ${0.7 - (index * 0.1)})`, // Red shades
        backgroundColor: `rgba(255, 0, 0, 0.1)`,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderDash: index > 0 ? [5, 5] : undefined // Dashed for individual items
      });
    });

    // Add total lines
    const totalIncomeData = monthColumns.map(month => 
      incomeItems.reduce((sum: number, item: any) => sum + (parseFloat(item[month]) || 0), 0)
    );
    
    const totalExpenseData = monthColumns.map(month => 
      expenseItems.reduce((sum: number, item: any) => sum + (parseFloat(item[month]) || 0), 0)
    );

    chartData.datasets.push({
      label: 'Total Income',
      data: totalIncomeData,
      borderColor: 'rgba(0, 128, 0, 1)',
      backgroundColor: 'rgba(0, 128, 0, 0.2)',
      fill: false,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      borderWidth: 3
    });

    chartData.datasets.push({
      label: 'Total Expenses',
      data: totalExpenseData,
      borderColor: 'rgba(255, 0, 0, 1)',
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      fill: false,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      borderWidth: 3
    });

    console.log('✅ Chart data converted successfully:', chartData);
    return chartData;
  }

  // Calculate financial summary data
  private calculateFinancialData(buckets: any, monthColumns: string[]): BudgetFinancialData {
    const incomeItems = buckets.income.individualItems || [];
    const expenseItems = buckets.expense.individualItems || [];

    let totalRevenue = 0;
    let totalExpenses = 0;

    // Calculate totals across all months
    monthColumns.forEach(month => {
      const monthIncome = incomeItems.reduce((sum: number, item: any) => 
        sum + (parseFloat(item[month]) || 0), 0);
      const monthExpense = expenseItems.reduce((sum: number, item: any) => 
        sum + (parseFloat(item[month]) || 0), 0);
      
      totalRevenue += monthIncome;
      totalExpenses += monthExpense;
    });

    const totalNetIncome = totalRevenue - totalExpenses;
    const totalRecords = incomeItems.length + expenseItems.length;

    return {
      totalRevenue,
      totalExpenses,
      totalNetIncome,
      totalRecords,
      dataSource: 'budget-importer-localStorage'
    };
  }

  // Get financial data for dashboard metrics
  getFinancialData(): BudgetFinancialData | null {
    const budgetData = this.loadBudgetDataFromLocalStorage();
    return budgetData?.financialData || null;
  }

  // Get chart data for revenue chart
  getRevenueChartData(): BudgetChartData | null {
    const budgetData = this.loadBudgetDataFromLocalStorage();
    if (!budgetData) return null;

    return {
      labels: budgetData.labels,
      datasets: budgetData.datasets.filter((dataset: any) => 
        dataset.label.includes('Income') || dataset.label.includes('Total Income')
      )
    };
  }

  // Get chart data for multi-bucket chart
  getMultiBucketChartData(): BudgetChartData | null {
    const budgetData = this.loadBudgetDataFromLocalStorage();
    if (!budgetData) return null;

    return {
      labels: budgetData.labels,
      datasets: budgetData.datasets.filter((dataset: any) => 
        dataset.label.includes('Total Income') || 
        dataset.label.includes('Total Expenses') ||
        dataset.label.includes('Net Operating Income')
      )
    };
  }

  // Check if budget data exists
  hasBudgetData(): boolean {
    return this.loadBudgetDataFromLocalStorage() !== null;
  }

  // Force refresh data and notify subscribers
  refreshData() {
    const data = this.loadBudgetDataFromLocalStorage();
    this.notifySubscribers(data);
  }
}

export const budgetDataBridgeService = new BudgetDataBridgeService();
