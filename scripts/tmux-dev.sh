#!/bin/bash
# 8ペイン並列開発環境起動スクリプト
# Personal Knowledge Base System

SESSION_NAME="pkb-dev"
PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Personal Knowledge Base - Development Environment ===${NC}"

# 既存セッションがあればアタッチ
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo -e "${GREEN}Existing session found. Attaching...${NC}"
    tmux attach-session -t $SESSION_NAME
    exit 0
fi

echo -e "${GREEN}Creating new tmux session with 8 panes...${NC}"

# セッション作成
tmux new-session -d -s $SESSION_NAME -c $PROJECT_DIR
tmux rename-window -t $SESSION_NAME "dev"

# 7回分割して8ペインを作成（分割ごとにtiledを適用して均等配置）
for i in {1..7}; do
    tmux split-window -t $SESSION_NAME -c $PROJECT_DIR
    tmux select-layout -t $SESSION_NAME tiled
done

# ペインボーダーにタイトル表示（bottom=フッター、top=ヘッダー）
tmux set-option -t $SESSION_NAME pane-border-status bottom
tmux set-option -t $SESSION_NAME pane-border-format " [#{pane_index}] #{pane_title} "
tmux set-option -t $SESSION_NAME pane-border-style "fg=white"
tmux set-option -t $SESSION_NAME pane-active-border-style "fg=green,bold"

# 各ペインにタイトル設定（日本語）
tmux select-pane -t $SESSION_NAME:0.0 -T "メインエージェント"
tmux select-pane -t $SESSION_NAME:0.1 -T "フロントエンド基盤"
tmux select-pane -t $SESSION_NAME:0.2 -T "フロントエンド部品"
tmux select-pane -t $SESSION_NAME:0.3 -T "バックエンドAPI"
tmux select-pane -t $SESSION_NAME:0.4 -T "データ永続化"
tmux select-pane -t $SESSION_NAME:0.5 -T "検索/インデックス"
tmux select-pane -t $SESSION_NAME:0.6 -T "テスト"
tmux select-pane -t $SESSION_NAME:0.7 -T "ドキュメント/レビュー"

# 各ペインにラベル表示
ROLES=("メインエージェント" "フロントエンド基盤" "フロントエンド部品" "バックエンドAPI" "データ永続化" "検索/インデックス" "テスト" "ドキュメント/レビュー")
for i in {0..7}; do
    tmux send-keys -t $SESSION_NAME:0.$i "clear && echo '=== Pane $i: ${ROLES[$i]} ==='" Enter 2>/dev/null
done

# ペイン0を選択
tmux select-pane -t $SESSION_NAME:0.0

echo -e "${GREEN}8ペイン作成完了！${NC}"
echo ""
echo "ペイン配置:"
echo "┌───┬───┬───┬───┐"
echo "│ 0 │ 1 │ 2 │ 3 │"
echo "├───┼───┼───┼───┤"
echo "│ 4 │ 5 │ 6 │ 7 │"
echo "└───┴───┴───┴───┘"
echo ""
echo "役割:"
echo "  0: メインエージェント    1: フロントエンド基盤"
echo "  2: フロントエンド部品    3: バックエンドAPI"
echo "  4: データ永続化          5: 検索/インデックス"
echo "  6: テスト                7: ドキュメント/レビュー"
echo ""
echo "操作: Ctrl+b q (番号表示), Ctrl+b o (次へ), Ctrl+b d (離脱)"
echo ""

tmux attach-session -t $SESSION_NAME
