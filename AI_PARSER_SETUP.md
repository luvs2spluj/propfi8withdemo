# AI Parser Integration Setup Instructions

## 1. Supabase Setup

### Create New Supabase Project for AI Parser
1. Go to https://supabase.com/dashboard
2. Create a new project called "horton-properties-ai-parser"
3. Note down your project URL and anon key

### Run Database Schema
1. Copy the SQL from ai-parser-schema.sql
2. Go to your Supabase project SQL Editor
3. Paste and run the schema to create all necessary tables

### Storage Setup
1. Go to Storage in your Supabase dashboard
2. Create a bucket named "csv-files-ai"
3. Set it to private (not public)

## 2. Environment Configuration

### Copy Environment Template
```bash
cp .env.ai-parser.template .env.local
```

### Update Environment Variables
Edit .env.local and update:
- REACT_APP_SUPABASE_URL_AI: Your AI parser Supabase project URL
- REACT_APP_SUPABASE_ANON_KEY_AI: Your AI parser Supabase anon key

## 3. Install Dependencies

The AI parser integration uses existing dependencies, but you may need to install additional packages:

```bash
npm install
```

## 4. Test the Integration

1. Start the development server:
   ```bash
   npm start
   ```

2. Navigate to the "AI Parser" tab in the sidebar
3. Upload a CSV file to test the AI-powered parsing

## 5. Features

### AI Parser Features:
- ✅ Intelligent header detection and categorization
- ✅ Automatic format recognition (month-column vs traditional)
- ✅ Confidence scoring for each header match
- ✅ Anomaly detection
- ✅ Category analysis (income, expenses, utilities, etc.)
- ✅ Separate Supabase backend for isolation
- ✅ Real-time processing feedback

### Supported CSV Formats:
- Traditional format with standard headers
- Month-column format (Jan 2024, Feb 2024, etc.)
- Any CSV with property data

## 6. Troubleshooting

### Common Issues:

1. **Supabase Connection Error**
   - Verify your environment variables are correct
   - Check that your Supabase project is active
   - Ensure the database schema has been applied

2. **File Upload Issues**
   - Check file size limits (default: 50MB)
   - Ensure CSV format is valid
   - Verify storage bucket permissions

3. **AI Parsing Errors**
   - Check browser console for detailed error messages
   - Verify CSV has valid headers
   - Try with a simpler CSV file first

### Debug Mode:
Set REACT_APP_DEBUG_AI_PARSER=true in .env.local for detailed logging

## 7. Production Deployment

When deploying to production:
1. Update environment variables with production Supabase credentials
2. Ensure storage bucket is properly configured
3. Test with production data
4. Monitor AI confidence scores and adjust thresholds if needed

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review the AI analysis results for confidence scores
3. Test with sample CSV files first
4. Verify Supabase configuration and permissions
