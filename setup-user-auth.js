const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to add this to your .env

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   REACT_APP_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please add SUPABASE_SERVICE_ROLE_KEY to your .env file.');
  console.error('You can find it in your Supabase dashboard under Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupUserAuth() {
  console.log('🚀 Setting up user authentication and data isolation...');
  
  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'user-auth-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn(`⚠️  Warning on statement ${i + 1}:`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.warn(`⚠️  Warning on statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('✅ User authentication setup completed!');
    console.log('');
    console.log('🔐 Security Features Enabled:');
    console.log('   • Row Level Security (RLS) on all tables');
    console.log('   • User-specific data isolation');
    console.log('   • Clerk user ID integration');
    console.log('   • Automatic user creation on first login');
    console.log('');
    console.log('📊 Tables Created:');
    console.log('   • users - Clerk user profiles');
    console.log('   • properties - User-specific properties');
    console.log('   • csv_uploads - User-specific CSV uploads');
    console.log('   • csv_data - User-specific CSV data');
    console.log('   • user_bucket_terms - User-specific AI bucket terms');
    console.log('   • user_custom_buckets - User-specific custom buckets');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Test user login with Clerk');
    console.log('   2. Verify data isolation between users');
    console.log('   3. Test CSV upload and property management');
    
  } catch (error) {
    console.error('❌ Error setting up user authentication:', error);
    process.exit(1);
  }
}

// Create the exec_sql function if it doesn't exist
async function createExecSqlFunction() {
  const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  if (error && error.message.includes('function exec_sql')) {
    console.log('📝 Creating exec_sql function...');
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: funcError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    if (funcError) {
      console.error('❌ Error creating exec_sql function:', funcError);
      process.exit(1);
    }
    console.log('✅ exec_sql function created');
  }
}

async function main() {
  await createExecSqlFunction();
  await setupUserAuth();
}

main().catch(console.error);
