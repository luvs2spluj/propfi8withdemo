interface CSVRecord {
  id: string;
  fileName: string;
  fileType: 'cash_flow' | 'balance_sheet' | 'rent_roll' | 'income_statement' | 'general';
  uploadedAt: string;
  totalRecords: number;
  accountCategories: Record<string, string>;
  bucketAssignments: Record<string, string>;
  tags: Record<string, string[]>;
  isActive: boolean;
  previewData: any[];
}

interface DashboardMetrics {
  totalIncome: number;
  totalExpense: number;
  netOperatingIncome: number;
  grossRentalIncome: number;
  operatingExpenses: number;
  recordCount: number;
  lastUpdated: string;
}

export class DashboardCalculator {
  private static instance: DashboardCalculator;
  private metrics: DashboardMetrics = {
    totalIncome: 0,
    totalExpense: 0,
    netOperatingIncome: 0,
    grossRentalIncome: 0,
    operatingExpenses: 0,
    recordCount: 0,
    lastUpdated: new Date().toISOString()
  };

  static getInstance(): DashboardCalculator {
    if (!DashboardCalculator.instance) {
      DashboardCalculator.instance = new DashboardCalculator();
    }
    return DashboardCalculator.instance;
  }

  calculateMetrics(): DashboardMetrics {
    try {
      const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      const activeCSVs = savedCSVs.filter((csv: CSVRecord) => csv.isActive);
      
      let totalIncome = 0;
      let totalExpense = 0;
      let grossRentalIncome = 0;
      let operatingExpenses = 0;
      let recordCount = 0;

      for (const csv of activeCSVs) {
        recordCount += csv.totalRecords;
        
        // Process each account in the CSV
        for (const [accountName, category] of Object.entries(csv.accountCategories)) {
          const bucket = csv.bucketAssignments[accountName];
          
          // Calculate values from preview data
          const accountData = csv.previewData.find((item: any) => 
            item.account_name === accountName
          );
          
          if (accountData) {
            const accountValue = this.extractAccountValue(accountData);
            
            if (category === 'income') {
              totalIncome += accountValue;
              
              if (bucket === 'gross_rental_income') {
                grossRentalIncome += accountValue;
              }
            } else if (category === 'expense') {
              totalExpense += accountValue;
              
              if (bucket === 'operating_expenses') {
                operatingExpenses += accountValue;
              }
            }
          }
        }
      }

      const netOperatingIncome = totalIncome - totalExpense;

      this.metrics = {
        totalIncome,
        totalExpense,
        netOperatingIncome,
        grossRentalIncome,
        operatingExpenses,
        recordCount,
        lastUpdated: new Date().toISOString()
      };

      console.log('📊 Dashboard metrics calculated:', this.metrics);
      return this.metrics;
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      return this.metrics;
    }
  }

  private extractAccountValue(accountData: any): number {
    // Extract value from time series data
    if (accountData.time_series) {
      const values = Object.values(accountData.time_series).filter(v => 
        typeof v === 'number' && v !== 0
      ) as number[];
      
      if (values.length > 0) {
        // Return the average monthly value
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }
    
    // Fallback to total values
    if (accountData.total_income) return accountData.total_income;
    if (accountData.total_expense) return accountData.total_expense;
    
    return 0;
  }

  getMetrics(): DashboardMetrics {
    return this.metrics;
  }

  // Method to get metrics for specific time period
  getMetricsForPeriod(startDate: string, endDate: string): DashboardMetrics {
    // This would filter data by date range
    // For now, return current metrics
    return this.calculateMetrics();
  }

  // Method to get metrics by property
  getMetricsByProperty(propertyId: string): DashboardMetrics {
    // This would filter data by property
    // For now, return current metrics
    return this.calculateMetrics();
  }

  // Method to refresh metrics
  refreshMetrics(): DashboardMetrics {
    return this.calculateMetrics();
  }
}

export const dashboardCalculator = DashboardCalculator.getInstance();
