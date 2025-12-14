import { useState, useEffect, useRef } from "react";
import type { Tag, Folder } from "../../types/note";

export interface AdvancedSearchBarProps {
  /** 検索クエリ変更時のコールバック */
  onSearchChange: (query: string) => void;
  /** タグフィルタ変更時のコールバック */
  onTagsChange: (tagIds: string[], mode: "AND" | "OR") => void;
  /** フォルダフィルタ変更時のコールバック */
  onFolderChange: (folderId: string | null) => void;
  /** 日付範囲変更時のコールバック */
  onDateRangeChange: (fromDate: string | null, toDate: string | null) => void;
  /** ピン留めフィルタ変更時のコールバック */
  onPinnedChange: (isPinned: boolean | null) => void;
  /** お気に入りフィルタ変更時のコールバック */
  onFavoriteChange: (isFavorite: boolean | null) => void;
  /** 全フィルタクリアのコールバック */
  onClearFilters: () => void;

  /** 現在の検索クエリ */
  searchQuery?: string;
  /** 現在の選択タグ */
  selectedTags?: string[];
  /** タグ検索モード */
  tagsMode?: "AND" | "OR";
  /** 現在の選択フォルダ */
  selectedFolder?: string | null;
  /** 開始日 */
  fromDate?: string | null;
  /** 終了日 */
  toDate?: string | null;
  /** ピン留めフィルタ */
  isPinned?: boolean | null;
  /** お気に入りフィルタ */
  isFavorite?: boolean | null;

  /** 利用可能なタグ一覧 */
  availableTags: Tag[];
  /** 利用可能なフォルダ一覧 */
  availableFolders: Folder[];

  /** 検索結果件数 */
  resultCount?: number;
  /** 総ノート数 */
  totalCount?: number;
  /** デバウンス遅延（ミリ秒） */
  debounceMs?: number;
  /** 展開/折りたたみ状態 */
  defaultExpanded?: boolean;
}

/**
 * 高度検索バーコンポーネント
 * キーワード、タグ、フォルダ、日付範囲、フラグによる複合検索
 */
export function AdvancedSearchBar({
  onSearchChange,
  onTagsChange,
  onFolderChange,
  onDateRangeChange,
  onPinnedChange,
  onFavoriteChange,
  onClearFilters,
  searchQuery = "",
  selectedTags = [],
  tagsMode = "AND",
  selectedFolder = null,
  fromDate = null,
  toDate = null,
  isPinned = null,
  isFavorite = null,
  availableTags,
  availableFolders,
  resultCount,
  totalCount,
  debounceMs = 300,
  defaultExpanded = false,
}: AdvancedSearchBarProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [localTags, setLocalTags] = useState<string[]>(selectedTags);
  const [localTagsMode, setLocalTagsMode] = useState<"AND" | "OR">(tagsMode);
  const [localFolder, setLocalFolder] = useState<string | null>(selectedFolder);
  const [localFromDate, setLocalFromDate] = useState<string | null>(fromDate);
  const [localToDate, setLocalToDate] = useState<string | null>(toDate);
  const [localIsPinned, setLocalIsPinned] = useState<boolean | null>(isPinned);
  const [localIsFavorite, setLocalIsFavorite] = useState<boolean | null>(
    isFavorite,
  );
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // キーボードショートカット（Cmd/Ctrl + K）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // デバウンス付き検索クエリ変更
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onSearchChange(localSearchQuery);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localSearchQuery, onSearchChange, debounceMs]);

  // タグ選択切り替え
  const toggleTag = (tagId: string) => {
    const newTags = localTags.includes(tagId)
      ? localTags.filter((id) => id !== tagId)
      : [...localTags, tagId];
    setLocalTags(newTags);
    onTagsChange(newTags, localTagsMode);
  };

  // タグモード変更
  const handleTagsModeChange = (mode: "AND" | "OR") => {
    setLocalTagsMode(mode);
    onTagsChange(localTags, mode);
  };

  // フォルダ選択変更
  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const folderId = e.target.value === "" ? null : e.target.value;
    setLocalFolder(folderId);
    onFolderChange(folderId);
  };

  // 日付範囲変更
  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value || null;
    setLocalFromDate(date);
    onDateRangeChange(date, localToDate);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value || null;
    setLocalToDate(date);
    onDateRangeChange(localFromDate, date);
  };

  // ピン留めフィルタ切り替え
  const togglePinnedFilter = () => {
    const newValue = localIsPinned === true ? null : true;
    setLocalIsPinned(newValue);
    onPinnedChange(newValue);
  };

  // お気に入りフィルタ切り替え
  const toggleFavoriteFilter = () => {
    const newValue = localIsFavorite === true ? null : true;
    setLocalIsFavorite(newValue);
    onFavoriteChange(newValue);
  };

  // 全フィルタクリア
  const handleClearAll = () => {
    setLocalSearchQuery("");
    setLocalTags([]);
    setLocalTagsMode("AND");
    setLocalFolder(null);
    setLocalFromDate(null);
    setLocalToDate(null);
    setLocalIsPinned(null);
    setLocalIsFavorite(null);
    onClearFilters();
  };

  // フィルタが適用されているかチェック
  const hasActiveFilters =
    localSearchQuery ||
    localTags.length > 0 ||
    localFolder ||
    localFromDate ||
    localToDate ||
    localIsPinned !== null ||
    localIsFavorite !== null;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* 基本検索バー */}
      <div className="p-4">
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
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="ノートを検索... (Ctrl/Cmd + K)"
            className="
              block w-full pl-10 pr-20 py-2
              border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              text-sm
              transition-colors
            "
          />

          {/* 展開トグルボタン */}
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-2">
            {localSearchQuery && (
              <button
                onClick={() => setLocalSearchQuery("")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1"
              title={isExpanded ? "詳細検索を閉じる" : "詳細検索を開く"}
            >
              <svg
                className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
            </button>
          </div>
        </div>

        {/* 検索結果件数 */}
        {localSearchQuery &&
          resultCount !== undefined &&
          totalCount !== undefined && (
            <div className="mt-2 text-xs text-gray-500">
              {resultCount > 0 ? (
                <>
                  <span className="font-medium text-gray-700">
                    {resultCount}件
                  </span>{" "}
                  のノートが見つかりました
                  {resultCount < totalCount && (
                    <span className="text-gray-400"> (全{totalCount}件中)</span>
                  )}
                </>
              ) : (
                <span className="text-gray-600">
                  「{localSearchQuery}」に一致するノートが見つかりませんでした
                </span>
              )}
            </div>
          )}
      </div>

      {/* 高度検索オプション */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* タグフィルタ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タグ
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`
                    px-3 py-1 rounded-full text-sm font-medium transition-colors
                    ${
                      localTags.includes(tag.id)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }
                  `}
                  style={
                    localTags.includes(tag.id) && tag.color
                      ? { backgroundColor: tag.color }
                      : {}
                  }
                >
                  {tag.name}
                </button>
              ))}
            </div>
            {localTags.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">モード:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    checked={localTagsMode === "AND"}
                    onChange={() => handleTagsModeChange("AND")}
                    className="text-blue-500"
                  />
                  <span className="text-gray-700">AND（全て含む）</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    checked={localTagsMode === "OR"}
                    onChange={() => handleTagsModeChange("OR")}
                    className="text-blue-500"
                  />
                  <span className="text-gray-700">OR（いずれか含む）</span>
                </label>
              </div>
            )}
          </div>

          {/* フォルダフィルタ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              フォルダ
            </label>
            <select
              value={localFolder || ""}
              onChange={handleFolderChange}
              className="
                block w-full px-3 py-2
                border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                text-sm
              "
            >
              <option value="">すべてのフォルダ</option>
              {availableFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* 日付範囲フィルタ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作成日
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={localFromDate || ""}
                onChange={handleFromDateChange}
                className="
                  flex-1 px-3 py-2
                  border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  text-sm
                "
              />
              <span className="text-gray-500">〜</span>
              <input
                type="date"
                value={localToDate || ""}
                onChange={handleToDateChange}
                className="
                  flex-1 px-3 py-2
                  border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  text-sm
                "
              />
            </div>
          </div>

          {/* フラグフィルタ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              その他
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localIsPinned === true}
                  onChange={togglePinnedFilter}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">ピン留めのみ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localIsFavorite === true}
                  onChange={toggleFavoriteFilter}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">お気に入りのみ</span>
              </label>
            </div>
          </div>

          {/* クリアボタン */}
          {hasActiveFilters && (
            <div className="pt-2">
              <button
                onClick={handleClearAll}
                className="
                  w-full px-4 py-2
                  bg-gray-100 text-gray-700 rounded-lg
                  hover:bg-gray-200 active:bg-gray-300
                  transition-colors text-sm font-medium
                "
              >
                すべてのフィルタをクリア
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdvancedSearchBar;
