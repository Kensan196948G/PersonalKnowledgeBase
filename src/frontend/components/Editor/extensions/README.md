# NoteLink Extension

TipTap拡張機能：Obsidian風の`[[ノート名]]`記法によるノート間リンク機能

## 概要

`NoteLinkExtension.ts`は、TipTapエディタに`[[ノート名]]`記法のサポートを追加する拡張機能です。

### 主な機能

- **Wiki Link記法**: `[[ノート名]]`でノート間リンクを作成
- **オートコンプリート**: Fuse.jsを使ったあいまい検索による候補表示
- **青リンク/赤リンク**:
  - 青リンク: 既存ノートへのリンク
  - 赤リンク: 未作成ノートへのリンク
- **キーボードナビゲーション**: ↑↓キーで候補選択、Enterで確定

## 使用方法

### 基本的な使い方

```typescript
import { NoteLink, getSuggestionRenderer, NoteSuggestionItem } from './extensions/NoteLinkExtension';

const editor = useEditor({
  extensions: [
    // ... other extensions
    NoteLink.configure({
      suggestion: {
        items: async () => {
          // ノート一覧を返す
          return await fetchNotes();
        },
        render: () => getSuggestionRenderer(fetchNotes),
      },
    }),
  ],
});
```

### エディタでの入力

1. `[[`を入力すると、オートコンプリートが表示されます
2. ノート名を入力すると、あいまい検索で候補が絞り込まれます
3. ↑↓キーで候補を選択し、Enterで確定します
4. 既存のノートは青リンク、未作成のノートは赤リンクで表示されます

## API

### NoteLinkOptions

```typescript
interface NoteLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  renderLabel: (props: {
    options: NoteLinkOptions;
    node: any;
  }) => string;
  suggestion: Omit<SuggestionOptions, 'editor'>;
}
```

### NoteSuggestionItem

```typescript
interface NoteSuggestionItem {
  id: string;
  title: string;
  exists: boolean; // ノートが存在するか
}
```

### getSuggestionRenderer

```typescript
function getSuggestionRenderer(
  fetchNotes: () => Promise<NoteSuggestionItem[]>
): SuggestionRenderer
```

tippy.jsを使ったポップアップレンダラーを返します。

## カスタマイズ

### トリガー文字の変更

デフォルトは`[[`ですが、カスタマイズ可能です：

```typescript
NoteLink.configure({
  suggestion: {
    char: '@', // @でメンション風に
    // ...
  },
})
```

### スタイリング

CSSでリンクの見た目をカスタマイズできます：

```css
/* 青リンク（存在するノート） */
a[data-type="noteLink"][data-exists="true"] {
  @apply text-blue-600;
}

/* 赤リンク（未作成ノート） */
a[data-type="noteLink"][data-exists="false"] {
  @apply text-red-600;
}
```

## HTML属性

生成されるHTMLには以下の属性が付与されます：

- `data-type="noteLink"`: ノードタイプ
- `data-id`: ノートID
- `data-label`: 表示ラベル
- `data-note-id`: ノートID（存在する場合）
- `data-exists`: ノートが存在するか（"true"/"false"）

## テスト

### ユニットテスト

```bash
npm run test:frontend
```

`tests/frontend/NoteLinkExtension.test.ts`でテストを実行できます。

### テスト内容

- Extension登録
- 属性のサポート
- HTMLレンダリング
- キーボードショートカット
- JSON シリアライゼーション

## 依存関係

- `@tiptap/core`
- `@tiptap/react`
- `@tiptap/suggestion`
- `tippy.js`
- `fuse.js` (NoteLinkSuggestionコンポーネント)

## 参考資料

- [TipTap Mention Extension](https://tiptap.dev/docs/editor/extensions/nodes/mention)
- [TipTap Suggestion Utility](https://tiptap.dev/docs/editor/api/utilities/suggestion)
- [Obsidian Wiki Links](https://help.obsidian.md/Linking+notes+and+files/Internal+links)
