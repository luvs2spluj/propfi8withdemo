import React, { useState } from "react";
import Papa from "papaparse";
import HeaderMapper, { FieldSuggestion } from "./HeaderMapper";

const API = (process.env as any).REACT_APP_API_BASE || "http://localhost:5000";

export default function CSVImportFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [, setSamples] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, FieldSuggestion>>({});
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    Papa.parse(f, {
      header: true,
      preview: 30,
      complete: (r: any) => {
        const cols = r.meta.fields || [];
        const sampleRows = (r.data as any[]).slice(0, 5);
        setHeaders(cols);
        setSamples(sampleRows.map((row: any) => cols.map((c: string) => row[c])));
        
        fetch(`${API}/api/map/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            headers: cols, 
            samples: sampleRows.map((row: any) => cols.map((c: string) => row[c])) 
          })
        })
        .then(res => res.json())
        .then(j => setMap(j.field_map || {}));
      }
    });
  };

  const onChange = (orig: string, field: string) => 
    setMap(m => ({ ...m, [orig]: { field, score: 1 } }));

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("field_map", JSON.stringify(map));
      
      const res = await fetch(`${API}/api/import`, { 
        method: "POST", 
        body: fd 
      });
      const j = await res.json();
      setPreview(j.imported_preview || []);
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">CSV Import with AI Parser</h3>
      
      <div>
        <input 
          type="file" 
          accept=".csv" 
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
      
      {!!headers.length && (
        <div>
          <h4 className="text-md font-medium mb-2">Header Mapping</h4>
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
