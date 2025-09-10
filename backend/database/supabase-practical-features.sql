-- Practical Supabase Features for Horton Properties
-- Focused on immediate CSV processing improvements

-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create enhanced data processing table
CREATE TABLE IF NOT EXISTS data_processing_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID NOT NULL REFERENCES csv_uploads(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Processing details
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    duplicate_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    
    -- Data quality metrics
    revenue_range_valid BOOLEAN DEFAULT true,
    occupancy_range_valid BOOLEAN DEFAULT true,
    expense_ratio_valid BOOLEAN DEFAULT true,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create data validation rules table
CREATE TABLE IF NOT EXISTS validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- range_check, format_check, business_rule
    field_name VARCHAR(100) NOT NULL,
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert validation rules for 26-unit building
INSERT INTO validation_rules (rule_name, rule_type, field_name, rule_config) VALUES
('revenue_range', 'range_check', 'revenue', '{"min": 1000, "max": 100000, "message": "Revenue must be between $1,000 and $100,000 for a 26-unit building"}'),
('occupancy_rate_range', 'range_check', 'occupancy_rate', '{"min": 0, "max": 100, "message": "Occupancy rate must be between 0% and 100%"}'),
('units_range', 'range_check', 'total_units', '{"min": 1, "max": 100, "message": "Total units must be between 1 and 100"}'),
('expense_ratio', 'business_rule', 'expenses', '{"max_ratio": 0.8, "relative_to": "revenue", "message": "Expenses cannot exceed 80% of revenue"}'),
('date_format', 'format_check', 'date', '{"format": "YYYY-MM-DD", "message": "Date must be in YYYY-MM-DD format"}')
ON CONFLICT (rule_name) DO NOTHING;

-- Create function to validate single data row
CREATE OR REPLACE FUNCTION validate_data_row(
    p_data JSONB,
    p_property_id UUID
) RETURNS TABLE(
    is_valid BOOLEAN,
    errors TEXT[]
) LANGUAGE plpgsql AS $$
DECLARE
    rule_record RECORD;
    validation_errors TEXT[] := '{}';
    field_value NUMERIC;
    revenue_value NUMERIC;
    is_valid BOOLEAN := true;
BEGIN
    -- Get all active validation rules
    FOR rule_record IN 
        SELECT rule_name, rule_type, field_name, rule_config 
        FROM validation_rules 
        WHERE is_active = true
    LOOP
        -- Range checks
        IF rule_record.rule_type = 'range_check' THEN
            field_value := (p_data->>rule_record.field_name)::NUMERIC;
            IF field_value IS NOT NULL THEN
                IF field_value < (rule_record.rule_config->>'min')::NUMERIC OR 
                   field_value > (rule_record.rule_config->>'max')::NUMERIC THEN
                    validation_errors := validation_errors || 
                        (rule_record.rule_config->>'message');
                    is_valid := false;
                END IF;
            END IF;
        END IF;
        
        -- Business rule checks
        IF rule_record.rule_type = 'business_rule' THEN
            field_value := (p_data->>rule_record.field_name)::NUMERIC;
            revenue_value := (p_data->>(rule_record.rule_config->>'relative_to'))::NUMERIC;
            IF field_value IS NOT NULL AND revenue_value IS NOT NULL THEN
                IF field_value > (revenue_value * (rule_record.rule_config->>'max_ratio')::NUMERIC) THEN
                    validation_errors := validation_errors || 
                        (rule_record.rule_config->>'message');
                    is_valid := false;
                END IF;
            END IF;
        END IF;
        
        -- Format checks
        IF rule_record.rule_type = 'format_check' THEN
            -- Basic date format validation
            IF rule_record.field_name = 'date' THEN
                IF NOT (p_data->>rule_record.field_name) ~ '^\d{4}-\d{2}-\d{2}$' THEN
                    validation_errors := validation_errors || 
                        (rule_record.rule_config->>'message');
                    is_valid := false;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT is_valid, validation_errors;
END;
$$;

-- Create function to process CSV with enhanced validation
CREATE OR REPLACE FUNCTION process_csv_with_validation(
    p_upload_id UUID,
    p_property_id UUID
) RETURNS TABLE(
    processed_count INTEGER,
    error_count INTEGER,
    duplicate_count INTEGER,
    validation_errors TEXT[]
) LANGUAGE plpgsql AS $$
DECLARE
    upload_record RECORD;
    data_record RECORD;
    validation_result RECORD;
    processed_count INTEGER := 0;
    error_count INTEGER := 0;
    duplicate_count INTEGER := 0;
    all_errors TEXT[] := '{}';
    data_json JSONB;
BEGIN
    -- Get upload details
    SELECT * INTO upload_record FROM csv_uploads WHERE id = p_upload_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Upload not found: %', p_upload_id;
    END IF;
    
    -- Create processing log entry
    INSERT INTO data_processing_log (upload_id, property_id, status)
    VALUES (p_upload_id, p_property_id, 'processing')
    RETURNING id INTO upload_record.id;
    
    -- Process each property_data record from this upload
    FOR data_record IN 
        SELECT * FROM property_data 
        WHERE notes = upload_record.filename
        ORDER BY created_at DESC
    LOOP
        -- Convert to JSONB for validation
        data_json := to_jsonb(data_record);
        
        -- Validate data
        SELECT * INTO validation_result 
        FROM validate_data_row(data_json, p_property_id);
        
        IF NOT validation_result.is_valid THEN
            error_count := error_count + 1;
            all_errors := all_errors || validation_result.errors;
            CONTINUE;
        END IF;
        
        -- Check for duplicates (same property + date)
        IF EXISTS (
            SELECT 1 FROM property_data 
            WHERE property_id = p_property_id 
            AND date = data_record.date 
            AND id != data_record.id
        ) THEN
            duplicate_count := duplicate_count + 1;
            CONTINUE;
        END IF;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    -- Update processing log
    UPDATE data_processing_log 
    SET 
        total_rows = processed_count + error_count + duplicate_count,
        valid_rows = processed_count,
        invalid_rows = error_count,
        duplicate_rows = duplicate_count,
        processed_rows = processed_count,
        status = 'completed',
        completed_at = NOW()
    WHERE id = upload_record.id;
    
    RETURN QUERY SELECT processed_count, error_count, duplicate_count, all_errors;
END;
$$;

-- Create function to clean and deduplicate data
CREATE OR REPLACE FUNCTION clean_property_data(
    p_property_id UUID
) RETURNS TABLE(
    cleaned_count INTEGER,
    duplicate_count INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
    data_record RECORD;
    cleaned_count INTEGER := 0;
    duplicate_count INTEGER := 0;
BEGIN
    -- Find and remove duplicates, keeping the most recent
    FOR data_record IN 
        SELECT date, COUNT(*) as count, MAX(created_at) as latest_created_at
        FROM property_data 
        WHERE property_id = p_property_id
        GROUP BY date
        HAVING COUNT(*) > 1
    LOOP
        -- Delete older duplicates
        DELETE FROM property_data 
        WHERE property_id = p_property_id 
        AND date = data_record.date 
        AND created_at < data_record.latest_created_at;
        
        duplicate_count := duplicate_count + (data_record.count - 1);
    END LOOP;
    
    -- Count remaining clean records
    SELECT COUNT(*) INTO cleaned_count 
    FROM property_data 
    WHERE property_id = p_property_id;
    
    RETURN QUERY SELECT cleaned_count, duplicate_count;
END;
$$;

-- Create scheduled job to clean data daily
SELECT cron.schedule(
    'daily-data-cleanup',
    '0 2 * * *', -- Daily at 2 AM
    'SELECT clean_property_data(id) FROM properties WHERE id IS NOT NULL;'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_processing_log_upload_id ON data_processing_log(upload_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_property_id ON data_processing_log(property_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_status ON data_processing_log(status);
CREATE INDEX IF NOT EXISTS idx_validation_rules_active ON validation_rules(is_active);

-- Create view for data quality dashboard
CREATE OR REPLACE VIEW data_quality_summary AS
SELECT 
    p.name as property_name,
    COUNT(pd.id) as total_records,
    COUNT(CASE WHEN pd.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_records,
    AVG(pd.revenue) as avg_revenue,
    AVG(pd.occupancy_rate) as avg_occupancy,
    MIN(pd.date) as earliest_date,
    MAX(pd.date) as latest_date,
    COUNT(DISTINCT pd.notes) as source_files,
    MAX(cu.uploaded_at) as last_upload
FROM properties p
LEFT JOIN property_data pd ON p.id = pd.property_id
LEFT JOIN csv_uploads cu ON pd.notes = cu.filename
GROUP BY p.id, p.name
ORDER BY p.name;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
