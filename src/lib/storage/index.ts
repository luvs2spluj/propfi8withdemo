// Storage facade that provides a unified interface for local and cloud storage
export * from './localStore';
export * from './cloudStore';

// Re-export with explicit names to avoid conflicts
export { deleteDatasetSample as deleteLocalDatasetSample } from './localStore';
export { deleteCloudDatasetSample as deleteCloudDatasetSample } from './cloudStore';
