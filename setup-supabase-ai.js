#!/usr/bin/env node

/**
 * Supabase AI Parser Setup Script
 * 
 * This script sets up the Supabase database for the AI parser integration
 * using the provided credentials.
 */

const SUPABASE_URL = 'https://iqwhrvtcrseidfyznqaf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf';
const SUPABASE_SERVICE_KEY = 'sb_secret_RsnPJrhJJjeOofYT3MPVUQ_Wy0nNOjD';

console.log('🗄️  Setting up Supabase database for AI Parser...\n');

// Database schema for AI parser
const schema = `
-- AI Parser Branch Supabase Schema
-- This schema creates separate tables for the AI parser integration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage bucket for AI parser files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('csv-files-ai', 'csv-files-ai', false)
ON CONFLICT (id) DO NOTHING;

-- Properties table for AI parser branch
CREATE TABLE IF NOT EXISTS properties_ai (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    type VARCHAR(100) DEFAULT 'Unknown',
    total_units INTEGER DEFAULT 0,
    ai_parser_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CSV Files table for AI parser branch
CREATE TABLE IF NOT EXISTS csv_files_ai (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    property_id UUID REFERENCES properties_ai(id) ON DELETE CASCADE,
    property_name VARCHAR(255) NOT NULL,
    upload_status VARCHAR(50) DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'processing', 'completed', 'failed')),
    processing_mode VARCHAR(50) DEFAULT 'ai_parser' CHECK (processing_mode IN ('ai_parser', 'traditional')),
    ai_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    format_detected VARCHAR(50) DEFAULT 'traditional' CHECK (format_detected IN ('month-column', 'traditional')),
    storage_path TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parsed Data table for AI parser branch
CREATE TABLE IF NOT EXISTS parsed_data_ai (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    csv_file_id UUID REFERENCES csv_files_ai(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    period VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    amount_raw TEXT,
    category VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    bucket_assignment VARCHAR(100) DEFAULT 'unknown',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Header Matches table for AI parser branch
CREATE TABLE IF NOT EXISTS header_matches_ai (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    csv_file_id UUID REFERENCES csv_files_ai(id) ON DELETE CASCADE,
    original_header VARCHAR(255) NOT NULL,
    suggested_bucket VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    alternative_buckets JSONB DEFAULT '[]',
    user_confirmed BOOLEAN DEFAULT false,
    user_override VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing Jobs table for AI parser branch
CREATE TABLE IF NOT EXISTS processing_jobs_ai (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    csv_file_id UUID REFERENCES csv_files_ai(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    ai_analysis JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- User Sessions table for AI parser branch
CREATE TABLE IF NOT EXISTS user_sessions_ai (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID,
    session_data JSONB DEFAULT '{}',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_csv_files_ai_property_id ON csv_files_ai(property_id);
CREATE INDEX IF NOT EXISTS idx_csv_files_ai_status ON csv_files_ai(upload_status);
CREATE INDEX IF NOT EXISTS idx_csv_files_ai_created_at ON csv_files_ai(created_at);

CREATE INDEX IF NOT EXISTS idx_parsed_data_ai_csv_file_id ON parsed_data_ai(csv_file_id);
CREATE INDEX IF NOT EXISTS idx_parsed_data_ai_category ON parsed_data_ai(category);
CREATE INDEX IF NOT EXISTS idx_parsed_data_ai_period ON parsed_data_ai(period);

CREATE INDEX IF NOT EXISTS idx_header_matches_ai_csv_file_id ON header_matches_ai(csv_file_id);
CREATE INDEX IF NOT EXISTS idx_header_matches_ai_bucket ON header_matches_ai(suggested_bucket);
CREATE INDEX IF NOT EXISTS idx_header_matches_ai_confirmed ON header_matches_ai(user_confirmed);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_ai_csv_file_id ON processing_jobs_ai(csv_file_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_ai_status ON processing_jobs_ai(status);

CREATE INDEX IF NOT EXISTS idx_properties_ai_ai_enabled ON properties_ai(ai_parser_enabled);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_properties_ai_updated_at BEFORE UPDATE ON properties_ai
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_csv_files_ai_updated_at BEFORE UPDATE ON csv_files_ai
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE properties_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_files_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_data_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE header_matches_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions_ai ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security requirements)
CREATE POLICY "Enable read access for all users" ON properties_ai FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON properties_ai FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON properties_ai FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON properties_ai FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON csv_files_ai FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON csv_files_ai FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON csv_files_ai FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON csv_files_ai FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON parsed_data_ai FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON parsed_data_ai FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON parsed_data_ai FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON parsed_data_ai FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON header_matches_ai FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON header_matches_ai FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON header_matches_ai FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON header_matches_ai FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON processing_jobs_ai FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON processing_jobs_ai FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON processing_jobs_ai FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON processing_jobs_ai FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON user_sessions_ai FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON user_sessions_ai FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON user_sessions_ai FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON user_sessions_ai FOR DELETE USING (true);

-- Storage policies for csv-files-ai bucket
CREATE POLICY "Enable upload for all users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'csv-files-ai');
CREATE POLICY "Enable read for all users" ON storage.objects FOR SELECT USING (bucket_id = 'csv-files-ai');
CREATE POLICY "Enable update for all users" ON storage.objects FOR UPDATE USING (bucket_id = 'csv-files-ai');
CREATE POLICY "Enable delete for all users" ON storage.objects FOR DELETE USING (bucket_id = 'csv-files-ai');

-- Insert sample data for testing
INSERT INTO properties_ai (name, address, type, total_units) VALUES
('Sample Property 1', '123 Main St, City, State', 'Apartment', 24),
('Sample Property 2', '456 Oak Ave, City, State', 'Townhouse', 12)
ON CONFLICT (id) DO NOTHING;

-- Create a view for AI parser dashboard
CREATE OR REPLACE VIEW ai_parser_dashboard AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    p.address,
    p.total_units,
    COUNT(cf.id) as total_csv_files,
    COUNT(CASE WHEN cf.upload_status = 'completed' THEN 1 END) as completed_files,
    COUNT(CASE WHEN cf.upload_status = 'processing' THEN 1 END) as processing_files,
    COUNT(CASE WHEN cf.upload_status = 'failed' THEN 1 END) as failed_files,
    AVG(cf.ai_confidence) as avg_confidence,
    MAX(cf.created_at) as last_upload
FROM properties_ai p
LEFT JOIN csv_files_ai cf ON p.id = cf.property_id
GROUP BY p.id, p.name, p.address, p.total_units;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
`;

// Write schema to file
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'supabase-ai-schema.sql');
fs.writeFileSync(schemaPath, schema);

console.log('✅ Created Supabase schema file: supabase-ai-schema.sql');
console.log('\n📋 Next steps:');
console.log('1. Go to your Supabase dashboard: https://iqwhrvtcrseidfyznqaf.supabase.co');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the contents of supabase-ai-schema.sql');
console.log('4. Run the SQL to create all tables and policies');
console.log('5. Go to Storage and create bucket "csv-files-ai" (if not created by SQL)');
console.log('\n🔧 Supabase Configuration:');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Anon Key: ${SUPABASE_ANON_KEY}`);
console.log(`Service Key: ${SUPABASE_SERVICE_KEY}`);
console.log('\n🚀 After setting up the database, run: npm start');
