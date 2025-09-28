/**
 * Bucket Types and Definitions
 * 
 * Standardized bucket system for AI categorization and chart mapping
 */

export interface BucketDefinition {
  id: string;
  name: string;
  label: string;
  description: string;
  category: 'income' | 'expense' | 'cash' | 'metric';
  color: string;
  icon: string;
  emoji: string;
  calculation?: string;
}

export interface ChartBucketMapping {
  chartId: string;
  chartName: string;
  buckets: string[];
  primaryBucket?: string;
}

// Standardized bucket definitions
export const BUCKET_DEFINITIONS: Record<string, BucketDefinition> = {
  // Income Buckets
  'income_item': {
    id: 'income_item',
    name: 'Income Item',
    label: 'Income Item',
    description: 'Individual income line items (rent, fees, etc.)',
    category: 'income',
    color: 'bg-green-100 text-green-800',
    icon: '💰',
    emoji: '💰',
    calculation: 'Sum of individual income accounts'
  },
  'income_total': {
    id: 'income_total',
    name: 'Income Total',
    label: 'Income Total',
    description: 'Total income calculations and summaries',
    category: 'income',
    color: 'bg-green-100 text-green-800',
    icon: '📈',
    emoji: '📈',
    calculation: 'Sum of all income accounts'
  },
  'rental_income': {
    id: 'rental_income',
    name: 'Rental Income',
    label: 'Rental Income',
    description: 'Primary rental revenue from tenants',
    category: 'income',
    color: 'bg-green-100 text-green-800',
    icon: '🏠',
    emoji: '🏠',
    calculation: 'Sum of rental income accounts'
  },
  'other_income': {
    id: 'other_income',
    name: 'Other Income',
    label: 'Other Income',
    description: 'Additional income sources (fees, late charges, etc.)',
    category: 'income',
    color: 'bg-green-100 text-green-800',
    icon: '💵',
    emoji: '💵',
    calculation: 'Sum of other income accounts'
  },
  'total_income': {
    id: 'total_income',
    name: 'Total Income',
    label: 'Total Income',
    description: 'Sum of all income sources',
    category: 'income',
    color: 'bg-green-100 text-green-800',
    icon: '📊',
    emoji: '📊',
    calculation: 'Sum of all income accounts'
  },
  'total_operating_income': {
    id: 'total_operating_income',
    name: 'Total Operating Income',
    label: 'Operating Income',
    description: 'Total operating revenue',
    category: 'income',
    color: 'bg-emerald-100 text-emerald-800',
    icon: '📈',
    emoji: '📈',
    calculation: 'Sum of operating income accounts'
  },

  // Expense Buckets
  'expense_item': {
    id: 'expense_item',
    name: 'Expense Item',
    label: 'Expense Item',
    description: 'Individual expense line items (maintenance, utilities, etc.)',
    category: 'expense',
    color: 'bg-red-100 text-red-800',
    icon: '💸',
    emoji: '💸',
    calculation: 'Sum of individual expense accounts'
  },
  'expense_total': {
    id: 'expense_total',
    name: 'Expense Total',
    label: 'Expense Total',
    description: 'Total expense calculations and summaries',
    category: 'expense',
    color: 'bg-red-100 text-red-800',
    icon: '📉',
    emoji: '📉',
    calculation: 'Sum of all expense accounts'
  },
  'operating_expenses': {
    id: 'operating_expenses',
    name: 'Operating Expenses',
    label: 'Operating Expenses',
    description: 'Property operating costs',
    category: 'expense',
    color: 'bg-orange-100 text-orange-800',
    icon: '🔧',
    emoji: '🔧',
    calculation: 'Sum of operating expense accounts'
  },
  'maintenance_cost': {
    id: 'maintenance_cost',
    name: 'Maintenance Cost',
    label: 'Maintenance',
    description: 'Property maintenance and repair costs',
    category: 'expense',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '🔨',
    emoji: '🔨',
    calculation: 'Sum of maintenance accounts'
  },
  'utilities_cost': {
    id: 'utilities_cost',
    name: 'Utilities Cost',
    label: 'Utilities',
    description: 'Utility costs (water, electric, gas, etc.)',
    category: 'expense',
    color: 'bg-blue-100 text-blue-800',
    icon: '⚡',
    emoji: '⚡',
    calculation: 'Sum of utility accounts'
  },
  'insurance_cost': {
    id: 'insurance_cost',
    name: 'Insurance Cost',
    label: 'Insurance',
    description: 'Property insurance costs',
    category: 'expense',
    color: 'bg-purple-100 text-purple-800',
    icon: '🛡️',
    emoji: '🛡️',
    calculation: 'Sum of insurance accounts'
  },
  'property_tax': {
    id: 'property_tax',
    name: 'Property Tax',
    label: 'Property Tax',
    description: 'Property tax expenses',
    category: 'expense',
    color: 'bg-indigo-100 text-indigo-800',
    icon: '🏛️',
    emoji: '🏛️',
    calculation: 'Sum of property tax accounts'
  },

  // Cash Buckets
  'cash_amount': {
    id: 'cash_amount',
    name: 'Cash Amount',
    label: 'Cash Amount',
    description: 'Cash and cash equivalents',
    category: 'cash',
    color: 'bg-purple-100 text-purple-800',
    icon: '💳',
    emoji: '💳',
    calculation: 'Sum of cash accounts'
  },

  // Key Metrics
  'net_operating_income': {
    id: 'net_operating_income',
    name: 'Net Operating Income',
    label: 'Net Operating Income',
    description: 'NOI - Net Operating Income',
    category: 'metric',
    color: 'bg-emerald-100 text-emerald-800',
    icon: '💎',
    emoji: '💎',
    calculation: 'Total Operating Income - Total Operating Expenses'
  },
  'net_income': {
    id: 'net_income',
    name: 'Net Income',
    label: 'Net Income',
    description: 'Total net income',
    category: 'metric',
    color: 'bg-green-100 text-green-800',
    icon: '💰',
    emoji: '💰',
    calculation: 'Total Income - Total Expenses'
  }
};

// Chart to bucket mappings
export const CHART_BUCKET_MAPPINGS: ChartBucketMapping[] = [
  {
    chartId: 'revenue-chart',
    chartName: 'Revenue Trend',
    buckets: ['income_item', 'rental_income', 'other_income', 'total_income'],
    primaryBucket: 'total_income'
  },
  {
    chartId: 'occupancy-chart',
    chartName: 'Occupancy Rate',
    buckets: ['rental_income'], // Occupancy is derived from rental income
    primaryBucket: 'rental_income'
  },
  {
    chartId: 'cash-flow-chart',
    chartName: 'Cash Flow',
    buckets: ['total_operating_income', 'total_operating_expense', 'net_operating_income'],
    primaryBucket: 'net_operating_income'
  },
  {
    chartId: 'property-performance-chart',
    chartName: 'Property Performance',
    buckets: ['income_item', 'expense_item', 'maintenance_cost', 'utilities_cost', 'insurance_cost', 'property_tax'],
    primaryBucket: 'income_item'
  },
  {
    chartId: 'impact-trend-chart',
    chartName: 'Impact Trend',
    buckets: ['income_item', 'expense_item'],
    primaryBucket: 'income_item'
  }
];

// Helper functions
export const getBucketDefinition = (bucketId: string): BucketDefinition | undefined => {
  return BUCKET_DEFINITIONS[bucketId];
};

export const getChartBuckets = (chartId: string): string[] => {
  const mapping = CHART_BUCKET_MAPPINGS.find(m => m.chartId === chartId);
  return mapping?.buckets || [];
};

export const getPrimaryBucket = (chartId: string): string | undefined => {
  const mapping = CHART_BUCKET_MAPPINGS.find(m => m.chartId === chartId);
  return mapping?.primaryBucket;
};

export const getBucketIcon = (bucketId: string): string => {
  const bucket = getBucketDefinition(bucketId);
  return bucket?.emoji || '📊';
};

export const getBucketColor = (bucketId: string): string => {
  const bucket = getBucketDefinition(bucketId);
  return bucket?.color || 'bg-gray-100 text-gray-800';
};
