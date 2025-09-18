import { readFileSync, existsSync } from "fs";
import { join } from "path";
import YAML from "yaml";

const cfgDir = join(process.cwd(), "config");
const syn = YAML.parse(readFileSync(join(cfgDir, "synonyms.yml"), "utf8")) as Record<string, string[]>;
const modelPath = join(process.cwd(), "model", "header_model.json");
const learned = existsSync(modelPath) ? JSON.parse(readFileSync(modelPath, "utf8") || "{}") : {};

const norm = (s: string): string => 
  s.toLowerCase().replace(/[^a-z0-9%$@./\s-]/g, "").replace(/\s+/g, " ").trim();

// Build synonym map
const synToCanon = new Map<string, string>();
for (const [canon, syns] of Object.entries(syn)) {
  const allTerms = [canon, ...syns];
  allTerms.forEach(t => synToCanon.set(norm(t), canon));
}

function synonymScore(h: string): { field: string; score: number } {
  const n = norm(h);
  
  // Special handling for time-series data (months, quarters, years)
  if (isTimeSeriesColumn(n)) {
    return { field: "period", score: 0.9 };
  }
  
  if (synToCanon.has(n)) return { field: synToCanon.get(n)!, score: 1.0 };
  
  // token overlap fallback
  const tokens = new Set(n.split(" "));
  let best: { field: string; score: number } | null = null;
  
  for (const [synNorm, canon] of Array.from(synToCanon.entries())) {
    const synTokens = new Set(synNorm.split(" "));
    const overlap = Array.from(tokens).filter(t => synTokens.has(t)).length / Math.max(1, synTokens.size);
    if (!best || overlap > best.score) best = { field: canon, score: overlap };
  }
  
  return best || { field: "", score: 0 };
}

function isTimeSeriesColumn(header: string): boolean {
  // Check for month patterns
  const monthPatterns = [
    /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i,
    /january|february|march|april|may|june|july|august|september|october|november|december/i,
    /q1|q2|q3|q4/i,
    /quarter/i,
    /\d{4}/, // Year pattern
    /total/i
  ];
  
  return monthPatterns.some(pattern => pattern.test(header));
}

/** learned = { tokenToField: { token: { field: count } }, valueHints: { fingerprint: { field: count } } } */
export function suggestFieldLearned(header: string, sampleValues: string[] = [], fileType: string = 'general'): { field: string; score: number } {
  // File-type specific suggestions
  const fileTypeSuggestion = getFileTypeSuggestion(header, fileType, sampleValues);
  if (fileTypeSuggestion.score > 0.8) return fileTypeSuggestion;
  
  const base = synonymScore(header);
  
  // Learned token voting
  const tokens = norm(header).split(" ").filter(Boolean);
  const votes: Record<string, number> = {};
  
  for (const t of tokens) {
    const dist = learned.tokenToField?.[t];
    if (!dist) continue;
    for (const [field, count] of Object.entries<number>(dist)) {
      votes[field] = (votes[field] || 0) + count;
    }
  }
  
  // Value fingerprints (email, currency, date)
  for (const v of sampleValues.slice(0, 10)) {
    const fp = fingerprint(v);
    const dist = learned.valueHints?.[fp];
    if (!dist) continue;
    for (const [field, count] of Object.entries<number>(dist)) {
      votes[field] = (votes[field] || 0) + count * 0.5;
    }
  }
  
  // Pick best learned
  const learnedBest = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  if (!learnedBest) return base;
  
  const [lf, score] = learnedBest;
  // Blend: prefer learned if its score maps to > base.score
  const blended = (score / Math.max(1, score + 5)); // squashed
  return blended > base.score ? { field: lf, score: blended } : base;
}

function getFileTypeSuggestion(header: string, fileType: string, sampleValues: string[] = []): { field: string; score: number } {
  const h = norm(header);
  
  switch (fileType) {
    case 'cash_flow':
      if (/account|name|description|item/.test(h)) {
        // Don't map account name column - it's just labels
        return { field: "", score: 0 };
      }
      if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q1|q2|q3|q4|total/.test(h)) {
        return { field: "time_series", score: 0.9 };
      }
      break;
      
    case 'rent_roll':
      if (/tenant|resident|name|lessee/.test(h)) return { field: "tenant_name", score: 0.9 };
      if (/unit|apt|apartment|suite|space/.test(h)) return { field: "unit_id", score: 0.9 };
      if (/rent|amount|income/.test(h)) return { field: "income", score: 0.9 };
      if (/email/.test(h)) return { field: "email", score: 0.9 };
      if (/phone|tel/.test(h)) return { field: "phone", score: 0.9 };
      if (/move.?in|lease start/.test(h)) return { field: "move_in", score: 0.9 };
      if (/move.?out|lease end/.test(h)) return { field: "move_out", score: 0.9 };
      break;
      
    case 'balance_sheet':
      if (/asset|cash|receivable|prepaid|inventory/.test(h)) return { field: "asset", score: 0.9 };
      if (/liabilit|payable|loan|note|debt/.test(h)) return { field: "liability", score: 0.9 };
      if (/equity|retained|owner/.test(h)) return { field: "equity", score: 0.9 };
      break;
      
    case 'income_statement':
      if (/revenue|income|sales|rent/.test(h)) return { field: "income", score: 0.9 };
      if (/expense|cost|operating|maintenance/.test(h)) return { field: "expense", score: 0.9 };
      if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q1|q2|q3|q4|total/.test(h)) {
        return { field: "time_series", score: 0.9 };
      }
      break;
  }
  
  return { field: "", score: 0 };
}

function detectAccountType(sampleValues: string[]): string {
  const incomeKeywords = [
    'rent', 'rental', 'income', 'revenue', 'sales', 'lease', 'tenant', 'occupancy',
    'parking', 'storage', 'amenity', 'fee', 'late fee', 'pet fee', 'application fee'
  ];
  
  const expenseKeywords = [
    'expense', 'cost', 'maintenance', 'repair', 'utility', 'electric', 'water', 'gas',
    'insurance', 'tax', 'management', 'legal', 'accounting', 'marketing', 'advertising',
    'cleaning', 'landscaping', 'pest control', 'security', 'trash', 'sewer', 'cable',
    'internet', 'phone', 'supplies', 'equipment', 'contractor', 'vendor', 'service'
  ];
  
  let incomeScore = 0;
  let expenseScore = 0;
  
  for (const value of sampleValues.slice(0, 10)) {
    const v = norm(String(value || ''));
    
    for (const keyword of incomeKeywords) {
      if (v.includes(keyword)) incomeScore++;
    }
    
    for (const keyword of expenseKeywords) {
      if (v.includes(keyword)) expenseScore++;
    }
  }
  
  // Return the type with higher score, default to income if tied
  return expenseScore > incomeScore ? 'expense' : 'income';
}

function fingerprint(v: string): string {
  const s = String(v || "");
  if (/.+@.+\..+/.test(s)) return "email";
  if (/[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|[A-Za-z]{3,}\s+\d{4}|\d{4}-\d{1,2}-\d{1,2}/.test(s)) return "date";
  if (/[$,]|\d+\.\d{2}/.test(s)) return "currency";
  if (/%/.test(s)) return "percent";
  return "text";
}
