from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from fuzzywuzzy import fuzz, process
import sqlite3
import json
import re
from typing import Dict, List, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Database setup
def init_db():
    """Initialize SQLite database for AI learning"""
    conn = sqlite3.connect('ai_learning.db')
    cursor = conn.cursor()
    
    # Create AI learning table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_categorizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            predicted_category TEXT NOT NULL,
            confidence_score REAL NOT NULL,
            user_corrected_category TEXT,
            usage_count INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(account_name, file_type)
        )
    ''')
    
    # Create section patterns table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS section_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_type TEXT NOT NULL,
            section_header TEXT NOT NULL,
            category TEXT NOT NULL,
            confidence_score REAL DEFAULT 1.0,
            usage_count INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

class AICategorizer:
    def __init__(self):
        self.income_keywords = [
            'rent', 'revenue', 'income', 'receipts', 'fees', 'charges',
            'tenant', 'resident', 'rental', 'lease', 'concessions',
            'short term', 'airbnb', 'vrbo', 'parking', 'pet fees',
            'application', 'admin', 'late fees', 'utility recovery'
        ]
        
        self.expense_keywords = [
            'expense', 'cost', 'maintenance', 'repair', 'utilities',
            'insurance', 'tax', 'management', 'legal', 'accounting',
            'marketing', 'advertising', 'cleaning', 'landscaping',
            'security', 'supplies', 'equipment', 'capital', 'depreciation',
            'move out', 'damages', 'incentives', 'specials'
        ]
        
        self.total_keywords = [
            'total income', 'total expense', 'net income', 'gross income',
            'operating income', 'operating expense', 'net operating income',
            'total revenue', 'total costs', 'profit', 'loss'
        ]

    def get_learning_data(self, file_type: str) -> Dict[str, Dict]:
        """Get AI learning data from database"""
        conn = sqlite3.connect('ai_learning.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT account_name, predicted_category, confidence_score, 
                   user_corrected_category, usage_count
            FROM ai_categorizations 
            WHERE file_type = ?
        ''', (file_type,))
        
        learning_data = {}
        for row in cursor.fetchall():
            account_name, predicted, confidence, corrected, usage = row
            learning_data[account_name] = {
                'predicted_category': predicted,
                'confidence_score': confidence,
                'user_corrected_category': corrected,
                'usage_count': usage
            }
        
        conn.close()
        return learning_data

    def save_categorization(self, account_name: str, file_type: str, 
                          predicted_category: str, confidence_score: float,
                          user_corrected_category: Optional[str] = None):
        """Save categorization to database"""
        conn = sqlite3.connect('ai_learning.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO ai_categorizations 
            (account_name, file_type, predicted_category, confidence_score, 
             user_corrected_category, usage_count, updated_at)
            VALUES (?, ?, ?, ?, ?, 
                    COALESCE((SELECT usage_count FROM ai_categorizations 
                             WHERE account_name = ? AND file_type = ?), 0) + 1,
                    CURRENT_TIMESTAMP)
        ''', (account_name, file_type, predicted_category, confidence_score,
              user_corrected_category, account_name, file_type))
        
        conn.commit()
        conn.close()

    def detect_sections(self, data: List[Dict]) -> Dict[str, str]:
        """Detect Income/Expense sections in the data"""
        sections = {}
        current_category = None
        
        for i, row in enumerate(data):
            account_name = str(row.get('account_name', '')).lower().strip()
            
            # Check for section headers
            if any(keyword in account_name for keyword in ['income', 'revenue']):
                if 'total' in account_name or 'gross' in account_name:
                    current_category = 'income'
                elif 'operating' in account_name:
                    current_category = 'income'
            elif any(keyword in account_name for keyword in ['expense', 'cost']):
                if 'total' in account_name or 'operating' in account_name:
                    current_category = 'expense'
            elif 'net income' in account_name or 'profit' in account_name:
                current_category = 'net_income'
            
            # Apply section-based categorization
            if current_category and account_name not in ['', 'total', 'subtotal']:
                sections[row.get('account_name', '')] = current_category
        
        return sections

    def fuzzy_categorize(self, account_name: str, file_type: str) -> Tuple[str, float]:
        """Use fuzzy matching to categorize account names"""
        account_lower = account_name.lower().strip()
        
        # Check for exact matches in learning data
        learning_data = self.get_learning_data(file_type)
        if account_name in learning_data:
            learned = learning_data[account_name]
            if learned['user_corrected_category']:
                return learned['user_corrected_category'], 0.95
            else:
                return learned['predicted_category'], learned['confidence_score']
        
        # Check for total/summary items
        if any(keyword in account_lower for keyword in self.total_keywords):
            if 'income' in account_lower:
                return 'income', 0.9
            elif 'expense' in account_lower:
                return 'expense', 0.9
            elif 'net' in account_lower:
                return 'net_income', 0.9
        
        # Fuzzy matching against keywords
        income_scores = [fuzz.partial_ratio(account_lower, keyword) for keyword in self.income_keywords]
        expense_scores = [fuzz.partial_ratio(account_lower, keyword) for keyword in self.expense_keywords]
        
        max_income_score = max(income_scores) if income_scores else 0
        max_expense_score = max(expense_scores) if expense_scores else 0
        
        # Determine category based on best match
        if max_income_score > max_expense_score and max_income_score > 60:
            confidence = min(max_income_score / 100.0, 0.85)
            return 'income', confidence
        elif max_expense_score > 60:
            confidence = min(max_expense_score / 100.0, 0.85)
            return 'expense', confidence
        else:
            return 'uncategorized', 0.3

    def categorize_csv_data(self, csv_data: List[Dict], file_type: str) -> Dict:
        """Main categorization function"""
        logger.info(f"Categorizing {len(csv_data)} rows for file type: {file_type}")
        
        # First, detect sections
        sections = self.detect_sections(csv_data)
        
        # Then categorize each item
        categorized_data = []
        for row in csv_data:
            account_name = row.get('account_name', '')
            if not account_name or account_name.strip() == '':
                continue
            
            # Check if already categorized by section
            if account_name in sections:
                category = sections[account_name]
                confidence = 0.9
            else:
                # Use fuzzy logic
                category, confidence = self.fuzzy_categorize(account_name, file_type)
            
            # Save to learning database
            self.save_categorization(account_name, file_type, category, confidence)
            
            categorized_row = row.copy()
            categorized_row['ai_category'] = category
            categorized_row['confidence_score'] = confidence
            categorized_data.append(categorized_row)
        
        # Calculate summary statistics
        income_count = sum(1 for row in categorized_data if row['ai_category'] == 'income')
        expense_count = sum(1 for row in categorized_data if row['ai_category'] == 'expense')
        net_income_count = sum(1 for row in categorized_data if row['ai_category'] == 'net_income')
        uncategorized_count = sum(1 for row in categorized_data if row['ai_category'] == 'uncategorized')
        
        return {
            'categorized_data': categorized_data,
            'summary': {
                'total_records': len(categorized_data),
                'income_count': income_count,
                'expense_count': expense_count,
                'net_income_count': net_income_count,
                'uncategorized_count': uncategorized_count,
                'confidence_avg': np.mean([row['confidence_score'] for row in categorized_data])
            }
        }

# Initialize categorizer
categorizer = AICategorizer()

@app.route('/api/categorize', methods=['POST'])
def categorize_csv():
    """Endpoint for AI categorization"""
    try:
        data = request.get_json()
        csv_data = data.get('csv_data', [])
        file_type = data.get('file_type', 'general')
        
        if not csv_data:
            return jsonify({'error': 'No CSV data provided'}), 400
        
        logger.info(f"Received {len(csv_data)} rows for categorization")
        
        # Perform AI categorization
        result = categorizer.categorize_csv_data(csv_data, file_type)
        
        logger.info(f"Categorization complete: {result['summary']}")
        
        return jsonify({
            'success': True,
            'categorized_data': result['categorized_data'],
            'summary': result['summary']
        })
        
    except Exception as e:
        logger.error(f"Categorization error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/learn', methods=['POST'])
def learn_from_correction():
    """Endpoint for learning from user corrections"""
    try:
        data = request.get_json()
        account_name = data.get('account_name')
        file_type = data.get('file_type')
        user_category = data.get('user_category')
        
        if not all([account_name, file_type, user_category]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Update learning database with user correction
        categorizer.save_categorization(
            account_name, file_type, 'uncategorized', 0.3, user_category
        )
        
        logger.info(f"Learned correction: {account_name} -> {user_category}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Learning error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'AI Categorization API'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
