import React, { useState, useEffect } from 'react';
import { Table, Eye, Calendar, DollarSign } from 'lucide-react'; // Removed unused Download
import ApiService from '../services/api';

interface PropertyData {
  id: string;
  property_id: string;
  date: string;
  revenue: string;
  occupancy_rate: string;
  maintenance_cost: string;
  utilities_cost: string;
  insurance_cost: string;
  property_tax: string;
  other_expenses: string;
  notes: string;
  property_name: string;
}

interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  total_units?: number;
}

const CSVDataViewer: React.FC = () => {
  const [data, setData] = useState<PropertyData[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadPropertyData();
    }
  }, [selectedProperty, loadPropertyData]);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getProperties();
      if (response.success && response.data) {
        setProperties(response.data);
        if (response.data.length > 0) {
          setSelectedProperty(response.data[0].id); // Auto-select first property
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPropertyData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await ApiService.getPropertyData(selectedProperty);
      if (response.success && response.data) {
        setData(response.data);
        console.log('✅ Property data loaded:', response.data);
      } else {
        setError('Failed to load property data');
        setData([]);
      }
    } catch (error: any) {
      console.error('Error loading property data:', error);
      setError('Failed to load property data');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '$0' : `$${num.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPercentage = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0%' : `${num.toFixed(1)}%`;
  };

  const calculateTotalExpenses = (row: PropertyData) => {
    const maintenance = parseFloat(row.maintenance_cost || '0');
    const utilities = parseFloat(row.utilities_cost || '0');
    const insurance = parseFloat(row.insurance_cost || '0');
    const propertyTax = parseFloat(row.property_tax || '0');
    const other = parseFloat(row.other_expenses || '0');
    return maintenance + utilities + insurance + propertyTax + other;
  };

  const calculateNetIncome = (row: PropertyData) => {
    const revenue = parseFloat(row.revenue || '0');
    const expenses = calculateTotalExpenses(row);
    return revenue - expenses;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">Loading CSV data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={loadPropertyData}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <Table className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No CSV data found for this property.</p>
          <p className="text-sm mt-2">Upload a CSV file to see data here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Table className="w-5 h-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">CSV Data Table</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {data.length} record{data.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={loadPropertyData}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Refresh data"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Property Selector */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Property:</label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={properties.length === 0}
          >
            <option value="">Select Property</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          {selectedProperty && (
            <span className="text-sm text-gray-500">
              Showing data for: {properties.find(p => p.id === selectedProperty)?.name}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occupancy
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expenses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Income
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    {formatDate(row.date)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-green-500 mr-1" />
                    {formatCurrency(row.revenue)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPercentage(row.occupancy_rate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(calculateTotalExpenses(row))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`font-medium ${
                    calculateNetIncome(row) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(calculateNetIncome(row))}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.notes || 'CSV Upload'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Row */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Revenue:</span>
            <span className="ml-2 font-semibold text-green-600">
              {formatCurrency(data.reduce((sum, row) => sum + parseFloat(row.revenue || '0'), 0))}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Total Expenses:</span>
            <span className="ml-2 font-semibold text-red-600">
              {formatCurrency(data.reduce((sum, row) => sum + calculateTotalExpenses(row), 0))}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Net Income:</span>
            <span className="ml-2 font-semibold text-blue-600">
              {formatCurrency(data.reduce((sum, row) => sum + calculateNetIncome(row), 0))}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Avg Occupancy:</span>
            <span className="ml-2 font-semibold text-purple-600">
              {formatPercentage(data.reduce((sum, row) => sum + parseFloat(row.occupancy_rate || '0'), 0) / data.length)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVDataViewer;
