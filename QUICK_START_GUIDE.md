# Quick Start Guide - CSV Import Flow

## 🚀 Running the Application

To use the CSV Import Flow feature, you need to run both the React frontend and the API server.

### 1. Start the React Frontend (Port 3000)
```bash
npm run dev
# or
npm start
```
This will start the React development server on http://localhost:3000

### 2. Start the API Server (Port 5001)
```bash
npm run server
# or
PORT=5001 npx tsx src/server.ts
```
This will start the CSV parser API server on http://localhost:5001

## 📁 Using the CSV Import Flow

1. **Navigate to CSVs Tab**: Click "CSVs" in the sidebar
2. **Select Import Flow**: The "Import Flow" tab should be selected by default
3. **Upload CSV File**: Click "Choose File" and select your CSV file
4. **Review AI Suggestions**: The system will automatically suggest field mappings with color coding:
   - 🔵 Blue: Property fields (property_name, address, city, state, zip, unit_id)
   - 🟢 Green: Tenant fields (tenant_name, email, phone, move_in, move_out, deposit, status)
   - 🟣 Purple: Financial fields (period, income, expense, noi, capex, taxes, insurance, mortgage, balance, arrears, asset, liability, equity)
5. **Adjust Mappings**: Use the dropdowns to correct any incorrect mappings
6. **Preview Import**: Click "Preview Import" to see the processed data
7. **Review Results**: Check the JSON preview to ensure data is correctly formatted

## 🔧 Troubleshooting

### "Failed to fetch" Error
This means the API server isn't running. Make sure you have both servers running:
- React frontend on port 3000
- API server on port 5001

### API Server Won't Start
Check that all dependencies are installed:
```bash
npm install
```

### Port Conflicts
If port 5001 is in use, you can change it:
```bash
PORT=5002 npm run server
```
Then update `.env.local`:
```
REACT_APP_API_BASE=http://localhost:5002
```

## 🎯 Features

- **AI-Powered Mapping**: Automatically suggests field mappings based on your data
- **Color-Coded Interface**: Visual indicators for different field types
- **Real-time Preview**: See processed data before final import
- **Error Handling**: Clear error messages and status indicators
- **Automatic Training**: AI model trains automatically in the background

## 📊 Supported Data Types

The system recognizes and processes:
- **Currency**: Automatically converts $1,234.56 format
- **Dates**: Handles various date formats
- **Emails**: Validates email addresses
- **Text**: Preserves as-is

## 🎨 UI Features

- **Loading States**: Visual feedback during processing
- **Error Display**: Clear error messages with troubleshooting tips
- **Confidence Scores**: Shows how confident the AI is about each mapping
- **Responsive Design**: Works on desktop and mobile

The CSV Import Flow is now ready to use! 🎉
