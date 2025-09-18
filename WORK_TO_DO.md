# Work To Do - Property Dashboard with AI Parser

## Current Status
- ✅ Fixed duplicate CSV detection and cleanup
- ✅ Fixed dashboard revenue calculation (was showing $606k instead of $400k)
- ✅ Added proper CSV deletion with confirmation prompts
- ✅ Fixed TypeScript compilation errors
- ✅ Enhanced debugging and logging for CSV data processing

## Priority Tasks

### 1. CSV Upload and Population Issues
- [ ] **Verify CSV upload is populating properly**
  - Check if CSV data is correctly parsed and stored
  - Ensure all account line items are detected and categorized
  - Verify time-series data (monthly columns) are properly mapped
  - Test with different CSV file formats and structures

- [ ] **Ensure no duplicate data assignment**
  - Implement robust duplicate detection beyond filename matching
  - Check for duplicate data within the same CSV (same account + period)
  - Add validation to prevent double-counting of financial data
  - Create data integrity checks for uploaded CSVs

### 2. File Type Logic Implementation
- [ ] **Balance Sheet Logic**
  - Create specific parsing rules for balance sheet CSVs
  - Implement asset, liability, and equity categorization
  - Add balance sheet-specific field mapping suggestions
  - Create balance sheet dashboard views and metrics

- [ ] **Rent Roll Logic**
  - Implement tenant-specific data parsing
  - Create unit occupancy tracking
  - Add rent amount and lease term handling
  - Build rent roll-specific analytics and reporting

### 3. Data Population and Integration
- [ ] **Ensure data is populating properly across all components**
  - Fix dashboard metrics calculation
  - Verify charts are showing correct data
  - Ensure financial page displays accurate information
  - Check analytics page data integration
  - Test CSV Management page bucket totals

### 4. CSV Viewing and Editing Features
- [ ] **Make CSVs viewable and editable like AI parser version**
  - Implement CSV preview functionality
  - Add inline editing for account categorizations
  - Create bulk edit capabilities for multiple accounts
  - Add CSV comparison and versioning features
  - Implement CSV export functionality

## Technical Improvements Needed

### Data Processing
- [ ] Improve CSV parsing accuracy for different file formats
- [ ] Add data validation and error handling
- [ ] Implement data normalization and cleaning
- [ ] Create data quality metrics and reporting

### User Interface
- [ ] Enhance CSV upload flow with better progress indicators
- [ ] Improve CSV Management interface with better filtering and search
- [ ] Add data visualization for CSV contents
- [ ] Create intuitive editing interfaces for data correction

### Performance
- [ ] Optimize CSV processing for large files
- [ ] Implement efficient data storage and retrieval
- [ ] Add caching for frequently accessed data
- [ ] Optimize dashboard loading times

## Testing Requirements
- [ ] Test with various CSV formats and structures
- [ ] Verify data accuracy across all dashboard components
- [ ] Test duplicate detection and cleanup functionality
- [ ] Validate file type-specific parsing logic
- [ ] Test CSV editing and management features

## Notes
- Current branch: `fix-duplicate-data-and-revenue-calculation`
- Last updated: $(date)
- Main issues resolved: Duplicate data detection, revenue calculation fixes, TypeScript compilation errors
- Next priority: Verify CSV upload functionality and implement file type-specific logic
