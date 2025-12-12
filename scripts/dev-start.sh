#!/bin/bash
# 並列開発環境一括起動スクリプト
# 8ペインtmux + 全ペインClaude起動 + 接続

SESSION_NAME="pkb-dev"
PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Personal Knowledge Base - 開発環境起動${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 既存セッションを削除
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo -e "${YELLOW}既存セッションを削除中...${NC}"
    tmux kill-session -t $SESSION_NAME
    sleep 1
fi

# 2. 8ペインセッション作成
echo -e "${GREEN}8ペインセッション作成中...${NC}"
tmux new-session -d -s $SESSION_NAME -c $PROJECT_DIR
tmux rename-window -t $SESSION_NAME "dev"

# 7回分割して8ペインを作成
for i in {1..7}; do
    tmux split-window -t $SESSION_NAME -c $PROJECT_DIR
    tmux select-layout -t $SESSION_NAME tiled
done

# マウス操作を有効化
tmux set-option -t $SESSION_NAME mouse on

# ペインボーダーにタイトル表示（上部）
tmux set-option -t $SESSION_NAME pane-border-status top
tmux set-option -t $SESSION_NAME pane-border-format " [#{pane_index}] #{pane_title} "
tmux set-option -t $SESSION_NAME pane-border-style "fg=white"
tmux set-option -t $SESSION_NAME pane-active-border-style "fg=green,bold"

# 各ペインにタイトル設定
PANE_TITLES=("メインエージェント" "フロントエンド基盤" "フロントエンド部品" "バックエンドAPI" "データ永続化" "検索/インデックス" "テスト" "ドキュメント/レビュー")
for i in {0..7}; do
    tmux select-pane -t $SESSION_NAME:0.$i -T "${PANE_TITLES[$i]}"
done

echo -e "${GREEN}8ペイン作成完了${NC}"

# 3. 全ペインでClaude起動
echo -e "${GREEN}全ペインでClaude起動中...${NC}"

ROLES=(
    "あなたはメインエージェント（オーケストレーター）です。他のペインのエージェントに指示を送り、全体を統括します。指示送信には ./scripts/send-task.sh を使用してください。"
    "あなたはフロントエンド基盤エージェントです。src/frontend/core/のUI基盤・エディタ機能を担当します。指示を待っています。"
    "あなたはフロントエンド部品エージェントです。src/frontend/components/の個別コンポーネントを担当します。指示を待っています。"
    "あなたはバックエンドAPIエージェントです。src/backend/api/のREST API実装を担当します。指示を待っています。"
    "あなたはデータ永続化エージェントです。src/backend/storage/のデータ永続化を担当します。指示を待っています。"
    "あなたは検索/インデックスエージェントです。src/backend/search/の検索機能を担当します。指示を待っています。"
    "あなたはテストエージェントです。tests/のテスト作成・実行を担当します。指示を待っています。"
    "あなたはドキュメント/レビューエージェントです。docs/のドキュメント作成とコードレビューを担当します。指示を待っています。"
)

for i in {0..7}; do
    tmux send-keys -t $SESSION_NAME:0.$i "claude --dangerously-skip-permissions '以降、日本語で対応願います。${ROLES[$i]}'" Enter
    sleep 0.5
done

# ペイン0を選択
tmux select-pane -t $SESSION_NAME:0.0

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  起動完了！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "ペイン配置:"
echo "┌───────────────┬───────────────┐"
echo "│ 0: メイン     │ 1: FE基盤     │"
echo "├───────────────┼───────────────┤"
echo "│ 2: FE部品     │ 3: BE API     │"
echo "├───────────────┼───────────────┤"
echo "│ 4: データ     │ 5: 検索       │"
echo "├───────────────┼───────────────┤"
echo "│ 6: テスト     │ 7: ドキュメント│"
echo "└───────────────┴───────────────┘"
echo ""
echo "操作:"
echo "  マウスクリック: ペイン選択"
echo "  Ctrl+b d: デタッチ"
echo ""
echo "指示送信（ペイン0から）:"
echo "  ./scripts/send-task.sh 1 \"指示内容\""
echo ""

# 4. tmuxに接続
sleep 2
tmux attach-session -t $SESSION_NAME
