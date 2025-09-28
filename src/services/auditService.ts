/**
 * Audit Service
 * 
 * Provides audit logging for data access and modifications
 * Ensures compliance and security monitoring
 */

import { userAuthService } from './userAuthService';

export interface AuditLog {
  id?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditConfig {
  enableLogging: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed';
  retentionDays: number;
}

class AuditService {
  private config: AuditConfig;
  private logs: AuditLog[] = [];

  constructor() {
    this.config = {
      enableLogging: true,
      logLevel: 'standard',
      retentionDays: 90
    };
  }

  /**
   * Log a data access event
   */
  logDataAccess(resource: string, resourceId?: string, details?: any): void {
    if (!this.config.enableLogging) return;

    const currentUser = userAuthService.getCurrentUser();
    if (!currentUser) return;

    const log: AuditLog = {
      userId: currentUser.id,
      action: 'DATA_ACCESS',
      resource,
      resourceId,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    this.addLog(log);
  }

  /**
   * Log a data modification event
   */
  logDataModification(resource: string, resourceId?: string, details?: any): void {
    if (!this.config.enableLogging) return;

    const currentUser = userAuthService.getCurrentUser();
    if (!currentUser) return;

    const log: AuditLog = {
      userId: currentUser.id,
      action: 'DATA_MODIFICATION',
      resource,
      resourceId,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    this.addLog(log);
  }

  /**
   * Log a data deletion event
   */
  logDataDeletion(resource: string, resourceId?: string, details?: any): void {
    if (!this.config.enableLogging) return;

    const currentUser = userAuthService.getCurrentUser();
    if (!currentUser) return;

    const log: AuditLog = {
      userId: currentUser.id,
      action: 'DATA_DELETION',
      resource,
      resourceId,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    this.addLog(log);
  }

  /**
   * Log an authentication event
   */
  logAuthentication(action: string, details?: any): void {
    if (!this.config.enableLogging) return;

    const currentUser = userAuthService.getCurrentUser();
    if (!currentUser) return;

    const log: AuditLog = {
      userId: currentUser.id,
      action: `AUTH_${action.toUpperCase()}`,
      resource: 'USER_SESSION',
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    this.addLog(log);
  }

  /**
   * Log an encryption/decryption event
   */
  logEncryption(action: 'ENCRYPT' | 'DECRYPT', resource: string, resourceId?: string): void {
    if (!this.config.enableLogging || this.config.logLevel === 'minimal') return;

    const currentUser = userAuthService.getCurrentUser();
    if (!currentUser) return;

    const log: AuditLog = {
      userId: currentUser.id,
      action: `DATA_${action}`,
      resource,
      resourceId,
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    this.addLog(log);
  }

  /**
   * Get audit logs for a specific user
   */
  getUserAuditLogs(userId: string, limit: number = 100): AuditLog[] {
    return this.logs
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get audit logs for a specific resource
   */
  getResourceAuditLogs(resource: string, resourceId?: string, limit: number = 100): AuditLog[] {
    return this.logs
      .filter(log => 
        log.resource === resource && 
        (!resourceId || log.resourceId === resourceId)
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get all audit logs (admin only)
   */
  getAllAuditLogs(limit: number = 1000): AuditLog[] {
    return this.logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Export audit logs to CSV
   */
  exportAuditLogs(logs: AuditLog[]): string {
    const headers = [
      'Timestamp',
      'User ID',
      'Action',
      'Resource',
      'Resource ID',
      'IP Address',
      'User Agent'
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.userId,
      log.action,
      log.resource,
      log.resourceId || '',
      log.ipAddress || '',
      log.userAgent || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Clean up old audit logs
   */
  cleanupOldLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    );
  }

  /**
   * Private methods
   */
  private addLog(log: AuditLog): void {
    this.logs.push(log);
    
    // Store in localStorage for persistence
    try {
      const storedLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      storedLogs.push(log);
      
      // Keep only recent logs in localStorage
      const recentLogs = storedLogs
        .sort((a: AuditLog, b: AuditLog) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 1000);
      
      localStorage.setItem('auditLogs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to store audit log:', error);
    }
  }

  private sanitizeDetails(details: any): any {
    if (!details) return details;

    // Remove sensitive information
    const sanitized = { ...details };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'key',
      'secret',
      'ssn',
      'credit_card',
      'bank_account'
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getClientIP(): string {
    // In a real application, this would be provided by the server
    // For now, we'll use a placeholder
    return 'client-side';
  }

  /**
   * Load audit logs from localStorage
   */
  loadStoredLogs(): void {
    try {
      const storedLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      this.logs = storedLogs;
    } catch (error) {
      console.warn('Failed to load stored audit logs:', error);
      this.logs = [];
    }
  }
}

export const auditService = new AuditService();

// Load stored logs on initialization
auditService.loadStoredLogs();
