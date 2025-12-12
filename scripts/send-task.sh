#!/bin/bash
# 既に起動中のClaudeエージェントに指示を送信するスクリプト
# 使い方: ./scripts/send-task.sh <ペイン番号> "<指示内容>"

SESSION_NAME="pkb-dev"
PANE_NUM="$1"
TASK="$2"

if [ -z "$PANE_NUM" ] || [ -z "$TASK" ]; then
    echo "使い方: $0 <ペイン番号> \"<指示内容>\""
    echo ""
    echo "ペイン番号:"
    echo "  1: フロントエンド基盤"
    echo "  2: フロントエンド部品"
    echo "  3: バックエンドAPI"
    echo "  4: データ永続化"
    echo "  5: 検索/インデックス"
    echo "  6: テスト"
    echo "  7: ドキュメント/レビュー"
    echo ""
    echo "例: $0 1 \"NoteEditor.tsxを作成してください\""
    exit 1
fi

# 指示を送信（既に起動中のClaudeに対して）
# C-m はEnterキーのコントロールコード
tmux send-keys -t $SESSION_NAME:0.$PANE_NUM "$TASK" C-m

echo "✓ ペイン$PANE_NUM に指示送信: $TASK"
