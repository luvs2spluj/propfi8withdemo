import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  BarChart3, 
  DollarSign, 
  FileText,
  Upload,
  Brain,
  Database,
  // Settings, // Unused import
  Home
  // Table, // Unused import
  // Trash2 // Unused import
} from 'lucide-react';
import { Page, NavigationProps } from '../types';

interface SidebarProps extends NavigationProps {}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'financials' as Page, label: 'Financials', icon: DollarSign },
    { id: 'analytics' as Page, label: 'Analytics', icon: BarChart3 },
    { id: 'properties' as Page, label: 'Properties', icon: Building2 },
    { id: 'reports' as Page, label: 'Reports', icon: FileText },
    { id: 'upload' as Page, label: 'CSV Upload', icon: Upload },
    { id: 'upload-ai' as Page, label: 'AI Parser', icon: Brain },
    { id: 'csv-management-ai' as Page, label: 'CSV Management', icon: Database },
    { id: 'property-management-ai' as Page, label: 'Property Management', icon: Building2 },
    // Note: csv-data, csv-management tabs removed but logic preserved for future use
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Horton Properties</h1>
            <p className="text-sm text-gray-500">Data Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-colors duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">AH</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Alex Horton</p>
              <p className="text-xs text-gray-500">Property Manager</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
