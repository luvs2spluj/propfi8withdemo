import { useEffect, useState, useCallback } from 'react';
import { onSyncStatusChange, getSyncStatus, triggerSync, SyncStatus } from '../lib/sync/syncManager';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export interface SyncHookState extends SyncStatus {
  isConfigured: boolean;
}

export function useSync() {
  const [state, setState] = useState<SyncHookState>(() => ({
    ...getSyncStatus(),
    isConfigured: isSupabaseConfigured()
  }));

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status) => {
      setState(prev => ({ ...prev, ...status }));
    });

    return unsubscribe;
  }, []);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    try {
      const result = await triggerSync();
      return result;
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }, []);

  // Check if sync is available
  const canSync = state.isOnline && state.isAuthenticated && state.isConfigured;

  // Get sync status text
  const getStatusText = useCallback(() => {
    if (!state.isConfigured) {
      return 'Local only (Supabase not configured)';
    }
    
    if (!state.isOnline) {
      return 'Offline';
    }
    
    if (!state.isAuthenticated) {
      return 'Local only (not signed in)';
    }
    
    if (state.isSyncing) {
      return 'Syncing...';
    }
    
    if (state.pendingItems > 0) {
      return `${state.pendingItems} pending sync`;
    }
    
    if (state.errors.length > 0) {
      return `${state.errors.length} sync errors`;
    }
    
    return 'Synced';
  }, [state]);

  // Get status color for UI
  const getStatusColor = useCallback(() => {
    if (!state.isConfigured) {
      return 'text-gray-500';
    }
    
    if (!state.isOnline) {
      return 'text-red-500';
    }
    
    if (!state.isAuthenticated) {
      return 'text-yellow-500';
    }
    
    if (state.isSyncing) {
      return 'text-blue-500';
    }
    
    if (state.errors.length > 0) {
      return 'text-red-500';
    }
    
    if (state.pendingItems > 0) {
      return 'text-yellow-500';
    }
    
    return 'text-green-500';
  }, [state]);

  return {
    ...state,
    canSync,
    syncNow,
    getStatusText,
    getStatusColor
  };
}

// Hook for authentication management
export function useAuth() {
  const [state, setState] = useState<{
    user: any | null;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState({ user: null, loading: false, error: null });
      return;
    }

    const checkAuth = async () => {
      try {
        const { supabase } = await import('../lib/supabaseClient');
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          setState({ user: null, loading: false, error: error.message });
        } else {
          setState({ user, loading: false, error: null });
        }
      } catch (error) {
        setState({ 
          user: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Auth check failed' 
        });
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        setState(prev => ({ 
          ...prev, 
          user: session?.user || null,
          loading: false 
        }));
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { signInWithEmail } = await import('../lib/storage/cloudStore');
      const { error } = await signInWithEmail(email);
      
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        throw error;
      }
      
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { signOut: signOutUser } = await import('../lib/storage/cloudStore');
      const { error } = await signOutUser();
      
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        throw error;
      }
      
      setState(prev => ({ ...prev, user: null, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      }));
      throw error;
    }
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    isConfigured: isSupabaseConfigured()
  };
}
