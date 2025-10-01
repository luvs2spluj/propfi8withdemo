import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { DatasetMeta } from './localStore';

// Supabase table types
export interface SupabaseDataset {
  id: string;
  name: string;
  meta: any;
  owner: string;
  updated_at: string;
  created_at: string;
}

export interface SupabaseDatasetSample {
  dataset_id: string;
  sample: any[];
  updated_at: string;
}

// Dataset operations
export async function upsertDataset(meta: DatasetMeta): Promise<{ data: SupabaseDataset | null; error: any }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('datasets')
      .upsert({
        id: meta.cloudId || meta.id,
        name: meta.name,
        meta: {
          source: meta.source,
          size: meta.size,
          modifiedAt: meta.modifiedAt,
          fields: meta.fields,
          schema: meta.schema,
          localId: meta.id
        },
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting dataset:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception upserting dataset:', error);
    return { data: null, error };
  }
}

export async function getDataset(cloudId: string): Promise<{ data: SupabaseDataset | null; error: any }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', cloudId)
      .single();

    if (error) {
      console.error('Error getting dataset:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception getting dataset:', error);
    return { data: null, error };
  }
}

export async function getUserDatasets(): Promise<{ data: SupabaseDataset[]; error: any }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting user datasets:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception getting user datasets:', error);
    return { data: [], error };
  }
}

export async function deleteDataset(cloudId: string): Promise<{ error: any }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from('datasets')
      .delete()
      .eq('id', cloudId);

    if (error) {
      console.error('Error deleting dataset:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Exception deleting dataset:', error);
    return { error };
  }
}

// Dataset sample operations
export async function upsertDatasetSample(datasetId: string, sample: any[]): Promise<{ data: SupabaseDatasetSample | null; error: any }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('dataset_samples')
      .upsert({
        dataset_id: datasetId,
        sample,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting dataset sample:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception upserting dataset sample:', error);
    return { data: null, error };
  }
}

export async function getDatasetSample(datasetId: string): Promise<{ data: SupabaseDatasetSample | null; error: any }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('dataset_samples')
      .select('*')
      .eq('dataset_id', datasetId)
      .single();

    if (error) {
      console.error('Error getting dataset sample:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception getting dataset sample:', error);
    return { data: null, error };
  }
}

export async function deleteCloudDatasetSample(datasetId: string): Promise<{ error: any }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from('dataset_samples')
      .delete()
      .eq('dataset_id', datasetId);

    if (error) {
      console.error('Error deleting dataset sample:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Exception deleting dataset sample:', error);
    return { error };
  }
}

// Authentication helpers
export async function getCurrentUser(): Promise<{ user: any; error: any }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  } catch (error) {
    console.error('Exception getting current user:', error);
    return { user: null, error };
  }
}

export async function signInWithEmail(email: string): Promise<{ error: any }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      console.error('Error signing in with email:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Exception signing in with email:', error);
    return { error };
  }
}

export async function signOut(): Promise<{ error: any }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Exception signing out:', error);
    return { error };
  }
}

// Utility to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Exception checking authentication:', error);
    return false;
  }
}
