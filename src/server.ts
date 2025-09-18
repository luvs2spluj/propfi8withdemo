import express from "express";
import cors from "cors";
import { mapSuggestRouter } from "./routes/mapSuggest.js";
import { importCsvRouter } from "./routes/importCsv.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/map", mapSuggestRouter);
app.use("/api/import", importCsvRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("CSV Parser API running on port", PORT));
