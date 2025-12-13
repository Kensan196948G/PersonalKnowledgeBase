#!/bin/bash
# ===========================================
# Post-Tool-Use Hook - 統合版
# 機能:
#   - ロック解除・進捗記録
#   - SQLite進捗ログ
#   - Memory MCP連携（重要情報保存）
#   - SubAgent間コンテキスト更新
# ===========================================

TOOL_NAME="$1"
TOOL_INPUT="$2"
TOOL_OUTPUT="$3"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCK_DIR="$SCRIPT_DIR/locks"
LOG_DIR="$SCRIPT_DIR/logs"
STATUS_FILE="$SCRIPT_DIR/parallel-status.json"
CONTEXT_FILE="$SCRIPT_DIR/subagent-context.json"
MEMORY_QUEUE="$SCRIPT_DIR/memory-queue.json"
DB_HELPER="$SCRIPT_DIR/lib/db_helper.py"
PROGRESS_FILE="$SCRIPT_DIR/progress.log"

# エージェントID取得
AGENT_ID="${CLAUDE_AGENT_ID:-main-$$}"

# ログ関数
log_action() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] [Agent:$AGENT_ID] $message" >> "$LOG_DIR/hooks.log"
}

# SQLite進捗記録
log_to_sqlite() {
    local tool="$1"
    local target="$2"
    local status="$3"
    local details="$4"

    if [ -f "$DB_HELPER" ]; then
        python3 "$DB_HELPER" log_progress "$AGENT_ID" "$tool" "$target" "$status" "$details" 2>/dev/null || true
    fi
}

# SQLiteロック記録
log_lock_to_sqlite() {
    local file_path="$1"
    local action="$2"

    if [ -f "$DB_HELPER" ]; then
        python3 "$DB_HELPER" log_lock "$AGENT_ID" "$file_path" "$action" 2>/dev/null || true
    fi
}

# セッション記憶を保存
save_session_memory() {
    local category="$1"
    local key="$2"
    local value="$3"
    local importance="${4:-normal}"

    if [ -f "$DB_HELPER" ]; then
        python3 "$DB_HELPER" save_memory "$category" "$key" "$value" "$importance" 2>/dev/null || true
    fi

    # Memory MCPキューに追加（Claude Codeが同期）
    if command -v jq &> /dev/null; then
        if [ ! -f "$MEMORY_QUEUE" ]; then
            echo '{"queue":[]}' > "$MEMORY_QUEUE"
        fi
        jq --arg cat "$category" \
           --arg key "$key" \
           --arg val "$value" \
           --arg imp "$importance" \
           --arg time "$(date -Iseconds)" \
           '.queue += [{"category": $cat, "key": $key, "value": $val, "importance": $imp, "time": $time}]' \
           "$MEMORY_QUEUE" > "$MEMORY_QUEUE.tmp" 2>/dev/null && mv "$MEMORY_QUEUE.tmp" "$MEMORY_QUEUE"
    fi
}

# SubAgentコンテキスト更新
update_subagent_context() {
    local context_type="$1"
    local key="$2"
    local value="$3"

    if [ -f "$DB_HELPER" ]; then
        python3 "$DB_HELPER" set_context "$AGENT_ID" "$context_type" "$key" "$value" 2>/dev/null || true
    fi

    if command -v jq &> /dev/null && [ -f "$CONTEXT_FILE" ]; then
        jq --arg agent "$AGENT_ID" \
           --arg type "$context_type" \
           --arg key "$key" \
           --arg value "$value" \
           --arg time "$(date -Iseconds)" \
           '.[$agent] //= {} | .[$agent][$type] //= {} | .[$agent][$type][$key] = {"value": $value, "time": $time}' \
           "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" 2>/dev/null && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
    fi
}

# ステータス更新関数
update_status() {
    local action="$1"
    local file="$2"

    if command -v jq &> /dev/null && [ -f "$STATUS_FILE" ]; then
        case "$action" in
            "unlock")
                jq --arg file "$file" --arg agent "$AGENT_ID" \
                    'del(.locks[$file]) | .agents[$agent].status = "idle"' \
                    "$STATUS_FILE" > "$STATUS_FILE.tmp" 2>/dev/null && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
                ;;
        esac
    fi
}

# 進捗記録（レガシー形式との互換性）
log_progress() {
    local tool="$1"
    local target="$2"
    local status="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] Agent:$AGENT_ID Tool:$tool Target:$target Status:$status" >> "$PROGRESS_FILE"
}

# ===========================================
# メイン処理
# ===========================================

case "$TOOL_NAME" in
    Edit|Write)
        if command -v jq &> /dev/null; then
            FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null)

            if [ -n "$FILE_PATH" ]; then
                LOCK_HASH=$(echo "$FILE_PATH" | md5sum | cut -d' ' -f1)
                LOCK_FILE="$LOCK_DIR/${LOCK_HASH}.lock"

                # 自分のロックのみ解除
                if [ -f "$LOCK_FILE" ]; then
                    LOCK_AGENT=$(cat "$LOCK_FILE" | cut -d':' -f1)
                    if [ "$LOCK_AGENT" == "$AGENT_ID" ]; then
                        rm -f "$LOCK_FILE"
                        update_status "unlock" "$FILE_PATH"
                        log_lock_to_sqlite "$FILE_PATH" "unlock"
                        log_action "INFO" "Lock released: $FILE_PATH"
                    fi
                fi

                # 進捗記録
                log_to_sqlite "$TOOL_NAME" "$FILE_PATH" "completed"
                log_progress "$TOOL_NAME" "$FILE_PATH" "completed"

                # 重要ファイル編集をセッション記憶に保存
                case "$FILE_PATH" in
                    *CLAUDE.md|*schema.prisma|*package.json|*.env)
                        save_session_memory "file_changes" "$FILE_PATH" "modified by $AGENT_ID at $(date -Iseconds)" "high"
                        ;;
                esac

                # SubAgentコンテキスト更新
                update_subagent_context "completed_file" "$FILE_PATH" "$(date -Iseconds)"
            fi
        fi
        ;;

    Bash)
        if command -v jq &> /dev/null; then
            COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null)

            # DBスキーマ変更完了時のロック解除
            if echo "$COMMAND" | grep -qE "(prisma migrate|prisma db push|prisma db pull)"; then
                DB_LOCK="$LOCK_DIR/db-schema.lock"

                if [ -f "$DB_LOCK" ]; then
                    LOCK_AGENT=$(cat "$DB_LOCK" | cut -d':' -f1)
                    if [ "$LOCK_AGENT" == "$AGENT_ID" ]; then
                        rm -f "$DB_LOCK"
                        log_action "INFO" "DB schema lock released"
                    fi
                fi

                log_to_sqlite "Bash" "db-schema" "completed"
                log_progress "Bash" "db-schema" "completed"

                # DBスキーマ変更を重要記憶として保存
                save_session_memory "schema_changes" "prisma_update" "DB schema modified at $(date -Iseconds)" "critical"
            fi

            # テスト実行完了
            if echo "$COMMAND" | grep -qE "(npm test|npx jest|npx vitest)"; then
                log_to_sqlite "Bash" "test" "completed"
                log_progress "Bash" "test" "executed"
                update_subagent_context "task" "test" "completed"

                # テスト結果を記憶（失敗時は重要度高）
                if echo "$TOOL_OUTPUT" | grep -qiE "(fail|error|FAIL|ERROR)"; then
                    save_session_memory "test_results" "last_test" "FAILED at $(date -Iseconds)" "high"
                else
                    save_session_memory "test_results" "last_test" "PASSED at $(date -Iseconds)" "normal"
                fi
            fi

            # ビルド完了
            if echo "$COMMAND" | grep -qE "(npm run build|npx tsc)"; then
                log_to_sqlite "Bash" "build" "completed"
                log_progress "Bash" "build" "executed"
                update_subagent_context "task" "build" "completed"

                # ビルド結果を記憶
                if echo "$TOOL_OUTPUT" | grep -qiE "(error|ERROR)"; then
                    save_session_memory "build_results" "last_build" "FAILED at $(date -Iseconds)" "high"
                else
                    save_session_memory "build_results" "last_build" "SUCCESS at $(date -Iseconds)" "normal"
                fi
            fi

            # Git操作記録
            if echo "$COMMAND" | grep -qE "^git (commit|push|merge)"; then
                save_session_memory "git_operations" "last_operation" "$COMMAND at $(date -Iseconds)" "normal"
            fi
        fi
        ;;

    Task)
        # SubAgent完了記録
        log_to_sqlite "Task" "subagent" "completed"
        log_progress "Task" "subagent" "completed"
        update_subagent_context "subagent" "status" "completed"
        log_action "INFO" "SubAgent task completed"
        ;;
esac

# ===========================================
# クリーンアップ
# ===========================================

# 古いロックファイルの削除（60秒以上経過）
find "$LOCK_DIR" -name "*.lock" -type f -mmin +1 -delete 2>/dev/null || true

# 古いログのローテーション（10MB超過時）
if [ -f "$LOG_DIR/hooks.log" ]; then
    LOG_SIZE=$(stat -c %s "$LOG_DIR/hooks.log" 2>/dev/null || echo 0)
    if [ "$LOG_SIZE" -gt 10485760 ]; then
        mv "$LOG_DIR/hooks.log" "$LOG_DIR/hooks.log.$(date +%Y%m%d)"
        log_action "INFO" "Log rotated"
    fi
fi

# 古いMemoryキューのクリーンアップ（処理済みアイテム削除）
if [ -f "$MEMORY_QUEUE" ] && command -v jq &> /dev/null; then
    QUEUE_SIZE=$(jq '.queue | length' "$MEMORY_QUEUE" 2>/dev/null || echo 0)
    if [ "$QUEUE_SIZE" -gt 100 ]; then
        jq '.queue = .queue[-50:]' "$MEMORY_QUEUE" > "$MEMORY_QUEUE.tmp" && mv "$MEMORY_QUEUE.tmp" "$MEMORY_QUEUE"
    fi
fi

exit 0
