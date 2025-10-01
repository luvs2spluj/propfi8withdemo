-- Safe Supabase schema migration
-- This version avoids potentially destructive operations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  clerk_user_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add user_id column to csv_data table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'csv_data' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.csv_data ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'csv_data_user_id_fkey'
    ) THEN
        ALTER TABLE public.csv_data 
        ADD CONSTRAINT csv_data_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id);
    END IF;
END $$;

-- Create ensure_user_exists RPC function
CREATE OR REPLACE FUNCTION public.ensure_user_exists(
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  clerk_user_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Try to find existing user by email or clerk_user_id
  SELECT id INTO user_id 
  FROM public.users 
  WHERE email = user_email 
     OR (clerk_user_id IS NOT NULL AND clerk_user_id = ensure_user_exists.clerk_user_id);
  
  -- If user doesn't exist, create them
  IF user_id IS NULL THEN
    INSERT INTO public.users (email, first_name, last_name, clerk_user_id)
    VALUES (user_email, user_first_name, user_last_name, ensure_user_exists.clerk_user_id)
    RETURNING id INTO user_id;
  ELSE
    -- Update existing user with new information
    UPDATE public.users 
    SET 
      email = COALESCE(user_email, email),
      first_name = COALESCE(user_first_name, first_name),
      last_name = COALESCE(user_last_name, last_name),
      clerk_user_id = COALESCE(ensure_user_exists.clerk_user_id, clerk_user_id),
      updated_at = NOW()
    WHERE id = user_id;
  END IF;
  
  RETURN user_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_exists(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.csv_data TO anon, authenticated;

-- Enable RLS (only if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'users' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'csv_data' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.csv_data ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create policies only if they don't exist
DO $$
BEGIN
    -- Users select policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'users select all'
    ) THEN
        CREATE POLICY "users select all" ON public.users FOR SELECT TO anon, authenticated USING (true);
    END IF;

    -- Users insert policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'users insert all'
    ) THEN
        CREATE POLICY "users insert all" ON public.users FOR INSERT TO anon, authenticated WITH CHECK (true);
    END IF;

    -- Users update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'users update all'
    ) THEN
        CREATE POLICY "users update all" ON public.users FOR UPDATE TO anon, authenticated USING (true);
    END IF;

    -- CSV data select policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'csv_data' AND policyname = 'csv_data select all'
    ) THEN
        CREATE POLICY "csv_data select all" ON public.csv_data FOR SELECT TO anon, authenticated USING (true);
    END IF;

    -- CSV data insert policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'csv_data' AND policyname = 'csv_data insert all'
    ) THEN
        CREATE POLICY "csv_data insert all" ON public.csv_data FOR INSERT TO anon, authenticated WITH CHECK (true);
    END IF;

    -- CSV data update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'csv_data' AND policyname = 'csv_data update all'
    ) THEN
        CREATE POLICY "csv_data update all" ON public.csv_data FOR UPDATE TO anon, authenticated USING (true);
    END IF;
END $$;
