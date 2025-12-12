#!/bin/bash
# 複数ペインにClaude指示を一括送信するスクリプト
# 使い方: ./scripts/dispatch-task.sh
# または引数で指定: ./scripts/dispatch-task.sh <ペイン番号> "<指示>"

SESSION_NAME="pkb-dev"
PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"

send_claude_task() {
    local pane=$1
    local task=$2
    local full_command="claude --dangerously-skip-permissions '以降、日本語で対応願います。$task'"

    tmux send-keys -t $SESSION_NAME:0.$pane "$full_command" C-m
    echo "✓ ペイン$pane に送信: $task"
}

# 引数がある場合は単一送信
if [ -n "$1" ] && [ -n "$2" ]; then
    send_claude_task "$1" "$2"
    exit 0
fi

# 引数がない場合はインタラクティブモード
echo "=== タスク配信スクリプト ==="
echo ""
echo "ペイン一覧:"
echo "  1: フロントエンド基盤"
echo "  2: フロントエンド部品"
echo "  3: バックエンドAPI"
echo "  4: データ永続化"
echo "  5: 検索/インデックス"
echo "  6: テスト"
echo "  7: ドキュメント/レビュー"
echo ""

read -p "送信先ペイン番号 (1-7): " pane_num
read -p "タスク指示: " task_instruction

if [ -n "$pane_num" ] && [ -n "$task_instruction" ]; then
    send_claude_task "$pane_num" "$task_instruction"
else
    echo "キャンセルしました"
fi
