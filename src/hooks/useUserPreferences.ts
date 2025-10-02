import { useState, useEffect, useCallback } from 'react';
import { UserPreferencesService, UserBucketPreference, CSVUserPreferences } from '../lib/storage/userPreferences';

export interface UseUserPreferencesReturn {
  preferences: UserBucketPreference[];
  isLoading: boolean;
  error: string | null;
  saveBucketPreference: (accountName: string, bucket: string, fileType?: string) => Promise<boolean>;
  getBucketPreference: (accountName: string, fileType?: string) => Promise<string | null>;
  applyUserPreferences: (accountName: string, aiRecommendation: string, fileType?: string) => Promise<{
    finalBucket: string;
    isUserOverride: boolean;
    confidence: number;
  }>;
  saveCSVPreferences: (csvUploadId: string, bucketAssignments: Record<string, string>, includedItems: Record<string, boolean>, accountCategories: Record<string, string>) => Promise<boolean>;
  getCSVPreferences: (csvUploadId: string) => Promise<CSVUserPreferences | null>;
  refreshPreferences: () => Promise<void>;
  clearError: () => void;
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserBucketPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userPreferences = await UserPreferencesService.getAllUserPreferences('csv');
      setPreferences(userPreferences);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user preferences';
      setError(errorMessage);
      console.error('Failed to load user preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveBucketPreference = useCallback(async (
    accountName: string,
    bucket: string,
    fileType: string = 'csv'
  ): Promise<boolean> => {
    try {
      setError(null);
      const success = await UserPreferencesService.saveBucketPreference(accountName, bucket, fileType);
      if (success) {
        await loadPreferences(); // Refresh the preferences list
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save bucket preference';
      setError(errorMessage);
      console.error('Failed to save bucket preference:', err);
      return false;
    }
  }, [loadPreferences]);

  const getBucketPreference = useCallback(async (
    accountName: string,
    fileType: string = 'csv'
  ): Promise<string | null> => {
    try {
      setError(null);
      return await UserPreferencesService.getBucketPreference(accountName, fileType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get bucket preference';
      setError(errorMessage);
      console.error('Failed to get bucket preference:', err);
      return null;
    }
  }, []);

  const applyUserPreferences = useCallback(async (
    accountName: string,
    aiRecommendation: string,
    fileType: string = 'csv'
  ) => {
    try {
      setError(null);
      return await UserPreferencesService.applyUserPreferences(accountName, aiRecommendation, fileType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply user preferences';
      setError(errorMessage);
      console.error('Failed to apply user preferences:', err);
      return {
        finalBucket: aiRecommendation,
        isUserOverride: false,
        confidence: 0.5
      };
    }
  }, []);

  const saveCSVPreferences = useCallback(async (
    csvUploadId: string,
    bucketAssignments: Record<string, string>,
    includedItems: Record<string, boolean>,
    accountCategories: Record<string, string>
  ): Promise<boolean> => {
    try {
      setError(null);
      const success = await UserPreferencesService.saveCSVUserPreferences(
        csvUploadId,
        bucketAssignments,
        includedItems,
        accountCategories
      );
      if (success) {
        await loadPreferences(); // Refresh the preferences list
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save CSV preferences';
      setError(errorMessage);
      console.error('Failed to save CSV preferences:', err);
      return false;
    }
  }, [loadPreferences]);

  const getCSVPreferences = useCallback(async (csvUploadId: string): Promise<CSVUserPreferences | null> => {
    try {
      setError(null);
      return await UserPreferencesService.getCSVUserPreferences(csvUploadId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get CSV preferences';
      setError(errorMessage);
      console.error('Failed to get CSV preferences:', err);
      return null;
    }
  }, []);

  const refreshPreferences = useCallback(async (): Promise<void> => {
    await loadPreferences();
  }, [loadPreferences]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    error,
    saveBucketPreference,
    getBucketPreference,
    applyUserPreferences,
    saveCSVPreferences,
    getCSVPreferences,
    refreshPreferences,
    clearError
  };
}
