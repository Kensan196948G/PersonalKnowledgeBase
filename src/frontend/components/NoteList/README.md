# NoteList コンポーネント群

ノート一覧表示、検索、ソート機能を提供する統合コンポーネントセット。

## コンポーネント構成

- **NoteList**: メインコンポーネント（検索・ソート・一覧表示の統合）
- **SearchBar**: 検索バーコンポーネント（デバウンス・キーボードショートカット対応）
- **NoteCard**: 個別ノートカードコンポーネント（削除機能付き）

## インストール・インポート

```typescript
// 推奨: NoteListフォルダからインポート
import { NoteList, SearchBar, NoteCard } from './components/NoteList'
import type { NoteListProps, SearchBarProps, NoteCardProps } from './components/NoteList'

// または個別にインポート
import { NoteList } from './components/NoteList/NoteList'
import { SearchBar } from './components/NoteList/SearchBar'
import { NoteCard } from './components/NoteList/NoteCard'
```

## 使用例

### 基本的な使い方

```tsx
import { useState } from 'react'
import { NoteList } from './components/NoteList'

function App() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  return (
    <div className="h-screen">
      <NoteList
        selectedNoteId={selectedNoteId}
        onNoteSelect={setSelectedNoteId}
        apiBaseUrl="http://localhost:3000"
      />
    </div>
  )
}
```

### カスタマイズ例

```tsx
import { NoteList } from './components/NoteList'

function CustomNoteList() {
  return (
    <NoteList
      selectedNoteId={null}
      onNoteSelect={(noteId) => console.log('Selected:', noteId)}
      apiBaseUrl="http://localhost:3000"
      initialSortBy="createdAt"    // 初期ソート: 作成日時
      initialOrder="asc"            // 初期順序: 昇順
    />
  )
}
```

### SearchBar 単体での使用

```tsx
import { useState } from 'react'
import { SearchBar } from './components/NoteList'

function CustomSearch() {
  const [query, setQuery] = useState('')

  return (
    <SearchBar
      value={query}
      onSearchChange={setQuery}
      resultCount={10}
      totalCount={50}
      placeholder="カスタムプレースホルダー"
      debounceMs={500}  // デバウンス時間を500msに変更
    />
  )
}
```

### NoteCard 単体での使用

```tsx
import { NoteCard } from './components/NoteList'
import type { NoteListItem } from '../types/note'

function CustomCard({ note }: { note: NoteListItem }) {
  return (
    <NoteCard
      note={note}
      isSelected={false}
      onClick={(id) => console.log('Clicked:', id)}
      onDelete={async (id) => {
        await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      }}
    />
  )
}
```

## Props 詳細

### NoteList

| Props | 型 | デフォルト | 説明 |
|-------|-----|-----------|------|
| `onNoteSelect` | `(noteId: string) => void` | - | ノート選択時のコールバック |
| `selectedNoteId` | `string \| null` | `null` | 選択中のノートID |
| `apiBaseUrl` | `string` | `'http://localhost:3000'` | API基底URL |
| `initialSortBy` | `'createdAt' \| 'updatedAt' \| 'title'` | `'updatedAt'` | 初期ソートフィールド |
| `initialOrder` | `'asc' \| 'desc'` | `'desc'` | 初期ソート順序 |

### SearchBar

| Props | 型 | デフォルト | 説明 |
|-------|-----|-----------|------|
| `onSearchChange` | `(query: string) => void` | - | 検索クエリ変更時のコールバック（必須） |
| `value` | `string` | `''` | 現在の検索クエリ |
| `resultCount` | `number` | - | 検索結果件数（表示用） |
| `totalCount` | `number` | - | 総ノート数（表示用） |
| `placeholder` | `string` | `'ノートを検索... (Ctrl/Cmd + K)'` | プレースホルダー |
| `debounceMs` | `number` | `300` | デバウンス遅延（ミリ秒） |

### NoteCard

| Props | 型 | デフォルト | 説明 |
|-------|-----|-----------|------|
| `note` | `NoteListItem` | - | ノートデータ（必須） |
| `isSelected` | `boolean` | `false` | 選択状態 |
| `onClick` | `(noteId: string) => void` | - | クリック時のコールバック |
| `onDelete` | `(noteId: string) => void` | - | 削除時のコールバック（非表示にする場合は指定しない） |

## 機能

### 検索機能
- リアルタイム検索（デバウンス付き、デフォルト300ms）
- タイトル・本文の全文検索
- 検索結果件数表示
- クリアボタン
- キーボードショートカット（Cmd/Ctrl + K）

### ソート機能
- 更新日時、作成日時、タイトルでソート
- 昇順・降順の切り替え
- ソート状態の視覚的フィードバック

### 削除機能
- 確認ダイアログ付き削除
- 削除中のローディング表示
- 削除後の自動リスト更新

### UI/UX
- レスポンシブデザイン
- 選択状態のハイライト
- ピン留め・お気に入りアイコン
- 相対時間表示（「3分前」など）
- タグ・フォルダ情報の表示
- 空状態の表示

## API連携

NoteListコンポーネントは以下のAPIエンドポイントを使用します:

### GET /api/notes

クエリパラメータ:
- `sortBy`: 'createdAt' | 'updatedAt' | 'title'
- `order`: 'asc' | 'desc'
- `search`: 検索クエリ（タイトル・本文）

レスポンス:
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "title": "ノートタイトル",
      "content": "<p>本文...</p>",
      "isPinned": false,
      "isFavorite": true,
      "isArchived": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-02T12:34:56.000Z",
      "tags": [...],
      "folder": {...}
    }
  ]
}
```

### DELETE /api/notes/:id

削除対象のノートIDを指定してDELETEリクエストを送信します。

## カスタマイズ

### スタイリング

Tailwind CSSを使用しているため、コンポーネント内のクラス名を変更することでスタイルをカスタマイズできます。

### デバウンス時間の変更

検索のデバウンス時間を変更する場合:

```tsx
<SearchBar
  onSearchChange={handleSearch}
  debounceMs={500}  // 500msに変更
/>
```

### ソートオプションの追加

NoteList.tsx内の`SortField`型とソートボタンの配列を編集してください。

## トラブルシューティング

### 検索が動作しない

- APIが`search`クエリパラメータに対応しているか確認
- デバウンス時間が長すぎないか確認（デフォルト300ms）

### 削除が失敗する

- `onDelete`コールバックが正しく実装されているか確認
- APIエンドポイント（DELETE /api/notes/:id）が正しいか確認

### ソートが効かない

- APIが`sortBy`と`order`パラメータに対応しているか確認
- 初期値の設定を確認

## ライセンス

このプロジェクトの一部として使用してください。
