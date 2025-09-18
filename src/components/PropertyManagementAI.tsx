import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  MapPin,
  Home,
  Users
} from 'lucide-react';
import { aiParserService, PropertyAI } from '../config/supabaseAI';

const PropertyManagementAI: React.FC = () => {
  const [properties, setProperties] = useState<PropertyAI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyAI | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'Apartment',
    total_units: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      const result = await aiParserService.getProperties();
      if (result.success && result.data) {
        setProperties(result.data);
      } else {
        setError(result.error || 'Failed to load properties');
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
      setError('Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const result = await aiParserService.createProperty(formData);
      if (result.success) {
        setSuccess('Property added successfully!');
        setFormData({ name: '', address: '', type: 'Apartment', total_units: 0 });
        setShowAddModal(false);
        await loadProperties();
      } else {
        setError(result.error || 'Failed to add property');
      }
    } catch (error) {
      console.error('Failed to add property:', error);
      setError('Failed to add property');
    }
  };

  const handleEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    setError(null);
    setSuccess(null);

    try {
      const result = await aiParserService.updateProperty(editingProperty.id, formData);
      if (result.success) {
        setSuccess('Property updated successfully!');
        setShowEditModal(false);
        setEditingProperty(null);
        await loadProperties();
      } else {
        setError(result.error || 'Failed to update property');
      }
    } catch (error) {
      console.error('Failed to update property:', error);
      setError('Failed to update property');
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!window.confirm('Are you sure you want to delete this property? This will also delete all associated CSV files and data.')) {
      return;
    }

    try {
      const result = await aiParserService.deleteProperty(propertyId);
      if (result.success) {
        setSuccess('Property deleted successfully!');
        await loadProperties();
      } else {
        setError(result.error || 'Failed to delete property');
      }
    } catch (error) {
      console.error('Failed to delete property:', error);
      setError('Failed to delete property');
    }
  };

  const openEditModal = (property: PropertyAI) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      type: property.type,
      total_units: property.total_units
    });
    setShowEditModal(true);
  };

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const propertyTypes = [
    'Apartment',
    'Townhouse',
    'Single Family',
    'Condo',
    'Duplex',
    'Commercial',
    'Mixed Use',
    'Other'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building2 className="w-8 h-8 mr-3 text-blue-600" />
            Property Management
          </h1>
          <p className="text-gray-600 mt-1">Manage your properties for AI parser integration</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </button>
          <button
            onClick={loadProperties}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search properties by name, address, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* Properties List */}
      {isLoading ? (
        <div className="card text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading properties...</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'No properties match your search criteria.' 
              : 'Add your first property to get started with AI parser integration.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Add Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map(property => (
            <div key={property.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Home className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{property.name}</h3>
                    <p className="text-sm text-gray-500">{property.type}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    property.ai_parser_enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {property.ai_parser_enabled ? 'AI Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{property.address}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{property.total_units} units</span>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-500 mb-2">Created:</p>
                  <p className="text-sm font-medium">
                    {new Date(property.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(property)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit Property"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeleteProperty(property.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Property"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add New Property</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '', address: '', type: 'Apartment', total_units: 0 });
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddProperty} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter property name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter property address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {propertyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Units *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.total_units}
                    onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter total units"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setFormData({ name: '', address: '', type: 'Apartment', total_units: 0 });
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Property
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditModal && editingProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Property</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProperty(null);
                    setFormData({ name: '', address: '', type: 'Apartment', total_units: 0 });
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditProperty} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {propertyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Units *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.total_units}
                    onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProperty(null);
                      setFormData({ name: '', address: '', type: 'Apartment', total_units: 0 });
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Property
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyManagementAI;
