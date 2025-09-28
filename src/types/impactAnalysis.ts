/**
 * Impact Analysis Type Definitions
 * 
 * Types for the impact-based expense/income breakdown system
 */

export interface LineItem {
  accountName: string;
  totalAmount: number;
  percentageOfTotal: number;
  monthlyBreakdown: { [month: string]: number };
  csvSource: string;
  category?: 'income' | 'expense';
}

export interface ImpactBucket {
  top20: LineItem[];
  top50: LineItem[];
  top80: LineItem[];
  bottom20: LineItem[];
  totalAmount: number;
  itemCount: number;
}

export interface ImpactAnalysis {
  income: ImpactBucket;
  expenses: ImpactBucket;
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface ImpactSummary {
  percentile: 'top20' | 'top50' | 'top80' | 'bottom20';
  totalAmount: number;
  percentageOfTotal: number;
  itemCount: number;
  averagePerItem: number;
}

export interface MonthlyTrend {
  month: string;
  amount: number;
  percentage: number;
}

export interface ImpactAnalysisFilters {
  dateRange: {
    start: string;
    end: string;
  };
  minAmount?: number;
  maxAmount?: number;
  csvSources?: string[];
}

export interface ImpactAnalysisConfig {
  percentiles: number[]; // [20, 50, 80]
  sortOrder: 'desc' | 'asc';
  includeZeroAmounts: boolean;
  groupByMonth: boolean;
}
