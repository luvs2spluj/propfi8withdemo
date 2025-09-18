# Supabase Setup Instructions

## ✅ Current Status
- Supabase connection is **WORKING** ✅
- Environment variables are **CONFIGURED** ✅
- Frontend code is **READY** ✅
- Database table needs to be **CREATED** ⚠️

## 🔧 Manual Setup Required

Since the automated table creation didn't work, you need to manually create the `csv_data` table in Supabase.

### Step 1: Go to Supabase Dashboard
1. Open your browser and go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: `iqwhrvtcrseidfyznqaf`

### Step 2: Open SQL Editor
1. In the left sidebar, click on **"SQL Editor"**
2. Click **"New Query"**

### Step 3: Run This SQL
Copy and paste the following SQL into the editor and click **"Run"**:

```sql
-- CSV data table for storing uploaded CSV information
CREATE TABLE IF NOT EXISTS csv_data (
    id VARCHAR(255) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_records INTEGER DEFAULT 0,
    account_categories JSONB DEFAULT '{}',
    bucket_assignments JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    preview_data JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE csv_data ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON csv_data
    FOR ALL USING (auth.role() = 'authenticated');
```

### Step 4: Verify Setup
After running the SQL, you should see:
- ✅ Table created successfully
- ✅ RLS enabled
- ✅ Policy created

### Step 5: Test Connection
Run this command to test the connection:
```bash
node test-supabase-connection.js
```

You should see:
```
✅ Database connection successful!
📊 CSV data table accessible
```

## 🚀 After Setup
Once the table is created, your frontend will be able to:
- ✅ Save CSV data to Supabase
- ✅ Load CSV data from Supabase
- ✅ Delete CSV data from Supabase
- ✅ Fall back to localStorage if Supabase is unavailable

## 🔍 Environment Variables
Your `.env.local` file should contain:
```
REACT_APP_SUPABASE_URL=https://iqwhrvtcrseidfyznqaf.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf
REACT_APP_API_BASE=http://localhost:5001
```

## 🎯 Next Steps
1. Create the table in Supabase (follow steps above)
2. Test the connection: `node test-supabase-connection.js`
3. Start your development server: `npm run dev`
4. Upload a CSV file to test the integration

## 🆘 Troubleshooting
If you encounter issues:
1. Check that you're logged into the correct Supabase project
2. Verify the SQL ran without errors
3. Check the browser console for any error messages
4. Ensure your environment variables are correct