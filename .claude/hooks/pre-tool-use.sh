#!/bin/bash
# ===========================================
# Pre-Tool-Use Hook
# ツール実行前の自動チェック
# ===========================================

TOOL_NAME="$1"
TOOL_INPUT="$2"

PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"
LOCK_DIR="/tmp/claude-pkb-locks"

# ロックディレクトリ作成
mkdir -p "$LOCK_DIR"

# --------------------------------------------------
# Edit/Write: ファイルロック確認（SubAgent競合防止）
# --------------------------------------------------
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    if command -v jq &> /dev/null; then
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

        if [ -n "$FILE_PATH" ]; then
            LOCK_FILE="$LOCK_DIR/$(echo "$FILE_PATH" | md5sum | cut -d' ' -f1)"

            # 30秒以内のロックがあればブロック
            if [ -f "$LOCK_FILE" ]; then
                LOCK_AGE=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)))
                if [ "$LOCK_AGE" -lt 30 ]; then
                    echo "BLOCK: ファイル編集中: $FILE_PATH"
                    exit 1
                fi
            fi

            # ロック取得
            echo "$$:$(date +%s)" > "$LOCK_FILE"
        fi
    fi
fi

exit 0
