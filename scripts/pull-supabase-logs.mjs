#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envPath = join(process.cwd(), '.env.local');
let envVars = {};
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.log('No .env.local found, using process.env');
}

const SUPABASE_ACCESS_TOKEN = envVars.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_PROJECT_REF = envVars.SUPABASE_PROJECT_REF || process.env.SUPABASE_PROJECT_REF;
const SUPABASE_LOG_WINDOW_MIN = parseInt(envVars.SUPABASE_LOG_WINDOW_MIN || process.env.SUPABASE_LOG_WINDOW_MIN || '30');

if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_PROJECT_REF) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_ACCESS_TOKEN=sbp_...');
  console.error('   SUPABASE_PROJECT_REF=xxxxxxxxxxxxxxxx');
  console.error('');
  console.error('Get these from:');
  console.error('   Dashboard → Account → Tokens (Access Token)');
  console.error('   Project URL (Project Ref)');
  process.exit(1);
}

const API_BASE = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}`;
const HEADERS = {
  'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

// Create logs directory
const logsDir = join(process.cwd(), 'logs', 'supabase');
mkdirSync(logsDir, { recursive: true });

async function fetchLogs(type, query) {
  const url = `${API_BASE}/analytics/endpoints/logs.all`;
  const body = {
    sql: query,
    limit: 1000
  };

  try {
    console.log(`📊 Fetching ${type} logs...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.rows || [];
  } catch (error) {
    console.error(`❌ Failed to fetch ${type} logs:`, error.message);
    return [];
  }
}

async function pullLogs() {
  console.log('🔍 Pulling Supabase logs...');
  console.log(`   Project: ${SUPABASE_PROJECT_REF}`);
  console.log(`   Window: ${SUPABASE_LOG_WINDOW_MIN} minutes`);
  console.log('');

  const now = new Date();
  const startTime = new Date(now.getTime() - SUPABASE_LOG_WINDOW_MIN * 60 * 1000);
  
  // Edge logs (API requests, responses)
  const edgeQuery = `
    SELECT 
      timestamp,
      level,
      message,
      metadata->>'method' as method,
      metadata->>'path' as path,
      metadata->>'status' as status,
      metadata->>'response_time_ms' as response_time_ms,
      metadata->>'user_agent' as user_agent,
      metadata->>'ip' as ip
    FROM edge_logs 
    WHERE timestamp >= '${startTime.toISOString()}'
    ORDER BY timestamp DESC
  `;

  // Postgres logs (database queries, errors)
  const postgresQuery = `
    SELECT 
      timestamp,
      level,
      message,
      metadata->>'query' as query,
      metadata->>'duration_ms' as duration_ms,
      metadata->>'rows_affected' as rows_affected,
      metadata->>'error_code' as error_code
    FROM postgres_logs 
    WHERE timestamp >= '${startTime.toISOString()}'
    ORDER BY timestamp DESC
  `;

  // Auth logs (authentication events)
  const authQuery = `
    SELECT 
      timestamp,
      level,
      message,
      metadata->>'event_type' as event_type,
      metadata->>'user_id' as user_id,
      metadata->>'ip' as ip,
      metadata->>'user_agent' as user_agent
    FROM auth_logs 
    WHERE timestamp >= '${startTime.toISOString()}'
    ORDER BY timestamp DESC
  `;

  const [edgeLogs, postgresLogs, authLogs] = await Promise.all([
    fetchLogs('edge', edgeQuery),
    fetchLogs('postgres', postgresQuery),
    fetchLogs('auth', authQuery)
  ]);

  // Write logs to files
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  
  if (edgeLogs.length > 0) {
    const edgeFile = join(logsDir, `latest-edge.ndjson`);
    const edgeContent = edgeLogs.map(log => JSON.stringify(log)).join('\n');
    writeFileSync(edgeFile, edgeContent);
    console.log(`✅ Edge logs: ${edgeLogs.length} entries → ${edgeFile}`);
  }

  if (postgresLogs.length > 0) {
    const postgresFile = join(logsDir, `latest-postgres.ndjson`);
    const postgresContent = postgresLogs.map(log => JSON.stringify(log)).join('\n');
    writeFileSync(postgresFile, postgresContent);
    console.log(`✅ Postgres logs: ${postgresLogs.length} entries → ${postgresFile}`);
  }

  if (authLogs.length > 0) {
    const authFile = join(logsDir, `latest-auth.ndjson`);
    const authContent = authLogs.map(log => JSON.stringify(log)).join('\n');
    writeFileSync(authFile, authContent);
    console.log(`✅ Auth logs: ${authLogs.length} entries → ${authFile}`);
  }

  if (edgeLogs.length === 0 && postgresLogs.length === 0 && authLogs.length === 0) {
    console.log('ℹ️  No logs found in the specified time window');
  }

  console.log('');
  console.log('📁 Log files created in logs/supabase/');
  console.log('💡 Ask Cursor: "Read logs/supabase/latest-*.ndjson and explain any errors"');
}

// Run the script
pullLogs().catch(console.error);
