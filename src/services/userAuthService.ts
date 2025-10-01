import { createClient } from '@supabase/supabase-js';
import { encryptionService } from './encryptionService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iqwhrvtcrseidfyznqaf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
  id: string;
  clerk_user_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  organization_id?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  clerk_organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  property_type?: string;
  created_at: string;
  updated_at: string;
}

export interface CSVUpload {
  id: string;
  user_id: string;
  filename: string;
  file_type?: string;
  upload_date: string;
  file_size?: number;
  processed: boolean;
  created_at: string;
}

export interface CSVData {
  id: string;
  user_id: string;
  csv_upload_id: string;
  account_name?: string;
  amount?: number;
  category?: string;
  subcategory?: string;
  is_income?: boolean;
  is_expense?: boolean;
  is_total?: boolean;
  row_index?: number;
  created_at: string;
}

export interface UserBucketTerm {
  id: string;
  user_id: string;
  bucket_key: string;
  term: string;
  created_at: string;
}

export interface UserCustomBucket {
  id: string;
  user_id: string;
  bucket_key: string;
  bucket_name: string;
  bucket_description?: string;
  bucket_category?: string;
  created_at: string;
}

class UserAuthService {
  private currentUser: any = null;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.currentUser = session.user;
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
      }
    });
  }

  // Set the current user from Clerk
  async setCurrentUser(clerkUser: any) {
    if (!clerkUser) {
      this.currentUser = null;
      return;
    }

    try {
      // Ensure user exists in our database
      try {
        const { data, error } = await supabase.rpc('ensure_user_exists', {
          user_email: clerkUser.emailAddresses[0]?.emailAddress || '',
          user_first_name: clerkUser.firstName || '',
          user_last_name: clerkUser.lastName || '',
          clerk_user_id: clerkUser.id
        });

        if (error) {
          console.error('Error ensuring user exists:', error);
          // Continue without failing - user can still use the app
        } else {
          console.log('✅ User ensured in database:', data);
        }
      } catch (rpcError) {
        console.warn('RPC function ensure_user_exists not available, skipping user creation:', rpcError);
        // Continue without failing - user can still use the app
      }

      // Get the full user data including organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUser.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        this.currentUser = { id: clerkUser.id, clerk_user_id: clerkUser.id };
        return;
      }

      console.log('✅ User data fetched:', userData);
      this.currentUser = userData;
    } catch (error) {
      console.error('Error setting current user:', error);
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get user's properties
  async getUserProperties(): Promise<Property[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }

    return data || [];
  }

  // Create a new property
  async createProperty(propertyData: Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Property> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('properties')
      .insert([{
        ...propertyData,
        user_id: this.currentUser.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      throw error;
    }

    return data;
  }

  // Get user's CSV uploads
  async getUserCSVUploads(): Promise<CSVUpload[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('csv_uploads')
      .select('*')
      .order('upload_date', { ascending: false });

    if (error) {
      console.error('Error fetching CSV uploads:', error);
      throw error;
    }

    return data || [];
  }

  // Create a new CSV upload record
  async createCSVUpload(uploadData: Omit<CSVUpload, 'id' | 'user_id' | 'created_at'>): Promise<CSVUpload> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('csv_uploads')
      .insert([{
        ...uploadData,
        user_id: this.currentUser.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating CSV upload:', error);
      throw error;
    }

    return data;
  }

  // Get CSV data for a specific upload
  async getCSVData(uploadId: string): Promise<CSVData[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('csv_data')
      .select('*')
      .eq('csv_upload_id', uploadId)
      .order('row_index', { ascending: true });

    if (error) {
      console.error('Error fetching CSV data:', error);
      throw error;
    }

    return data || [];
  }

  // Save CSV data
  async saveCSVData(csvData: Omit<CSVData, 'id' | 'user_id' | 'created_at'>[]): Promise<CSVData[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const dataWithUserId = csvData.map(item => ({
      ...item,
      user_id: this.currentUser.id
    }));

    const { data, error } = await supabase
      .from('csv_data')
      .insert(dataWithUserId)
      .select();

    if (error) {
      console.error('Error saving CSV data:', error);
      throw error;
    }

    return data || [];
  }

  // Get user's bucket terms
  async getUserBucketTerms(): Promise<Record<string, string[]>> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_bucket_terms')
      .select('*');

    if (error) {
      console.error('Error fetching bucket terms:', error);
      throw error;
    }

    // Group terms by bucket_key
    const bucketTerms: Record<string, string[]> = {};
    data?.forEach(item => {
      if (!bucketTerms[item.bucket_key]) {
        bucketTerms[item.bucket_key] = [];
      }
      bucketTerms[item.bucket_key].push(item.term);
    });

    return bucketTerms;
  }

  // Save user's bucket terms
  async saveUserBucketTerms(bucketTerms: Record<string, string[]>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    // First, delete existing terms
    await supabase
      .from('user_bucket_terms')
      .delete()
      .eq('user_id', this.currentUser.id);

    // Then insert new terms
    const termsToInsert = Object.entries(bucketTerms).flatMap(([bucketKey, terms]) =>
      terms.map(term => ({
        user_id: this.currentUser.id,
        bucket_key: bucketKey,
        term: term
      }))
    );

    if (termsToInsert.length > 0) {
      const { error } = await supabase
        .from('user_bucket_terms')
        .insert(termsToInsert);

      if (error) {
        console.error('Error saving bucket terms:', error);
        throw error;
      }
    }
  }

  // Get user's custom buckets
  async getUserCustomBuckets(): Promise<UserCustomBucket[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_custom_buckets')
      .select('*');

    if (error) {
      console.error('Error fetching custom buckets:', error);
      throw error;
    }

    return data || [];
  }

  // Save user's custom buckets
  async saveUserCustomBuckets(customBuckets: Omit<UserCustomBucket, 'id' | 'user_id' | 'created_at'>[]): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    // First, delete existing custom buckets
    await supabase
      .from('user_custom_buckets')
      .delete()
      .eq('user_id', this.currentUser.id);

    // Then insert new custom buckets
    if (customBuckets.length > 0) {
      const bucketsToInsert = customBuckets.map(bucket => ({
        ...bucket,
        user_id: this.currentUser.id
      }));

      const { error } = await supabase
        .from('user_custom_buckets')
        .insert(bucketsToInsert);

      if (error) {
        console.error('Error saving custom buckets:', error);
        throw error;
      }
    }
  }

  // Create organization and associate with current user
  async createOrganization(organizationName: string): Promise<Organization> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Encrypt organization name before saving
      const encryptedOrgData = encryptionService.encryptOrganizationData({ name: organizationName });
      
      // Create the organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([encryptedOrgData])
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        throw orgError;
      }

      // Update the user to associate with the organization
      const { error: userError } = await supabase
        .from('users')
        .update({ organization_id: orgData.id })
        .eq('id', this.currentUser.id);

      if (userError) {
        console.error('Error updating user with organization:', userError);
        throw userError;
      }

      // Decrypt organization data for current user
      const decryptedOrgData = encryptionService.decryptOrganizationData(orgData);
      
      // Update current user data
      this.currentUser.organization_id = orgData.id;
      this.currentUser.organizations = decryptedOrgData;

      return decryptedOrgData;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  // Get user's organization
  async getUserOrganization(): Promise<Organization | null> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    if (this.currentUser.organization_id) {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', this.currentUser.organization_id)
        .single();

      if (error) {
        console.error('Error fetching organization:', error);
        return null;
      }

      // Decrypt organization data
      const decryptedData = encryptionService.decryptOrganizationData(data);
      return decryptedData;
    }

    return null;
  }

  // Check if user has an organization
  hasOrganization(): boolean {
    return !!(this.currentUser && this.currentUser.organization_id);
  }

  // Get user's organization name (for display purposes)
  getOrganizationName(): string | null {
    if (this.currentUser && this.currentUser.organizations) {
      return this.currentUser.organizations.name;
    }
    return null;
  }

  // Clear user data (for logout)
  clearUser() {
    this.currentUser = null;
  }
}

export const userAuthService = new UserAuthService();
