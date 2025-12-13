#!/bin/bash
# ===========================================
# Post-Tool-Use Hook
# ファイルロック解除スクリプト
# ===========================================

TOOL_NAME="$1"
TOOL_OUTPUT="$2"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCK_DIR="$SCRIPT_DIR/locks"

# Edit/Write時のみロック解除処理
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    # 古いロックファイル（60秒以上）を削除
    find "$LOCK_DIR" -name "*.lock" -type f -mmin +1 -delete 2>/dev/null || true
fi

exit 0
