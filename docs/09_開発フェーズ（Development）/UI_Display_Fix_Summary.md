# フロントエンドUI表示問題修正レポート

## 実施日時
2025-12-15

## 問題の概要
フォルダ選択時にノート一覧が正しくフィルタリングされない問題が発生していました。

## 原因分析

### 1. ストア間の同期問題
- **FolderStore**: `selectedFolderId` でUI上の選択状態を管理
- **NoteStore**: `searchFolderId` でAPIリクエストのフィルタリング条件を管理
- これら2つのストアが同期されていなかったため、フォルダクリック時に以下の問題が発生：
  1. FolderStoreの`selectedFolderId`は更新される（視覚的には選択される）
  2. しかしNoteStoreの`searchFolderId`は更新されない
  3. 結果として、APIリクエスト時にフォルダフィルタが適用されない
  4. すべてのノートが表示されてしまう

### 2. フォルダクリックハンドラの不完全な実装
```typescript
// 修正前（App.tsx）
const handleFolderClick = (folderId: string | null) => {
  selectFolder(folderId);  // FolderStoreのみ更新
};
```

## 実施した修正

### 1. App.tsxの修正
フォルダクリック時に両方のストアを同期し、ノートを再取得するように変更：

**変更箇所**: `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/App.tsx`

```typescript
// 修正後
import { useNoteStore } from "./stores/noteStore";

function App() {
  const { fetchNotes } = useNotes();
  const { setSearchFolder } = useNoteStore();
  const { selectFolder } = useFolderStore();

  const handleFolderClick = useCallback(
    async (folderId: string | null) => {
      console.log("[App] Folder clicked:", folderId);

      // 1. FolderStoreを更新（UI表示用）
      selectFolder(folderId);

      // 2. NoteStoreのフォルダフィルタを更新
      setSearchFolder(folderId);

      // 3. ノート一覧を再取得してフィルタリング
      await fetchNotes();

      console.log("[App] Notes fetched for folder:", folderId);
    },
    [selectFolder, setSearchFolder, fetchNotes],
  );
}
```

### 2. デバッグログの追加

#### NoteStore (`/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/stores/noteStore.ts`)
```typescript
// fetchNotes
console.log("[NoteStore] fetchNotes called with folderId:", searchFolderId);
console.log("[NoteStore] Fetched", result.data?.length || 0, "notes");

// setSearchFolder
console.log("[NoteStore] setSearchFolder called:", folderId);
```

#### FolderStore (`/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/stores/folderStore.ts`)
```typescript
// selectFolder
console.log("[FolderStore] Selecting folder:", folderId);
```

#### NoteList (`/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/components/NoteList/NoteList.tsx`)
```typescript
console.log("[NoteList] Fetching notes...");
console.log("[NoteList] Notes count:", notes.length);
console.log("[NoteList] Filtered notes count:", filteredNotes.length);
console.log("[NoteList] Note titles:", filteredNotes.map((n) => n.title));
```

### 3. ブラウザキャッシュクリアユーティリティの作成

**ファイル**: `/mnt/LinuxHDD/PersonalKnowledgeBase/scripts/clear-browser-cache.html`

開発中にブラウザのLocalStorageやセッションストレージをクリアするためのHTMLツール：

**機能**:
- LocalStorage、SessionStorage、IndexedDBの一括クリア
- Zustandストアの状態表示
- ストレージ項目数のリアルタイム表示
- ワンクリックでキャッシュクリア
- キーボードショートカット対応（Ctrl+Shift+D）

**使用方法**:
```bash
# ブラウザで以下のファイルを開く
file:///mnt/LinuxHDD/PersonalKnowledgeBase/scripts/clear-browser-cache.html
```

## 動作確認方法

### 1. デバッグログの確認
ブラウザの開発者ツール（F12）→ Consoleタブで以下のログを確認：

```
[App] Folder clicked: <folder-id>
[FolderStore] Selecting folder: <folder-id>
[NoteStore] setSearchFolder called: <folder-id>
[NoteStore] fetchNotes called with folderId: <folder-id>
[NoteStore] Fetched <count> notes
[NoteList] Fetching notes...
[NoteList] Notes count: <count>
[NoteList] Filtered notes count: <count>
[NoteList] Note titles: [...]
```

### 2. フォルダフィルタリングのテスト手順

1. **準備**:
   ```bash
   # 開発サーバーを起動
   npm run dev

   # ブラウザで http://localhost:5173 を開く
   ```

2. **キャッシュクリア**:
   - `scripts/clear-browser-cache.html` をブラウザで開く
   - 「すべてクリア」ボタンをクリック
   - 「ページ再読み込み」ボタンをクリック

3. **テストシナリオ**:
   - [ ] フォルダAをクリック → フォルダA内のノートのみ表示されることを確認
   - [ ] フォルダBをクリック → フォルダB内のノートのみ表示されることを確認
   - [ ] 「全てのノート」をクリック → すべてのノートが表示されることを確認
   - [ ] サブフォルダをクリック → サブフォルダ内のノートのみ表示されることを確認

4. **コンソールログ確認**:
   - フォルダクリック時に上記のログが正しく出力されることを確認
   - APIリクエストに `folderId` パラメータが含まれていることを確認
     - Network タブで `/api/notes?folderId=xxx` を確認

## E2Eテストの実行

既存のE2Eテストでフォルダフィルタリングをテスト：

```bash
# E2Eテスト実行
npm run test:e2e

# 特定のテストファイルのみ実行
npx playwright test tests/e2e/noteLinks.spec.ts
```

## 技術的な詳細

### データフロー

```
ユーザー操作: フォルダクリック
    ↓
FolderTree.handleFolderClick()
    ↓
App.handleFolderClick()
    ├─→ FolderStore.selectFolder()  // UI選択状態を更新
    ├─→ NoteStore.setSearchFolder() // フィルタ条件を更新
    └─→ NoteStore.fetchNotes()      // APIリクエスト
            ↓
        GET /api/notes?folderId=xxx
            ↓
        Backend フィルタリング処理
            ↓
        フィルタされたノート一覧を返却
            ↓
        NoteStore.notes を更新
            ↓
        NoteList コンポーネントが再レンダリング
            ↓
        フィルタされたノート一覧が表示
```

### Zustandストアの永続化

両方のストアで永続化が有効になっていますが、異なる状態を保存：

```typescript
// FolderStore
partialize: (state) => ({
  selectedFolderId: state.selectedFolderId,
  expandedFolders: Array.from(state.expandedFolders),
})

// NoteStore
partialize: (state) => ({
  searchQuery: state.searchQuery,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
  searchFolderId: state.searchFolderId,  // これが重要
  // ...
})
```

## 既知の制限事項

1. **初回読み込み時の同期**:
   - ページリロード時にストアが非同期で復元されるため、一時的に不整合が発生する可能性
   - 解決策: App.tsxのuseEffectで初回同期を行う（今後の改善点）

2. **デバッグログの本番環境での扱い**:
   - 現在は常にログ出力されるが、本番環境では無効化すべき
   - 解決策: 環境変数で制御（`import.meta.env.DEV` の活用）

## 今後の改善提案

### 1. ストア統合の検討
現在は2つのストアで管理していますが、以下のような統合も検討可能：

```typescript
// 統一されたフィルタストア（案）
interface FilterStore {
  selectedFolderId: string | null;
  selectedTags: string[];
  searchQuery: string;
  // ...

  // フォルダ選択時に自動的にノートを再取得
  selectFolder: (folderId: string | null) => Promise<void>;
}
```

### 2. React Queryの導入
現在のZustandベースの実装は動作しますが、React Queryを使うとより宣言的に：

```typescript
const { data: notes } = useQuery({
  queryKey: ['notes', { folderId, tags, query }],
  queryFn: () => fetchNotes({ folderId, tags, query }),
});
```

### 3. デバッグログの改善
環境変数ベースのロガーを導入：

```typescript
// logger.ts
const logger = {
  debug: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
};

// 使用例
logger.debug("[App] Folder clicked:", folderId);
```

## テスト結果

### TypeScript型チェック
```bash
npm run typecheck
# ✅ エラーなし
```

### ESLint
```bash
npm run lint
# ⚠️ 警告のみ（既存の警告、今回の変更とは無関係）
```

## まとめ

### 修正内容
1. ✅ App.tsxでフォルダクリック時に両方のストアを同期
2. ✅ デバッグログを追加してデータフローを可視化
3. ✅ ブラウザキャッシュクリアツールを作成
4. ✅ TypeScript型チェックとLintが通ることを確認

### 修正ファイル
- `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/App.tsx`
- `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/stores/noteStore.ts`
- `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/stores/folderStore.ts`
- `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/components/NoteList/NoteList.tsx`

### 新規作成ファイル
- `/mnt/LinuxHDD/PersonalKnowledgeBase/scripts/clear-browser-cache.html`
- `/mnt/LinuxHDD/PersonalKnowledgeBase/docs/09_開発フェーズ（Development）/UI_Display_Fix_Summary.md`

### 次のステップ
1. ブラウザで実際の動作を確認
2. E2Eテストの実行と確認
3. 問題があれば追加修正
4. 問題がなければコミット・プッシュ
