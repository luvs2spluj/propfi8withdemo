import { useState, useEffect, useCallback } from 'react';
import { SecureFileStorage, SecureFileMeta } from '../lib/storage/secureFileStorage';

export interface UseSecureFileStorageReturn {
  files: SecureFileMeta[];
  isLoading: boolean;
  error: string | null;
  uploadFile: (file: File, options?: {
    tags?: string[];
    description?: string;
    encrypt?: boolean;
  }) => Promise<SecureFileMeta | null>;
  deleteFile: (id: string) => Promise<boolean>;
  downloadFile: (id: string) => Promise<void>;
  previewFile: (id: string) => Promise<string | null>;
  searchFiles: (query: string) => Promise<SecureFileMeta[]>;
  refreshFiles: () => Promise<void>;
  getStorageStats: () => Promise<{
    totalFiles: number;
    totalSize: number;
    encryptedFiles: number;
    oldestFile: number;
    newestFile: number;
  }>;
}

export function useSecureFileStorage(): UseSecureFileStorageReturn {
  const [files, setFiles] = useState<SecureFileMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fileList = await SecureFileStorage.listFiles();
      setFiles(fileList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
      setError(errorMessage);
      console.error('Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadFile = useCallback(async (
    file: File, 
    options: {
      tags?: string[];
      description?: string;
      encrypt?: boolean;
    } = {}
  ): Promise<SecureFileMeta | null> => {
    try {
      setError(null);
      const meta = await SecureFileStorage.storeFile(file, options);
      await loadFiles(); // Refresh the file list
      return meta;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      console.error('Failed to upload file:', err);
      return null;
    }
  }, [loadFiles]);

  const deleteFile = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await SecureFileStorage.deleteFile(id);
      if (success) {
        await loadFiles(); // Refresh the file list
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      console.error('Failed to delete file:', err);
      return false;
    }
  }, [loadFiles]);

  const downloadFile = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await SecureFileStorage.exportFile(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download file';
      setError(errorMessage);
      console.error('Failed to download file:', err);
      throw err;
    }
  }, []);

  const previewFile = useCallback(async (id: string): Promise<string | null> => {
    try {
      setError(null);
      return await SecureFileStorage.previewFile(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview file';
      setError(errorMessage);
      console.error('Failed to preview file:', err);
      return null;
    }
  }, []);

  const searchFiles = useCallback(async (query: string): Promise<SecureFileMeta[]> => {
    try {
      setError(null);
      return await SecureFileStorage.searchFiles(query);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search files';
      setError(errorMessage);
      console.error('Failed to search files:', err);
      return [];
    }
  }, []);

  const refreshFiles = useCallback(async (): Promise<void> => {
    await loadFiles();
  }, [loadFiles]);

  const getStorageStats = useCallback(async () => {
    try {
      setError(null);
      return await SecureFileStorage.getStorageStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get storage stats';
      setError(errorMessage);
      console.error('Failed to get storage stats:', err);
      return {
        totalFiles: 0,
        totalSize: 0,
        encryptedFiles: 0,
        oldestFile: 0,
        newestFile: 0
      };
    }
  }, []);

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return {
    files,
    isLoading,
    error,
    uploadFile,
    deleteFile,
    downloadFile,
    previewFile,
    searchFiles,
    refreshFiles,
    getStorageStats
  };
}

