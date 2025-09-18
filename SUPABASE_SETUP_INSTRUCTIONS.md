# 🚀 Supabase Setup Instructions

## ❌ Current Issue
The application is trying to connect to `your-ai-project.supabase.co` instead of your actual Supabase project.

## ✅ Solution Applied
I've added the correct Supabase credentials to your `.env` file:

```bash
# AI Parser Supabase Configuration
REACT_APP_SUPABASE_URL_AI=https://iqwhrvtcrseidfyznqaf.supabase.co
REACT_APP_SUPABASE_ANON_KEY_AI=sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf
```

## 🎯 Next Steps Required

### 1. Set Up Database Tables
You need to run the SQL schema in your Supabase dashboard:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `iqwhrvtcrseidfyznqaf`
3. **Go to SQL Editor**
4. **Copy the contents** of `ai-parser-schema.sql`
5. **Paste and Run** the SQL to create all tables

### 2. Restart Development Server
The server needs to be restarted to pick up the new environment variables:

```bash
# Stop current server (if running)
pkill -f "react-scripts start"

# Start server with new environment variables
cd /Users/alexhorton/hortonpropertiesdatadashboard1
PORT=3001 npm start
```

### 3. Test Property Management
Once the database is set up and server restarted:

1. Navigate to **"Property Management"** tab
2. Click **"Add Property"**
3. Fill in property details
4. Save the property

## 📋 Database Tables Created
- `properties_ai` - Properties for AI parser
- `csv_files_ai` - CSV file metadata
- `parsed_data_ai` - Parsed CSV data
- `header_matches_ai` - AI header matching results
- `processing_jobs_ai` - Processing job status
- `user_sessions_ai` - User session data

## 🔧 Environment Variables
Your `.env` file now contains:
- ✅ Main Supabase credentials
- ✅ AI Parser Supabase credentials
- ✅ Database connection string
- ✅ Project reference

## 🚨 Important Notes
- The AI parser uses **separate tables** from your main project
- All tables have `_ai` suffix to avoid conflicts
- Row Level Security is enabled for all tables
- Storage bucket `csv-files-ai` is created for file uploads

## 🎉 After Setup
Once the database is set up, you'll be able to:
- ✅ Add/edit/delete properties
- ✅ Upload CSV files with AI parsing
- ✅ View parsed data and analysis
- ✅ Manage CSV files through the interface

The Property Management system will be fully functional!
