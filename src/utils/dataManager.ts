export interface PropertyData {
  propertyName: string;
  address: string;
  monthlyRevenue: number;
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  expenses: number;
  netIncome: number;
  date: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  units: number;
  occupied: number;
  monthlyRevenue: number;
  occupancyRate: number;
  status: 'active' | 'maintenance' | 'vacant';
  csvData?: PropertyData[];
}

class DataManager {
  private static instance: DataManager;
  private properties: Property[] = [];
  private listeners: ((data: Property[]) => void)[] = [];

  private constructor() {
    this.loadInitialData();
    this.loadCSVData();
  }

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  private loadInitialData(): void {
    // Initial mock data
    this.properties = [
      {
        id: '1',
        name: 'Downtown Plaza',
        address: '123 Main St, Downtown',
        type: 'Apartment Complex',
        units: 24,
        occupied: 23,
        monthlyRevenue: 45600,
        occupancyRate: 95.8,
        status: 'active'
      },
      {
        id: '2',
        name: 'Garden Apartments',
        address: '456 Oak Ave, Garden District',
        type: 'Apartment Complex',
        units: 18,
        occupied: 17,
        monthlyRevenue: 32400,
        occupancyRate: 94.4,
        status: 'active'
      },
      {
        id: '3',
        name: 'Riverside Complex',
        address: '789 River Rd, Riverside',
        type: 'Townhouse Complex',
        units: 12,
        occupied: 11,
        monthlyRevenue: 19800,
        occupancyRate: 91.7,
        status: 'maintenance'
      },
      {
        id: '4',
        name: 'Oakwood Manor',
        address: '321 Pine St, Oakwood',
        type: 'Single Family',
        units: 8,
        occupied: 8,
        monthlyRevenue: 16800,
        occupancyRate: 100,
        status: 'active'
      },
      {
        id: '5',
        name: 'Sunset Heights',
        address: '654 Sunset Blvd, Heights',
        type: 'Apartment Complex',
        units: 30,
        occupied: 28,
        monthlyRevenue: 58800,
        occupancyRate: 93.3,
        status: 'active'
      },
      {
        id: '6',
        name: 'Pine Valley',
        address: '987 Valley Rd, Pine Valley',
        type: 'Condo Complex',
        units: 16,
        occupied: 16,
        monthlyRevenue: 28800,
        occupancyRate: 100,
        status: 'active'
      }
    ];
  }

  private loadCSVData(): void {
    try {
      const csvData = JSON.parse(localStorage.getItem('propertyData') || '{}');
      
      Object.entries(csvData).forEach(([propertyId, data]) => {
        const property = this.properties.find(p => p.id === propertyId);
        if (property && Array.isArray(data)) {
          property.csvData = data as PropertyData[];
          
          // Update property with latest CSV data
          if (data.length > 0) {
            const latestData = data[data.length - 1] as PropertyData;
            property.monthlyRevenue = latestData.monthlyRevenue;
            property.occupancyRate = latestData.occupancyRate;
            property.units = latestData.totalUnits;
            property.occupied = latestData.occupiedUnits;
          }
        }
      });
    } catch (error) {
      console.error('Error loading CSV data:', error);
    }
  }

  public getProperties(): Property[] {
    return this.properties;
  }

  public getProperty(id: string): Property | undefined {
    return this.properties.find(p => p.id === id);
  }

  public updatePropertyData(propertyId: string, csvData: PropertyData[]): void {
    const property = this.properties.find(p => p.id === propertyId);
    if (property) {
      property.csvData = csvData;
      
      // Update property with latest data
      if (csvData.length > 0) {
        const latestData = csvData[csvData.length - 1];
        property.monthlyRevenue = latestData.monthlyRevenue;
        property.occupancyRate = latestData.occupancyRate;
        property.units = latestData.totalUnits;
        property.occupied = latestData.occupiedUnits;
      }
      
      this.notifyListeners();
    }
  }

  public getFinancialData(): {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    profitMargin: number;
    monthlyAverage: number;
  } {
    const totalRevenue = this.properties.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const totalExpenses = this.properties.reduce((sum, p) => {
      const csvData = p.csvData;
      if (csvData && csvData.length > 0) {
        return sum + csvData.reduce((expenseSum, record) => expenseSum + record.expenses, 0) / csvData.length;
      }
      return sum + (p.monthlyRevenue * 0.3); // Default 30% expense ratio
    }, 0);
    
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    const monthlyAverage = totalRevenue;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      profitMargin,
      monthlyAverage
    };
  }

  public getRevenueData(): number[] {
    // Generate monthly revenue data based on CSV data or defaults
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((_, index) => {
      const baseRevenue = this.properties.reduce((sum, p) => sum + p.monthlyRevenue, 0);
      // Add some variation based on month
      const variation = 1 + (Math.sin(index * 0.5) * 0.1);
      return Math.round(baseRevenue * variation);
    });
  }

  public getOccupancyData(): { property: string; rate: number }[] {
    return this.properties.map(p => ({
      property: p.name,
      rate: p.occupancyRate
    }));
  }

  public getPerformanceData(): {
    months: string[];
    revenue: number[];
    expenses: number[];
    netIncome: number[];
  } {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const revenue = months.map((_, index) => {
      const baseRevenue = this.properties.reduce((sum, p) => sum + p.monthlyRevenue, 0);
      const variation = 1 + (Math.sin(index * 0.5) * 0.1);
      return Math.round(baseRevenue * variation);
    });

    const expenses = months.map((_, index) => {
      const baseExpenses = this.properties.reduce((sum, p) => {
        const csvData = p.csvData;
        if (csvData && csvData.length > 0) {
          return sum + csvData.reduce((expenseSum, record) => expenseSum + record.expenses, 0) / csvData.length;
        }
        return sum + (p.monthlyRevenue * 0.3);
      }, 0);
      const variation = 1 + (Math.sin(index * 0.3) * 0.05);
      return Math.round(baseExpenses * variation);
    });

    const netIncome = revenue.map((rev, index) => rev - expenses[index]);

    return { months, revenue, expenses, netIncome };
  }

  public subscribe(listener: (data: Property[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.properties));
  }

  public exportData(): string {
    const data = {
      properties: this.properties,
      financialData: this.getFinancialData(),
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }
}

export default DataManager;
