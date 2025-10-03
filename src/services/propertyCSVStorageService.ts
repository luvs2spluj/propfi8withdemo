import { indexedDBService } from './indexedDBService';

export interface PropertyCSVRecord {
  id: string;
  propertyId: string;
  propertyName: string;
  csvType: 'cash-flow' | 'income' | 'rent-roll' | 'balance-sheet' | 'budget' | 'other';
  fileName: string;
  uploadedAt: Date;
  data: any[];
  categorization: any;
  metadata: {
    year?: number;
    month?: number;
    quarter?: number;
    period?: string;
    totalRecords: number;
    duplicateKeys: string[];
  };
  isActive: boolean;
  tags: string[];
}

export interface PropertyInfo {
  id: string;
  name: string;
  address?: string;
  propertyType?: 'residential' | 'commercial' | 'mixed-use';
  createdAt: Date;
  updatedAt: Date;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'exact' | 'property-period' | 'line-item' | 'none';
  existingRecord?: PropertyCSVRecord;
  conflictingRecords: PropertyCSVRecord[];
}

class PropertyCSVStorageService {
  private dbName = 'PropertyCSVStorage';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Properties store
        if (!db.objectStoreNames.contains('properties')) {
          const propertyStore = db.createObjectStore('properties', { keyPath: 'id' });
          propertyStore.createIndex('name', 'name', { unique: false });
          propertyStore.createIndex('propertyType', 'propertyType', { unique: false });
        }

        // CSV Records store
        if (!db.objectStoreNames.contains('csvRecords')) {
          const csvStore = db.createObjectStore('csvRecords', { keyPath: 'id' });
          csvStore.createIndex('propertyId', 'propertyId', { unique: false });
          csvStore.createIndex('csvType', 'csvType', { unique: false });
          csvStore.createIndex('fileName', 'fileName', { unique: false });
          csvStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          csvStore.createIndex('isActive', 'isActive', { unique: false });
          csvStore.createIndex('propertyPeriod', ['propertyId', 'metadata.year', 'metadata.month'], { unique: false });
          csvStore.createIndex('duplicateKeys', 'metadata.duplicateKeys', { unique: false, multiEntry: true });
        }

        // Line Items store for deduplication
        if (!db.objectStoreNames.contains('lineItems')) {
          const lineItemStore = db.createObjectStore('lineItems', { keyPath: 'id' });
          lineItemStore.createIndex('propertyId', 'propertyId', { unique: false });
          lineItemStore.createIndex('csvType', 'csvType', { unique: false });
          lineItemStore.createIndex('accountName', 'accountName', { unique: false });
          lineItemStore.createIndex('period', 'period', { unique: false });
          lineItemStore.createIndex('uniqueKey', 'uniqueKey', { unique: true });
        }
      };
    });
  }

  // Property Management
  async createProperty(property: Omit<PropertyInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<PropertyInfo> {
    if (!this.db) await this.initialize();

    const newProperty: PropertyInfo = {
      id: this.generateId(),
      ...property,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['properties'], 'readwrite');
      const store = transaction.objectStore('properties');
      const request = store.add(newProperty);

      request.onsuccess = () => resolve(newProperty);
      request.onerror = () => reject(request.error);
    });
  }

  async getProperties(): Promise<PropertyInfo[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['properties'], 'readonly');
      const store = transaction.objectStore('properties');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProperty(id: string): Promise<PropertyInfo | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['properties'], 'readonly');
      const store = transaction.objectStore('properties');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // CSV Record Management
  async saveCSVRecord(record: Omit<PropertyCSVRecord, 'id'>): Promise<PropertyCSVRecord> {
    if (!this.db) await this.initialize();

    const newRecord: PropertyCSVRecord = {
      id: this.generateId(),
      ...record
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvRecords'], 'readwrite');
      const store = transaction.objectStore('csvRecords');
      const request = store.add(newRecord);

      request.onsuccess = () => resolve(newRecord);
      request.onerror = () => reject(request.error);
    });
  }

  async getCSVRecords(propertyId?: string, csvType?: string): Promise<PropertyCSVRecord[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvRecords'], 'readonly');
      const store = transaction.objectStore('csvRecords');
      let request: IDBRequest;

      if (propertyId && csvType) {
        const index = store.index('propertyId');
        request = index.getAll(propertyId);
      } else if (propertyId) {
        const index = store.index('propertyId');
        request = index.getAll(propertyId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let results = request.result;
        if (csvType) {
          results = results.filter((record: PropertyCSVRecord) => record.csvType === csvType);
        }
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Duplicate Detection
  async checkForDuplicates(
    propertyId: string,
    csvType: string,
    data: any[],
    year?: number,
    month?: number
  ): Promise<DuplicateCheckResult> {
    if (!this.db) await this.initialize();

    const existingRecords = await this.getCSVRecords(propertyId, csvType);
    const conflictingRecords: PropertyCSVRecord[] = [];

    // Check for exact duplicates (same file name, same upload time)
    const exactDuplicate = existingRecords.find(record => 
      record.fileName === data[0]?.fileName && 
      Math.abs(record.uploadedAt.getTime() - new Date().getTime()) < 60000 // Within 1 minute
    );

    if (exactDuplicate) {
      return {
        isDuplicate: true,
        duplicateType: 'exact',
        existingRecord: exactDuplicate,
        conflictingRecords: [exactDuplicate]
      };
    }

    // Check for property-period duplicates (same property, same period)
    if (year && month) {
      const periodDuplicates = existingRecords.filter(record => 
        record.metadata.year === year && 
        record.metadata.month === month
      );

      if (periodDuplicates.length > 0) {
        conflictingRecords.push(...periodDuplicates);
        return {
          isDuplicate: true,
          duplicateType: 'property-period',
          existingRecord: periodDuplicates[0],
          conflictingRecords
        };
      }
    }

    // Check for line item duplicates
    const lineItemDuplicates = await this.checkLineItemDuplicates(propertyId, csvType, data);
    if (lineItemDuplicates.length > 0) {
      return {
        isDuplicate: true,
        duplicateType: 'line-item',
        conflictingRecords: lineItemDuplicates
      };
    }

    return {
      isDuplicate: false,
      duplicateType: 'none',
      conflictingRecords: []
    };
  }

  private async checkLineItemDuplicates(
    propertyId: string,
    csvType: string,
    data: any[]
  ): Promise<PropertyCSVRecord[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['lineItems'], 'readonly');
      const store = transaction.objectStore('lineItems');
      const index = store.index('propertyId');
      const request = index.getAll(propertyId);

      request.onsuccess = () => {
        const existingLineItems = request.result;
        const duplicates: PropertyCSVRecord[] = [];

        // Check each data row against existing line items
        data.forEach(row => {
          const accountName = row['Account Name'] || row['account_name'] || row['Account'];
          if (accountName) {
            const uniqueKey = `${propertyId}-${csvType}-${accountName}`;
            const existingItem = existingLineItems.find(item => item.uniqueKey === uniqueKey);
            
            if (existingItem) {
              // Find the CSV record that contains this line item
              this.getCSVRecords(propertyId, csvType).then(records => {
                const containingRecord = records.find(record => 
                  record.data.some((dataRow: any) => 
                    (dataRow['Account Name'] || dataRow['account_name'] || dataRow['Account']) === accountName
                  )
                );
                if (containingRecord && !duplicates.includes(containingRecord)) {
                  duplicates.push(containingRecord);
                }
              });
            }
          }
        });

        resolve(duplicates);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Smart Deduplication
  async processCSVWithDeduplication(
    propertyId: string,
    csvType: string,
    fileName: string,
    data: any[],
    categorization: any,
    year?: number,
    month?: number
  ): Promise<PropertyCSVRecord> {
    const duplicateCheck = await this.checkForDuplicates(propertyId, csvType, data, year, month);

    if (duplicateCheck.isDuplicate) {
      switch (duplicateCheck.duplicateType) {
        case 'exact':
          throw new Error(`Exact duplicate detected: ${duplicateCheck.existingRecord?.fileName}`);
        
        case 'property-period':
          throw new Error(`Duplicate for same property and period: ${year}-${month}`);
        
        case 'line-item':
          // Merge data, removing duplicates
          const mergedData = this.mergeDataWithoutDuplicates(data, duplicateCheck.conflictingRecords);
          return this.saveCSVRecord({
            propertyId,
            propertyName: (await this.getProperty(propertyId))?.name || 'Unknown Property',
            csvType: csvType as any,
            fileName: `${fileName} (merged)`,
            uploadedAt: new Date(),
            data: mergedData,
            categorization,
            metadata: {
              year,
              month,
              totalRecords: mergedData.length,
              duplicateKeys: this.extractDuplicateKeys(mergedData)
            },
            isActive: true,
            tags: ['merged', 'deduplicated']
          });
      }
    }

    // No duplicates, save normally
    return this.saveCSVRecord({
      propertyId,
      propertyName: (await this.getProperty(propertyId))?.name || 'Unknown Property',
      csvType: csvType as any,
      fileName,
      uploadedAt: new Date(),
      data,
      categorization,
      metadata: {
        year,
        month,
        totalRecords: data.length,
        duplicateKeys: this.extractDuplicateKeys(data)
      },
      isActive: true,
      tags: []
    });
  }

  private mergeDataWithoutDuplicates(
    newData: any[],
    existingRecords: PropertyCSVRecord[]
  ): any[] {
    const mergedData = [...newData];
    const existingKeys = new Set<string>();

    // Collect all existing keys
    existingRecords.forEach(record => {
      record.data.forEach(row => {
        const accountName = row['Account Name'] || row['account_name'] || row['Account'];
        if (accountName) {
          existingKeys.add(accountName.toLowerCase().trim());
        }
      });
    });

    // Remove duplicates from new data
    return mergedData.filter(row => {
      const accountName = row['Account Name'] || row['account_name'] || row['Account'];
      if (accountName) {
        return !existingKeys.has(accountName.toLowerCase().trim());
      }
      return true;
    });
  }

  private extractDuplicateKeys(data: any[]): string[] {
    const keys = data.map(row => {
      const accountName = row['Account Name'] || row['account_name'] || row['Account'];
      return accountName ? accountName.toLowerCase().trim() : '';
    }).filter(key => key !== '');

    return [...new Set(keys)];
  }

  // Utility Methods
  private generateId(): string {
    return `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async deleteCSVRecord(id: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvRecords'], 'readwrite');
      const store = transaction.objectStore('csvRecords');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateCSVRecord(id: string, updates: Partial<PropertyCSVRecord>): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvRecords'], 'readwrite');
      const store = transaction.objectStore('csvRecords');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          const updatedRecord = { ...record, ...updates };
          const putRequest = store.put(updatedRecord);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Record not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Statistics and Analytics
  async getPropertyStatistics(propertyId: string): Promise<{
    totalCSVs: number;
    csvTypes: { [key: string]: number };
    totalRecords: number;
    duplicateCount: number;
    lastUpload: Date | null;
  }> {
    const records = await this.getCSVRecords(propertyId);
    
    const csvTypes: { [key: string]: number } = {};
    let totalRecords = 0;
    let duplicateCount = 0;
    let lastUpload: Date | null = null;

    records.forEach(record => {
      csvTypes[record.csvType] = (csvTypes[record.csvType] || 0) + 1;
      totalRecords += record.metadata.totalRecords;
      duplicateCount += record.metadata.duplicateKeys.length;
      
      if (!lastUpload || record.uploadedAt > lastUpload) {
        lastUpload = record.uploadedAt;
      }
    });

    return {
      totalCSVs: records.length,
      csvTypes,
      totalRecords,
      duplicateCount,
      lastUpload
    };
  }
}

export const propertyCSVStorageService = new PropertyCSVStorageService();
