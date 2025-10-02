-- Simple CSV Time Series Schema
-- This schema works with existing Supabase setup

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create csv_files table
CREATE TABLE IF NOT EXISTS csv_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    upload_status VARCHAR(20) DEFAULT 'uploaded' CHECK (upload_status IN ('uploaded', 'processing', 'completed', 'failed')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    total_records INTEGER DEFAULT 0,
    records_processed INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create csv_timeseries_data table
CREATE TABLE IF NOT EXISTS csv_timeseries_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    csv_file_id UUID REFERENCES csv_files(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    bucket_category VARCHAR(50) NOT NULL CHECK (bucket_category IN ('income_item', 'expense_item', 'income_total', 'expense_total', 'cash_amount')),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    ai_category VARCHAR(50),
    confidence_score DECIMAL(3,2),
    is_total_bucket BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create csv_bucket_aggregations table
CREATE TABLE IF NOT EXISTS csv_bucket_aggregations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    csv_file_id UUID REFERENCES csv_files(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    bucket_category VARCHAR(50) NOT NULL CHECK (bucket_category IN ('income_item', 'expense_item', 'income_total', 'expense_total', 'cash_amount')),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    unique_accounts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(csv_file_id, bucket_category, month, year)
);

-- Create csv_account_line_items table
CREATE TABLE IF NOT EXISTS csv_account_line_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    csv_file_id UUID REFERENCES csv_files(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    bucket_category VARCHAR(50) NOT NULL CHECK (bucket_category IN ('income_item', 'expense_item', 'income_total', 'expense_total', 'cash_amount')),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    ai_category VARCHAR(50),
    confidence_score DECIMAL(3,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_csv_files_organization_id ON csv_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_csv_files_uploaded_at ON csv_files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_csv_files_file_type ON csv_files(file_type);

CREATE INDEX IF NOT EXISTS idx_timeseries_csv_file_id ON csv_timeseries_data(csv_file_id);
CREATE INDEX IF NOT EXISTS idx_timeseries_organization_id ON csv_timeseries_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_timeseries_month_year ON csv_timeseries_data(year, month);
CREATE INDEX IF NOT EXISTS idx_timeseries_bucket_category ON csv_timeseries_data(bucket_category);
CREATE INDEX IF NOT EXISTS idx_timeseries_account_name ON csv_timeseries_data(account_name);

CREATE INDEX IF NOT EXISTS idx_aggregations_csv_file_id ON csv_bucket_aggregations(csv_file_id);
CREATE INDEX IF NOT EXISTS idx_aggregations_organization_id ON csv_bucket_aggregations(organization_id);
CREATE INDEX IF NOT EXISTS idx_aggregations_month_year ON csv_bucket_aggregations(year, month);
CREATE INDEX IF NOT EXISTS idx_aggregations_bucket_category ON csv_bucket_aggregations(bucket_category);

CREATE INDEX IF NOT EXISTS idx_line_items_csv_file_id ON csv_account_line_items(csv_file_id);
CREATE INDEX IF NOT EXISTS idx_line_items_organization_id ON csv_account_line_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_line_items_month_year ON csv_account_line_items(year, month);
CREATE INDEX IF NOT EXISTS idx_line_items_bucket_category ON csv_account_line_items(bucket_category);
CREATE INDEX IF NOT EXISTS idx_line_items_account_name ON csv_account_line_items(account_name);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_timeseries_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_bucket_aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_account_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT WITH CHECK (true);

-- RLS Policies for team_members
CREATE POLICY "Users can view team members in their organization" ON team_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert team members in their organization" ON team_members
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for csv_files
CREATE POLICY "Users can view CSV files in their organization" ON csv_files
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert CSV files in their organization" ON csv_files
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update CSV files in their organization" ON csv_files
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete CSV files in their organization" ON csv_files
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for csv_timeseries_data
CREATE POLICY "Users can view timeseries data in their organization" ON csv_timeseries_data
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert timeseries data in their organization" ON csv_timeseries_data
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update timeseries data in their organization" ON csv_timeseries_data
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete timeseries data in their organization" ON csv_timeseries_data
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for csv_bucket_aggregations
CREATE POLICY "Users can view bucket aggregations in their organization" ON csv_bucket_aggregations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert bucket aggregations in their organization" ON csv_bucket_aggregations
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update bucket aggregations in their organization" ON csv_bucket_aggregations
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete bucket aggregations in their organization" ON csv_bucket_aggregations
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for csv_account_line_items
CREATE POLICY "Users can view account line items in their organization" ON csv_account_line_items
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert account line items in their organization" ON csv_account_line_items
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update account line items in their organization" ON csv_account_line_items
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete account line items in their organization" ON csv_account_line_items
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );
