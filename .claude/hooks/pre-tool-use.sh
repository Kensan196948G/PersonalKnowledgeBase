#!/bin/bash
# ===========================================
# Pre-Tool-Use Hook - 統合版
# 機能:
#   - SubAgent間ファイル競合防止
#   - SQLite進捗ログ
#   - GitHub Issue自動作成（競合時）
#   - SubAgent間コンテキスト共有
# ===========================================

TOOL_NAME="$1"
TOOL_INPUT="$2"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCK_DIR="$SCRIPT_DIR/locks"
LOG_DIR="$SCRIPT_DIR/logs"
STATUS_FILE="$SCRIPT_DIR/parallel-status.json"
CONTEXT_FILE="$SCRIPT_DIR/subagent-context.json"
DB_HELPER="$SCRIPT_DIR/lib/db_helper.py"

# ディレクトリ作成
mkdir -p "$LOCK_DIR" "$LOG_DIR"

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
    local conflict_with="$3"

    if [ -f "$DB_HELPER" ]; then
        python3 "$DB_HELPER" log_lock "$AGENT_ID" "$file_path" "$action" "$conflict_with" 2>/dev/null || true
    fi
}

# SubAgentコンテキスト設定
set_subagent_context() {
    local context_type="$1"
    local key="$2"
    local value="$3"

    if [ -f "$DB_HELPER" ]; then
        python3 "$DB_HELPER" set_context "$AGENT_ID" "$context_type" "$key" "$value" 2>/dev/null || true
    fi

    # JSONファイルにも保存（即時共有用）
    if command -v jq &> /dev/null; then
        if [ ! -f "$CONTEXT_FILE" ]; then
            echo '{}' > "$CONTEXT_FILE"
        fi
        jq --arg agent "$AGENT_ID" \
           --arg type "$context_type" \
           --arg key "$key" \
           --arg value "$value" \
           --arg time "$(date -Iseconds)" \
           '.[$agent] //= {} | .[$agent][$type] //= {} | .[$agent][$type][$key] = {"value": $value, "time": $time}' \
           "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" 2>/dev/null && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
    fi
}

# GitHub Issue作成（競合時）
create_conflict_issue() {
    local file_path="$1"
    local locked_by="$2"
    local lock_age="$3"

    # GitHub Issue作成（gh CLIが利用可能な場合）
    if command -v gh &> /dev/null; then
        # リポジトリ確認
        if gh repo view &> /dev/null; then
            local issue_title="[Hooks] ファイル競合検出: $(basename "$file_path")"
            local issue_body="## 競合情報

| 項目 | 値 |
|------|-----|
| ファイル | \`$file_path\` |
| ロック保持 | Agent: $locked_by |
| 経過時間 | ${lock_age}秒 |
| 検出Agent | $AGENT_ID |
| 検出時刻 | $(date '+%Y-%m-%d %H:%M:%S') |

## 対処方法
1. 30秒後に自動解除されます
2. 緊急の場合: \`.claude/hooks/locks/\` 内のロックファイルを削除

---
*このIssueはHooksにより自動作成されました*"

            # Issue作成（バックグラウンド、エラー無視）
            local result
            result=$(gh issue create --title "$issue_title" --body "$issue_body" --label "hooks,conflict" 2>/dev/null) || true

            if [ -n "$result" ]; then
                local issue_number=$(echo "$result" | grep -oP '\d+$')
                log_action "INFO" "GitHub Issue created: $result"

                # SQLiteに記録
                if [ -f "$DB_HELPER" ]; then
                    python3 "$DB_HELPER" log_issue "$issue_number" "$result" "file_conflict" "$file_path" 2>/dev/null || true
                fi
            fi
        fi
    fi
}

# ステータス更新関数
update_status() {
    local action="$1"
    local file="$2"
    local timestamp=$(date '+%Y-%m-%dT%H:%M:%S')

    if command -v jq &> /dev/null; then
        if [ ! -f "$STATUS_FILE" ]; then
            echo '{"agents":{},"locks":{}}' > "$STATUS_FILE"
        fi

        case "$action" in
            "lock")
                jq --arg agent "$AGENT_ID" --arg file "$file" --arg time "$timestamp" \
                    '.locks[$file] = {"agent": $agent, "time": $time} | .agents[$agent] = {"status": "working", "file": $file, "time": $time}' \
                    "$STATUS_FILE" > "$STATUS_FILE.tmp" 2>/dev/null && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
                ;;
            "unlock")
                jq --arg file "$file" --arg agent "$AGENT_ID" \
                    'del(.locks[$file]) | .agents[$agent].status = "idle"' \
                    "$STATUS_FILE" > "$STATUS_FILE.tmp" 2>/dev/null && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
                ;;
        esac
    fi
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

                # ロック確認
                if [ -f "$LOCK_FILE" ]; then
                    LOCK_INFO=$(cat "$LOCK_FILE")
                    LOCK_AGENT=$(echo "$LOCK_INFO" | cut -d':' -f1)
                    LOCK_TIME=$(echo "$LOCK_INFO" | cut -d':' -f2)
                    CURRENT_TIME=$(date +%s)
                    LOCK_AGE=$((CURRENT_TIME - LOCK_TIME))

                    # 同一エージェントの場合はロック更新
                    if [ "$LOCK_AGENT" == "$AGENT_ID" ]; then
                        echo "$AGENT_ID:$CURRENT_TIME:$FILE_PATH" > "$LOCK_FILE"
                        log_action "INFO" "Lock renewed: $FILE_PATH"
                    # 30秒以内のロックは競合
                    elif [ "$LOCK_AGE" -lt 30 ]; then
                        log_action "WARN" "Conflict detected: $FILE_PATH (Locked by: $LOCK_AGENT)"

                        # SQLiteに競合記録
                        log_lock_to_sqlite "$FILE_PATH" "conflict" "$LOCK_AGENT"

                        # GitHub Issue作成
                        create_conflict_issue "$FILE_PATH" "$LOCK_AGENT" "$LOCK_AGE"

                        # SubAgentコンテキストに競合情報を記録
                        set_subagent_context "conflict" "$FILE_PATH" "locked_by:$LOCK_AGENT"

                        echo "ERROR: ファイルが他のSubAgentによってロックされています" >&2
                        echo "  ファイル: $FILE_PATH" >&2
                        echo "  ロック保持: Agent $LOCK_AGENT" >&2
                        echo "  経過時間: ${LOCK_AGE}秒" >&2
                        echo "  対処: 30秒後に再試行するか、別のファイルを編集してください" >&2
                        exit 1
                    else
                        log_action "INFO" "Stale lock removed: $FILE_PATH"
                    fi
                fi

                # 新規ロック取得
                echo "$AGENT_ID:$(date +%s):$FILE_PATH" > "$LOCK_FILE"
                update_status "lock" "$FILE_PATH"
                log_lock_to_sqlite "$FILE_PATH" "lock"
                log_to_sqlite "$TOOL_NAME" "$FILE_PATH" "started"
                log_action "INFO" "Lock acquired: $FILE_PATH"

                # SubAgentコンテキストに作業ファイルを記録
                set_subagent_context "working_file" "current" "$FILE_PATH"
            fi
        fi
        ;;

    Bash)
        if command -v jq &> /dev/null; then
            COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null)

            # DBスキーマ変更コマンドの検出
            if echo "$COMMAND" | grep -qE "(prisma migrate|prisma db push|prisma db pull)"; then
                DB_LOCK="$LOCK_DIR/db-schema.lock"

                if [ -f "$DB_LOCK" ]; then
                    LOCK_INFO=$(cat "$DB_LOCK")
                    LOCK_AGENT=$(echo "$LOCK_INFO" | cut -d':' -f1)
                    LOCK_TIME=$(echo "$LOCK_INFO" | cut -d':' -f2)
                    CURRENT_TIME=$(date +%s)
                    LOCK_AGE=$((CURRENT_TIME - LOCK_TIME))

                    if [ "$LOCK_AGENT" != "$AGENT_ID" ] && [ "$LOCK_AGE" -lt 60 ]; then
                        log_action "WARN" "DB schema operation blocked (locked by: $LOCK_AGENT)"
                        log_to_sqlite "Bash" "db-schema" "blocked" "locked_by:$LOCK_AGENT"
                        echo "ERROR: DBスキーマが他のSubAgentによって変更中です" >&2
                        echo "  60秒後に再試行してください" >&2
                        exit 1
                    fi
                fi

                echo "$AGENT_ID:$(date +%s):db-schema" > "$DB_LOCK"
                log_to_sqlite "Bash" "db-schema" "started"
                log_action "INFO" "DB schema lock acquired"
            fi

            # テスト/ビルド開始記録
            if echo "$COMMAND" | grep -qE "(npm test|npx jest|npx vitest)"; then
                log_to_sqlite "Bash" "test" "started"
                set_subagent_context "task" "test" "running"
            fi

            if echo "$COMMAND" | grep -qE "(npm run build|npx tsc)"; then
                log_to_sqlite "Bash" "build" "started"
                set_subagent_context "task" "build" "running"
            fi
        fi
        ;;

    Task)
        # SubAgent起動記録
        log_to_sqlite "Task" "subagent" "started"
        set_subagent_context "subagent" "spawned" "true"
        log_action "INFO" "SubAgent task started"
        ;;
esac

exit 0
