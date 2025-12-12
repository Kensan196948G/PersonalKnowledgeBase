#!/bin/bash
# ツール実行前のフック - 並列開発時のファイルロック確認

TOOL_NAME="$1"
TOOL_INPUT="$2"

LOCK_DIR="/tmp/claude-edit-locks"

# ロックディレクトリがなければ作成
mkdir -p "$LOCK_DIR"

# ファイル編集時のロック確認
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    # jqがインストールされている場合のみパース
    if command -v jq &> /dev/null; then
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

        if [ -n "$FILE_PATH" ]; then
            LOCK_FILE="$LOCK_DIR/$(echo "$FILE_PATH" | md5sum | cut -d' ' -f1)"

            # ロックファイルが存在し、30秒以内に作成されていればブロック
            if [ -f "$LOCK_FILE" ]; then
                LOCK_AGE=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)))
                if [ "$LOCK_AGE" -lt 30 ]; then
                    echo "BLOCK: File is being edited by another agent: $FILE_PATH"
                    exit 1
                fi
            fi

            # ロックを取得
            echo "$$" > "$LOCK_FILE"
        fi
    fi
fi

exit 0
