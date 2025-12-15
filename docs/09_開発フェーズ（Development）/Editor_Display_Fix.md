# エディタ表示問題の完全修正

## 問題の症状

- ログでは正しいノート取得・HTML変換されている
- しかし画面に表示されない、または違う内容が表示される
- ノートを切り替えても前の内容が残る

## 根本原因

### 1. エディタコンテンツの更新ロジック欠如

`useEditor`フックでは、`content`プロパティは**初期値としてのみ**使用されていました。TipTapの`useTipTapEditor`は初回レンダリング時に`content`を設定しますが、その後`content`プロパティが変更されても**自動的には更新されません**。

```typescript
// 修正前：初期値のみ使用
const editor = useTipTapEditor({
  content,  // ← 初回のみ
  // ...
});
```

### 2. 空コンテンツの不一致

TipTapは空のコンテンツを`<p></p>`として返すため、空文字列`""`と比較すると常に異なると判定され、不要な更新が発生していました。

## 実装した修正

### 1. useEditorフックに動的更新ロジックを追加

**ファイル**: `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/hooks/useEditor.ts`

```typescript
// contentプロパティが変更されたときにエディタの内容を更新
useEffect(() => {
  if (!editor) {
    return;
  }

  // 現在のエディタのHTML内容を取得
  const currentContent = editor.getHTML();

  // 正規化：空のコンテンツを統一
  const normalizeContent = (html: string) => {
    if (!html || html === '<p></p>' || html.trim() === '') {
      return '';
    }
    return html;
  };

  const normalizedContent = normalizeContent(content);
  const normalizedCurrent = normalizeContent(currentContent);

  // contentが変更されていて、かつ現在のエディタ内容と異なる場合のみ更新
  if (normalizedContent !== normalizedCurrent) {
    console.log("[useEditor] Content changed, updating editor");
    console.log("[useEditor] New content length:", normalizedContent.length);
    console.log("[useEditor] Current content length:", normalizedCurrent.length);
    console.log("[useEditor] New content preview:", normalizedContent.substring(0, 100));

    // エディタの内容を更新（履歴を追加せず、選択位置も保持しない）
    editor.commands.setContent(content, false);
  }
}, [editor, content]);
```

**変更点**:
1. `useEffect`を追加し、`content`プロパティの変更を監視
2. 空コンテンツを正規化して、不要な更新を防止
3. 内容が実際に変更された場合のみ`editor.commands.setContent()`を呼び出し
4. 第2引数`false`で履歴に追加せず、ユーザー体験を維持

### 2. デバッグログの追加

#### App.tsx

**ファイル**: `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/App.tsx`

```typescript
// selectedNoteが変更されたときにエディタを更新
useEffect(() => {
  console.log("[App] selectedNote changed:", selectedNote?.id, selectedNote?.title);
  if (selectedNote) {
    console.log("[App] Setting editor content, title:", selectedNote.title);
    console.log(
      "[App] Content type:",
      typeof selectedNote.content,
      "length:",
      selectedNote.content.length,
    );
    setEditorTitle(selectedNote.title);
    try {
      const htmlContent = tiptapJsonToHtml(selectedNote.content);
      console.log("[App] Converted HTML length:", htmlContent.length);
      console.log("[App] HTML preview:", htmlContent.substring(0, 200));
      setEditorContent(htmlContent);
      console.log("[App] editorContent state updated");
    } catch (error) {
      console.error("[App] Failed to convert TipTap JSON to HTML:", error);
    }
    setEditorFolderId(selectedNote.folderId);
  } else {
    console.log("[App] No note selected, clearing editor");
    setEditorTitle("");
    setEditorContent("");
    setEditorFolderId(null);
  }
}, [selectedNote]);
```

#### TipTapEditor.tsx

**ファイル**: `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/components/Editor/TipTapEditor.tsx`

```typescript
export function TipTapEditor({
  content = "",
  onChange,
  placeholder = "ここにメモを入力...",
  editable = true,
  className = "",
}: TipTapEditorProps) {
  console.log("[TipTapEditor] Rendered with content length:", content.length);
  console.log("[TipTapEditor] Content preview:", content.substring(0, 100));

  const { editor, isActive } = useEditor({
    content,
    onChange,
    placeholder,
    editable,
  });
  // ...
}
```

## 動作フロー

### ノート選択時の処理シーケンス

1. **ユーザーがノートをクリック**
   ```
   handleNoteSelect(noteId) → selectNote(noteId)
   ```

2. **App.tsxのuseEffectが発火**
   ```
   selectedNote変更検出
   → tiptapJsonToHtml(selectedNote.content)
   → setEditorContent(htmlContent)
   ```
   ログ: `[App] selectedNote changed`, `[App] Converted HTML length`

3. **TipTapEditorの再レンダリング**
   ```
   contentプロパティ更新
   → TipTapEditor再レンダリング
   ```
   ログ: `[TipTapEditor] Rendered with content length`

4. **useEditorフックのuseEffectが発火**
   ```
   content変更検出
   → 正規化して比較
   → editor.commands.setContent(content, false)
   ```
   ログ: `[useEditor] Content changed, updating editor`

5. **エディタに内容が表示される**

## テスト方法

### 1. 開発サーバー起動

```bash
npm run dev
```

### 2. ブラウザで確認

1. `http://localhost:5173/`（またはViteが表示するURL）を開く
2. DevToolsコンソールを開く（F12）
3. ノート一覧から任意のノートをクリック

### 3. 期待されるログ

```
[App] selectedNote changed: <noteId> <noteTitle>
[App] Setting editor content, title: <noteTitle>
[App] Content type: string length: <length>
[App] Converted HTML length: <length>
[App] HTML preview: <preview>
[App] editorContent state updated
[TipTapEditor] Rendered with content length: <length>
[TipTapEditor] Content preview: <preview>
[useEditor] Content changed, updating editor
[useEditor] New content length: <length>
[useEditor] Current content length: <oldLength>
[useEditor] New content preview: <preview>
```

### 4. 確認事項

- [ ] ノートをクリックすると即座に内容が表示される
- [ ] タイトルが正しく表示される
- [ ] 画像やリンクなどのリッチコンテンツが正しく表示される
- [ ] 別のノートに切り替えると内容が正しく更新される
- [ ] 空のノートを選択すると空白のエディタが表示される
- [ ] エディタで編集した内容が保存される（オートセーブ）

## トラブルシューティング

### ログが表示されない

- ブラウザのコンソールフィルタを確認（`[App]`, `[TipTapEditor]`, `[useEditor]`でフィルタ）
- 開発サーバーが正しく起動しているか確認

### 内容が表示されるが古い内容が表示される

- `key`プロパティが正しく設定されているか確認（`App.tsx` 352行目）
- Reactの開発ツールで`editorContent` stateを確認

### 内容が表示されない（空白のまま）

1. コンソールで`[App] Converted HTML length`を確認
   - 0の場合: データベースに内容が保存されていない
   - 0以外の場合: エディタの更新ロジックに問題

2. `[useEditor] Content changed, updating editor`が表示されるか確認
   - 表示されない場合: 正規化ロジックで誤って同一と判定されている
   - 表示される場合: `editor.commands.setContent()`が失敗している

## 技術的な詳細

### TipTapのコンテンツ更新API

```typescript
editor.commands.setContent(content, emitUpdate)
```

- `content`: HTML文字列またはJSON
- `emitUpdate`: `false`の場合、履歴（Undo/Redo）に追加しない

### なぜ`emitUpdate: false`を使用するか

- ノート切り替えは「編集」ではなく「読み込み」
- 履歴に追加するとUndo/Redoが混乱する
- ユーザーが編集した内容のみを履歴に残すべき

### 正規化が必要な理由

TipTapは以下のように内容を正規化します：

- 入力: `""`（空文字列）
- 出力: `"<p></p>"`（空段落）

これにより、単純な文字列比較では常に異なると判定され、無限ループが発生する可能性があります。

## 関連ファイル

- `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/hooks/useEditor.ts`
- `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/App.tsx`
- `/mnt/LinuxHDD/PersonalKnowledgeBase/src/frontend/components/Editor/TipTapEditor.tsx`
- `/mnt/LinuxHDD/PersonalKnowledgeBase/scripts/test-editor-display.js`

## 今後の改善案

1. **パフォーマンス最適化**: 大きなノートの場合、差分更新を検討
2. **エラーハンドリング**: `setContent`失敗時のフォールバック
3. **テストケース追加**: E2Eテストでノート切り替えシナリオを追加
4. **ログの削減**: 本番環境では詳細ログを無効化

## まとめ

この修正により、ノート選択時にエディタの内容が確実に更新されるようになりました。主な変更点は：

1. **`useEditor`フックに動的更新ロジックを追加**
2. **空コンテンツの正規化**
3. **詳細なデバッグログ**

これらの変更により、ユーザーがノートを切り替えたときに即座に正しい内容が表示されるようになります。
