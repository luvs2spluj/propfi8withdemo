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
  CreditCard,
  Menu,
  X
} from 'lucide-react';
import { Page, NavigationProps } from '../types';
import { useUser } from '@clerk/clerk-react';
import PropifyLogo from './PropifyLogo';
import TeamManagement from './TeamManagement';
import SubscriptionManagement from './SubscriptionManagement';

interface SidebarProps extends NavigationProps {
  onLogout: () => void;
  organizationName?: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  setCurrentPage, 
  onLogout, 
  organizationName, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { user } = useUser();
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const menuItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'financials' as Page, label: 'Financials', icon: DollarSign },
    { id: 'analytics' as Page, label: 'Analytics', icon: BarChart3 },
    { id: 'reports' as Page, label: 'Reports', icon: FileText },
    { id: 'properties' as Page, label: 'Properties', icon: Building2 },
    { id: 'csvs' as Page, label: 'CSV Upload & Management', icon: Upload },
    { id: 'team-management' as Page, label: 'Team Management', icon: Users },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggleCollapse}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'fixed lg:relative z-50' : 'relative'}`}>
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <PropifyLogo 
                size={isCollapsed ? "sm" : "lg"} 
                showText={false} 
              />
              {!isCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {organizationName || 'Property Management'}
                  </h1>
                </div>
              )}
            </div>
            
            {/* Toggle Button */}
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isCollapsed ? (
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>
      
        <nav className="mt-6 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'team-management') {
                    setShowTeamManagement(true);
                  } else {
                    setCurrentPage(item.id);
                    // Auto-collapse on mobile after selection
                    if (window.innerWidth < 1024 && onToggleCollapse) {
                      onToggleCollapse();
                    }
                  }
                }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'space-x-3 px-6'} py-3 text-left transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {!isCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      
        <div className="p-6 space-y-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div 
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md p-2 -m-2 transition-colors duration-200`}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || 'U'}
                </span>
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user?.emailAddresses[0]?.emailAddress || 'User'
                      }
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Property Manager</p>
                  </div>
                  <div className={`transform transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          
            {showUserMenu && !isCollapsed && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowSubscriptionManagement(true)}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors duration-200"
                >
                  <CreditCard className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm font-medium">Subscription</span>
                </button>
                
                <button
                  onClick={onLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 rounded-md transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4 text-red-400 dark:text-red-500" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSubscriptionManagement(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Subscription Management</h2>
                <button
                  onClick={() => setShowSubscriptionManagement(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <SubscriptionManagement />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;