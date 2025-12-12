#!/bin/bash
# 並列開発デモスクリプト
# 8ペインで異なるタスクを同時実行

SESSION_NAME="pkb-dev"
PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== 並列開発デモ ===${NC}"
echo ""

# セッション確認
if ! tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo -e "${YELLOW}tmuxセッションが見つかりません。${NC}"
    echo "まず以下を実行してください:"
    echo "  ./scripts/tmux-dev.sh"
    exit 1
fi

# ペイン数確認
PANE_COUNT=$(tmux list-panes -t $SESSION_NAME 2>/dev/null | wc -l)
if [ "$PANE_COUNT" -lt 8 ]; then
    echo -e "${YELLOW}ペイン数が不足しています (現在: $PANE_COUNT)${NC}"
    echo "セッションを再作成してください:"
    echo "  tmux kill-session -t $SESSION_NAME"
    echo "  ./scripts/tmux-dev.sh"
    exit 1
fi

echo -e "${GREEN}8ペインにコマンドを送信中...${NC}"
echo ""

# Pane 0: Main Agent - システム監視
tmux send-keys -t $SESSION_NAME:0.0 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.0 "echo '=== Pane 0: Main Agent - システム監視 ===' && sleep 1" Enter
tmux send-keys -t $SESSION_NAME:0.0 "watch -n 3 'echo \"API Status:\"; curl -s http://localhost:3000/api/health | jq -r \".status + \\\" - DB: \\\" + .database\" 2>/dev/null || echo \"Server not running\"'" Enter

# Pane 1: Frontend Core - 開発サーバー
tmux send-keys -t $SESSION_NAME:0.1 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.1 "echo '=== Pane 1: Frontend Core ===' && sleep 1" Enter
tmux send-keys -t $SESSION_NAME:0.1 "cd $PROJECT_DIR && npm run dev:frontend 2>&1" Enter

# Pane 2: Frontend Components - 型チェック
tmux send-keys -t $SESSION_NAME:0.2 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.2 "echo '=== Pane 2: Frontend Comp - 型チェック ===' && sleep 1" Enter
tmux send-keys -t $SESSION_NAME:0.2 "cd $PROJECT_DIR && npm run typecheck 2>&1" Enter

# Pane 3: Backend API - サーバー
tmux send-keys -t $SESSION_NAME:0.3 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.3 "echo '=== Pane 3: Backend API ===' && sleep 1" Enter
tmux send-keys -t $SESSION_NAME:0.3 "cd $PROJECT_DIR && npm run dev:backend 2>&1" Enter

# Pane 4: Backend Storage - DB操作
tmux send-keys -t $SESSION_NAME:0.4 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.4 "echo '=== Pane 4: Backend Store - DB操作 ===' && sleep 2" Enter
tmux send-keys -t $SESSION_NAME:0.4 "curl -s -X POST http://localhost:3000/api/notes -H 'Content-Type: application/json' -d '{\"title\":\"並列デモノート\",\"content\":\"8ペインから作成\"}' | jq 2>/dev/null || echo 'Waiting for server...'" Enter

# Pane 5: Search/Index - テスト
tmux send-keys -t $SESSION_NAME:0.5 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.5 "echo '=== Pane 5: Search/Index - テスト ===' && sleep 1" Enter
tmux send-keys -t $SESSION_NAME:0.5 "cd $PROJECT_DIR && npm run test:backend 2>&1" Enter

# Pane 6: Testing - ファイル監視
tmux send-keys -t $SESSION_NAME:0.6 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.6 "echo '=== Pane 6: Testing - ファイル監視 ===' && sleep 1" Enter
tmux send-keys -t $SESSION_NAME:0.6 "watch -n 5 'echo \"Recently modified:\"; ls -lt $PROJECT_DIR/src/**/*.ts 2>/dev/null | head -5'" Enter

# Pane 7: Docs/Review - Git状態
tmux send-keys -t $SESSION_NAME:0.7 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.7 "echo '=== Pane 7: Docs/Review - Git ===' && sleep 1" Enter
tmux send-keys -t $SESSION_NAME:0.7 "watch -n 5 'cd $PROJECT_DIR && git status -s && echo \"\" && git log --oneline -3'" Enter

echo -e "${GREEN}デモ開始！${NC}"
echo ""
echo "各ペインの動作:"
echo "  0: システム監視 (API health)"
echo "  1: Vite開発サーバー"
echo "  2: TypeScript型チェック"
echo "  3: Express APIサーバー"
echo "  4: ノート作成テスト"
echo "  5: Jestテスト実行"
echo "  6: ファイル変更監視"
echo "  7: Git状態監視"
echo ""
echo "tmuxに接続: tmux attach -t $SESSION_NAME"
