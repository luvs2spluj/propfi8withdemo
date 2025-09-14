const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://iqwhrvtcrseidfyznqaf.supabase.co';
const supabaseKey = 'sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadCSVData() {
  try {
    console.log('🚀 Uploading CSV data to Supabase...');
    
    // Step 1: Get the Chico property (it should exist after running the schema)
    console.log('📝 Getting Chico property...');
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('name', 'Chico')
      .single();
    
    if (propError) {
      console.error('❌ Error getting Chico property:', propError);
      console.log('💡 Please run the fixed-supabase-schema.sql first');
      return;
    }
    
    console.log('✅ Found Chico property:', property);
    
    // Step 2: Read CSV data
    console.log('📊 Reading CSV data...');
    const csvPath = path.join(__dirname, 'public', 'correct-chico-data.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log('📋 CSV Headers:', headers);
    
    // Step 3: Process data
    const dataRows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length && values[0]) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        
        row.property_id = property.id;
        dataRows.push(row);
      }
    }
    
    console.log('📈 Processed', dataRows.length, 'data rows');
    console.log('📄 Sample row:', dataRows[0]);
    
    // Step 4: Clear existing data for this property
    console.log('🗑️ Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('property_data')
      .delete()
      .eq('property_id', property.id);
    
    if (deleteError) {
      console.log('⚠️ Delete warning (might be expected):', deleteError.message);
    }
    
    // Step 5: Upload new data
    console.log('⬆️ Uploading data to Supabase...');
    const { data: uploadData, error: uploadError } = await supabase
      .from('property_data')
      .insert(dataRows);
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      console.log('💡 The table schema might not match. Please check the table structure.');
      return;
    }
    
    console.log('✅ Successfully uploaded', dataRows.length, 'rows to Supabase!');
    console.log('🌐 Your data is now accessible from the Vercel deployment');
    console.log('🔗 Vercel URL: https://horton-properties-data-dashboard-r01uofxyb.vercel.app');
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
}

// Run the upload
uploadCSVData();
