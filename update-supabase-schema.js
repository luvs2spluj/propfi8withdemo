const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://iqwhrvtcrseidfyznqaf.supabase.co';
const supabaseKey = 'sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSupabaseSchema() {
  try {
    console.log('🚀 Updating Supabase schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'backend', 'database', 'supabase-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Schema file loaded');
    
    // Execute the schema (this will update the table structure)
    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('❌ Schema update error:', error);
      return;
    }
    
    console.log('✅ Schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
  }
}

async function uploadCSVData() {
  try {
    console.log('📊 Uploading CSV data to Supabase...');
    
    // Read the Chico CSV file
    const csvPath = path.join(__dirname, 'public', 'correct-chico-data.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    console.log('📄 CSV file loaded:', csvPath);
    
    // Parse CSV content
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log('📋 Headers:', headers);
    
    // Process data rows - now using exact CSV column names
    const dataRows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length && values[0]) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        
        // Add property_id for the Chico property
        row.property_id = 'chico-property-id'; // We'll need to get this from the properties table
        
        dataRows.push(row);
      }
    }
    
    console.log('📈 Processed', dataRows.length, 'data rows');
    
    // First, get the Chico property ID
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('name', 'Chico')
      .single();
    
    if (propError) {
      console.error('❌ Error getting Chico property:', propError);
      return;
    }
    
    console.log('🏠 Found Chico property ID:', properties.id);
    
    // Update all rows with the correct property_id
    dataRows.forEach(row => {
      row.property_id = properties.id;
    });
    
    // Upload to Supabase
    const { data, error } = await supabase
      .from('property_data')
      .insert(dataRows);
    
    if (error) {
      console.error('❌ Supabase upload error:', error);
      return;
    }
    
    console.log('✅ Successfully uploaded', dataRows.length, 'rows to Supabase!');
    console.log('🌐 Data is now accessible from Vercel deployment');
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
}

async function main() {
  console.log('🎯 Starting Supabase setup...');
  
  // Note: Schema updates need to be done manually in Supabase dashboard
  // because the exec_sql function might not be available
  console.log('⚠️  Please update the schema manually in Supabase dashboard:');
  console.log('1. Go to https://supabase.com/dashboard/project/iqwhrvtcrseidfyznqaf');
  console.log('2. Go to SQL Editor');
  console.log('3. Run the schema from backend/database/supabase-schema.sql');
  console.log('4. Then run this script again to upload data');
  
  // Try to upload data anyway (in case schema is already updated)
  await uploadCSVData();
}

// Run the setup
main();
