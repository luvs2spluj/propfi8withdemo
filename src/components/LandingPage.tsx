import React, { useState } from 'react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/clerk-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import PropifyLogo from './PropifyLogo';
import DemoGallery from './DemoGallery';
import { 
  Building2, 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Shield, 
  ArrowRight,
  CreditCard,
  MapPin,
  Printer
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const [showDemo, setShowDemo] = useState(false);

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Smart CSV Import",
      description: "AI-powered categorization and parsing of financial data with intelligent bucket management"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Real-time Analytics",
      description: "Live dashboards with interactive charts and comprehensive financial insights"
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: "AI Powered Metric Benchmarking",
      description: "Compare your property performance against local market averages with AI-driven insights tailored to your specific geographic area and property type"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Performance Tracking",
      description: "Monitor income, expenses, and net operating income with automated calculations"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with data encryption and secure cloud storage"
    },
    {
      icon: <Printer className="h-6 w-6" />,
      title: "Generate and Print Reports",
      description: "Create professional financial reports, cash flow statements, and property performance summaries with customizable templates and one-click printing"
    }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <PropifyLogo 
              size="md" 
            />
            
            <div className="flex items-center space-x-4">
              {isSignedIn ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Welcome, {user?.firstName}!</span>
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <SignInButton mode="modal">
                    <Button variant="ghost">Sign In</Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button>Get Started</Button>
                  </SignUpButton>
                  <Button 
                    variant="outline" 
                    onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: { page: 'pricing' } }))}
                    title="1-month free demo, then $29/month for unlimited properties and features"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pricing
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          
          <div className="flex justify-center mb-6">
            <PropifyLogo 
              size="xl" 
              showText={false}
            />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Visualize Your Property's
            <span className="text-primary"> Financial Data</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            PropFi is a Data Visualization and AI powered market analysis tool for property investors and managers. 
            Import CSV data with AI-powered categorization, track cash flows, and gain 
            real-time insights into your property portfolio.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {!isSignedIn ? (
              <>
                <SignUpButton mode="modal">
                  <Button size="lg" className="text-lg px-8 py-6">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignUpButton>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-6"
                  onClick={() => setShowDemo(true)}
                >
                  Try Demo
                </Button>
              </>
            ) : (
              <Button size="lg" className="text-lg px-8 py-6" onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: { page: 'dashboard' } }))}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From AI-powered data import to real-time analytics, PropFi provides 
              all the tools you need for successful property management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Visualize Your Property's Financial Data?
          </h2>
          <p className="text-xl text-primary-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of property professionals who trust PropFi to manage 
            their portfolios with AI-powered insights and real-time analytics.
          </p>
          
          {!isSignedIn ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignUpButton mode="modal">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: { page: 'pricing' } }))}
                title="1-month free demo, then $29/month for unlimited properties and features"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                View Pricing
              </Button>
            </div>
          ) : (
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: { page: 'dashboard' } }))}>
              Access Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-6 w-6" />
                <span className="text-xl font-bold">PropFi</span>
              </div>
              <p className="text-gray-400">
                The future of property management is here. 
                AI-powered insights for smarter decisions.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white transition-colors text-left">Features</button></li>
                <li><button className="hover:text-white transition-colors text-left">Pricing</button></li>
                <li><button className="hover:text-white transition-colors text-left">API</button></li>
                <li><button className="hover:text-white transition-colors text-left">Integrations</button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white transition-colors text-left">About</button></li>
                <li><button className="hover:text-white transition-colors text-left">Blog</button></li>
                <li><button className="hover:text-white transition-colors text-left">Careers</button></li>
                <li><button className="hover:text-white transition-colors text-left">Contact</button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white transition-colors text-left">Help Center</button></li>
                <li><button className="hover:text-white transition-colors text-left">Documentation</button></li>
                <li><button className="hover:text-white transition-colors text-left">Status</button></li>
                <li><button className="hover:text-white transition-colors text-left">Security</button></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PropFi. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Demo Gallery Modal */}
      {showDemo && (
        <DemoGallery onClose={() => setShowDemo(false)} />
      )}
    </div>
  );
};

export default LandingPage;
