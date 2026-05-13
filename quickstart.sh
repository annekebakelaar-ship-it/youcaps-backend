#!/bin/bash
# Youcaps Backend - Quick Start Script

set -e

echo "🚀 Youcaps Backend - Quick Start"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    echo "📋 Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ .env created - please edit with your credentials"
    echo ""
    echo "📝 Required environment variables:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_KEY"
    echo "   - SMTP_USER"
    echo "   - SMTP_PASS"
    echo "   - MOLLIE_API_KEY"
    echo ""
else
    echo "✓ .env file found"
fi

echo ""
echo "🔧 Configuration complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your credentials"
echo "  2. Run database migrations: npm run migrate"
echo "  3. Start development server: npm run dev"
echo "  4. Test: curl http://localhost:3000/health"
echo ""
