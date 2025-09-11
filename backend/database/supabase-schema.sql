-- Supabase PostgreSQL Schema for Horton Properties Dashboard

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    total_units INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property data table (for CSV uploads)
CREATE TABLE IF NOT EXISTS property_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    revenue DECIMAL(10,2) DEFAULT 0,
    occupancy_rate DECIMAL(5,2) DEFAULT 0,
    maintenance_cost DECIMAL(10,2) DEFAULT 0,
    utilities_cost DECIMAL(10,2) DEFAULT 0,
    insurance_cost DECIMAL(10,2) DEFAULT 0,
    property_tax DECIMAL(10,2) DEFAULT 0,
    other_expenses DECIMAL(10,2) DEFAULT 0,
    notes VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CSV uploads tracking table
CREATE TABLE IF NOT EXISTS csv_uploads (
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_data_property_id ON property_data(property_id);
CREATE INDEX IF NOT EXISTS idx_property_data_date ON property_data(date);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_property_id ON csv_uploads(property_id);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_uploaded_at ON csv_uploads(uploaded_at);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_data_updated_at ON property_data;
CREATE TRIGGER update_property_data_updated_at BEFORE UPDATE ON property_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample properties (only if they don't exist)
INSERT INTO properties (name, address, type, total_units) VALUES
('Chico', '1709 Oakdale St, Chico, CA 95928', 'Apartment Complex', 26)
ON CONFLICT (name) DO NOTHING;
