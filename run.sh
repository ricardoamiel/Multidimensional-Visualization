#!/bin/bash
# Setup and run Spotify Multidimensional Visualization

echo "🎵 Spotify Visualization - Setup Script"
echo "========================================"
echo ""

# Check Python
echo "✓ Checking Python installation..."
python3 --version || python --version

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Run data processing
echo ""
echo "🔄 Processing data..."
python3 process_data.py

# Run the app
echo ""
echo "🚀 Starting Flask server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Open your browser and go to:"
echo "   http://localhost:5000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

python3 app.py
