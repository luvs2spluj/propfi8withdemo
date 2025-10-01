// Network status monitoring utilities

export type NetworkStatus = {
  online: boolean;
  lastChecked: number;
  connectionType?: string;
};

let currentStatus: NetworkStatus = {
  online: navigator.onLine,
  lastChecked: Date.now()
};

// Listeners for network status changes
const listeners = new Set<(status: NetworkStatus) => void>();

// Initialize network status monitoring
function initializeNetworkMonitoring() {
  const updateStatus = () => {
    const newStatus: NetworkStatus = {
      online: navigator.onLine,
      lastChecked: Date.now(),
      connectionType: getConnectionType()
    };
    
    if (newStatus.online !== currentStatus.online) {
      currentStatus = newStatus;
      listeners.forEach(listener => listener(newStatus));
    }
  };

  // Listen for online/offline events
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);

  // Check connection type changes (if supported)
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }
  }

  // Periodic status check (every 30 seconds)
  const interval = setInterval(updateStatus, 30000);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', updateStatus);
    window.removeEventListener('offline', updateStatus);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
    }
    
    clearInterval(interval);
  };
}

// Get connection type if available
function getConnectionType(): string | undefined {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || connection?.type;
  }
  return undefined;
}

// Subscribe to network status changes
export function onNetStatus(callback: (status: NetworkStatus) => void): () => void {
  listeners.add(callback);
  
  // Call immediately with current status
  callback(currentStatus);
  
  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
  };
}

// Get current network status
export function getCurrentNetworkStatus(): NetworkStatus {
  return { ...currentStatus };
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Wait for network to come online
export function waitForOnline(): Promise<void> {
  if (navigator.onLine) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const unsubscribe = onNetStatus((status) => {
      if (status.online) {
        unsubscribe();
        resolve();
      }
    });
  });
}

// Wait for network to go offline
export function waitForOffline(): Promise<void> {
  if (!navigator.onLine) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const unsubscribe = onNetStatus((status) => {
      if (!status.online) {
        unsubscribe();
        resolve();
      }
    });
  });
}

// Test network connectivity with a simple request
export async function testConnectivity(url: string = 'https://www.google.com/favicon.ico'): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Initialize network monitoring when module loads
let cleanup: (() => void) | null = null;

if (typeof window !== 'undefined') {
  cleanup = initializeNetworkMonitoring();
}

// Export cleanup function for testing or manual cleanup
export function cleanupNetworkMonitoring() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
}
