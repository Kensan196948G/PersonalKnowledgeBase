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

### 並列開発の方式

Claude Codeの並列開発には2つの方式があります：

#### 方式A: 内蔵Taskツール（推奨）

**単一のClaude Codeセッション**から内蔵のTaskツールでSubAgentを起動：

```
あなた: "メモ機能を実装してください。フロントエンドとバックエンドを並列で開発してください。"

Claude Code: Taskツールを使用して複数のSubAgentを並列起動
  - SubAgent 1: Frontend実装
  - SubAgent 2: Backend API実装
  - SubAgent 3: テスト作成
```

この方式では：
- Claude Codeが自動的にタスクを分割・調整
- ファイル競合を内部で管理
- 結果を統合して報告

#### 方式B: tmux監視環境 + Claude Code連携

**ターミナル2つを使用**する構成：

```
ターミナル1 (Claude Code)        ターミナル2 (tmux監視環境)
┌─────────────────────┐         ┌─────────────────────────┐
│ $ claude            │         │ $ ./scripts/dev-monitor │
│                     │ ──────> │ ┌───┬───┬───┬───┐      │
│ ユーザー指示        │ tmux    │ │ 0 │ 1 │ 2 │ 3 │      │
│ → Claude実行        │ send-   │ ├───┼───┼───┼───┤      │
│                     │ keys    │ │ 4 │ 5 │ 6 │ 7 │      │
└─────────────────────┘         └─────────────────────────┘
```

**セットアップ手順:**

```bash
# ターミナル2: 先にtmux監視環境を起動
./scripts/dev-monitor.sh
# Ctrl+b d でデタッチ（バックグラウンド実行）

# ターミナル1: Claude Codeを起動
claude
```

**Claude Codeから監視環境を操作:**

```bash
# バックエンドサーバーを起動
./scripts/tmux-cmd.sh 2 "npm run dev:backend"

# フロントエンドサーバーを起動
./scripts/tmux-cmd.sh 1 "npm run dev:frontend"

# テストを実行
./scripts/tmux-cmd.sh 3 "npm test"

# 全ペインの状態を確認
./scripts/tmux-status.sh
```

#### ペイン番号対応表（監視用）

| ペイン | 用途 | コマンド例 |
|--------|------|--------|
| 0 | Claude Code | `claude` |
| 1 | フロントエンド | `npm run dev:frontend` |
| 2 | バックエンド | `npm run dev:backend` |
| 3 | テスト | `npm run test:watch` |
| 4 | 型チェック | `npm run typecheck` |
| 5 | DB | `npx prisma studio` |
| 6 | ログ | `tail -f logs/*.log` |
| 7 | Git | `git status` |

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
