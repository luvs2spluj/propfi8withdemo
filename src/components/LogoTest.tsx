/**
 * Logo Test Component
 * 
 * Tests the PropFi logo at different sizes to verify rendering
 */

import React from 'react';
import PropifyLogo from './PropifyLogo';

const LogoTest: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">PropFi Logo Test</h1>
      
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <span className="w-20 text-sm text-gray-600">48px:</span>
          <PropifyLogo size="sm" showText={false} />
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="w-20 text-sm text-gray-600">96px:</span>
          <PropifyLogo size="lg" showText={false} />
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="w-20 text-sm text-gray-600">160px:</span>
          <PropifyLogo size="xl" showText={false} />
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="w-20 text-sm text-gray-600">With Text:</span>
          <PropifyLogo size="lg" showText={true} />
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Test Results:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ Logo should render consistently at all sizes</li>
          <li>✓ No distortion or "decomposition"</li>
          <li>✓ Proper aspect ratio maintained</li>
          <li>✓ Clean edges and proper scaling</li>
        </ul>
      </div>
    </div>
  );
};

export default LogoTest;