
/**
 * csv-smart.js
 * Robust CSV/Text ingester with schema inference + bucketing.
 * - Tolerates messy commas inside names, missing quotes, extra section rows,
 *   thousands separators, parentheses negatives, stray spaces, and BOM.
 * - Infers month columns by regex. Aligns numeric values right if row width mismatches.
 * - Buckets rows (Income / Expense / Other) via configurable rules + fuzzy match.
 * - NO external network calls required.
 *
 * Public API:
 *   initCsvSmart({ rulesUrl?: string, onBuckets?: (buckets)=>void })
 */

const DEFAULT_RULES_URL = './budgets.config.json';
const MONTHS_CANON = [
  "Aug 2024","Sep 2024","Oct 2024","Nov 2024","Dec 2024","Jan 2025",
  "Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025"
];
const TOTAL_KEY = "Total";

// Month header detection (accept many spellings)
const MONTH_PATTERNS = [
  [/^aug(?:ust)?\s*20?24$/i, "Aug 2024"],
  [/^sep(?:t)?(?:ember)?\s*20?24$/i, "Sep 2024"],
  [/^oct(?:ober)?\s*20?24$/i, "Oct 2024"],
  [/^nov(?:ember)?\s*20?24$/i, "Nov 2024"],
  [/^dec(?:ember)?\s*20?24$/i, "Dec 2024"],
  [/^jan(?:uary)?\s*20?25$/i, "Jan 2025"],
  [/^feb(?:ruary)?\s*20?25$/i, "Feb 2025"],
  [/^mar(?:ch)?\s*20?25$/i, "Mar 2025"],
  [/^apr(?:il)?\s*20?25$/i, "Apr 2025"],
  [/^may\s*20?25$/i, "May 2025"],
  [/^jun(?:e)?\s*20?25$/i, "Jun 2025"],
  [/^jul(?:y)?\s*20?25$/i, "Jul 2025"],
];
const TOTAL_PATTERNS = [/^total$/i, /^grand\s*total$/i, /^sum$/i];

function stripBOM(s){ return s.replace(/^\uFEFF/, ''); }

function isNumericLike(v){
  if (v == null) return false;
  const s = String(v).trim();
  if (!s) return false;
  // allow negatives, parentheses, decimals, commas, leading currency, trailing %, etc.
  return /^[-+]?(\(?\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?\)?|\(?\$?\s*\d+(?:\.\d+)?\)?)$/.test(s);
}

function toNumber(v){
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s) return 0;
  const isParenNeg = /^\(.*\)$/.test(s);
  s = s.replace(/[,$]/g,'').replace(/[()]/g,'').replace(/^\$/, '');
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return isParenNeg ? -n : n;
}

function splitCSVLine(line){
  // state machine to split by commas respecting quotes
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i=0;i<line.length;i++){
    const ch = line[i];
    if (ch === '"'){
      if (inQ && line[i+1] === '"'){ cur += '"'; i++; } // escaped quote
      else inQ = !inQ;
    } else if (ch === ',' && !inQ){
      out.push(cur); cur='';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function inferHeaders(rawHeaderCells){
  // Try to map raw headers to canon: "Account Name", months, "Total"
  const mapped = new Array(rawHeaderCells.length).fill(null);
  const usedCanon = new Set();
  const lower = rawHeaderCells.map(h => stripBOM(String(h||'').trim()));

  // First, map month & total by regex
  for (let i=0;i<lower.length;i++){
    const cell = lower[i];
    for (const [re, canon] of MONTH_PATTERNS){
      if (re.test(cell)){ mapped[i] = canon; usedCanon.add(canon); break; }
    }
    if (!mapped[i]){
      if (TOTAL_PATTERNS.some(re => re.test(cell))) { mapped[i] = TOTAL_KEY; usedCanon.add(TOTAL_KEY); }
    }
  }
  // Force first textual header to Account Name if not already set
  const firstIdx = lower.findIndex(c => c && !isNumericLike(c) && !mapped.includes("Account Name"));
  if (firstIdx >= 0) mapped[firstIdx] = "Account Name";

  // Fill any unmapped positions with placeholders we will ignore
  for (let i=0;i<mapped.length;i++){
    if (!mapped[i]) mapped[i] = `COL_${i}`;
  }
  return mapped;
}

function normalizeRow(cells, headers){
  // Right-align numeric cells to the rightmost known headers (months + Total)
  const monthSlots = MONTHS_CANON.slice();
  const totalSlot = TOTAL_KEY;
  const nameIdx = headers.indexOf("Account Name");

  const out = Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? '']));

  // If widths mismatch or numeric drift, try to realign:
  const values = cells.map(c => String(c||'').trim());
  const numericIdxs = values
    .map((v, i) => [i, isNumericLike(v)])
    .filter(([, ok]) => ok)
    .map(([i]) => i);

  if (numericIdxs.length){
    // Pack numeric to the rightmost known series:
    let series = [...MONTHS_CANON, TOTAL_KEY];
    // Determine how many numeric cells at end
    const nums = numericIdxs.map(i => toNumber(values[i]));
    // Assign from the end
    let j = series.length - 1;
    for (let k = values.length - 1; k >= 0 && j >= 0; k--){
      const v = values[k];
      if (isNumericLike(v)){
        out[series[j]] = toNumber(v);
        j--;
      }
    }
    // Ensure Account Name is the left-most non-numeric cell
    if (nameIdx >= 0){
      const maybeName = values.find(v => v && !isNumericLike(v));
      if (maybeName) out["Account Name"] = maybeName.replace(/^"+|"+$/g,'');
    }
  }

  // Numeric normalization
  for (const m of MONTHS_CANON){ out[m] = toNumber(out[m]); }
  out[TOTAL_KEY] = toNumber(out[TOTAL_KEY]);

  return out;
}

function isSectionRow(name){
  if (!name) return true;
  const s = String(name).trim().toLowerCase();
  if (!s) return true;
  // skip obvious section headers
  return (
    s === 'operating income & expense' ||
    s === 'income' || s === 'expense' ||
    s.endsWith('expense') || s.includes('total ') && !/total (income|expense)/.test(s)
  );
}

// fuzzy match helper (very light-weight)
function norm(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }

function bucketize(rows, rules){
  const months = MONTHS_CANON;
  const buckets = { income: [], expense: [], other: [] };

  const sets = {
    income: new Set(rules.buckets.income.map(norm)),
    expense: new Set(rules.buckets.expense.map(norm))
  };

  for (const r of rows){
    const nm = norm(r['Account Name']);
    if (!nm || isSectionRow(r['Account Name'])) continue;
    let key = 'other';
    if (sets.income.has(nm)) key = 'income';
    else if (sets.expense.has(nm)) key = 'expense';
    buckets[key].push(r);
  }

  const roll = (arr)=>{
    const t = { 'Account Name':'ROLLUP' };
    for (const m of months) t[m] = 0;
    t[TOTAL_KEY] = 0;
    for (const r of arr){
      for (const m of months) t[m] += Number(r[m]||0);
      t[TOTAL_KEY] += Number(r[TOTAL_KEY]||0);
    }
    return t;
  };

  return {
    income: { rows: buckets.income, totals: roll(buckets.income) },
    expense: { rows: buckets.expense, totals: roll(buckets.expense) },
    other: { rows: buckets.other, totals: roll(buckets.other) }
  };
}

async function fetchJSON(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch ' + url);
  return res.json();
}

function parseMessyCSVOrText(text){
  const lines = stripBOM(text).split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return { headers: [], rows: [] };

  // Try header from first line with CSV-aware split
  const rawHdr = splitCSVLine(lines[0]);
  const headers = inferHeaders(rawHdr);

  const rows = [];
  for (let i=1;i<lines.length;i++){
    const cells = splitCSVLine(lines[i]);
    // Stretch or shrink cell array to header length
    const fixed = [...cells];
    if (fixed.length < headers.length){
      while (fixed.length < headers.length) fixed.push('');
    }
    const rowObj = normalizeRow(fixed, headers);
    rows.push(rowObj);
  }
  return { headers, rows };
}

// Basic rendering (optional)
function renderBuckets(b, mount){
  const totalIncome = b.income.totals[TOTAL_KEY] || 0;
  const totalExpense = b.expense.totals[TOTAL_KEY] || 0;
  const noi = totalIncome - totalExpense;
  mount.querySelector('[data-income]').textContent = totalIncome.toLocaleString();
  mount.querySelector('[data-expense]').textContent = totalExpense.toLocaleString();
  mount.querySelector('[data-noi]').textContent = noi.toLocaleString();
}

export async function initCsvSmart({ rulesUrl = DEFAULT_RULES_URL, onBuckets } = {}){
  const rules = await fetchJSON(rulesUrl);
  const input = document.getElementById('smart-csv-input');
  const paste = document.getElementById('smart-csv-paste');
  const mount = document.getElementById('smart-csv-mount');

  async function processText(text){
    const { rows } = parseMessyCSVOrText(text);
    const buckets = bucketize(rows, rules);
    if (onBuckets) onBuckets(buckets);
    if (mount) renderBuckets(buckets, mount);
    localStorage.setItem('buckets', JSON.stringify(buckets));
  }

  input?.addEventListener('change', () => {
    const f = input.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => processText(String(reader.result||''));
    reader.readAsText(f);
  });

  paste?.addEventListener('click', () => {
    const tx = document.getElementById('smart-csv-textarea');
    if (tx && tx.value) processText(tx.value);
  });

  // autoload previous
  const saved = localStorage.getItem('buckets');
  if (saved){
    try {
      const b = JSON.parse(saved);
      if (mount) renderBuckets(b, mount);
      if (onBuckets) onBuckets(b);
    } catch {}
  }
}
