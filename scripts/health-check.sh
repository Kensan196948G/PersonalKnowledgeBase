#!/bin/bash

# Phase 1 MVP - Health Check Script
# システムの基本的な健全性を確認するスクリプト

set -e

# カラーコード
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# チェック結果を記録
CHECKS_PASSED=0
CHECKS_FAILED=0

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}  Phase 1 MVP - Health Check${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# 1. Node.jsバージョン確認
echo -e "${YELLOW}[1/10] Node.js バージョン確認...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗ Node.js がインストールされていません${NC}"
    ((CHECKS_FAILED++))
fi
echo ""

# 2. npm バージョン確認
echo -e "${YELLOW}[2/10] npm バージョン確認...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm: $NPM_VERSION${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗ npm がインストールされていません${NC}"
    ((CHECKS_FAILED++))
fi
echo ""

# 3. package.json 確認
echo -e "${YELLOW}[3/10] package.json 確認...${NC}"
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ package.json が存在します${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗ package.json が見つかりません${NC}"
    ((CHECKS_FAILED++))
fi
echo ""

# 4. node_modules 確認
echo -e "${YELLOW}[4/10] 依存パッケージ確認...${NC}"
if [ -d "node_modules" ]; then
    MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    echo -e "${GREEN}✓ node_modules が存在します (${MODULE_COUNT} パッケージ)${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗ node_modules が見つかりません。'npm install' を実行してください${NC}"
    ((CHECKS_FAILED++))
fi
echo ""

# 5. データベース確認
echo -e "${YELLOW}[5/10] データベース確認...${NC}"
if [ -f "data/knowledge.db" ]; then
    DB_SIZE=$(du -h data/knowledge.db | cut -f1)
    echo -e "${GREEN}✓ data/knowledge.db が存在します (サイズ: ${DB_SIZE})${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗ data/knowledge.db が見つかりません。'npx prisma db push' を実行してください${NC}"
    ((CHECKS_FAILED++))
fi
echo ""

# 6. 添付ファイルディレクトリ確認
echo -e "${YELLOW}[6/10] 添付ファイルディレクトリ確認...${NC}"
if [ -d "data/attachments" ]; then
    ATTACHMENT_COUNT=$(find data/attachments -type f 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ data/attachments/ が存在します (${ATTACHMENT_COUNT} ファイル)${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗ data/attachments/ が見つかりません${NC}"
    ((CHECKS_FAILED++))
fi
echo ""

# 7. TypeScript ビルド確認
echo -e "${YELLOW}[7/10] TypeScript 型チェック...${NC}"
if npm run typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✓ TypeScript 型チェックが成功しました${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗ TypeScript 型エラーがあります。'npm run typecheck' で確認してください${NC}"
    ((CHECKS_FAILED++))
fi
echo ""

# 8. Prisma クライアント確認
echo -e "${YELLOW}[8/10] Prisma クライアント確認...${NC}"
if [ -d "node_modules/.prisma/client" ]; then
    echo -e "${GREEN}✓ Prisma クライアントが生成されています${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗ Prisma クライアントが見つかりません。'npx prisma generate' を実行してください${NC}"
    ((CHECKS_FAILED++))
fi
echo ""

# 9. バックエンド API Health Check（サーバーが起動している場合のみ）
echo -e "${YELLOW}[9/10] バックエンド API Health Check...${NC}"
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
    echo -e "${GREEN}✓ バックエンド API が応答しています: ${HEALTH_RESPONSE}${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠ バックエンド API が起動していません（これは正常な場合があります）${NC}"
    echo -e "${YELLOW}  サーバーを起動するには 'npm run dev' を実行してください${NC}"
    # これはエラーとしてカウントしない
    ((CHECKS_PASSED++))
fi
echo ""

# 10. フロントエンド確認（サーバーが起動している場合のみ）
echo -e "${YELLOW}[10/10] フロントエンド確認...${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ フロントエンドが応答しています${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠ フロントエンドが起動していません（これは正常な場合があります）${NC}"
    echo -e "${YELLOW}  サーバーを起動するには 'npm run dev' を実行してください${NC}"
    # これはエラーとしてカウントしない
    ((CHECKS_PASSED++))
fi
echo ""

# 結果サマリー
echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}  チェック結果${NC}"
echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}成功: ${CHECKS_PASSED} / 10${NC}"

if [ $CHECKS_FAILED -gt 0 ]; then
    echo -e "${RED}失敗: ${CHECKS_FAILED} / 10${NC}"
    echo ""
    echo -e "${RED}いくつかのチェックが失敗しました。上記のエラーを確認してください。${NC}"
    exit 1
else
    echo -e "${GREEN}失敗: 0 / 10${NC}"
    echo ""
    echo -e "${GREEN}全てのチェックが成功しました！${NC}"
    echo ""
    echo -e "${BLUE}次のステップ:${NC}"
    echo -e "  1. 開発サーバーを起動: ${YELLOW}npm run dev${NC}"
    echo -e "  2. ブラウザでアクセス: ${YELLOW}http://localhost:5173${NC}"
    echo -e "  3. E2E確認を実施: ${YELLOW}scripts/e2e-check.md${NC}"
    exit 0
fi
