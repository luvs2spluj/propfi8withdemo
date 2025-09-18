import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PropertiesConsolidated from './components/PropertiesConsolidated';
import Analytics from './components/Analytics';
import Financials from './components/Financials';
import Reports from './components/Reports';
import CSVs from './components/CSVs';
import CSVManagement from './components/CSVManagement';
import { Page } from './types';

// Install dev logger in development (disabled for now)
// if (process.env.NODE_ENV === 'development') {
//   import('./dev-logger').then(m => m.installDevLogger('/api/dev-logs'));
// }

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  // Listen for navigation events from other components
  React.useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      const page = event.detail.page as Page;
      if (page) {
        setCurrentPage(page);
      }
    };

    window.addEventListener('navigateToPage', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('navigateToPage', handleNavigate as EventListener);
    };
  }, []);

      const renderPage = () => {
        switch (currentPage) {
          case 'dashboard':
            return <Dashboard />;
          case 'financials':
            return <Financials />;
          case 'analytics':
            return <Analytics />;
          case 'properties':
            return <PropertiesConsolidated />;
          case 'csvs':
            return <CSVs />;
          case 'csv-management':
            return <CSVManagement />;
          case 'reports':
            return <Reports />;
          default:
            return <Dashboard />;
        }
      };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 pb-12">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
