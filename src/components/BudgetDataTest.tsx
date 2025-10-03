import React, { useState, useEffect } from 'react';
import { budgetDataBridgeService } from '../services/budgetDataBridgeService';

const BudgetDataTest: React.FC = () => {
  const [hasData, setHasData] = useState(false);
  const [financialData, setFinancialData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const checkData = () => {
      const budgetData = budgetDataBridgeService.loadBudgetDataFromLocalStorage();
      const financial = budgetDataBridgeService.getFinancialData();
      const revenueChart = budgetDataBridgeService.getRevenueChartData();
      
      setHasData(!!budgetData);
      setFinancialData(financial);
      setChartData(revenueChart);
      
      console.log('🔍 Budget Data Test:');
      console.log('  Has budget data:', !!budgetData);
      console.log('  Financial data:', financial);
      console.log('  Chart data:', revenueChart);
    };

    checkData();
    
    // Subscribe to changes
    const unsubscribe = budgetDataBridgeService.subscribe(checkData);
    
    return unsubscribe;
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Budget Data Status</h3>
      
      <div className="space-y-4">
        {hasData ? (
          <>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-green-600 font-medium">
                ✅ Budget data found in localStorage
              </span>
            </div>
            
            {financialData && (
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium mb-2">Financial Summary:</h4>
                <div className="text-sm space-y-1">
                  <div>Total Revenue: ${financialData.totalRevenue?.toLocaleString() || '0'}</div>
                  <div>Total Expenses: ${financialData.totalExpenses?.toLocaleString() || '0'}</div>
                  <div>Net Income: ${financialData.totalNetIncome?.toLocaleString() || '0'}</div>
                  <div>Records: {financialData.totalRecords || '0'}</div>
                  <div>Source: {financialData.dataSource || 'unknown'}</div>
                </div>
              </div>
            )}
            
            {chartData && (
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium mb-2">Chart Data:</h4>
                <div className="text-sm space-y-1">
                  <div>Labels: {chartData.labels?.length || '0'} months</div>
                  <div>Datasets: {chartData.datasets?.length || '0'} lines</div>
                  {chartData.labels && (
                    <div>Months: {chartData.labels.join(', ')}</div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">Upload a CSV to get started</h4>
            <p className="text-sm text-gray-500 mb-4">
              Go to the CSV Budget Importer page to upload your financial data
            </p>
            <div className="text-xs text-gray-400">
              <p>Supported formats:</p>
              <p>• Account Name with monthly columns</p>
              <p>• Income and expense statements</p>
              <p>• Budget and forecast data</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetDataTest;
