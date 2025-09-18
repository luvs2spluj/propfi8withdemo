import { Router } from "express";
import crypto from "crypto";
import Papa from "papaparse";
import multer from "multer";
import { normalizeCurrency, looksLikeDate } from "../lib/validators.js";
import { uploadRawCSV, logImportRun, logImportEvent } from "../lib/supabase.js";

export const importCsvRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

importCsvRouter.post("/", upload.single("file"), async (req, res) => {
  const file = (req as any).file;
  if (!file) return res.status(400).json({ error: "No file" });

  const csvText = file.buffer.toString("utf8");
  const parsed = Papa.parse<string[]>(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) return res.status(400).json({ error: parsed.errors[0].message });

  const field_map = JSON.parse(req.body.field_map || "{}");
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

  // Normalize preview
  const rows = (parsed.data as any[]).map((row) => {
    const out: any = {};
    for (const [orig, v] of Object.entries<any>(field_map)) {
      const canon = v.field;
      const raw = row[orig];
      if (raw == null || String(raw).trim() === "") continue;
      
      if (["income", "expense", "noi", "capex", "taxes", "insurance", "mortgage", "arrears", "asset", "liability", "equity"].includes(canon)) {
        out[canon] = normalizeCurrency(String(raw));
      } else if (canon === "period" && looksLikeDate(String(raw))) {
        out[canon] = new Date(String(raw));
      } else {
        out[canon] = raw;
      }
    }
    if (propertyId) out.property = propertyId;
    return out;
  });

  res.json({ imported_preview: rows.slice(0, 25), total: rows.length });
});
