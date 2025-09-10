# Supabase ETL Pipeline Setup Guide

## 🚀 Quick Start

### 1. Environment Setup

Add these environment variables to your `.env.local` file:

```env
# Supabase Database Connection (for ETL pipeline)
SUPABASE_DB_URL=postgresql://postgres:your_password@db.iqwhrvtcrseidfyznqaf.supabase.co:5432/postgres

# Supabase API Configuration
REACT_APP_SUPABASE_URL=https://iqwhrvtcrseidfyznqaf.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf

# Backend API Configuration
REACT_APP_API_URL=http://localhost:5000/api
```

**Important**: Replace `your_password` with your actual Supabase database password from your dashboard.

### 2. Install Dependencies

```bash
npm install pg @types/pg
```

### 3. Initialize the ETL Pipeline

Visit this URL to set up the database:
```
http://localhost:3000/api/supabase-etl?op=setup
```

## 📊 ETL Pipeline Architecture

### Data Flow
```
CSV File → Raw Schema → Staging Schema → Core Schema → Mart Schema → Reports
```

### Schema Structure

#### Raw Schema (`raw`)
- **`transactions`** - Raw CSV data as uploaded
- Stores data exactly as received from CSV files
- No data cleaning or validation

#### Staging Schema (`stg`)
- **`transactions`** - Cleaned and validated data
- Date parsing and validation
- Basic data quality checks

#### Core Schema (`core`)
- **`property`** - Property dimension table
- **`account`** - Chart of accounts
- **`account_map`** - Maps raw account names to standardized accounts
- **`fact_gl`** - General ledger fact table

#### Mart Schema (`mart`)
- **`qa_*`** - Data quality views
- **`income_statement_*`** - Reporting views

## 🔧 API Endpoints

### GET Operations

#### Setup Database
```
GET /api/supabase-etl?op=setup
```
Initializes all schemas, tables, views, and procedures.

#### Refresh Staging
```
GET /api/supabase-etl?op=refresh
```
Processes raw data into staging tables.

#### Load Fact Table
```
GET /api/supabase-etl?op=load
```
Loads staging data into core fact tables.

#### Quality Checks
```
GET /api/supabase-etl?op=qa
```
Returns data quality metrics.

#### Generate Report
```
GET /api/supabase-etl?op=report
```
Returns income statement report data.

### POST Operations

#### Insert Raw Data
```
POST /api/supabase-etl?op=insertRaw
Content-Type: application/json

[
  {
    "source_file": "property_data.csv",
    "row_num": 1,
    "property_name": "Downtown Plaza",
    "unit": "101",
    "txn_date_raw": "2024-01-15",
    "amount_raw": "1500.00",
    "debit_credit": "Credit",
    "account_raw": "Rent",
    "category_raw": "Rental Income",
    "memo_raw": "Monthly rent payment",
    "vendor_raw": "John Doe",
    "currency_raw": "USD"
  }
]
```

## 📁 File Structure

```
api/
├── supabase-etl.js          # Main ETL API endpoint

src/
├── services/
│   └── csvETLService.ts     # ETL service integration
├── components/
│   └── CSVETLUpload.tsx     # ETL upload component
└── config/
    └── supabase.ts          # Supabase client config
```

## 🎯 Usage Examples

### 1. Process CSV File

```typescript
import CSVETLService from '../services/csvETLService';

// Parse and process CSV
const csvData = CSVETLService.parseCSVFile(csvText, 'property_data.csv');
const result = await CSVETLService.processCSV(csvData, 'property_data.csv');
```

### 2. Run Quality Checks

```typescript
const qaResult = await CSVETLService.runQualityChecks();
console.log('Quality issues:', qaResult.qa);
```

### 3. Generate Reports

```typescript
const report = await CSVETLService.getIncomeStatementReport();
console.log('Income statement:', report.rows);
```

## 🔍 Data Quality Checks

The ETL pipeline includes comprehensive quality checks:

### Unmapped Accounts
- Identifies account names that don't have mappings
- Helps maintain consistent account coding

### Bad Dates/Amounts
- Finds rows with missing or invalid dates
- Identifies rows with missing or zero amounts

### Orphan Properties
- Finds property names not in the property dimension
- Ensures all transactions are linked to valid properties

## 📈 Reporting Features

### Income Statement Rollup
- Monthly income and expense summaries by property
- Net income calculations
- Automatic grouping and aggregation

### Data Quality Dashboard
- Real-time quality metrics
- Visual indicators for data issues
- Actionable insights for data improvement

## 🚀 Integration with Existing Dashboard

### Option 1: Replace Current CSV Upload
- Replace `CSVUpload.tsx` with `CSVETLUpload.tsx`
- Update routing to use the new component

### Option 2: Add as New Feature
- Add ETL upload as a separate page
- Keep existing CSV upload for simple use cases

### Option 3: Hybrid Approach
- Use ETL for complex data processing
- Use simple upload for basic property data

## 🔐 Security Considerations

- Database connection uses SSL
- Row Level Security enabled on all tables
- Service role key only used in backend
- Anon key safe for frontend use

## 🛠️ Troubleshooting

### Common Issues

#### Connection Errors
- Verify `SUPABASE_DB_URL` is correct
- Check database password in Supabase dashboard
- Ensure SSL is enabled

#### Data Quality Issues
- Review account mappings in `core.account_map`
- Add missing properties to `core.property`
- Check date formats in CSV files

#### Performance Issues
- Use batch processing for large files
- Monitor connection pool settings
- Consider indexing for large datasets

## 📞 Support

For issues or questions:
1. Check the ETL pipeline status: `GET /api/supabase-etl`
2. Review data quality: `GET /api/supabase-etl?op=qa`
3. Check Supabase dashboard for database issues
4. Review console logs for detailed error messages

Your ETL pipeline is now ready for production use! 🎉
