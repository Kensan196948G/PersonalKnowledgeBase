#!/bin/bash
# ===========================================
# 並列開発ステータス確認スクリプト - 統合版
# SubAgent連携・SQLite・Memory MCP対応
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCK_DIR="$SCRIPT_DIR/locks"
LOG_DIR="$SCRIPT_DIR/logs"
STATUS_FILE="$SCRIPT_DIR/parallel-status.json"
CONTEXT_FILE="$SCRIPT_DIR/subagent-context.json"
MEMORY_QUEUE="$SCRIPT_DIR/memory-queue.json"
DB_HELPER="$SCRIPT_DIR/lib/db_helper.py"
PROGRESS_FILE="$SCRIPT_DIR/progress.log"

echo "=========================================="
echo " 並列開発ステータス (統合版)"
echo "=========================================="
echo ""

# ファイルロック状態
echo "📁 ファイルロック状態:"
echo "-------------------------------------------"
if [ -d "$LOCK_DIR" ] && [ "$(ls -A $LOCK_DIR 2>/dev/null)" ]; then
    for lock in "$LOCK_DIR"/*.lock; do
        if [ -f "$lock" ]; then
            info=$(cat "$lock")
            agent=$(echo "$info" | cut -d':' -f1)
            time=$(echo "$info" | cut -d':' -f2)
            file=$(echo "$info" | cut -d':' -f3-)
            age=$(($(date +%s) - time))
            echo "  🔒 $file"
            echo "     Agent: $agent | 経過: ${age}秒"
        fi
    done
else
    echo "  ロックなし"
fi
echo ""

# SubAgentコンテキスト
echo "🤖 SubAgentコンテキスト:"
echo "-------------------------------------------"
if [ -f "$CONTEXT_FILE" ] && command -v jq &> /dev/null; then
    jq -r 'to_entries[] | "  Agent: \(.key)\n" + (.value | to_entries | map("    \(.key): \(.value | to_entries | map("\(.key)=\(.value.value)") | join(", "))") | join("\n"))' "$CONTEXT_FILE" 2>/dev/null || echo "  コンテキストなし"
else
    echo "  コンテキストなし"
fi
echo ""

# SQLite進捗（最新5件）
echo "📊 最新の進捗 (SQLite):"
echo "-------------------------------------------"
if [ -f "$DB_HELPER" ]; then
    python3 "$DB_HELPER" recent_progress 5 2>/dev/null | jq -r '.[] | "  [\(.timestamp)] \(.agent_id): \(.tool_name) -> \(.target) (\(.status))"' 2>/dev/null || echo "  データなし"
else
    echo "  DB Helperが見つかりません"
fi
echo ""

# アクティブエージェント
echo "🏃 アクティブエージェント (5分以内):"
echo "-------------------------------------------"
if [ -f "$DB_HELPER" ]; then
    python3 "$DB_HELPER" active_agents 2>/dev/null | jq -r '.[] | "  \(.agent_id): 最終活動 \(.last_activity)"' 2>/dev/null || echo "  なし"
else
    echo "  DB Helperが見つかりません"
fi
echo ""

# Memory MCPキュー
echo "💾 Memory MCPキュー:"
echo "-------------------------------------------"
if [ -f "$MEMORY_QUEUE" ] && command -v jq &> /dev/null; then
    queue_size=$(jq '.queue | length' "$MEMORY_QUEUE" 2>/dev/null || echo 0)
    echo "  待機中: ${queue_size}件"
    if [ "$queue_size" -gt 0 ]; then
        jq -r '.queue[-3:] | .[] | "  [\(.importance)] \(.category)/\(.key)"' "$MEMORY_QUEUE" 2>/dev/null || true
    fi
else
    echo "  キューなし"
fi
echo ""

# セッション記憶（重要度high以上）
echo "🧠 セッション記憶 (重要度: high以上):"
echo "-------------------------------------------"
if [ -f "$DB_HELPER" ]; then
    python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR/lib')
from db_helper import get_session_memory
memories = get_session_memory()
high_memories = [m for m in memories if m.get('importance') in ('high', 'critical')][:5]
for m in high_memories:
    print(f\"  [{m['importance'].upper()}] {m['category']}/{m['key']}\")
if not high_memories:
    print('  重要な記憶なし')
" 2>/dev/null || echo "  データなし"
else
    echo "  DB Helperが見つかりません"
fi
echo ""

# 最新ログ
echo "📝 最新ログ (5行):"
echo "-------------------------------------------"
if [ -f "$LOG_DIR/hooks.log" ]; then
    tail -5 "$LOG_DIR/hooks.log" | sed 's/^/  /'
else
    echo "  ログなし"
fi
echo ""

# 統計情報
echo "📈 統計情報:"
echo "-------------------------------------------"
if [ -f "$PROGRESS_FILE" ]; then
    total=$(wc -l < "$PROGRESS_FILE" 2>/dev/null || echo 0)
    today=$(grep "$(date +%Y-%m-%d)" "$PROGRESS_FILE" 2>/dev/null | wc -l || echo 0)
    echo "  総進捗記録: ${total}件"
    echo "  本日の記録: ${today}件"
fi

if [ -f "$DB_HELPER" ]; then
    python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR/lib')
from db_helper import get_connection
conn = get_connection()
try:
    cursor = conn.execute('SELECT COUNT(*) FROM hook_progress')
    total = cursor.fetchone()[0]
    cursor = conn.execute('SELECT COUNT(DISTINCT agent_id) FROM hook_progress')
    agents = cursor.fetchone()[0]
    cursor = conn.execute('SELECT COUNT(*) FROM lock_history WHERE action = \"conflict\"')
    conflicts = cursor.fetchone()[0]
    print(f'  SQLite進捗: {total}件')
    print(f'  ユニークAgent: {agents}')
    print(f'  競合発生回数: {conflicts}')
finally:
    conn.close()
" 2>/dev/null || true
fi

echo ""
echo "=========================================="
