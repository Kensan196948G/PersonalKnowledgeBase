# セットアップ手順

## 前提条件

| ソフトウェア | バージョン | 確認コマンド |
|-------------|-----------|--------------|
| Node.js | 20.x LTS | `node -v` |
| npm | 10.x | `npm -v` |
| Git | 2.x | `git --version` |

## 初回セットアップ

### 1. リポジトリクローン

```bash
git clone https://github.com/Kensan196948G/PersonalKnowledgeBase.git
cd PersonalKnowledgeBase
```

### 2. 依存パッケージインストール

```bash
npm install
```

### 3. 環境変数設定

```bash
cp .env.example .env
# 必要に応じて .env を編集
```

### 4. データベース初期化

```bash
# Prisma クライアント生成
npx prisma generate

# SQLite データベース作成
npx prisma db push
```

### 5. 開発サーバー起動

```bash
npm run dev
```

アクセス: http://localhost:5173

## ディレクトリ作成（自動）

初回起動時に自動作成されるディレクトリ:

```
data/
├── knowledge.db        # SQLite データベース
└── attachments/        # アップロードファイル
```

## Claude Code 設定

### Hooks 有効化

Claude Code 再起動で自動適用:

```bash
# 確認
ls .claude/hooks/
# pre-tool-use.sh
# post-tool-use.sh
```

### MCP 設定確認

```bash
# グローバル設定
cat ~/.claude/mcp.json

# プロジェクト設定
cat .mcp/mcp.json
```

## トラブルシューティング

### npm install エラー

```bash
# キャッシュクリア
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Prisma エラー

```bash
# クライアント再生成
npx prisma generate

# スキーマ再適用
npx prisma db push --force-reset
```

### ポート競合

```bash
# 使用中のポート確認
lsof -i :3000
lsof -i :5173

# プロセス終了
kill -9 <PID>
```

### DB リセット

```bash
# データベース削除して再作成
rm data/knowledge.db
npx prisma db push
```

## 開発コマンド一覧

```bash
# 開発サーバー（Frontend + Backend）
npm run dev

# Frontend のみ
npm run dev:frontend

# Backend のみ
npm run dev:backend

# テスト
npm test

# リント
npm run lint

# 型チェック
npm run typecheck

# Prisma Studio（DB GUI）
npx prisma studio
```

## VS Code 推奨拡張

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma"
  ]
}
```

## Git 設定

```bash
# ユーザー設定（未設定の場合）
git config user.name "Your Name"
git config user.email "your@email.com"
```
