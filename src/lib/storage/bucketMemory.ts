import { get, set, del, keys } from 'idb-keyval';

// Storage keys
const BUCKET_MEMORY_KEY = 'propfi.bucket.memory';
const CSV_BUCKET_DATA_KEY = 'propfi.csv.bucket.data';

// Bucket memory types
export interface BucketMemory {
  id: string;
  accountName: string;
  bucket: string;
  confidence: number;
  usageCount: number;
  lastUsed: number;
  createdAt: number;
  fileType: string;
}

export interface CSVBucketData {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: number;
  bucketAssignments: Record<string, string>;
  includedItems: Record<string, boolean>;
  accountCategories: Record<string, string>;
  previewData: any[];
  totalRecords: number;
  isActive: boolean;
  lastModified: number;
}

// Bucket Memory Service
export class BucketMemoryService {
  // Save bucket selection to memory
  static async saveBucketSelection(
    accountName: string, 
    bucket: string, 
    fileType: string = 'csv',
    confidence: number = 1.0
  ): Promise<void> {
    try {
      const memories = await this.getBucketMemories();
      const existingIndex = memories.findIndex(
        m => m.accountName === accountName && m.fileType === fileType
      );

      const bucketMemory: BucketMemory = {
        id: crypto.randomUUID(),
        accountName,
        bucket,
        confidence,
        usageCount: 1,
        lastUsed: Date.now(),
        createdAt: Date.now(),
        fileType
      };

      if (existingIndex >= 0) {
        // Update existing memory
        const existing = memories[existingIndex];
        bucketMemory.id = existing.id;
        bucketMemory.usageCount = existing.usageCount + 1;
        bucketMemory.createdAt = existing.createdAt;
        memories[existingIndex] = bucketMemory;
      } else {
        // Add new memory
        memories.push(bucketMemory);
      }

      await set(BUCKET_MEMORY_KEY, memories);
      console.log(`💾 Saved bucket memory: ${accountName} → ${bucket}`);
    } catch (error) {
      console.error('Failed to save bucket memory:', error);
    }
  }

  // Get bucket suggestion based on memory
  static async getBucketSuggestion(accountName: string, fileType: string = 'csv'): Promise<{
    bucket: string;
    confidence: number;
    isFromMemory: boolean;
  }> {
    try {
      const memories = await this.getBucketMemories();
      const memory = memories.find(
        m => m.accountName === accountName && m.fileType === fileType
      );

      if (memory) {
        return {
          bucket: memory.bucket,
          confidence: memory.confidence,
          isFromMemory: true
        };
      }

      // Fallback to default suggestion
      return {
        bucket: this.getDefaultBucket(accountName),
        confidence: 0.5,
        isFromMemory: false
      };
    } catch (error) {
      console.error('Failed to get bucket suggestion:', error);
      return {
        bucket: this.getDefaultBucket(accountName),
        confidence: 0.5,
        isFromMemory: false
      };
    }
  }

  // Get all bucket memories
  static async getBucketMemories(): Promise<BucketMemory[]> {
    try {
      const memories = await get(BUCKET_MEMORY_KEY) || [];
      return memories.sort((a: BucketMemory, b: BucketMemory) => b.usageCount - a.usageCount);
    } catch (error) {
      console.error('Failed to get bucket memories:', error);
      return [];
    }
  }

  // Clear bucket memory
  static async clearBucketMemory(): Promise<void> {
    try {
      await del(BUCKET_MEMORY_KEY);
      console.log('🧹 Cleared bucket memory');
    } catch (error) {
      console.error('Failed to clear bucket memory:', error);
    }
  }

  // Get default bucket based on account name
  private static getDefaultBucket(accountName: string): string {
    const name = accountName.toLowerCase();
    
    // Income patterns
    if (name.includes('rent') || name.includes('tenant') || name.includes('lease')) {
      return 'rental_income';
    }
    if (name.includes('fee') || name.includes('charge') || name.includes('other income')) {
      return 'other_income';
    }
    
    // Expense patterns
    if (name.includes('maintenance') || name.includes('repair') || name.includes('cleaning')) {
      return 'maintenance_expenses';
    }
    if (name.includes('management') || name.includes('admin') || name.includes('salary')) {
      return 'management_expenses';
    }
    if (name.includes('utility') || name.includes('water') || name.includes('electric') || name.includes('gas')) {
      return 'utilities_expenses';
    }
    if (name.includes('insurance') || name.includes('liability')) {
      return 'insurance_expenses';
    }
    if (name.includes('tax') || name.includes('property tax')) {
      return 'property_tax';
    }
    
    return 'unassigned';
  }
}

// CSV Bucket Data Service
export class CSVBucketDataService {
  // Save CSV bucket data
  static async saveCSVBucketData(data: CSVBucketData): Promise<void> {
    try {
      const allData = await this.getAllCSVBucketData();
      const existingIndex = allData.findIndex(d => d.id === data.id);

      if (existingIndex >= 0) {
        allData[existingIndex] = { ...data, lastModified: Date.now() };
      } else {
        allData.push({ ...data, lastModified: Date.now() });
      }

      await set(CSV_BUCKET_DATA_KEY, allData);
      console.log(`💾 Saved CSV bucket data: ${data.fileName}`);
    } catch (error) {
      console.error('Failed to save CSV bucket data:', error);
    }
  }

  // Get all CSV bucket data
  static async getAllCSVBucketData(): Promise<CSVBucketData[]> {
    try {
      const data = await get(CSV_BUCKET_DATA_KEY) || [];
      return data.sort((a: CSVBucketData, b: CSVBucketData) => b.uploadedAt - a.uploadedAt);
    } catch (error) {
      console.error('Failed to get CSV bucket data:', error);
      return [];
    }
  }

  // Get CSV bucket data by ID
  static async getCSVBucketData(id: string): Promise<CSVBucketData | null> {
    try {
      const allData = await this.getAllCSVBucketData();
      return allData.find(d => d.id === id) || null;
    } catch (error) {
      console.error('Failed to get CSV bucket data:', error);
      return null;
    }
  }

  // Delete CSV bucket data
  static async deleteCSVBucketData(id: string): Promise<boolean> {
    try {
      const allData = await this.getAllCSVBucketData();
      const filteredData = allData.filter(d => d.id !== id);
      
      if (filteredData.length === allData.length) {
        return false; // Not found
      }

      await set(CSV_BUCKET_DATA_KEY, filteredData);
      console.log(`🗑️ Deleted CSV bucket data: ${id}`);
      return true;
    } catch (error) {
      console.error('Failed to delete CSV bucket data:', error);
      return false;
    }
  }

  // Update bucket assignments for a CSV
  static async updateBucketAssignments(
    csvId: string, 
    bucketAssignments: Record<string, string>
  ): Promise<boolean> {
    try {
      const data = await this.getCSVBucketData(csvId);
      if (!data) return false;

      // Save individual bucket selections to memory
      for (const [accountName, bucket] of Object.entries(bucketAssignments)) {
        await BucketMemoryService.saveBucketSelection(accountName, bucket, 'csv');
      }

      // Update CSV data
      data.bucketAssignments = bucketAssignments;
      data.lastModified = Date.now();
      await this.saveCSVBucketData(data);

      return true;
    } catch (error) {
      console.error('Failed to update bucket assignments:', error);
      return false;
    }
  }

  // Clear all CSV bucket data
  static async clearAllCSVBucketData(): Promise<void> {
    try {
      await del(CSV_BUCKET_DATA_KEY);
      console.log('🧹 Cleared all CSV bucket data');
    } catch (error) {
      console.error('Failed to clear CSV bucket data:', error);
    }
  }
}
