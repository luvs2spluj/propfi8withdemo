-- Fix the ensure_user_exists function to resolve column ambiguity
-- The error 'column reference "clerk_user_id" is ambiguous' occurs because
-- the parameter name matches the column name

-- Drop and recreate the function with fixed column references
DROP FUNCTION IF EXISTS ensure_user_exists(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION ensure_user_exists(
    param_clerk_user_id TEXT, 
    user_email TEXT, 
    user_first_name TEXT, 
    user_last_name TEXT, 
    organization_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
    org_id UUID;
BEGIN
    -- Try to get existing user using the parameter name (avoiding ambiguity)
    SELECT id INTO user_id 
    FROM public.users 
    WHERE clerk_user_id = param_clerk_user_id;
    
    -- If user doesn't exist, create them
    IF user_id IS NULL THEN
        -- Create organization if name provided
        IF organization_name IS NOT NULL THEN
            INSERT INTO public.organizations (name)
            VALUES (organization_name)
            RETURNING id INTO org_id;
        END IF;
        
        INSERT INTO public.users (
            clerk_user_id, 
            email, 
            first_name, 
            last_name, 
            organization_id, 
            role
        )
        VALUES (
            param_clerk_user_id, 
            user_email, 
            user_first_name, 
            user_last_name, 
            org_id, 
            'admin'
        )
        RETURNING id INTO user_id;
    ELSE
        -- Update existing user info
        UPDATE public.users 
        SET 
            email = user_email, 
            first_name = user_first_name, 
            last_name = user_last_name, 
            updated_at = NOW()
        WHERE id = user_id;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_user_exists(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- You'll also need to update your JavaScript call to match the new parameter names:
-- 
-- OLD JS call:
-- await supabase.rpc('ensure_user_exists', {
--   clerk_user_id: clerkUser.id,
--   user_email: clerkUser.emailAddresses[0].emailAddress,
--   user_first_name: clerkUser.firstName,
--   user_last_name: clerkUser.lastName
-- });
--
-- NEW JS call (parameter names are positional, but adding for clarity):
-- await supabase.rpc('ensure_user_exists', {
--   param_clerk_user_id: clerkUser.id,
--   user_email: clerkUser.emailAddresses[0].emailAddress,  
--   user_first_name: clerkUser.firstName,
--   user_last_name: clerkUser.lastName
-- });
--
-- OR better yet, use positional parameters since RPC doesn't care about JS object keys:
-- await supabase.rpc('ensure_user_exists', [
--   clerkUser.id,
--   clerkUser.emailAddresses[0].emailAddress,
--   clerkUser.firstName,
--   clerkUser.lastName
-- ]);

