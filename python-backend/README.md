# Python AI Categorization Backend

This Python backend provides intelligent categorization of CSV financial data using fuzzy logic and machine learning techniques.

## Features

- **🤖 AI-Powered Categorization**: Uses fuzzy string matching to automatically categorize account line items
- **📊 Section-Based Logic**: Automatically detects Income/Expense sections and categorizes items accordingly
- **🎯 Confidence Scoring**: Provides confidence percentages for each categorization
- **🧠 Learning System**: Learns from user corrections and improves over time
- **💾 SQLite Database**: Stores learning data locally for persistence

## Quick Start

1. **Start the backend**:
   ```bash
   cd python-backend
   ./start_backend.sh
   ```

2. **The server will start on**: `http://localhost:5001`

3. **Health check**: Visit `http://localhost:5001/api/health`

## API Endpoints

### POST `/api/categorize`
Categorizes CSV data using AI logic.

**Request**:
```json
{
  "csv_data": [
    {
      "account_name": "Resident / Tenant Rents & Asmts",
      "time_series": {"Jan 2024": 50000, "Feb 2024": 52000}
    }
  ],
  "file_type": "cash_flow"
}
```

**Response**:
```json
{
  "success": true,
  "categorized_data": [
    {
      "account_name": "Resident / Tenant Rents & Asmts",
      "time_series": {"Jan 2024": 50000, "Feb 2024": 52000},
      "ai_category": "income",
      "confidence_score": 0.85
    }
  ],
  "summary": {
    "total_records": 1,
    "income_count": 1,
    "expense_count": 0,
    "net_income_count": 0,
    "uncategorized_count": 0,
    "confidence_avg": 0.85
  }
}
```

### POST `/api/learn`
Learns from user corrections.

**Request**:
```json
{
  "account_name": "Move In Specials",
  "file_type": "cash_flow",
  "user_category": "expense"
}
```

## Categorization Logic

### 1. Section-Based Detection
- Items after "Income" headers → categorized as `income`
- Items after "Expense" headers → categorized as `expense`
- "Total Income", "Total Expense", "Net Income" → automatically detected

### 2. Fuzzy Matching
- Uses Levenshtein distance for string similarity
- Matches against keyword lists for income/expense terms
- Provides confidence scores based on match quality

### 3. Learning System
- Stores user corrections in SQLite database
- Improves categorization accuracy over time
- Remembers patterns for specific file types

## Key Metrics Prioritization

The system prioritizes these key financial metrics:
- **Total Income** - Sum of all income line items
- **Total Expense** - Sum of all expense line items  
- **Net Income** - Calculated as Total Income - Total Expense

These metrics are used to populate the dashboard charts month-over-month.

## Database Schema

### ai_categorizations
- `account_name`: The account line item name
- `file_type`: Type of CSV file (cash_flow, balance_sheet, etc.)
- `predicted_category`: AI's initial categorization
- `confidence_score`: Confidence level (0.0-1.0)
- `user_corrected_category`: User's correction (if any)
- `usage_count`: How many times this categorization has been used

## Dependencies

- Flask 2.3.3 - Web framework
- pandas 2.0.3 - Data manipulation
- numpy 1.24.3 - Numerical computing
- fuzzywuzzy 0.18.0 - Fuzzy string matching
- python-Levenshtein 0.21.1 - String distance calculations

## Development

To run in development mode:
```bash
cd python-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

The server will start with debug mode enabled and auto-reload on changes.
