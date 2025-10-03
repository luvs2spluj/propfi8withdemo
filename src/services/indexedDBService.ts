// IndexedDB Service for Local File Storage
// This service handles storing notebooks, templates, and CSV files locally in the browser

export interface NotebookTemplate {
  id: string;
  name: string;
  description: string;
  category: 'balance_sheet' | 'cash_flow' | 'rent_roll' | 'income_statement' | 'custom';
  headers: string[];
  requiredFields: string[];
  optionalFields: string[];
  sampleData: Record<string, any>[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'template' | 'csv' | 'notebook';
  content: string | ArrayBuffer;
  size: number;
  uploadedAt: Date;
  metadata: {
    category?: string;
    detectedType?: string;
    confidence?: number;
    templateId?: string;
  };
}

export interface CategorizedCSV {
  id: string;
  filename: string;
  data: Record<string, any>[];
  detectedType: string;
  confidence: number;
  templateId: string;
  categorizedAt: Date;
}

class IndexedDBService {
  private dbName = 'PropFI_Notebooks';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Templates store
        if (!db.objectStoreNames.contains('templates')) {
          const templatesStore = db.createObjectStore('templates', { keyPath: 'id' });
          templatesStore.createIndex('category', 'category', { unique: false });
          templatesStore.createIndex('name', 'name', { unique: false });
        }

        // Files store
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('type', 'type', { unique: false });
          filesStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }

        // Categorized CSVs store
        if (!db.objectStoreNames.contains('categorized_csvs')) {
          const csvStore = db.createObjectStore('categorized_csvs', { keyPath: 'id' });
          csvStore.createIndex('detectedType', 'detectedType', { unique: false });
          csvStore.createIndex('templateId', 'templateId', { unique: false });
          csvStore.createIndex('categorizedAt', 'categorizedAt', { unique: false });
        }
      };
    });
  }

  // Template Management
  async saveTemplate(template: NotebookTemplate): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['templates'], 'readwrite');
    const store = transaction.objectStore('templates');
    
    return new Promise((resolve, reject) => {
      const request = store.put(template);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTemplate(id: string): Promise<NotebookTemplate | null> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['templates'], 'readonly');
    const store = transaction.objectStore('templates');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTemplates(): Promise<NotebookTemplate[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['templates'], 'readonly');
    const store = transaction.objectStore('templates');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getTemplatesByCategory(category: string): Promise<NotebookTemplate[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['templates'], 'readonly');
    const store = transaction.objectStore('templates');
    const index = store.index('category');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(category);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // File Management
  async saveFile(file: UploadedFile): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    
    return new Promise((resolve, reject) => {
      const request = store.put(file);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFile(id: string): Promise<UploadedFile | null> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFiles(): Promise<UploadedFile[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // CSV Categorization
  async saveCategorizedCSV(csv: CategorizedCSV): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['categorized_csvs'], 'readwrite');
    const store = transaction.objectStore('categorized_csvs');
    
    return new Promise((resolve, reject) => {
      const request = store.put(csv);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCategorizedCSVs(): Promise<CategorizedCSV[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['categorized_csvs'], 'readonly');
    const store = transaction.objectStore('categorized_csvs');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getCategorizedCSVsByType(type: string): Promise<CategorizedCSV[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['categorized_csvs'], 'readonly');
    const store = transaction.objectStore('categorized_csvs');
    const index = store.index('detectedType');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(type);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Utility Methods
  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['templates', 'files', 'categorized_csvs'], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('templates').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('files').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('categorized_csvs').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }

  async getStorageInfo(): Promise<{ templates: number; files: number; csvs: number; totalSize: number }> {
    const templates = await this.getAllTemplates();
    const files = await this.getAllFiles();
    const csvs = await this.getCategorizedCSVs();
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    return {
      templates: templates.length,
      files: files.length,
      csvs: csvs.length,
      totalSize
    };
  }
}

export const indexedDBService = new IndexedDBService();
