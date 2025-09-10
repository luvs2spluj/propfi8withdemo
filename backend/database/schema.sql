-- Horton Properties Database Schema
-- This script creates the database and all necessary tables

-- Create database
CREATE DATABASE IF NOT EXISTS horton_properties;
USE horton_properties;

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    total_units INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_property_name (name)
);

-- Property data table for storing CSV data
CREATE TABLE IF NOT EXISTS property_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    property_id INT NOT NULL,
    data_date DATE NOT NULL,
    monthly_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    occupancy_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    occupied_units INT NOT NULL DEFAULT 0,
    expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_income DECIMAL(12,2) NOT NULL DEFAULT 0,
    csv_file_name VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_property_date (property_id, data_date),
    INDEX idx_property_date (property_id, data_date),
    INDEX idx_data_date (data_date)
);

-- CSV uploads tracking table
CREATE TABLE IF NOT EXISTS csv_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    property_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    records_processed INT NOT NULL DEFAULT 0,
    records_skipped INT NOT NULL DEFAULT 0,
    upload_status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    error_message TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_property_upload (property_id, uploaded_at)
);

-- Insert default properties
INSERT INTO properties (name, address, type, total_units) VALUES
('Downtown Plaza', '123 Main St, Downtown', 'Apartment Complex', 24),
('Garden Apartments', '456 Oak Ave, Garden District', 'Apartment Complex', 18),
('Riverside Complex', '789 River Rd, Riverside', 'Townhouse Complex', 12),
('Oakwood Manor', '321 Pine St, Oakwood', 'Single Family', 8),
('Sunset Heights', '654 Sunset Blvd, Heights', 'Apartment Complex', 30),
('Pine Valley', '987 Valley Rd, Pine Valley', 'Condo Complex', 16)
ON DUPLICATE KEY UPDATE 
    address = VALUES(address),
    type = VALUES(type),
    total_units = VALUES(total_units),
    updated_at = CURRENT_TIMESTAMP;
