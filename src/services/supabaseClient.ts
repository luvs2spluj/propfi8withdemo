import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://iqwhrvtcrseidfyznqaf.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Direct Supabase API service for Vercel deployment
export class SupabaseApiService {
  // Get all properties
  async getProperties() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error('Supabase getProperties error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get property data
  async getPropertyData(propertyId: string) {
    try {
      const { data, error } = await supabase
        .from('property_data')
        .select('*')
        .eq('property_id', propertyId)
        .order('Date', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error('Supabase getPropertyData error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all properties with their data
  async getPropertiesWithData() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_data (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error('Supabase getPropertiesWithData error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get financial summary
  async getFinancialSummary(startDate?: string, endDate?: string) {
    try {
      let query = supabase
        .from('property_data')
        .select('*');

      if (startDate) {
        query = query.gte('Date', startDate);
      }
      if (endDate) {
        query = query.lte('Date', endDate);
      }

      const { data, error } = await query.order('Date', { ascending: true });

      if (error) throw error;

      // Calculate summary
      const summary = {
        totalRevenue: data?.reduce((sum, row) => sum + (parseFloat(row['Monthly Revenue']) || 0), 0) || 0,
        totalExpenses: data?.reduce((sum, row) => 
          sum + (parseFloat(row['Maintenance Cost']) || 0) + 
          (parseFloat(row['Utilities Cost']) || 0) + 
          (parseFloat(row['Insurance Cost']) || 0) + 
          (parseFloat(row['Property Tax']) || 0) + 
          (parseFloat(row['Other Expenses']) || 0), 0) || 0,
        totalNetIncome: data?.reduce((sum, row) => sum + (parseFloat(row['Net Income']) || 0), 0) || 0,
        avgOccupancy: data?.reduce((sum, row) => sum + (parseFloat(row['Occupancy Rate']) || 0), 0) / (data?.length || 1) || 0,
        recordCount: data?.length || 0
      };

      return {
        success: true,
        data: summary
      };
    } catch (error: any) {
      console.error('Supabase getFinancialSummary error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const supabaseApiService = new SupabaseApiService();
