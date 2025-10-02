import { useState, useEffect, useCallback } from 'react';
import { BucketMemoryService, BucketMemory } from '../lib/storage/bucketMemory';

export interface UseBucketMemoryReturn {
  memories: BucketMemory[];
  isLoading: boolean;
  error: string | null;
  saveBucketSelection: (accountName: string, bucket: string, fileType?: string, confidence?: number) => Promise<void>;
  getBucketSuggestion: (accountName: string, fileType?: string) => Promise<{
    bucket: string;
    confidence: number;
    isFromMemory: boolean;
  }>;
  clearMemory: () => Promise<void>;
  refreshMemories: () => Promise<void>;
}

export function useBucketMemory(): UseBucketMemoryReturn {
  const [memories, setMemories] = useState<BucketMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const memoryList = await BucketMemoryService.getBucketMemories();
      setMemories(memoryList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bucket memories';
      setError(errorMessage);
      console.error('Failed to load bucket memories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveBucketSelection = useCallback(async (
    accountName: string, 
    bucket: string, 
    fileType: string = 'csv',
    confidence: number = 1.0
  ): Promise<void> => {
    try {
      setError(null);
      await BucketMemoryService.saveBucketSelection(accountName, bucket, fileType, confidence);
      await loadMemories(); // Refresh the memory list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save bucket selection';
      setError(errorMessage);
      console.error('Failed to save bucket selection:', err);
      throw err;
    }
  }, [loadMemories]);

  const getBucketSuggestion = useCallback(async (
    accountName: string, 
    fileType: string = 'csv'
  ) => {
    try {
      setError(null);
      return await BucketMemoryService.getBucketSuggestion(accountName, fileType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get bucket suggestion';
      setError(errorMessage);
      console.error('Failed to get bucket suggestion:', err);
      return {
        bucket: 'unassigned',
        confidence: 0,
        isFromMemory: false
      };
    }
  }, []);

  const clearMemory = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await BucketMemoryService.clearBucketMemory();
      await loadMemories(); // Refresh the memory list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear bucket memory';
      setError(errorMessage);
      console.error('Failed to clear bucket memory:', err);
      throw err;
    }
  }, [loadMemories]);

  const refreshMemories = useCallback(async (): Promise<void> => {
    await loadMemories();
  }, [loadMemories]);

  // Load memories on mount
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  return {
    memories,
    isLoading,
    error,
    saveBucketSelection,
    getBucketSuggestion,
    clearMemory,
    refreshMemories
  };
}
