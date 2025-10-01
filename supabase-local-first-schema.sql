-- Supabase schema for local-first architecture
-- This schema supports the datasets and dataset_samples tables for cloud sync

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create datasets table
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  owner UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dataset_samples table
CREATE TABLE IF NOT EXISTS dataset_samples (
  dataset_id UUID PRIMARY KEY REFERENCES datasets(id) ON DELETE CASCADE,
  sample JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_samples ENABLE ROW LEVEL SECURITY;

-- RLS Policies for datasets table
CREATE POLICY "Users can view their own datasets" ON datasets
  FOR SELECT USING (auth.uid() = owner);

CREATE POLICY "Users can insert their own datasets" ON datasets
  FOR INSERT WITH CHECK (auth.uid() = owner);

CREATE POLICY "Users can update their own datasets" ON datasets
  FOR UPDATE USING (auth.uid() = owner);

CREATE POLICY "Users can delete their own datasets" ON datasets
  FOR DELETE USING (auth.uid() = owner);

-- RLS Policies for dataset_samples table
CREATE POLICY "Users can view their own dataset samples" ON dataset_samples
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM datasets 
      WHERE datasets.id = dataset_samples.dataset_id 
      AND datasets.owner = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own dataset samples" ON dataset_samples
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM datasets 
      WHERE datasets.id = dataset_samples.dataset_id 
      AND datasets.owner = auth.uid()
    )
  );

CREATE POLICY "Users can update their own dataset samples" ON dataset_samples
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM datasets 
      WHERE datasets.id = dataset_samples.dataset_id 
      AND datasets.owner = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own dataset samples" ON dataset_samples
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM datasets 
      WHERE datasets.id = dataset_samples.dataset_id 
      AND datasets.owner = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_datasets_owner ON datasets(owner);
CREATE INDEX IF NOT EXISTS idx_datasets_updated_at ON datasets(updated_at);
CREATE INDEX IF NOT EXISTS idx_dataset_samples_dataset_id ON dataset_samples(dataset_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_datasets_updated_at 
  BEFORE UPDATE ON datasets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dataset_samples_updated_at 
  BEFORE UPDATE ON dataset_samples 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON datasets TO anon, authenticated;
GRANT ALL ON dataset_samples TO anon, authenticated;
