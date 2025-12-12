#!/bin/bash
# ===========================================
# Personal Knowledge Base - 依存関係インストールスクリプト
# ===========================================
# 実行方法: sudo bash scripts/install-dependencies.sh

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Personal Knowledge Base - 依存関係インストール ===${NC}"
echo ""

# root権限チェック
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: このスクリプトはsudo権限で実行してください${NC}"
    echo "Usage: sudo bash scripts/install-dependencies.sh"
    exit 1
fi

# 実際のユーザー名を取得
REAL_USER=${SUDO_USER:-$USER}

echo -e "${YELLOW}[1/4] システムパッケージを更新中...${NC}"
apt-get update

echo -e "${YELLOW}[2/4] Node.js v20 LTS をインストール中...${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}Node.js は既にインストールされています: $(node -v)${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo -e "${GREEN}Node.js $(node -v) をインストールしました${NC}"
fi

echo -e "${YELLOW}[3/4] Docker をインストール中...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}Docker は既にインストールされています: $(docker --version)${NC}"
else
    apt-get install -y docker.io docker-compose-v2
    echo -e "${GREEN}Docker をインストールしました${NC}"
fi

# ユーザーをdockerグループに追加
if ! groups $REAL_USER | grep -q docker; then
    echo -e "${YELLOW}[4/4] ユーザー $REAL_USER を docker グループに追加中...${NC}"
    usermod -aG docker $REAL_USER
    echo -e "${GREEN}docker グループに追加しました${NC}"
    echo -e "${YELLOW}注意: docker グループの反映にはログアウト→ログインが必要です${NC}"
else
    echo -e "${GREEN}[4/4] ユーザー $REAL_USER は既に docker グループに所属しています${NC}"
fi

echo ""
echo -e "${GREEN}=== インストール完了 ===${NC}"
echo ""
echo "インストールされたバージョン:"
echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"
echo "  Docker: $(docker --version)"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo "  1. ログアウト→ログイン（docker グループ反映のため）"
echo "  2. cd /mnt/LinuxHDD/PersonalKnowledgeBase"
echo "  3. npm install"
echo "  4. docker compose up -d"
echo "  5. npx prisma migrate dev --name init"
