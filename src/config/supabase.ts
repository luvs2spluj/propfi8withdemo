import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://iqwhrvtcrseidfyznqaf.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table names
export const TABLES = {
  PROPERTIES: 'properties',
  PROPERTY_DATA: 'property_data',
  CSV_UPLOADS: 'csv_uploads',
  USERS: 'users',
  ANALYTICS: 'analytics'
} as const;

// Supabase service functions
export class SupabaseService {
  // Properties CRUD operations
  static async getProperties() {
    const { data, error } = await supabase
      .from(TABLES.PROPERTIES)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  }

  static async addProperty(property: any) {
    const { data, error } = await supabase
      .from(TABLES.PROPERTIES)
      .insert([property])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  }

  static async updateProperty(id: string, updates: any) {
    const { data, error } = await supabase
      .from(TABLES.PROPERTIES)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  }

  static async deleteProperty(id: string) {
    const { error } = await supabase
      .from(TABLES.PROPERTIES)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }

  // Property data operations
  static async getPropertyData(propertyId: string) {
    const { data, error } = await supabase
      .from(TABLES.PROPERTY_DATA)
      .select('*')
      .eq('property_id', propertyId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  }

  static async addPropertyData(data: any[]) {
    const { data: result, error } = await supabase
      .from(TABLES.PROPERTY_DATA)
      .insert(data)
      .select();
    
    if (error) throw error;
    return { success: true, data: result };
  }

  // CSV upload tracking
  static async getUploadHistory(propertyId?: string) {
    let query = supabase
      .from(TABLES.CSV_UPLOADS)
      .select('*')
      .order('uploaded_at', { ascending: false });
    
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data };
  }

  static async addUploadRecord(record: any) {
    const { data, error } = await supabase
      .from(TABLES.CSV_UPLOADS)
      .insert([record])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  }

  // Analytics and reporting
  static async getAnalytics(propertyId?: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from(TABLES.PROPERTY_DATA)
      .select('*');
    
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data };
  }
}

export default SupabaseService;
