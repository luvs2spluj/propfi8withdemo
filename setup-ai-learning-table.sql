-- Setup AI Learning Table for Horton Properties Dashboard
-- Run this in your Supabase SQL Editor

-- AI Learning table for storing user categorizations
CREATE TABLE IF NOT EXISTS ai_learning (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_type VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    user_category VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(file_type, account_name)
);

-- RLS policies for ai_learning table
ALTER TABLE ai_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on ai_learning" ON ai_learning
    FOR ALL USING (true);

-- Trigger for automatic timestamp updates on ai_learning
CREATE TRIGGER update_ai_learning_updated_at BEFORE UPDATE ON ai_learning
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample learning data (optional)
INSERT INTO ai_learning (file_type, account_name, user_category, confidence_score, usage_count) VALUES
('cash_flow', 'Resident / Tenant Rents & Asmts', 'income', 1.0, 1),
('cash_flow', 'Management Fee', 'expense', 1.0, 1),
('cash_flow', 'Utilities', 'expense', 1.0, 1),
('cash_flow', 'Maintenance & Repairs', 'expense', 1.0, 1),
('cash_flow', 'Late Fees', 'income', 1.0, 1),
('cash_flow', 'Application Fees', 'income', 1.0, 1)
ON CONFLICT (file_type, account_name) DO NOTHING;
