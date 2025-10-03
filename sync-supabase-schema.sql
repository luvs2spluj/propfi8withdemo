-- Enhanced Supabase schema to support local storage sync
-- Run this in your Supabase SQL editor

-- Create user_preferences table for syncing user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for user_preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Update csv_data table to support improved local storage sync
ALTER TABLE csv_data 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS property_name TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
ADD COLUMN IF NOT EXISTS local_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS cloud_version INTEGER DEFAULT 1;

-- Update csv_data RLS policy to include user-specific access
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON csv_data;
CREATE POLICY "Users can manage their own CSV data" ON csv_data
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_csv_data_user_id ON csv_data(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_data_file_type ON csv_data(file_type);
CREATE INDEX IF NOT EXISTS idx_csv_data_is_active ON csv_data(is_active);

-- Create a function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic timestamp updates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at') THEN
        CREATE TRIGGER update_user_preferences_updated_at 
            BEFORE UPDATE ON user_preferences
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_csv_data_updated_at') THEN
        CREATE TRIGGER update_csv_data_updated_at 
            BEFORE UPDATE ON csv_data
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create a function to sync CSV data with conflict resolution
CREATE OR REPLACE FUNCTION sync_csv_data(
    p_id TEXT,
    p_user_id UUID,
    p_file_name TEXT,
    p_file_type TEXT,
    p_total_records INTEGER,
    p_bucket_assignments JSONB DEFAULT '{}',
    p_preview_data JSONB DEFAULT '[]',
    p_property_name TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    conflict BOOLEAN,
    message TEXT
) AS $$
DECLARE
    existing_record csv_data%ROWTYPE;
BEGIN
    -- Check if record exists
    SELECT * INTO existing_record FROM csv_data WHERE id = p_id AND user_id = p_user_id;
    
    IF existing_record.id IS NULL THEN
        -- Insert new record
        INSERT INTO csv_data (
            id, user_id, file_name, file_type, uploaded_at, 
            total_records, account_categories, bucket_assignments, 
            is_active, preview_data, property_name, sync_status, cloud_version
        ) VALUES (
            p_id, p_user_id, p_file_name, p_file_type, NOW(),
            p_total_records, '{}', p_bucket_assignments,
            true, p_preview_data, p_property_name, 'synced', 1
        );
        
        RETURN QUERY SELECT true, false, 'Record created successfully'::TEXT;
    ELSE
        -- Update existing record if cloud version is newer or equal
        IF existing_record.cloud_version >= 1 THEN
            UPDATE csv_data SET
                file_name = p_file_name,
                file_type = p_file_type,
                total_records = p_total_records,
                bucket_assignments = p_bucket_assignments,
                preview_data = p_preview_data,
                property_name = COALESCE(p_property_name, existing_record.property_name),
                sync_status = 'synced',
                cloud_version = existing_record.cloud_version + 1,
                updated_at = NOW()
            WHERE id = p_id AND user_id = p_user_id;
            
            RETURN QUERY SELECT true, false, 'Record updated successfully'::TEXT;
        ELSE
            -- Conflict detected
            UPDATE csv_data SET
                sync_status = 'conflict',
                updated_at = NOW()
            WHERE id = p_id AND user_id = p_user_id;
            
            RETURN QUERY SELECT false, true, 'Conflict detected'::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for CSV files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('csv-files', 'csv-files', false)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policy for csv-files bucket
CREATE POLICY "Authenticated users can upload CSV files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'csv-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view their CSV files" ON storage.objects
    FOR SELECT USING (bucket_id = 'csv-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their CSV files" ON storage.objects
    FOR DELETE USING (bucket_id = 'csv-files' AND auth.role() = 'authenticated');

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_preferences TO authenticated;
GRANT ALL ON csv_data TO authenticated;

-- Enable real-time subscriptions for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE csv_data;

