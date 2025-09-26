import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  BarChart3, 
  DollarSign, 
  FileText,
  Upload,
  LogOut,
  Users,
  CreditCard
} from 'lucide-react';
import { Page, NavigationProps } from '../types';
import { useUser } from '@clerk/clerk-react';
import PropifyLogo from './PropifyLogo';
import TeamManagement from './TeamManagement';
import SubscriptionManagement from './SubscriptionManagement';

interface SidebarProps extends NavigationProps {
  onLogout: () => void;
  organizationName?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, onLogout, organizationName }) => {
  const { user } = useUser();
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false);
      const menuItems = [
        { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'financials' as Page, label: 'Financials', icon: DollarSign },
        { id: 'analytics' as Page, label: 'Analytics', icon: BarChart3 },
        { id: 'reports' as Page, label: 'Reports', icon: FileText },
        { id: 'properties' as Page, label: 'Properties', icon: Building2 },
        { id: 'csvs' as Page, label: 'CSV Upload & Management', icon: Upload },
        { id: 'pricing' as Page, label: 'Pricing', icon: CreditCard },
      ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-3">
                  <PropifyLogo 
                    size="sm" 
                    showText={false} 
                    imageSrc={process.env.PUBLIC_URL + '/propify-logo.png'}
                    fallbackSrcs={[
                      process.env.PUBLIC_URL + '/propify-logo.jpeg',
                      process.env.PUBLIC_URL + '/propify-logo.jpg'
                    ]}
                  />
          <div>
            <h1 className="text-xl font-bold text-gray-900">PropFi</h1>
            <p className="text-sm text-gray-500">{organizationName || 'Property Management'}</p>
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
      
      <div className="p-6 space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.emailAddresses[0]?.emailAddress || 'User'
                }
              </p>
              <p className="text-xs text-gray-500">Property Manager</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setShowTeamManagement(true)}
          className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-200"
        >
          <Users className="w-5 h-5 text-gray-400" />
          <span className="font-medium">Team Management</span>
        </button>
        
        <button
          onClick={() => setShowSubscriptionManagement(true)}
          className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-200"
        >
          <CreditCard className="w-5 h-5 text-gray-400" />
          <span className="font-medium">Subscription</span>
        </button>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 text-gray-400" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
      
      {/* Team Management Modal */}
      {showTeamManagement && (
        <TeamManagement
          organizationName={organizationName || 'My Organization'}
          onClose={() => setShowTeamManagement(false)}
        />
      )}
      
      {/* Subscription Management Modal */}
      {showSubscriptionManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Subscription Management</h2>
                <button
                  onClick={() => setShowSubscriptionManagement(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <SubscriptionManagement />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
