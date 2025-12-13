import type { Tag, Folder } from "../../types/note";

export interface SearchFilterChipsProps {
  /** 検索クエリ */
  searchQuery?: string;
  /** 選択されたタグID */
  selectedTags?: string[];
  /** タグモード */
  tagsMode?: "AND" | "OR";
  /** 選択されたフォルダID */
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

  /** 検索クエリクリアのコールバック */
  onClearQuery?: () => void;
  /** タグクリアのコールバック */
  onClearTag?: (tagId: string) => void;
  /** フォルダクリアのコールバック */
  onClearFolder?: () => void;
  /** 日付範囲クリアのコールバック */
  onClearDateRange?: () => void;
  /** ピン留めフィルタクリアのコールバック */
  onClearPinned?: () => void;
  /** お気に入りフィルタクリアのコールバック */
  onClearFavorite?: () => void;
  /** 全フィルタクリアのコールバック */
  onClearAll?: () => void;
}

/**
 * 検索フィルタチップ表示コンポーネント
 * アクティブな検索条件をチップ形式で表示し、個別に削除可能
 */
export function SearchFilterChips({
  searchQuery,
  selectedTags = [],
  tagsMode = "AND",
  selectedFolder,
  fromDate,
  toDate,
  isPinned,
  isFavorite,
  availableTags,
  availableFolders,
  onClearQuery,
  onClearTag,
  onClearFolder,
  onClearDateRange,
  onClearPinned,
  onClearFavorite,
  onClearAll,
}: SearchFilterChipsProps) {
  // フィルタが適用されているかチェック
  const hasActiveFilters =
    searchQuery ||
    selectedTags.length > 0 ||
    selectedFolder ||
    fromDate ||
    toDate ||
    isPinned !== null ||
    isFavorite !== null;

  if (!hasActiveFilters) {
    return null;
  }

  // タグIDから名前を取得
  const getTagName = (tagId: string): string => {
    const tag = availableTags.find((t) => t.id === tagId);
    return tag?.name || tagId;
  };

  // タグIDから色を取得
  const getTagColor = (tagId: string): string | null => {
    const tag = availableTags.find((t) => t.id === tagId);
    return tag?.color || null;
  };

  // フォルダIDから名前を取得
  const getFolderName = (folderId: string): string => {
    const folder = availableFolders.find((f) => f.id === folderId);
    return folder?.name || folderId;
  };

  // 日付フォーマット
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600 font-medium">検索条件:</span>

        {/* 検索クエリチップ */}
        {searchQuery && (
          <Chip
            label={`キーワード: "${searchQuery}"`}
            onRemove={onClearQuery}
            color="blue"
          />
        )}

        {/* タグチップ */}
        {selectedTags.map((tagId) => (
          <Chip
            key={tagId}
            label={`タグ: ${getTagName(tagId)}`}
            onRemove={() => onClearTag?.(tagId)}
            color={getTagColor(tagId) || "green"}
            badge={selectedTags.length > 1 ? tagsMode : undefined}
          />
        ))}

        {/* フォルダチップ */}
        {selectedFolder && (
          <Chip
            label={`フォルダ: ${getFolderName(selectedFolder)}`}
            onRemove={onClearFolder}
            color="purple"
          />
        )}

        {/* 日付範囲チップ */}
        {(fromDate || toDate) && (
          <Chip
            label={`作成日: ${fromDate ? formatDate(fromDate) : "〜"} 〜 ${toDate ? formatDate(toDate) : "〜"}`}
            onRemove={onClearDateRange}
            color="orange"
          />
        )}

        {/* ピン留めチップ */}
        {isPinned === true && (
          <Chip
            label="ピン留めのみ"
            onRemove={onClearPinned}
            color="red"
          />
        )}

        {/* お気に入りチップ */}
        {isFavorite === true && (
          <Chip
            label="お気に入りのみ"
            onRemove={onClearFavorite}
            color="yellow"
          />
        )}

        {/* 全クリアボタン */}
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="
              ml-2 px-2 py-1 text-xs font-medium
              text-gray-600 hover:text-gray-800
              bg-gray-200 hover:bg-gray-300
              rounded transition-colors
            "
          >
            すべてクリア
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * チップコンポーネント（内部使用）
 */
interface ChipProps {
  label: string;
  onRemove?: () => void;
  color?: string;
  badge?: string;
}

function Chip({ label, onRemove, color = "gray", badge }: ChipProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    green: "bg-green-100 text-green-800 border-green-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    red: "bg-red-100 text-red-800 border-red-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const chipColor = color.startsWith("#")
    ? undefined
    : colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;

  const chipStyle = color.startsWith("#")
    ? {
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
      }
    : undefined;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-3 py-1
        border rounded-full text-sm font-medium
        transition-colors
        ${chipColor || ""}
      `}
      style={chipStyle}
    >
      {badge && (
        <span className="px-1.5 py-0.5 text-xs font-bold bg-white bg-opacity-60 rounded">
          {badge}
        </span>
      )}
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="
            ml-1 hover:bg-white hover:bg-opacity-40
            rounded-full p-0.5 transition-colors
          "
          title="削除"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}

export default SearchFilterChips;
