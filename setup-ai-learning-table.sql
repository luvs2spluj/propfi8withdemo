-- Create AI learning table for storing user categorization patterns
CREATE TABLE IF NOT EXISTS ai_learning (
    id BIGSERIAL PRIMARY KEY,
    file_type TEXT NOT NULL,
    account_name TEXT NOT NULL,
    user_category TEXT NOT NULL,
    confidence_score REAL DEFAULT 1.0,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(file_type, account_name)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE ai_learning ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on ai_learning" ON ai_learning
    FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_learning_file_type ON ai_learning(file_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_account_name ON ai_learning(account_name);
CREATE INDEX IF NOT EXISTS idx_ai_learning_user_category ON ai_learning(user_category);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_learning_updated_at 
    BEFORE UPDATE ON ai_learning 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();