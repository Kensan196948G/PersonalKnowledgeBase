import { useState, useEffect, useRef } from 'react'

export interface SearchBarProps {
  /** 検索クエリ変更時のコールバック */
  onSearchChange: (query: string) => void
  /** 現在の検索クエリ */
  value?: string
  /** 検索結果件数 */
  resultCount?: number
  /** 総ノート数 */
  totalCount?: number
  /** プレースホルダーテキスト */
  placeholder?: string
  /** デバウンス遅延（ミリ秒） */
  debounceMs?: number
}

/**
 * 検索バーコンポーネント
 * リアルタイム検索（デバウンス付き）、キーボードショートカット対応
 */
export function SearchBar({
  onSearchChange,
  value = '',
  resultCount,
  totalCount,
  placeholder = 'ノートを検索... (Ctrl/Cmd + K)',
  debounceMs = 300,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // キーボードショートカット（Cmd/Ctrl + K）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // デバウンス付き検索
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      onSearchChange(searchQuery)
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, onSearchChange, debounceMs])

  // 外部からのvalue変更を反映
  useEffect(() => {
    setSearchQuery(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleClear = () => {
    setSearchQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="relative">
        {/* 検索アイコン */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 検索入力フィールド */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleChange}
          placeholder={placeholder}
          className="
            block w-full pl-10 pr-10 py-2
            border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            text-sm
            transition-colors
          "
        />

        {/* クリアボタン */}
        {searchQuery && (
          <button
            onClick={handleClear}
            className="
              absolute inset-y-0 right-0 pr-3
              flex items-center
              text-gray-400 hover:text-gray-600
              transition-colors
            "
            title="検索をクリア"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 検索結果件数表示 */}
      {searchQuery && resultCount !== undefined && totalCount !== undefined && (
        <div className="mt-2 text-xs text-gray-500">
          {resultCount > 0 ? (
            <>
              <span className="font-medium text-gray-700">{resultCount}件</span>
              {' '}のノートが見つかりました
              {resultCount < totalCount && (
                <span className="text-gray-400"> (全{totalCount}件中)</span>
              )}
            </>
          ) : (
            <span className="text-gray-600">
              「{searchQuery}」に一致するノートが見つかりませんでした
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
