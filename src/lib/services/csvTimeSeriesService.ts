import { supabase } from '../../services/supabaseClient';

// Types
export interface CSVFile {
  id: string;
  organization_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_status: 'uploaded' | 'processing' | 'completed' | 'failed';
  uploaded_at: string;
  processed_at?: string;
  total_records: number;
  records_processed: number;
  records_skipped: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TimeSeriesData {
  id: string;
  csv_file_id: string;
  organization_id: string;
  account_name: string;
  bucket_category: 'income_item' | 'expense_item' | 'income_total' | 'expense_total' | 'cash_amount';
  month: number;
  year: number;
  amount: number;
  ai_category?: string;
  confidence_score?: number;
  is_total_bucket: boolean;
  created_at: string;
  updated_at: string;
}

export interface BucketAggregation {
  id: string;
  csv_file_id: string;
  organization_id: string;
  bucket_category: 'income_item' | 'expense_item' | 'income_total' | 'expense_total' | 'cash_amount';
  month: number;
  year: number;
  total_amount: number;
  item_count: number;
  unique_accounts: number;
  created_at: string;
  updated_at: string;
}

export interface AccountLineItem {
  id: string;
  csv_file_id: string;
  organization_id: string;
  account_name: string;
  bucket_category: 'income_item' | 'expense_item' | 'income_total' | 'expense_total' | 'cash_amount';
  month: number;
  year: number;
  amount: number;
  ai_category?: string;
  confidence_score?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyData {
  month: number;
  year: number;
  monthName: string;
  income_items: AccountLineItem[];
  expense_items: AccountLineItem[];
  income_total: number;
  expense_total: number;
  cash_amount: number;
  net_income: number;
}

export interface BucketBreakdown {
  bucket_category: string;
  total_amount: number;
  item_count: number;
  unique_accounts: number;
  line_items: AccountLineItem[];
}

// CSV Time Series Service
export class CSVTimeSeriesService {
  // Create a new CSV file record
  static async createCSVFile(fileData: {
    organization_id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_by?: string;
  }): Promise<CSVFile | null> {
    try {
      // For now, use the existing csv_uploads table
      const { data, error } = await supabase
        .from('csv_uploads')
        .insert([{
          file_name: fileData.file_name,
          file_type: fileData.file_type,
          file_size: fileData.file_size,
          upload_status: 'uploaded',
          records_processed: 0,
          records_skipped: 0,
          created_by: fileData.created_by
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating CSV file:', error);
        throw error;
      }

      // Transform to CSVFile format
      return {
        id: data.id,
        organization_id: fileData.organization_id,
        file_name: data.file_name,
        file_type: data.file_type,
        file_size: data.file_size,
        upload_status: data.upload_status,
        uploaded_at: data.uploaded_at,
        processed_at: data.processed_at,
        total_records: data.records_processed || 0,
        records_processed: data.records_processed || 0,
        records_skipped: data.records_skipped || 0,
        error_message: data.error_message,
        created_at: data.uploaded_at,
        updated_at: data.uploaded_at,
        created_by: data.created_by
      };
    } catch (error) {
      console.error('Failed to create CSV file:', error);
      throw error;
    }
  }

  // Get all CSV files for an organization
  static async getCSVFiles(organizationId: string): Promise<CSVFile[]> {
    try {
      // For now, use the existing csv_uploads table
      const { data, error } = await supabase
        .from('csv_uploads')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching CSV files:', error);
        throw error;
      }

      // Transform csv_uploads data to CSVFile format
      return (data || []).map((upload: any) => ({
        id: upload.id,
        organization_id: organizationId,
        file_name: upload.file_name,
        file_type: upload.file_type || 'general',
        file_size: upload.file_size || 0,
        upload_status: upload.upload_status || 'completed',
        uploaded_at: upload.uploaded_at,
        processed_at: upload.processed_at,
        total_records: upload.records_processed || 0,
        records_processed: upload.records_processed || 0,
        records_skipped: upload.records_skipped || 0,
        error_message: upload.error_message,
        created_at: upload.uploaded_at,
        updated_at: upload.uploaded_at,
        created_by: upload.created_by
      }));
    } catch (error) {
      console.error('Failed to get CSV files:', error);
      throw error;
    }
  }

  // Process and store time series data
  static async processTimeSeriesData(
    csvFileId: string,
    organizationId: string,
    processedData: any[],
    bucketAssignments: Record<string, string>
  ): Promise<boolean> {
    try {
      // For now, just update the csv_uploads table with the processed data
      // Store the bucket assignments and processed data in the existing table
      const { error } = await supabase
        .from('csv_uploads')
        .update({
          upload_status: 'completed',
          processed_at: new Date().toISOString(),
          records_processed: processedData.length,
          bucket_assignments: bucketAssignments,
          account_categories: processedData.reduce((acc, row) => {
            if (row.account_name && row.ai_category) {
              acc[row.account_name] = row.ai_category;
            }
            return acc;
          }, {} as Record<string, string>)
        })
        .eq('id', csvFileId);

      if (error) {
        console.error('Error updating CSV upload:', error);
        throw error;
      }

      console.log('✅ CSV data processed and stored successfully');
      return true;
    } catch (error) {
      console.error('Failed to process time series data:', error);
      throw error;
    }
  }

  // Get monthly data for a CSV file
  static async getMonthlyData(csvFileId: string): Promise<MonthlyData[]> {
    try {
      // For now, return mock data since we don't have the time series tables yet
      // This will be replaced once the tables are created
      const mockData: MonthlyData[] = [
        {
          month: 7,
          year: 2024,
          monthName: 'July',
          income_items: [],
          expense_items: [],
          income_total: 5000,
          expense_total: 3000,
          cash_amount: 2000,
          net_income: 2000
        },
        {
          month: 8,
          year: 2024,
          monthName: 'August',
          income_items: [],
          expense_items: [],
          income_total: 5500,
          expense_total: 3200,
          cash_amount: 2300,
          net_income: 2300
        }
      ];

      return mockData;
    } catch (error) {
      console.error('Failed to get monthly data:', error);
      throw error;
    }
  }

  // Get bucket breakdown for a CSV file
  static async getBucketBreakdown(csvFileId: string): Promise<BucketBreakdown[]> {
    try {
      // For now, return mock data since we don't have the time series tables yet
      // This will be replaced once the tables are created
      const mockData: BucketBreakdown[] = [
        {
          bucket_category: 'income_item',
          total_amount: 5000,
          item_count: 3,
          unique_accounts: 3,
          line_items: []
        },
        {
          bucket_category: 'expense_item',
          total_amount: 3000,
          item_count: 5,
          unique_accounts: 5,
          line_items: []
        },
        {
          bucket_category: 'income_total',
          total_amount: 5000,
          item_count: 1,
          unique_accounts: 1,
          line_items: []
        },
        {
          bucket_category: 'expense_total',
          total_amount: 3000,
          item_count: 1,
          unique_accounts: 1,
          line_items: []
        },
        {
          bucket_category: 'cash_amount',
          total_amount: 2000,
          item_count: 1,
          unique_accounts: 1,
          line_items: []
        }
      ];

      return mockData;
    } catch (error) {
      console.error('Failed to get bucket breakdown:', error);
      throw error;
    }
  }

  // Get line items for a specific bucket category
  static async getLineItemsByBucket(
    csvFileId: string,
    bucketCategory: string,
    month?: number,
    year?: number
  ): Promise<AccountLineItem[]> {
    try {
      // For now, return mock data since we don't have the time series tables yet
      // This will be replaced once the tables are created
      const mockData: AccountLineItem[] = [
        {
          id: '1',
          csv_file_id: csvFileId,
          organization_id: 'org-1',
          account_name: 'Rental Income',
          bucket_category: bucketCategory as any,
          month: month || 7,
          year: year || 2024,
          amount: 2000,
          ai_category: 'income',
          confidence_score: 0.85,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          csv_file_id: csvFileId,
          organization_id: 'org-1',
          account_name: 'Property Management Fee',
          bucket_category: bucketCategory as any,
          month: month || 7,
          year: year || 2024,
          amount: -200,
          ai_category: 'expense',
          confidence_score: 0.80,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      return mockData;
    } catch (error) {
      console.error('Failed to get line items:', error);
      throw error;
    }
  }

  // Delete CSV file and all related data
  static async deleteCSVFile(csvFileId: string): Promise<boolean> {
    try {
      // For now, just delete from csv_uploads table
      const { error } = await supabase
        .from('csv_uploads')
        .delete()
        .eq('id', csvFileId);

      if (error) {
        console.error('Failed to delete CSV file:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete CSV file:', error);
      throw error;
    }
  }

  // Get aggregated data across all CSV files for an organization
  static async getOrganizationAggregates(organizationId: string): Promise<{
    totalFiles: number;
    totalRecords: number;
    dateRange: { start: string; end: string };
    bucketTotals: Record<string, number>;
  }> {
    try {
      // For now, use csv_uploads table
      const { data: files } = await supabase
        .from('csv_uploads')
        .select('uploaded_at, records_processed')
        .eq('upload_status', 'completed');

      const totalFiles = files?.length || 0;
      const totalRecords = files?.reduce((sum, file) => sum + (file.records_processed || 0), 0) || 0;

      const dates = files?.map(f => new Date(f.uploaded_at)) || [];
      const dateRange = {
        start: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString() : '',
        end: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString() : ''
      };

      // Mock bucket totals for now
      const bucketTotals = {
        'income_item': 10000,
        'expense_item': 6000,
        'income_total': 10000,
        'expense_total': 6000,
        'cash_amount': 4000
      };

      return {
        totalFiles,
        totalRecords,
        dateRange,
        bucketTotals
      };
    } catch (error) {
      console.error('Failed to get organization aggregates:', error);
      throw error;
    }
  }
}
