const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

// Database configuration
const dbConfig = {
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 60000,
  idleTimeoutMillis: 30000,
  max: 3,
};

const pool = new Pool(dbConfig);

async function createAILearningTable() {
  console.log('🔧 Connecting to Supabase PostgreSQL database...');
  
  const client = await pool.connect();
  
  try {
    console.log('✅ Database connection established');
    
    // Create the AI learning table
    console.log('📊 Creating ai_learning table...');
    
    const createTableQuery = `
      -- Create AI learning table for storing user categorization patterns
      CREATE TABLE IF NOT EXISTS ai_learning (
          id BIGSERIAL PRIMARY KEY,
          file_type TEXT NOT NULL,
          account_name TEXT NOT NULL,
          user_category TEXT NOT NULL,
          confidence_score REAL DEFAULT 1.0,
          usage_count INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(file_type, account_name)
      );
    `;
    
    await client.query(createTableQuery);
    console.log('✅ ai_learning table created successfully');
    
    // Enable RLS
    console.log('🔒 Setting up Row Level Security...');
    await client.query('ALTER TABLE ai_learning ENABLE ROW LEVEL SECURITY;');
    console.log('✅ RLS enabled');
    
    // Create RLS policy
    console.log('📋 Creating RLS policy...');
    const policyQuery = `
      CREATE POLICY IF NOT EXISTS "Allow all operations on ai_learning" 
      ON ai_learning FOR ALL USING (true);
    `;
    await client.query(policyQuery);
    console.log('✅ RLS policy created');
    
    // Create indexes for better performance
    console.log('📈 Creating performance indexes...');
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_ai_learning_file_type ON ai_learning(file_type);',
      'CREATE INDEX IF NOT EXISTS idx_ai_learning_account_name ON ai_learning(account_name);',
      'CREATE INDEX IF NOT EXISTS idx_ai_learning_user_category ON ai_learning(user_category);'
    ];
    
    for (const indexQuery of indexQueries) {
      await client.query(indexQuery);
      console.log(`✅ Index created: ${indexQuery.split(' ')[5]}`);
    }
    
    // Test the table by inserting a sample record
    console.log('🧪 Testing the ai_learning table...');
    
    const insertQuery = `
      INSERT INTO ai_learning (file_type, account_name, user_category, confidence_score, usage_count)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (file_type, account_name) DO UPDATE SET
        user_category = EXCLUDED.user_category,
        confidence_score = EXCLUDED.confidence_score,
        usage_count = EXCLUDED.usage_count,
        updated_at = NOW()
      RETURNING *;
    `;
    
    const testResult = await client.query(insertQuery, [
      'cash_flow',
      'Test Account',
      'expense_item',
      1.0,
      1
    ]);
    
    console.log('✅ Table test successful! Sample record:', testResult.rows[0]);
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await client.query('DELETE FROM ai_learning WHERE account_name = $1', ['Test Account']);
    console.log('✅ Test data cleaned up');
    
    // Verify table structure
    console.log('🔍 Verifying table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'ai_learning'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Table structure:');
    tableInfo.rows.forEach(col => {
      console.log(`  • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    console.log('\n🎉 AI Learning table setup complete!');
    console.log('📱 Your app can now:');
    console.log('   • ✅ Save user categorization choices');
    console.log('   • ✅ Auto-categorize similar items in future uploads');
    console.log('   • ✅ Show 🧠 brain icons for learned categorizations');
    console.log('   • ✅ Remember categorizations when editing saved CSVs');
    console.log('\n🚀 Restart your development server to use the new AI learning features!');
    
  } catch (error) {
    console.error('❌ Error creating AI learning table:', error);
    console.error('Full error details:', error.message);
    
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists, which is fine!');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
createAILearningTable().catch(console.error);
