-- User Authentication and Data Isolation Schema
-- This schema ensures each user only sees their own data

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table to store Clerk user data
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create properties table with user association
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    property_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create csv_uploads table with user association
CREATE TABLE IF NOT EXISTS public.csv_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_size INTEGER,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create csv_data table with user association
CREATE TABLE IF NOT EXISTS public.csv_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    csv_upload_id UUID REFERENCES public.csv_uploads(id) ON DELETE CASCADE,
    account_name TEXT,
    amount DECIMAL(15,2),
    category TEXT,
    subcategory TEXT,
    is_income BOOLEAN,
    is_expense BOOLEAN,
    is_total BOOLEAN,
    row_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_bucket_terms table for AI bucket management
CREATE TABLE IF NOT EXISTS public.user_bucket_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    bucket_key TEXT NOT NULL,
    term TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, bucket_key, term)
);

-- Create user_custom_buckets table
CREATE TABLE IF NOT EXISTS public.user_custom_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    bucket_key TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    bucket_description TEXT,
    bucket_category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, bucket_key)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bucket_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_buckets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Create RLS policies for properties table
CREATE POLICY "Users can view own properties" ON public.properties
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can insert own properties" ON public.properties
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can update own properties" ON public.properties
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can delete own properties" ON public.properties
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Create RLS policies for csv_uploads table
CREATE POLICY "Users can view own csv uploads" ON public.csv_uploads
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can insert own csv uploads" ON public.csv_uploads
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can update own csv uploads" ON public.csv_uploads
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can delete own csv uploads" ON public.csv_uploads
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Create RLS policies for csv_data table
CREATE POLICY "Users can view own csv data" ON public.csv_data
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can insert own csv data" ON public.csv_data
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can update own csv data" ON public.csv_data
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can delete own csv data" ON public.csv_data
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Create RLS policies for user_bucket_terms table
CREATE POLICY "Users can view own bucket terms" ON public.user_bucket_terms
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can insert own bucket terms" ON public.user_bucket_terms
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can update own bucket terms" ON public.user_bucket_terms
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can delete own bucket terms" ON public.user_bucket_terms
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Create RLS policies for user_custom_buckets table
CREATE POLICY "Users can view own custom buckets" ON public.user_custom_buckets
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can insert own custom buckets" ON public.user_custom_buckets
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can update own custom buckets" ON public.user_custom_buckets
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can delete own custom buckets" ON public.user_custom_buckets
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_user_id ON public.csv_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_data_user_id ON public.csv_data(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_data_csv_upload_id ON public.csv_data(csv_upload_id);
CREATE INDEX IF NOT EXISTS idx_user_bucket_terms_user_id ON public.user_bucket_terms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_buckets_user_id ON public.user_custom_buckets(user_id);

-- Create function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM public.users 
        WHERE clerk_user_id = auth.jwt() ->> 'sub'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to ensure user exists
CREATE OR REPLACE FUNCTION ensure_user_exists(clerk_user_id TEXT, user_email TEXT, user_first_name TEXT, user_last_name TEXT)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Try to get existing user
    SELECT id INTO user_id FROM public.users WHERE public.users.clerk_user_id = ensure_user_exists.clerk_user_id;
    
    -- If user doesn't exist, create them
    IF user_id IS NULL THEN
        INSERT INTO public.users (clerk_user_id, email, first_name, last_name)
        VALUES (clerk_user_id, user_email, user_first_name, user_last_name)
        RETURNING id INTO user_id;
    ELSE
        -- Update existing user info
        UPDATE public.users 
        SET email = user_email, first_name = user_first_name, last_name = user_last_name, updated_at = NOW()
        WHERE id = user_id;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
