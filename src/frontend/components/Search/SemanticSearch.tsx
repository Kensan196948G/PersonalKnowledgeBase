import { useState, useEffect, useRef } from "react";
import { useAiStore } from "../../stores/aiStore";
import type { SearchMode } from "../../types/ai";

export interface SemanticSearchProps {
  onNoteSelect?: (noteId: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SemanticSearch({
  onNoteSelect,
  placeholder = "自然言語で検索...",
  autoFocus = false,
}: SemanticSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    searchMode,
    searchResults,
    isSearching,
    searchError,
    searchSemantic,
    setSearchMode,
    clearSearchResults,
    clearError,
  } = useAiStore();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSearch = async () => {
    if (!query.trim()) {
      clearSearchResults();
      return;
    }
    await searchSemantic(query.trim(), searchMode);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery("");
    clearSearchResults();
    clearError("search");
  };

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    if (query.trim()) {
      searchSemantic(query.trim(), mode);
    }
  };

  const handleResultClick = (noteId: string) => {
    if (onNoteSelect) {
      onNoteSelect(noteId);
    }
  };

  return (
    <div className="semantic-search bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 検索入力エリア */}
      <div className="p-4 border-b border-gray-200">
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

          {/* 検索入力 */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="
              block w-full pl-10 pr-24 py-2
              border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              text-sm transition-colors
            "
          />

          {/* クリア/検索ボタン */}
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {query && (
              <button
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="クリア"
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
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className="
                px-3 py-1 bg-blue-500 text-white rounded-md
                hover:bg-blue-600 active:bg-blue-700
                disabled:bg-gray-300 disabled:cursor-not-allowed
                transition-colors text-sm font-medium
              "
            >
              {isSearching ? "検索中..." : "検索"}
            </button>
          </div>
        </div>

        {/* 検索モード切り替え */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-600">検索モード:</span>
          <div className="flex gap-1">
            <button
              onClick={() => handleModeChange("semantic")}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${searchMode === "semantic" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
              `}
            >
              セマンティック
            </button>
            <button
              onClick={() => handleModeChange("keyword")}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${searchMode === "keyword" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
              `}
            >
              キーワード
            </button>
            <button
              onClick={() => handleModeChange("hybrid")}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${searchMode === "hybrid" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
              `}
            >
              ハイブリッド
            </button>
          </div>
        </div>

        {/* モード説明 */}
        <div className="mt-2 text-xs text-gray-500">
          {searchMode === "semantic" && (
            <span>意味や文脈を理解して関連するノートを検索します</span>
          )}
          {searchMode === "keyword" && (
            <span>キーワードに完全一致するノートを検索します</span>
          )}
          {searchMode === "hybrid" && (
            <span>セマンティック検索とキーワード検索を組み合わせます</span>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {searchError && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-700">{searchError}</p>
            </div>
            <button
              onClick={() => clearError("search")}
              className="text-red-500 hover:text-red-700"
            >
              <svg
                className="h-4 w-4"
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
          </div>
        </div>
      )}

      {/* 検索結果 */}
      <div className="max-h-96 overflow-y-auto">
        {searchResults.length === 0 &&
          !isSearching &&
          query &&
          !searchError && (
            <div className="p-8 text-center text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">
                「{query}」に一致するノートが見つかりませんでした
              </p>
            </div>
          )}

        {searchResults.length > 0 && (
          <div className="divide-y divide-gray-200">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-600">
                {searchResults.length}件のノートが見つかりました
              </p>
            </div>
            {searchResults.map((result) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result.id)}
                className="
                  p-4 hover:bg-gray-50 cursor-pointer transition-colors
                  border-l-4 border-transparent hover:border-blue-500
                "
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {result.title || "無題のノート"}
                    </h3>
                    <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                      {result.snippet || result.content.substring(0, 150)}...
                    </p>
                    {result.tags && result.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {result.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            style={
                              tag.color
                                ? {
                                    backgroundColor: tag.color + "20",
                                    color: tag.color,
                                  }
                                : {}
                            }
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 類似度スコア */}
                  {searchMode !== "keyword" && (
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs font-medium text-blue-600">
                        {Math.round(result.similarity * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">類似度</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ローディング状態 */}
      {isSearching && (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-3 text-sm text-gray-600">検索中...</p>
        </div>
      )}
    </div>
  );
}

export default SemanticSearch;
