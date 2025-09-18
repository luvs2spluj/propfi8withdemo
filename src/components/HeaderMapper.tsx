import React from "react";

export type FieldSuggestion = { field: string; score: number };

const color = (f: string): string => {
  if (["property_name", "address", "city", "state", "zip", "unit_id"].includes(f)) return "bg-blue-100";
  if (["tenant_name", "email", "phone", "move_in", "move_out", "deposit", "status"].includes(f)) return "bg-green-100";
  if (["period", "income", "expense", "noi", "capex", "taxes", "insurance", "mortgage", "balance", "arrears", "asset", "liability", "equity"].includes(f)) return "bg-purple-100";
  if (f === "time_series") return "bg-orange-100";
  return "bg-gray-100";
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
}

export default function HeaderMapper({ headers, suggestions, onChange }: HeaderMapperProps) {
  return (
    <div className="space-y-2">
      {headers.map(h => {
        const s = suggestions[h] || { field: "", score: 0 };
        return (
          <div key={h} className={`flex items-center gap-3 p-2 rounded ${color(s.field)}`}>
            <div className="w-1/3 font-mono text-xs">{h}</div>
            <select 
              className="w-2/3 border rounded p-1" 
              value={s.field} 
              onChange={e => onChange(h, e.target.value)}
            >
              <option value="">— map to… —</option>
              {ALL.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <span className="text-[10px] opacity-60">conf {s.score?.toFixed?.(2) ?? "0.00"}</span>
          </div>
        );
      })}
    </div>
  );
}
