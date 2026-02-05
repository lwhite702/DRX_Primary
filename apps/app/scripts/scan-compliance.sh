#!/bin/bash
set -e

# Define banned patterns
# Format: "Pattern to search|Message to display"

# 1. Direct Supabase usage
if grep -r "from ['\"]@supabase/supabase-js['\"]" app lib components --include="*.ts" --include="*.tsx" 2>/dev/null; then
  echo "❌ COMPLIANCE ERROR: Direct Supabase import found. Please use the adapter in @wrelik/db or @/lib/db."
  exit 1
fi

# 2. Console logs in production code (simplistic check, maybe skip?)
# if grep -r "console.log" app lib components --include="*.ts" --include="*.tsx" --exclude-dir="test" 2>/dev/null; then
#   echo "⚠️ WARNING: console.log found."
# fi

echo "✅ Static Compliance Scan Passed"
exit 0
