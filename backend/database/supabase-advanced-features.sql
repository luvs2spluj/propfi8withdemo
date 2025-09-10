-- Advanced Supabase Features for Horton Properties Data Dashboard
-- This script implements intelligent data processing, deduplication, and classification

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS http;             -- for API calls
CREATE EXTENSION IF NOT EXISTS pg_cron;         -- for scheduled jobs

-- Create enhanced staging table for raw CSV data
CREATE TABLE IF NOT EXISTS stg.property_data_raw (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    upload_id UUID NOT NULL REFERENCES csv_uploads(id) ON DELETE CASCADE,
    
    -- Raw data from CSV
    raw_data JSONB NOT NULL,
    feature_text TEXT GENERATED ALWAYS AS (
        lower(coalesce(raw_data->>'vendor_raw','') || ' ' || 
              coalesce(raw_data->>'account_raw','') || ' ' || 
              coalesce(raw_data->>'memo','') || ' ' ||
              coalesce(raw_data->>'description',''))
    ) STORED,
    
    -- AI classification fields
    emb vector(1536),                    -- OpenAI embedding
    suggested_account TEXT,              -- AI-suggested account classification
    confidence_score NUMERIC(3,2),       -- Confidence in classification (0-1)
    
    -- Processing status
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processed, failed
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create canonical account labels table for AI classification
CREATE TABLE IF NOT EXISTS core.account_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(50) UNIQUE NOT NULL,
    label_text TEXT NOT NULL,
    description TEXT,
    emb vector(1536),                    -- Embedding for this account type
    category VARCHAR(50),                -- RENT, UTIL, REPAIRS, INSURANCE, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert canonical account labels for 26-unit building
INSERT INTO core.account_labels (account_code, label_text, description, category) VALUES
('RENT_INCOME', 'Rental Income', 'Monthly rental income from tenants', 'INCOME'),
('UTILITIES', 'Utilities', 'Electric, gas, water, sewer utilities', 'EXPENSE'),
('MAINTENANCE', 'Maintenance', 'Repairs, maintenance, and upkeep', 'EXPENSE'),
('INSURANCE', 'Insurance', 'Property and liability insurance', 'EXPENSE'),
('PROPERTY_TAX', 'Property Tax', 'Annual property taxes', 'EXPENSE'),
('MANAGEMENT', 'Management', 'Property management fees', 'EXPENSE'),
('ADVERTISING', 'Advertising', 'Marketing and advertising costs', 'EXPENSE'),
('LEGAL', 'Legal', 'Legal fees and expenses', 'EXPENSE'),
('OFFICE', 'Office', 'Office supplies and expenses', 'EXPENSE'),
('OTHER', 'Other Expenses', 'Miscellaneous expenses', 'EXPENSE')
ON CONFLICT (account_code) DO NOTHING;

-- Create data quality rules table
CREATE TABLE IF NOT EXISTS core.data_quality_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,      -- validation, transformation, classification
    rule_config JSONB NOT NULL,          -- Rule configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert data quality rules for 26-unit building
INSERT INTO core.data_quality_rules (rule_name, rule_type, rule_config) VALUES
('revenue_range_check', 'validation', '{"min": 1000, "max": 100000, "field": "monthly_revenue"}'),
('occupancy_rate_check', 'validation', '{"min": 0, "max": 100, "field": "occupancy_rate"}'),
('units_range_check', 'validation', '{"min": 1, "max": 100, "field": "total_units"}'),
('expense_percentage_check', 'validation', '{"max_percentage": 80, "field": "expenses", "relative_to": "monthly_revenue"}'),
('date_format_check', 'validation', '{"format": "YYYY-MM-DD", "field": "date"}'),
('deduplication_rule', 'transformation', '{"key_fields": ["property_id", "date"], "strategy": "keep_latest"}'),
('expense_breakdown_rule', 'transformation', '{"maintenance": 0.35, "utilities": 0.25, "insurance": 0.15, "property_tax": 0.15, "other": 0.10}')
ON CONFLICT (rule_name) DO NOTHING;

-- Create function to validate data against quality rules
CREATE OR REPLACE FUNCTION core.validate_data_quality(
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
        SELECT rule_name, rule_config 
        FROM core.data_quality_rules 
        WHERE rule_type = 'validation' AND is_active = true
    LOOP
        -- Revenue range check
        IF rule_record.rule_name = 'revenue_range_check' THEN
            field_value := (p_data->>rule_record.rule_config->>'field')::NUMERIC;
            IF field_value < (rule_record.rule_config->>'min')::NUMERIC OR 
               field_value > (rule_record.rule_config->>'max')::NUMERIC THEN
                validation_errors := validation_errors || 
                    format('Revenue $%s outside valid range ($%s - $%s)', 
                           field_value, 
                           rule_record.rule_config->>'min', 
                           rule_record.rule_config->>'max');
                is_valid := false;
            END IF;
        END IF;
        
        -- Occupancy rate check
        IF rule_record.rule_name = 'occupancy_rate_check' THEN
            field_value := (p_data->>rule_record.rule_config->>'field')::NUMERIC;
            IF field_value < (rule_record.rule_config->>'min')::NUMERIC OR 
               field_value > (rule_record.rule_config->>'max')::NUMERIC THEN
                validation_errors := validation_errors || 
                    format('Occupancy rate %s%% outside valid range (%s%% - %s%%)', 
                           field_value, 
                           rule_record.rule_config->>'min', 
                           rule_record.rule_config->>'max');
                is_valid := false;
            END IF;
        END IF;
        
        -- Expense percentage check
        IF rule_record.rule_name = 'expense_percentage_check' THEN
            field_value := (p_data->>rule_record.rule_config->>'field')::NUMERIC;
            revenue_value := (p_data->>rule_record.rule_config->>'relative_to')::NUMERIC;
            IF field_value > (revenue_value * (rule_record.rule_config->>'max_percentage')::NUMERIC / 100) THEN
                validation_errors := validation_errors || 
                    format('Expenses $%s exceed %s%% of revenue $%s', 
                           field_value, 
                           rule_record.rule_config->>'max_percentage',
                           revenue_value);
                is_valid := false;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT is_valid, validation_errors;
END;
$$;

-- Create function to get embeddings (placeholder for OpenAI API)
CREATE OR REPLACE FUNCTION core.get_embedding(text_input TEXT)
RETURNS vector(1536) LANGUAGE plpgsql AS $$
DECLARE
    response jsonb;
    embedding_array float4[];
BEGIN
    -- Placeholder for OpenAI API call
    -- In production, replace with actual API call using http extension
    -- or Supabase Edge Function
    
    IF text_input IS NULL OR length(trim(text_input)) = 0 THEN
        RETURN NULL;
    END IF;
    
    -- For now, return a zero vector (replace with actual API call)
    -- Example API call:
    /*
    SELECT content->'data'->0->'embedding'
    INTO response
    FROM http((
        'POST',
        'https://api.openai.com/v1/embeddings',
        ARRAY[('Authorization','Bearer '||current_setting('app.openai_key', true))::http_header],
        'application/json',
        json_build_object('input', text_input, 'model', 'text-embedding-ada-002')::text
    ));
    
    embedding_array := ARRAY(SELECT jsonb_array_elements_text(response)::float4);
    RETURN embedding_array::vector(1536);
    */
    
    -- Placeholder: return zero vector
    RETURN array_fill(0.0, ARRAY[1536])::vector(1536);
END;
$$;

-- Create function to classify accounts using embeddings
CREATE OR REPLACE FUNCTION core.classify_account(
    p_feature_text TEXT,
    p_threshold NUMERIC DEFAULT 0.7
) RETURNS TABLE(
    suggested_account TEXT,
    confidence_score NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
    text_embedding vector(1536);
    label_record RECORD;
    best_match TEXT;
    best_score NUMERIC := 0;
BEGIN
    -- Get embedding for input text
    text_embedding := core.get_embedding(p_feature_text);
    
    IF text_embedding IS NULL THEN
        RETURN QUERY SELECT 'OTHER'::TEXT, 0.0::NUMERIC;
        RETURN;
    END IF;
    
    -- Find best matching account label
    FOR label_record IN 
        SELECT account_code, label_text, emb
        FROM core.account_labels 
        WHERE is_active = true AND emb IS NOT NULL
    LOOP
        -- Calculate cosine similarity (1 - distance)
        IF (1 - (text_embedding <-> label_record.emb)) > best_score THEN
            best_score := 1 - (text_embedding <-> label_record.emb);
            best_match := label_record.account_code;
        END IF;
    END LOOP;
    
    -- Return result if above threshold
    IF best_score >= p_threshold THEN
        RETURN QUERY SELECT best_match, best_score;
    ELSE
        RETURN QUERY SELECT 'OTHER'::TEXT, best_score;
    END IF;
END;
$$;

-- Create function to process and clean CSV data
CREATE OR REPLACE FUNCTION core.process_csv_data(
    p_upload_id UUID
) RETURNS TABLE(
    processed_count INTEGER,
    error_count INTEGER,
    errors TEXT[]
) LANGUAGE plpgsql AS $$
DECLARE
    raw_record RECORD;
    processed_count INTEGER := 0;
    error_count INTEGER := 0;
    all_errors TEXT[] := '{}';
    validation_result RECORD;
    classification_result RECORD;
    property_data JSONB;
BEGIN
    -- Process each raw data record
    FOR raw_record IN 
        SELECT id, property_id, raw_data, feature_text
        FROM stg.property_data_raw 
        WHERE upload_id = p_upload_id AND processing_status = 'pending'
    LOOP
        BEGIN
            -- Validate data quality
            SELECT * INTO validation_result 
            FROM core.validate_data_quality(raw_record.raw_data, raw_record.property_id);
            
            IF NOT validation_result.is_valid THEN
                -- Update record with validation errors
                UPDATE stg.property_data_raw 
                SET processing_status = 'failed',
                    error_message = array_to_string(validation_result.errors, '; ')
                WHERE id = raw_record.id;
                
                error_count := error_count + 1;
                all_errors := all_errors || validation_result.errors;
                CONTINUE;
            END IF;
            
            -- Classify account if feature text exists
            IF raw_record.feature_text IS NOT NULL AND length(trim(raw_record.feature_text)) > 0 THEN
                SELECT * INTO classification_result 
                FROM core.classify_account(raw_record.feature_text);
                
                -- Update record with classification
                UPDATE stg.property_data_raw 
                SET suggested_account = classification_result.suggested_account,
                    confidence_score = classification_result.confidence_score,
                    processing_status = 'processed'
                WHERE id = raw_record.id;
            ELSE
                -- Mark as processed without classification
                UPDATE stg.property_data_raw 
                SET processing_status = 'processed'
                WHERE id = raw_record.id;
            END IF;
            
            processed_count := processed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Handle any processing errors
            UPDATE stg.property_data_raw 
            SET processing_status = 'failed',
                error_message = SQLERRM
            WHERE id = raw_record.id;
            
            error_count := error_count + 1;
            all_errors := all_errors || ARRAY[SQLERRM];
        END;
    END LOOP;
    
    RETURN QUERY SELECT processed_count, error_count, all_errors;
END;
$$;

-- Create scheduled job to process pending data (runs every 5 minutes)
SELECT cron.schedule(
    'process-csv-data',
    '*/5 * * * *', -- Every 5 minutes
    'SELECT core.process_csv_data(upload_id) FROM csv_uploads WHERE upload_status = ''completed'' AND processed_at IS NULL;'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stg_property_data_raw_upload_id ON stg.property_data_raw(upload_id);
CREATE INDEX IF NOT EXISTS idx_stg_property_data_raw_property_id ON stg.property_data_raw(property_id);
CREATE INDEX IF NOT EXISTS idx_stg_property_data_raw_processing_status ON stg.property_data_raw(processing_status);
CREATE INDEX IF NOT EXISTS idx_core_account_labels_active ON core.account_labels(is_active);
CREATE INDEX IF NOT EXISTS idx_core_data_quality_rules_active ON core.data_quality_rules(is_active);

-- Create view for processed data with classifications
CREATE OR REPLACE VIEW core.processed_property_data AS
SELECT 
    pd.id,
    pd.property_id,
    pd.date,
    pd.revenue,
    pd.occupancy_rate,
    pd.maintenance_cost,
    pd.utilities_cost,
    pd.insurance_cost,
    pd.property_tax,
    pd.other_expenses,
    pd.notes,
    pd.created_at,
    pd.updated_at,
    p.name as property_name,
    cu.filename as source_file,
    cu.uploaded_at as file_uploaded_at
FROM property_data pd
JOIN properties p ON pd.property_id = p.id
LEFT JOIN csv_uploads cu ON pd.notes = cu.filename
ORDER BY pd.date DESC, pd.created_at DESC;

-- Grant permissions
GRANT USAGE ON SCHEMA stg TO postgres;
GRANT USAGE ON SCHEMA core TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA stg TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA core TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA core TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA stg TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core TO postgres;
