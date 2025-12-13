import { useState, useEffect, useCallback } from 'react'
import type { NoteListItem } from '../../types/note'
import { SearchBar } from './SearchBar'
import { NoteCard } from './NoteCard'

export interface NoteListProps {
  /** ノート選択時のコールバック */
  onNoteSelect?: (noteId: string) => void
  /** 選択中のノートID */
  selectedNoteId?: string | null
  /** API基底URL */
  apiBaseUrl?: string
  /** 初期ソートフィールド */
  initialSortBy?: 'createdAt' | 'updatedAt' | 'title'
  /** 初期ソート順序 */
  initialOrder?: 'asc' | 'desc'
}

export type SortField = 'createdAt' | 'updatedAt' | 'title'
export type SortOrder = 'asc' | 'desc'

/**
 * ノート一覧表示コンポーネント
 * 検索、ソート、削除機能を含む完全なノート一覧UI
 */
export function NoteList({
  onNoteSelect,
  selectedNoteId = null,
  apiBaseUrl = 'http://localhost:3000',
  initialSortBy = 'updatedAt',
  initialOrder = 'desc',
}: NoteListProps) {
  const [notes, setNotes] = useState<NoteListItem[]>([])
  const [filteredNotes, setFilteredNotes] = useState<NoteListItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortField>(initialSortBy)
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder)

  /**
   * APIからノート一覧を取得
   */
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // クエリパラメータ構築
      const params = new URLSearchParams({
        sortBy,
        order: sortOrder,
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`${apiBaseUrl}/api/notes?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.statusText}`)
      }

      const data = await response.json()
      const notesList = data.data || data

      setNotes(notesList)
      setFilteredNotes(notesList)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching notes:', err)
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, sortBy, sortOrder, searchQuery])

  // 初回ロードとソート/検索変更時にノート取得
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  /**
   * 検索クエリ変更ハンドラ
   */
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  /**
   * ソート変更ハンドラ
   */
  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      // 同じフィールドの場合は順序を反転
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 異なるフィールドの場合はdescをデフォルトに
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  /**
   * ノート削除ハンドラ
   */
  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      // ローカルステートから削除
      setNotes((prev) => prev.filter((note) => note.id !== noteId))
      setFilteredNotes((prev) => prev.filter((note) => note.id !== noteId))

      // 削除したノートが選択中だった場合、選択解除
      if (selectedNoteId === noteId) {
        onNoteSelect?.(null as any)
      }
    } catch (err) {
      console.error('Error deleting note:', err)
      alert('ノートの削除に失敗しました')
    }
  }

  /**
   * ソート表示用のラベル
   */
  const getSortLabel = (field: SortField): string => {
    const labels = {
      updatedAt: '更新日時',
      createdAt: '作成日時',
      title: 'タイトル',
    }
    return labels[field]
  }

  /**
   * ソートアイコン
   */
  const SortIcon = ({ field }: { field: SortField }) => {
    const isActive = sortBy === field
    return (
      <svg
        className={`w-4 h-4 transition-transform ${
          isActive && sortOrder === 'asc' ? 'rotate-180' : ''
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    )
  }

  if (loading && notes.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center flex-1 p-8">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
            <div className="text-gray-500">読み込み中...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center flex-1 p-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md">
            <p className="font-semibold">エラーが発生しました</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={fetchNotes}
              className="
                mt-3 px-4 py-2 text-sm font-medium
                bg-red-600 text-white rounded
                hover:bg-red-700 active:bg-red-800
                transition-colors
              "
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 検索バー */}
      <SearchBar
        onSearchChange={handleSearchChange}
        value={searchQuery}
        resultCount={filteredNotes.length}
        totalCount={notes.length}
      />

      {/* ソートコントロール */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">並び替え:</span>
          {(['updatedAt', 'createdAt', 'title'] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => handleSortChange(field)}
              className={`
                flex items-center gap-1 px-3 py-1 rounded
                transition-colors
                ${
                  sortBy === field
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {getSortLabel(field)}
              <SortIcon field={field} />
            </button>
          ))}
        </div>
      </div>

      {/* ノート一覧 */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <svg
              className="w-16 h-16 mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg font-medium">
              {searchQuery ? '検索結果がありません' : 'ノートがありません'}
            </p>
            <p className="text-sm mt-1">
              {searchQuery
                ? '別のキーワードで検索してみてください'
                : '新しいノートを作成してください'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={note.id === selectedNoteId}
                onClick={onNoteSelect}
                onDelete={handleDeleteNote}
              />
            ))}
          </div>
        )}
      </div>

      {/* フッター：件数表示 */}
      {filteredNotes.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
          {searchQuery ? (
            <>
              {filteredNotes.length}件 / 全{notes.length}件
            </>
          ) : (
            <>{notes.length}件のノート</>
          )}
        </div>
      )}
    </div>
  )
}

export default NoteList
