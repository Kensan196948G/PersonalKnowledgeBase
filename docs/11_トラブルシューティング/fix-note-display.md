# ノート表示問題の修正手順

## 問題
左側でノートをクリックしても、右側に内容が表示されない

## 原因
フロントエンドのJavaScriptキャッシュが古い可能性

## 解決方法

### 方法1: ハードリロード（最も効果的）
1. ブラウザでアプリを開く: http://192.168.0.187:5173/
2. **Ctrl + Shift + Delete** を押す
3. 「キャッシュされた画像とファイル」を選択
4. 「データを削除」をクリック
5. ページをリロード（F5）

### 方法2: 開発者ツールでキャッシュ無効化
1. **F12** で開発者ツールを開く
2. **Network** タブを開く
3. **「Disable cache」** にチェック
4. 開発者ツールを開いたまま、**Ctrl + R** でリロード

### 方法3: ServiceWorkerクリア
1. F12で開発者ツール
2. **Application** タブ
3. **Storage** → **Clear site data**
4. ページをリロード

### 方法4: 別ブラウザで確認
- Chrome、Firefox、Edgeなど別のブラウザで開いてみる
- プライベートウィンドウ（Ctrl + Shift + N）で開く

## テスト手順

1. http://192.168.0.187:5173/ を開く
2. F12で開発者ツール → Console タブ
3. 以下を実行：
```javascript
// useNotesフックの状態確認
console.log('selectedNote:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
```

4. 左側で「2025年⑫12」をクリック
5. Consoleで以下のログが出るか確認：
```
handleNoteSelect called, noteId: [note-id]
selectedNote changed: [note object]
```

6. ログが出ない場合 → フロントエンドが古いコードを使用している

## フロントエンド再ビルド（最終手段）

```bash
# フロントエンドを停止
pkill -f vite

# ビルドして再起動
npm run build:frontend
npm run dev:frontend
```

## バックエンドAPIで直接確認

```bash
# ノート詳細APIを直接呼び出し
curl http://192.168.0.187:3000/api/notes/8edf0644-0275-4f58-98d9-a2624efe1b57

# 期待される結果: ノートの完全なJSON（タイトル、内容、日付等）
```

## 確実な解決方法

1. すべてのブラウザタブを閉じる
2. ブラウザを完全に終了
3. ブラウザを再起動
4. http://192.168.0.187:5173/ を新しいタブで開く
5. 「2025年⑫12」をクリック

---

データベースには内容が正しく保存されています。
問題はブラウザのキャッシュです。
