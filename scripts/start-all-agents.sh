#!/bin/bash
# 全8ペインでClaudeを起動するスクリプト
# 各ペインに役割を持ったClaudeエージェントを配置

SESSION_NAME="pkb-dev"
PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== 全ペインでClaude起動 ===${NC}"

# セッション確認
if ! tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "tmuxセッションがありません。先に ./scripts/tmux-dev.sh を実行してください。"
    exit 1
fi

# 各ペインの役割定義
declare -a ROLES=(
    "あなたはメインエージェント（オーケストレーター）です。他のペインのエージェントに指示を送り、全体を統括します。指示送信には ./scripts/send-task.sh を使用してください。"
    "あなたはフロントエンド基盤エージェントです。src/frontend/core/のUI基盤・エディタ機能を担当します。指示を待っています。"
    "あなたはフロントエンド部品エージェントです。src/frontend/components/の個別コンポーネントを担当します。指示を待っています。"
    "あなたはバックエンドAPIエージェントです。src/backend/api/のREST API実装を担当します。指示を待っています。"
    "あなたはデータ永続化エージェントです。src/backend/storage/のデータ永続化を担当します。指示を待っています。"
    "あなたは検索/インデックスエージェントです。src/backend/search/の検索機能を担当します。指示を待っています。"
    "あなたはテストエージェントです。tests/のテスト作成・実行を担当します。指示を待っています。"
    "あなたはドキュメント/レビューエージェントです。docs/のドキュメント作成とコードレビューを担当します。指示を待っています。"
)

declare -a PANE_NAMES=(
    "メインエージェント"
    "フロントエンド基盤"
    "フロントエンド部品"
    "バックエンドAPI"
    "データ永続化"
    "検索/インデックス"
    "テスト"
    "ドキュメント/レビュー"
)

# 各ペインでClaude起動
for i in {0..7}; do
    echo -e "${GREEN}ペイン$i (${PANE_NAMES[$i]}) でClaude起動中...${NC}"

    # 既存プロセスを停止
    tmux send-keys -t $SESSION_NAME:0.$i C-c 2>/dev/null
    sleep 0.3

    # Claude起動
    tmux send-keys -t $SESSION_NAME:0.$i "claude --dangerously-skip-permissions '以降、日本語で対応願います。${ROLES[$i]}'" C-m

    sleep 0.5
done

echo ""
echo -e "${GREEN}全8ペインでClaude起動完了！${NC}"
echo ""
echo "確認: tmux attach -t $SESSION_NAME"
echo ""
echo "メインエージェント（ペイン0）から他ペインへの指示送信:"
echo "  ./scripts/send-task.sh <ペイン番号> \"<指示内容>\""
