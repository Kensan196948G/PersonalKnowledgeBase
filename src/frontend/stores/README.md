# Zustand 状態管理ガイド

## 概要

このプロジェクトでは、Zustand v5 を使用してアプリケーションの状態管理を行います。

### 実装済みのStore

- **noteStore**: ノート一覧、選択、CRUD操作の状態管理
- **uiStore**: サイドバー、モーダル、トースト通知などのUI状態管理

## 使い方

### 1. noteStore の使用例

#### 基本的な使い方（直接Store使用）

```typescript
import { useNoteStore } from '@/frontend/stores/noteStore'

function NoteList() {
  const notes = useNoteStore(state => state.notes)
  const isLoading = useNoteStore(state => state.isLoading)
  const fetchNotes = useNoteStore(state => state.fetchNotes)

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {notes.map(note => (
        <div key={note.id}>{note.title}</div>
      ))}
    </div>
  )
}
```

#### 推奨: useNotes フックの使用

```typescript
import { useNotes } from '@/frontend/hooks/useNotes'

function NoteList() {
  const {
    filteredNotes,
    isLoading,
    createNote,
    deleteNote,
    togglePinNote,
  } = useNotes()

  const handleCreateNote = async () => {
    await createNote({ title: '新しいノート' })
  }

  return (
    <div>
      <button onClick={handleCreateNote}>新規作成</button>
      {isLoading && <p>Loading...</p>}
      {filteredNotes.map(note => (
        <div key={note.id}>
          {note.title}
          <button onClick={() => togglePinNote(note.id)}>
            {note.isPinned ? 'ピン解除' : 'ピン留め'}
          </button>
          <button onClick={() => deleteNote(note.id)}>削除</button>
        </div>
      ))}
    </div>
  )
}
```

### 2. noteStore の主な機能

#### CRUD操作

```typescript
// ノート作成
const note = await createNote({
  title: 'タイトル',
  content: 'コンテンツ',
})

// ノート更新
await updateNote(noteId, {
  title: '更新されたタイトル',
})

// ノート削除
await deleteNote(noteId)

// ノート取得
await fetchNotes()
const note = await fetchNoteById(noteId)
```

#### 検索とソート

```typescript
// 検索クエリ設定
setSearchQuery('検索ワード')

// ソート方法変更
setSortBy('title') // 'updatedAt' | 'createdAt' | 'title'
setSortOrder('asc') // 'asc' | 'desc'

// フィルタ・ソート済みノート取得
const filteredNotes = getFilteredNotes()
```

#### ノート選択

```typescript
// ノート選択
selectNote(noteId)

// 選択中のノート取得
const selectedNote = getSelectedNote()
```

### 3. uiStore の使用例

#### サイドバー制御

```typescript
import { useUIStore } from '@/frontend/stores/uiStore'

function Sidebar() {
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen)
  const toggleSidebar = useUIStore(state => state.toggleSidebar)

  return (
    <aside className={isSidebarOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
      {/* サイドバーコンテンツ */}
    </aside>
  )
}
```

#### モーダル制御

```typescript
function DeleteConfirmModal() {
  const activeModal = useUIStore(state => state.activeModal)
  const closeModal = useUIStore(state => state.closeModal)
  const openModal = useUIStore(state => state.openModal)

  const handleDelete = () => {
    openModal('delete-confirm')
  }

  return (
    <>
      <button onClick={handleDelete}>削除</button>
      {activeModal === 'delete-confirm' && (
        <div className="modal">
          <p>本当に削除しますか？</p>
          <button onClick={closeModal}>キャンセル</button>
          <button onClick={() => {
            // 削除処理
            closeModal()
          }}>削除</button>
        </div>
      )}
    </>
  )
}
```

#### トースト通知

```typescript
function SomeComponent() {
  const addToast = useUIStore(state => state.addToast)

  const showSuccess = () => {
    addToast({
      message: '操作が成功しました',
      type: 'success',
      duration: 3000,
    })
  }

  const showError = () => {
    addToast({
      message: 'エラーが発生しました',
      type: 'error',
      duration: 5000,
    })
  }

  return (
    <div>
      <button onClick={showSuccess}>Success</button>
      <button onClick={showError}>Error</button>
    </div>
  )
}

// トースト表示コンポーネント
function ToastContainer() {
  const toasts = useUIStore(state => state.toasts)
  const removeToast = useUIStore(state => state.removeToast)

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
          <button onClick={() => removeToast(toast.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
```

### 4. useNotes フックの便利機能

```typescript
import { useNotes } from '@/frontend/hooks/useNotes'

function NoteEditor() {
  const {
    selectedNote,
    updateNote,
    togglePinNote,
    toggleFavoriteNote,
    toggleArchiveNote,
    searchNotes,
  } = useNotes()

  // ピン留めトグル（トースト通知付き）
  const handlePin = () => {
    if (selectedNote) {
      togglePinNote(selectedNote.id)
    }
  }

  // お気に入りトグル（トースト通知付き）
  const handleFavorite = () => {
    if (selectedNote) {
      toggleFavoriteNote(selectedNote.id)
    }
  }

  // アーカイブトグル（トースト通知付き）
  const handleArchive = () => {
    if (selectedNote) {
      toggleArchiveNote(selectedNote.id)
    }
  }

  // 検索実行
  const handleSearch = async (query: string) => {
    await searchNotes(query)
  }

  return (
    <div>
      {selectedNote && (
        <>
          <h1>{selectedNote.title}</h1>
          <button onClick={handlePin}>
            {selectedNote.isPinned ? 'ピン解除' : 'ピン留め'}
          </button>
          <button onClick={handleFavorite}>
            {selectedNote.isFavorite ? 'お気に入り解除' : 'お気に入り'}
          </button>
          <button onClick={handleArchive}>
            {selectedNote.isArchived ? 'アーカイブ解除' : 'アーカイブ'}
          </button>
        </>
      )}
    </div>
  )
}
```

## 特徴

### noteStore

- **永続化**: 検索クエリ、ソート設定、選択中のノートIDをlocalStorageに保存
- **自動キャッシュ**: フェッチしたノートをキャッシュし、再レンダリングを最適化
- **エラーハンドリング**: API呼び出しのエラーを適切に処理
- **型安全**: TypeScriptによる完全な型チェック

### uiStore

- **永続化**: サイドバーの開閉状態をlocalStorageに保存
- **自動トースト削除**: 指定時間後に自動的にトーストを削除
- **型安全なモーダル管理**: モーダルIDを文字列で管理（将来的にenumに変更可能）

### useNotes フック

- **トースト通知統合**: すべてのCRUD操作で自動的にトースト通知
- **初回自動フェッチ**: マウント時に自動的にノート一覧を取得
- **便利なトグル関数**: ピン留め、お気に入り、アーカイブのトグル操作

## API連携

### エンドポイント

- `GET /api/notes` - ノート一覧取得
- `GET /api/notes/:id` - 単一ノート取得
- `POST /api/notes` - ノート作成
- `PUT /api/notes/:id` - ノート更新
- `DELETE /api/notes/:id` - ノート削除

### 環境変数

`.env`ファイルでAPIベースURLを設定できます：

```
VITE_API_BASE_URL=http://localhost:3001
```

デフォルトは `http://localhost:3001` です。

## ベストプラクティス

### 1. セレクターを使用してパフォーマンス最適化

```typescript
// 悪い例: 全stateを購読（不要な再レンダリング発生）
const state = useNoteStore()

// 良い例: 必要な値のみ購読
const notes = useNoteStore(state => state.notes)
const isLoading = useNoteStore(state => state.isLoading)
```

### 2. useNotes フックを優先的に使用

```typescript
// 悪い例: Store を直接使用
const createNote = useNoteStore(state => state.createNote)
const addToast = useUIStore(state => state.addToast)

const handleCreate = async () => {
  try {
    await createNote({ title: '新規' })
    addToast({ message: '成功', type: 'success' })
  } catch (error) {
    addToast({ message: 'エラー', type: 'error' })
  }
}

// 良い例: useNotes フックを使用（トースト通知が自動）
const { createNote } = useNotes()

const handleCreate = async () => {
  await createNote({ title: '新規' })
}
```

### 3. エラーハンドリング

```typescript
const { createNote, error, clearError } = useNotes()

useEffect(() => {
  if (error) {
    console.error('Error:', error)
    clearError() // エラーをクリア
  }
}, [error, clearError])
```

## DevTools

Zustand DevTools が有効になっています。ブラウザの React DevTools でストアの状態を確認できます。

## テスト

Storeのテストは以下のパターンで行います：

```typescript
import { renderHook, act } from '@testing-library/react'
import { useNoteStore } from './noteStore'

describe('noteStore', () => {
  it('should create a note', async () => {
    const { result } = renderHook(() => useNoteStore())

    await act(async () => {
      await result.current.createNote({ title: 'Test' })
    })

    expect(result.current.notes).toHaveLength(1)
    expect(result.current.notes[0].title).toBe('Test')
  })
})
```

## トラブルシューティング

### 状態が永続化されない

- ブラウザのlocalStorageを確認
- プライベートブラウジングモードではlocalStorageが無効の場合がある

### トーストが表示されない

- `ToastContainer`コンポーネントをアプリのルートに配置
- CSSスタイルが適用されているか確認

### API呼び出しが失敗する

- ネットワークタブでリクエストを確認
- 環境変数 `VITE_API_BASE_URL` が正しく設定されているか確認
- バックエンドサーバーが起動しているか確認
