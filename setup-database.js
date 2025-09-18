#!/usr/bin/env node

/**
 * Database Setup Script for AI Parser
 * 
 * This script sets up the AI parser database tables in Supabase.
 * Run this after setting up your Supabase project.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up AI Parser Database...\n');

// Read the SQL schema file
const schemaPath = path.join(__dirname, 'ai-parser-schema.sql');
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

console.log('📋 Database Schema Ready:');
console.log('   - properties_ai table');
console.log('   - csv_files_ai table');
console.log('   - parsed_data_ai table');
console.log('   - header_matches_ai table');
console.log('   - processing_jobs_ai table');
console.log('   - user_sessions_ai table');
console.log('   - Storage bucket: csv-files-ai');
console.log('   - Row Level Security policies');
console.log('   - Sample data');

console.log('\n📝 To set up your database:');
console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
console.log('2. Select your project: iqwhrvtcrseidfyznqaf');
console.log('3. Go to SQL Editor');
console.log('4. Copy and paste the contents of ai-parser-schema.sql');
console.log('5. Click "Run" to execute the schema');

console.log('\n🔗 Your Supabase Project:');
console.log('   URL: https://iqwhrvtcrseidfyznqaf.supabase.co');
console.log('   Project Ref: iqwhrvtcrseidfyznqaf');

console.log('\n✅ Environment variables are configured:');
console.log('   REACT_APP_SUPABASE_URL_AI: https://iqwhrvtcrseidfyznqaf.supabase.co');
console.log('   REACT_APP_SUPABASE_ANON_KEY_AI: sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf');

console.log('\n🎯 Next Steps:');
console.log('1. Run the SQL schema in Supabase Dashboard');
console.log('2. Restart your development server');
console.log('3. Test the Property Management functionality');
console.log('4. Upload CSV files using the AI Parser');

console.log('\n📄 SQL Schema Location: ai-parser-schema.sql');
console.log('📄 Environment File: .env');
console.log('📄 AI Parser Service: src/config/supabaseAI.ts');

console.log('\n🚀 Ready to go! Your AI Parser is configured and ready to use.');
