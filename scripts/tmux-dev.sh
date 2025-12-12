#!/bin/bash
# 8ペイン並列開発環境起動スクリプト
# Personal Knowledge Base System

SESSION_NAME="pkb-dev"
PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"

# カラー出力
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Personal Knowledge Base - Development Environment ===${NC}"

# 既存セッションがあれば確認
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo -e "${GREEN}Existing session found. Attaching...${NC}"
    tmux attach-session -t $SESSION_NAME
    exit 0
fi

echo -e "${GREEN}Creating new tmux session with 8 panes...${NC}"

# 新規セッション作成
tmux new-session -d -s $SESSION_NAME -c $PROJECT_DIR

# ウィンドウ名設定
tmux rename-window -t $SESSION_NAME "dev"

# ウィンドウ分割（4x2グリッド = 8ペイン）
# 最初の水平分割
tmux split-window -h -t $SESSION_NAME -c $PROJECT_DIR
tmux split-window -h -t $SESSION_NAME:0.0 -c $PROJECT_DIR
tmux split-window -h -t $SESSION_NAME:0.2 -c $PROJECT_DIR

# 各ペインを垂直分割
tmux split-window -v -t $SESSION_NAME:0.0 -c $PROJECT_DIR
tmux split-window -v -t $SESSION_NAME:0.1 -c $PROJECT_DIR
tmux split-window -v -t $SESSION_NAME:0.2 -c $PROJECT_DIR
tmux split-window -v -t $SESSION_NAME:0.3 -c $PROJECT_DIR

# ペインのレイアウト調整
tmux select-layout -t $SESSION_NAME tiled

# 各ペインにタイトルを設定（識別用）
tmux select-pane -t $SESSION_NAME:0.0 -T "Main Agent"
tmux select-pane -t $SESSION_NAME:0.1 -T "Frontend Core"
tmux select-pane -t $SESSION_NAME:0.2 -T "Frontend Components"
tmux select-pane -t $SESSION_NAME:0.3 -T "Backend API"
tmux select-pane -t $SESSION_NAME:0.4 -T "Backend Storage"
tmux select-pane -t $SESSION_NAME:0.5 -T "Search/Index"
tmux select-pane -t $SESSION_NAME:0.6 -T "Testing"
tmux select-pane -t $SESSION_NAME:0.7 -T "Docs/Review"

# 最初のペイン（Main Agent）を選択
tmux select-pane -t $SESSION_NAME:0.0

# 情報表示
echo -e "${GREEN}Session created successfully!${NC}"
echo ""
echo "Pane Layout:"
echo "  0: Main Agent (Orchestrator)"
echo "  1: Frontend Core"
echo "  2: Frontend Components"
echo "  3: Backend API"
echo "  4: Backend Storage"
echo "  5: Search/Index"
echo "  6: Testing"
echo "  7: Docs/Review"
echo ""
echo "Useful tmux commands:"
echo "  Ctrl+b q     - Show pane numbers"
echo "  Ctrl+b o     - Next pane"
echo "  Ctrl+b ;     - Previous pane"
echo "  Alt+Arrow    - Move between panes"
echo "  Ctrl+b d     - Detach session"
echo ""

# セッションにアタッチ
tmux attach-session -t $SESSION_NAME
