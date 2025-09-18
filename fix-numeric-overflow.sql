-- Fix numeric field overflow issue
ALTER TABLE parsed_data_ai ALTER COLUMN amount TYPE DECIMAL(20,2);
ALTER TABLE header_matches_ai ALTER COLUMN confidence_score TYPE DECIMAL(5,2);
ALTER TABLE csv_files_ai ALTER COLUMN ai_confidence TYPE DECIMAL(5,2);
