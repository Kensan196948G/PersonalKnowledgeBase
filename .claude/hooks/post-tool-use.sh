#!/bin/bash
# ツール実行後のフック - ロック解除

TOOL_NAME="$1"
TOOL_OUTPUT="$2"

LOCK_DIR="/tmp/claude-edit-locks"

# 編集完了時のロック解除
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    # 古いロックファイル（60秒以上）を削除
    find "$LOCK_DIR" -type f -mmin +1 -delete 2>/dev/null || true
fi

exit 0
