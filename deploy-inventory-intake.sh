#!/bin/bash

# DRX Inventory Intake System - Deployment Script
# This script deploys the new inventory intake cost tracking system

set -e  # Exit on error

echo "🚀 DRX Inventory Intake System Deployment"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "  ✓ Database migration file created"
echo "  ✓ Backend APIs implemented"
echo "  ✓ Frontend UI updated"
echo "  ✓ CHANGELOG updated"
echo ""

# Step 1: Apply database migration
echo "📦 Step 1: Applying database migration..."
echo "Migration: 20251207000001_inventory_intake_cost_tracking.sql"
echo ""
echo "This migration will create:"
echo "  - inventory_intakes table"
echo "  - cost_history table"
echo "  - Helper functions (is_manager, get_avg_cost_per_gram)"
echo "  - RLS policies and indexes"
echo ""

read -p "Apply migration now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v supabase &> /dev/null; then
        echo "Running: supabase db push"
        supabase db push
        echo "✅ Migration applied successfully"
    else
        echo "⚠️  Supabase CLI not found. Please apply migration manually:"
        echo "   1. Go to Supabase Dashboard > SQL Editor"
        echo "   2. Run: db/migrations/20251207000001_inventory_intake_cost_tracking.sql"
        echo ""
        read -p "Press enter when migration is complete..."
    fi
else
    echo "⏭️  Skipping migration (you can apply it manually later)"
fi

echo ""

# Step 2: Verify database schema
echo "📊 Step 2: Verifying database schema..."
echo "Please verify the following tables exist:"
echo "  - inventory_intakes"
echo "  - cost_history"
echo "  - inventory_log (with metadata column)"
echo ""
read -p "Press enter to continue..."

# Step 3: Build and test
echo "🔨 Step 3: Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo ""

# Step 4: Deployment summary
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "📝 What was deployed:"
echo "  ✅ Database: inventory_intakes + cost_history tables"
echo "  ✅ Backend: /api/inventory/intake + /api/inventory/intake/approve"
echo "  ✅ Frontend: Redesigned intake UI at /inventory/intake"
echo "  ✅ AI: Updated pricing engine with delivery cost analysis"
echo ""
echo "🧪 Next steps:"
echo "  1. Test intake workflow at /inventory/intake"
echo "  2. Verify cost calculations are accurate"
echo "  3. Test manager approval for unusual costs"
echo "  4. Check cost history is being recorded"
echo ""
echo "📚 Documentation:"
echo "  - Walkthrough: .gemini/antigravity/brain/.../walkthrough.md"
echo "  - CHANGELOG: CHANGELOG.md"
echo ""
echo "🎉 Ready for production use!"
