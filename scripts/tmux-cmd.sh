#!/bin/bash
# Claude Codeからtmux監視環境にコマンドを送信するヘルパー
# 使い方: ./scripts/tmux-cmd.sh <ペイン番号> "<コマンド>"
# 例: ./scripts/tmux-cmd.sh 2 "npm run dev:backend"

SESSION_NAME="pkb-dev"
PANE_NUM="$1"
COMMAND="$2"

# 引数チェック
if [ -z "$PANE_NUM" ] || [ -z "$COMMAND" ]; then
    echo "使い方: $0 <ペイン番号> \"<コマンド>\""
    echo ""
    echo "ペイン一覧:"
    echo "  0: Shell (空きペイン)"
    echo "  1: Frontend Dev"
    echo "  2: Backend API"
    echo "  3: Tests"
    echo "  4: TypeCheck"
    echo "  5: Prisma"
    echo "  6: Docker/DB"
    echo "  7: Git Status"
    echo ""
    echo "例:"
    echo "  $0 1 \"npm run dev:frontend\""
    echo "  $0 2 \"npm run dev:backend\""
    echo "  $0 3 \"npm test\""
    exit 1
fi

# セッション存在確認
if ! tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "エラー: tmuxセッション '$SESSION_NAME' が見つかりません"
    echo "先に別ターミナルで ./scripts/dev-monitor.sh を実行してください"
    exit 1
fi

# コマンド送信
tmux send-keys -t $SESSION_NAME:0.$PANE_NUM "$COMMAND" C-m

echo "✓ ペイン$PANE_NUM に送信: $COMMAND"
