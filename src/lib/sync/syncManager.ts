import { onNetStatus, waitForOnline } from './netStatus';
import { processOutbox, processOutboxWithBackoff, SyncResult } from './syncQueue';
import { isSupabaseConfigured } from '../supabaseClient';

export interface SyncStatus {
  isOnline: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastSync?: number;
  pendingItems: number;
  errors: Array<{ item: any; error: any }>;
}

class SyncManager {
  private isRunning = false;
  private syncInterval: number | null = null;
  private cleanup: (() => void) | null = null;
  private status: SyncStatus = {
    isOnline: navigator.onLine,
    isAuthenticated: false,
    isSyncing: false,
    pendingItems: 0,
    errors: []
  };
  private statusListeners = new Set<(status: SyncStatus) => void>();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Set up network status monitoring
    this.cleanup = onNetStatus((networkStatus) => {
      this.status.isOnline = networkStatus.online;
      this.notifyStatusListeners();

      // Trigger sync when coming back online
      if (networkStatus.online && this.isRunning) {
        this.triggerSync();
      }
    });

    // Check authentication status
    await this.updateAuthStatus();
  }

  private async updateAuthStatus() {
    if (isSupabaseConfigured()) {
      try {
        const { supabase } = await import('../supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();
        this.status.isAuthenticated = !!session;
      } catch (error) {
        console.error('Error checking auth status:', error);
        this.status.isAuthenticated = false;
      }
    } else {
      this.status.isAuthenticated = false;
    }
    
    this.notifyStatusListeners();
  }

  private notifyStatusListeners() {
    this.statusListeners.forEach(listener => listener({ ...this.status }));
  }

  // Start the sync manager
  start(intervalMs: number = 30000) {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Initial sync
    this.triggerSync();

    // Set up periodic sync
    this.syncInterval = window.setInterval(() => {
      if (this.status.isOnline && this.status.isAuthenticated) {
        this.triggerSync();
      }
    }, intervalMs);

    console.log('Sync manager started');
  }

  // Stop the sync manager
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.syncInterval) {
      window.clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }

    console.log('Sync manager stopped');
  }

  // Trigger immediate sync
  async triggerSync(): Promise<SyncResult> {
    if (!this.status.isOnline || !this.status.isAuthenticated) {
      return {
        success: false,
        processed: 0,
        errors: [],
        retryable: []
      };
    }

    this.status.isSyncing = true;
    this.notifyStatusListeners();

    try {
      const result = await processOutboxWithBackoff();
      
      this.status.lastSync = Date.now();
      this.status.errors = result.errors;
      this.status.pendingItems = result.retryable.length;
      
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        processed: 0,
        errors: [{ item: null, error }],
        retryable: []
      };
    } finally {
      this.status.isSyncing = false;
      this.notifyStatusListeners();
    }
  }

  // Wait for online and sync
  async waitForOnlineAndSync(): Promise<SyncResult> {
    if (!this.status.isOnline) {
      await waitForOnline();
    }
    
    return this.triggerSync();
  }

  // Subscribe to sync status changes
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(callback);
    
    // Call immediately with current status
    callback({ ...this.status });
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  // Get current sync status
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  // Force authentication check
  async checkAuthentication(): Promise<void> {
    await this.updateAuthStatus();
  }

  // Force sync with retry
  async forceSync(): Promise<SyncResult> {
    return this.triggerSync();
  }
}

// Global sync manager instance
let syncManager: SyncManager | null = null;

// Get or create sync manager instance
export function getSyncManager(): SyncManager {
  if (!syncManager) {
    syncManager = new SyncManager();
  }
  return syncManager;
}

// Convenience functions
export function startSyncLoop(intervalMs?: number): () => void {
  const manager = getSyncManager();
  manager.start(intervalMs);
  
  // Return stop function
  return () => manager.stop();
}

export function stopSyncLoop(): void {
  if (syncManager) {
    syncManager.stop();
  }
}

export function triggerSync(): Promise<SyncResult> {
  const manager = getSyncManager();
  return manager.triggerSync();
}

export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  const manager = getSyncManager();
  return manager.onStatusChange(callback);
}

export function getSyncStatus(): SyncStatus {
  const manager = getSyncManager();
  return manager.getStatus();
}

// Initialize sync manager when module loads
if (typeof window !== 'undefined') {
  getSyncManager();
}
