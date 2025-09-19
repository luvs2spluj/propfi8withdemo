#!/bin/bash

# Start Python AI Backend
echo "🚀 Starting Python AI Categorization Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Start Flask server
echo "🌐 Starting Flask server on port 5001..."
python app.py
