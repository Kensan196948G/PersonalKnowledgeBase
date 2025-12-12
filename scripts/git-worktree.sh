#!/bin/bash
# ===========================================
# Git Worktree ヘルパースクリプト
# 複数機能を並行開発する際の作業ディレクトリ管理
# ===========================================

set -e

MAIN_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"
WORKTREE_BASE="/mnt/LinuxHDD"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

usage() {
    echo -e "${BLUE}=== Git Worktree ヘルパー ===${NC}"
    echo ""
    echo "使い方:"
    echo "  $0 create <feature-name>   # Worktree作成"
    echo "  $0 remove <feature-name>   # Worktree削除"
    echo "  $0 list                    # Worktree一覧"
    echo ""
    echo "例:"
    echo "  $0 create editor           # feature/editor ブランチ用"
    echo "  $0 create search           # feature/search ブランチ用"
    echo "  $0 remove editor           # Worktree削除"
    echo ""
}

create_worktree() {
    local feature_name="$1"
    local branch_name="feature/$feature_name"
    local worktree_dir="$WORKTREE_BASE/pkb-$feature_name"

    if [ -d "$worktree_dir" ]; then
        echo -e "${RED}エラー: $worktree_dir は既に存在します${NC}"
        exit 1
    fi

    cd "$MAIN_DIR"

    # ブランチが存在するか確認
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo -e "${YELLOW}既存ブランチ $branch_name を使用${NC}"
    else
        echo -e "${GREEN}新規ブランチ $branch_name を作成${NC}"
        git branch "$branch_name"
    fi

    # Worktree作成
    git worktree add "$worktree_dir" "$branch_name"

    echo ""
    echo -e "${GREEN}Worktree作成完了！${NC}"
    echo ""
    echo "作業ディレクトリ: $worktree_dir"
    echo "ブランチ: $branch_name"
    echo ""
    echo "移動コマンド:"
    echo "  cd $worktree_dir"
}

remove_worktree() {
    local feature_name="$1"
    local worktree_dir="$WORKTREE_BASE/pkb-$feature_name"

    if [ ! -d "$worktree_dir" ]; then
        echo -e "${RED}エラー: $worktree_dir は存在しません${NC}"
        exit 1
    fi

    cd "$MAIN_DIR"

    # Worktree削除
    git worktree remove "$worktree_dir"

    echo -e "${GREEN}Worktree削除完了: $worktree_dir${NC}"
}

list_worktrees() {
    cd "$MAIN_DIR"
    echo -e "${BLUE}=== Worktree一覧 ===${NC}"
    echo ""
    git worktree list
}

# メイン処理
case "$1" in
    create)
        if [ -z "$2" ]; then
            echo -e "${RED}エラー: feature名を指定してください${NC}"
            usage
            exit 1
        fi
        create_worktree "$2"
        ;;
    remove)
        if [ -z "$2" ]; then
            echo -e "${RED}エラー: feature名を指定してください${NC}"
            usage
            exit 1
        fi
        remove_worktree "$2"
        ;;
    list)
        list_worktrees
        ;;
    *)
        usage
        ;;
esac
