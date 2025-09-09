import React, { useState } from 'react';
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

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  units: number;
  occupied: number;
  monthlyRevenue: number;
  occupancyRate: number;
  status: 'active' | 'maintenance' | 'vacant';
}

const Properties: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const properties: Property[] = [
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

      {/* Properties Grid */}
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
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                {property.status}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Building2 className="w-4 h-4 mr-2" />
                  <span className="text-sm">{property.type}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{property.units} units</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">Occupied</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {property.occupied}/{property.units} ({property.occupancyRate}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="text-sm">Monthly Revenue</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  ${property.monthlyRevenue.toLocaleString()}
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

      {filteredProperties.length === 0 && (
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
