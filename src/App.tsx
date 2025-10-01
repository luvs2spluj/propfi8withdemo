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
// import OrganizationSetup from './components/OrganizationSetup';
import Pricing from './components/Pricing';
import DarkModeToggle from './components/DarkModeToggle';
import LogoTest from './components/LogoTest';
import LocalFirstApp from './components/LocalFirstApp';
import { Page } from './types';
import { userAuthService } from './services/userAuthService';

// Install dev logger in development (disabled for now)
// if (process.env.NODE_ENV === 'development') {
//   import('./dev-logger').then(m => m.installDevLogger('/api/dev-logs'));
// }

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [showLandingPage, setShowLandingPage] = useState(true);
  // const [showOrganizationSetup, setShowOrganizationSetup] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  // const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerk();

  // Initialize user authentication when user signs in
  useEffect(() => {
    if (isSignedIn && user) {
      const initializeUser = async () => {
        try {
          await userAuthService.setCurrentUser(user);
          
          // Check if user has an organization in the database
          const hasOrganization = userAuthService.hasOrganization();
          
          if (!hasOrganization) {
            // Check localStorage for existing organization name
            const savedOrgName = localStorage.getItem('organizationName');
            if (savedOrgName) {
              // User has organization name in localStorage but not in database
              // This could happen if database was reset or user data was lost
              setOrganizationName(savedOrgName);
            } else {
              // Set a default organization name for authenticated users
              setOrganizationName('My Organization');
            }
          } else {
            // User has organization in database - get the name
            const organization = await userAuthService.getUserOrganization();
            if (organization) {
              setOrganizationName(organization.name);
              // Update localStorage to keep it in sync
              localStorage.setItem('organizationName', organization.name);
            }
          }
          
          // Redirect logged-in users to dashboard after initialization
          setShowLandingPage(false);
          setCurrentPage('dashboard');
        } catch (error) {
          console.error('Error initializing user:', error);
          // Fallback to localStorage if database fails
          const savedOrgName = localStorage.getItem('organizationName');
          if (savedOrgName) {
            setOrganizationName(savedOrgName);
          } else {
            setOrganizationName('My Organization');
          }
          
          // Still redirect to dashboard even if there's an error
          setShowLandingPage(false);
          setCurrentPage('dashboard');
        }
      };
      
      initializeUser();
    } else if (!isSignedIn) {
      userAuthService.clearUser();
      setOrganizationName(null);
      // Show landing page for non-authenticated users
      setShowLandingPage(true);
      setCurrentPage('landing');
    }
  }, [isSignedIn, user]);

  // Listen for navigation events from other components
  React.useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      const page = event.detail.page as Page;
      if (page) {
        setCurrentPage(page);
        // If navigating to a page other than landing, hide landing page
        if (page !== 'landing') {
          setShowLandingPage(false);
        }
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
      localStorage.removeItem('organizationName');
      // Return to landing page after logout
      setShowLandingPage(true);
      setCurrentPage('landing');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Handle organization setup completion
  // const handleOrganizationComplete = async (name: string) => {
  //   try {
  //     // Create organization in database
  //     const organization = await userAuthService.createOrganization(name);
  //     setOrganizationName(organization.name);
  //     setShowOrganizationSetup(false);
  //     // Update localStorage to keep it in sync
  //     localStorage.setItem('organizationName', organization.name);
  //   } catch (error) {
  //     console.error('Error creating organization:', error);
  //     // Fallback to localStorage if database fails
  //     setOrganizationName(name);
  //     setShowOrganizationSetup(false);
  //     localStorage.setItem('organizationName', name);
  //   }
  // };

  // Handle organization setup skip
  // const handleOrganizationSkip = () => {
  //   setShowOrganizationSetup(false);
  //   setOrganizationName('My Organization');
  //   localStorage.setItem('organizationName', 'My Organization');
  //   // Note: We don't create the organization in the database when skipping
  //   // This allows the user to set it up later if they want
  // };

  // Handle subscription
  const handleSubscribe = async (plan: string, properties: number) => {
    if (!user) return;
    
    try {
      // Import stripeService dynamically to avoid issues
      const { createCheckoutSession } = await import('./services/stripeService');
      
      await createCheckoutSession({
        plan,
        properties,
        userId: user.id,
        userEmail: user.primaryEmailAddress?.emailAddress || '',
        organizationId: organizationName || undefined,
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      // You could show a toast notification here
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage />;
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
      case 'pricing':
        return <Pricing onSubscribe={handleSubscribe} />;
      case 'logo-test':
        return <LogoTest />;
      case 'local-first':
        return <LocalFirstApp />;
      default:
        return <LandingPage />;
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

  // Show landing page if not signed in
  if (showLandingPage || !isSignedIn) {
    return <LandingPage />;
  }

  // Show organization setup if user is signed in but hasn't set up organization
  // Commented out to show landing page instead
  // if (showOrganizationSetup) {
  //   return (
  //     <OrganizationSetup
  //       onComplete={handleOrganizationComplete}
  //       onSkip={handleOrganizationSkip}
  //     />
  //   );
  // }

  // Show dashboard if user is signed in and has organization
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        onLogout={handleLogout}
        organizationName={organizationName}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-0' : ''}`}>
        
        <div className="p-6 pb-12">
          {renderPage()}
        </div>
      </main>
      <DarkModeToggle />
    </div>
  );
}

function App() {
  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  
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
