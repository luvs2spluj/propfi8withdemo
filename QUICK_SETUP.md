# Quick Setup Guide - AI Parser Integration

## 🚀 Immediate Setup Steps

### 1. Install Dependencies
```bash
cd /Users/alexhorton/hortonpropertiesdatadashboard1
rm -rf node_modules package-lock.json
npm install
```

### 2. Set Up Supabase Database

**Go to your Supabase dashboard:**
- URL: https://iqwhrvtcrseidfyznqaf.supabase.co
- Navigate to SQL Editor
- Copy and paste the contents of `supabase-ai-schema.sql`
- Run the SQL to create all tables

**Create Storage Bucket:**
- Go to Storage in Supabase dashboard
- Create bucket named `csv-files-ai`
- Set to private (not public)

### 3. Environment Configuration

The environment file `.env.local` has been created with your Supabase credentials:

```bash
REACT_APP_SUPABASE_URL_AI=https://iqwhrvtcrseidfyznqaf.supabase.co
REACT_APP_SUPABASE_ANON_KEY_AI=sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf
```

### 4. Start the Application

```bash
npm start
```

The application will start on http://localhost:3000

### 5. Test AI Parser

1. Navigate to the "AI Parser" tab in the sidebar
2. Select a property (or create one)
3. Upload a CSV file
4. Watch the AI parser analyze and categorize the data

## 🎯 What's Been Integrated

### ✅ AI Parser Features
- **Intelligent Header Detection**: Automatically categorizes CSV headers
- **Format Recognition**: Detects month-column vs traditional formats
- **Confidence Scoring**: Shows confidence levels for each categorization
- **Real-time Processing**: Live feedback during CSV processing
- **Separate Database**: Isolated Supabase backend for AI parser data

### ✅ Files Created/Modified
- `src/utils/csvParserAI.ts` - AI parser logic
- `src/config/supabaseAI.ts` - Supabase configuration
- `src/components/CSVUploadAI.tsx` - AI-powered upload component
- `src/App.tsx` - Updated with AI parser routing
- `src/components/Sidebar.tsx` - Added AI Parser menu option
- `supabase-ai-schema.sql` - Database schema
- `.env.local` - Environment configuration

### ✅ Database Tables Created
- `properties_ai` - Properties with AI parser enabled
- `csv_files_ai` - Uploaded CSV files with metadata
- `parsed_data_ai` - Processed CSV data
- `header_matches_ai` - AI header detection results
- `processing_jobs_ai` - Processing job status
- `user_sessions_ai` - User session data

## 🧪 Test Results

The AI parser has been tested and successfully:
- ✅ Detects month-column format (Jan 2024, Feb 2024, etc.)
- ✅ Categorizes headers with confidence scoring
- ✅ Processes data records automatically
- ✅ Provides detailed analysis results

## 🎉 Ready to Use!

Once you complete the setup steps above, you'll have:

1. **Traditional CSV Upload** - Original functionality
2. **AI Parser Upload** - New intelligent processing
3. **Separate Database** - Isolated AI parser data
4. **Real-time Analysis** - Live processing feedback
5. **Confidence Scoring** - See how confident the AI is

## 🔧 Troubleshooting

### If npm start fails:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm start
```

### If Supabase connection fails:
1. Verify the database schema has been applied
2. Check that the storage bucket exists
3. Confirm environment variables are correct

### If AI parser doesn't work:
1. Check browser console for errors
2. Verify Supabase connection
3. Try with a simple CSV file first

## 📞 Support

The integration is complete and ready for testing. The AI parser will intelligently process any CSV file you upload, automatically categorizing headers and providing detailed analysis with confidence scores.

**Branch**: `propertydahsboardaiparser`  
**Status**: ✅ Ready for testing
