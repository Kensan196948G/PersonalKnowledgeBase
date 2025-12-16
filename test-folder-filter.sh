#!/bin/bash

# フォルダフィルタリング機能のテストスクリプト

echo "========================================="
echo "フォルダフィルタリング機能テスト"
echo "========================================="
echo ""

# OneNoteフォルダのID
ONENOTE_FOLDER_ID="fd46f1aa-06c4-4b49-ae92-fc304d5f61ff"

echo "1. 全ノートを取得（フィルタなし）"
echo "-----------------------------------------"
TOTAL_NOTES=$(curl -s "http://localhost:3000/api/notes" | jq -r '.count')
echo "全ノート数: $TOTAL_NOTES"
echo ""

echo "2. OneNoteフォルダでフィルタリング"
echo "-----------------------------------------"
echo "フォルダID: $ONENOTE_FOLDER_ID"
FILTERED_NOTES=$(curl -s "http://localhost:3000/api/notes?folderId=$ONENOTE_FOLDER_ID" | jq -r '.count')
echo "フィルタ後のノート数: $FILTERED_NOTES"
echo ""

echo "3. フィルタされたノートの詳細"
echo "-----------------------------------------"
curl -s "http://localhost:3000/api/notes?folderId=$ONENOTE_FOLDER_ID" | jq '.data | map({title: .title, folderId: .folderId})'
echo ""

echo "4. プロジェクトフォルダでフィルタリング"
echo "-----------------------------------------"
PROJECT_FOLDER_ID=$(curl -s "http://localhost:3000/api/folders" | jq -r '.data[] | select(.name == "プロジェクト") | .id')
echo "フォルダID: $PROJECT_FOLDER_ID"
PROJECT_NOTES=$(curl -s "http://localhost:3000/api/notes?folderId=$PROJECT_FOLDER_ID" | jq -r '.count')
echo "フィルタ後のノート数: $PROJECT_NOTES"
echo ""

echo "========================================="
echo "テスト完了"
echo "========================================="
