#!/bin/bash
# ===========================================
# バックアップスクリプト
# SQLiteデータベース + 添付ファイルをZIP化
# ===========================================

set -e

PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"
DATA_DIR="$PROJECT_DIR/data"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pkb_backup_$TIMESTAMP.zip"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Personal Knowledge Base バックアップ ===${NC}"
echo ""

# バックアップディレクトリ作成
mkdir -p "$BACKUP_DIR"

# データディレクトリ確認
if [ ! -d "$DATA_DIR" ]; then
    echo -e "${YELLOW}警告: data/ ディレクトリが存在しません${NC}"
    echo "データベースがまだ作成されていない可能性があります。"
    exit 0
fi

# バックアップ対象確認
echo "バックアップ対象:"
if [ -f "$DATA_DIR/knowledgebase.db" ]; then
    echo "  - データベース: knowledgebase.db"
    DB_SIZE=$(du -h "$DATA_DIR/knowledgebase.db" | cut -f1)
    echo "    サイズ: $DB_SIZE"
fi

if [ -d "$DATA_DIR/attachments" ]; then
    ATTACH_COUNT=$(find "$DATA_DIR/attachments" -type f | wc -l)
    echo "  - 添付ファイル: $ATTACH_COUNT 件"
fi

echo ""

# ZIP作成
echo -e "${YELLOW}バックアップ作成中...${NC}"
cd "$PROJECT_DIR"
zip -r "$BACKUP_FILE" data/ -x "*.log"

# 結果表示
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo -e "${GREEN}バックアップ完了！${NC}"
echo ""
echo "ファイル: $BACKUP_FILE"
echo "サイズ: $BACKUP_SIZE"
echo ""

# 古いバックアップの削除（30日以上前）
OLD_COUNT=$(find "$BACKUP_DIR" -name "pkb_backup_*.zip" -mtime +30 | wc -l)
if [ "$OLD_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}30日以上前のバックアップを削除中...${NC}"
    find "$BACKUP_DIR" -name "pkb_backup_*.zip" -mtime +30 -delete
    echo "$OLD_COUNT 件削除"
fi

# バックアップ一覧
echo ""
echo "最近のバックアップ:"
ls -lht "$BACKUP_DIR"/pkb_backup_*.zip 2>/dev/null | head -5
