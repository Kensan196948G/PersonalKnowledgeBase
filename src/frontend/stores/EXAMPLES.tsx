/**
 * Zustand Store 使用例
 *
 * このファイルは実際のコンポーネント例を示すためのドキュメントです。
 * 必要に応じてコピー＆ペーストして使用してください。
 */

import React, { useEffect } from 'react'
import { useNotes } from '../hooks/useNotes'
import { useUIStore } from './uiStore'

// ================================================================
// 例1: ノート一覧表示コンポーネント
// ================================================================

export function NoteListExample() {
  const {
    filteredNotes,
    isLoading,
    error,
    selectNote,
    searchNotes,
    changeSortBy,
  } = useNotes()

  const [searchQuery, setSearchQuery] = React.useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    await searchNotes(searchQuery)
  }

  return (
    <div className="note-list">
      {/* 検索バー */}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ノートを検索..."
        />
        <button type="submit">検索</button>
      </form>

      {/* ソートボタン */}
      <div className="sort-controls">
        <button onClick={() => changeSortBy('updatedAt')}>更新日順</button>
        <button onClick={() => changeSortBy('createdAt')}>作成日順</button>
        <button onClick={() => changeSortBy('title')}>タイトル順</button>
      </div>

      {/* エラー表示 */}
      {error && <div className="error">{error}</div>}

      {/* ローディング */}
      {isLoading && <div className="loading">読み込み中...</div>}

      {/* ノート一覧 */}
      <ul>
        {filteredNotes.map((note) => (
          <li
            key={note.id}
            onClick={() => selectNote(note.id)}
            className={note.isPinned ? 'pinned' : ''}
          >
            <h3>{note.title}</h3>
            <p>{note.content.substring(0, 100)}...</p>
            <small>
              {new Date(note.updatedAt).toLocaleDateString()}
            </small>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ================================================================
// 例2: ノートエディタコンポーネント
// ================================================================

export function NoteEditorExample() {
  const {
    selectedNote,
    updateNote,
    createNote,
    togglePinNote,
    toggleFavoriteNote,
  } = useNotes()

  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')

  // 選択中のノートが変わったらフォームを更新
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title)
      setContent(selectedNote.content)
    } else {
      setTitle('')
      setContent('')
    }
  }, [selectedNote])

  const handleSave = async () => {
    if (selectedNote) {
      // 既存ノート更新
      await updateNote(selectedNote.id, { title, content })
    } else {
      // 新規ノート作成
      await createNote({ title, content })
    }
  }

  const handleNewNote = async () => {
    const newNote = await createNote({ title: '新しいノート' })
    setTitle(newNote.title)
    setContent(newNote.content)
  }

  if (!selectedNote) {
    return (
      <div className="note-editor-empty">
        <p>ノートを選択するか、新規作成してください</p>
        <button onClick={handleNewNote}>新規ノート作成</button>
      </div>
    )
  }

  return (
    <div className="note-editor">
      {/* ツールバー */}
      <div className="toolbar">
        <button onClick={handleSave}>保存</button>
        <button onClick={() => togglePinNote(selectedNote.id)}>
          {selectedNote.isPinned ? '📌 ピン解除' : '📍 ピン留め'}
        </button>
        <button onClick={() => toggleFavoriteNote(selectedNote.id)}>
          {selectedNote.isFavorite ? '⭐ お気に入り解除' : '☆ お気に入り'}
        </button>
      </div>

      {/* エディタフォーム */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル"
        className="title-input"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="ノートの内容を入力..."
        className="content-textarea"
        rows={20}
      />

      <div className="metadata">
        <small>作成日: {new Date(selectedNote.createdAt).toLocaleString()}</small>
        <small>更新日: {new Date(selectedNote.updatedAt).toLocaleString()}</small>
      </div>
    </div>
  )
}

// ================================================================
// 例3: サイドバーコンポーネント
// ================================================================

export function SidebarExample() {
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen)
  const toggleSidebar = useUIStore(state => state.toggleSidebar)
  const { filteredNotes, selectNote } = useNotes()

  return (
    <>
      {/* トグルボタン */}
      <button
        onClick={toggleSidebar}
        className="sidebar-toggle"
        aria-label="サイドバートグル"
      >
        {isSidebarOpen ? '◀' : '▶'}
      </button>

      {/* サイドバー */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <h2>ノート一覧</h2>
        <ul>
          {filteredNotes.map((note) => (
            <li
              key={note.id}
              onClick={() => selectNote(note.id)}
            >
              {note.isPinned && '📌 '}
              {note.isFavorite && '⭐ '}
              {note.title}
            </li>
          ))}
        </ul>
      </aside>
    </>
  )
}

// ================================================================
// 例4: トースト通知コンポーネント
// ================================================================

export function ToastContainerExample() {
  const toasts = useUIStore(state => state.toasts)
  const removeToast = useUIStore(state => state.removeToast)

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation()
              removeToast(toast.id)
            }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// ================================================================
// 例5: モーダルコンポーネント
// ================================================================

export function DeleteConfirmModalExample() {
  const activeModal = useUIStore(state => state.activeModal)
  const openModal = useUIStore(state => state.openModal)
  const closeModal = useUIStore(state => state.closeModal)
  const { selectedNote, deleteNote } = useNotes()

  const handleDeleteClick = () => {
    openModal('delete-confirm')
  }

  const handleConfirmDelete = async () => {
    if (selectedNote) {
      await deleteNote(selectedNote.id)
      closeModal()
    }
  }

  return (
    <>
      {/* 削除ボタン */}
      <button onClick={handleDeleteClick} className="delete-button">
        削除
      </button>

      {/* モーダル */}
      {activeModal === 'delete-confirm' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>ノートを削除</h3>
            <p>
              「{selectedNote?.title}」を削除してもよろしいですか？<br />
              この操作は取り消せません。
            </p>
            <div className="modal-actions">
              <button onClick={closeModal}>キャンセル</button>
              <button onClick={handleConfirmDelete} className="danger">
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ================================================================
// 例6: アプリケーション全体の統合例
// ================================================================

export function AppExample() {
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen)

  return (
    <div className="app">
      {/* トースト通知（常に表示） */}
      <ToastContainerExample />

      {/* サイドバー */}
      <SidebarExample />

      {/* メインコンテンツ */}
      <main className={isSidebarOpen ? 'with-sidebar' : 'full-width'}>
        <NoteEditorExample />
      </main>

      {/* モーダル */}
      <DeleteConfirmModalExample />
    </div>
  )
}

// ================================================================
// 例7: カスタムフックの作成例
// ================================================================

/**
 * お気に入りノートのみをフィルタするカスタムフック
 */
export function useFavoriteNotes() {
  const { filteredNotes } = useNotes()
  return filteredNotes.filter(note => note.isFavorite)
}

/**
 * ピン留めノートのみをフィルタするカスタムフック
 */
export function usePinnedNotes() {
  const { filteredNotes } = useNotes()
  return filteredNotes.filter(note => note.isPinned)
}

/**
 * 自動保存フックの例
 */
export function useAutoSave(noteId: string, content: string, delay = 1000) {
  const { updateNote } = useNotes()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (noteId && content) {
        updateNote(noteId, { content })
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [noteId, content, delay, updateNote])
}
