# Frontend Reset Tool - 動作確認ガイド

## 前提条件

- Node.js 20以上がインストールされていること
- プロジェクトの依存関係がインストール済み (`npm install`)
- バックエンドがビルド済み (`npm run build:backend`)

## 確認手順

### Step 1: バックエンドサーバー起動

ターミナル1で実行:

```bash
npm run dev:backend
```

以下のようなログが表示されることを確認:

```
🚀 Server is running on:
   - Local:   http://localhost:3000
   - Network: http://192.168.0.187:3000
📚 API Health: http://localhost:3000/api/health
```

### Step 2: フロントエンドサーバー起動

ターミナル2で実行:

```bash
npm run dev:frontend
```

以下のようなログが表示されることを確認:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.0.187:5173/
```

### Step 3: APIエンドポイント確認

ターミナル3で実行:

```bash
./scripts/test-reset-api.sh
```

**期待される出力:**

```
🧪 Frontend Reset API Test
================================

[1/3] Health Check
  ✓ Backend is running
  Response: {"status":"ok","timestamp":"...","database":"connected"}

[2/3] Dev Status Check
  ✓ Dev API is available
  Response: {"success":true,"environment":"development",...}

[3/3] Reset Frontend API Check
  ✓ Reset API is working
  Response: {"success":true,"message":"Frontend reset initiated",...}

================================
✅ All tests passed!

Next steps:
  1. Test the HTML page:
     open scripts/reset-frontend.html

  2. Or use the npm command:
     npm run reset-frontend
```

### Step 4: ブラウザで初期状態作成

1. ブラウザで `http://localhost:5173` を開く

2. いくつかメモを作成し、LocalStorageにデータを保存させる

3. ブラウザの開発者ツールを開き、Consoleで確認:

```javascript
// LocalStorageにデータがあることを確認
console.log(Object.keys(localStorage));
// 例: ["zustand-note-store", "recent-notes", ...]
```

### Step 5: リセット実行（方法A: npmコマンド）

```bash
npm run reset-frontend
```

**期待される動作:**
1. ブラウザが自動的に開く（または新しいタブが開く）
2. `scripts/reset-frontend.html?auto=true` が表示される
3. 自動的にリセットが開始される
4. 進捗バーが表示される:
   - ✓ API確認中...
   - ✓ LocalStorageクリア中...
   - ✓ SessionStorageクリア中...
   - ✓ IndexedDBクリア中...
   - ✓ リダイレクト準備中...
5. `http://localhost:5173` にリダイレクトされる

### Step 6: リセット実行（方法B: 手動実行）

1. ブラウザで以下を開く:
   ```
   file:///path/to/PersonalKnowledgeBase/scripts/reset-frontend.html
   ```

   または、プロジェクトディレクトリから:
   ```bash
   open scripts/reset-frontend.html  # macOS
   xdg-open scripts/reset-frontend.html  # Linux
   start scripts/reset-frontend.html  # Windows
   ```

2. 警告メッセージを確認

3. 「完全リセット実行」ボタンをクリック

4. 進捗を確認

5. 自動的にアプリページにリダイレクトされる

### Step 7: リセット確認

アプリページ (`http://localhost:5173`) が開いたら、開発者ツールのConsoleで確認:

```javascript
// LocalStorageが空になっていることを確認
console.log(Object.keys(localStorage));
// 期待: [] または最小限のキーのみ

// SessionStorageが空になっていることを確認
console.log(Object.keys(sessionStorage));
// 期待: []

// IndexedDBが空になっていることを確認
indexedDB.databases().then(dbs => console.log(dbs));
// 期待: [] または []
```

## トラブルシューティング

### 問題1: APIエンドポイントが404

**症状:**
```
✗ Dev API failed (HTTP 404)
```

**原因:** バックエンドがビルドされていない、または古いビルド

**解決策:**
```bash
npm run build:backend
npm run dev:backend
```

### 問題2: ブラウザが開かない

**症状:** `npm run reset-frontend` 実行後、何も起こらない

**原因:** OSのブラウザ起動コマンドの問題

**解決策:** 手動でHTMLファイルを開く
```bash
# Linuxの場合
firefox scripts/reset-frontend.html?auto=true

# または
google-chrome scripts/reset-frontend.html?auto=true
```

### 問題3: リセット後もデータが残っている

**症状:** リセット実行後もLocalStorageにデータが残っている

**原因:**
- ブラウザのキャッシュ
- 別のオリジンのデータ（ポート違いなど）

**解決策:**
1. ハードリロード (Ctrl+Shift+R / Cmd+Shift+R)
2. ブラウザのシークレットウィンドウで確認
3. 開発者ツール → Application → Clear site data

### 問題4: CORS エラー

**症状:**
```
Access to fetch at 'http://localhost:3000/api/dev/reset-frontend' from origin 'file://' has been blocked by CORS policy
```

**原因:** ローカルファイルからのAPIアクセス制限

**解決策:** 開発サーバーを使用
```bash
# Pythonの簡易サーバーを使用
cd scripts
python3 -m http.server 8000

# ブラウザで開く
open http://localhost:8000/reset-frontend.html?auto=true
```

## 成功確認チェックリスト

- [ ] バックエンドサーバーが起動している
- [ ] フロントエンドサーバーが起動している
- [ ] `./scripts/test-reset-api.sh` がすべてパスする
- [ ] `npm run reset-frontend` でブラウザが開く
- [ ] リセット後、LocalStorageが空になる
- [ ] リセット後、SessionStorageが空になる
- [ ] リセット後、アプリページにリダイレクトされる
- [ ] アプリが正常に動作する（新規メモ作成など）

## 次のステップ

### 開発ワークフローでの使用

```bash
# 1. クリーンな状態を作成
npm run reset-frontend

# 2. E2Eテストを実行
npm run test:e2e

# 3. 再度リセット
npm run reset-frontend

# 4. 手動テスト
# ブラウザでアプリを開いて動作確認
```

### CI/CDへの組み込み（将来）

```yaml
# .github/workflows/test.yml
steps:
  - name: Reset frontend state
    run: npm run reset-frontend

  - name: Run E2E tests
    run: npm run test:e2e
```

## 関連ファイル

- `/src/backend/api/dev.ts` - 開発用APIエンドポイント
- `/scripts/reset-frontend.html` - リセット実行ページ
- `/scripts/test-reset-api.sh` - APIテストスクリプト
- `/scripts/README_RESET.md` - 詳細ドキュメント
- `/scripts/VERIFICATION_GUIDE.md` - このファイル

## 参考情報

### LocalStorage確認コマンド

```javascript
// すべてのキーを表示
console.log(Object.keys(localStorage));

// 特定のキーの値を表示
console.log(localStorage.getItem('zustand-note-store'));

// すべてのキーと値を表示
Object.keys(localStorage).forEach(key => {
  console.log(key, localStorage.getItem(key));
});
```

### IndexedDB確認コマンド

```javascript
// すべてのDBを表示
indexedDB.databases().then(dbs => {
  console.log('IndexedDB databases:', dbs);
});

// 特定のDBを削除
indexedDB.deleteDatabase('my-database-name');
```

### SessionStorage確認コマンド

```javascript
// すべてのキーを表示
console.log(Object.keys(sessionStorage));

// クリア
sessionStorage.clear();
```
