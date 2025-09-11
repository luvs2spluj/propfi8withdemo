import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import Analytics from './components/Analytics';
import Financials from './components/Financials';
import Reports from './components/Reports';
import CSVUpload from './components/CSVUpload';
import PropertyManagement from './components/PropertyManagement';
import CSVDataViewer from './components/CSVDataViewer';
import CSVManagement from './components/CSVManagement';

// Install dev logger in development (disabled for now)
// if (process.env.NODE_ENV === 'development') {
//   import('./dev-logger').then(m => m.installDevLogger('/api/dev-logs'));
// }

type Page = 'dashboard' | 'properties' | 'analytics' | 'financials' | 'reports' | 'upload' | 'property-management' | 'csv-data' | 'csv-management';

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
      case 'properties':
        return <Properties />;
      case 'analytics':
        return <Analytics />;
      case 'financials':
        return <Financials />;
      case 'reports':
        return <Reports />;
      case 'upload':
        return <CSVUpload />;
      case 'property-management':
        return <PropertyManagement />;
      case 'csv-data':
        return <CSVDataViewer />;
      case 'csv-management':
        return <CSVManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
