import { Router } from "express";
import crypto from "crypto";
import Papa from "papaparse";
import multer from "multer";
import { normalizeCurrency, looksLikeDate } from "../lib/validators.js";
import { uploadRawCSV, logImportRun, logImportEvent } from "../lib/supabase.js";

function categorizeAccount(accountName: string): string {
  const name = accountName.toLowerCase();
  
  // Income accounts
  if (/rent|rental|income|revenue|sales|lease|tenant|occupancy|parking|storage|amenity|fee|late fee|pet fee|application fee|deposit/.test(name)) {
    return "income";
  }
  
  // Expense accounts
  if (/expense|cost|maintenance|repair|utility|electric|water|gas|insurance|tax|management|legal|accounting|marketing|advertising|cleaning|landscaping|pest control|security|trash|sewer|cable|internet|phone|supplies|equipment|contractor|vendor|service|operating|capex|capital/.test(name)) {
    return "expense";
  }
  
  // Default to expense for unknown accounts
  return "expense";
}

function normalizeValueByCategory(value: number, category: string): number {
  // Ensure all values are positive for proper categorization
  const absValue = Math.abs(value);
  
  if (category === "income") {
    // Income should always be positive
    return absValue;
  } else if (category === "expense") {
    // Expense should always be positive
    return absValue;
  }
  
  return absValue;
}

export const importCsvRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

importCsvRouter.post("/", upload.single("file"), async (req, res) => {
  const file = (req as any).file;
  if (!file) return res.status(400).json({ error: "No file" });

  const csvText = file.buffer.toString("utf8");
  const parsed = Papa.parse<string[]>(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) return res.status(400).json({ error: parsed.errors[0].message });

  const field_map = JSON.parse(req.body.field_map || "{}");
  const accountCategories = JSON.parse(req.body.account_categories || "{}");
  const propertyId = req.body.property_id || null;
  const ownerId = req.body.owner_id || "local";

  const fileHash = crypto.createHash("sha256").update(csvText).digest("hex");
  const storagePath = `${ownerId}/${propertyId || "noprop"}/${Date.now()}-${file.originalname}`;
  await uploadRawCSV(storagePath, file.buffer);

  await logImportRun?.({
    owner_id: ownerId,
    property_id: propertyId,
    file_name: file.originalname,
    file_hash: fileHash,
    storage_path: storagePath,
    rules_version: "1.0.0",
    mappings: field_map,
    user_notes: req.body.notes || null
  });
  await logImportEvent?.({ run_id: null, level: "info", message: "Uploaded", context: { storagePath } });

  // Normalize preview with smart account categorization
  const rows = (parsed.data as any[]).map((row) => {
    const out: any = {};
    const timeSeriesData: any = {};
    let accountName = "";
    
    // Find the account name column
    for (const [orig, v] of Object.entries<any>(field_map)) {
      if (v.field === "" && /account|name|description|item/.test(orig.toLowerCase())) {
        accountName = String(row[orig] || "");
        break;
      }
    }
    
    // Use user-provided category or auto-categorize
    const accountCategory = accountCategories[accountName] || categorizeAccount(accountName);
    
    for (const [orig, v] of Object.entries<any>(field_map)) {
      const canon = v.field;
      const raw = row[orig];
      if (raw == null || String(raw).trim() === "") continue;
      
      if (canon === "time_series") {
        // Handle time-series data (months, quarters, etc.) with normalization
        const value = normalizeCurrency(String(raw));
        if (value !== null) {
          // Normalize values based on account category
          const normalizedValue = normalizeValueByCategory(value, accountCategory);
          timeSeriesData[orig] = normalizedValue;
        }
      } else if (["income", "expense", "noi", "capex", "taxes", "insurance", "mortgage", "arrears", "asset", "liability", "equity"].includes(canon)) {
        out[canon] = normalizeCurrency(String(raw));
      } else if (canon === "period" && looksLikeDate(String(raw))) {
        out[canon] = new Date(String(raw));
      } else if (canon === "") {
        // Skip unmapped columns (like account names)
        continue;
      } else {
        out[canon] = raw;
      }
    }
    
    // Add categorized account data
    if (accountCategory && Object.keys(timeSeriesData).length > 0) {
      out.account_name = accountName;
      out.account_category = accountCategory;
      out.time_series = timeSeriesData;
      
      // Calculate totals for dashboard
      const monthlyValues = Object.values(timeSeriesData).filter(v => typeof v === 'number') as number[];
      const totalValue = monthlyValues.reduce((sum, val) => sum + val, 0);
      
      if (accountCategory === "income") {
        out.total_income = totalValue;
      } else if (accountCategory === "expense") {
        out.total_expense = totalValue;
      }
    }
    
    if (propertyId) out.property = propertyId;
    return out;
  });

  res.json({ imported_preview: rows.slice(0, 25), total: rows.length });
});
