import { get, set, del, keys } from 'idb-keyval';

// Storage keys
const CATALOG_KEY = 'propfi.catalog';
const DATASET_PREFIX = 'propfi.dataset.';
const OUTBOX_KEY = 'propfi.outbox';
const SETTINGS_KEY = 'propfi.settings';

// Dataset metadata type
export type DatasetMeta = {
  id: string;
  name: string;
  source: 'local-file' | 'local-folder' | 'cloud';
  size?: number;
  modifiedAt?: number;
  fields?: string[];
  schema?: Record<string, string>;
  lastSynced?: number;
  cloudId?: string; // Supabase ID when synced
};

// Outbox item for sync queue
export type OutboxItem = {
  id: string;
  type: 'UPSERT_DATASET' | 'UPSERT_SAMPLE' | 'DELETE_DATASET';
  payload: any;
  ts: number;
  retries?: number;
};

// App settings
export type AppSettings = {
  theme?: 'light' | 'dark' | 'system';
  autoSync?: boolean;
  maxSampleSize?: number;
  lastSync?: number;
};

// Catalog management
export async function loadCatalog(): Promise<DatasetMeta[]> {
  try {
    return (await get(CATALOG_KEY)) ?? [];
  } catch (error) {
    console.error('Failed to load catalog:', error);
    return [];
  }
}

export async function saveCatalog(items: DatasetMeta[]): Promise<void> {
  try {
    await set(CATALOG_KEY, items);
  } catch (error) {
    console.error('Failed to save catalog:', error);
    throw error;
  }
}

export async function addToCatalog(meta: DatasetMeta): Promise<void> {
  const catalog = await loadCatalog();
  const existingIndex = catalog.findIndex(item => item.id === meta.id);
  
  if (existingIndex >= 0) {
    catalog[existingIndex] = meta;
  } else {
    catalog.push(meta);
  }
  
  await saveCatalog(catalog);
}

export async function removeFromCatalog(id: string): Promise<void> {
  const catalog = await loadCatalog();
  const filtered = catalog.filter(item => item.id !== id);
  await saveCatalog(filtered);
}

// Dataset sample management
export async function saveDatasetSample(id: string, sample: any[]): Promise<void> {
  try {
    await set(`${DATASET_PREFIX}${id}`, sample);
  } catch (error) {
    console.error('Failed to save dataset sample:', error);
    throw error;
  }
}

export async function loadDatasetSample(id: string): Promise<any[] | null> {
  try {
    return (await get(`${DATASET_PREFIX}${id}`)) ?? null;
  } catch (error) {
    console.error('Failed to load dataset sample:', error);
    return null;
  }
}

export async function deleteDatasetSample(id: string): Promise<void> {
  try {
    await del(`${DATASET_PREFIX}${id}`);
  } catch (error) {
    console.error('Failed to delete dataset sample:', error);
    throw error;
  }
}

// Outbox queue management
export async function enqueueOutbox(item: Omit<OutboxItem, 'id'>): Promise<void> {
  try {
    const outbox: OutboxItem[] = (await get(OUTBOX_KEY)) ?? [];
    const newItem: OutboxItem = {
      ...item,
      id: crypto.randomUUID(),
      retries: 0
    };
    outbox.push(newItem);
    await set(OUTBOX_KEY, outbox);
  } catch (error) {
    console.error('Failed to enqueue outbox item:', error);
    throw error;
  }
}

export async function readOutbox(): Promise<OutboxItem[]> {
  try {
    return (await get(OUTBOX_KEY)) ?? [];
  } catch (error) {
    console.error('Failed to read outbox:', error);
    return [];
  }
}

export async function clearOutbox(): Promise<void> {
  try {
    await set(OUTBOX_KEY, []);
  } catch (error) {
    console.error('Failed to clear outbox:', error);
    throw error;
  }
}

export async function removeOutboxItem(id: string): Promise<void> {
  try {
    const outbox = await readOutbox();
    const filtered = outbox.filter(item => item.id !== id);
    await set(OUTBOX_KEY, filtered);
  } catch (error) {
    console.error('Failed to remove outbox item:', error);
    throw error;
  }
}

export async function incrementOutboxRetries(id: string): Promise<void> {
  try {
    const outbox = await readOutbox();
    const item = outbox.find(item => item.id === id);
    if (item) {
      item.retries = (item.retries || 0) + 1;
      await set(OUTBOX_KEY, outbox);
    }
  } catch (error) {
    console.error('Failed to increment outbox retries:', error);
    throw error;
  }
}

// Settings management
export async function loadSettings(): Promise<AppSettings> {
  try {
    return (await get(SETTINGS_KEY)) ?? {
      theme: 'system',
      autoSync: true,
      maxSampleSize: 1000,
      lastSync: 0
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return {
      theme: 'system',
      autoSync: true,
      maxSampleSize: 1000,
      lastSync: 0
    };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await set(SETTINGS_KEY, settings);
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

// Utility functions
export async function clearAllData(): Promise<void> {
  try {
    const allKeys = await keys();
    const propfiKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith('propfi.')
    );
    
    await Promise.all(propfiKeys.map(key => del(key)));
  } catch (error) {
    console.error('Failed to clear all data:', error);
    throw error;
  }
}

export async function getStorageInfo(): Promise<{
  catalogSize: number;
  datasetCount: number;
  outboxSize: number;
  totalSize: number;
}> {
  try {
    const catalog = await loadCatalog();
    const outbox = await readOutbox();
    const allKeys = await keys();
    const propfiKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith('propfi.')
    );
    
    return {
      catalogSize: catalog.length,
      datasetCount: catalog.filter(item => item.source !== 'cloud').length,
      outboxSize: outbox.length,
      totalSize: propfiKeys.length
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return {
      catalogSize: 0,
      datasetCount: 0,
      outboxSize: 0,
      totalSize: 0
    };
  }
}
