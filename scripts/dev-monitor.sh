#!/bin/bash
# 開発監視環境起動スクリプト
# 8ペインで開発サーバー・テスト・ログを監視

SESSION_NAME="pkb-dev"
PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Personal Knowledge Base - 開発監視環境 ===${NC}"

# 既存セッションがあればアタッチ
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo -e "${GREEN}既存セッションに接続します...${NC}"
    tmux attach-session -t $SESSION_NAME
    exit 0
fi

echo -e "${GREEN}新規tmuxセッションを作成中...${NC}"

# セッション作成
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
tmux select-pane -t $SESSION_NAME:0.0 -T "Claude Code"
tmux select-pane -t $SESSION_NAME:0.1 -T "Frontend Dev"
tmux select-pane -t $SESSION_NAME:0.2 -T "Backend API"
tmux select-pane -t $SESSION_NAME:0.3 -T "Tests"
tmux select-pane -t $SESSION_NAME:0.4 -T "TypeCheck"
tmux select-pane -t $SESSION_NAME:0.5 -T "Prisma"
tmux select-pane -t $SESSION_NAME:0.6 -T "Docker/DB"
tmux select-pane -t $SESSION_NAME:0.7 -T "Git Status"

# 各ペインで初期コマンドを実行
# Pane 0: Claude Code用（手動起動）
tmux send-keys -t $SESSION_NAME:0.0 "clear && echo '=== Claude Code ===' && echo 'claudeコマンドで起動してください'" C-m

# Pane 1: Frontend開発サーバー
tmux send-keys -t $SESSION_NAME:0.1 "clear && echo '=== Frontend Dev Server ===' && echo 'npm run dev:frontend で起動'" C-m

# Pane 2: Backend APIサーバー
tmux send-keys -t $SESSION_NAME:0.2 "clear && echo '=== Backend API Server ===' && echo 'npm run dev:backend で起動'" C-m

# Pane 3: テスト監視
tmux send-keys -t $SESSION_NAME:0.3 "clear && echo '=== Tests ===' && echo 'npm test で実行'" C-m

# Pane 4: 型チェック
tmux send-keys -t $SESSION_NAME:0.4 "clear && echo '=== TypeScript Check ===' && echo 'npm run typecheck で実行'" C-m

# Pane 5: Prisma Studio
tmux send-keys -t $SESSION_NAME:0.5 "clear && echo '=== Prisma Studio ===' && echo 'npx prisma studio で起動'" C-m

# Pane 6: Docker/DB状態
tmux send-keys -t $SESSION_NAME:0.6 "clear && echo '=== Docker/DB ===' && docker compose ps 2>/dev/null || echo 'Docker未起動'" C-m

# Pane 7: Git状態
tmux send-keys -t $SESSION_NAME:0.7 "clear && echo '=== Git Status ===' && git status -s" C-m

# ペイン0を選択
tmux select-pane -t $SESSION_NAME:0.0

echo -e "${GREEN}8ペイン監視環境作成完了！${NC}"
echo ""
echo "ペイン配置:"
echo "┌─────────┬─────────┬─────────┬─────────┐"
echo "│0 Claude │1 Front  │2 Back   │3 Tests  │"
echo "├─────────┼─────────┼─────────┼─────────┤"
echo "│4 Type   │5 Prisma │6 Docker │7 Git    │"
echo "└─────────┴─────────┴─────────┴─────────┘"
echo ""
echo "操作方法:"
echo "  マウスクリック: ペイン選択"
echo "  Ctrl+b q: ペイン番号表示"
echo "  Ctrl+b d: デタッチ"
echo ""

tmux attach-session -t $SESSION_NAME
