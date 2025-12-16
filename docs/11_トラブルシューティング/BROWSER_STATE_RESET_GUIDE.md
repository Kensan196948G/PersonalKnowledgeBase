# ブラウザ状態リセットガイド

## 概要

フロントエンド側でフォルダフィルタリングが正しく動作しない場合、ブラウザに保存されたキャッシュやLocalStorageが原因となっている可能性があります。このガイドでは、ブラウザの状態を完全にリセットして動作確認を行う方法を説明します。

---

## 問題の背景

### 確認された事実

| 項目 | 状態 | 詳細 |
|------|------|------|
| データベース | ✅ 正常 | 2025年⑫フォルダに30件のノート |
| バックエンドAPI | ✅ 正常 | フォルダフィルタリング動作確認済み |
| フロントエンド | ❌ 問題あり | ブラウザキャッシュの影響で古いデータ表示 |

### 原因

- ブラウザのLocalStorageに古いノートリストがキャッシュされている
- フロントエンドのZustand storeが古い状態を保持している
- ブラウザのHTTPキャッシュがAPIレスポンスをキャッシュしている

---

## リセット方法

### 方法1: 専用リセットツールを使用（推奨）

最も簡単で確実な方法です。

1. ブラウザで以下のURLにアクセス:
   ```
   http://192.168.0.187:5173/reset-browser-state.html
   ```

2. 「すべてクリア」ボタンをクリック

3. 確認ダイアログで「OK」をクリック

4. 自動的にホーム画面にリダイレクトされます

**削除されるデータ:**
- LocalStorage（Zustand store含む）
- SessionStorage
- IndexedDB
- Cookies
- Cache Storage

---

### 方法2: ブラウザのデベロッパーツールを使用

手動で細かく制御したい場合の方法です。

#### Chrome / Edgeの場合

1. `F12`キーを押してデベロッパーツールを開く

2. **Application**タブを選択

3. 左サイドバーで以下を実行:

   **LocalStorageのクリア:**
   - `Storage` > `Local Storage` > `http://192.168.0.187:5173`を選択
   - 右クリック > `Clear`

   **SessionStorageのクリア:**
   - `Storage` > `Session Storage` > `http://192.168.0.187:5173`を選択
   - 右クリック > `Clear`

   **IndexedDBのクリア:**
   - `Storage` > `IndexedDB`を選択
   - 各データベースを右クリック > `Delete database`

   **キャッシュのクリア:**
   - `Storage` > `Cache Storage`を選択
   - 各キャッシュを右クリック > `Delete`

4. `Ctrl+F5`でハードリロード

#### Firefoxの場合

1. `F12`キーを押してデベロッパーツールを開く

2. **Storage**タブを選択

3. 左サイドバーで以下を実行:

   **LocalStorageのクリア:**
   - `Local Storage` > `http://192.168.0.187:5173`を選択
   - 各アイテムを右クリック > `Delete All`

   **SessionStorageのクリア:**
   - `Session Storage` > `http://192.168.0.187:5173`を選択
   - 各アイテムを右クリック > `Delete All`

   **IndexedDBのクリア:**
   - `IndexedDB`を選択
   - 各データベースを右クリック > `Delete database`

4. `Ctrl+Shift+R`でハードリロード

---

### 方法3: コンソールから手動実行

JavaScriptコンソールから直接実行する方法です。

1. `F12`キーを押してデベロッパーツールを開く

2. **Console**タブを選択

3. 以下のコードを貼り付けて実行:

```javascript
// LocalStorageクリア
localStorage.clear();
console.log('✅ LocalStorage cleared');

// SessionStorageクリア
sessionStorage.clear();
console.log('✅ SessionStorage cleared');

// Cookiesクリア
document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
});
console.log('✅ Cookies cleared');

// IndexedDBクリア
(async () => {
    const databases = await window.indexedDB.databases();
    for (const db of databases) {
        window.indexedDB.deleteDatabase(db.name);
        console.log(`✅ IndexedDB "${db.name}" deleted`);
    }
})();

// キャッシュクリア
(async () => {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
            await caches.delete(name);
            console.log(`✅ Cache "${name}" deleted`);
        }
    }
})();

// 3秒後にリロード
setTimeout(() => {
    location.reload();
}, 3000);
```

---

## 動作確認手順

リセット後、以下の手順で動作を確認してください。

### 1. ブラウザキャッシュのクリア確認

```bash
# デベロッパーツールのNetworkタブで確認
# Status列が「200」（キャッシュなし）になっていることを確認
# 「304 Not Modified」（キャッシュヒット）になっていないこと
```

### 2. フォルダフィルタリングの確認

1. アプリケーションを開く: `http://192.168.0.187:5173`

2. サイドバーで「2025年⑫」フォルダをクリック

3. 右側のノート一覧を確認:
   - **期待値**: 30件のノートが表示される
   - **表示内容**: 2025年⑫01 〜 2025年⑫31（⑯を除く）

### 3. バックエンドAPIの確認（念のため）

```bash
# ターミナルで実行
curl -s http://192.168.0.187:3000/api/notes?folderId=10192840-e6b3-4750-985d-6948b142001f | jq '.count'

# 期待値: 30
```

---

## トラブルシューティング

### 問題1: リセット後もノート数が変わらない

**原因**: ブラウザのHTTPキャッシュが残っている

**解決方法**:
```bash
# ハードリロード
Ctrl+F5 (Windows/Linux)
Cmd+Shift+R (Mac)

# または、デベロッパーツールのNetworkタブで
# 「Disable cache」にチェック
```

### 問題2: リセットツールが動作しない

**原因**: JavaScriptエラーまたは権限の問題

**解決方法**:
```bash
# コンソールでエラーを確認
F12 > Console

# 手動で方法2または方法3を試す
```

### 問題3: フォルダを選択してもノートが表示されない

**原因**: フロントエンドのAPIコール失敗

**解決方法**:
```bash
# Networkタブで確認
F12 > Network > XHR

# 失敗しているAPIリクエストを確認
# Status codeを確認（200以外の場合は問題）

# バックエンドログを確認
# ターミナルでバックエンドのログを確認
```

---

## 検証スクリプト

バックエンドAPIの動作を確認するスクリプトを用意しています。

```bash
# 検証スクリプトを実行
./scripts/verify-folder-filtering.sh

# 期待される出力:
# ✅ 成功: データベース（30件）とAPI（30件）が一致
```

---

## 注意事項

### データの安全性

- このリセットはブラウザ側のキャッシュのみをクリアします
- **データベースのデータには影響しません**
- 安全に何度でも実行できます

### 開発環境での推奨設定

**デベロッパーツールの設定:**

1. `F12` > `Network`タブ
2. 「Disable cache」にチェック
3. これにより、開発中は常にキャッシュなしでリクエストされます

**Reactの開発設定:**

```javascript
// src/frontend/stores/noteStore.ts
// デバッグログを有効化
const useNoteStore = create<NoteState>()(
  devtools(
    persist(
      (set, get) => ({
        // ... store definition
      }),
      {
        name: 'note-storage',
        // 開発中はローカルストレージを無効化することも可能
        // enabled: false,
      }
    )
  )
);
```

---

## まとめ

| 手順 | 所要時間 | 難易度 | 推奨度 |
|------|---------|--------|--------|
| 方法1: リセットツール | 10秒 | ⭐️ | ⭐️⭐️⭐️⭐️⭐️ |
| 方法2: デベロッパーツール | 1分 | ⭐️⭐️⭐️ | ⭐️⭐️⭐️ |
| 方法3: コンソール実行 | 30秒 | ⭐️⭐️ | ⭐️⭐️⭐️⭐️ |

**推奨**: まずは方法1のリセットツールを使用してください。最も簡単で確実です。

---

## 関連ドキュメント

- [検証スクリプト](/scripts/verify-folder-filtering.sh)
- [データベース確認スクリプト](/scripts/check-2025-12-folder.js)
- [リセットツール](http://192.168.0.187:5173/reset-browser-state.html)

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-16 | 初版作成 |
