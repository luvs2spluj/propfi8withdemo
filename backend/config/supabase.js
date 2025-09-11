const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

// Supabase PostgreSQL configuration
const supabaseConfig = {
  connectionString: process.env.SUPABASE_DB_URL || 'postgresql://postgres:your_password@db.iqwhrvtcrseidfyznqaf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
  statement_timeout: 60000,
  idleTimeoutMillis: 30000,
  max: 3,
};

// Create connection pool
const pool = new Pool(supabaseConfig);

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Supabase PostgreSQL connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
};

// Initialize database schema
const initializeDatabase = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../database/supabase-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    const client = await pool.connect();
    try {
      // Execute the entire schema as one statement
      await client.query(schema);
      console.log('✅ Supabase schema initialized successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error.message);
  }
};

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};
