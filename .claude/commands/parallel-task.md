# 並列タスク実行

$ARGUMENTS のタスクを以下のSubAgentに分散して実行してください。

## 役割分担ルール

| Agent | 担当 | ディレクトリ |
|-------|------|-------------|
| Agent 1 | Frontend Core | src/frontend/core/ |
| Agent 2 | Frontend Components | src/frontend/components/ |
| Agent 3 | Backend API | src/backend/api/ |
| Agent 4 | Backend Storage | src/backend/storage/ |
| Agent 5 | Search/Index | src/backend/search/ |
| Agent 6 | Testing | tests/ |
| Agent 7 | Docs/Review | docs/ |

## 実行手順

1. タスクを分析し、関連するコンポーネントを特定
2. 各AgentにTask toolで並列に作業を依頼
3. 結果を収集して統合
4. 競合がないか確認

## 注意事項

- 共有ファイル（型定義、設定）は最後にMain Agentが調整
- 各Agentは担当領域外のファイルは読み取りのみ
- コミット前に全Agentの作業完了を確認
