import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { propertyChartDataService, ConsolidatedChartData, PropertyChartData } from '../services/propertyChartDataService';

interface PropertySelectorProps {
  onPropertyChange?: (property: PropertyChartData) => void;
  className?: string;
}

const PropertySelector: React.FC<PropertySelectorProps> = ({
  onPropertyChange,
  className = ''
}) => {
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedChartData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeService();
    
    const unsubscribe = propertyChartDataService.subscribe((data) => {
      setConsolidatedData(data);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const initializeService = async () => {
    try {
      await propertyChartDataService.initialize();
      const data = await propertyChartDataService.loadConsolidatedChartData();
      setConsolidatedData(data);
    } catch (error) {
      console.error('Failed to initialize property chart data service:', error);
      // Set empty data to prevent crashes
      setConsolidatedData({
        properties: [],
        selectedProperty: null,
        allMonths: [],
        globalTotals: { income: 0, expense: 0, noi: 0 }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePropertySelect = async (property: PropertyChartData) => {
    await propertyChartDataService.selectProperty(property.propertyId);
    onPropertyChange?.(property);
    setIsOpen(false);
  };

  const refreshData = async () => {
    setIsLoading(true);
    await propertyChartDataService.loadConsolidatedChartData();
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading properties...</span>
        </div>
      </div>
    );
  }

  if (!consolidatedData || consolidatedData.properties.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <div className="text-center py-4">
          <Building2 className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600">No properties found</p>
          <p className="text-sm text-gray-500">Add properties in the CSV Budget Importer</p>
        </div>
      </div>
    );
  }

  const selectedProperty = consolidatedData.selectedProperty;

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Property Dashboard
        </h3>
        <button
          onClick={refreshData}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Property Selector */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">
                {selectedProperty?.propertyName || 'Select Property'}
              </div>
              {selectedProperty && (
                <div className="text-sm text-gray-600">
                  {selectedProperty.activeRecords} CSV files • 
                  ${selectedProperty.totalNOI.toLocaleString()} NOI
                </div>
              )}
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {consolidatedData.properties.map((property) => (
              <button
                key={property.propertyId}
                onClick={() => handlePropertySelect(property)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{property.propertyName}</div>
                    <div className="text-sm text-gray-600">
                      {property.activeRecords} CSV files • 
                      {property.csvTypes.join(', ')} • 
                      ${property.totalNOI.toLocaleString()} NOI
                    </div>
                  </div>
                </div>
                {selectedProperty?.propertyId === property.propertyId && (
                  <Check className="w-5 h-5 text-green-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Property Summary */}
      {selectedProperty && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-600 font-medium">Total Income</div>
            <div className="text-lg font-bold text-green-800">
              ${selectedProperty.totalIncome.toLocaleString()}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-sm text-red-600 font-medium">Total Expenses</div>
            <div className="text-lg font-bold text-red-800">
              ${selectedProperty.totalExpense.toLocaleString()}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-600 font-medium">Net Operating Income</div>
            <div className="text-lg font-bold text-blue-800">
              ${selectedProperty.totalNOI.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Global Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600 mb-2">All Properties Combined:</div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              ${consolidatedData.globalTotals.income.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Income</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              ${consolidatedData.globalTotals.expense.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Expenses</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              ${consolidatedData.globalTotals.noi.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total NOI</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertySelector;
