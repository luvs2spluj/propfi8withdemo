/**
 * Impact Analysis Service
 * 
 * Calculates percentile-based breakdowns of income and expense line items
 * by absolute dollar value to identify the most impactful items.
 */

import { 
  LineItem, 
  ImpactAnalysis, 
  ImpactBucket, 
  ImpactSummary,
  MonthlyTrend,
  ImpactAnalysisFilters,
  ImpactAnalysisConfig
} from '../types/impactAnalysis';
import { getCSVData } from '../lib/supabase';

export class ImpactAnalysisService {
  private defaultConfig: ImpactAnalysisConfig = {
    percentiles: [20, 50, 80],
    sortOrder: 'desc',
    includeZeroAmounts: false,
    groupByMonth: true
  };

  /**
   * Main function to generate impact analysis
   */
  async generateImpactAnalysis(
    propertyId: string,
    filters?: ImpactAnalysisFilters,
    config?: Partial<ImpactAnalysisConfig>
  ): Promise<ImpactAnalysis> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      // Get CSV data from Supabase
      const csvData = await getCSVData(propertyId);
      
      if (!csvData || csvData.length === 0) {
        throw new Error('No CSV data found for property');
      }

      // Process all CSV data into line items
      const allLineItems = this.processCSVDataToLineItems(csvData, filters);
      
      // Separate income and expense items
      const incomeItems = allLineItems.filter(item => item.category === 'income');
      const expenseItems = allLineItems.filter(item => item.category === 'expense');
      
      // Create impact buckets for each category
      const incomeImpact = this.createImpactBuckets(incomeItems, finalConfig);
      const expenseImpact = this.createImpactBuckets(expenseItems, finalConfig);
      
      return {
        income: incomeImpact,
        expenses: expenseImpact,
        generatedAt: new Date().toISOString(),
        dateRange: this.calculateDateRange(csvData)
      };
      
    } catch (error) {
      console.error('Error generating impact analysis:', error);
      throw error;
    }
  }

  /**
   * Process CSV data into line items with monthly breakdowns
   */
  private processCSVDataToLineItems(
    csvData: any[], 
    filters?: ImpactAnalysisFilters
  ): LineItem[] {
    const lineItemMap = new Map<string, LineItem>();
    
    csvData.forEach(csv => {
      const accountCategories = csv.account_categories || {};
      const previewData = csv.preview_data || [];
      
      // Process each account in the CSV
      Object.entries(accountCategories).forEach(([accountName, category]) => {
        const accountData = previewData.find((row: any) => 
          row.account_name === accountName
        );
        
        if (!accountData) return;
        
        const timeSeries = accountData.time_series || {};
        const monthlyBreakdown: { [month: string]: number } = {};
        let totalAmount = 0;
        
        // Process monthly data
        Object.entries(timeSeries).forEach(([month, value]) => {
          const amount = this.parseAmount(value);
          if (amount !== null) {
            monthlyBreakdown[month] = amount;
            totalAmount += Math.abs(amount); // Use absolute value for impact analysis
          }
        });
        
        // Skip zero amounts if configured
        if (totalAmount === 0 && !this.defaultConfig.includeZeroAmounts) {
          return;
        }
        
        // Apply filters
        if (filters) {
          if (filters.minAmount && totalAmount < filters.minAmount) return;
          if (filters.maxAmount && totalAmount > filters.maxAmount) return;
          if (filters.csvSources && !filters.csvSources.includes(csv.file_name)) return;
        }
        
        // Create or update line item
        const key = `${accountName}_${csv.file_name}`;
        if (lineItemMap.has(key)) {
          const existing = lineItemMap.get(key)!;
          existing.totalAmount += totalAmount;
          Object.entries(monthlyBreakdown).forEach(([month, amount]) => {
            existing.monthlyBreakdown[month] = (existing.monthlyBreakdown[month] || 0) + amount;
          });
        } else {
          lineItemMap.set(key, {
            accountName,
            totalAmount,
            percentageOfTotal: 0, // Will be calculated later
            monthlyBreakdown,
            csvSource: csv.file_name,
            category: this.determineCategory(accountName, category)
          });
        }
      });
    });
    
    return Array.from(lineItemMap.values());
  }

  /**
   * Create impact buckets based on percentiles
   */
  private createImpactBuckets(
    items: LineItem[], 
    config: ImpactAnalysisConfig
  ): ImpactBucket {
    if (items.length === 0) {
      return {
        top20: [],
        top50: [],
        top80: [],
        bottom20: [],
        totalAmount: 0,
        itemCount: 0
      };
    }
    
    // Sort items by total amount
    const sortedItems = [...items].sort((a, b) => 
      config.sortOrder === 'desc' ? b.totalAmount - a.totalAmount : a.totalAmount - b.totalAmount
    );
    
    const totalAmount = sortedItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const itemCount = sortedItems.length;
    
    // Calculate percentages
    sortedItems.forEach(item => {
      item.percentageOfTotal = totalAmount > 0 ? (item.totalAmount / totalAmount) * 100 : 0;
    });
    
    // Calculate percentile cutoffs
    const top20Count = Math.ceil(itemCount * 0.2);
    const top50Count = Math.ceil(itemCount * 0.5);
    const top80Count = Math.ceil(itemCount * 0.8);
    
    return {
      top20: sortedItems.slice(0, top20Count),
      top50: sortedItems.slice(0, top50Count),
      top80: sortedItems.slice(0, top80Count),
      bottom20: sortedItems.slice(top80Count),
      totalAmount,
      itemCount
    };
  }

  /**
   * Generate impact summaries for each percentile
   */
  generateImpactSummaries(bucket: ImpactBucket): ImpactSummary[] {
    const summaries: ImpactSummary[] = [];
    
    [bucket.top20, bucket.top50, bucket.top80, bucket.bottom20].forEach((items, index) => {
      const percentile = ['top20', 'top50', 'top80', 'bottom20'][index] as keyof ImpactBucket;
      const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
      const percentageOfTotal = bucket.totalAmount > 0 ? (totalAmount / bucket.totalAmount) * 100 : 0;
      
      summaries.push({
        percentile: percentile as 'top20' | 'top50' | 'top80' | 'bottom20',
        totalAmount,
        percentageOfTotal,
        itemCount: items.length,
        averagePerItem: items.length > 0 ? totalAmount / items.length : 0
      });
    });
    
    return summaries;
  }

  /**
   * Get monthly trends for a specific line item
   */
  getMonthlyTrends(lineItem: LineItem): MonthlyTrend[] {
    const trends: MonthlyTrend[] = [];
    const totalAmount = lineItem.totalAmount;
    
    Object.entries(lineItem.monthlyBreakdown).forEach(([month, amount]) => {
      trends.push({
        month,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
      });
    });
    
    return trends.sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Export impact analysis to CSV format
   */
  exportToCSV(impactAnalysis: ImpactAnalysis): string {
    const headers = [
      'Category',
      'Percentile',
      'Account Name',
      'Total Amount',
      'Percentage of Total',
      'CSV Source',
      'Monthly Breakdown'
    ];
    
    const rows: string[] = [headers.join(',')];
    
    // Process income items
    ['top20', 'top50', 'top80', 'bottom20'].forEach(percentile => {
      const items = impactAnalysis.income[percentile as keyof ImpactBucket] as LineItem[];
      items.forEach(item => {
        const monthlyBreakdown = Object.entries(item.monthlyBreakdown)
          .map(([month, amount]) => `${month}:${amount}`)
          .join(';');
        
        rows.push([
          'Income',
          percentile,
          `"${item.accountName}"`,
          item.totalAmount,
          item.percentageOfTotal.toFixed(2),
          `"${item.csvSource}"`,
          `"${monthlyBreakdown}"`
        ].join(','));
      });
    });
    
    // Process expense items
    ['top20', 'top50', 'top80', 'bottom20'].forEach(percentile => {
      const items = impactAnalysis.expenses[percentile as keyof ImpactBucket] as LineItem[];
      items.forEach(item => {
        const monthlyBreakdown = Object.entries(item.monthlyBreakdown)
          .map(([month, amount]) => `${month}:${amount}`)
          .join(';');
        
        rows.push([
          'Expense',
          percentile,
          `"${item.accountName}"`,
          item.totalAmount,
          item.percentageOfTotal.toFixed(2),
          `"${item.csvSource}"`,
          `"${monthlyBreakdown}"`
        ].join(','));
      });
    });
    
    return rows.join('\n');
  }

  /**
   * Helper methods
   */
  private parseAmount(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    
    const num = parseFloat(value.toString().replace(/[,$]/g, ''));
    return isNaN(num) ? null : num;
  }

  private determineCategory(accountName: string, category: any): 'income' | 'expense' {
    const name = accountName.toLowerCase();
    
    // Check for income indicators
    if (name.includes('rent') || name.includes('revenue') || name.includes('income') ||
        name.includes('tenant') || name.includes('resident') || name.includes('rental') ||
        name.includes('fee') || name.includes('charge')) {
      return 'income';
    }
    
    // Check for expense indicators
    if (name.includes('expense') || name.includes('cost') || name.includes('maintenance') ||
        name.includes('repair') || name.includes('utility') || name.includes('insurance') ||
        name.includes('tax') || name.includes('management')) {
      return 'expense';
    }
    
    // Default based on category if available
    if (typeof category === 'string') {
      return category.toLowerCase().includes('income') ? 'income' : 'expense';
    }
    
    // Default to expense for safety
    return 'expense';
  }

  private calculateDateRange(csvData: any[]): { start: string; end: string } {
    let startDate = new Date();
    let endDate = new Date(0);
    
    csvData.forEach(csv => {
      const previewData = csv.preview_data || [];
      previewData.forEach((row: any) => {
        const timeSeries = row.time_series || {};
        Object.keys(timeSeries).forEach(month => {
          const date = new Date(month);
          if (date < startDate) startDate = date;
          if (date > endDate) endDate = date;
        });
      });
    });
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  }
}

export const impactAnalysisService = new ImpactAnalysisService();
