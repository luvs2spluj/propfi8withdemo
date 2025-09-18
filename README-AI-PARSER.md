# Horton Properties Dashboard - AI Parser Branch

This branch integrates the CSV Parser AI functionality into the Horton Properties dashboard, providing intelligent CSV header detection and categorization for property data.

## 🌟 Features

### AI-Powered CSV Processing
- **Intelligent Header Detection**: Automatically categorizes CSV headers into predefined buckets (income, expenses, tenant info, etc.)
- **Format Recognition**: Detects month-column vs traditional CSV formats
- **Confidence Scoring**: Provides confidence levels for each header match
- **Anomaly Detection**: Identifies potential data issues
- **Category Analysis**: Automatically categorizes income, expenses, utilities, maintenance, insurance, etc.

### Separate Supabase Backend
- **Isolated Database**: Separate Supabase project for AI parser data
- **Dedicated Tables**: AI-specific tables with proper relationships
- **Storage Integration**: Secure file storage for uploaded CSV files
- **Real-time Processing**: Live updates during CSV processing

### Enhanced User Experience
- **Dual Upload Options**: Traditional CSV upload and AI-powered upload
- **Real-time Feedback**: Live processing status and confidence scores
- **Detailed Analysis**: Comprehensive AI analysis results
- **Error Handling**: Graceful error handling with helpful messages

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 16+ and npm
- Supabase account
- Git

### 2. Setup
```bash
# Clone and setup
git clone <repository-url>
cd hortonpropertiesdatadashboard1
git checkout propertydahsboardaiparser

# Run setup script
node setup-ai-parser.js

# Install dependencies
npm install
```

### 3. Supabase Configuration
1. Create a new Supabase project for AI parser
2. Run the SQL schema from `ai-parser-schema.sql`
3. Create storage bucket named `csv-files-ai`
4. Copy `.env.ai-parser.template` to `.env.local` and update credentials

### 4. Start Development
```bash
npm start
```

Navigate to the "AI Parser" tab in the sidebar to test the integration.

## 📁 Project Structure

```
src/
├── components/
│   ├── CSVUpload.tsx          # Original CSV upload component
│   ├── CSVUploadAI.tsx        # New AI-powered upload component
│   └── Sidebar.tsx            # Updated with AI parser option
├── config/
│   └── supabaseAI.ts          # AI parser Supabase configuration
├── utils/
│   └── csvParserAI.ts         # AI parser logic and algorithms
└── App.tsx                    # Updated with AI parser routing

ai-parser-schema.sql           # Database schema for AI parser
setup-ai-parser.js            # Setup script
AI_PARSER_SETUP.md            # Detailed setup instructions
```

## 🔧 Configuration

### Environment Variables
```bash
# AI Parser Supabase Configuration
REACT_APP_SUPABASE_URL_AI=https://your-ai-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY_AI=your-ai-anon-key

# AI Parser Settings
REACT_APP_AI_PARSER_ENABLED=true
REACT_APP_AI_CONFIDENCE_THRESHOLD=0.6
REACT_APP_AI_MAX_FILE_SIZE_MB=50
```

### Database Tables
- `properties_ai`: Properties with AI parser enabled
- `csv_files_ai`: Uploaded CSV files with AI processing metadata
- `parsed_data_ai`: Processed CSV data with AI categorization
- `header_matches_ai`: AI header detection results
- `processing_jobs_ai`: AI processing job status and results

## 🧠 AI Parser Algorithm

### Header Detection
The AI parser uses fuzzy matching to categorize CSV headers into predefined buckets:

- **Income**: Revenue, rent, rental income, application fees, etc.
- **Expenses**: Maintenance, utilities, insurance, property tax, etc.
- **Tenant Info**: Tenant details, lease information, occupancy, etc.
- **Financial Metrics**: Net income, ROI, cap rate, etc.
- **Property Details**: Address, square footage, property type, etc.
- **Dates**: Time periods, months, quarters, etc.
- **Amounts**: Monetary values, rates, fees, etc.
- **Status**: Occupancy status, payment status, etc.

### Confidence Scoring
- **High Confidence (80%+)**: Green - Automatic processing
- **Medium Confidence (60-79%)**: Yellow - May need review
- **Low Confidence (<60%)**: Red - Requires user confirmation

### Format Detection
- **Month-Column Format**: Headers like "Jan 2024", "Feb 2024"
- **Traditional Format**: Standard headers like "Revenue", "Expenses"

## 📊 Usage Examples

### Basic CSV Upload
1. Select a property from the dropdown
2. Click "Choose CSV File" and select your CSV
3. AI parser automatically detects format and categorizes headers
4. Review confidence scores and confirm low-confidence matches
5. Save processed data to Supabase

### Supported CSV Formats

#### Traditional Format
```csv
Property Name,Date,Revenue,Expenses,Occupancy Rate
Sample Property,2024-01-15,45600,12000,95.8
```

#### Month-Column Format
```csv
Account Name,Jan 2024,Feb 2024,Mar 2024
Rental Income,45000,46000,47000
Maintenance,5000,4500,5200
```

## 🔍 API Reference

### AIParserService Methods
- `uploadCSVFile(file, propertyId, propertyName)`: Upload CSV file
- `saveParsedData(csvFileId, parsedData)`: Save processed data
- `saveHeaderMatches(csvFileId, headerMatches)`: Save header analysis
- `getCSVFiles(propertyId?)`: Get uploaded files
- `getParsedData(csvFileId)`: Get processed data
- `healthCheck()`: Check Supabase connection

### CSVHeaderDetector Methods
- `parseCSVHeaders(csvData, propertyName)`: Main parsing method
- `matchHeaderToBucket(header, threshold)`: Match header to category
- `addCustomBucket(name, keywords, description)`: Add custom categories

## 🐛 Troubleshooting

### Common Issues

1. **Supabase Connection Error**
   - Verify environment variables
   - Check Supabase project status
   - Ensure database schema is applied

2. **File Upload Issues**
   - Check file size limits
   - Verify CSV format validity
   - Check storage bucket permissions

3. **AI Parsing Errors**
   - Review browser console
   - Check CSV header format
   - Try with simpler CSV first

### Debug Mode
Enable debug logging:
```bash
REACT_APP_DEBUG_AI_PARSER=true npm start
```

## 🚀 Deployment

### Production Setup
1. Update environment variables with production Supabase credentials
2. Configure storage bucket permissions
3. Test with production data
4. Monitor AI confidence scores

### Environment Configuration
```bash
# Production environment
REACT_APP_SUPABASE_URL_AI=https://your-prod-ai-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY_AI=your-prod-ai-anon-key
REACT_APP_AI_PARSER_ENABLED=true
REACT_APP_DEBUG_AI_PARSER=false
```

## 📈 Performance

### Optimization Features
- **Client-side Processing**: Reduces server load
- **Fuzzy Matching**: Efficient header detection
- **Batch Operations**: Optimized database operations
- **Caching**: Reduced redundant processing

### Scalability
- **Separate Database**: Isolated from main project
- **Modular Design**: Easy to extend and modify
- **API-first**: Ready for microservices architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:
1. Check the browser console for error messages
2. Review AI analysis results for confidence scores
3. Test with sample CSV files first
4. Verify Supabase configuration and permissions

---

**Branch**: `propertydahsboardaiparser`  
**Last Updated**: September 2024  
**Status**: ✅ Ready for testing
