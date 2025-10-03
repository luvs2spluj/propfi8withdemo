import { getCSVData } from '../lib/supabase';

export interface UnifiedCSVData {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  isActive: boolean;
  data: any;
  categorization?: {
    income: any[];
    expense: any[];
    other: any[];
    totals: any;
  };
  chartData?: {
    incomeItems: any[];
    expenseItems: any[];
    otherItems: any[];
    totals: any;
  };
}

export interface ChartDataPoint {
  name: string;
  value: number;
  category: 'income' | 'expense' | 'other';
  month?: string;
  account?: string;
}

class UnifiedCSVDataService {
  private static instance: UnifiedCSVDataService;
  private csvData: UnifiedCSVData[] = [];
  private listeners: Array<() => void> = [];

  static getInstance(): UnifiedCSVDataService {
    if (!UnifiedCSVDataService.instance) {
      UnifiedCSVDataService.instance = new UnifiedCSVDataService();
    }
    return UnifiedCSVDataService.instance;
  }

  // Subscribe to data changes
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of data changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Load CSV data from multiple sources
  async loadCSVData(): Promise<UnifiedCSVData[]> {
    try {
      console.log('🔄 Loading unified CSV data...');
      
      // Load from Supabase
      const supabaseCSVs = await getCSVData();
      console.log('📊 Supabase CSVs:', supabaseCSVs.length);

      // Load from localStorage (budget importer data)
      const budgetCSVs = this.loadBudgetImporterData();
      console.log('💰 Budget Importer CSVs:', budgetCSVs.length);

      // Combine and deduplicate
      const allCSVs = [...supabaseCSVs, ...budgetCSVs];
      const uniqueCSVs = this.deduplicateCSVs(allCSVs);

      this.csvData = uniqueCSVs;
      this.notifyListeners();
      
      console.log('✅ Unified CSV data loaded:', uniqueCSVs.length, 'files');
      return uniqueCSVs;
    } catch (error) {
      console.error('Error loading unified CSV data:', error);
      return [];
    }
  }

  // Load budget importer data from localStorage
  private loadBudgetImporterData(): UnifiedCSVData[] {
    try {
      const storedCSVs = localStorage.getItem('uploadedCSVs');
      if (!storedCSVs) return [];

      const budgetCSVs = JSON.parse(storedCSVs);
      return budgetCSVs.map((csv: any) => ({
        id: csv.id,
        fileName: csv.name,
        fileType: csv.type || 'budget',
        uploadedAt: csv.uploadedAt,
        isActive: true,
        data: csv.data,
        categorization: csv.categorization,
        chartData: this.convertBudgetDataToChartData(csv.data)
      }));
    } catch (error) {
      console.error('Error loading budget importer data:', error);
      return [];
    }
  }

  // Convert budget data to chart data format
  private convertBudgetDataToChartData(budgetData: any): any {
    if (!budgetData?.buckets) return null;

    return {
      incomeItems: budgetData.buckets.income?.individualItems || [],
      expenseItems: budgetData.buckets.expense?.individualItems || [],
      otherItems: budgetData.buckets.other?.individualItems || [],
      totals: budgetData.buckets
    };
  }

  // Deduplicate CSVs by fileName and uploadedAt
  private deduplicateCSVs(csvs: any[]): UnifiedCSVData[] {
    const seen = new Set();
    return csvs.filter(csv => {
      const key = `${csv.fileName || csv.file_name}_${csv.uploadedAt || csv.uploaded_at}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }).map(csv => this.normalizeCSVFormat(csv));
  }

  // Normalize CSV format from different sources
  private normalizeCSVFormat(csv: any): UnifiedCSVData {
    return {
      id: csv.id,
      fileName: csv.fileName || csv.file_name,
      fileType: csv.fileType || csv.file_type || 'unknown',
      uploadedAt: csv.uploadedAt || csv.uploaded_at,
      isActive: csv.isActive !== false,
      data: csv.data || csv.preview_data,
      categorization: csv.categorization,
      chartData: csv.chartData || this.convertBudgetDataToChartData(csv.data)
    };
  }

  // Get all active CSV data
  getActiveCSVs(): UnifiedCSVData[] {
    return this.csvData.filter(csv => csv.isActive);
  }

  // Get CSV data for charts
  getChartData(): ChartDataPoint[] {
    const chartData: ChartDataPoint[] = [];
    
    this.getActiveCSVs().forEach(csv => {
      if (csv.chartData) {
        // Add income items
        csv.chartData.incomeItems.forEach((item: any) => {
          chartData.push({
            name: item['Account Name'] || 'Unknown',
            value: this.parseNumericValue(item.Total || item['Total'] || 0),
            category: 'income',
            account: item['Account Name']
          });
        });

        // Add expense items
        csv.chartData.expenseItems.forEach((item: any) => {
          chartData.push({
            name: item['Account Name'] || 'Unknown',
            value: this.parseNumericValue(item.Total || item['Total'] || 0),
            category: 'expense',
            account: item['Account Name']
          });
        });

        // Add other items
        csv.chartData.otherItems.forEach((item: any) => {
          chartData.push({
            name: item['Account Name'] || 'Unknown',
            value: this.parseNumericValue(item.Total || item['Total'] || 0),
            category: 'other',
            account: item['Account Name']
          });
        });
      }
    });

    return chartData;
  }

  // Parse numeric value from various formats
  private parseNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and parse
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // Get revenue data for charts
  getRevenueData(): ChartDataPoint[] {
    return this.getChartData().filter(item => item.category === 'income');
  }

  // Get expense data for charts
  getExpenseData(): ChartDataPoint[] {
    return this.getChartData().filter(item => item.category === 'expense');
  }

  // Get occupancy data (placeholder - would need specific occupancy CSV format)
  getOccupancyData(): ChartDataPoint[] {
    // This would need to be implemented based on occupancy CSV format
    return [];
  }

  // Toggle CSV active status
  async toggleCSVActive(csvId: string): Promise<boolean> {
    try {
      const csv = this.csvData.find(c => c.id === csvId);
      if (csv) {
        csv.isActive = !csv.isActive;
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling CSV active status:', error);
      return false;
    }
  }

  // Delete CSV
  async deleteCSV(csvId: string): Promise<boolean> {
    try {
      console.log('🗑️ UnifiedCSVDataService: Deleting CSV:', csvId);
      
      // Find the CSV to delete
      const csvToDelete = this.csvData.find(csv => csv.id === csvId);
      if (!csvToDelete) {
        console.log('❌ CSV not found in memory:', csvId);
        return false;
      }

      console.log('📋 CSV to delete:', csvToDelete.fileName);

      // Remove from Supabase if it exists there
      try {
        const { deleteCSVData } = await import('../lib/supabase');
        await deleteCSVData(csvId);
        console.log('✅ CSV deleted from Supabase');
      } catch (error) {
        console.log('⚠️ CSV not found in Supabase or deletion failed:', error);
      }
      
      // Remove from localStorage (budget importer data)
      const storedCSVs = localStorage.getItem('uploadedCSVs');
      if (storedCSVs) {
        const budgetCSVs = JSON.parse(storedCSVs);
        const updatedCSVs = budgetCSVs.filter((csv: any) => csv.id !== csvId);
        localStorage.setItem('uploadedCSVs', JSON.stringify(updatedCSVs));
        console.log('✅ CSV deleted from localStorage uploadedCSVs');
      }

      // Also remove from buckets localStorage
      const bucketsData = localStorage.getItem('buckets');
      if (bucketsData && csvToDelete.fileType === 'budget') {
        localStorage.removeItem('buckets');
        console.log('✅ Budget buckets cleared from localStorage');
      }

      // Remove from memory
      this.csvData = this.csvData.filter(csv => csv.id !== csvId);
      console.log('✅ CSV removed from memory. Remaining CSVs:', this.csvData.length);
      
      // Notify subscribers
      this.notifyListeners();
      
      // Trigger dashboard update
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { 
          action: 'csv_deleted',
          csvId: csvId,
          fileName: csvToDelete.fileName
        } 
      }));
      
      console.log('✅ CSV deleted successfully:', csvToDelete.fileName);
      return true;
    } catch (error) {
      console.error('❌ Error deleting CSV:', error);
      return false;
    }
  }

  // Get CSV by ID
  getCSVById(csvId: string): UnifiedCSVData | undefined {
    return this.csvData.find(csv => csv.id === csvId);
  }

  // Get CSV statistics
  getCSVStats(): {
    total: number;
    active: number;
    inactive: number;
    byType: { [key: string]: number };
  } {
    const stats = {
      total: this.csvData.length,
      active: this.csvData.filter(csv => csv.isActive).length,
      inactive: this.csvData.filter(csv => !csv.isActive).length,
      byType: {} as { [key: string]: number }
    };

    this.csvData.forEach(csv => {
      stats.byType[csv.fileType] = (stats.byType[csv.fileType] || 0) + 1;
    });

    return stats;
  }
}

export const unifiedCSVDataService = UnifiedCSVDataService.getInstance();
