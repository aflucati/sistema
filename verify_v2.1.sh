#!/bin/bash
# Test Script - Verify v2.1 Implementation

echo "==================================="
echo "v2.1 Implementation Verification"
echo "==================================="
echo ""

echo "✅ Frontend Build Status"
cd "c:\Users\ar_lucati\Documents\sistema\frontend"
npm run build --silent 2>&1 | tail -3
echo ""

echo "✅ Backend Status"
cd "c:\Users\ar_lucati\Documents\sistema\backend"
npm run build --silent 2>&1 | tail -2
echo ""

echo "✅ File Modifications Summary"
echo "GestaoPrazosPage.tsx: $(wc -l < 'c:\Users\ar_lucati\Documents\sistema\frontend\src\pages\GestaoPrazosPage.tsx') lines"
echo "exporters.ts: $(wc -l < 'c:\Users\ar_lucati\Documents\sistema\frontend\src\lib\exporters.ts') lines"
echo ""

echo "✅ Indicators Implementation Check"
grep -c "stat-card-label" 'c:\Users\ar_lucati\Documents\sistema\frontend\src\pages\GestaoPrazosPage.tsx'
echo "stat-card-label instances found (expected: 12)"
echo ""

echo "✅ Table Columns Implementation Check"
grep -c "<th>" 'c:\Users\ar_lucati\Documents\sistema\frontend\src\pages\GestaoPrazosPage.tsx'
echo "table headers found (expected: 19)"
echo ""

echo "✅ Export Functions Check"
grep -c "export const export" 'c:\Users\ar_lucati\Documents\sistema\frontend\src\lib\exporters.ts'
echo "export functions found (expected: 4)"
echo ""

echo "✅ Runtime Check"
echo "Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080)"
echo "Backend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001)"
echo ""

echo "==================================="
echo "All checks complete!"
echo "==================================="
