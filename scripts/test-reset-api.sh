#!/bin/bash

# Frontend Reset API Test Script
# フロントエンドリセットAPIの動作確認スクリプト

echo "🧪 Frontend Reset API Test"
echo "================================"
echo ""

API_BASE="http://localhost:3000"
API_HEALTH="${API_BASE}/api/health"
API_DEV_STATUS="${API_BASE}/api/dev/status"
API_DEV_RESET="${API_BASE}/api/dev/reset-frontend"

# 色設定
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルスチェック
echo -e "${BLUE}[1/3] Health Check${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" ${API_HEALTH})
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "  ${GREEN}✓ Backend is running${NC}"
    echo "  Response: $BODY"
else
    echo -e "  ${RED}✗ Backend is not running (HTTP $HTTP_CODE)${NC}"
    echo -e "  ${YELLOW}Please run: npm run dev:backend${NC}"
    exit 1
fi

echo ""

# Dev Status確認
echo -e "${BLUE}[2/3] Dev Status Check${NC}"
STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" ${API_DEV_STATUS})
HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
BODY=$(echo "$STATUS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "  ${GREEN}✓ Dev API is available${NC}"
    echo "  Response: $BODY"
else
    echo -e "  ${RED}✗ Dev API failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

echo ""

# Reset Frontend確認
echo -e "${BLUE}[3/3] Reset Frontend API Check${NC}"
RESET_RESPONSE=$(curl -s -w "\n%{http_code}" ${API_DEV_RESET})
HTTP_CODE=$(echo "$RESET_RESPONSE" | tail -n1)
BODY=$(echo "$RESET_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "  ${GREEN}✓ Reset API is working${NC}"
    echo "  Response: $BODY"
else
    echo -e "  ${RED}✗ Reset API failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

echo ""
echo "================================"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Test the HTML page:"
echo "     ${YELLOW}open scripts/reset-frontend.html${NC}"
echo ""
echo "  2. Or use the npm command:"
echo "     ${YELLOW}npm run reset-frontend${NC}"
echo ""
