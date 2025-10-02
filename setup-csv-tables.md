# CSV Time Series Tables Setup

## Manual Setup Instructions

Since the automated schema application failed, please follow these steps to set up the CSV time series tables:

### 1. Go to Supabase Dashboard
- Navigate to: https://supabase.com/dashboard/project/iqwhrvtcrseidfyznqaf
- Go to the SQL Editor

### 2. Run the Schema SQL
Copy and paste the contents of `supabase-csv-timeseries-schema.sql` into the SQL Editor and execute it.

### 3. Verify Tables Created
After running the schema, you should see these new tables:
- `csv_files` - Main CSV file records
- `csv_timeseries_data` - Time series data organized by month/year
- `csv_bucket_aggregations` - Aggregated bucket data for faster queries
- `csv_account_line_items` - Detailed line item breakdown

### 4. Test the Setup
Once the tables are created, the CSV upload functionality will automatically use the new time series storage system.

## Features Enabled

After setup, you'll have:
- ✅ Monthly time series organization (7/2024 format)
- ✅ 5-category bucket system (income_item, expense_item, income_total, expense_total, cash_amount)
- ✅ Line item breakdown with AI categorization
- ✅ Bucket aggregation for fast queries
- ✅ Time series visualization with expandable months
- ✅ Bucket breakdown charts
- ✅ No user preference memory (fresh AI recommendations each time)

## Next Steps

1. Apply the schema manually
2. Test CSV upload functionality
3. View time series data in the CSV File Manager
4. Explore bucket breakdowns and line item details
