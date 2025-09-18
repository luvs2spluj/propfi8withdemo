import React from "react";

export type FieldSuggestion = { field: string; score: number };

const color = (f: string): string => {
  if (["property_name", "address", "city", "state", "zip", "unit_id"].includes(f)) return "bg-blue-100";
  if (["tenant_name", "email", "phone", "move_in", "move_out", "deposit", "status"].includes(f)) return "bg-green-100";
  if (["period", "income", "expense", "noi", "capex", "taxes", "insurance", "mortgage", "balance", "arrears", "asset", "liability", "equity"].includes(f)) return "bg-purple-100";
  if (f === "time_series") return "bg-orange-100";
  return "bg-gray-100";
};

const ALL_FIELDS = {
  cash_flow: [
    "period", "income", "expense", "noi", "capex", "taxes", "insurance", "mortgage", "balance", "arrears",
    "time_series"
  ],
  balance_sheet: [
    "asset", "liability", "equity", "cash", "receivable", "payable", "loan", "mortgage", "investment",
    "period"
  ],
  rent_roll: [
    "tenant_name", "email", "phone", "unit_id", "move_in", "move_out", "deposit", "status",
    "income", "period"
  ],
  income_statement: [
    "period", "income", "expense", "revenue", "cost", "noi", "taxes", "insurance", "mortgage",
    "time_series"
  ],
  general: [
    "property_name", "address", "city", "state", "zip", "unit_id",
    "tenant_name", "email", "phone", "move_in", "move_out", "deposit", "status",
    "period", "income", "expense", "noi", "capex", "taxes", "insurance", "mortgage", "balance", "arrears", "asset", "liability", "equity",
    "time_series"
  ]
};

const ALL = [
  "property_name", "address", "city", "state", "zip", "unit_id",
  "tenant_name", "email", "phone", "move_in", "move_out", "deposit", "status",
  "period", "income", "expense", "noi", "capex", "taxes", "insurance", "mortgage", "balance", "arrears", "asset", "liability", "equity",
  "time_series"
];

interface HeaderMapperProps {
  headers: string[];
  suggestions: Record<string, FieldSuggestion>;
  onChange: (orig: string, field: string) => void;
  fileType?: string;
}

export default function HeaderMapper({ headers, suggestions, onChange, fileType = 'general' }: HeaderMapperProps) {
  return (
    <div className="space-y-2">
      {headers.map(h => {
        const s = suggestions[h] || { field: "", score: 0 };
        const isAccountName = /account|name|description|item/.test(h.toLowerCase());
        
        if (isAccountName) {
          return (
            <div key={h} className="flex items-center gap-3 p-2 rounded bg-green-100">
              <div className="w-1/3 font-mono text-xs">{h}</div>
              <div className="w-2/3 text-sm text-green-700 font-medium">
                ✅ Auto-categorized by AI
              </div>
              <span className="text-[10px] opacity-60 text-green-600">auto</span>
            </div>
          );
        }
        
        // Check if it's a time-series column
        const isTimeSeries = /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q1|q2|q3|q4|total/.test(h.toLowerCase());
        
        if (isTimeSeries && s.field === "time_series") {
          return (
            <div key={h} className="flex items-center gap-3 p-2 rounded bg-orange-100">
              <div className="w-1/3 font-mono text-xs">{h}</div>
              <div className="w-2/3 text-sm text-orange-700 font-medium">
                ✅ Auto-mapped to time-series
              </div>
              <span className="text-[10px] opacity-60 text-orange-600">auto</span>
            </div>
          );
        }
        
        return (
          <div key={h} className={`flex items-center gap-3 p-2 rounded ${color(s.field)}`}>
            <div className="w-1/3 font-mono text-xs">{h}</div>
            <select 
              className="w-2/3 border rounded p-1" 
              value={s.field} 
              onChange={e => onChange(h, e.target.value)}
            >
              <option value="">— map to… —</option>
              {(ALL_FIELDS[fileType as keyof typeof ALL_FIELDS] || ALL).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <span className="text-[10px] opacity-60">conf {s.score?.toFixed?.(2) ?? "0.00"}</span>
          </div>
        );
      })}
    </div>
  );
}
