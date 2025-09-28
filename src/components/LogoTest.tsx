import React from 'react';
import PropifyLogo from './PropifyLogo';

const LogoTest: React.FC = () => {
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-8">PropFi Logo Test - Multiple Sizes</h1>
      
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Small (40px)</h2>
          <PropifyLogo size="sm" />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Medium (56px)</h2>
          <PropifyLogo size="md" />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Large (80px)</h2>
          <PropifyLogo size="lg" />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Extra Large (96px)</h2>
          <PropifyLogo size="xl" />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Without Text</h2>
          <PropifyLogo size="lg" showText={false} />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Custom Sizes</h2>
          <div className="flex items-center gap-4">
            <div style={{ width: '48px', height: '48px' }}>
              <PropifyLogo size="sm" showText={false} />
            </div>
            <div style={{ width: '96px', height: '96px' }}>
              <PropifyLogo size="md" showText={false} />
            </div>
            <div style={{ width: '160px', height: '160px' }}>
              <PropifyLogo size="lg" showText={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoTest;
