import { Router } from "express";
import { suggestFieldLearned } from "../lib/learnedSuggest.js";

export const mapSuggestRouter = Router();

/** Body: { headers: string[], samples?: string[][] } */
mapSuggestRouter.post("/suggest", async (req, res) => {
  const { headers = [], samples = [] } = req.body || {};
  const result: Record<string, { field: string; score: number }> = {};
  
  for (const h of headers) {
    const colIdx = headers.indexOf(h);
    const sampleVals = samples.map(row => row[colIdx]).filter(Boolean);
    result[h] = suggestFieldLearned(h, sampleVals);
  }
  
  res.json({ field_map: result, version: "1.0.0" });
});
