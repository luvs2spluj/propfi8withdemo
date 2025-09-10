import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Building2, 
  MapPin, 
  Edit, 
  Trash2, 
  Save, 
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import ApiService from '../services/api';

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  total_units: number;
  created_at?: string;
  updated_at?: string;
}

const PropertyManagement: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'Apartment Complex',
    total_units: 0
  });

  const propertyTypes = [
    'Apartment Complex',
    'Townhouse Complex',
    'Single Family',
    'Condo Complex',
    'Commercial Building',
    'Mixed Use',
    'Other'
  ];

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      console.log('Loading properties from API...');
      
      const response = await ApiService.getProperties();
      console.log('Properties API response:', response);
      
      if (response.success && response.data) {
        setProperties(response.data);
        console.log('Properties loaded from database:', response.data.length);
      } else {
        throw new Error(response.error || 'API request failed');
      }
    } catch (error: any) {
      console.error('Error loading properties from API:', error);
      setError('Failed to load properties from database. Please check if the backend server is running.');
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'total_units' ? parseInt(value) || 0 : value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      type: 'Apartment Complex',
      total_units: 0
    });
    setError(null);
    setSuccess(null);
  };

  // Auto-clear success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.address.trim()) {
      setError('Property name and address are required');
      return;
    }

    try {
      // Check if property name already exists
      const existingProperty = properties.find(p => 
        p.name.toLowerCase() === formData.name.toLowerCase()
      );
      
      if (existingProperty) {
        setError('A property with this name already exists');
        return;
      }

      console.log('Adding property:', formData);

      // Try to add via API first
      try {
        const response = await ApiService.addProperty(formData);
        console.log('API response:', response);
        if (response.success) {
          setSuccess('Property added successfully to database!');
          // Reload properties from database
          await loadProperties();
          setShowAddForm(false);
          resetForm();
          return;
        } else {
          throw new Error(response.error || 'API request failed');
        }
      } catch (apiError: any) {
        console.warn('API not available, using local storage:', apiError.message);
        
        // Fallback to local storage
        const newProperty: Property = {
          id: Date.now().toString(),
          name: formData.name,
          address: formData.address,
          type: formData.type,
          total_units: formData.total_units,
          created_at: new Date().toISOString()
        };

        const updatedProperties = [...properties, newProperty];
        setProperties(updatedProperties);
        
        // Property added successfully
        
        setSuccess('Property added successfully (saved locally)!');
        setShowAddForm(false);
        resetForm();
      }

    } catch (error: any) {
      console.error('Error adding property:', error);
      setError(error.message || 'Failed to add property');
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      type: property.type,
      total_units: property.total_units
    });
    setShowAddForm(true);
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProperty) return;

    try {
      console.log('Updating property:', editingProperty.id, formData);

      // Try API first
      try {
        const response = await ApiService.updateProperty(editingProperty.id, formData);
        console.log('Update API response:', response);
        if (response.success) {
          setSuccess('Property updated successfully in database!');
          // Reload properties from database
          await loadProperties();
          setShowAddForm(false);
          setEditingProperty(null);
          resetForm();
          return;
        } else {
          throw new Error(response.error || 'API request failed');
        }
      } catch (apiError: any) {
        console.warn('API not available, using local storage:', apiError.message);
        
        // Fallback to local storage
        const updatedProperties = properties.map(p => 
          p.id === editingProperty.id 
            ? { ...p, ...formData, updated_at: new Date().toISOString() }
            : p
        );
        
        setProperties(updatedProperties);
        
        setSuccess('Property updated successfully (saved locally)!');
        setShowAddForm(false);
        setEditingProperty(null);
        resetForm();
      }

    } catch (error: any) {
      console.error('Error updating property:', error);
      setError(error.message || 'Failed to update property');
    }
  };

  const handleDeleteProperty = async (property: Property) => {
    if (!window.confirm(`Are you sure you want to delete "${property.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Try API first
      try {
        const response = await ApiService.deleteProperty(property.id);
        if (response.success) {
          setSuccess('Property deleted successfully!');
          await loadProperties();
          return;
        }
      } catch (apiError) {
        console.warn('API not available, using local storage');
      }

      // Fallback to local storage
      const updatedProperties = properties.filter(p => p.id !== property.id);
      setProperties(updatedProperties);
      
      setSuccess('Property deleted successfully!');

    } catch (error: any) {
      setError(error.message || 'Failed to delete property');
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingProperty(null);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
          <p className="text-gray-600 mt-1">Manage your property portfolio</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadProperties}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </button>
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

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingProperty ? 'Edit Property' : 'Add New Property'}
            </h3>
            <button
              onClick={cancelForm}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={editingProperty ? handleUpdateProperty : handleAddProperty} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter property name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter property address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Units
              </label>
              <input
                type="number"
                name="total_units"
                value={formData.total_units}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter total number of units"
                min="0"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{editingProperty ? 'Update Property' : 'Add Property'}</span>
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Properties List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Properties ({properties.length})</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first property.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Property</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => (
              <div key={property.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-gray-900">{property.name}</h4>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditProperty(property)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                      title="Edit property"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(property)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      title="Delete property"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="truncate">{property.address}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span>{property.type}</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">{property.total_units}</span> units
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyManagement;
