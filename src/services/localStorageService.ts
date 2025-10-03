export interface UserPreferences {
  bucketAssignments: { [key: string]: string[] };
  savedFilters: { [key: string]: any };
  dashboardSettings: {
    defaultView: 'grid' | 'list';
    autoRefresh: boolean;
    refreshInterval: number;
  };
  csvSettings: {
    defaultDelimiter: string;
    autoConvertCurrency: boolean;
    skipValidation: boolean;
  };
}

export interface LocalCSVData {
  id: string;
  filename: string;
  data: any[];
  metadata: {
    uploadedAt: Date;
    fileType: 'balance_sheet' | 'rent_roll' | 'cash_flow';
    propertyName?: string;
    lastModified: Date;
  };
  preferences: {
    bucketAssignments: { [key: string]: string };
    customMappings: { [key: string]: string };
  };
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  autoSync: boolean;
}

class LocalStorageService {
  private readonly STORAGE_KEYS = {
    USER_PREFERENCES: 'propfi_user_preferences',
    CSV_DATA: 'propfi_csv_data',
    SYNC_STATUS: 'propfi_sync_status',
    CACHED_BUCKETS: 'propfi_cached_buckets'
  };

  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    autoSync: true
  };

  constructor() {
    this.loadSyncStatus();
    this.setupOnlineStatusListener();
    this.initializeDefaultPreferences();
  }

  private initializeDefaultPreferences(): void {
    const existing = this.getUserPreferences();
    if (!existing) {
      const defaultPreferences: UserPreferences = {
        bucketAssignments: {},
        savedFilters: {},
        dashboardSettings: {
          defaultView: 'grid',
          autoRefresh: true,
          refreshInterval: 30000
        },
        csvSettings: {
          defaultDelimiter: ',',
          autoConvertCurrency: true,
          skipValidation: false
        }
      };
      this.saveUserPreferences(defaultPreferences);
    }
  }

  getUserPreferences(): UserPreferences | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.USER_PREFERENCES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return null;
    }
  }

  saveUserPreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  saveCSVData(csvData: LocalCSVData): void {
    try {
      const existingData = this.getAllCSVData();
      const updatedData = existingData.filter(item => item.id !== csvData.id);
      updatedData.push(csvData);
      
      localStorage.setItem(
        this.STORAGE_KEYS.CSV_DATA,
        JSON.stringify(updatedData)
      );
    } catch (error) {
      console.error('Error saving CSV data:', error);
    }
  }

  getAllCSVData(): LocalCSVData[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.CSV_DATA);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading CSV data:', error);
      return [];
    }
  }

  getCSVDataById(id: string): LocalCSVData | null {
    const allData = this.getAllCSVData();
    return allData.find(item => item.id === id) || null;
  }

  deleteCSVData(id: string): void {
    try {
      const existingData = this.getAllCSVData();
      const updatedData = existingData.filter(item => item.id !== id);
      
      localStorage.setItem(
        this.STORAGE_KEYS.CSV_DATA,
        JSON.stringify(updatedData)
      );
    } catch (error) {
      console.error('Error deleting CSV data:', error);
    }
  }

  detectFileType(csvData: any[]): 'balance_sheet' | 'rent_roll' | 'cash_flow' {
    if (!csvData || csvData.length === 0) return 'balance_sheet';

    const headers = Object.keys(csvData[0]).map(h => h.toLowerCase());
    
    if (headers.some(h => h.includes('balance') || h.includes('account name'))) {
      return 'balance_sheet';
    }
    
    if (headers.some(h => 
      h.includes('unit') || h.includes('tenant') || h.includes('rent') || 
      h.includes('square') || h.includes('sqft')
    )) {
      return 'rent_roll';
    }
    
    if (headers.some(h => 
      h.includes('cash flow') || h.includes('month') || 
      headers.some(h2 => h2.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i))
    )) {
      return 'cash_flow';
    }
    
    return 'balance_sheet';
  }

  parseCSVContent(content: string, delimiter: string = ','): any[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }
    }

    return rows;
  }

  private setupOnlineStatusListener(): void {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
    });
  }

  private loadSyncStatus(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.SYNC_STATUS);
      if (data) {
        const parsed = JSON.parse(data);
        this.syncStatus = {
          ...this.syncStatus,
          ...parsed,
          lastSync: parsed.lastSync ? new Date(parsed.lastSync) : null
        };
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
   }

  async populateWithMockData(): Promise<void> {
    // Mock data for demo purposes
    const mockData: LocalCSVData[] = [
      {
        id: 'relock-balance-sheet',
        filename: 'balance_sheet_sample.csv',
        data: [
          { 'Account Name': 'Total Assets', 'Balance': '107535' },
          { 'Account Name': 'Total Liabilities', 'Balance': '32484' },
          { 'Account Name': 'Total Equity', 'Balance': '75051' }
        ],
        metadata: {
          uploadedAt: new Date(),
          fileType: 'balance_sheet',
          propertyName: 'Chico Property',
          lastModified: new Date()
        },
        preferences: {
          bucketAssignments: {},
          customMappings: {}
        }
      },
      {
        id: 'relock-cash-flow',
        filename: 'cash_flow_sample.csv',
        data: [
          { 'Month': 'Jan', 'Revenue': '36500', 'Expenses': '28000' },
          { 'Month': 'Feb', 'Revenue': '37200', 'Expenses': '29200' }
        ],
        metadata: {
          uploadedAt: new Date(),
          fileType: 'cash_flow',
          propertyName: 'Chico Property',
          lastModified: new Date()
        },
        preferences: {
          bucketAssignments: {},
          customMappings: {}
        }
      }
    ];

    localStorage.setItem(this.STORAGE_KEYS.CSV_DATA, JSON.stringify(mockData));
  }
}

export const localStorageService = new LocalStorageService();

