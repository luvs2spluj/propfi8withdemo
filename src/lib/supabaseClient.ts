import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  console.warn('Supabase configuration missing. Local-first mode will work without cloud sync.');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder', {
  auth: { 
    persistSession: true, 
    autoRefreshToken: true 
  },
});

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(url && anon && url !== 'your_supabase_url_here' && anon !== 'your_supabase_anon_key_here');
};
