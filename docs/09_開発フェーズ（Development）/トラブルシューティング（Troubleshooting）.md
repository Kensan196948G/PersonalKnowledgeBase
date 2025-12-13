# トラブルシューティング

## よくある問題と解決策

### 開発環境

#### npm install が失敗する

```bash
# 原因: キャッシュ破損
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Vite 開発サーバーが起動しない

```bash
# ポート確認
lsof -i :5173

# 別ポートで起動
npm run dev:frontend -- --port 3001
```

#### Express サーバーが起動しない

```bash
# ポート確認
lsof -i :3000

# 環境変数確認
cat .env | grep PORT
```

### データベース

#### Prisma generate エラー

```bash
# 原因: スキーマ変更後の再生成忘れ
npx prisma generate
```

#### Prisma db push エラー

```bash
# 原因: スキーマ競合
# 開発中はリセットして再作成
rm data/knowledge.db
npx prisma db push
```

#### SQLite ロックエラー

```bash
# 原因: 他プロセスがDBを使用中
# Prisma Studio を閉じる
# 開発サーバーを再起動
```

### Claude Code

#### Hooks が動作しない

```bash
# 確認
ls -la .claude/hooks/

# 実行権限付与
chmod +x .claude/hooks/*.sh

# Claude Code 再起動
```

#### ファイルロックが残る

```bash
# ロック確認
ls .claude/hooks/locks/

# 手動解除
rm -rf .claude/hooks/locks/*.lock
```

#### SubAgent が動かない

- Claude Code を再起動
- Task tool の呼び出しを確認
- エラーメッセージを確認

### フロントエンド

#### TypeScript エラー

```bash
# 型チェック
npm run typecheck

# よくある原因
# - 型定義ファイルの不足
# - import パスの誤り
# - 古い型定義
```

#### TipTap エディタが表示されない

```typescript
// 確認ポイント
// 1. useEditor の初期化
// 2. EditorContent コンポーネントの配置
// 3. 拡張機能のインポート

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const editor = useEditor({
  extensions: [StarterKit],
  content: '',
})

return <EditorContent editor={editor} />
```

#### Tailwind CSS が効かない

```bash
# 設定確認
cat tailwind.config.js

# content パスが正しいか確認
content: ['./src/**/*.{js,ts,jsx,tsx}']
```

### バックエンド

#### API レスポンスが返らない

```typescript
// 確認ポイント
// 1. res.json() の呼び忘れ
// 2. await の付け忘れ
// 3. エラーハンドリング

app.get('/api/notes', async (req, res) => {
  try {
    const notes = await prisma.note.findMany()
    res.json(notes)  // 忘れがち
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})
```

#### CORS エラー

```typescript
// Express で CORS 設定
import cors from 'cors'

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))
```

### Git

#### コミットできない

```bash
# ステータス確認
git status

# ユーザー設定確認
git config user.name
git config user.email

# 設定
git config user.name "Your Name"
git config user.email "your@email.com"
```

#### プッシュできない

```bash
# リモート確認
git remote -v

# 認証確認
gh auth status

# 再認証
gh auth login
```

## ログ確認

### 開発サーバーログ

```bash
# Frontend
# ブラウザのDevToolsコンソール

# Backend
# ターミナル出力を確認
```

### データベースログ

```bash
# Prisma デバッグモード
DEBUG="prisma:query" npm run dev:backend
```

## リセット手順

### 完全リセット

```bash
# 依存関係リセット
rm -rf node_modules package-lock.json
npm install

# データベースリセット
rm data/knowledge.db
npx prisma db push

# Prisma クライアント再生成
npx prisma generate
```

### 部分リセット

```bash
# フロントエンドのみ
rm -rf node_modules/.vite
npm run dev:frontend

# バックエンドのみ
npm run dev:backend
```

## サポート

問題が解決しない場合:

1. エラーメッセージを確認
2. 関連ドキュメントを検索
3. GitHub Issues で類似問題を検索
4. 必要に応じて Issue 作成
