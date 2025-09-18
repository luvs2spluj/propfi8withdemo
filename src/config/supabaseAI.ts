/**
 * Supabase Configuration for AI Parser Branch
 * 
 * This configuration creates a separate Supabase backend for the AI parser integration,
 * keeping it isolated from the main project branch.
 */

import { createClient } from '@supabase/supabase-js';

// AI Parser Branch Supabase Configuration
const SUPABASE_URL_AI = 'https://iqwhrvtcrseidfyznqaf.supabase.co';
const SUPABASE_ANON_KEY_AI = 'sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf';

// Create Supabase client for AI parser branch
export const supabaseAI = createClient(SUPABASE_URL_AI, SUPABASE_ANON_KEY_AI, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'horton-properties-ai-parser'
    }
  }
});

// Database table names for AI parser branch
export const AI_TABLES = {
  CSV_FILES: 'csv_files_ai',
  PARSED_DATA: 'parsed_data_ai',
  HEADER_MATCHES: 'header_matches_ai',
  PROPERTIES: 'properties_ai',
  PROCESSING_JOBS: 'processing_jobs_ai',
  USER_SESSIONS: 'user_sessions_ai'
} as const;

// AI Parser specific types
export interface CSVFileAI {
  id: string;
  file_name: string;
  file_size: number;
  property_id: string;
  property_name: string;
  upload_status: 'uploading' | 'processing' | 'completed' | 'failed';
  processing_mode: 'ai_parser' | 'traditional';
  ai_confidence: number;
  format_detected: 'month-column' | 'traditional';
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface ParsedDataAI {
  id: string;
  csv_file_id: string;
  account_name: string;
  period: string;
  amount: number;
  amount_raw: string;
  category: string;
  confidence_score: number;
  bucket_assignment: string;
  created_at: string;
}

export interface HeaderMatchAI {
  id: string;
  csv_file_id: string;
  original_header: string;
  suggested_bucket: string;
  confidence_score: number;
  alternative_buckets: any[];
  user_confirmed: boolean;
  user_override?: string;
  created_at: string;
}

export interface PropertyAI {
  id: string;
  name: string;
  address: string;
  type: string;
  total_units: number;
  ai_parser_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcessingJobAI {
  id: string;
  csv_file_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  ai_analysis: any;
  created_at: string;
  completed_at?: string;
}

// AI Parser Service Class
export class AIParserService {
  private supabase = supabaseAI;

  // CSV File Operations
  async uploadCSVFile(file: File, propertyId: string, propertyName: string): Promise<{ success: boolean; data?: CSVFileAI; error?: string }> {
    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await this.supabase.storage
        .from('csv-files-ai')
        .upload(fileName, file);

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      // Create CSV file record
      const csvFileData: Partial<CSVFileAI> = {
        file_name: file.name,
        file_size: file.size,
        property_id: propertyId,
        property_name: propertyName,
        upload_status: 'uploading',
        processing_mode: 'ai_parser',
        format_detected: 'traditional',
        ai_confidence: 0
      };

      const { data, error } = await this.supabase
        .from(AI_TABLES.CSV_FILES)
        .insert(csvFileData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getCSVFiles(propertyId?: string): Promise<{ success: boolean; data?: CSVFileAI[]; error?: string }> {
    try {
      let query = this.supabase
        .from(AI_TABLES.CSV_FILES)
        .select('*')
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Parsed Data Operations
  async saveParsedData(csvFileId: string, parsedData: any[]): Promise<{ success: boolean; data?: ParsedDataAI[]; error?: string }> {
    try {
      const dataToInsert = parsedData.map(row => ({
        csv_file_id: csvFileId,
        account_name: row.account_name,
        period: row.period,
        amount: row.amount,
        amount_raw: row.amount_raw,
        category: row.category,
        confidence_score: row.confidence_score || 0.8,
        bucket_assignment: row.bucket_assignment || 'unknown'
      }));

      const { data, error } = await this.supabase
        .from(AI_TABLES.PARSED_DATA)
        .insert(dataToInsert)
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getParsedData(csvFileId: string): Promise<{ success: boolean; data?: ParsedDataAI[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from(AI_TABLES.PARSED_DATA)
        .select('*')
        .eq('csv_file_id', csvFileId)
        .order('created_at', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Header Match Operations
  async saveHeaderMatches(csvFileId: string, headerMatches: any[]): Promise<{ success: boolean; data?: HeaderMatchAI[]; error?: string }> {
    try {
      const dataToInsert = headerMatches.map(match => ({
        csv_file_id: csvFileId,
        original_header: match.originalHeader,
        suggested_bucket: match.suggestedBucket,
        confidence_score: match.confidenceScore,
        alternative_buckets: match.alternativeBuckets,
        user_confirmed: false
      }));

      const { data, error } = await this.supabase
        .from(AI_TABLES.HEADER_MATCHES)
        .insert(dataToInsert)
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateHeaderMatchConfirmation(headerMatchId: string, userConfirmed: boolean, userOverride?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = { user_confirmed: userConfirmed };
      if (userOverride) {
        updateData.user_override = userOverride;
      }

      const { error } = await this.supabase
        .from(AI_TABLES.HEADER_MATCHES)
        .update(updateData)
        .eq('id', headerMatchId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Property Operations
  async createProperty(propertyData: Partial<PropertyAI>): Promise<{ success: boolean; data?: PropertyAI; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from(AI_TABLES.PROPERTIES)
        .insert({
          ...propertyData,
          ai_parser_enabled: true
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getProperties(): Promise<{ success: boolean; data?: PropertyAI[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from(AI_TABLES.PROPERTIES)
        .select('*')
        .eq('ai_parser_enabled', true)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Processing Job Operations
  async createProcessingJob(csvFileId: string, aiAnalysis: any): Promise<{ success: boolean; data?: ProcessingJobAI; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from(AI_TABLES.PROCESSING_JOBS)
        .insert({
          csv_file_id: csvFileId,
          status: 'processing',
          progress: 0,
          ai_analysis: aiAnalysis
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateProcessingJob(jobId: string, updates: Partial<ProcessingJobAI>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from(AI_TABLES.PROCESSING_JOBS)
        .update(updates)
        .eq('id', jobId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete Operations
  async deleteCSVFile(csvFileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete related data first (due to foreign key constraints)
      await this.supabase
        .from(AI_TABLES.PARSED_DATA)
        .delete()
        .eq('csv_file_id', csvFileId);

      await this.supabase
        .from(AI_TABLES.HEADER_MATCHES)
        .delete()
        .eq('csv_file_id', csvFileId);

      await this.supabase
        .from(AI_TABLES.PROCESSING_JOBS)
        .delete()
        .eq('csv_file_id', csvFileId);

      // Delete the CSV file record
      const { error } = await this.supabase
        .from(AI_TABLES.CSV_FILES)
        .delete()
        .eq('id', csvFileId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateCSVFile(csvFileId: string, updates: Partial<CSVFileAI>): Promise<{ success: boolean; data?: CSVFileAI; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from(AI_TABLES.CSV_FILES)
        .update(updates)
        .eq('id', csvFileId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateProperty(propertyId: string, updates: Partial<PropertyAI>): Promise<{ success: boolean; data?: PropertyAI; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from(AI_TABLES.PROPERTIES)
        .update(updates)
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async deleteProperty(propertyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete related CSV files first (due to foreign key constraints)
      const csvFilesResult = await this.supabase
        .from(AI_TABLES.CSV_FILES)
        .select('id')
        .eq('property_id', propertyId);

      if (csvFilesResult.data) {
        for (const csvFile of csvFilesResult.data) {
          await this.deleteCSVFile(csvFile.id);
        }
      }

      // Delete the property
      const { error } = await this.supabase
        .from(AI_TABLES.PROPERTIES)
        .delete()
        .eq('id', propertyId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Health Check
  async healthCheck(): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const { error } = await this.supabase
        .from(AI_TABLES.PROPERTIES)
        .select('count')
        .limit(1);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, status: 'healthy' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export default instance
export const aiParserService = new AIParserService();
