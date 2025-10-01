/**
 * Encryption Service
 * 
 * Provides client-side encryption for sensitive user data
 * Ensures data is encrypted before storage and decrypted on retrieval
 */

import CryptoJS from 'crypto-js';

export interface EncryptionConfig {
  key: string;
  algorithm: string;
}

class EncryptionService {
  private config: EncryptionConfig;
  private keyDerivationSalt: string;

  constructor() {
    // Generate a unique salt for key derivation
    this.keyDerivationSalt = this.generateSalt();
    
    // Initialize encryption configuration
    this.config = {
      key: this.deriveKey(),
      algorithm: 'AES'
    };
  }

  /**
   * Generate a random salt for key derivation
   */
  private generateSalt(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  /**
   * Derive encryption key from user-specific data
   */
  private deriveKey(): string {
    // Use a combination of user ID and a system-wide secret
    const userSecret = import.meta.env.VITE_ENCRYPTION_SECRET || 'default-secret';
    const combinedSecret = `${userSecret}_${this.keyDerivationSalt}`;
    
    // Derive key using PBKDF2
    return CryptoJS.PBKDF2(combinedSecret, this.keyDerivationSalt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.config.key).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): any {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.config.key);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!jsonString) {
        throw new Error('Invalid encrypted data');
      }
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt CSV data before storage
   */
  encryptCSVData(csvData: any): any {
    const sensitiveFields = [
      'account_name',
      'account_categories',
      'preview_data',
      'bucket_assignments',
      'tags'
    ];

    const encryptedData = { ...csvData };

    sensitiveFields.forEach(field => {
      if (encryptedData[field]) {
        encryptedData[field] = this.encrypt(encryptedData[field]);
      }
    });

    return encryptedData;
  }

  /**
   * Decrypt CSV data after retrieval
   */
  decryptCSVData(encryptedCsvData: any): any {
    const sensitiveFields = [
      'account_name',
      'account_categories',
      'preview_data',
      'bucket_assignments',
      'tags'
    ];

    const decryptedData = { ...encryptedCsvData };

    sensitiveFields.forEach(field => {
      if (decryptedData[field] && typeof decryptedData[field] === 'string') {
        try {
          decryptedData[field] = this.decrypt(decryptedData[field]);
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error);
          // Keep original data if decryption fails
        }
      }
    });

    return decryptedData;
  }

  /**
   * Encrypt property data
   */
  encryptPropertyData(propertyData: any): any {
    const sensitiveFields = [
      'name',
      'address',
      'property_type'
    ];

    const encryptedData = { ...propertyData };

    sensitiveFields.forEach(field => {
      if (encryptedData[field]) {
        encryptedData[field] = this.encrypt(encryptedData[field]);
      }
    });

    return encryptedData;
  }

  /**
   * Decrypt property data
   */
  decryptPropertyData(encryptedPropertyData: any): any {
    const sensitiveFields = [
      'name',
      'address',
      'property_type'
    ];

    const decryptedData = { ...encryptedPropertyData };

    sensitiveFields.forEach(field => {
      if (decryptedData[field] && typeof decryptedData[field] === 'string') {
        try {
          decryptedData[field] = this.decrypt(decryptedData[field]);
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error);
          // Keep original data if decryption fails
        }
      }
    });

    return decryptedData;
  }

  /**
   * Encrypt organization data
   */
  encryptOrganizationData(orgData: any): any {
    const sensitiveFields = [
      'name'
    ];

    const encryptedData = { ...orgData };

    sensitiveFields.forEach(field => {
      if (encryptedData[field]) {
        encryptedData[field] = this.encrypt(encryptedData[field]);
      }
    });

    return encryptedData;
  }

  /**
   * Decrypt organization data
   */
  decryptOrganizationData(encryptedOrgData: any): any {
    const sensitiveFields = [
      'name'
    ];

    const decryptedData = { ...encryptedOrgData };

    sensitiveFields.forEach(field => {
      if (decryptedData[field] && typeof decryptedData[field] === 'string') {
        try {
          decryptedData[field] = this.decrypt(decryptedData[field]);
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error);
          // Keep original data if decryption fails
        }
      }
    });

    return decryptedData;
  }

  /**
   * Generate a hash for data integrity verification
   */
  generateHash(data: any): string {
    const jsonString = JSON.stringify(data);
    return CryptoJS.SHA256(jsonString).toString();
  }

  /**
   * Verify data integrity
   */
  verifyIntegrity(data: any, expectedHash: string): boolean {
    const actualHash = this.generateHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Anonymize data for admin access
   */
  anonymizeData(data: any): any {
    const anonymized = { ...data };
    
    // Replace sensitive fields with anonymized versions
    if (anonymized.account_name) {
      anonymized.account_name = this.anonymizeString(anonymized.account_name);
    }
    
    if (anonymized.name) {
      anonymized.name = this.anonymizeString(anonymized.name);
    }
    
    if (anonymized.address) {
      anonymized.address = this.anonymizeString(anonymized.address);
    }
    
    // Keep only non-sensitive metadata
    const allowedFields = [
      'id',
      'user_id',
      'created_at',
      'updated_at',
      'file_type',
      'total_records',
      'is_active'
    ];
    
    const filtered: any = {};
    allowedFields.forEach(field => {
      if (anonymized[field] !== undefined) {
        filtered[field] = anonymized[field];
      }
    });
    
    return filtered;
  }

  /**
   * Anonymize a string by replacing characters
   */
  private anonymizeString(str: string): string {
    if (!str || str.length === 0) return str;
    
    // Replace with asterisks, keeping first and last character
    if (str.length <= 2) {
      return '*'.repeat(str.length);
    }
    
    return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
  }
}

export const encryptionService = new EncryptionService();
