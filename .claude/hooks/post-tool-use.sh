#!/bin/bash
# ===========================================
# Post-Tool-Use Hook
# ツール実行後の自動処理
# ===========================================

TOOL_NAME="$1"
TOOL_OUTPUT="$2"

PROJECT_DIR="/mnt/LinuxHDD/PersonalKnowledgeBase"
LOCK_DIR="/tmp/claude-pkb-locks"

# --------------------------------------------------
# Edit/Write: ロック解除
# --------------------------------------------------
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    # 古いロックファイル（60秒以上）を削除
    find "$LOCK_DIR" -type f -mmin +1 -delete 2>/dev/null || true
fi

exit 0
