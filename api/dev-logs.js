// /api/dev-logs.js - Captures browser console logs and errors
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ ok: false, error: 'Disabled in production' });
  }

  const file = path.resolve('logs/dev-browser.ndjson');
  await fs.promises.mkdir('logs', { recursive: true });

  if (req.method !== 'POST') {
    return res.status(200).json({ 
      ok: true, 
      tip: 'POST NDJSON {level,msg,stack,meta}' 
    });
  }

  try {
    const body = await readJson(req);
    const line = JSON.stringify({ 
      ts: new Date().toISOString(), 
      ...body 
    });
    await fs.promises.appendFile(file, line + '\n');
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
