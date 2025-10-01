-- Supabase Schema Cleanup and Sync
-- Run this in Supabase SQL Editor

-- 1. Add user_id column to csv_data table
ALTER TABLE public.csv_data
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id);

-- 2. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_csv_data_user_id ON public.csv_data (user_id);

-- 3. Create ensure_user_exists RPC function
CREATE OR REPLACE FUNCTION public.ensure_user_exists(
  user_email text,
  user_first_name text DEFAULT NULL,
  user_last_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert user if missing, using email as unique identifier
  INSERT INTO public.users (email, first_name, last_name, created_at, updated_at)
  VALUES (user_email, user_first_name, user_last_name, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    updated_at = NOW();
END;
$$;

-- 4. Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- 5. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for users table
CREATE POLICY IF NOT EXISTS "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 7. Ensure csv_data table has proper structure
ALTER TABLE public.csv_data
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT NOW();

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_csv_data_created_at ON public.csv_data (created_at);
CREATE INDEX IF NOT EXISTS idx_csv_data_updated_at ON public.csv_data (updated_at);

-- 9. Update RLS policies for csv_data
DROP POLICY IF EXISTS "Users can view their own csv data" ON public.csv_data;
DROP POLICY IF EXISTS "Users can insert their own csv data" ON public.csv_data;
DROP POLICY IF EXISTS "Users can update their own csv data" ON public.csv_data;
DROP POLICY IF EXISTS "Users can delete their own csv data" ON public.csv_data;

CREATE POLICY "Users can view their own csv data" ON public.csv_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own csv data" ON public.csv_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own csv data" ON public.csv_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own csv data" ON public.csv_data
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Create ai_learning table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ai_learning (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id),
  file_type text NOT NULL,
  account_name text NOT NULL,
  user_category text NOT NULL,
  confidence_score decimal(3,2) DEFAULT 1.0,
  usage_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  UNIQUE(user_id, file_type, account_name)
);

-- 11. Enable RLS on ai_learning table
ALTER TABLE public.ai_learning ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for ai_learning
CREATE POLICY IF NOT EXISTS "Users can view their own ai learning" ON public.ai_learning
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own ai learning" ON public.ai_learning
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own ai learning" ON public.ai_learning
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own ai learning" ON public.ai_learning
  FOR DELETE USING (auth.uid() = user_id);

-- 13. Create indexes for ai_learning
CREATE INDEX IF NOT EXISTS idx_ai_learning_user_id ON public.ai_learning (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_file_type ON public.ai_learning (file_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_account_name ON public.ai_learning (account_name);

-- 14. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.csv_data TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.ai_learning TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_exists TO anon, authenticated;

-- 15. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_csv_data_updated_at ON public.csv_data;
CREATE TRIGGER update_csv_data_updated_at
  BEFORE UPDATE ON public.csv_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_learning_updated_at ON public.ai_learning;
CREATE TRIGGER update_ai_learning_updated_at
  BEFORE UPDATE ON public.ai_learning
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Success message
SELECT 'Schema cleanup completed successfully!' as status;



