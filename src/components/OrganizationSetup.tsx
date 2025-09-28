import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Building2, Users, Shield, CheckCircle } from 'lucide-react';
import PropifyLogo from './PropifyLogo';

interface OrganizationSetupProps {
  onComplete: (organizationName: string) => void;
  onSkip: () => void;
}

const OrganizationSetup: React.FC<OrganizationSetupProps> = ({ onComplete, onSkip }) => {
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) return;

    setIsLoading(true);
    try {
      // Call the onComplete callback which will handle database creation
      onComplete(organizationName.trim());
    } catch (error) {
      console.error('Error creating organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 light-mode-only" 
      style={{ 
        backgroundColor: '#f8fafc',
        colorScheme: 'light',
        color: '#111827'
      }}
    >
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <PropifyLogo 
            size="xl" 
            className="justify-center mb-4" 
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ color: '#111827' }}>
            Welcome to PropFi!
          </h1>
          <p className="text-gray-600" style={{ color: '#4b5563' }}>
            Let's set up your organization to get started
          </p>
        </div>

        <Card className="shadow-lg bg-white border-gray-200" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-gray-900" style={{ color: '#111827' }}>
              <Building2 className="h-6 w-6 text-blue-600" />
              Organization Setup
            </CardTitle>
            <CardDescription className="text-gray-600" style={{ color: '#4b5563' }}>
              Create your organization to start managing properties and collaborating with your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-gray-700" style={{ color: '#374151' }}>Organization Name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="e.g., Acme Property Management"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  className="text-lg bg-white border-gray-300 text-gray-900" 
                  style={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                />
                <p className="text-sm text-gray-500" style={{ color: '#6b7280' }}>
                  This will be the name of your organization that team members will see
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg" style={{ backgroundColor: '#eff6ff' }}>
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2" style={{ color: '#1e3a8a' }}>
                  <Shield className="h-4 w-4" />
                  What you'll get:
                </h3>
                <ul className="space-y-2 text-sm text-blue-800" style={{ color: '#1e40af' }}>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Secure, organization-specific data storage
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Team collaboration and user management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Admin controls for data access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Shared property and CSV data
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-900 text-white hover:bg-blue-800"
                  style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}
                  disabled={!organizationName.trim() || isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Organization'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSkip}
                  disabled={isLoading}
                >
                  Skip for Now
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200" style={{ borderColor: '#e5e7eb' }}>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-3" style={{ color: '#6b7280' }}>
                  You can always change your organization name later in settings
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-gray-400" style={{ color: '#9ca3af' }}>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>Team Management</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>Secure Data</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    <span>Property Portfolio</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationSetup;
