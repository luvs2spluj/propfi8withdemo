import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Users, 
  DollarSign,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import ApiService from '../services/api';

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  total_units: number;
  created_at: string;
  updated_at: string;
}

const Properties: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
    
    // Listen for data updates from CSV uploads
    const handleDataUpdate = () => {
      loadProperties();
    };

    window.addEventListener('dataUpdated', handleDataUpdate);

    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, []);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to get properties from local backend first
      let allProperties: Property[] = [];
      
      try {
        const localDataResponse = await fetch('http://localhost:5000/api/processed-data');
        if (localDataResponse.ok) {
          const localData = await localDataResponse.json();
          console.log('🏠 Local properties data loaded:', localData);
          
          if (localData.success && localData.data) {
            // Extract unique properties from local data
            const propertyNames = new Set<string>();
            Object.keys(localData.data).forEach(propertyName => {
              propertyNames.add(propertyName);
            });
            
            // Convert to Property objects
            const localProperties: Property[] = Array.from(propertyNames).map(name => ({
              id: `local-${name.toLowerCase()}`,
              name: name,
              address: 'Local Data Source',
              type: 'Apartment Complex',
              total_units: 26, // Default for Chico
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            
            allProperties = [...localProperties];
            console.log('🏠 Local properties converted:', localProperties);
          }
        }
      } catch (error) {
        console.log('⚠️ Local properties not available, trying API...');
      }
      
      // Fallback to API if no local data
      if (allProperties.length === 0) {
        const response = await ApiService.getProperties();
        if (response.success && response.data) {
          allProperties = response.data;
          console.log('✅ Properties loaded from API:', response.data);
        } else {
          setError('Failed to load properties');
          setProperties([]);
          return;
        }
      }
      
      setProperties(allProperties);
    } catch (error: any) {
      console.error('Error loading properties:', error);
      setError('Failed to load properties');
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || property.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'vacant':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all your properties</p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="Apartment Complex">Apartment Complex</option>
              <option value="Townhouse Complex">Townhouse Complex</option>
              <option value="Single Family">Single Family</option>
              <option value="Condo Complex">Condo Complex</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading properties...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading properties</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={loadProperties}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Properties Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <div key={property.id} className="card hover:shadow-lg transition-shadow duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.address}
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Building2 className="w-4 h-4 mr-2" />
                  <span className="text-sm">{property.type}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{property.total_units} units</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">Occupied</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {property.total_units} units
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="text-sm">Monthly Revenue</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  View Data
                </span>
              </div>
            </div>

            <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200">
              <button className="flex-1 btn-secondary flex items-center justify-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
              <button className="flex-1 btn-secondary flex items-center justify-center space-x-1">
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {!isLoading && !error && filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Properties;
