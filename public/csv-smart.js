/**
 * csv-smart.js
 * Robust CSV parser with state machine for complex property management data
 * Handles commas in names, mixed quoting, section headers, negatives, etc.
 */

const DB_NAME = 'propfi_smart_db';
const DB_STORE = 'csv_buckets';
const DB_VERSION = 1;

let budgetRules = null;

// Smart CSV parsing with state machine
function parseCSVSmart(text) {
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
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
  
  return result;
}

function parseCSVLine(line) {
  const result = [];
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
}

// Robust numeric parsing
function toNumSmart(v) {
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
}

// Smart bucketing with fuzzy matching
function bucketizeSmart(rows, rules) {
  const months = rules.monthColumns;
  const totalCol = rules.totalColumn;
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
    
    // Smart matching with fuzzy logic
    const inBucket = (bucketName) => {
      const bucketTerms = rules.buckets[bucketName];
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
    
    buckets[key].push(row);
  }
  
  // Calculate rollups
  const rollup = (rows) => {
    const out = { 'Account Name': 'ROLLUP' };
    for (const m of months) {
      out[m] = rows.reduce((a, r) => a + toNumSmart(r[m]), 0);
    }
    out[totalCol] = rows.reduce((a, r) => a + toNumSmart(r[totalCol]), 0);
    return out;
  };
  
  return {
    income: { rows: buckets.income, totals: rollup(buckets.income) },
    expense: { rows: buckets.expense, totals: rollup(buckets.expense) },
    other: { rows: buckets.other, totals: rollup(buckets.other) }
  };
}

// Enhanced table rendering
function renderTableSmart(container, title, data, months, totalKey) {
  container.innerHTML = '';
  
  const h = document.createElement('h3');
  h.textContent = title;
  h.className = 'text-lg font-semibold text-gray-800 mb-3';
  container.appendChild(h);
  
  const table = document.createElement('table');
  table.className = 'w-full border-collapse border border-gray-300';
  
  // Header
  const thead = document.createElement('thead');
  const hdr = document.createElement('tr');
  hdr.className = 'bg-gray-50';
  
  ['Account Name', ...months, totalKey].forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    th.className = 'border border-gray-300 px-3 py-2 text-left';
    hdr.appendChild(th);
  });
  thead.appendChild(hdr);
  table.appendChild(thead);
  
  // Body
  const tbody = document.createElement('tbody');
  data.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (row['Account Name'] === 'ROLLUP') {
      tr.className = 'bg-gray-100 font-bold';
    }
    
    const cells = ['Account Name', ...months, totalKey].map(c => {
      const value = row[c] ?? '';
      return c === 'Account Name' ? value : toNumSmart(value);
    });
    
    cells.forEach((val, cellIndex) => {
      const td = document.createElement('td');
      td.className = 'border border-gray-300 px-3 py-2';
      
      if (cellIndex === 0) {
        // Account name
        td.textContent = val;
      } else {
        // Numeric values
        td.textContent = typeof val === 'number' ? val.toLocaleString() : val;
        td.className += ' text-right';
      }
      
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  container.appendChild(table);
}

// Main initialization
async function initCsvSmart() {
  try {
    // Load budget rules
    const resp = await fetch('./budgets.config.json');
    budgetRules = await resp.json();
    
    // Wire up UI
    const input = document.getElementById('csv-input');
    const drop = document.getElementById('csv-drop');
    const btnLoad = document.getElementById('csv-load-existing');
    const textArea = document.getElementById('csv-text');
    const btnParse = document.getElementById('csv-parse-text');
    
    function processData(rows) {
      const buckets = bucketizeSmart(rows, budgetRules);
      
      // Store in localStorage
      localStorage.setItem('buckets', JSON.stringify(buckets));
      
      // Render results
      renderBucketsSmart(buckets);
      
      console.log('✅ CSV processed successfully:', buckets);
    }
    
    function parseFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const rows = parseCSVSmart(text);
        processData(rows);
      };
      reader.readAsText(file);
    }
    
    function parseText() {
      const text = textArea.value;
      if (!text.trim()) return;
      
      const rows = parseCSVSmart(text);
      processData(rows);
    }
    
    // Event listeners
    if (input) {
      input.addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (f) parseFile(f);
      });
    }
    
    if (drop) {
      drop.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        drop.classList.add('over'); 
      });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => {
        e.preventDefault(); 
        drop.classList.remove('over');
        const f = e.dataTransfer.files[0];
        if (f) parseFile(f);
      });
    }
    
    if (btnLoad) {
      btnLoad.addEventListener('click', () => {
        const buckets = JSON.parse(localStorage.getItem('buckets') || 'null');
        if (buckets) renderBucketsSmart(buckets);
      });
    }
    
    if (btnParse) {
      btnParse.addEventListener('click', parseText);
    }
    
    // Auto-load existing data
    const existing = localStorage.getItem('buckets');
    if (existing) {
      try {
        const buckets = JSON.parse(existing);
        renderBucketsSmart(buckets);
      } catch (e) {
        console.warn('Failed to parse existing buckets:', e);
      }
    }
    
  } catch (error) {
    console.error('Error initializing CSV smart parser:', error);
  }
}

function renderBucketsSmart(buckets) {
  const months = budgetRules.monthColumns;
  const totalKey = budgetRules.totalColumn;
  
  // Render tables
  const incomeContainer = document.getElementById('income-table');
  const expenseContainer = document.getElementById('expense-table');
  const otherContainer = document.getElementById('other-table');
  
  if (incomeContainer) {
    renderTableSmart(incomeContainer, 'Income', [...buckets.income.rows, buckets.income.totals], months, totalKey);
  }
  
  if (expenseContainer) {
    renderTableSmart(expenseContainer, 'Expenses', [...buckets.expense.rows, buckets.expense.totals], months, totalKey);
  }
  
  if (otherContainer) {
    renderTableSmart(otherContainer, 'Other / Derived', [...buckets.other.rows, buckets.other.totals], months, totalKey);
  }
  
  // Update summary cards
  const sumIncome = buckets.income.totals[totalKey] || 0;
  const sumExpense = buckets.expense.totals[totalKey] || 0;
  const sumNOI = sumIncome - sumExpense;
  
  const incomeCard = document.getElementById('card-income');
  const expenseCard = document.getElementById('card-expense');
  const noiCard = document.getElementById('card-noi');
  
  if (incomeCard) incomeCard.textContent = sumIncome.toLocaleString();
  if (expenseCard) expenseCard.textContent = sumExpense.toLocaleString();
  if (noiCard) noiCard.textContent = sumNOI.toLocaleString();
}

// Export for use in React components
window.csvSmartParser = {
  parseCSVSmart,
  bucketizeSmart,
  toNumSmart,
  renderBucketsSmart,
  initCsvSmart
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCsvSmart);
} else {
  initCsvSmart();
}
