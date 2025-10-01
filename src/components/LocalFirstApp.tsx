import React, { useState, useEffect } from 'react';
import { DataConnector } from './DataConnector';
import { SyncStatus } from './SyncStatus';
import { useDataset } from '../hooks/useDataset';
import { useSync } from '../hooks/useSync';
import { DatasetMeta } from '../lib/storage/localStore';
import { startSyncLoop } from '../lib/sync/syncManager';

export default function LocalFirstApp() {
  const [selectedDataset, setSelectedDataset] = useState<DatasetMeta | null>(null);
  const { sample, loading, error, structure } = useDataset(selectedDataset?.id || null);
  const { isConfigured } = useSync();

  // Start sync loop when component mounts
  useEffect(() => {
    const stopSync = startSyncLoop(30000); // Sync every 30 seconds
    return stopSync;
  }, []);

  const handleDatasetSelect = (dataset: DatasetMeta) => {
    setSelectedDataset(dataset);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              PropFi — Local-First
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Connect local CSV files and visualize your property data
            </p>
          </div>
          <SyncStatus showDetails={false} />
        </div>

        {/* Configuration Notice */}
        {!isConfigured && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">
              Supabase Not Configured
            </h3>
            <p className="text-sm text-yellow-700">
              To enable cloud sync, please configure your Supabase credentials in the environment variables.
              The app will work in local-only mode without cloud sync.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Connector */}
          <div className="space-y-6">
            <DataConnector 
              onDatasetSelect={handleDatasetSelect}
              selectedDatasetId={selectedDataset?.id}
            />
          </div>

          {/* Dataset Preview */}
          <div className="space-y-6">
            {selectedDataset ? (
              <div className="p-4 border rounded-xl bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Dataset Preview: {selectedDataset.name}
                </h3>
                
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {sample && sample.length > 0 && (
                  <div className="space-y-4">
                    {/* Dataset Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Rows:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{sample.length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Fields:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{selectedDataset.fields?.length || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Source:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{selectedDataset.source}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Size:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {selectedDataset.size ? `${(selectedDataset.size / 1024).toFixed(1)} KB` : 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Field Types */}
                    {structure && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Field Types</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(structure.fieldTypes).map(([field, type]) => (
                            <div key={field} className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">{field}:</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                type === 'number' ? 'bg-blue-100 text-blue-800' :
                                type === 'date' ? 'bg-green-100 text-green-800' :
                                type === 'string' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sample Data Table */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Sample Data</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-600">
                              {selectedDataset.fields?.slice(0, 10).map((field) => (
                                <th key={field} className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                                  {field}
                                </th>
                              ))}
                              {selectedDataset.fields && selectedDataset.fields.length > 10 && (
                                <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                                  ...
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {sample.slice(0, 10).map((row, index) => (
                              <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                                {selectedDataset.fields?.slice(0, 10).map((field) => (
                                  <td key={field} className="py-2 px-3 text-gray-900 dark:text-white">
                                    {row[field]?.toString().slice(0, 50) || '-'}
                                    {row[field]?.toString().length > 50 && '...'}
                                  </td>
                                ))}
                                {selectedDataset.fields && selectedDataset.fields.length > 10 && (
                                  <td className="py-2 px-3 text-gray-500">...</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {sample.length > 10 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Showing first 10 rows of {sample.length} total rows
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 border rounded-xl bg-white dark:bg-gray-800 text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Dataset Selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select a dataset from the left to preview its data and structure.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <div>
              PropFi Local-First Architecture
            </div>
            <div className="flex items-center gap-4">
              <span>Data stored locally in IndexedDB</span>
              {isConfigured && <span>•</span>}
              {isConfigured && <span>Optional Supabase sync</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
