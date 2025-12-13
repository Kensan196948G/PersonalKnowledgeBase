#!/usr/bin/env python3
"""
SQLite Database Helper for Hooks Integration
SubAgent間連携・進捗追跡・セッション記憶を管理
"""

import sqlite3
import json
import sys
import os
from datetime import datetime
from pathlib import Path

# データベースパス
DB_PATH = Path(__file__).parent.parent.parent.parent / "data" / "knowledge.db"

def get_connection():
    """データベース接続を取得"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def log_progress(agent_id: str, tool_name: str, target: str, status: str, details: str = None):
    """進捗をログに記録"""
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO hook_progress (timestamp, agent_id, tool_name, target, status, details)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (datetime.now().isoformat(), agent_id, tool_name, target, status, details)
        )
        conn.commit()
    finally:
        conn.close()

def log_lock_action(agent_id: str, file_path: str, action: str, conflict_with: str = None):
    """ロックアクションを記録"""
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO lock_history (timestamp, agent_id, file_path, action, conflict_with)
               VALUES (?, ?, ?, ?, ?)""",
            (datetime.now().isoformat(), agent_id, file_path, action, conflict_with)
        )
        conn.commit()
    finally:
        conn.close()

def set_subagent_context(agent_id: str, context_type: str, key: str, value: str, expires_at: str = None):
    """SubAgentコンテキストを設定"""
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO subagent_context (timestamp, agent_id, context_type, key, value, expires_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (datetime.now().isoformat(), agent_id, context_type, key, value, expires_at)
        )
        conn.commit()
    finally:
        conn.close()

def get_subagent_context(context_type: str = None, key: str = None):
    """SubAgentコンテキストを取得"""
    conn = get_connection()
    try:
        query = "SELECT * FROM subagent_context WHERE 1=1"
        params = []

        if context_type:
            query += " AND context_type = ?"
            params.append(context_type)
        if key:
            query += " AND key = ?"
            params.append(key)

        query += " ORDER BY timestamp DESC"

        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def save_session_memory(category: str, key: str, value: str, importance: str = "normal"):
    """セッション間記憶を保存"""
    conn = get_connection()
    try:
        now = datetime.now().isoformat()
        conn.execute(
            """INSERT INTO session_memory (created_at, updated_at, category, key, value, importance)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET
                   updated_at = excluded.updated_at,
                   value = excluded.value,
                   importance = excluded.importance""",
            (now, now, category, key, value, importance)
        )
        conn.commit()
    finally:
        conn.close()

def get_session_memory(category: str = None, key: str = None):
    """セッション間記憶を取得"""
    conn = get_connection()
    try:
        query = "SELECT * FROM session_memory WHERE 1=1"
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)
        if key:
            query += " AND key = ?"
            params.append(key)

        query += " ORDER BY updated_at DESC"

        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def log_github_issue(issue_number: int, issue_url: str, trigger_type: str, trigger_details: str = None):
    """GitHub Issue作成を記録"""
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO github_issues (created_at, issue_number, issue_url, trigger_type, trigger_details, status)
               VALUES (?, ?, ?, ?, ?, 'created')""",
            (datetime.now().isoformat(), issue_number, issue_url, trigger_type, trigger_details)
        )
        conn.commit()
    finally:
        conn.close()

def get_recent_progress(limit: int = 20):
    """最近の進捗を取得"""
    conn = get_connection()
    try:
        cursor = conn.execute(
            """SELECT * FROM hook_progress ORDER BY timestamp DESC LIMIT ?""",
            (limit,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def get_active_agents():
    """アクティブなエージェントを取得"""
    conn = get_connection()
    try:
        cursor = conn.execute(
            """SELECT DISTINCT agent_id, MAX(timestamp) as last_activity
               FROM hook_progress
               WHERE timestamp > datetime('now', '-5 minutes')
               GROUP BY agent_id"""
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

# CLI インターフェース
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: db_helper.py <command> [args...]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "log_progress":
        # log_progress <agent_id> <tool_name> <target> <status> [details]
        agent_id = sys.argv[2]
        tool_name = sys.argv[3]
        target = sys.argv[4]
        status = sys.argv[5]
        details = sys.argv[6] if len(sys.argv) > 6 else None
        log_progress(agent_id, tool_name, target, status, details)

    elif command == "log_lock":
        # log_lock <agent_id> <file_path> <action> [conflict_with]
        agent_id = sys.argv[2]
        file_path = sys.argv[3]
        action = sys.argv[4]
        conflict_with = sys.argv[5] if len(sys.argv) > 5 else None
        log_lock_action(agent_id, file_path, action, conflict_with)

    elif command == "set_context":
        # set_context <agent_id> <context_type> <key> <value>
        agent_id = sys.argv[2]
        context_type = sys.argv[3]
        key = sys.argv[4]
        value = sys.argv[5]
        set_subagent_context(agent_id, context_type, key, value)

    elif command == "get_context":
        # get_context [context_type] [key]
        context_type = sys.argv[2] if len(sys.argv) > 2 else None
        key = sys.argv[3] if len(sys.argv) > 3 else None
        result = get_subagent_context(context_type, key)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif command == "save_memory":
        # save_memory <category> <key> <value> [importance]
        category = sys.argv[2]
        key = sys.argv[3]
        value = sys.argv[4]
        importance = sys.argv[5] if len(sys.argv) > 5 else "normal"
        save_session_memory(category, key, value, importance)

    elif command == "get_memory":
        # get_memory [category] [key]
        category = sys.argv[2] if len(sys.argv) > 2 else None
        key = sys.argv[3] if len(sys.argv) > 3 else None
        result = get_session_memory(category, key)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif command == "log_issue":
        # log_issue <issue_number> <issue_url> <trigger_type> [trigger_details]
        issue_number = int(sys.argv[2])
        issue_url = sys.argv[3]
        trigger_type = sys.argv[4]
        trigger_details = sys.argv[5] if len(sys.argv) > 5 else None
        log_github_issue(issue_number, issue_url, trigger_type, trigger_details)

    elif command == "recent_progress":
        # recent_progress [limit]
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        result = get_recent_progress(limit)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif command == "active_agents":
        result = get_active_agents()
        print(json.dumps(result, ensure_ascii=False, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
