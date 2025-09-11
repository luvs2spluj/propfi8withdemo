#!/usr/bin/env node

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envPath = join(process.cwd(), '.env.local');
let envVars = {};
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        envVars[key] = value;
      }
    }
  });
} catch (e) {
  console.log('No .env.local found, using process.env');
}

// Use hardcoded URL for now to avoid parsing issues
const SUPABASE_DB_URL = 'postgresql://postgres:Poosmells12!@db.iqwhrvtcrseidfyznqaf.supabase.co:5432/postgres';

console.log('🔍 Using database URL:', SUPABASE_DB_URL);

const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function diagnoseDatabase() {
  console.log('🔍 Diagnosing database connection and schema...');
  console.log('');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();

    // Check if tables exist
    console.log('');
    console.log('2. Checking table existence...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tablesResult = await pool.query(tablesQuery);
    console.log('📋 Existing tables:', tablesResult.rows.map(r => r.table_name));

    // Check properties table structure
    console.log('');
    console.log('3. Checking properties table structure...');
    const propertiesColumnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      ORDER BY ordinal_position
    `;
    const propertiesColumnsResult = await pool.query(propertiesColumnsQuery);
    if (propertiesColumnsResult.rows.length > 0) {
      console.log('📋 Properties table columns:');
      propertiesColumnsResult.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
      });
    } else {
      console.log('❌ Properties table does not exist');
    }

    // Check property_data table structure
    console.log('');
    console.log('4. Checking property_data table structure...');
    const propertyDataColumnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'property_data' 
      ORDER BY ordinal_position
    `;
    const propertyDataColumnsResult = await pool.query(propertyDataColumnsQuery);
    if (propertyDataColumnsResult.rows.length > 0) {
      console.log('📋 Property_data table columns:');
      propertyDataColumnsResult.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
      });
    } else {
      console.log('❌ Property_data table does not exist');
    }

    // Check constraints
    console.log('');
    console.log('5. Checking constraints...');
    const constraintsQuery = `
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('properties', 'property_data')
      ORDER BY tc.table_name, tc.constraint_type
    `;
    const constraintsResult = await pool.query(constraintsQuery);
    if (constraintsResult.rows.length > 0) {
      console.log('📋 Table constraints:');
      constraintsResult.rows.forEach(constraint => {
        console.log(`   ${constraint.table_name}.${constraint.column_name}: ${constraint.constraint_type}`);
      });
    } else {
      console.log('❌ No constraints found');
    }

    // Check data
    console.log('');
    console.log('6. Checking existing data...');
    const propertiesCountQuery = 'SELECT COUNT(*) as count FROM properties';
    const propertiesCountResult = await pool.query(propertiesCountQuery);
    console.log(`📊 Properties count: ${propertiesCountResult.rows[0].count}`);

    const propertyDataCountQuery = 'SELECT COUNT(*) as count FROM property_data';
    const propertyDataCountResult = await pool.query(propertyDataCountQuery);
    console.log(`📊 Property_data count: ${propertyDataCountResult.rows[0].count}`);

    // Check for any errors in the logs
    console.log('');
    console.log('7. Checking for recent errors...');
    const errorQuery = `
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      LIMIT 5
    `;
    const errorResult = await pool.query(errorQuery);
    console.log('📊 Database stats sample:', errorResult.rows.length > 0 ? 'Available' : 'No stats');

  } catch (error) {
    console.error('❌ Database diagnosis failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the diagnosis
diagnoseDatabase().catch(console.error);
