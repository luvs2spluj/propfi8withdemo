-- Team Members Table Schema
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_organization_id ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view team members in their organization
CREATE POLICY "Users can view team members in their organization" ON team_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert team members in their organization (if they have permission)
CREATE POLICY "Users can insert team members in their organization" ON team_members
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Users can update team members in their organization (if they have permission)
CREATE POLICY "Users can update team members in their organization" ON team_members
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Users can delete team members in their organization (if they have permission)
CREATE POLICY "Users can delete team members in their organization" ON team_members
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Team Member Invitations Table
CREATE TABLE IF NOT EXISTS team_member_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for invitations
CREATE INDEX IF NOT EXISTS idx_team_member_invitations_organization_id ON team_member_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_member_invitations_email ON team_member_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_member_invitations_token ON team_member_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_team_member_invitations_status ON team_member_invitations(status);

-- Enable RLS for invitations
ALTER TABLE team_member_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
CREATE POLICY "Users can view invitations in their organization" ON team_member_invitations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create invitations in their organization" ON team_member_invitations
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Users can update invitations in their organization" ON team_member_invitations
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Users can delete invitations in their organization" ON team_member_invitations
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    template_type VARCHAR(100) NOT NULL,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for email templates
CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id ON email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- Enable RLS for email templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email templates
CREATE POLICY "Users can view email templates in their organization" ON email_templates
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage email templates in their organization" ON email_templates
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    template_id UUID REFERENCES email_templates(id),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    gmail_message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_organization_id ON email_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Enable RLS for email logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email logs
CREATE POLICY "Users can view email logs in their organization" ON email_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_member_invitations_updated_at BEFORE UPDATE ON team_member_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
