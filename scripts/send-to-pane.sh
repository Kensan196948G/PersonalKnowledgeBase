#!/bin/bash
# 他のペインにコマンドを送信するヘルパースクリプト
# 使い方: ./scripts/send-to-pane.sh <ペイン番号> "<コマンド>"
# 例: ./scripts/send-to-pane.sh 1 "claude --dangerously-skip-permissions '指示内容'"

SESSION_NAME="pkb-dev"
PANE_NUM="$1"
COMMAND="$2"

if [ -z "$PANE_NUM" ] || [ -z "$COMMAND" ]; then
    echo "使い方: $0 <ペイン番号> \"<コマンド>\""
    echo "例: $0 1 \"claude --dangerously-skip-permissions '指示内容'\""
    exit 1
fi

# ペインにコマンドを送信してEnterで実行
tmux send-keys -t $SESSION_NAME:0.$PANE_NUM "$COMMAND" Enter

echo "ペイン$PANE_NUM に送信完了: $COMMAND"
