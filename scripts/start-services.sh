#!/bin/bash
# 開発サービス一括起動スクリプト
# tmux監視環境の各ペインでサービスを起動

SESSION_NAME="pkb-dev"
PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== 開発サービス起動 ===${NC}"

# セッション確認
if ! tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo -e "${YELLOW}tmuxセッションがありません。${NC}"
    echo "先に ./scripts/dev-monitor.sh を実行してください。"
    exit 1
fi

# Dockerが起動しているか確認
if ! docker compose ps --quiet 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}PostgreSQLを起動中...${NC}"
    docker compose up -d
    sleep 3
fi

echo "各ペインでサービスを起動..."

# Pane 1: Frontend開発サーバー
tmux send-keys -t $SESSION_NAME:0.1 "npm run dev:frontend" C-m

# Pane 2: Backend APIサーバー
tmux send-keys -t $SESSION_NAME:0.2 "npm run dev:backend" C-m

# Pane 3: テスト（watchモード）
tmux send-keys -t $SESSION_NAME:0.3 "npm run test:watch 2>/dev/null || npm test" C-m

# Pane 4: 型チェック
tmux send-keys -t $SESSION_NAME:0.4 "npm run typecheck" C-m

# Pane 6: Docker状態監視
tmux send-keys -t $SESSION_NAME:0.6 "watch -n 5 'docker compose ps'" C-m

# Pane 7: Git状態監視
tmux send-keys -t $SESSION_NAME:0.7 "watch -n 10 'git status -s && echo \"\" && git log --oneline -3'" C-m

echo ""
echo -e "${GREEN}サービス起動完了！${NC}"
echo ""
echo "起動したサービス:"
echo "  ペイン1: Frontend開発サーバー"
echo "  ペイン2: Backend APIサーバー"
echo "  ペイン3: テスト実行"
echo "  ペイン4: 型チェック"
echo "  ペイン6: Docker監視"
echo "  ペイン7: Git監視"
echo ""
echo "ペイン0でClaude Codeを起動: claude"
echo "ペイン5でPrisma Studio: npx prisma studio"
