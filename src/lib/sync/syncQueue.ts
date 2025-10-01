import { readOutbox, clearOutbox, removeOutboxItem, incrementOutboxRetries, OutboxItem } from '../storage/localStore';
import { upsertDataset, upsertDatasetSample, deleteDataset, deleteCloudDatasetSample, isAuthenticated } from '../storage/cloudStore';
import { isSupabaseConfigured } from '../supabaseClient';

export interface SyncResult {
  success: boolean;
  processed: number;
  errors: Array<{ item: OutboxItem; error: any }>;
  retryable: Array<OutboxItem>;
}

// Maximum number of retries for failed sync items
const MAX_RETRIES = 3;

// Process all items in the outbox queue
export async function processOutbox(): Promise<SyncResult> {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      processed: 0,
      errors: [],
      retryable: []
    };
  }

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return {
      success: false,
      processed: 0,
      errors: [],
      retryable: []
    };
  }

  const outbox = await readOutbox();
  if (outbox.length === 0) {
    return {
      success: true,
      processed: 0,
      errors: [],
      retryable: []
    };
  }

  const errors: Array<{ item: OutboxItem; error: any }> = [];
  const retryable: Array<OutboxItem> = [];
  let processed = 0;

  for (const item of outbox) {
    try {
      let success = false;

      switch (item.type) {
        case 'UPSERT_DATASET':
          const datasetResult = await upsertDataset(item.payload);
          if (datasetResult.error) {
            throw datasetResult.error;
          }
          success = true;
          break;

        case 'UPSERT_SAMPLE':
          const sampleResult = await upsertDatasetSample(
            item.payload.dataset_id, 
            item.payload.sample
          );
          if (sampleResult.error) {
            throw sampleResult.error;
          }
          success = true;
          break;

        case 'DELETE_DATASET':
          const deleteResult = await deleteDataset(item.payload.cloudId || item.payload.id);
          if (deleteResult.error) {
            throw deleteResult.error;
          }
          success = true;
          break;

        default:
          console.warn('Unknown outbox item type:', item.type);
          success = true; // Skip unknown types
      }

      if (success) {
        // Remove successful item from outbox
        await removeOutboxItem(item.id);
        processed++;
      }
    } catch (error) {
      console.error('Error processing outbox item:', item, error);
      
      // Check if this is a retryable error
      const isRetryable = isRetryableError(error);
      const currentRetries = item.retries || 0;

      if (isRetryable && currentRetries < MAX_RETRIES) {
        // Increment retry count and keep in queue
        await incrementOutboxRetries(item.id);
        retryable.push({ ...item, retries: currentRetries + 1 });
      } else {
        // Remove non-retryable or max-retry items
        await removeOutboxItem(item.id);
        errors.push({ item, error });
      }
    }
  }

  return {
    success: errors.length === 0,
    processed,
    errors,
    retryable
  };
}

// Check if an error is retryable
function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Network errors are retryable
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return true;
  }

  // Timeout errors are retryable
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }

  // HTTP 5xx errors are retryable
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // HTTP 429 (rate limit) is retryable
  if (error.status === 429) {
    return true;
  }

  // Authentication errors are not retryable
  if (error.status === 401 || error.status === 403) {
    return false;
  }

  // Client errors (4xx) are generally not retryable
  if (error.status >= 400 && error.status < 500) {
    return false;
  }

  // Default to retryable for unknown errors
  return true;
}

// Process outbox with exponential backoff
export async function processOutboxWithBackoff(
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<SyncResult> {
  let delay = baseDelay;
  let result: SyncResult;

  do {
    result = await processOutbox();
    
    if (!result.success && result.retryable.length > 0) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  } while (!result.success && result.retryable.length > 0 && delay < maxDelay);

  return result;
}

// Get outbox status
export async function getOutboxStatus(): Promise<{
  total: number;
  retryable: number;
  maxRetries: number;
}> {
  const outbox = await readOutbox();
  const retryable = outbox.filter(item => (item.retries || 0) < MAX_RETRIES);

  return {
    total: outbox.length,
    retryable: retryable.length,
    maxRetries: MAX_RETRIES
  };
}

// Clear all outbox items (use with caution)
export async function clearAllOutbox(): Promise<void> {
  await clearOutbox();
}

// Force retry all items in outbox
export async function retryAllOutbox(): Promise<SyncResult> {
  const outbox = await readOutbox();
  
  // Reset retry counts
  for (const item of outbox) {
    if (item.retries && item.retries > 0) {
      // Remove and re-add with reset retry count
      await removeOutboxItem(item.id);
      await processOutbox();
    }
  }

  return processOutbox();
}
