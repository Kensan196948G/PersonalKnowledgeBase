# 開発環境

## 概要

Claude Code + SubAgent による単一セッション開発環境。
個人開発に最適化したシンプルな構成。

## 構成図

```
┌─────────────────────────────────────────────┐
│              Claude Code (メイン)            │
│  ┌─────────────────────────────────────────┐│
│  │         SubAgent × 4 (並列)             ││
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       ││
│  │  │ UI  │ │ API │ │ DB  │ │Test │       ││
│  │  └─────┘ └─────┘ └─────┘ └─────┘       ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │              Hooks (自動化)              ││
│  │  pre-tool-use.sh  →  ファイルロック取得  ││
│  │  post-tool-use.sh →  ファイルロック解除  ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │              MCP (外部連携)              ││
│  │  GitHub MCP  →  Issue/PR管理            ││
│  │  SQLite MCP  →  DB直接操作              ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## SubAgent 並列開発

### 利用可能なSubAgent

| タイプ | 用途 |
|--------|------|
| **general-purpose** | コード実装、調査、ドキュメント作成 |
| **Explore** | コードベース探索、依存関係調査 |
| **Plan** | 設計・計画立案 |

### 並列実行ルール

- 最大同時実行: **4**
- バックグラウンド実行: `run_in_background: true`
- ファイル競合: Hooksで自動防止

### タスク分割パターン

機能実装時の基本分割:

1. **UI/フロントエンド** - Reactコンポーネント
2. **API/バックエンド** - エンドポイント実装
3. **データ層** - DB操作、スキーマ
4. **テスト** - ユニットテスト、統合テスト

### 禁止事項

- 同一ファイルへの同時編集
- DBスキーマの並列変更
- 依存関係のある処理の並列化

## Hooks 設定

### ファイルロック機構

```bash
# .claude/hooks/pre-tool-use.sh
# Edit/Write時にファイルをロック
# 30秒以内のロックは有効、それ以上は自動解除

# .claude/hooks/post-tool-use.sh
# 古いロック（60秒以上）を自動クリーンアップ
```

### トラブルシューティング

```bash
# ロック状態確認
ls -la .claude/hooks/locks/

# 手動ロック解除
rm -rf .claude/hooks/locks/*.lock

# Hooks未動作時
# → Claude Code再起動
```

## MCP 外部連携

### 設定ファイル

`~/.claude/mcp.json` または `.mcp/mcp.json`

### 利用可能なMCP

| MCP | 用途 |
|-----|------|
| GitHub | Issue作成、PR管理、コード管理 |
| SQLite | DB直接操作、デバッグ |
| Filesystem | ファイル操作 |
| Memory | セッション間の記憶保持 |

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# 個別起動
npm run dev:frontend     # Vite
npm run dev:backend      # Express

# テスト
npm test                 # 全テスト
npm run test:unit        # 単体テストのみ

# 品質チェック
npm run lint             # ESLint
npm run typecheck        # TypeScript

# データベース
npx prisma generate      # クライアント生成
npx prisma db push       # スキーマ反映
npx prisma studio        # GUI管理ツール
```

## ディレクトリ構造

```
/
├── src/
│   ├── frontend/           # React + TipTap
│   │   ├── components/     # UIコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── stores/         # 状態管理 (Zustand)
│   │   └── types/          # 型定義
│   ├── backend/            # Express API
│   │   ├── api/            # APIルート
│   │   ├── services/       # ビジネスロジック
│   │   └── utils/          # ユーティリティ
│   └── shared/             # 共有型定義
├── prisma/                 # DBスキーマ
├── data/                   # SQLite + 添付ファイル
│   ├── knowledge.db        # メインDB
│   └── attachments/        # 画像・ファイル
├── tests/                  # テストコード
├── docs/                   # 設計ドキュメント
└── .claude/                # Claude Code設定
```
