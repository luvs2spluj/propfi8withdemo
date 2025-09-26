-- User Authentication and Data Isolation Schema
-- This schema ensures each user only sees their own data

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    clerk_organization_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table to store Clerk user data
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create properties table with organization association
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    property_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create csv_uploads table with organization association
CREATE TABLE IF NOT EXISTS public.csv_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    file_type TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_size INTEGER,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create csv_data table with organization association
CREATE TABLE IF NOT EXISTS public.csv_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
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

-- Create organization_bucket_terms table for AI bucket management
CREATE TABLE IF NOT EXISTS public.organization_bucket_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    bucket_key TEXT NOT NULL,
    term TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, bucket_key, term)
);

-- Create organization_custom_buckets table
CREATE TABLE IF NOT EXISTS public.organization_custom_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    bucket_key TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    bucket_description TEXT,
    bucket_category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, bucket_key)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_bucket_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_custom_buckets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizations table
CREATE POLICY "Users can view their organization" ON public.organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Admins can insert organizations" ON public.organizations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update their organization" ON public.organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'admin'
        )
    );

-- Create RLS policies for users table
CREATE POLICY "Users can view organization members" ON public.users
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Admins can manage organization members" ON public.users
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'admin'
        )
    );

-- Create RLS policies for properties table
CREATE POLICY "Users can view organization properties" ON public.properties
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Members can insert properties" ON public.properties
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Members can update properties" ON public.properties
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Admins can delete properties" ON public.properties
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role = 'admin'
        )
    );

-- Create RLS policies for csv_uploads table
CREATE POLICY "Users can view organization csv uploads" ON public.csv_uploads
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Members can insert csv uploads" ON public.csv_uploads
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Members can update csv uploads" ON public.csv_uploads
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Admins can delete csv uploads" ON public.csv_uploads
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role = 'admin'
        )
    );

-- Create RLS policies for csv_data table
CREATE POLICY "Users can view organization csv data" ON public.csv_data
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Members can insert csv data" ON public.csv_data
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Members can update csv data" ON public.csv_data
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Admins can delete csv data" ON public.csv_data
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role = 'admin'
        )
    );

-- Create RLS policies for organization_bucket_terms table
CREATE POLICY "Users can view organization bucket terms" ON public.organization_bucket_terms
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Members can insert bucket terms" ON public.organization_bucket_terms
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Members can update bucket terms" ON public.organization_bucket_terms
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Admins can delete bucket terms" ON public.organization_bucket_terms
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role = 'admin'
        )
    );

-- Create RLS policies for organization_custom_buckets table
CREATE POLICY "Users can view organization custom buckets" ON public.organization_custom_buckets
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Members can insert custom buckets" ON public.organization_custom_buckets
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Members can update custom buckets" ON public.organization_custom_buckets
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role IN ('admin', 'member')
        )
    );

CREATE POLICY "Admins can delete custom buckets" ON public.organization_custom_buckets
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
            AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_organization_id ON public.csv_uploads(organization_id);
CREATE INDEX IF NOT EXISTS idx_csv_data_organization_id ON public.csv_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_csv_data_csv_upload_id ON public.csv_data(csv_upload_id);
CREATE INDEX IF NOT EXISTS idx_organization_bucket_terms_organization_id ON public.organization_bucket_terms(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_custom_buckets_organization_id ON public.organization_custom_buckets(organization_id);

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

-- Create function to get current organization ID
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id FROM public.users 
        WHERE clerk_user_id = auth.jwt() ->> 'sub'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to ensure user exists
CREATE OR REPLACE FUNCTION ensure_user_exists(clerk_user_id TEXT, user_email TEXT, user_first_name TEXT, user_last_name TEXT, organization_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
    org_id UUID;
BEGIN
    -- Try to get existing user
    SELECT id INTO user_id FROM public.users WHERE public.users.clerk_user_id = ensure_user_exists.clerk_user_id;
    
    -- If user doesn't exist, create them
    IF user_id IS NULL THEN
        -- Create organization if name provided
        IF organization_name IS NOT NULL THEN
            INSERT INTO public.organizations (name)
            VALUES (organization_name)
            RETURNING id INTO org_id;
        END IF;
        
        INSERT INTO public.users (clerk_user_id, email, first_name, last_name, organization_id, role)
        VALUES (clerk_user_id, user_email, user_first_name, user_last_name, org_id, 'admin')
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
