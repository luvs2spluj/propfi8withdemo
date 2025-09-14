const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
// Generate a simple UUID-like string
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Supabase configuration
const supabaseUrl = 'https://iqwhrvtcrseidfyznqaf.supabase.co';
const supabaseKey = 'sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalSetup() {
  try {
    console.log('🚀 Final Supabase setup...');
    
    // Step 1: Create property with proper UUID
    console.log('📝 Creating Chico property...');
    const propertyId = generateId();
    
    const { data: property, error: propError } = await supabase
      .from('properties')
      .insert({
        id: propertyId,
        name: 'Chico',
        address: '1709 Oakdale St, Chico, CA 95928',
        type: 'Apartment Complex',
        total_units: 26
      })
      .select()
      .single();
    
    if (propError) {
      console.log('⚠️ Property creation error:', propError.message);
      
      // Try to get existing property
      const { data: existingProperty, error: getError } = await supabase
        .from('properties')
        .select('*')
        .eq('name', 'Chico')
        .single();
      
      if (getError) {
        console.error('❌ Cannot find Chico property:', getError);
        console.log('💡 Please create the property manually in Supabase dashboard first');
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
    console.log('📄 Sample row:', dataRows[0]);
    
    // Step 4: Upload data
    console.log('⬆️ Uploading data to Supabase...');
    const { data: uploadData, error: uploadError } = await supabase
      .from('property_data')
      .insert(dataRows);
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      console.log('💡 The table schema might not match. Please update the schema first.');
      console.log('📋 Expected columns:', headers);
      console.log('🔧 Run this SQL in Supabase dashboard:');
      console.log(`
DROP TABLE IF EXISTS property_data CASCADE;
CREATE TABLE property_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    "Date" DATE NOT NULL,
    "Monthly Revenue" DECIMAL(10,2) DEFAULT 0,
    "Occupancy Rate" DECIMAL(5,2) DEFAULT 0,
    "Total Units" INTEGER DEFAULT 0,
    "Maintenance Cost" DECIMAL(10,2) DEFAULT 0,
    "Utilities Cost" DECIMAL(10,2) DEFAULT 0,
    "Insurance Cost" DECIMAL(10,2) DEFAULT 0,
    "Property Tax" DECIMAL(10,2) DEFAULT 0,
    "Other Expenses" DECIMAL(10,2) DEFAULT 0,
    "Net Income" DECIMAL(10,2) DEFAULT 0,
    notes VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE property_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to property_data" ON property_data FOR ALL USING (true);
      `);
      return;
    }
    
    console.log('✅ Successfully uploaded', dataRows.length, 'rows to Supabase!');
    console.log('🌐 Your data is now accessible from the Vercel deployment');
    console.log('🔗 Vercel URL: https://horton-properties-data-dashboard-rl8fzx6ko.vercel.app');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
finalSetup();
