import React, { useState } from "react";
import Papa from "papaparse";
import HeaderMapper, { FieldSuggestion } from "./HeaderMapper";

const API = (process.env as any).REACT_APP_API_BASE || "http://localhost:5001";

type FileType = 'cash_flow' | 'balance_sheet' | 'rent_roll' | 'income_statement' | 'general';

export default function CSVImportFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('general');
  const [headers, setHeaders] = useState<string[]>([]);
  const [, setSamples] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, FieldSuggestion>>({});
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    Papa.parse(f, {
      header: true,
      preview: 30,
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
      }
    });
  };

  const onChange = (orig: string, field: string) => 
    setMap(m => ({ ...m, [orig]: { field, score: 1 } }));

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    try {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("field_map", JSON.stringify(map));
          fd.append("file_type", fileType);
      
      const res = await fetch(`${API}/api/import`, { 
        method: "POST", 
        body: fd 
      });
      
      if (!res.ok) {
        throw new Error(`Import failed: ${res.status} ${res.statusText}`);
      }
      
      const j = await res.json();
      setPreview(j.imported_preview || []);
    } catch (error: any) {
      console.error("Import error:", error);
      setError(`Import failed: ${error.message}. Please check that the API server is running on ${API}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">CSV Import with AI Parser</h3>
      
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
          <HeaderMapper headers={headers} suggestions={map} onChange={onChange} />
        </div>
      )}
      
      {!!headers.length && (
        <button 
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" 
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Processing..." : "Preview Import"}
        </button>
      )}
      
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
      
      {!!preview.length && (
        <div>
          <h4 className="text-md font-medium mb-2">Import Preview</h4>
          <pre className="text-xs border rounded p-2 max-h-80 overflow-auto bg-gray-50">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

