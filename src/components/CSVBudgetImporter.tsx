import React, { useState, useRef, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { unifiedCSVDataService } from '../services/unifiedCSVDataService';
import CSVManagement from './CSVManagement';
import PropertyManagement from './PropertyManagement';
import { propertyCSVStorageService, PropertyInfo, PropertyCSVRecord } from '../services/propertyCSVStorageService';

interface CSVBudgetImporterProps {
  onDataLoaded?: (data: any) => void;
  className?: string;
}

interface BudgetData {
  buckets: {
    income: { rows: any[]; totals: any };
    expense: { rows: any[]; totals: any };
    other: { rows: any[]; totals: any };
  };
  summary: {
    income: number;
    expense: number;
    noi: number;
  };
}

declare global {
  interface Window {
    csvSmartParser: {
      parseCSVSmart: (text: string) => any[];
      bucketizeSmart: (rows: any[], rules: any) => any;
      toNumSmart: (v: any) => number;
      renderBucketsSmart: (buckets: any) => void;
      initCsvSmart: () => void;
    };
  }
}

export default function CSVBudgetImporter({ onDataLoaded, className = '' }: CSVBudgetImporterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState({
    income: 0,
    expense: 0,
    noi: 0
  });
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [rawText, setRawText] = useState('');
  const [selectedSheetType, setSelectedSheetType] = useState<string>('budget');
  const [uploadedCSVs, setUploadedCSVs] = useState<any[]>([]);
  const [aiLearningData, setAiLearningData] = useState<any[]>([]);
  const [selectedForCharts, setSelectedForCharts] = useState<{[key: string]: boolean}>({});
  const [columnSelections, setColumnSelections] = useState<{
    income: boolean;
    expense: boolean;
    other: boolean;
  }>({ income: true, expense: true, other: true });
  const [selectedProperty, setSelectedProperty] = useState<PropertyInfo | null>(null);
  const [propertyCSVRecords, setPropertyCSVRecords] = useState<PropertyCSVRecord[]>([]);
  const [showPropertyManagement, setShowPropertyManagement] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Load stored data on component mount
  useEffect(() => {
    loadStoredData();
    initializePropertyManagement();
  }, []);

  // Initialize property management
  const initializePropertyManagement = async () => {
    try {
      await propertyCSVStorageService.initialize();
      const properties = await propertyCSVStorageService.getProperties();
      if (properties.length > 0) {
        setSelectedProperty(properties[0]);
        await loadPropertyCSVRecords(properties[0].id);
      }
    } catch (error) {
      console.error('Failed to initialize property management:', error);
    }
  };

  // Load CSV records for selected property
  const loadPropertyCSVRecords = async (propertyId: string) => {
    try {
      const records = await propertyCSVStorageService.getCSVRecords(propertyId);
      setPropertyCSVRecords(records);
    } catch (error) {
      console.error('Failed to load property CSV records:', error);
    }
  };

  // Handle property selection
  const handlePropertySelected = async (property: PropertyInfo) => {
    setSelectedProperty(property);
    await loadPropertyCSVRecords(property.id);
  };

  // Handle CSV upload to property
  const handlePropertyCSVUploaded = (record: PropertyCSVRecord) => {
    setPropertyCSVRecords(prev => [...prev, record]);
    // Also update the regular CSV data
    loadStoredData();
  };

  // Debug selected sheet type changes
  useEffect(() => {
    console.log('Selected sheet type updated to:', selectedSheetType);
  }, [selectedSheetType]);

  // Initialize chart selection when budget data changes
  useEffect(() => {
    if (budgetData?.buckets) {
      const newSelection: {[key: string]: boolean} = {};
      
      // Initialize all items as selected by default
      [...(budgetData.buckets.income?.individualItems || []),
       ...(budgetData.buckets.expense?.individualItems || []),
       ...(budgetData.buckets.other?.individualItems || [])].forEach((item, index) => {
        const key = `${item['Account Name']}_${index}`;
        newSelection[key] = true; // Default to selected
      });
      
      setSelectedForCharts(newSelection);
      
      // Initialize column selections as all selected
      setColumnSelections({ income: true, expense: true, other: true });
    }
  }, [budgetData]);

  const toggleChartSelection = (itemKey: string) => {
    setSelectedForCharts(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  const getSelectedChartData = () => {
    if (!budgetData?.buckets) return { income: [], expense: [], other: [] };
    
    return {
      income: (budgetData.buckets.income?.individualItems || []).filter((item, index) => 
        selectedForCharts[`${item['Account Name']}_${index}`]
      ),
      expense: (budgetData.buckets.expense?.individualItems || []).filter((item, index) => 
        selectedForCharts[`${item['Account Name']}_${index}`]
      ),
      other: (budgetData.buckets.other?.individualItems || []).filter((item, index) => 
        selectedForCharts[`${item['Account Name']}_${index}`]
      )
    };
  };

  const toggleColumnSelection = (column: 'income' | 'expense' | 'other') => {
    const newColumnSelections = {
      ...columnSelections,
      [column]: !columnSelections[column]
    };
    setColumnSelections(newColumnSelections);

    // Update individual item selections based on column selection
    const newSelection = { ...selectedForCharts };
    
    if (column === 'income') {
      (budgetData?.buckets.income?.individualItems || []).forEach((item, index) => {
        const key = `${item['Account Name']}_${index}`;
        newSelection[key] = newColumnSelections.income;
      });
    } else if (column === 'expense') {
      (budgetData?.buckets.expense?.individualItems || []).forEach((item, index) => {
        const key = `${item['Account Name']}_${index}`;
        newSelection[key] = newColumnSelections.expense;
      });
    } else if (column === 'other') {
      (budgetData?.buckets.other?.individualItems || []).forEach((item, index) => {
        const key = `${item['Account Name']}_${index}`;
        newSelection[key] = newColumnSelections.other;
      });
    }
    
    setSelectedForCharts(newSelection);
  };

  const loadStoredData = () => {
    try {
      // Load uploaded CSVs
      const storedCSVs = localStorage.getItem('uploadedCSVs');
      if (storedCSVs) {
        setUploadedCSVs(JSON.parse(storedCSVs));
      } else {
        setUploadedCSVs([]);
      }

      // Load AI learning data
      const storedAI = localStorage.getItem('aiLearningData');
      if (storedAI) {
        setAiLearningData(JSON.parse(storedAI));
      } else {
        setAiLearningData([]);
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  };

  const saveStoredData = (csvData: any, sheetType: string) => {
    try {
      const csvRecord = {
        id: Date.now().toString(),
        name: csvData.fileName || 'Uploaded CSV',
        type: sheetType,
        data: csvData,
        uploadedAt: new Date().toISOString(),
        categorization: csvData.buckets
      };

      const updatedCSVs = [...uploadedCSVs, csvRecord];
      setUploadedCSVs(updatedCSVs);
      localStorage.setItem('uploadedCSVs', JSON.stringify(updatedCSVs));

      // Update AI learning data
      const learningRecord = {
        sheetType,
        patterns: extractPatterns(csvData),
        timestamp: new Date().toISOString()
      };

      const updatedAI = [...aiLearningData, learningRecord];
      setAiLearningData(updatedAI);
      localStorage.setItem('aiLearningData', JSON.stringify(updatedAI));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const extractPatterns = (csvData: any) => {
    // Extract patterns for AI learning
    const patterns = {
      incomePatterns: [],
      expensePatterns: [],
      otherPatterns: []
    };

    if (csvData.buckets?.income?.individualItems) {
      patterns.incomePatterns = csvData.buckets.income.individualItems.map((item: any) => 
        item['Account Name']?.toLowerCase()
      ).filter(Boolean);
    }

    if (csvData.buckets?.expense?.individualItems) {
      patterns.expensePatterns = csvData.buckets.expense.individualItems.map((item: any) => 
        item['Account Name']?.toLowerCase()
      ).filter(Boolean);
    }

    if (csvData.buckets?.other?.individualItems) {
      patterns.otherPatterns = csvData.buckets.other.individualItems.map((item: any) => 
        item['Account Name']?.toLowerCase()
      ).filter(Boolean);
    }

    return patterns;
  };

  // Budget categorization rules (same as csv-smart.js)
  const budgetRules = {
    buckets: {
      income: [
        "Resident / Tenant Rents & Asmts",
        "Short Term Rentals",
        "Concessions",
        "Concessions - Rent",
        "Move In Specials / Incentives",
        "Move Out Charges - Resident",
        "DNU-Move Out Carpet Cleaning",
        "DNU-Move Out Damages",
        "Resident Charge Non Move Out",
        "Late Fees",
        "Insurance Admin Fee",
        "Insurance Svcs Income",
        "Credit Reporting Services Income",
        "Garbage",
        "Water Service",
        "Application Fees",
        "Pet Fees",
        "Lock / Key Sales",
        "Total Operating Income"
      ],
      expense: [
        "Management Fees",
        "Asset Management Fee",
        "Salaries and Wages - Onsite Mgt",
        "DNU-Payroll Taxes - Onsite Mgt",
        "DNU-Workers Comp - Onsite Mgt",
        "Clerical , Postage & Other Office Supplies",
        "DNU-Postage",
        "Bank Charges / Merchant Fees",
        "DNU-Inspection Fees",
        "General Insurance - Fire & Liability",
        "Landlord Liability Insurance Expense",
        "Real Property Taxes",
        "Legal Services",
        "Marketing / Advertising  Expenses",
        "Resident Relations",
        "Total GENERAL & ADMINISTRATIVE EXPENSE",
        "Credit Reporting Expense",
        "Utilities",
        "DNU-Electricity",
        "Water & Sewer",
        "Refuse Disposal",
        "Sewer",
        "Pest Control",
        "Computers, Server, Phones and IT",
        "Fire & Alarm Systems",
        "Maintenance & Repair ",
        "Maintenance Materials & Supplies",
        "R & M - Appliances",
        "R & M - Plumbing",
        "R & M - Interior Paint",
        "R & M - Move Out Costs",
        "HVAC Maintenance",
        "DNU-Carpet Cleaning",
        "Total FACILITY EXPENSE",
        "Landscape Services",
        "DNU-Landscape - Extras",
        "DNU-Landscape - Other",
        "Total GROUNDS LANDSCAPING EXPENSE",
        "DNU-MRR-Appliances (Dishwasher)",
        "DNU-MRR-Appliances (Washer)",
        "DNU-MRR-Appliances (Hood Microwave)",
        "DNU-MRR - Painting (Building)",
        "Total MAJOR REPAIR & REPLACEMENTS",
        "Total Operating Expense",
        "Total Expense"
      ],
      other: [
        "NOI - Net Operating Income",
        "Net Income",
        "Other Items",
        "Security Deposit Cash",
        "Prepaid Revenue",
        "Refundable Security Deposits",
        "Accrued Property Taxes (Real & Personal)",
        "Accrued Other Expenses",
        "Owner Withdrawals",
        "Net Other Items",
        "Cash Flow",
        "Beginning Cash",
        "Beginning Cash + Cash Flow",
        "Actual Ending Cash",
        "Total Income"
      ]
    },
    monthColumns: [
      "Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024",
      "Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025", "May 2025",
      "Jun 2025", "Jul 2025"
    ],
    totalColumn: "Total"
  };

  // Smart CSV parsing (same logic as csv-smart.js)
  const parseCSVSmart = (text: string): any[] => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length === 0) return [];
    
    const rows = [];
    
    for (const line of lines) {
      const row = parseCSVLine(line);
      if (row && row.length > 0) {
        rows.push(row);
      }
    }
    
    if (rows.length === 0) return [];
    
    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    // Convert to objects
    const result = dataRows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
    
    return result;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Add last field
    result.push(current.trim());
    
    return result;
  };

  // Robust numeric parsing
  const toNumSmart = (v: any): number => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    
    // Handle various formats
    let s = String(v).trim();
    
    // Remove quotes
    s = s.replace(/"/g, '');
    
    // Handle parentheses as negative
    if (s.startsWith('(') && s.endsWith(')')) {
      s = '-' + s.slice(1, -1);
    }
    
    // Remove commas and other formatting
    s = s.replace(/,/g, '');
    
    // Handle currency symbols
    s = s.replace(/[$]/g, '');
    
    // Parse as float
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  // Smart bucketing with fuzzy matching
  const bucketizeSmart = (rows: any[]) => {
    const months = budgetRules.monthColumns;
    const totalCol = budgetRules.totalColumn;
    const buckets = { income: [], expense: [], other: [] };
    
    for (const row of rows) {
      const name = (row['Account Name'] || '').trim();
      
      // Skip empty or non-data rows
      if (!name || name === '' || name.includes('---') || name.includes('===')) {
        continue;
      }
      
      // Skip section headers (usually all caps or contain specific patterns)
      if (name === name.toUpperCase() && name.length > 10) {
        continue;
      }
      
      // Skip "Total" rows and section headers - we'll calculate our own totals
      if (name.toLowerCase().includes('total') || 
          name.toLowerCase().includes('subtotal') ||
          name.toLowerCase().includes('grand total') ||
          name.toLowerCase().includes('net income') ||
          name.toLowerCase().includes('net operating income') ||
          name.toLowerCase().includes('noi') ||
          (name === name.toUpperCase() && name.length > 5)) {
        continue;
      }
      
      // Smart matching with fuzzy logic
      const inBucket = (bucketName: string) => {
        const bucketTerms = budgetRules.buckets[bucketName as keyof typeof budgetRules.buckets];
        return bucketTerms.some(term => {
          const termLower = term.toLowerCase();
          const nameLower = name.toLowerCase();
          
          // Exact match
          if (nameLower === termLower) return true;
          
          // Contains match
          if (nameLower.includes(termLower) || termLower.includes(nameLower)) return true;
          
          // Fuzzy match for common variations
          const variations = [
            termLower.replace(/[^a-z0-9]/g, ''),
            nameLower.replace(/[^a-z0-9]/g, '')
          ];
          
          if (variations[0] === variations[1]) return true;
          
          return false;
        });
      };
      
      let key = 'other';
      if (inBucket('income')) key = 'income';
      else if (inBucket('expense')) key = 'expense';
      
      buckets[key as keyof typeof buckets].push(row);
    }
    
    // Calculate rollups (totals)
    const rollup = (rows: any[]) => {
      const out: any = { 'Account Name': 'TOTAL' };
      for (const m of months) {
        out[m] = rows.reduce((a, r) => a + toNumSmart(r[m]), 0);
      }
      out[totalCol] = rows.reduce((a, r) => a + toNumSmart(r[totalCol]), 0);
      return out;
    };
    
    return {
      income: { 
        rows: buckets.income, 
        totals: rollup(buckets.income),
        individualItems: buckets.income || [] // For chart data, ensure array
      },
      expense: { 
        rows: buckets.expense, 
        totals: rollup(buckets.expense),
        individualItems: buckets.expense || [] // For chart data, ensure array
      },
      other: { 
        rows: buckets.other, 
        totals: rollup(buckets.other),
        individualItems: buckets.other || [] // For chart data, ensure array
      }
    };
  };

  const processData = (rows: any[]) => {
    const buckets = bucketizeSmart(rows);
    
    // Calculate summary
    const sumIncome = buckets.income.totals[budgetRules.totalColumn] || 0;
    const sumExpense = buckets.expense.totals[budgetRules.totalColumn] || 0;
    const sumNOI = sumIncome - sumExpense;
    
    const newSummaryData = {
      income: sumIncome,
      expense: sumExpense,
      noi: sumNOI
    };
    
    const newBudgetData = {
      buckets,
      summary: newSummaryData,
      // Chart-ready data
      chartData: {
        incomeItems: buckets.income.individualItems,
        expenseItems: buckets.expense.individualItems,
        otherItems: buckets.other.individualItems,
        totals: {
          income: sumIncome,
          expense: sumExpense,
          other: buckets.other.totals[budgetRules.totalColumn] || 0,
          noi: sumNOI
        }
      }
    };
    
    setSummaryData(newSummaryData);
    setBudgetData(newBudgetData);
    
    // Store in localStorage
    localStorage.setItem('buckets', JSON.stringify(buckets));
    
    // Save to our enhanced storage system
    saveStoredData(newBudgetData, selectedSheetType);
    
    if (onDataLoaded) {
      onDataLoaded(newBudgetData);
    }
    
    console.log('✅ CSV processed successfully:', newSummaryData);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    
    try {
      const content = await readFileContent(file);
      const rows = parseCSVSmart(content);
      processData(rows);
    } catch (error) {
      console.error('❌ Error processing CSV:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextParse = () => {
    if (!rawText.trim()) return;
    
    setIsLoading(true);
    
    try {
      const rows = parseCSVSmart(rawText);
      processData(rows);
    } catch (error) {
      console.error('❌ Error processing text:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const loadSavedData = () => {
    const saved = localStorage.getItem('buckets');
    if (saved) {
      try {
        const buckets = JSON.parse(saved);
        
        // Calculate summary from buckets
        const sumIncome = buckets.income.totals[budgetRules.totalColumn] || 0;
        const sumExpense = buckets.expense.totals[budgetRules.totalColumn] || 0;
        const sumNOI = sumIncome - sumExpense;
        
        const summaryData = {
          income: sumIncome,
          expense: sumExpense,
          noi: sumNOI
        };
        
        const budgetData = {
          buckets,
          summary: summaryData
        };
        
        setBudgetData(budgetData);
        setSummaryData(summaryData);
        
        if (onDataLoaded) {
          onDataLoaded(budgetData);
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  };

  const clearData = () => {
    localStorage.removeItem('buckets');
    setBudgetData(null);
    setSummaryData({ income: 0, expense: 0, noi: 0 });
    setRawText('');
    if (textAreaRef.current) {
      textAreaRef.current.value = '';
    }
  };

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        📊 Smart CSV Budget Parser
      </h2>
      
      {/* Property Management Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">🏢 Property Management</h3>
          <button
            onClick={() => setShowPropertyManagement(!showPropertyManagement)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Building2 className="w-4 h-4" />
            <span>{showPropertyManagement ? 'Hide' : 'Show'} Property Management</span>
          </button>
        </div>
        
        {showPropertyManagement && (
          <PropertyManagement
            onPropertySelected={handlePropertySelected}
            onCSVUploaded={handlePropertyCSVUploaded}
            className="mb-4"
          />
        )}
        
        {selectedProperty && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Selected Property:</span>
              <span className="text-blue-700">{selectedProperty.name}</span>
              {selectedProperty.address && (
                <span className="text-blue-600 text-sm">({selectedProperty.address})</span>
              )}
            </div>
            <div className="mt-2 text-sm text-blue-600">
              {propertyCSVRecords.length} CSV files uploaded • 
              {propertyCSVRecords.filter(r => r.isActive).length} active
            </div>
          </div>
        )}
      </div>
      
      <p className="text-gray-600 mb-4">
        Upload your CSV file or paste raw text to automatically categorize income, expenses, and other items.
        Handles complex formatting including commas in names, mixed quoting, and section headers.
      </p>

      {/* Sheet Type Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Sheet Type Selection</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Sheet Type</label>
              <select 
                value={selectedSheetType} 
                onChange={(e) => {
                  console.log('Sheet type changed to:', e.target.value);
                  setSelectedSheetType(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="budget">Budget/Income Statement</option>
                <option value="rent-roll">Rent Roll</option>
                <option value="balance-sheet">Balance Sheet</option>
                <option value="cash-flow">Cash Flow Statement</option>
                <option value="maintenance-log">Maintenance Log</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">AI Learning Status</label>
              <div className="text-sm text-gray-600">
                {(aiLearningData?.length || 0) > 0 ? (
                  <span className="text-green-600">✅ Learning from {aiLearningData?.length || 0} previous uploads</span>
                ) : (
                  <span className="text-yellow-600">⚠️ No previous data - will learn from this upload</span>
                )}
                <br />
                <span className="text-xs text-gray-500">Current sheet type: <strong>{selectedSheetType}</strong></span>
                <br />
                <button 
                  onClick={() => setSelectedSheetType('rent-roll')}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Test: Set to Rent Roll
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Stored CSVs</label>
              <div className="text-sm text-gray-600">
                {uploadedCSVs && (uploadedCSVs?.length || 0) > 0 ? (
                  <span className="text-blue-600">📁 {uploadedCSVs?.length || 0} CSV(s) stored locally</span>
                ) : (
                  <span className="text-gray-500">No CSVs stored yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* File Upload */}
      <div className="mb-4">
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".csv" 
          onChange={handleFileInputChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2"
        />
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              </div>
              <p className="text-lg font-medium text-gray-700">Processing CSV...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto text-gray-400">
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Drop your CSV file here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Choose File
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Text Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Or paste raw CSV text:
        </label>
        <textarea
          ref={textAreaRef}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste your CSV data here..."
          className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg font-mono text-sm resize-vertical"
        />
        <button
          onClick={handleTextParse}
          className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Parse Text Below
        </button>
      </div>
      
      {/* Controls */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={loadSavedData}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Load Saved Data
        </button>
        <button
          onClick={clearData}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Clear Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-800">Total Income</h3>
          <p className="text-2xl font-bold text-green-600">
            ${summaryData.income.toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800">Total Expense</h3>
          <p className="text-2xl font-bold text-red-600">
            ${summaryData.expense.toLocaleString()}
          </p>
        </div>
        <div className={`border rounded-lg p-4 ${summaryData.noi >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className={`font-medium ${summaryData.noi >= 0 ? 'text-green-800' : 'text-red-800'}`}>NOI</h3>
          <p className={`text-2xl font-bold ${summaryData.noi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${summaryData.noi.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Categorization Summary */}
      {budgetData && budgetData.buckets && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Categorization Summary</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Income Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-green-800">Income ({budgetData.buckets.income.individualItems?.length || 0} items)</h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={columnSelections.income}
                      onChange={() => toggleColumnSelection('income')}
                      className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                    />
                    <span className="text-xs text-gray-700">Select All Income</span>
                  </div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {(budgetData.buckets.income.individualItems || []).map((row, index) => {
                    const itemKey = `${row['Account Name']}_${index}`;
                    const isSelected = selectedForCharts[itemKey];
                    return (
                      <div key={index} className="text-sm text-gray-900 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleChartSelection(itemKey)}
                            className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                          />
                          <span className="truncate text-gray-900">{row['Account Name']}</span>
                        </div>
                        <span className="font-medium text-gray-900">${toNumSmart(row[budgetRules.totalColumn]).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t border-green-200">
                  <div className="text-sm font-bold text-green-800 flex justify-between">
                    <span>Total Income:</span>
                    <span>${toNumSmart(budgetData.buckets.income.totals[budgetRules.totalColumn]).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Expense Summary */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-red-800">Expenses ({budgetData.buckets.expense.individualItems?.length || 0} items)</h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={columnSelections.expense}
                      onChange={() => toggleColumnSelection('expense')}
                      className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                    />
                    <span className="text-xs text-gray-700">Select All Expenses</span>
                  </div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {(budgetData.buckets.expense.individualItems || []).map((row, index) => {
                    const itemKey = `${row['Account Name']}_${index}`;
                    const isSelected = selectedForCharts[itemKey];
                    return (
                      <div key={index} className="text-sm text-gray-900 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleChartSelection(itemKey)}
                            className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                          />
                          <span className="truncate text-gray-900">{row['Account Name']}</span>
                        </div>
                        <span className="font-medium text-gray-900">${toNumSmart(row[budgetRules.totalColumn]).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t border-red-200">
                  <div className="text-sm font-bold text-red-800 flex justify-between">
                    <span>Total Expenses:</span>
                    <span>${toNumSmart(budgetData.buckets.expense.totals[budgetRules.totalColumn]).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Other Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-800">Other ({budgetData.buckets.other.individualItems?.length || 0} items)</h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={columnSelections.other}
                      onChange={() => toggleColumnSelection('other')}
                      className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700">Select All Other</span>
                  </div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {(budgetData.buckets.other.individualItems || []).map((row, index) => {
                    const itemKey = `${row['Account Name']}_${index}`;
                    const isSelected = selectedForCharts[itemKey];
                    return (
                      <div key={index} className="text-sm text-gray-900 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleChartSelection(itemKey)}
                            className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                          />
                          <span className="truncate text-gray-900">{row['Account Name']}</span>
                        </div>
                        <span className="font-medium text-gray-900">${toNumSmart(row[budgetRules.totalColumn]).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <div className="text-sm font-bold text-blue-800 flex justify-between">
                    <span>Total Other:</span>
                    <span>${toNumSmart(budgetData.buckets.other.totals[budgetRules.totalColumn]).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Overall Summary */}
            <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">📊 Overall Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-600">Total Accounts</div>
                  <div className="font-bold text-lg">
                    {(budgetData.buckets.income.individualItems?.length || 0) + (budgetData.buckets.expense.individualItems?.length || 0) + (budgetData.buckets.other.individualItems?.length || 0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-green-600">Income Items</div>
                  <div className="font-bold text-lg text-green-600">
                    {budgetData.buckets.income.individualItems?.length || 0}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-red-600">Expense Items</div>
                  <div className="font-bold text-lg text-red-600">
                    {budgetData.buckets.expense.individualItems?.length || 0}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-blue-600">Other Items</div>
                  <div className="font-bold text-lg text-blue-600">
                    {budgetData.buckets.other.individualItems?.length || 0}
                  </div>
                </div>
              </div>
              
              {/* Validation Status */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Categorization Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    (budgetData.buckets.other.individualItems?.length || 0) === 0 ? 
                    'bg-green-100 text-green-800' : 
                    (budgetData.buckets.other.individualItems?.length || 0) <= 2 ?
                    'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {(budgetData.buckets.other.individualItems?.length || 0) === 0 ? 
                      '✅ All accounts categorized' : 
                      (budgetData.buckets.other.individualItems?.length || 0) <= 2 ?
                      `⚠️ ${budgetData.buckets.other.individualItems?.length || 0} uncategorized` :
                      `❌ ${budgetData.buckets.other.individualItems?.length || 0} uncategorized`
                    }
                  </span>
                </div>
                {(budgetData.buckets.other.individualItems?.length || 0) > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    Review "Other" category to ensure proper categorization
                  </div>
                )}
              </div>
            </div>
            
            {/* Detailed Categorization Table */}
            <div className="mt-4">
              <h4 className="font-medium text-gray-800 mb-3">🔍 Detailed Categorization Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-base">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Include in Charts</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Account Name</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span>Category</span>
                          <div className="flex space-x-1">
                            <input
                              type="checkbox"
                              checked={columnSelections.income}
                              onChange={() => toggleColumnSelection('income')}
                              className="w-3 h-3 text-green-600 border-green-300 rounded focus:ring-green-500"
                              title="Select All Income"
                            />
                            <input
                              type="checkbox"
                              checked={columnSelections.expense}
                              onChange={() => toggleColumnSelection('expense')}
                              className="w-3 h-3 text-red-600 border-red-300 rounded focus:ring-red-500"
                              title="Select All Expenses"
                            />
                            <input
                              type="checkbox"
                              checked={columnSelections.other}
                              onChange={() => toggleColumnSelection('other')}
                              className="w-3 h-3 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                              title="Select All Other"
                            />
                          </div>
                        </div>
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Total Amount</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Match Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...(budgetData.buckets.income.individualItems || []).map(row => ({ ...row, category: 'Income', matchType: 'Income Rule' })),
                      ...(budgetData.buckets.expense.individualItems || []).map(row => ({ ...row, category: 'Expense', matchType: 'Expense Rule' })),
                      ...(budgetData.buckets.other.individualItems || []).map(row => ({ ...row, category: 'Other', matchType: 'Default/Other' }))
                    ].map((row, index) => {
                      const itemKey = `${row['Account Name']}_${index}`;
                      const isSelected = selectedForCharts[itemKey];
                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleChartSelection(itemKey)}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-900">{row['Account Name']}</td>
                          <td className="border border-gray-300 px-4 py-3">
                            <span className={`px-3 py-1 rounded text-sm font-semibold ${
                              row.category === 'Income' ? 'bg-green-100 text-green-800' :
                              row.category === 'Expense' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {row.category}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-right font-bold text-gray-900">
                            ${toNumSmart(row[budgetRules.totalColumn]).toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                            {row.matchType}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Chart Selection Controls */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-yellow-800">🎛️ Chart Selection Controls</h4>
                <button
                  onClick={() => {
                    const newSelection: {[key: string]: boolean} = {};
                    [...(budgetData.buckets.income?.individualItems || []),
                     ...(budgetData.buckets.expense?.individualItems || []),
                     ...(budgetData.buckets.other?.individualItems || [])].forEach((item, index) => {
                      const key = `${item['Account Name']}_${index}`;
                      newSelection[key] = true;
                    });
                    setSelectedForCharts(newSelection);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
                >
                  ✅ Select All Items
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const newSelection: {[key: string]: boolean} = {};
                    [...(budgetData.buckets.income?.individualItems || []),
                     ...(budgetData.buckets.expense?.individualItems || []),
                     ...(budgetData.buckets.other?.individualItems || [])].forEach((item, index) => {
                      const key = `${item['Account Name']}_${index}`;
                      newSelection[key] = false;
                    });
                    setSelectedForCharts(newSelection);
                  }}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  Deselect All
                </button>
                <button
                  onClick={() => {
                    const newSelection: {[key: string]: boolean} = {};
                    [...(budgetData.buckets.income?.individualItems || [])].forEach((item, index) => {
                      const key = `${item['Account Name']}_${index}`;
                      newSelection[key] = true;
                    });
                    [...(budgetData.buckets.expense?.individualItems || []),
                     ...(budgetData.buckets.other?.individualItems || [])].forEach((item, index) => {
                      const key = `${item['Account Name']}_${index}`;
                      newSelection[key] = false;
                    });
                    setSelectedForCharts(newSelection);
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  Income Only
                </button>
                <button
                  onClick={() => {
                    const newSelection: {[key: string]: boolean} = {};
                    [...(budgetData.buckets.expense?.individualItems || [])].forEach((item, index) => {
                      const key = `${item['Account Name']}_${index}`;
                      newSelection[key] = true;
                    });
                    [...(budgetData.buckets.income?.individualItems || []),
                     ...(budgetData.buckets.other?.individualItems || [])].forEach((item, index) => {
                      const key = `${item['Account Name']}_${index}`;
                      newSelection[key] = false;
                    });
                    setSelectedForCharts(newSelection);
                  }}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
                >
                  Expenses Only
                </button>
              </div>
            </div>
            
            {/* Chart Data Export */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-3">📊 Chart Data Available</h4>
              <div className="text-sm text-blue-700 space-y-2">
                <p><strong>Selected Items for Charts:</strong></p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Income Items:</span> {getSelectedChartData().income?.length || 0} of {budgetData?.buckets?.income?.individualItems?.length || 0} selected
                  </div>
                  <div>
                    <span className="font-medium">Expense Items:</span> {getSelectedChartData().expense?.length || 0} of {budgetData?.buckets?.expense?.individualItems?.length || 0} selected
                  </div>
                  <div>
                    <span className="font-medium">Other Items:</span> {getSelectedChartData().other?.length || 0} of {budgetData?.buckets?.other?.individualItems?.length || 0} selected
                  </div>
                </div>
                <div className="mt-2 p-2 bg-white rounded border text-xs">
                  <strong>Selected Chart Data:</strong><br/>
                  <code className="text-gray-600">
                    {getSelectedChartData().income?.length || 0} income items<br/>
                    {getSelectedChartData().expense?.length || 0} expense items<br/>
                    {getSelectedChartData().other?.length || 0} other items<br/>
                    {budgetData?.chartData?.totals ? 'Totals available' : 'No totals'}
                  </code>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  💡 Use checkboxes above to select which items appear in charts
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Tables */}
      {budgetData && budgetData.buckets && (
        <div className="space-y-6">
          {/* Income Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Income</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left">Account Name</th>
                    {budgetRules.monthColumns.map(month => (
                      <th key={month} className="border border-gray-300 px-3 py-2 text-left">{month}</th>
                    ))}
                    <th className="border border-gray-300 px-3 py-2 text-left">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(budgetData.buckets.income.individualItems || []).map((row, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-3 py-2">{row['Account Name']}</td>
                      {budgetRules.monthColumns.map(month => (
                        <td key={month} className="border border-gray-300 px-3 py-2 text-right">
                          {toNumSmart(row[month]).toLocaleString()}
                        </td>
                      ))}
                      <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                        {toNumSmart(row[budgetRules.totalColumn]).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 px-3 py-2">TOTAL</td>
                    {budgetRules.monthColumns.map(month => (
                      <td key={month} className="border border-gray-300 px-3 py-2 text-right">
                        {toNumSmart(budgetData.buckets.income.totals[month]).toLocaleString()}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      {toNumSmart(budgetData.buckets.income.totals[budgetRules.totalColumn]).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Expenses</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left">Account Name</th>
                    {budgetRules.monthColumns.map(month => (
                      <th key={month} className="border border-gray-300 px-3 py-2 text-left">{month}</th>
                    ))}
                    <th className="border border-gray-300 px-3 py-2 text-left">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(budgetData.buckets.expense.individualItems || []).map((row, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-3 py-2">{row['Account Name']}</td>
                      {budgetRules.monthColumns.map(month => (
                        <td key={month} className="border border-gray-300 px-3 py-2 text-right">
                          {toNumSmart(row[month]).toLocaleString()}
                        </td>
                      ))}
                      <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                        {toNumSmart(row[budgetRules.totalColumn]).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 px-3 py-2">TOTAL</td>
                    {budgetRules.monthColumns.map(month => (
                      <td key={month} className="border border-gray-300 px-3 py-2 text-right">
                        {toNumSmart(budgetData.buckets.expense.totals[month]).toLocaleString()}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      {toNumSmart(budgetData.buckets.expense.totals[budgetRules.totalColumn]).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Other Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Other / Derived</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left">Account Name</th>
                    {budgetRules.monthColumns.map(month => (
                      <th key={month} className="border border-gray-300 px-3 py-2 text-left">{month}</th>
                    ))}
                    <th className="border border-gray-300 px-3 py-2 text-left">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(budgetData.buckets.other.individualItems || []).map((row, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-3 py-2">{row['Account Name']}</td>
                      {budgetRules.monthColumns.map(month => (
                        <td key={month} className="border border-gray-300 px-3 py-2 text-right">
                          {toNumSmart(row[month]).toLocaleString()}
                        </td>
                      ))}
                      <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                        {toNumSmart(row[budgetRules.totalColumn]).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 px-3 py-2">TOTAL</td>
                    {budgetRules.monthColumns.map(month => (
                      <td key={month} className="border border-gray-300 px-3 py-2 text-right">
                        {toNumSmart(budgetData.buckets.other.totals[month]).toLocaleString()}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      {toNumSmart(budgetData.buckets.other.totals[budgetRules.totalColumn]).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Stored CSVs Section */}
      {uploadedCSVs && (uploadedCSVs?.length || 0) > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📁 Stored CSV Files</h3>
          <div className="space-y-4">
            {uploadedCSVs.map((csv, index) => (
              <div key={csv.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-800">{csv.name}</h4>
                    <div className="text-sm text-gray-600">
                      Type: <span className="font-medium">{csv.type}</span> • 
                      Uploaded: <span className="font-medium">{new Date(csv.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setBudgetData(csv.data)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      View Data
                    </button>
                    <button 
                      onClick={() => {
                        const updatedCSVs = uploadedCSVs.filter(c => c.id !== csv.id);
                        setUploadedCSVs(updatedCSVs);
                        localStorage.setItem('uploadedCSVs', JSON.stringify(updatedCSVs));
                      }}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {/* Show categorization summary */}
                {csv.categorization && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-green-50 p-2 rounded">
                      <div className="font-medium text-green-800">Income</div>
                      <div className="text-green-600">{csv.categorization.income?.individualItems?.length || 0} items</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded">
                      <div className="font-medium text-red-800">Expenses</div>
                      <div className="text-red-600">{csv.categorization.expense?.individualItems?.length || 0} items</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="font-medium text-blue-800">Other</div>
                      <div className="text-blue-600">{csv.categorization.other?.individualItems?.length || 0} items</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* CSV Management Section */}
      <div className="mt-8">
        <CSVManagement 
          onCSVSelected={(csv) => {
            console.log('CSV selected:', csv);
            // You can add logic here to load the selected CSV data
          }}
          onCSVDeleted={(csvId) => {
            console.log('CSV deleted:', csvId);
            // Refresh the data
            loadStoredData();
          }}
          showUploadButton={false}
          className="mb-6"
        />
      </div>
      
      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
        <h3 className="font-medium text-blue-800 mb-2">💡 Smart Parser Features</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Handles commas in account names (e.g., "Clerical , Postage")</li>
          <li>• Processes mixed quoting and thousands separators</li>
          <li>• Filters out section headers and non-data rows</li>
          <li>• Handles negatives in parentheses and currency symbols</li>
          <li>• Fuzzy matching for account categorization</li>
          <li>• Auto-saves to localStorage for persistence</li>
          <li>• <strong>NEW:</strong> Sheet type selection for better categorization</li>
          <li>• <strong>NEW:</strong> AI learning from previous uploads</li>
          <li>• <strong>NEW:</strong> Local storage of all uploaded CSVs</li>
          <li>• <strong>NEW:</strong> View stored CSVs as actual spreadsheets</li>
        </ul>
      </div>
    </div>
  );
}