import CryptoJS from 'crypto-js';
import { get, set, del, keys } from 'idb-keyval';

// Storage keys
const FILES_KEY = 'propfi.secure.files';
const ENCRYPTION_KEY_KEY = 'propfi.encryption.key';

// File metadata type
export interface SecureFileMeta {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  uploadedAt: number;
  lastAccessed: number;
  encrypted: boolean;
  checksum: string;
  tags?: string[];
  description?: string;
}

// File storage interface
export interface StoredFile {
  meta: SecureFileMeta;
  data: string; // Base64 encoded encrypted data
}

// Encryption utilities
class EncryptionService {
  private static getEncryptionKey(): string {
    // Get or generate encryption key
    const storedKey = localStorage.getItem(ENCRYPTION_KEY_KEY);
    if (storedKey) {
      return storedKey;
    }
    
    // Generate new key
    const newKey = CryptoJS.lib.WordArray.random(256/8).toString();
    localStorage.setItem(ENCRYPTION_KEY_KEY, newKey);
    return newKey;
  }

  static encrypt(data: string): string {
    const key = this.getEncryptionKey();
    const encrypted = CryptoJS.AES.encrypt(data, key).toString();
    return encrypted;
  }

  static decrypt(encryptedData: string): string {
    const key = this.getEncryptionKey();
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  static generateChecksum(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
}

// File storage service
export class SecureFileStorage {
  private static async getStoredFiles(): Promise<StoredFile[]> {
    try {
      const files = await get(FILES_KEY) || [];
      return files;
    } catch (error) {
      console.error('Failed to load stored files:', error);
      return [];
    }
  }

  private static async saveStoredFiles(files: StoredFile[]): Promise<void> {
    try {
      await set(FILES_KEY, files);
    } catch (error) {
      console.error('Failed to save stored files:', error);
      throw error;
    }
  }

  // Store a file securely
  static async storeFile(
    file: File, 
    options: {
      tags?: string[];
      description?: string;
      encrypt?: boolean;
    } = {}
  ): Promise<SecureFileMeta> {
    try {
      // Read file data
      const fileData = await this.fileToBase64(file);
      
      // Generate metadata
      const meta: SecureFileMeta = {
        id: crypto.randomUUID(),
        name: file.name,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: Date.now(),
        lastAccessed: Date.now(),
        encrypted: options.encrypt !== false, // Default to true
        checksum: EncryptionService.generateChecksum(fileData),
        tags: options.tags || [],
        description: options.description
      };

      // Encrypt data if requested
      const dataToStore = meta.encrypted 
        ? EncryptionService.encrypt(fileData)
        : fileData;

      // Create stored file object
      const storedFile: StoredFile = {
        meta,
        data: dataToStore
      };

      // Save to storage
      const files = await this.getStoredFiles();
      files.push(storedFile);
      await this.saveStoredFiles(files);

      console.log(`File stored securely: ${meta.name} (${meta.size} bytes)`);
      return meta;
    } catch (error) {
      console.error('Failed to store file:', error);
      throw error;
    }
  }

  // Retrieve a file
  static async getFile(id: string): Promise<File | null> {
    try {
      const files = await this.getStoredFiles();
      const storedFile = files.find(f => f.meta.id === id);
      
      if (!storedFile) {
        return null;
      }

      // Update last accessed time
      storedFile.meta.lastAccessed = Date.now();
      await this.saveStoredFiles(files);

      // Decrypt if needed
      const fileData = storedFile.meta.encrypted
        ? EncryptionService.decrypt(storedFile.data)
        : storedFile.data;

      // Convert back to File object
      const file = await this.base64ToFile(
        fileData, 
        storedFile.meta.originalName, 
        storedFile.meta.type
      );

      return file;
    } catch (error) {
      console.error('Failed to retrieve file:', error);
      return null;
    }
  }

  // Get file metadata without loading the file
  static async getFileMeta(id: string): Promise<SecureFileMeta | null> {
    try {
      const files = await this.getStoredFiles();
      const storedFile = files.find(f => f.meta.id === id);
      return storedFile?.meta || null;
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return null;
    }
  }

  // List all files
  static async listFiles(): Promise<SecureFileMeta[]> {
    try {
      const files = await this.getStoredFiles();
      return files.map(f => f.meta).sort((a, b) => b.uploadedAt - a.uploadedAt);
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  // Delete a file
  static async deleteFile(id: string): Promise<boolean> {
    try {
      const files = await this.getStoredFiles();
      const initialLength = files.length;
      const filteredFiles = files.filter(f => f.meta.id !== id);
      
      if (filteredFiles.length === initialLength) {
        return false; // File not found
      }

      await this.saveStoredFiles(filteredFiles);
      console.log(`File deleted: ${id}`);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  // Update file metadata
  static async updateFileMeta(id: string, updates: Partial<SecureFileMeta>): Promise<boolean> {
    try {
      const files = await this.getStoredFiles();
      const fileIndex = files.findIndex(f => f.meta.id === id);
      
      if (fileIndex === -1) {
        return false;
      }

      files[fileIndex].meta = { ...files[fileIndex].meta, ...updates };
      await this.saveStoredFiles(files);
      return true;
    } catch (error) {
      console.error('Failed to update file metadata:', error);
      return false;
    }
  }

  // Search files
  static async searchFiles(query: string): Promise<SecureFileMeta[]> {
    try {
      const files = await this.listFiles();
      const lowercaseQuery = query.toLowerCase();
      
      return files.filter(file => 
        file.name.toLowerCase().includes(lowercaseQuery) ||
        file.originalName.toLowerCase().includes(lowercaseQuery) ||
        file.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
        file.description?.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error('Failed to search files:', error);
      return [];
    }
  }

  // Get storage statistics
  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    encryptedFiles: number;
    oldestFile: number;
    newestFile: number;
  }> {
    try {
      const files = await this.listFiles();
      
      return {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        encryptedFiles: files.filter(f => f.encrypted).length,
        oldestFile: files.length > 0 ? Math.min(...files.map(f => f.uploadedAt)) : 0,
        newestFile: files.length > 0 ? Math.max(...files.map(f => f.uploadedAt)) : 0
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        encryptedFiles: 0,
        oldestFile: 0,
        newestFile: 0
      };
    }
  }

  // Clear all files
  static async clearAllFiles(): Promise<void> {
    try {
      await del(FILES_KEY);
      console.log('All files cleared');
    } catch (error) {
      console.error('Failed to clear all files:', error);
      throw error;
    }
  }

  // Utility methods
  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private static async base64ToFile(base64: string, filename: string, mimeType: string): Promise<File> {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: mimeType });
  }

  // Export file for download
  static async exportFile(id: string): Promise<void> {
    try {
      const file = await this.getFile(id);
      if (!file) {
        throw new Error('File not found');
      }

      // Create download link
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export file:', error);
      throw error;
    }
  }

  // Preview file (for text-based files)
  static async previewFile(id: string): Promise<string | null> {
    try {
      const file = await this.getFile(id);
      if (!file) {
        return null;
      }

      // Only preview text-based files
      if (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      return null;
    } catch (error) {
      console.error('Failed to preview file:', error);
      return null;
    }
  }
}

