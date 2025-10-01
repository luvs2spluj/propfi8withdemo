-- Fix Supabase Schema Migration
-- This script fixes the schema issues identified in the console logs

-- 1. Add user_id column to csv_data table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'csv_data' AND column_name = 'user_id') THEN
        ALTER TABLE csv_data ADD COLUMN user_id UUID;
    END IF;
END $$;

-- 2. Create the ensure_user_exists function if it doesn't exist
CREATE OR REPLACE FUNCTION ensure_user_exists(
    clerk_user_id TEXT, 
    user_email TEXT, 
    user_first_name TEXT, 
    user_last_name TEXT
)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Try to get existing user
    SELECT id INTO user_id FROM users WHERE clerk_user_id = ensure_user_exists.clerk_user_id;
    
    -- If user doesn't exist, create them
    IF user_id IS NULL THEN
        INSERT INTO users (clerk_user_id, email, first_name, last_name, role)
        VALUES (clerk_user_id, user_email, user_first_name, user_last_name, 'user')
        RETURNING id INTO user_id;
    ELSE
        -- Update existing user info
        UPDATE users 
        SET email = user_email, first_name = user_first_name, last_name = user_last_name, updated_at = NOW()
        WHERE id = user_id;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update csv_data table structure to match frontend expectations
-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add time_series column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'csv_data' AND column_name = 'time_series') THEN
        ALTER TABLE csv_data ADD COLUMN time_series JSONB DEFAULT '[]';
    END IF;
    
    -- Add data_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'csv_data' AND column_name = 'data_date') THEN
        ALTER TABLE csv_data ADD COLUMN data_date DATE;
    END IF;
END $$;

-- 4. Create RLS policies for csv_data table if they don't exist
DO $$ 
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'csv_data' AND relrowsecurity = true) THEN
        ALTER TABLE csv_data ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Create policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'csv_data' AND policyname = 'Allow all operations for authenticated users') THEN
        CREATE POLICY "Allow all operations for authenticated users" ON csv_data
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_csv_data_user_id ON csv_data(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_data_file_name ON csv_data(file_name);
CREATE INDEX IF NOT EXISTS idx_csv_data_uploaded_at ON csv_data(uploaded_at);

-- 6. Grant necessary permissions
GRANT ALL ON csv_data TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_exists TO authenticated;



