// Unified Property Management Service
// Handles properties across both local and Supabase backends

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  totalUnits: number;
  createdAt: string;
  updatedAt: string;
  source: 'local' | 'supabase' | 'unified';
}

interface PropertyData {
  id: string;
  propertyId: string;
  propertyName: string;
  date: string;
  accountName: string;
  amount: number;
  month: string;
  category: string;
  source: 'local' | 'supabase';
  timestamp: string;
}

class UnifiedPropertyService {
  private properties: Map<string, Property> = new Map();
  private propertyData: Map<string, PropertyData[]> = new Map();
  private lastSync: Date | null = null;

  // Initialize with existing properties
  async initialize(): Promise<void> {
    try {
      // Load from local storage first
      await this.loadFromLocalStorage();
      
      // Then sync with Supabase if available
      await this.syncWithSupabase();
      
      console.log('🏢 Unified Property Service initialized:', {
        propertiesCount: this.properties.size,
        lastSync: this.lastSync
      });
    } catch (error) {
      console.error('Failed to initialize unified property service:', error);
    }
  }

  // Get all properties
  getAllProperties(): Property[] {
    return Array.from(this.properties.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }

  // Get property by ID
  getProperty(id: string): Property | undefined {
    return this.properties.get(id);
  }

  // Get property by name
  getPropertyByName(name: string): Property | undefined {
    return Array.from(this.properties.values()).find(p => 
      p.name.toLowerCase() === name.toLowerCase()
    );
  }

  // Add or update property
  async addProperty(property: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'source'>): Promise<Property> {
    const existingProperty = this.getPropertyByName(property.name);
    
    if (existingProperty) {
      // Update existing property
      const updatedProperty: Property = {
        ...existingProperty,
        ...property,
        updatedAt: new Date().toISOString(),
        source: 'unified'
      };
      
      this.properties.set(existingProperty.id, updatedProperty);
      await this.saveToLocalStorage();
      
      console.log('🔄 Updated existing property:', updatedProperty.name);
      return updatedProperty;
    } else {
      // Create new property
      const newProperty: Property = {
        id: this.generateId(),
        ...property,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'unified'
      };
      
      this.properties.set(newProperty.id, newProperty);
      await this.saveToLocalStorage();
      
      console.log('✅ Created new property:', newProperty.name);
      return newProperty;
    }
  }

  // Add property data
  async addPropertyData(data: Omit<PropertyData, 'id' | 'timestamp'>): Promise<void> {
    const propertyId = data.propertyId;
    
    if (!this.propertyData.has(propertyId)) {
      this.propertyData.set(propertyId, []);
    }
    
    const newData: PropertyData = {
      ...data,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    };
    
    // Check for duplicates
    const existingData = this.propertyData.get(propertyId)!;
    const isDuplicate = existingData.some(existing => 
      existing.date === newData.date && 
      existing.accountName === newData.accountName &&
      existing.month === newData.month
    );
    
    if (!isDuplicate) {
      existingData.push(newData);
      await this.saveToLocalStorage();
      console.log('📊 Added property data:', {
        property: data.propertyName,
        account: data.accountName,
        month: data.month,
        amount: data.amount
      });
    } else {
      console.log('⚠️ Duplicate data skipped:', {
        property: data.propertyName,
        account: data.accountName,
        month: data.month
      });
    }
  }

  // Get property data
  getPropertyData(propertyId: string): PropertyData[] {
    return this.propertyData.get(propertyId) || [];
  }

  // Get all property data
  getAllPropertyData(): PropertyData[] {
    const allData: PropertyData[] = [];
    const dataArrays = Array.from(this.propertyData.values());
    for (const data of dataArrays) {
      allData.push(...data);
    }
    return allData;
  }

  // Sync with Supabase backend
  private async syncWithSupabase(): Promise<void> {
    try {
      // Try to fetch from Supabase backend
      const response = await fetch('http://localhost:5001/api/properties', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Merge Supabase properties
          for (const property of result.data) {
            const existingProperty = this.getPropertyByName(property.name);
            if (!existingProperty) {
              const unifiedProperty: Property = {
                ...property,
                source: 'supabase'
              };
              this.properties.set(property.id, unifiedProperty);
            }
          }
          
          this.lastSync = new Date();
          await this.saveToLocalStorage();
          console.log('🔄 Synced with Supabase backend');
        }
      }
    } catch (error) {
      console.log('⚠️ Supabase sync failed (backend may be unavailable)');
    }
  }

  // Save to local storage
  private async saveToLocalStorage(): Promise<void> {
    try {
      const data = {
        properties: Array.from(this.properties.entries()),
        propertyData: Array.from(this.propertyData.entries()),
        lastSync: this.lastSync
      };
      
      localStorage.setItem('unified-properties', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }

  // Load from local storage
  private async loadFromLocalStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('unified-properties');
      if (stored) {
        const data = JSON.parse(stored);
        
        if (data.properties) {
          this.properties = new Map(data.properties);
        }
        
        if (data.propertyData) {
          this.propertyData = new Map(data.propertyData);
        }
        
        if (data.lastSync) {
          this.lastSync = new Date(data.lastSync);
        }
        
        console.log('📁 Loaded from local storage:', {
          properties: this.properties.size,
          propertyData: Array.from(this.propertyData.values()).flat().length
        });
      }
    } catch (error) {
      console.error('Failed to load from local storage:', error);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    this.properties.clear();
    this.propertyData.clear();
    this.lastSync = null;
    localStorage.removeItem('unified-properties');
    console.log('🗑️ Cleared all unified property data');
  }

  // Get statistics
  getStatistics(): {
    totalProperties: number;
    totalDataRecords: number;
    lastSync: Date | null;
    propertiesBySource: { [key: string]: number };
  } {
    const propertiesBySource: { [key: string]: number } = {};
    const propertiesArray = Array.from(this.properties.values());
    for (const property of propertiesArray) {
      propertiesBySource[property.source] = (propertiesBySource[property.source] || 0) + 1;
    }

    return {
      totalProperties: this.properties.size,
      totalDataRecords: Array.from(this.propertyData.values()).flat().length,
      lastSync: this.lastSync,
      propertiesBySource
    };
  }
}

// Export singleton instance
export const unifiedPropertyService = new UnifiedPropertyService();
export default unifiedPropertyService;
