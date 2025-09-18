import { readFileSync, existsSync } from "fs";
import { join } from "path";
import YAML from "yaml";

const cfgDir = join(process.cwd(), "config");
const syn = YAML.parse(readFileSync(join(cfgDir, "synonyms.yml"), "utf8"));
const modelPath = join(process.cwd(), "model", "header_model.json");
const learned = existsSync(modelPath) ? JSON.parse(readFileSync(modelPath, "utf8") || "{}") : {};

const norm = (s: string): string => 
  s.toLowerCase().replace(/[^a-z0-9%$@./\s-]/g, "").replace(/\s+/g, " ").trim();

// Build synonym map
const synToCanon = new Map<string, string>();
for (const [canon, syns] of Object.entries<Record<string, string[]>>(syn)) {
  [canon, ...syns].forEach(t => synToCanon.set(norm(t), canon));
}

function synonymScore(h: string): { field: string; score: number } {
  const n = norm(h);
  if (synToCanon.has(n)) return { field: synToCanon.get(n)!, score: 1.0 };
  
  // token overlap fallback
  const tokens = new Set(n.split(" "));
  let best: { field: string; score: number } | null = null;
  
  for (const [synNorm, canon] of synToCanon.entries()) {
    const synTokens = new Set(synNorm.split(" "));
    const overlap = [...tokens].filter(t => synTokens.has(t)).length / Math.max(1, synTokens.size);
    if (!best || overlap > best.score) best = { field: canon, score: overlap };
  }
  
  return best || { field: "", score: 0 };
}

/** learned = { tokenToField: { token: { field: count } }, valueHints: { fingerprint: { field: count } } } */
export function suggestFieldLearned(header: string, sampleValues: string[] = []): { field: string; score: number } {
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

function fingerprint(v: string): string {
  const s = String(v || "");
  if (/.+@.+\..+/.test(s)) return "email";
  if (/[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|[A-Za-z]{3,}\s+\d{4}|\d{4}-\d{1,2}-\d{1,2}/.test(s)) return "date";
  if (/[$,]|\d+\.\d{2}/.test(s)) return "currency";
  if (/%/.test(s)) return "percent";
  return "text";
}
