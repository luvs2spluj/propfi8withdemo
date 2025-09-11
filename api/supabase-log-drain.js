// Supabase Log Drain endpoint
// Deploy this to receive live logs from Supabase (Team/Enterprise plans)

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create logs directory if it doesn't exist
    const logsDir = join(process.cwd(), 'logs', 'supabase');
    mkdirSync(logsDir, { recursive: true });

    // Parse the log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      received_at: new Date().toISOString(),
      ...req.body
    };

    // Append to drain log file
    const drainFile = join(logsDir, 'drain.ndjson');
    const logLine = JSON.stringify(logEntry) + '\n';
    
    writeFileSync(drainFile, logLine, { flag: 'a' });

    // Log to console for debugging
    console.log('📥 Log drain received:', {
      level: logEntry.level,
      message: logEntry.message?.substring(0, 100),
      timestamp: logEntry.timestamp
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Log drain error:', error);
    res.status(500).json({ error: 'Failed to process log entry' });
  }
}
