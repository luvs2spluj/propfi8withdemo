-- Drop existing tables to start fresh
DROP TABLE IF EXISTS property_data CASCADE;
DROP TABLE IF EXISTS csv_uploads CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- Create properties table with RLS policies
CREATE TABLE properties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    total_units INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on name
ALTER TABLE properties ADD CONSTRAINT properties_name_unique UNIQUE (name);

-- Create property_data table with exact CSV column names
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

-- Create csv_uploads table
CREATE TABLE csv_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    records_processed INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    upload_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can restrict these later)
CREATE POLICY "Allow public access to properties" ON properties FOR ALL USING (true);
CREATE POLICY "Allow public access to property_data" ON property_data FOR ALL USING (true);
CREATE POLICY "Allow public access to csv_uploads" ON csv_uploads FOR ALL USING (true);

-- Insert Chico property (now that unique constraint exists)
INSERT INTO properties (name, address, type, total_units) VALUES
('Chico', '1709 Oakdale St, Chico, CA 95928', 'Apartment Complex', 26)
ON CONFLICT (name) DO NOTHING;
