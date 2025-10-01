import React, { useState } from 'react';
import { useSync, useAuth } from '../hooks/useSync';

interface SyncStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function SyncStatus({ showDetails = false, className = '' }: SyncStatusProps) {
  const { 
    isOnline, 
    isAuthenticated, 
    isSyncing, 
    pendingItems, 
    errors, 
    canSync, 
    syncNow, 
    getStatusText, 
    getStatusColor,
    isConfigured 
  } = useSync();

  const { user, signIn, signOut, loading: authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      await signIn(email);
      setShowAuth(false);
      setEmail('');
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  if (!isConfigured) {
    return (
      <div className={`text-xs px-2 py-1 rounded-full border inline-flex gap-2 items-center ${className}`}>
        <span className="text-gray-500">Local only</span>
        <span>•</span>
        <span className="text-gray-500">Supabase not configured</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`text-xs px-2 py-1 rounded-full border inline-flex gap-2 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className={getStatusColor()}>{getStatusText()}</span>
        
        {isSyncing && (
          <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
        )}
        
        {canSync && !isSyncing && (
          <button
            onClick={handleSyncNow}
            className="text-blue-500 hover:text-blue-700"
            title="Sync now"
          >
            ↻
          </button>
        )}
        
        {!isAuthenticated && (
          <button
            onClick={() => setShowAuth(true)}
            className="text-blue-500 hover:text-blue-700"
            title="Sign in to enable sync"
          >
            Sign in
          </button>
        )}
        
        {isAuthenticated && (
          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-gray-700"
            title="Sign out"
          >
            Sign out
          </button>
        )}
      </div>

      {showDetails && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <div>Online: {isOnline ? 'Yes' : 'No'}</div>
          <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
          <div>Pending: {pendingItems}</div>
          {errors.length > 0 && (
            <div className="text-red-500">Errors: {errors.length}</div>
          )}
        </div>
      )}

      {showAuth && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-10 min-w-64">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            Sign in to enable cloud sync
          </h3>
          <form onSubmit={handleSignIn} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border rounded-md text-sm"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={authLoading}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {authLoading ? 'Sending...' : 'Send Magic Link'}
              </button>
              <button
                type="button"
                onClick={() => setShowAuth(false)}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
          {user && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Signed in as: {user.email}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
