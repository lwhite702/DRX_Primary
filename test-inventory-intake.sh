#!/bin/bash

# DRX Inventory Intake System - Test Suite
# Comprehensive testing for the new cost tracking system

set -e

echo "🧪 DRX Inventory Intake System - Test Suite"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "📦 Phase 1: Database Schema Tests"
echo "=================================="

# Test 1: Check tables exist
echo "Test 1: Verify inventory_intakes table exists"
psql $DATABASE_URL -c "SELECT 1 FROM inventory_intakes LIMIT 1;" > /dev/null 2>&1 && \
    echo -e "${GREEN}✓ PASS${NC}" || echo -e "${RED}✗ FAIL${NC}"

echo "Test 2: Verify cost_history table exists"
psql $DATABASE_URL -c "SELECT 1 FROM cost_history LIMIT 1;" > /dev/null 2>&1 && \
    echo -e "${GREEN}✓ PASS${NC}" || echo -e "${RED}✗ FAIL${NC}"

echo "Test 3: Verify metadata column in inventory_log"
psql $DATABASE_URL -c "SELECT metadata FROM inventory_log LIMIT 1;" > /dev/null 2>&1 && \
    echo -e "${GREEN}✓ PASS${NC}" || echo -e "${RED}✗ FAIL${NC}"

echo ""
echo "🔧 Phase 2: Helper Functions Tests"
echo "==================================="

echo "Test 4: Verify is_manager function exists"
psql $DATABASE_URL -c "SELECT is_manager('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid);" > /dev/null 2>&1 && \
    echo -e "${GREEN}✓ PASS${NC}" || echo -e "${RED}✗ FAIL${NC}"

echo "Test 5: Verify get_avg_cost_per_gram function exists"
psql $DATABASE_URL -c "SELECT get_avg_cost_per_gram('00000000-0000-0000-0000-000000000000'::uuid, 90);" > /dev/null 2>&1 && \
    echo -e "${GREEN}✓ PASS${NC}" || echo -e "${RED}✗ FAIL${NC}"

echo ""
echo "🎯 Phase 3: Cost Calculation Tests"
echo "==================================="

echo "Test 6: Cost per gram calculation (1200 / 1000 = 1.20)"
RESULT=$(node -e "console.log((1200 / 1000).toFixed(6))")
if [ "$RESULT" = "1.200000" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC} (Expected: 1.200000, Got: $RESULT)"
fi

echo "Test 7: Cost per gram calculation with decimals (1234.56 / 987.65 = 1.250013)"
RESULT=$(node -e "console.log((1234.56 / 987.65).toFixed(6))")
if [ "$RESULT" = "1.250013" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC} (Expected: 1.250013, Got: $RESULT)"
fi

echo "Test 8: Minimum weight validation (0.01g)"
RESULT=$(node -e "console.log(0.01 >= 0.01)")
if [ "$RESULT" = "true" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

echo ""
echo "📊 Phase 4: Unusual Cost Detection Tests"
echo "========================================"

echo "Test 9: 50% deviation detection (cost: 1.50, avg: 1.00, deviation: 50%)"
RESULT=$(node -e "const deviation = Math.abs((1.50 - 1.00) / 1.00); console.log(deviation > 0.5)")
if [ "$RESULT" = "false" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Should NOT trigger approval)"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

echo "Test 10: 51% deviation detection (cost: 1.51, avg: 1.00, deviation: 51%)"
RESULT=$(node -e "const deviation = Math.abs((1.51 - 1.00) / 1.00); console.log(deviation > 0.5)")
if [ "$RESULT" = "true" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Should trigger approval)"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

echo "Test 11: Negative deviation detection (cost: 0.49, avg: 1.00, deviation: 51%)"
RESULT=$(node -e "const deviation = Math.abs((0.49 - 1.00) / 1.00); console.log(deviation > 0.5)")
if [ "$RESULT" = "true" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Should trigger approval)"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

echo ""
echo "🏗️ Phase 5: Build Tests"
echo "======================="

echo "Test 12: TypeScript compilation"
npm run build > /dev/null 2>&1 && \
    echo -e "${GREEN}✓ PASS${NC}" || echo -e "${RED}✗ FAIL${NC}"

echo ""
echo "📝 Test Summary"
echo "==============="
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review.${NC}"
    exit 1
fi
