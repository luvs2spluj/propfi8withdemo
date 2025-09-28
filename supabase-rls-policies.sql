-- Supabase Row Level Security (RLS) Policies
-- Ensures users can only access their own data

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bucket_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_buckets ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = clerk_user_id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = clerk_user_id);

-- Organizations table policies
CREATE POLICY "Users can view own organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create organization" ON organizations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own organization" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

-- Properties table policies
CREATE POLICY "Users can view own properties" ON properties
    FOR SELECT USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create own properties" ON properties
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own properties" ON properties
    FOR UPDATE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own properties" ON properties
    FOR DELETE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

-- CSV data table policies
CREATE POLICY "Users can view own CSV data" ON csv_data
    FOR SELECT USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create own CSV data" ON csv_data
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own CSV data" ON csv_data
    FOR UPDATE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own CSV data" ON csv_data
    FOR DELETE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

-- CSV uploads table policies
CREATE POLICY "Users can view own CSV uploads" ON csv_uploads
    FOR SELECT USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create own CSV uploads" ON csv_uploads
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own CSV uploads" ON csv_uploads
    FOR UPDATE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own CSV uploads" ON csv_uploads
    FOR DELETE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

-- AI learning table policies
CREATE POLICY "Users can view own AI learning" ON ai_learning
    FOR SELECT USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create own AI learning" ON ai_learning
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own AI learning" ON ai_learning
    FOR UPDATE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own AI learning" ON ai_learning
    FOR DELETE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

-- User bucket terms table policies
CREATE POLICY "Users can view own bucket terms" ON user_bucket_terms
    FOR SELECT USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create own bucket terms" ON user_bucket_terms
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own bucket terms" ON user_bucket_terms
    FOR UPDATE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own bucket terms" ON user_bucket_terms
    FOR DELETE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

-- User custom buckets table policies
CREATE POLICY "Users can view own custom buckets" ON user_custom_buckets
    FOR SELECT USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create own custom buckets" ON user_custom_buckets
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own custom buckets" ON user_custom_buckets
    FOR UPDATE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own custom buckets" ON user_custom_buckets
    FOR DELETE USING (
        user_id IN (
            SELECT id 
            FROM users 
            WHERE clerk_user_id = auth.uid()::text
        )
    );

-- Create function to ensure user exists
CREATE OR REPLACE FUNCTION ensure_user_exists(
    clerk_user_id text,
    user_email text,
    user_first_name text,
    user_last_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id uuid;
BEGIN
    -- Check if user already exists
    SELECT id INTO user_id
    FROM users
    WHERE users.clerk_user_id = ensure_user_exists.clerk_user_id;
    
    -- If user doesn't exist, create them
    IF user_id IS NULL THEN
        INSERT INTO users (clerk_user_id, email, first_name, last_name)
        VALUES (ensure_user_exists.clerk_user_id, user_email, user_first_name, user_last_name)
        RETURNING id INTO user_id;
    END IF;
    
    RETURN user_id;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_exists TO anon, authenticated;
