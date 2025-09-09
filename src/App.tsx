import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import Analytics from './components/Analytics';
import Financials from './components/Financials';
import Reports from './components/Reports';

type Page = 'dashboard' | 'properties' | 'analytics' | 'financials' | 'reports';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

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
