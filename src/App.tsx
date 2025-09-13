import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import Analytics from './components/Analytics';
import Financials from './components/Financials';
import Reports from './components/Reports';
import CSVUpload from './components/CSVUpload';
// import PropertyManagement from './components/PropertyManagement'; // Removed from sidebar
import CSVDataViewer from './components/CSVDataViewer';
import CSVManagement from './components/CSVManagement';

// Install dev logger in development (disabled for now)
// if (process.env.NODE_ENV === 'development') {
//   import('./dev-logger').then(m => m.installDevLogger('/api/dev-logs'));
// }

type Page = 'dashboard' | 'financials' | 'analytics' | 'properties' | 'reports' | 'upload' | 'csv-data' | 'csv-management';

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
        return <Properties />;
      case 'reports':
        return <Reports />;
      case 'upload':
        return <CSVUpload />;
      // case 'property-management': // Removed from sidebar
      //   return <PropertyManagement />;
      // Note: csv-data and csv-management cases preserved for future use
      case 'csv-data':
        return <CSVDataViewer />;
      case 'csv-management':
        return <CSVManagement />;
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
