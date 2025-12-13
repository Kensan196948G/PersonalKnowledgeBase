# TipTap Editor Components

TipTapベースのリッチテキストエディタコンポーネント群。

## ファイル構成

- `TipTapEditor.tsx` - メインエディタコンポーネント
- `Toolbar.tsx` - ツールバーコンポーネント
- `index.ts` - エクスポート定義
- `../../hooks/useEditor.ts` - エディタカスタムフック

## 基本的な使い方

```tsx
import { TipTapEditor } from '@/components/Editor'

function MyComponent() {
  const [content, setContent] = useState('')

  return (
    <TipTapEditor
      content={content}
      onChange={setContent}
      placeholder="ここにメモを入力..."
      editable={true}
    />
  )
}
```

## Props

### TipTapEditor

| Prop | 型 | デフォルト | 説明 |
|------|------|-----------|------|
| `content` | `string` | `''` | 初期コンテンツ（HTML形式） |
| `onChange` | `(html: string) => void` | - | コンテンツ変更時のコールバック |
| `placeholder` | `string` | `'ここにメモを入力...'` | プレースホルダーテキスト |
| `editable` | `boolean` | `true` | 編集可能かどうか |
| `className` | `string` | `''` | 追加のクラス名 |

## 利用可能な機能

### テキストフォーマット
- 太字 (Ctrl+B)
- 斜体 (Ctrl+I)
- 打ち消し線
- インラインコード

### 見出し
- H1, H2, H3

### リスト
- 箇条書き
- 番号付きリスト
- タスクリスト（チェックボックス）

### ブロック
- 引用
- コードブロック
- 水平線

### 挿入
- リンク
- 画像（URL指定）

### 履歴
- 元に戻す (Ctrl+Z)
- やり直す (Ctrl+Shift+Z)

## カスタムフックの使用

エディタの機能をより細かく制御したい場合は、`useEditor` フックを直接使用できます。

```tsx
import { useEditor } from '@/hooks/useEditor'
import { EditorContent } from '@tiptap/react'
import { Toolbar } from '@/components/Editor'

function CustomEditor() {
  const { editor, isActive } = useEditor({
    content: '',
    onChange: (html) => console.log(html),
    placeholder: 'カスタムプレースホルダー',
  })

  if (!editor) return null

  return (
    <div>
      <Toolbar editor={editor} isActive={isActive} />
      <EditorContent editor={editor} />
    </div>
  )
}
```

## スタイリング

エディタは Tailwind CSS でスタイリングされています。以下のクラスが使用されています:

- `prose prose-sm max-w-none` - タイポグラフィスタイル
- `border rounded-lg` - エディタの外観
- `bg-gray-50` - ツールバーの背景

カスタムスタイルを適用する場合は、`className` prop を使用してください。

## 将来の拡張

- クリップボードからの画像貼り付け (Ctrl+V)
- ドラッグ&ドロップでの画像挿入
- シンタックスハイライト付きコードブロック
- テーブル挿入
- 数式入力（LaTeX）
