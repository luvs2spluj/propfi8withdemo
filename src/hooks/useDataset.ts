import { useEffect, useState, useCallback } from 'react';
import { loadDatasetSample, DatasetMeta } from '../lib/storage/localStore';
import { parseCSV, analyzeCSVStructure } from '../lib/csv/parseCsv';

export interface DatasetState {
  sample: any[] | null;
  loading: boolean;
  error: string | null;
  structure: {
    fieldTypes: Record<string, string>;
    fieldStats: Record<string, { min?: any; max?: any; unique: number; nulls: number }>;
  } | null;
}

export function useDataset(datasetId: string | null) {
  const [state, setState] = useState<DatasetState>({
    sample: null,
    loading: false,
    error: null,
    structure: null
  });

  // Load dataset sample
  const loadSample = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const sample = await loadDatasetSample(id);
      
      if (sample && sample.length > 0) {
        const structure = analyzeCSVStructure(sample);
        setState(prev => ({ 
          ...prev, 
          sample, 
          structure,
          loading: false 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          sample: null, 
          structure: null,
          loading: false 
        }));
      }
    } catch (error) {
      console.error('Error loading dataset sample:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load dataset' 
      }));
    }
  }, []);

  // Load sample when datasetId changes
  useEffect(() => {
    if (datasetId) {
      loadSample(datasetId);
    } else {
      setState({
        sample: null,
        loading: false,
        error: null,
        structure: null
      });
    }
  }, [datasetId, loadSample]);

  // Refresh dataset
  const refresh = useCallback(() => {
    if (datasetId) {
      loadSample(datasetId);
    }
  }, [datasetId, loadSample]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    refresh,
    clearError
  };
}

// Hook for processing a file directly (without storing)
export function useFileProcessor() {
  const [state, setState] = useState<{
    processing: boolean;
    result: any[] | null;
    fields: string[] | null;
    structure: {
      fieldTypes: Record<string, string>;
      fieldStats: Record<string, { min?: any; max?: any; unique: number; nulls: number }>;
    } | null;
    error: string | null;
  }>({
    processing: false,
    result: null,
    fields: null,
    structure: null,
    error: null
  });

  const processFile = useCallback(async (file: File, maxRows?: number) => {
    setState(prev => ({ ...prev, processing: true, error: null }));

    try {
      const { rows, fields, errors } = maxRows 
        ? await parseCSV(file) // Use full parse for now, could add sample parsing
        : await parseCSV(file);
      
      const structure = analyzeCSVStructure(rows);

      setState(prev => ({ 
        ...prev, 
        result: rows, 
        fields,
        structure,
        processing: false 
      }));

      if (errors.length > 0) {
        console.warn('CSV parsing warnings:', errors);
      }

    } catch (error) {
      console.error('Error processing file:', error);
      setState(prev => ({ 
        ...prev, 
        processing: false, 
        error: error instanceof Error ? error.message : 'Failed to process file' 
      }));
    }
  }, []);

  const clearResult = useCallback(() => {
    setState({
      processing: false,
      result: null,
      fields: null,
      structure: null,
      error: null
    });
  }, []);

  return {
    ...state,
    processFile,
    clearResult
  };
}
