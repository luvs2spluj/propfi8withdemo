import React, { useEffect, useState } from 'react';
import { localStorageService } from '../services/localStorageService';
import { csvUploadService } from '../services/csvUploadService';
import { chartDataService } from '../services/chartDataService';
import { aiTrainingService } from '../services/aiTrainingService';

export default function DebugConsole() {
  const [errors, setErrors] = useState<string[]>([]);
  const [checks, setChecks] = useState<any[]>([]);

  useEffect(() => {
    performHealthChecks();
    setupErrorLogging();
  }, []);

  const setupErrorLogging = () => {
    // Use React's ErrorBoundary event emulation
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args) => {
      setErrors(prev => [...prev, `ERROR: ${args.join(' ')}`]);
      originalConsoleError(...args);
    };
    
    console.warn = (...args) => {
      setErrors(prev => [...prev, `WARNING: ${args.join(' ')}`]);
      originalConsoleWarn(...args);
    };
  };

  const performHealthChecks = async () => {
    const checks: any[] = [];
    
    try {
      // Test localStorage service
      checks.push({ service: 'localStorage', status: 'testing...', data: null });
      const preferences = localStorageService.getUserPreferences();
      checks.push({ 
        service: 'localStorage', 
        status: preferences ? '✅ OK' : '❌ FAILED', 
        data: preferences ? 'User preferences loaded' : 'No preferences found'
      });
      
      // Test CSV upload service
      checks.push({ service: 'csvUpload', status: 'testing...', data: null });
      const csvFiles = csvUploadService.getAllFiles();
      checks.push({ 
        service: 'csvUpload', 
        status: '✅ OK', 
        data: `Found ${csvFiles.length} CSV files`
      });
      
      // Test chart service
      checks.push({ service: 'chartData', status: 'testing...', data: null });
      const chartData = await chartDataService.generateChartData();
      checks.push({ 
        service: 'chartData', 
        status: '✅ OK', 
        data: `Charts generated: balance=${!!chartData.balanceSheetChart}, cashflow=${!!chartData.cashFlowChart}`
      });
      
      // Test AI service
      checks.push({ service: 'aiTraining', status: 'testing...', data: null });
      const validation = aiTrainingService.validateModel();
      checks.push({ 
        service: 'aiTraining', 
        status: '✅ OK', 
        data: `Accuracy: ${validation.accuracy?.toFixed(1) || '0'} percent`
      });
      
      setChecks(checks);
      
    } catch (error) {
      console.error('Debug health check failed:', error);
      setErrors(prev => [...prev, `HEALTH CHECK ERROR: ${error}`]);
    }
  };

  const populateMockData = async () => {
    try {
      await localStorageService.populateWithMockData();
      await performHealthChecks();
      console.log('Mock data populated successfully');
    } catch (error) {
      console.error('Failed to populate mock data:', error);
    }
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">🔧 PropFI Debug Console</h1>
      
      {/* Health Checks */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Service Health Checks</h2>
        <button 
          onClick={performHealthChecks}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Refresh Checks
        </button>
        <div className="space-y-2">
          {checks.map((check, index) => (
            <div key={index} className="flex items-center justify<｜tool▁sep｜>between p-2 bg-gray-50 rounded">
              <span className="font-medium">{check.service}</span>
              <span className={check.status.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                {check.status}
              </span>
              {check.data && (
                <span className="text-sm text-gray-600 ml-4">{check.data}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Console Errors */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Console Errors & Warnings</h2>
          <button 
            onClick={clearErrors}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
          {errors.length === 0 ? (
            <div>No errors captured yet...</div>
          ) : (
            errors.map((error, index) => (
              <div key={index} className="mb-1">
                {error.includes('ERROR') ? '❌' : '⚠️'} {error}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Debug Actions</h2>
        <div className="space-x-4">
          <button 
            onClick={populateMockData}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            📊 Populate Mock Data
          </button>
          <button 
            onClick={() => {
              console.log('Test log message');
              console.warn('Test warning message');
              console.error('Test error message');
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            🧪 Test Console Logs
          </button>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Environment Info</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>User Agent: {navigator.userAgent}</div>
          <div>Online: {navigator.onLine ? '✅' : '❌'}</div>
          <div>Local Storage: {localStorage ? '✅ Available' : '❌ Not Available'}</div>
          <div>Service Workers: {navigator.serviceWorker ? '✅ Available' : '❌ Not Available'}</div>
        </div>
      </div>
    </div>
  );
}
