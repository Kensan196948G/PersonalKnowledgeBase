# Frontend State Reset Tool

## 概要

開発時にブラウザの状態を完全にリセットするツールです。LocalStorage、SessionStorage、IndexedDBをワンクリックでクリアできます。

## 機能

### クリアされるもの
- **LocalStorage** - Zustandの永続化ストアを含むすべてのデータ
- **SessionStorage** - セッションスコープのデータ
- **IndexedDB** - すべてのIndexedDBデータベース
- **キャッシュ** - ブラウザキャッシュ

### クリアされないもの
- **データベース** - SQLiteのデータは保持されます
- **添付ファイル** - `data/attachments/` の画像やファイル
- **Cookie** - ブラウザのCookie（必要に応じて手動でクリア）

## 使い方

### 方法1: npmコマンド（推奨）

```bash
npm run reset-frontend
```

これにより、`scripts/reset-frontend.html?auto=true` がブラウザで開かれ、自動的にリセットが実行されます。

### 方法2: 手動実行

1. ブラウザで以下のURLを開く:
   ```
   file:///path/to/PersonalKnowledgeBase/scripts/reset-frontend.html
   ```

2. 「完全リセット実行」ボタンをクリック

3. 進捗バーでリセット状況を確認

4. 完了後、自動的にアプリページ (`http://localhost:5173`) にリダイレクト

### 方法3: 開発者ツールから実行

ブラウザのコンソールで以下を実行:

```javascript
// LocalStorageクリア
localStorage.clear();

// SessionStorageクリア
sessionStorage.clear();

// IndexedDBクリア
(async () => {
  const databases = await indexedDB.databases();
  for (const db of databases) {
    if (db.name) indexedDB.deleteDatabase(db.name);
  }
})();
```

## APIエンドポイント

### GET /api/dev/reset-frontend

フロントエンドリセットを指示するレスポンスを返します。

**リクエスト例:**
```bash
curl http://localhost:3000/api/dev/reset-frontend
```

**レスポンス例:**
```json
{
  "success": true,
  "message": "Frontend reset initiated",
  "instructions": {
    "localStorage": "clear",
    "sessionStorage": "clear",
    "indexedDB": "clear",
    "zustand": "clear"
  },
  "redirect": "/",
  "timestamp": "2025-12-15T12:34:56.789Z"
}
```

### GET /api/dev/status

開発用ステータスを確認します。

**リクエスト例:**
```bash
curl http://localhost:3000/api/dev/status
```

**レスポンス例:**
```json
{
  "success": true,
  "environment": "development",
  "timestamp": "2025-12-15T12:34:56.789Z",
  "endpoints": {
    "resetFrontend": "/api/dev/reset-frontend",
    "status": "/api/dev/status"
  }
}
```

## 使用例

### ケース1: ストアの状態がおかしくなった

```bash
npm run reset-frontend
```

→ ブラウザが開き、自動的にリセットが実行され、アプリにリダイレクト

### ケース2: 手動で確認しながらリセット

1. `scripts/reset-frontend.html` をブラウザで開く
2. 警告メッセージを確認
3. 「完全リセット実行」をクリック
4. 進捗を確認

### ケース3: テスト前のクリーンな状態作成

```bash
# フロントエンドリセット
npm run reset-frontend

# E2Eテスト実行
npm run test:e2e
```

## トラブルシューティング

### リセットが実行されない

**原因**: バックエンドサーバーが起動していない

**解決策**:
```bash
npm run dev:backend
```

### ブラウザが開かない

**原因**: OSのデフォルトブラウザ設定の問題

**解決策**: 手動で `scripts/reset-frontend.html` をブラウザにドラッグ&ドロップ

### リセット後もデータが残っている

**原因**:
- ブラウザのキャッシュが有効
- ServiceWorkerが登録されている

**解決策**:
1. ブラウザの「ハードリロード」を実行 (Ctrl+Shift+R / Cmd+Shift+R)
2. ブラウザの開発者ツールでServiceWorkerを解除
3. シークレットウィンドウで確認

### IndexedDBがクリアされない

**原因**: ブラウザによってはIndexedDB削除に対応していない

**解決策**:
1. ブラウザの開発者ツール → Application → Storage → Clear site data
2. 最新のChrome/Firefox/Edgeを使用

## セキュリティ

- このツールは **開発環境専用** です
- 本番環境では使用しないでください
- APIエンドポイント `/api/dev/*` は本番ビルドでは無効化することを推奨

## ファイル構成

```
scripts/
├── reset-frontend.html     # リセット実行ページ
└── README_RESET.md        # このドキュメント

src/backend/api/
└── dev.ts                 # 開発用APIエンドポイント
```

## 関連コマンド

```bash
# フロントエンド開発サーバー起動
npm run dev:frontend

# バックエンド開発サーバー起動
npm run dev:backend

# 両方起動
npm run dev

# データベースリセット（別のツール）
npx prisma db push --force-reset
```

## 注意事項

1. **データ損失**: LocalStorageのすべてのデータが削除されます
2. **ログイン情報**: 認証トークンなども削除されます
3. **設定**: ユーザー設定もリセットされます
4. **データベース**: SQLiteのデータは保持されます（削除したい場合は別途操作が必要）

## 開発Tips

### Zustandの永続化ストアを確認

リセット前:
```javascript
console.log(localStorage.getItem('zustand-store'));
```

リセット後:
```javascript
console.log(localStorage.getItem('zustand-store')); // null
```

### リセット後の初期状態を確認

```javascript
// ストアの初期値を確認
import { useStore } from '@/stores/noteStore';
console.log(useStore.getState());
```

## 今後の拡張案

- [ ] データベースもリセットするオプション
- [ ] 添付ファイルもクリアするオプション
- [ ] リセット前のバックアップ作成
- [ ] リセット履歴の記録
- [ ] 部分的なリセット（LocalStorageのみ、など）
