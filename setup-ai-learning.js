const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function setupAILearningTable() {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Required: REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔧 Setting up AI learning table...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(path.join(__dirname, 'setup-ai-learning-table.sql'), 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    
    if (error) {
      console.error('❌ Error creating AI learning table:', error);
      
      // Try alternative method - execute statements individually
      console.log('🔄 Trying alternative approach...');
      
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        if (statement.includes('CREATE TABLE') || statement.includes('ALTER TABLE') || 
            statement.includes('CREATE POLICY') || statement.includes('CREATE INDEX') ||
            statement.includes('CREATE OR REPLACE FUNCTION') || statement.includes('CREATE TRIGGER')) {
          try {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement });
            if (stmtError && !stmtError.message.includes('already exists')) {
              console.error('Statement error:', stmtError);
            }
          } catch (e) {
            console.warn('Statement warning:', e.message);
          }
        }
      }
    }
    
    // Test the table by inserting a sample record
    console.log('🧪 Testing AI learning table...');
    
    const { data: testData, error: testError } = await supabase
      .from('ai_learning')
      .upsert({
        file_type: 'cash_flow',
        account_name: 'Test Account',
        user_category: 'expense_item',
        confidence_score: 1.0,
        usage_count: 1
      }, {
        onConflict: 'file_type,account_name'
      })
      .select();
    
    if (testError) {
      console.error('❌ Error testing table:', testError);
    } else {
      console.log('✅ AI learning table created and tested successfully!');
      
      // Clean up test data
      await supabase
        .from('ai_learning')
        .delete()
        .eq('account_name', 'Test Account');
    }
    
    console.log('🎉 Setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupAILearningTable();
