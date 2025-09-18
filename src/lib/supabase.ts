import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE;

export const supabase = (url && key) 
  ? createClient(url, key, { auth: { persistSession: false } }) 
  : null;

export async function logImportRun(row: any) {
  if (!supabase) return;
  await supabase.from("import_runs").insert(row);
}

export async function logImportEvent(evt: any) {
  if (!supabase) return;
  await supabase.from("import_run_events").insert(evt);
}

export async function uploadRawCSV(path: string, buf: Buffer, contentType = "text/csv") {
  if (!supabase) return { path };
  const bucket = process.env.SUPABASE_UPLOADS_BUCKET || "uploads";
  await supabase.storage.from(bucket).upload(path, buf, { upsert: true, contentType });
  return { path };
}
