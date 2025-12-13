#!/bin/bash
# ===========================================
# Pre-Tool-Use Hook
# ファイルロック取得スクリプト
# SubAgent間の競合を防止
# ===========================================

TOOL_NAME="$1"
TOOL_INPUT="$2"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCK_DIR="$SCRIPT_DIR/locks"

# ロックディレクトリ作成
mkdir -p "$LOCK_DIR"

# Edit/Write時のみロック処理
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    # jqが利用可能な場合のみパース
    if command -v jq &> /dev/null; then
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null)

        if [ -n "$FILE_PATH" ]; then
            LOCK_FILE="$LOCK_DIR/$(echo "$FILE_PATH" | md5sum | cut -d' ' -f1).lock"

            # ロック確認（30秒以内のロックは有効）
            if [ -f "$LOCK_FILE" ]; then
                LOCK_AGE=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)))
                if [ "$LOCK_AGE" -lt 30 ]; then
                    echo "WARNING: File is locked by another SubAgent: $FILE_PATH" >&2
                    exit 1
                fi
            fi

            # ロック取得
            echo "$$:$(date +%s):$FILE_PATH" > "$LOCK_FILE"
        fi
    fi
fi

exit 0
