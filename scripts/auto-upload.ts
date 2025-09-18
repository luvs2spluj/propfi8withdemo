import chokidar from "chokidar";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";

const API = process.env.API_BASE || "http://localhost:5000";
const INBOX = process.env.UPLOAD_INBOX || "./incoming_uploads";

if (!fs.existsSync(INBOX)) fs.mkdirSync(INBOX, { recursive: true });
console.log("Watching", INBOX);

chokidar.watch(`${INBOX}/*.csv`, { ignoreInitial: false })
  .on("add", async path => {
    try {
      const file = fs.readFileSync(path);
      // lightweight header peek
      const text = fs.readFileSync(path, "utf8");
      const headerLine = text.split(/\r?\n/)[0] || "";
      const headers = headerLine.split(",").map(h => h.trim());
      const samples: string[][] = []; // keep empty; API will still guess via learned model

      // ask for mapping
      const mres = await fetch(`${API}/api/map/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, samples })
      });
      const { field_map } = await mres.json();

      // send file + mapping
      const fd = new FormData();
      fd.append("file", file, { 
        filename: path.split("/").pop(), 
        contentType: "text/csv" 
      });
      fd.append("field_map", JSON.stringify(field_map));
      
      const ires = await fetch(`${API}/api/import`, { 
        method: "POST", 
        body: fd as any 
      });
      const j = await ires.json();
      console.log("Imported:", path, "rows:", j.total);
    } catch (e) {
      console.error("Auto-upload error", e);
    }
  });
