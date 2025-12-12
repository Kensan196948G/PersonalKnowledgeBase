# Personal Knowledge Base System

## プロジェクト概要

個人向けメモ・ナレッジベースシステム。OneNoteやNotionのような「メモ＋画像貼り付け」を中核とした、個人利用に特化したナレッジベースを構築する。

## 技術スタック

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 16 (Docker)
- **ORM**: Prisma
- **Editor**: TipTap (リッチテキストエディタ)
- **State**: Zustand
- **Styling**: Tailwind CSS

## 開発ルール

- コードは日本語コメント可
- テストは必須（Jest）
- 型定義は厳格に（strict mode）
- ESLint + Prettier でコード品質を維持

## 並列開発時の注意

このプロジェクトは最大8つのSubAgentで並列開発を行う。

### 役割分担

| Agent | 役割 | 担当領域 |
|-------|------|----------|
| Main | オーケストレーター | 全体調整・タスク配分 |
| Agent 1 | Frontend Core | `src/frontend/core/` |
| Agent 2 | Frontend Components | `src/frontend/components/` |
| Agent 3 | Backend API | `src/backend/api/` |
| Agent 4 | Backend Storage | `src/backend/storage/` |
| Agent 5 | Search/Index | `src/backend/search/` |
| Agent 6 | Testing | `tests/` |
| Agent 7 | Docs/Review | `docs/` |

### ファイル競合回避ルール

1. 担当領域外のファイルは読み取りのみ
2. 共有ファイル（型定義、設定）は Main Agent が調整
3. コミット前に他 Agent の作業完了を確認

## ディレクトリ構造

```
/
├── docs/           # アイデア・設計ドキュメント
├── src/
│   ├── frontend/   # Reactアプリケーション
│   ├── backend/    # Express APIサーバー
│   └── shared/     # 共有型定義・ユーティリティ
├── tests/          # テストコード
├── prisma/         # DBスキーマ定義
└── scripts/        # 開発スクリプト
```

## 主要なコマンド

```bash
# 開発サーバー起動
npm run dev

# テスト実行
npm test

# 型チェック
npm run typecheck

# リント
npm run lint

# PostgreSQL起動
docker compose up -d

# Prismaマイグレーション
npx prisma migrate dev

# Prisma Studio（DBブラウザ）
npx prisma studio
```

## Docker（任意）

Dockerは検証用に使用可能。**通常開発はホスト環境で行う。**

### 使用場面
- PostgreSQLデータベース（常用）
- 本番相当の起動テスト
- SubAgentの危険作業テスト

### 方針
- アプリケーション自体はDockerコンテナ化しない
- 「詰んだらDocker」として活用

## 設計方針

1. **小さく始め、後から積み上げられる** - 最小限の機能からスタート
2. **思考を邪魔しないUI/UX** - 書くことに集中できるインターフェース
3. **書いたあとに"探せる"こと** - 検索性を重視
4. **データは常に自分の手元にある** - ローカルファースト
5. **将来のAI連携を阻害しない構造** - 機械可読なデータ形式

## 参考ドキュメント

- `docs/01_コンセプト（Concept）/` - 基本思想・ビジョン
- `docs/02_メモ機能（Note）/` - メモ機能の詳細アイデア
- `docs/08_AI連携（AI）/` - 将来のAI連携構想
