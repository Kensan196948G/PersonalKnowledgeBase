#!/bin/bash
###############################################################################
# フォルダフィルタリング検証スクリプト
#
# 目的: バックエンドAPIが正しくフォルダでフィルタリングできているか確認
# 使用方法: ./scripts/verify-folder-filtering.sh
###############################################################################

set -e

# 色設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API URL
API_URL="http://192.168.0.187:3000"
FOLDER_ID="10192840-e6b3-4750-985d-6948b142001f"
FOLDER_NAME="2025年⑫"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  フォルダフィルタリング検証${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 1. データベースのノート数確認
echo -e "${YELLOW}[1/4] データベースでノート数を確認...${NC}"
DB_OUTPUT=$(node scripts/check-2025-12-folder.js 2>/dev/null)
DB_COUNT=$(echo "$DB_OUTPUT" | grep "件のノートがあります" | grep -oE '[0-9]+' | tail -1)
echo -e "  データベース: ${GREEN}${DB_COUNT}件${NC}"
echo ""

# 2. バックエンドAPIでフィルタリングなし（全ノート取得）
echo -e "${YELLOW}[2/4] バックエンドAPI: 全ノート取得...${NC}"
TOTAL_NOTES=$(curl -s "${API_URL}/api/notes" | jq -r '.count')
echo -e "  全ノート数: ${GREEN}${TOTAL_NOTES}件${NC}"
echo ""

# 3. バックエンドAPIでフォルダフィルタリング
echo -e "${YELLOW}[3/4] バックエンドAPI: フォルダ「${FOLDER_NAME}」でフィルタリング...${NC}"
FILTERED_RESPONSE=$(curl -s "${API_URL}/api/notes?folderId=${FOLDER_ID}")
FILTERED_COUNT=$(echo "$FILTERED_RESPONSE" | jq -r '.count')
FILTERED_DATA_LENGTH=$(echo "$FILTERED_RESPONSE" | jq -r '.data | length')

echo -e "  レスポンス.count: ${GREEN}${FILTERED_COUNT}件${NC}"
echo -e "  レスポンス.data配列: ${GREEN}${FILTERED_DATA_LENGTH}件${NC}"
echo ""

# 4. 検証結果
echo -e "${YELLOW}[4/4] 検証結果${NC}"
echo "  ----------------------------------------"

# データベースとAPIの一致確認
if [ "$DB_COUNT" -eq "$FILTERED_COUNT" ] && [ "$DB_COUNT" -eq "$FILTERED_DATA_LENGTH" ]; then
    echo -e "  ✅ ${GREEN}成功:${NC} データベース（${DB_COUNT}件）とAPI（${FILTERED_COUNT}件）が一致"
else
    echo -e "  ❌ ${RED}不一致:${NC}"
    echo -e "     - データベース: ${DB_COUNT}件"
    echo -e "     - API count: ${FILTERED_COUNT}件"
    echo -e "     - API data配列: ${FILTERED_DATA_LENGTH}件"
fi

# フォルダIDが正しく設定されているか確認
echo ""
echo -e "${YELLOW}  サンプルデータ確認（最初の3件）:${NC}"
echo "$FILTERED_RESPONSE" | jq -r '.data[0:3] | .[] | "    - \(.title) (folderId: \(.folderId))"'

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  検証完了${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# レスポンス詳細を保存
OUTPUT_FILE="scripts/api-response-$(date +%Y%m%d_%H%M%S).json"
echo "$FILTERED_RESPONSE" | jq '.' > "$OUTPUT_FILE"
echo -e "${GREEN}📄 APIレスポンス詳細を保存: ${OUTPUT_FILE}${NC}"
