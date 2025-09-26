import React, { useState, useEffect } from 'react';
import { ClerkProvider, useUser, useClerk } from '@clerk/clerk-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PropertiesConsolidated from './components/PropertiesConsolidated';
import Analytics from './components/Analytics';
import Financials from './components/Financials';
import Reports from './components/Reports';
import CSVs from './components/CSVs';
import LandingPage from './components/LandingPage';
import { Page } from './types';
import { userAuthService } from './services/userAuthService';

// Install dev logger in development (disabled for now)
// if (process.env.NODE_ENV === 'development') {
//   import('./dev-logger').then(m => m.installDevLogger('/api/dev-logs'));
// }

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerk();

  // Initialize user authentication when user signs in
  useEffect(() => {
    if (isSignedIn && user) {
      userAuthService.setCurrentUser(user);
    } else if (!isSignedIn) {
      userAuthService.clearUser();
    }
  }, [isSignedIn, user]);

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

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      userAuthService.clearUser();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

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
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show landing page if user is not signed in
  if (!isSignedIn) {
    return <LandingPage />;
  }

  // Show dashboard if user is signed in
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 pb-12">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

function App() {
  const clerkKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
  
  if (!clerkKey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600">Clerk publishable key is not configured.</p>
          <p className="text-sm text-gray-500 mt-2">Please check your .env file.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <AppContent />
    </ClerkProvider>
  );
}

export default App;
