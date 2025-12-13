import { useEffect } from "react";
import { useTagStore } from "../../stores/tagStore";

export interface TagFilterSidebarProps {
  /** タグフィルタ変更時のコールバック */
  onFilterChange?: (selectedTagIds: string[]) => void;
}

/**
 * タグフィルターサイドバーコンポーネント
 * サイドバーにタグ一覧を表示し、クリックでフィルタON/OFF
 */
export function TagFilterSidebar({ onFilterChange }: TagFilterSidebarProps) {
  const {
    tags,
    selectedTags,
    fetchTags,
    toggleTagSelection,
    clearTagSelection,
  } = useTagStore();

  // コンポーネントマウント時にタグ一覧を取得
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // 選択タグが変更されたらコールバックを呼ぶ
  useEffect(() => {
    onFilterChange?.(selectedTags);
  }, [selectedTags, onFilterChange]);

  // タグクリック時の処理
  const handleTagClick = (tagId: string) => {
    toggleTagSelection(tagId);
  };

  // フィルタクリア
  const handleClearFilter = () => {
    clearTagSelection();
  };

  return (
    <div className="px-4 py-3 border-t border-gray-200">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          タグでフィルター
        </h3>
        {selectedTags.length > 0 && (
          <button
            onClick={handleClearFilter}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            クリア
          </button>
        )}
      </div>

      {/* 選択中タグ数の表示 */}
      {selectedTags.length > 0 && (
        <div className="mb-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-700">
          {selectedTags.length}個のタグでフィルタ中
        </div>
      )}

      {/* タグ一覧 */}
      <div className="space-y-1">
        {tags.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">
            タグがありません
          </p>
        ) : (
          tags.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg
                  transition-all duration-200 text-left
                  ${
                    isSelected
                      ? "bg-blue-50 ring-2 ring-blue-500 ring-inset"
                      : "hover:bg-gray-50"
                  }
                `}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* チェックボックス風アイコン */}
                  <div
                    className={`
                      w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                      transition-colors
                      ${
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 bg-white"
                      }
                    `}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* タグカラーインジケーター */}
                  {tag.color && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}

                  {/* タグ名 */}
                  <span
                    className={`
                      text-sm truncate
                      ${isSelected ? "font-medium text-blue-900" : "text-gray-700"}
                    `}
                  >
                    {tag.name}
                  </span>
                </div>

                {/* ノート数 */}
                {tag.noteCount !== undefined && (
                  <span
                    className={`
                      text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2
                      ${
                        isSelected
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    {tag.noteCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* ヘルプテキスト */}
      {tags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            複数選択すると、すべてのタグが付いているノートを表示します（AND検索）
          </p>
        </div>
      )}
    </div>
  );
}

export default TagFilterSidebar;
