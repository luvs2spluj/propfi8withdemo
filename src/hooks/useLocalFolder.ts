import { useEffect, useState, useCallback } from 'react';
import { pickDirectory, getCSVFilesFromDirectory, supportsDirectoryAccess } from '../lib/files/filePicker';
import { loadCatalog, saveCatalog, addToCatalog, DatasetMeta } from '../lib/storage/localStore';
import { parseCSVSample, analyzeCSVStructure } from '../lib/csv/parseCsv';
import { enqueueOutbox } from '../lib/storage/localStore';

export interface LocalFolderState {
  catalog: DatasetMeta[];
  busy: boolean;
  error: string | null;
  supportsDirectory: boolean;
}

export function useLocalFolder() {
  const [state, setState] = useState<LocalFolderState>({
    catalog: [],
    busy: false,
    error: null,
    supportsDirectory: supportsDirectoryAccess
  });

  // Load catalog on mount
  useEffect(() => {
    loadCatalog().then(catalog => {
      setState(prev => ({ ...prev, catalog }));
    });
  }, []);

  // Connect a local folder and scan for CSV files
  const connectFolder = useCallback(async () => {
    if (!supportsDirectoryAccess) {
      setState(prev => ({ 
        ...prev, 
        error: 'Directory access not supported in this browser. Please use individual file selection instead.' 
      }));
      return;
    }

    setState(prev => ({ ...prev, busy: true, error: null }));

    try {
      const directory = await pickDirectory();
      if (!directory) {
        setState(prev => ({ ...prev, busy: false }));
        return;
      }

      // Get all CSV files from the directory
      const csvFiles = await getCSVFilesFromDirectory(directory);
      
      if (csvFiles.length === 0) {
        setState(prev => ({ 
          ...prev, 
          busy: false, 
          error: 'No CSV files found in the selected directory.' 
        }));
        return;
      }

      const newItems: DatasetMeta[] = [];
      const updatedCatalog = [...state.catalog];

      // Process each CSV file
      for (const file of csvFiles) {
        try {
          // Check if file already exists in catalog
          const existingItem = updatedCatalog.find(item => 
            item.name === file.name && item.source === 'local-folder'
          );

          if (existingItem) {
            // Update existing item if file is newer
            if (file.lastModified > (existingItem.modifiedAt || 0)) {
              const { rows, fields, errors } = await parseCSVSample(file, 1000);
              const { fieldTypes, fieldStats } = analyzeCSVStructure(rows);

              const updatedMeta: DatasetMeta = {
                ...existingItem,
                size: file.size,
                modifiedAt: file.lastModified,
                fields,
                schema: fieldTypes
              };

              // Update in catalog
              const index = updatedCatalog.findIndex(item => item.id === existingItem.id);
              if (index >= 0) {
                updatedCatalog[index] = updatedMeta;
              }

              // Save sample data
              await addToCatalog(updatedMeta);
              
              // Queue for sync
              await enqueueOutbox({
                type: 'UPSERT_DATASET',
                payload: updatedMeta,
                ts: Date.now()
              });

              await enqueueOutbox({
                type: 'UPSERT_SAMPLE',
                payload: { dataset_id: updatedMeta.id, sample: rows },
                ts: Date.now()
              });

              newItems.push(updatedMeta);
            }
          } else {
            // Create new item
            const { rows, fields, errors } = await parseCSVSample(file, 1000);
            const { fieldTypes, fieldStats } = analyzeCSVStructure(rows);

            const id = crypto.randomUUID();
            const meta: DatasetMeta = {
              id,
              name: file.name,
              source: 'local-folder',
              size: file.size,
              modifiedAt: file.lastModified,
              fields,
              schema: fieldTypes
            };

            newItems.push(meta);
            updatedCatalog.push(meta);

            // Save to local storage
            await addToCatalog(meta);
            
            // Queue for sync
            await enqueueOutbox({
              type: 'UPSERT_DATASET',
              payload: meta,
              ts: Date.now()
            });

            await enqueueOutbox({
              type: 'UPSERT_SAMPLE',
              payload: { dataset_id: id, sample: rows },
              ts: Date.now()
            });
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          // Continue with other files
        }
      }

      // Save updated catalog
      await saveCatalog(updatedCatalog);

      setState(prev => ({ 
        ...prev, 
        catalog: updatedCatalog, 
        busy: false,
        error: newItems.length === 0 ? 'No new or updated files found.' : null
      }));

    } catch (error) {
      console.error('Error connecting folder:', error);
      setState(prev => ({ 
        ...prev, 
        busy: false, 
        error: error instanceof Error ? error.message : 'Failed to connect folder' 
      }));
    }
  }, [state.catalog]);

  // Add a single CSV file
  const addFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, busy: true, error: null }));

    try {
      const { rows, fields, errors } = await parseCSVSample(file, 1000);
      const { fieldTypes, fieldStats } = analyzeCSVStructure(rows);

      const id = crypto.randomUUID();
      const meta: DatasetMeta = {
        id,
        name: file.name,
        source: 'local-file',
        size: file.size,
        modifiedAt: file.lastModified,
        fields,
        schema: fieldTypes
      };

      // Add to catalog
      await addToCatalog(meta);
      
      // Queue for sync
      await enqueueOutbox({
        type: 'UPSERT_DATASET',
        payload: meta,
        ts: Date.now()
      });

      await enqueueOutbox({
        type: 'UPSERT_SAMPLE',
        payload: { dataset_id: id, sample: rows },
        ts: Date.now()
      });

      // Update state
      const updatedCatalog = [...state.catalog, meta];
      setState(prev => ({ 
        ...prev, 
        catalog: updatedCatalog, 
        busy: false 
      }));

    } catch (error) {
      console.error('Error adding file:', error);
      setState(prev => ({ 
        ...prev, 
        busy: false, 
        error: error instanceof Error ? error.message : 'Failed to add file' 
      }));
    }
  }, [state.catalog]);

  // Remove a dataset from catalog
  const removeDataset = useCallback(async (id: string) => {
    try {
      const updatedCatalog = state.catalog.filter(item => item.id !== id);
      await saveCatalog(updatedCatalog);
      
      // Queue for sync
      await enqueueOutbox({
        type: 'DELETE_DATASET',
        payload: { id },
        ts: Date.now()
      });

      setState(prev => ({ ...prev, catalog: updatedCatalog }));
    } catch (error) {
      console.error('Error removing dataset:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to remove dataset' 
      }));
    }
  }, [state.catalog]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    connectFolder,
    addFile,
    removeDataset,
    clearError
  };
}
