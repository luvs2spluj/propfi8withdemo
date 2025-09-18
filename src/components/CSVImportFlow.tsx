import React, { useState } from "react";
import Papa from "papaparse";
import HeaderMapper, { FieldSuggestion } from "./HeaderMapper";

const API = (process.env as any).REACT_APP_API_BASE || "http://localhost:5001";

type FileType = 'cash_flow' | 'balance_sheet' | 'rent_roll' | 'income_statement' | 'general';

export default function CSVImportFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('general');
  const [headers, setHeaders] = useState<string[]>([]);
  const [samples, setSamples] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, FieldSuggestion>>({});
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCategories, setAccountCategories] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    setHasPreviewed(false);
    setSaved(false);
    
    // First try with preview to get headers quickly
    Papa.parse(f, {
      header: true,
      preview: 100, // Increased from 30 to 100 to capture more account line items
      complete: (r: any) => {
        const cols = r.meta.fields || [];
        const sampleRows = (r.data as any[]).slice(0, 5);
        setHeaders(cols);
        setSamples(sampleRows.map((row: any) => cols.map((c: string) => row[c])));
        
        // Auto-generate mapping based on file type
        const autoMap: Record<string, FieldSuggestion> = {};
        for (const col of cols) {
          const colLower = col.toLowerCase();
          if (/account|name|description|item/.test(colLower)) {
            // Skip account name columns - AI will handle them automatically
            autoMap[col] = { field: "", score: 1.0 };
          } else if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q1|q2|q3|q4|total/.test(colLower)) {
            // Auto-map time-series columns
            autoMap[col] = { field: "time_series", score: 0.9 };
          } else {
            // Default unmapped
            autoMap[col] = { field: "", score: 0 };
          }
        }
        setMap(autoMap);
        
        // Now parse the entire file to get all account line items
        Papa.parse(f, {
          header: true,
          complete: (fullR: any) => {
            const allRows = (fullR.data as any[]).filter(row => row && Object.keys(row).length > 0);
            console.log("Processing", allRows.length, "total rows from CSV");
            
            // Auto-categorize individual account line items based on names
            const accountCol = cols.find((col: string) => /account|name|description|item/.test(col.toLowerCase()));
            if (accountCol && allRows.length > 0) {
              const categories: Record<string, string> = {};
              
              for (const row of allRows) {
                const accountName = String(row[accountCol] || "").trim();
                // Include all non-empty account names, excluding only summary/total rows
                if (accountName && 
                    accountName !== "" && 
                    !accountName.toLowerCase().includes("total") &&
                    !accountName.toLowerCase().includes("subtotal") &&
                    !accountName.toLowerCase().includes("summary") &&
                    accountName.length > 2 &&
                    !accountName.toLowerCase().includes("operating income & expense") && // Skip section headers
                    !accountName.toLowerCase().includes("income") && // Skip generic "Income" header
                    !accountName.toLowerCase().includes("expense")) { // Skip generic "Expense" header
                  categories[accountName] = categorizeAccount(accountName);
                }
              }
              setAccountCategories(categories);
              console.log("Detected account categories:", Object.keys(categories).length, "items:", categories); // Debug log
            }
          }
        });
      }
    });
  };

  const categorizeAccount = (accountName: string): string => {
    const name = accountName.toLowerCase();
    
    // File type specific categorization
    switch (fileType) {
      case 'cash_flow':
        return categorizeCashFlowAccount(name);
      case 'balance_sheet':
        return categorizeBalanceSheetAccount(name);
      case 'rent_roll':
        return categorizeRentRollAccount(name);
      case 'income_statement':
        return categorizeIncomeStatementAccount(name);
      default:
        return categorizeGeneralAccount(name);
    }
  };

  const categorizeCashFlowAccount = (name: string): string => {
    // Income accounts for cash flow
    if (/rent|rental|income|revenue|sales|lease|tenant|occupancy|parking|storage|amenity|fee|late fee|pet fee|application fee|deposit|short term|concessions.*rent|insurance.*income|credit reporting.*income|lock.*key.*sales|resident.*tenant.*rents|concessions.*rent|insurance.*admin.*fee|insurance.*svcs.*income/.test(name)) {
      return "income";
    }
    
    // Expense accounts for cash flow
    if (/expense|cost|maintenance|repair|utility|electric|water|gas|insurance.*fee|tax|management.*fee|legal|accounting|marketing|advertising|cleaning|landscaping|pest control|security|trash|sewer|cable|internet|phone|supplies|equipment|contractor|vendor|service|operating|capex|capital|move.*in.*specials|move.*out.*charges|move.*out.*damages|move.*out.*carpet|resident.*charge|garbage|salaries.*wages|payroll.*taxes|workers.*comp|clerical.*postage|move.*out.*charges.*resident|dnu.*move.*out.*damages|dnu.*move.*out.*carpet|water.*service|asset.*management.*fee/.test(name)) {
      return "expense";
    }
    
    return "expense"; // Default to expense for unknown accounts
  };

  const categorizeBalanceSheetAccount = (name: string): string => {
    // Assets
    if (/asset|cash|bank|receivable|inventory|prepaid|equipment|building|land|furniture|fixtures|improvement|deposit|security|petty cash|accounts receivable|notes receivable|investment|property|plant|equipment/.test(name)) {
      return "asset";
    }
    
    // Liabilities
    if (/liability|payable|loan|debt|mortgage|note|accounts payable|notes payable|accrued|wages payable|taxes payable|interest payable|unearned|deposits|security deposits|tenant deposits/.test(name)) {
      return "liability";
    }
    
    // Equity
    if (/equity|capital|retained|earnings|owner|partnership|stock|shares|common stock|preferred stock|treasury/.test(name)) {
      return "equity";
    }
    
    return "asset"; // Default to asset for unknown accounts
  };

  const categorizeRentRollAccount = (name: string): string => {
    // Tenant information
    if (/tenant|resident|lessee|occupant|name|email|phone|contact/.test(name)) {
      return "tenant_info";
    }
    
    // Unit information
    if (/unit|apartment|suite|space|room|bedroom|bathroom|square|sqft|sq\.ft/.test(name)) {
      return "unit_info";
    }
    
    // Financial information
    if (/rent|amount|income|revenue|deposit|fee|late|pet|application|security/.test(name)) {
      return "financial";
    }
    
    // Lease information
    if (/lease|start|end|move.*in|move.*out|term|month|year|date|expir|renew/.test(name)) {
      return "lease_info";
    }
    
    return "tenant_info"; // Default to tenant info
  };

  const categorizeIncomeStatementAccount = (name: string): string => {
    // Revenue accounts
    if (/revenue|income|sales|rent|rental|lease|tenant|occupancy|parking|storage|amenity|fee|late fee|pet fee|application fee|deposit|short term|concessions.*rent|insurance.*income|credit reporting.*income|lock.*key.*sales|resident.*tenant.*rents|concessions.*rent|insurance.*admin.*fee|insurance.*svcs.*income/.test(name)) {
      return "revenue";
    }
    
    // Expense accounts
    if (/expense|cost|maintenance|repair|utility|electric|water|gas|insurance.*fee|tax|management.*fee|legal|accounting|marketing|advertising|cleaning|landscaping|pest control|security|trash|sewer|cable|internet|phone|supplies|equipment|contractor|vendor|service|operating|capex|capital|move.*in.*specials|move.*out.*charges|move.*out.*damages|move.*out.*carpet|resident.*charge|garbage|salaries.*wages|payroll.*taxes|workers.*comp|clerical.*postage|move.*out.*charges.*resident|dnu.*move.*out.*damages|dnu.*move.*out.*carpet|water.*service|asset.*management.*fee/.test(name)) {
      return "expense";
    }
    
    return "expense"; // Default to expense for unknown accounts
  };

  const categorizeGeneralAccount = (name: string): string => {
    // Fallback to cash flow logic for general files
    return categorizeCashFlowAccount(name);
  };

  const updateAccountCategory = (accountName: string, category: string) => {
    setAccountCategories(prev => ({
      ...prev,
      [accountName]: category
    }));
  };

  const onChange = (orig: string, field: string) => 
    setMap(m => ({ ...m, [orig]: { field, score: 1 } }));

  const previewImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setHasPreviewed(false);
    setSaved(false);
    
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("field_map", JSON.stringify(map));
      fd.append("file_type", fileType);
      fd.append("account_categories", JSON.stringify(accountCategories));
      
      const res = await fetch(`${API}/api/import`, { 
        method: "POST", 
        body: fd 
      });
      
      if (!res.ok) {
        throw new Error(`Import failed: ${res.status} ${res.statusText}`);
      }
      
      const j = await res.json();
      setPreview(j.imported_preview || []);
      setHasPreviewed(true);
    } catch (error: any) {
      console.error("Import error:", error);
      setError(`Import failed: ${error.message}. Please check that the API server is running on ${API}`);
    } finally {
      setLoading(false);
    }
  };

  const saveToDatabase = async () => {
    if (!preview.length || !file) return;
    setLoading(true);
    setError(null);
    
    try {
      // Check for duplicates before saving
      const existingCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      const duplicateCSV = existingCSVs.find((csv: any) => 
        csv.fileName === file.name && csv.isActive
      );

      if (duplicateCSV) {
        const confirmed = window.confirm(
          `A CSV with the same filename "${file.name}" already exists.\n\n` +
          `Existing CSV: ${duplicateCSV.totalRecords} records, uploaded ${new Date(duplicateCSV.uploadedAt).toLocaleDateString()}\n` +
          `New CSV: ${preview.length} records\n\n` +
          `Do you want to replace the existing CSV with this new one?\n\n` +
          `Click "OK" to replace, or "Cancel" to keep both (rename the file to avoid conflicts).`
        );

        if (!confirmed) {
          setError('Upload cancelled. Please rename the file to avoid conflicts.');
          return;
        }

        // Remove the duplicate CSV
        const updatedCSVs = existingCSVs.filter((csv: any) => csv.id !== duplicateCSV.id);
        localStorage.setItem('savedCSVs', JSON.stringify(updatedCSVs));
        
        // Trigger dashboard update to remove old data
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
          detail: { 
            action: 'csv_replaced',
            oldCsvId: duplicateCSV.id,
            fileName: file.name
          } 
        }));
      }

      // Create CSV record for management
      const csvRecord = {
        id: Date.now().toString(),
        fileName: file.name,
        fileType: fileType,
        uploadedAt: new Date().toISOString(),
        totalRecords: preview.length,
        accountCategories: accountCategories,
        bucketAssignments: generateBucketAssignments(),
        tags: generateTags(),
        isActive: true,
        previewData: preview
      };

      // Save to localStorage for now (in real app, this would be API call)
      const savedCSVs = JSON.parse(localStorage.getItem('savedCSVs') || '[]');
      savedCSVs.push(csvRecord);
      localStorage.setItem('savedCSVs', JSON.stringify(savedCSVs));
      
      setSaved(true);
      console.log("Data saved to database:", preview.length, "records");
      
      // Show success message with link to management
      setTimeout(() => {
        alert(`CSV saved successfully! Go to "CSV Management" tab to review and adjust categorizations.`);
      }, 500);
      
    } catch (error: any) {
      console.error("Save error:", error);
      setError(`Save failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateBucketAssignments = (): Record<string, string> => {
    const assignments: Record<string, string> = {};
    
    for (const [accountName, category] of Object.entries(accountCategories)) {
      if (category === 'income') {
        // Assign income accounts to appropriate buckets
        if (/rent|rental|tenant/.test(accountName.toLowerCase())) {
          assignments[accountName] = 'gross_rental_income';
        } else {
          assignments[accountName] = 'total_income';
        }
      } else if (category === 'expense') {
        // Assign expense accounts to appropriate buckets
        if (/management|asset management/.test(accountName.toLowerCase())) {
          assignments[accountName] = 'operating_expenses';
        } else {
          assignments[accountName] = 'operating_expenses';
        }
      }
    }
    
    return assignments;
  };

  const generateTags = (): Record<string, string[]> => {
    const tags: Record<string, string[]> = {};
    
    for (const accountName of Object.keys(accountCategories)) {
      const accountLower = accountName.toLowerCase();
      const accountTags: string[] = [];
      
      // Generate tags based on account name patterns
      if (/rent|rental/.test(accountLower)) accountTags.push('rental');
      if (/short term/.test(accountLower)) accountTags.push('short-term');
      if (/utility|water|garbage/.test(accountLower)) accountTags.push('utility');
      if (/management/.test(accountLower)) accountTags.push('management');
      if (/fee/.test(accountLower)) accountTags.push('fee');
      if (/income/.test(accountLower)) accountTags.push('income');
      if (/expense/.test(accountLower)) accountTags.push('expense');
      
      if (accountTags.length > 0) {
        tags[accountName] = accountTags;
      }
    }
    
    return tags;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">CSV Import with AI Parser</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Type
            </label>
            <select 
              value={fileType} 
              onChange={e => setFileType(e.target.value as FileType)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="general">General CSV</option>
              <option value="cash_flow">Cash Flow Statement</option>
              <option value="balance_sheet">Balance Sheet</option>
              <option value="rent_roll">Rent Roll</option>
              <option value="income_statement">Income Statement</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the type of financial document to get better AI mapping suggestions
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File
            </label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
      </div>
      
      {!!headers.length && (
        <div>
          <h4 className="text-md font-medium mb-2">Header Mapping</h4>
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>🤖 Fully Automatic:</strong> {
                fileType === 'cash_flow' ? 
                  'AI automatically categorizes accounts (Rental Income → income, Maintenance → expense) and maps monthly columns to time-series data. No manual mapping needed!' :
                fileType === 'rent_roll' ?
                  'AI automatically maps tenant names, unit numbers, and rent amounts to appropriate fields.' :
                fileType === 'balance_sheet' ?
                  'AI automatically categorizes assets, liabilities, and equity accounts.' :
                fileType === 'income_statement' ?
                  'AI automatically categorizes revenue and expense accounts and maps monthly columns.' :
                  'AI automatically detects and maps all relevant fields based on your file type.'
              }
            </p>
          </div>
              <HeaderMapper headers={headers} suggestions={map} onChange={onChange} fileType={fileType} />
          
          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 border rounded text-xs">
              <strong>Debug Info:</strong> Found {Object.keys(accountCategories).length} account line items
              <br />
              Headers: {headers.join(', ')}
              <br />
              Account Categories: {JSON.stringify(accountCategories, null, 2)}
              <br />
              <strong>Sample Data:</strong> {JSON.stringify(samples.slice(0, 3), null, 2)}
            </div>
          )}
          
          {/* Account Line Items Editor */}
          {Object.keys(accountCategories).length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-lg font-semibold mb-3 text-blue-900">📊 Account Line Items Categorization</h4>
              <p className="text-sm text-blue-800 mb-4">
                <strong>Manual Override:</strong> Review and adjust how each account line item is categorized. 
                The AI has made initial suggestions, but you can change any account from Income to Expense (or vice versa).
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4 bg-white">
                <div className="text-xs text-gray-500 mb-2">
                  Found {Object.keys(accountCategories).length} account line items
                </div>
                {Object.entries(accountCategories).map(([accountName, category]) => (
                  <div key={accountName} className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                    <div className="w-1/2 font-medium text-xs text-gray-800 truncate" title={accountName}>
                      {accountName}
                    </div>
                    <select 
                      className="w-1/3 border border-gray-300 rounded p-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={category}
                      onChange={e => updateAccountCategory(accountName, e.target.value)}
                    >
                      <option value="income">💰 Income</option>
                      <option value="expense">💸 Expense</option>
                    </select>
                    <div className={`w-1/6 text-xs px-2 py-1 rounded text-center font-semibold ${
                      category === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {category === 'income' ? '📈' : '📉'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Pro Tip:</strong> Values will be automatically normalized (negative values become positive) based on the category you select.
                  For example, if "Move In Specials" should be an expense, select "Expense" and the system will treat it as a cost.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {!!headers.length && (
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" 
            onClick={previewImport}
            disabled={loading}
          >
            {loading ? "Processing..." : "🔍 Preview Import"}
          </button>
          
          {hasPreviewed && (
            <button 
              className={`px-4 py-2 rounded text-white font-semibold transition-colors ${
                loading ? 'bg-gray-400 cursor-not-allowed' : saved ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
              }`}
              onClick={saveToDatabase}
              disabled={loading}
            >
              {loading ? "Saving..." : saved ? "✅ Saved!" : "💾 Save to Database"}
            </button>
          )}
        </div>
      )}
      
      {!!preview.length && (
        <div>
          <h4 className="text-md font-medium mb-2">Import Preview</h4>
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>✅ Preview Complete:</strong> {preview.length} records processed successfully. 
              Review the data below and click "Save to Database" when ready.
            </p>
          </div>
          <pre className="text-xs border rounded p-2 max-h-80 overflow-auto bg-gray-50">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}