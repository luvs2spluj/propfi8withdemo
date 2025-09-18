import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";

// Load canonical fields (keys only used for scoring guidance)
const trainingDir = join(process.cwd(), "training");
const outPath = join(process.cwd(), "model", "header_model.json");

const tokenToField: Record<string, Record<string, number>> = {};
const valueHints: Record<string, Record<string, number>> = {};

function incr(map: any, k1: string, k2: string, by = 1) {
  map[k1] ||= {};
  map[k1][k2] = (map[k1][k2] || 0) + by;
}

function fieldGuessFromHeader(h: string): string {
  // cheap guess to accumulate signal: match key words -> rough canonical bucket
  const m = h.toLowerCase();
  if (/tenant|resident|lessee|name/.test(m)) return "tenant_name";
  if (/email/.test(m)) return "email";
  if (/phone|tel/.test(m)) return "phone";
  if (/move.?in|lease start|start/.test(m)) return "move_in";
  if (/move.?out|lease end|end/.test(m)) return "move_out";
  if (/unit|apt|apartment|suite|space/.test(m)) return "unit_id";
  if (/rent|income|revenue|collections/.test(m)) return "income";
  if (/expense|opex|utilities|repairs|maint/.test(m)) return "expense";
  if (/noi|net operating/.test(m)) return "noi";
  if (/capex|capital/.test(m)) return "capex";
  if (/tax/.test(m)) return "taxes";
  if (/insurance/.test(m)) return "insurance";
  if (/mortgage|debt service|loan|principal|interest/.test(m)) return "mortgage";
  if (/arrears|delinquen|past due/.test(m)) return "arrears";
  if (/asset|cash|receivable|prepaid/.test(m)) return "asset";
  if (/liabilit|payable|loan|note/.test(m)) return "liability";
  if (/equity|retained/.test(m)) return "equity";
  if (/balance/.test(m)) return "balance";
  if (/period|month|date|posted|as of/.test(m)) return "period";
  if (/property|building|community|asset name/.test(m)) return "property_name";
  if (/address|street|addr/.test(m)) return "address";
  if (/city/.test(m)) return "city";
  if (/state|province|st/.test(m)) return "state";
  if (/zip|postal/.test(m)) return "zip";
  return ""; // unknown
}

function valFP(v: string): string {
  const s = String(v || "");
  if (/.+@.+\..+/.test(s)) return "email";
  if (/[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|[A-Za-z]{3,}\s+\d{4}|\d{4}-\d{1,2}-\d{1,2}/.test(s)) return "date";
  if (/[$,]|\d+\.\d{2}/.test(s)) return "currency";
  if (/%/.test(s)) return "percent";
  return "text";
}

for (const fname of readdirSync(trainingDir).filter(f => f.endsWith(".csv"))) {
  const text = readFileSync(join(trainingDir, fname), "utf8");
  const parsed = Papa.parse(text, { header: true, preview: 100, skipEmptyLines: true });
  const headers = parsed.meta.fields || [];
  const sampleRows = (parsed.data as any[]).slice(0, 25);

  for (const h of headers) {
    const guess = fieldGuessFromHeader(h);
    if (guess) {
      for (const tok of h.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
        incr(tokenToField, tok, guess, 1);
      }
    }
    // value fingerprints
    for (const r of sampleRows) {
      const fp = valFP(r[h]);
      if (guess) incr(valueHints, fp, guess, 1);
    }
  }
}

const model = { tokenToField, valueHints, builtAt: new Date().toISOString() };
writeFileSync(outPath, JSON.stringify(model, null, 2));
console.log("Wrote model to", outPath);
