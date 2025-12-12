import { useState, useEffect } from 'react'
import type { NoteListItem } from '../types/note'

export interface NoteListProps {
  /** ノート選択時のコールバック */
  onNoteSelect?: (noteId: string) => void
  /** 選択中のノートID */
  selectedNoteId?: string | null
  /** API基底URL */
  apiBaseUrl?: string
}

/**
 * ノート一覧表示コンポーネント
 * APIからノート一覧を取得して表示し、クリックで選択できる
 */
export function NoteList({
  onNoteSelect,
  selectedNoteId = null,
  apiBaseUrl = 'http://localhost:3000',
}: NoteListProps) {
  const [notes, setNotes] = useState<NoteListItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotes()
  }, [])

  /**
   * APIからノート一覧を取得
   */
  const fetchNotes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/api/notes`)

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.statusText}`)
      }

      const data: NoteListItem[] = await response.json()
      setNotes(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching notes:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * ノートクリック時のハンドラ
   */
  const handleNoteClick = (noteId: string) => {
    onNoteSelect?.(noteId)
  }

  /**
   * 日時フォーマット（相対時間表示）
   */
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '今'
    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`

    // 1週間以上前は日付表示
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  /**
   * コンテンツのプレビューテキストを生成（HTMLタグを除去）
   */
  const getPreviewText = (html: string, maxLength: number = 100): string => {
    const text = html.replace(/<[^>]*>/g, '').trim()
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">エラーが発生しました</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchNotes}
            className="mt-2 text-sm underline hover:no-underline"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
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
        <p className="text-lg font-medium">ノートがありません</p>
        <p className="text-sm mt-1">新しいノートを作成してください</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {notes.map((note) => {
        const isSelected = note.id === selectedNoteId
        const previewText = getPreviewText(note.content)

        return (
          <div
            key={note.id}
            onClick={() => handleNoteClick(note.id)}
            className={`
              p-4 cursor-pointer transition-colors
              hover:bg-gray-50
              ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}
            `}
          >
            {/* ヘッダー部分：タイトルとピン */}
            <div className="flex items-start justify-between mb-2">
              <h3 className={`
                font-medium flex-1
                ${isSelected ? 'text-blue-900' : 'text-gray-900'}
              `}>
                {note.title || '無題のノート'}
              </h3>
              {note.isPinned && (
                <span className="ml-2 text-yellow-500" title="ピン留め">
                  📌
                </span>
              )}
              {note.isFavorite && (
                <span className="ml-2 text-red-500" title="お気に入り">
                  ❤️
                </span>
              )}
            </div>

            {/* プレビューテキスト */}
            {previewText && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {previewText}
              </p>
            )}

            {/* フッター部分：メタ情報 */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-3">
                {/* 更新日時 */}
                <span title={new Date(note.updatedAt).toLocaleString('ja-JP')}>
                  {formatRelativeTime(note.updatedAt)}
                </span>

                {/* フォルダ */}
                {note.folder && (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    {note.folder.name}
                  </span>
                )}

                {/* タグ数 */}
                {note.tags && note.tags.length > 0 && (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {note.tags.length}
                  </span>
                )}
              </div>

              {/* アーカイブ状態 */}
              {note.isArchived && (
                <span className="text-gray-400 text-xs">アーカイブ済み</span>
              )}
            </div>

            {/* タグリスト（あれば表示） */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {note.tags.slice(0, 3).map((noteTag) => (
                  <span
                    key={noteTag.tagId}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                    style={
                      noteTag.tag.color
                        ? {
                            backgroundColor: `${noteTag.tag.color}20`,
                            color: noteTag.tag.color,
                          }
                        : undefined
                    }
                  >
                    {noteTag.tag.name}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default NoteList
