import React, { useState } from 'react';
import { useLocalFolder } from '../hooks/useLocalFolder';
import { pickCSVFile, pickCSVFiles } from '../lib/files/filePicker';
import { DatasetMeta } from '../lib/storage/localStore';

interface DataConnectorProps {
  onDatasetSelect?: (dataset: DatasetMeta) => void;
  selectedDatasetId?: string;
}

export function DataConnector({ onDatasetSelect, selectedDatasetId }: DataConnectorProps) {
  const { 
    catalog, 
    connectFolder, 
    addFile, 
    removeDataset, 
    busy, 
    error, 
    supportsDirectory,
    clearError 
  } = useLocalFolder();

  const [showAddFile, setShowAddFile] = useState(false);

  const handleAddSingleFile = async () => {
    try {
      const file = await pickCSVFile();
      await addFile(file);
    } catch (error) {
      console.error('Error adding file:', error);
    }
  };

  const handleAddMultipleFiles = async () => {
    try {
      const files = await pickCSVFiles();
      for (const file of files) {
        await addFile(file);
      }
    } catch (error) {
      console.error('Error adding files:', error);
    }
  };

  const handleRemoveDataset = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this dataset?')) {
      await removeDataset(id);
    }
  };

  return (
    <div className="p-4 border rounded-xl bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Data Sources
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddFile(!showAddFile)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Add Files
          </button>
          {supportsDirectory && (
            <button
              disabled={busy}
              onClick={connectFolder}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? 'Scanning...' : 'Connect Folder'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showAddFile && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Add CSV files to your local catalog:
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAddSingleFile}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Single File
            </button>
            <button
              onClick={handleAddMultipleFiles}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Multiple Files
            </button>
          </div>
        </div>
      )}

      {!supportsDirectory && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">
            Directory access is not supported in this browser. You can still add individual CSV files.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {catalog.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No datasets found.</p>
            <p className="text-sm mt-1">
              {supportsDirectory 
                ? 'Connect a folder or add individual files to get started.'
                : 'Add individual CSV files to get started.'
              }
            </p>
          </div>
        ) : (
          catalog.map((dataset) => (
            <div
              key={dataset.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedDatasetId === dataset.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              onClick={() => onDatasetSelect?.(dataset)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {dataset.name}
                  </h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{dataset.fields?.length || 0} fields</span>
                    <span>{dataset.source}</span>
                    {dataset.size && (
                      <span>{(dataset.size / 1024).toFixed(1)} KB</span>
                    )}
                    {dataset.modifiedAt && (
                      <span>
                        {new Date(dataset.modifiedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dataset.lastSynced && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Synced
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveDataset(dataset.id);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="Remove dataset"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {busy && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            Processing...
          </span>
        </div>
      )}
    </div>
  );
}
