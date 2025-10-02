import { supabase } from '../../services/supabaseClient';

// User Preferences Types
export interface UserBucketPreference {
  id?: string;
  account_name: string;
  bucket: string;
  file_type: string;
  confidence_score: number;
  usage_count: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface CSVUserPreferences {
  csv_upload_id: string;
  bucket_assignments: Record<string, string>;
  included_items: Record<string, boolean>;
  account_categories: Record<string, string>;
  last_modified: string;
  user_id?: string;
}

// User Preferences Service
export class UserPreferencesService {
  // Save user bucket preference (overrides AI recommendations)
  static async saveBucketPreference(
    accountName: string,
    bucket: string,
    fileType: string = 'csv',
    userId?: string
  ): Promise<boolean> {
    try {
      const preference: Partial<UserBucketPreference> = {
        account_name: accountName,
        bucket,
        file_type: fileType,
        confidence_score: 1.0,
        usage_count: 1,
        updated_at: new Date().toISOString(),
        ...(userId && { user_id: userId })
      };

      const { error } = await supabase
        .from('ai_learning')
        .upsert(preference, {
          onConflict: userId ? 'file_type,account_name,user_id' : 'file_type,account_name'
        });

      if (error) {
        console.error('Error saving user bucket preference:', error);
        return false;
      }

      console.log('✅ User bucket preference saved:', { accountName, bucket, fileType, userId });
      return true;
    } catch (error) {
      console.error('Error saving user bucket preference:', error);
      return false;
    }
  }

  // Get user bucket preference (overrides AI recommendations)
  static async getBucketPreference(
    accountName: string,
    fileType: string = 'csv',
    userId?: string
  ): Promise<string | null> {
    try {
      let query = supabase
        .from('ai_learning')
        .select('user_category')
        .eq('account_name', accountName)
        .eq('file_type', fileType);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting user bucket preference:', error);
        return null;
      }

      return data?.user_category || null;
    } catch (error) {
      console.error('Error getting user bucket preference:', error);
      return null;
    }
  }

  // Get all user preferences for a file type
  static async getAllUserPreferences(
    fileType: string = 'csv',
    userId?: string
  ): Promise<UserBucketPreference[]> {
    try {
      let query = supabase
        .from('ai_learning')
        .select('*')
        .eq('file_type', fileType)
        .order('usage_count', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting all user preferences:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting all user preferences:', error);
      return [];
    }
  }

  // Save CSV-specific user preferences
  static async saveCSVUserPreferences(
    csvUploadId: string,
    bucketAssignments: Record<string, string>,
    includedItems: Record<string, boolean>,
    accountCategories: Record<string, string>,
    userId?: string
  ): Promise<boolean> {
    try {
      const preferences: Partial<CSVUserPreferences> = {
        csv_upload_id: csvUploadId,
        bucket_assignments: bucketAssignments,
        included_items: includedItems,
        account_categories: accountCategories,
        last_modified: new Date().toISOString(),
        ...(userId && { user_id: userId })
      };

      // Save to csv_uploads table with user preferences
      const { error } = await supabase
        .from('csv_uploads')
        .update({
          bucket_assignments: bucketAssignments,
          included_items: includedItems,
          account_categories: accountCategories,
          updated_at: new Date().toISOString()
        })
        .eq('id', csvUploadId);

      if (error) {
        console.error('Error saving CSV user preferences:', error);
        return false;
      }

      // Also save individual bucket preferences for future use
      for (const [accountName, bucket] of Object.entries(bucketAssignments)) {
        if (bucket && bucket !== 'exclude') {
          await this.saveBucketPreference(accountName, bucket, 'csv', userId);
        }
      }

      console.log('✅ CSV user preferences saved:', { csvUploadId, bucketCount: Object.keys(bucketAssignments).length });
      return true;
    } catch (error) {
      console.error('Error saving CSV user preferences:', error);
      return false;
    }
  }

  // Get CSV-specific user preferences
  static async getCSVUserPreferences(csvUploadId: string): Promise<CSVUserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('csv_uploads')
        .select('bucket_assignments, included_items, account_categories, updated_at')
        .eq('id', csvUploadId)
        .single();

      if (error) {
        console.error('Error getting CSV user preferences:', error);
        return null;
      }

      return {
        csv_upload_id: csvUploadId,
        bucket_assignments: data.bucket_assignments || {},
        included_items: data.included_items || {},
        account_categories: data.account_categories || {},
        last_modified: data.updated_at || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting CSV user preferences:', error);
      return null;
    }
  }

  // Apply user preferences to AI recommendations
  static async applyUserPreferences(
    accountName: string,
    aiRecommendation: string,
    fileType: string = 'csv',
    userId?: string
  ): Promise<{
    finalBucket: string;
    isUserOverride: boolean;
    confidence: number;
  }> {
    try {
      // First check for user preference
      const userPreference = await this.getBucketPreference(accountName, fileType, userId);
      
      if (userPreference) {
        return {
          finalBucket: userPreference,
          isUserOverride: true,
          confidence: 1.0
        };
      }

      // Fall back to AI recommendation
      return {
        finalBucket: aiRecommendation,
        isUserOverride: false,
        confidence: 0.7
      };
    } catch (error) {
      console.error('Error applying user preferences:', error);
      return {
        finalBucket: aiRecommendation,
        isUserOverride: false,
        confidence: 0.5
      };
    }
  }

  // Update usage count for a preference
  static async updatePreferenceUsage(
    accountName: string,
    fileType: string = 'csv',
    userId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('ai_learning')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('account_name', accountName)
        .eq('file_type', fileType);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        console.error('Error updating preference usage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating preference usage:', error);
      return false;
    }
  }

  // Delete user preference
  static async deleteBucketPreference(
    accountName: string,
    fileType: string = 'csv',
    userId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('ai_learning')
        .delete()
        .eq('account_name', accountName)
        .eq('file_type', fileType);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        console.error('Error deleting bucket preference:', error);
        return false;
      }

      console.log('✅ User bucket preference deleted:', { accountName, fileType, userId });
      return true;
    } catch (error) {
      console.error('Error deleting bucket preference:', error);
      return false;
    }
  }
}
