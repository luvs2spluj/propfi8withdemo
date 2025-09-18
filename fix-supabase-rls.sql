-- Fix Supabase RLS policy for csv_data table
-- This allows all operations on the csv_data table

-- Drop existing policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON csv_data;

-- Create a more permissive policy that allows all operations
CREATE POLICY "Allow all operations on csv_data" ON csv_data
    FOR ALL USING (true);

-- Alternative: Disable RLS entirely for csv_data table (if needed)
-- ALTER TABLE csv_data DISABLE ROW LEVEL SECURITY;
