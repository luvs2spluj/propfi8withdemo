import { propertyCSVStorageService, PropertyCSVRecord, PropertyInfo } from './propertyCSVStorageService';

export interface ChartDataPoint {
  propertyId: string;
  propertyName: string;
  csvType: string;
  accountName: string;
  month: string;
  year: number;
  value: number;
  category: 'income' | 'expense' | 'other';
  isActive: boolean;
}

export interface MonthlyData {
  month: string;
  year: number;
  income: number;
  expense: number;
  noi: number;
  breakdown: ChartDataPoint[];
}

export interface PropertyChartData {
  propertyId: string;
  propertyName: string;
  monthlyData: MonthlyData[];
  totalIncome: number;
  totalExpense: number;
  totalNOI: number;
  csvTypes: string[];
  activeRecords: number;
}

export interface ConsolidatedChartData {
  properties: PropertyChartData[];
  selectedProperty: PropertyChartData | null;
  allMonths: string[];
  globalTotals: {
    income: number;
    expense: number;
    noi: number;
  };
}

class PropertyChartDataService {
  private cache: Map<string, ConsolidatedChartData> = new Map();
  private subscribers: Set<(data: ConsolidatedChartData) => void> = new Set();

  async initialize(): Promise<void> {
    await propertyCSVStorageService.initialize();
  }

  subscribe(callback: (data: ConsolidatedChartData) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(data: ConsolidatedChartData): void {
    this.subscribers.forEach(callback => callback(data));
  }

  async loadConsolidatedChartData(): Promise<ConsolidatedChartData> {
    try {
      const properties = await propertyCSVStorageService.getProperties();
      const propertyChartData: PropertyChartData[] = [];

      for (const property of properties) {
        const csvRecords = await propertyCSVStorageService.getCSVRecords(property.id);
        const propertyData = await this.consolidatePropertyData(property, csvRecords);
        propertyChartData.push(propertyData);
      }

      const consolidatedData: ConsolidatedChartData = {
        properties: propertyChartData,
        selectedProperty: propertyChartData.length > 0 ? propertyChartData[0] : null,
        allMonths: this.extractAllMonths(propertyChartData),
        globalTotals: this.calculateGlobalTotals(propertyChartData)
      };

      this.cache.set('consolidated', consolidatedData);
      this.notifySubscribers(consolidatedData);
      return consolidatedData;
    } catch (error) {
      console.error('Error loading consolidated chart data:', error);
      return {
        properties: [],
        selectedProperty: null,
        allMonths: [],
        globalTotals: { income: 0, expense: 0, noi: 0 }
      };
    }
  }

  private async consolidatePropertyData(
    property: PropertyInfo,
    csvRecords: PropertyCSVRecord[]
  ): Promise<PropertyChartData> {
    const monthlyDataMap = new Map<string, MonthlyData>();
    const activeRecords = csvRecords.filter(record => record.isActive);
    const csvTypes = [...new Set(activeRecords.map(record => record.csvType))];

    // Process each CSV record
    for (const record of activeRecords) {
      const chartDataPoints = this.extractChartDataPoints(property, record);
      
      for (const dataPoint of chartDataPoints) {
        const monthKey = `${dataPoint.year}-${dataPoint.month}`;
        
        if (!monthlyDataMap.has(monthKey)) {
          monthlyDataMap.set(monthKey, {
            month: dataPoint.month,
            year: dataPoint.year,
            income: 0,
            expense: 0,
            noi: 0,
            breakdown: []
          });
        }

        const monthlyData = monthlyDataMap.get(monthKey)!;
        monthlyData.breakdown.push(dataPoint);
        
        if (dataPoint.category === 'income') {
          monthlyData.income += dataPoint.value;
        } else if (dataPoint.category === 'expense') {
          monthlyData.expense += dataPoint.value;
        }
        
        monthlyData.noi = monthlyData.income - monthlyData.expense;
      }
    }

    // Convert map to array and sort by date
    const monthlyData = Array.from(monthlyDataMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return this.monthToNumber(a.month) - this.monthToNumber(b.month);
      });

    // Calculate totals
    const totalIncome = monthlyData.reduce((sum, month) => sum + month.income, 0);
    const totalExpense = monthlyData.reduce((sum, month) => sum + month.expense, 0);
    const totalNOI = totalIncome - totalExpense;

    return {
      propertyId: property.id,
      propertyName: property.name,
      monthlyData,
      totalIncome,
      totalExpense,
      totalNOI,
      csvTypes,
      activeRecords: activeRecords.length
    };
  }

  private extractChartDataPoints(
    property: PropertyInfo,
    record: PropertyCSVRecord
  ): ChartDataPoint[] {
    const dataPoints: ChartDataPoint[] = [];
    const data = record.data || [];
    const categorization = record.categorization || { buckets: { income: { individualItems: [] }, expense: { individualItems: [] }, other: { individualItems: [] } } };

    // Extract month/year from metadata or data
    const { year, month } = this.extractPeriodFromRecord(record);

    // Process individual items from categorization
    const incomeItems = categorization.buckets?.income?.individualItems || [];
    const expenseItems = categorization.buckets?.expense?.individualItems || [];
    const otherItems = categorization.buckets?.other?.individualItems || [];

    // Add income items
    incomeItems.forEach((item: any) => {
      const value = this.extractValueFromItem(item, record);
      if (value !== 0) {
        dataPoints.push({
          propertyId: property.id,
          propertyName: property.name,
          csvType: record.csvType,
          accountName: item['Account Name'] || item['account_name'] || 'Unknown',
          month: month || 'Unknown',
          year: year || new Date().getFullYear(),
          value,
          category: 'income',
          isActive: record.isActive
        });
      }
    });

    // Add expense items
    expenseItems.forEach((item: any) => {
      const value = this.extractValueFromItem(item, record);
      if (value !== 0) {
        dataPoints.push({
          propertyId: property.id,
          propertyName: property.name,
          csvType: record.csvType,
          accountName: item['Account Name'] || item['account_name'] || 'Unknown',
          month: month || 'Unknown',
          year: year || new Date().getFullYear(),
          value,
          category: 'expense',
          isActive: record.isActive
        });
      }
    });

    // Add other items
    otherItems.forEach((item: any) => {
      const value = this.extractValueFromItem(item, record);
      if (value !== 0) {
        dataPoints.push({
          propertyId: property.id,
          propertyName: property.name,
          csvType: record.csvType,
          accountName: item['Account Name'] || item['account_name'] || 'Unknown',
          month: month || 'Unknown',
          year: year || new Date().getFullYear(),
          value,
          category: 'other',
          isActive: record.isActive
        });
      }
    });

    return dataPoints;
  }

  private extractPeriodFromRecord(record: PropertyCSVRecord): { year?: number; month?: string } {
    // Try to get from metadata first
    if (record.metadata?.year && record.metadata?.month) {
      return {
        year: record.metadata.year,
        month: this.numberToMonth(record.metadata.month)
      };
    }

    // Try to extract from data
    const data = record.data || [];
    for (const row of data) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string') {
          const dateMatch = value.match(/(\d{4})[-\/](\d{1,2})/);
          if (dateMatch) {
            return {
              year: parseInt(dateMatch[1]),
              month: this.numberToMonth(parseInt(dateMatch[2]))
            };
          }
        }
      }
    }

    // Default to current period
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: this.numberToMonth(now.getMonth() + 1)
    };
  }

  private extractValueFromItem(item: any, record: PropertyCSVRecord): number {
    // Look for common total column names
    const totalColumns = ['Total', 'total', 'Amount', 'amount', 'Value', 'value'];
    
    for (const col of totalColumns) {
      if (item[col] !== undefined) {
        return this.parseNumericValue(item[col]);
      }
    }

    // Look for monthly columns and sum them
    let total = 0;
    for (const [key, value] of Object.entries(item)) {
      if (key !== 'Account Name' && key !== 'account_name' && key !== 'Account') {
        const numValue = this.parseNumericValue(value);
        if (!isNaN(numValue)) {
          total += numValue;
        }
      }
    }

    return total;
  }

  private parseNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove common formatting
      const cleaned = value.replace(/[$,]/g, '').replace(/[()]/g, '-');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private monthToNumber(month: string): number {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(month) + 1;
  }

  private numberToMonth(num: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[num - 1] || 'Unknown';
  }

  private extractAllMonths(propertyData: PropertyChartData[]): string[] {
    const allMonths = new Set<string>();
    propertyData.forEach(property => {
      property.monthlyData.forEach(month => {
        allMonths.add(`${month.year}-${month.month}`);
      });
    });
    return Array.from(allMonths).sort();
  }

  private calculateGlobalTotals(propertyData: PropertyChartData[]): {
    income: number;
    expense: number;
    noi: number;
  } {
    const totals = propertyData.reduce(
      (acc, property) => ({
        income: acc.income + property.totalIncome,
        expense: acc.expense + property.totalExpense,
        noi: acc.noi + property.totalNOI
      }),
      { income: 0, expense: 0, noi: 0 }
    );
    return totals;
  }

  async selectProperty(propertyId: string): Promise<void> {
    const cached = this.cache.get('consolidated');
    if (cached) {
      const selectedProperty = cached.properties.find(p => p.propertyId === propertyId);
      if (selectedProperty) {
        cached.selectedProperty = selectedProperty;
        this.cache.set('consolidated', cached);
        this.notifySubscribers(cached);
      }
    }
  }

  getCachedData(): ConsolidatedChartData | null {
    return this.cache.get('consolidated') || null;
  }

  // Chart-specific data formatters
  formatForMultiBucketChart(propertyData: PropertyChartData): any {
    const datasets = [];
    const labels = propertyData.monthlyData.map(m => `${m.month} ${m.year}`);

    // Income dataset
    datasets.push({
      label: 'Income',
      data: propertyData.monthlyData.map(m => m.income),
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      borderColor: 'rgba(34, 197, 94, 1)',
      borderWidth: 2,
      fill: false
    });

    // Expense dataset
    datasets.push({
      label: 'Expenses',
      data: propertyData.monthlyData.map(m => m.expense),
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderColor: 'rgba(239, 68, 68, 1)',
      borderWidth: 2,
      fill: false
    });

    // NOI dataset
    datasets.push({
      label: 'Net Operating Income',
      data: propertyData.monthlyData.map(m => m.noi),
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      fill: false
    });

    return {
      labels,
      datasets,
      propertyName: propertyData.propertyName,
      totalIncome: propertyData.totalIncome,
      totalExpense: propertyData.totalExpense,
      totalNOI: propertyData.totalNOI
    };
  }

  formatForRevenueChart(propertyData: PropertyChartData): any {
    const labels = propertyData.monthlyData.map(m => `${m.month} ${m.year}`);
    
    // Group by account name for detailed breakdown
    const accountGroups = new Map<string, number[]>();
    
    propertyData.monthlyData.forEach(month => {
      month.breakdown.forEach(point => {
        if (point.category === 'income') {
          if (!accountGroups.has(point.accountName)) {
            accountGroups.set(point.accountName, new Array(propertyData.monthlyData.length).fill(0));
          }
          const monthIndex = propertyData.monthlyData.indexOf(month);
          accountGroups.get(point.accountName)![monthIndex] += point.value;
        }
      });
    });

    const datasets = Array.from(accountGroups.entries()).map(([accountName, values], index) => {
      const colors = [
        'rgba(34, 197, 94, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(5, 150, 105, 0.8)',
        'rgba(4, 120, 87, 0.8)',
        'rgba(6, 95, 70, 0.8)'
      ];
      
      return {
        label: `${accountName} (${propertyData.propertyName})`,
        data: values,
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace('0.8', '1'),
        borderWidth: 1
      };
    });

    return {
      labels,
      datasets,
      propertyName: propertyData.propertyName,
      totalRevenue: propertyData.totalIncome
    };
  }

  formatForTimeSeriesChart(propertyData: PropertyChartData): any {
    const labels = propertyData.monthlyData.map(m => `${m.month} ${m.year}`);
    
    return {
      labels,
      datasets: [
        {
          label: `Income - ${propertyData.propertyName}`,
          data: propertyData.monthlyData.map(m => m.income),
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          fill: false
        },
        {
          label: `Expenses - ${propertyData.propertyName}`,
          data: propertyData.monthlyData.map(m => m.expense),
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
          fill: false
        },
        {
          label: `NOI - ${propertyData.propertyName}`,
          data: propertyData.monthlyData.map(m => m.noi),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          fill: false
        }
      ]
    };
  }
}

export const propertyChartDataService = new PropertyChartDataService();
