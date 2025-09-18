#!/usr/bin/env node

/**
 * AI Parser Setup Script
 * 
 * This script helps set up the AI parser integration for the Horton Properties dashboard.
 * It creates the necessary Supabase configuration and provides setup instructions.
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 Setting up AI Parser Integration for Horton Properties Dashboard...\n');

// Create environment template
const envTemplate = `# AI Parser Branch Environment Configuration
# This file contains environment variables for the AI parser integration
# Update with your actual Supabase credentials

# AI Parser Supabase Configuration (Separate from main project)
REACT_APP_SUPABASE_URL_AI=https://your-ai-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY_AI=your-ai-anon-key-here

# Main Project Supabase Configuration (for reference)
REACT_APP_SUPABASE_URL=https://your-main-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-main-anon-key-here

# AI Parser Settings
REACT_APP_AI_PARSER_ENABLED=true
REACT_APP_AI_CONFIDENCE_THRESHOLD=0.6
REACT_APP_AI_MAX_FILE_SIZE_MB=50

# Development Settings
REACT_APP_DEBUG_AI_PARSER=true
REACT_APP_LOG_AI_ANALYSIS=true

# API Endpoints
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_AI_API_BASE_URL=http://localhost:8000

# Feature Flags
REACT_APP_ENABLE_AI_PARSER=true
REACT_APP_ENABLE_TRADITIONAL_PARSER=true
REACT_APP_ENABLE_DUAL_MODE=true`;

// Write environment template
const envPath = path.join(__dirname, '.env.ai-parser.template');
fs.writeFileSync(envPath, envTemplate);
console.log('✅ Created .env.ai-parser.template');

// Create setup instructions
const setupInstructions = `# AI Parser Integration Setup Instructions

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
\`\`\`bash
cp .env.ai-parser.template .env.local
\`\`\`

### Update Environment Variables
Edit .env.local and update:
- REACT_APP_SUPABASE_URL_AI: Your AI parser Supabase project URL
- REACT_APP_SUPABASE_ANON_KEY_AI: Your AI parser Supabase anon key

## 3. Install Dependencies

The AI parser integration uses existing dependencies, but you may need to install additional packages:

\`\`\`bash
npm install
\`\`\`

## 4. Test the Integration

1. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

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
`;

// Write setup instructions
const instructionsPath = path.join(__dirname, 'AI_PARSER_SETUP.md');
fs.writeFileSync(instructionsPath, setupInstructions);
console.log('✅ Created AI_PARSER_SETUP.md');

// Create package.json script
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  packageJson.scripts['setup-ai-parser'] = 'node setup-ai-parser.js';
  packageJson.scripts['dev:ai-parser'] = 'REACT_APP_AI_PARSER_ENABLED=true npm start';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Updated package.json with AI parser scripts');
}

console.log('\n🎉 AI Parser setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Create a new Supabase project for AI parser');
console.log('2. Run the SQL schema from ai-parser-schema.sql');
console.log('3. Copy .env.ai-parser.template to .env.local and update credentials');
console.log('4. Run: npm start');
console.log('5. Navigate to "AI Parser" tab in the sidebar');
console.log('\n📖 See AI_PARSER_SETUP.md for detailed instructions');
