#!/bin/bash
# tmux監視環境の状態を確認するスクリプト
# Claude Codeから実行して各ペインの状態を把握

SESSION_NAME="pkb-dev"

# セッション存在確認
if ! tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "tmuxセッション '$SESSION_NAME' が存在しません"
    echo "別ターミナルで ./scripts/dev-monitor.sh を実行してください"
    exit 1
fi

echo "=== tmux監視環境の状態 ==="
echo ""

# ペイン一覧と最新出力を表示
for i in {0..7}; do
    PANE_TITLE=$(tmux display-message -t $SESSION_NAME:0.$i -p '#{pane_title}' 2>/dev/null)
    echo "--- ペイン$i: $PANE_TITLE ---"
    # 各ペインの最新5行を取得
    tmux capture-pane -t $SESSION_NAME:0.$i -p | tail -5
    echo ""
done
