const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://iqwhrvtcrseidfyznqaf.supabase.co';
const supabaseKey = 'sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function simpleSetup() {
  try {
    console.log('🚀 Simple Supabase setup...');
    
    // Step 1: Try to create property without conflict handling
    console.log('📝 Creating Chico property...');
    const { data: property, error: propError } = await supabase
      .from('properties')
      .insert({
        id: 'chico-property-id',
        name: 'Chico',
        address: '1709 Oakdale St, Chico, CA 95928',
        type: 'Apartment Complex',
        total_units: 26
      })
      .select()
      .single();
    
    if (propError) {
      console.log('⚠️ Property creation error (might already exist):', propError.message);
      
      // Try to get existing property
      const { data: existingProperty, error: getError } = await supabase
        .from('properties')
        .select('*')
        .eq('name', 'Chico')
        .single();
      
      if (getError) {
        console.error('❌ Cannot find or create Chico property:', getError);
        return;
      }
      
      console.log('✅ Using existing property:', existingProperty);
      property = existingProperty;
    } else {
      console.log('✅ Property created:', property);
    }
    
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
    
    // Step 4: Upload data
    console.log('⬆️ Uploading data to Supabase...');
    const { data: uploadData, error: uploadError } = await supabase
      .from('property_data')
      .insert(dataRows);
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      console.log('💡 The table schema might not match. Please update the schema first.');
      console.log('📋 Expected columns:', headers);
      return;
    }
    
    console.log('✅ Successfully uploaded', dataRows.length, 'rows to Supabase!');
    console.log('🌐 Your data is now accessible from the Vercel deployment');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
simpleSetup();
