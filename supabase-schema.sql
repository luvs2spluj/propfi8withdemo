-- Supabase Database Schema for Horton Properties Dashboard
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
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
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CSV uploads tracking table
CREATE TABLE IF NOT EXISTS csv_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    rows_processed INTEGER DEFAULT 0,
    rows_inserted INTEGER DEFAULT 0,
    rows_updated INTEGER DEFAULT 0,
    rows_skipped INTEGER DEFAULT 0,
    upload_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Users table (for future authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table (for storing computed metrics)
CREATE TABLE IF NOT EXISTS analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    metric_date DATE NOT NULL,
    calculation_period VARCHAR(50), -- 'daily', 'monthly', 'yearly'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_data_property_id ON property_data(property_id);
CREATE INDEX IF NOT EXISTS idx_property_data_date ON property_data(date);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_property_id ON csv_uploads(property_id);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_uploaded_at ON csv_uploads(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_analytics_property_id ON analytics(property_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metric_date ON analytics(metric_date);

-- Row Level Security (RLS) policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all operations for authenticated users" ON properties
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON property_data
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON csv_uploads
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON users
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON analytics
    FOR ALL USING (auth.role() = 'authenticated');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_data_updated_at BEFORE UPDATE ON property_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CSV data table for storing uploaded CSV information
CREATE TABLE IF NOT EXISTS csv_data (
    id VARCHAR(255) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_records INTEGER DEFAULT 0,
    account_categories JSONB DEFAULT '{}',
    bucket_assignments JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    preview_data JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies for csv_data table
ALTER TABLE csv_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON csv_data
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for automatic timestamp updates on csv_data
CREATE TRIGGER update_csv_data_updated_at BEFORE UPDATE ON csv_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO properties (name, address, type, total_units) VALUES
('Downtown Plaza', '123 Main St, Downtown', 'Apartment Complex', 24),
('Garden Apartments', '456 Oak Ave, Garden District', 'Apartment Complex', 18),
('Riverside Complex', '789 River Rd, Riverside', 'Townhouse Complex', 12),
('Oakwood Manor', '321 Pine St, Oakwood', 'Single Family', 8),
('Sunset Heights', '654 Sunset Blvd, Heights', 'Apartment Complex', 30),
('Pine Valley', '987 Valley Rd, Pine Valley', 'Condo Complex', 16)
ON CONFLICT DO NOTHING;
