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

# Step 1: 横に3回分割して4ペインを作成
tmux split-window -h -t $SESSION_NAME -c $PROJECT_DIR
tmux split-window -h -t $SESSION_NAME -c $PROJECT_DIR
tmux split-window -h -t $SESSION_NAME -c $PROJECT_DIR

# Step 2: tiledレイアウトで2x2に配置
tmux select-layout -t $SESSION_NAME tiled

# Step 3: 各ペインを縦分割して8ペインに
# 注: tiledレイアウト後、ペインは0,1,2,3となる
tmux split-window -v -t $SESSION_NAME:0.0 -c $PROJECT_DIR
tmux split-window -v -t $SESSION_NAME:0.2 -c $PROJECT_DIR
tmux split-window -v -t $SESSION_NAME:0.4 -c $PROJECT_DIR
tmux split-window -v -t $SESSION_NAME:0.6 -c $PROJECT_DIR

# Step 4: 最終レイアウト調整
tmux select-layout -t $SESSION_NAME tiled

# 各ペインにラベル表示
ROLES=("Main Agent" "Frontend Core" "Frontend Comp" "Backend API" "Backend Store" "Search/Index" "Testing" "Docs/Review")
for i in {0..7}; do
    tmux send-keys -t $SESSION_NAME:0.$i "clear && echo '=== Pane $i: ${ROLES[$i]} ==='" Enter 2>/dev/null
done

# ペイン0を選択
tmux select-pane -t $SESSION_NAME:0.0

echo -e "${GREEN}8 panes created successfully!${NC}"
echo ""
echo "Pane Layout:"
echo "┌───┬───┬───┬───┐"
echo "│ 0 │ 2 │ 4 │ 6 │"
echo "├───┼───┼───┼───┤"
echo "│ 1 │ 3 │ 5 │ 7 │"
echo "└───┴───┴───┴───┘"
echo ""
echo "Roles:"
echo "  0: Main Agent      2: Frontend Comp"
echo "  1: Frontend Core   3: Backend API"
echo "  4: Backend Store   5: Search/Index"
echo "  6: Testing         7: Docs/Review"
echo ""
echo "Commands: Ctrl+b q (numbers), Ctrl+b o (next), Ctrl+b d (detach)"
echo ""

tmux attach-session -t $SESSION_NAME
