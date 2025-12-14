export interface NoteLinkCardProps {
  /** ノートID */
  noteId: string;
  /** ノートタイトル */
  noteTitle: string;
  /** プレビューテキスト（コンテキスト） */
  previewText?: string;
  /** 更新日時 */
  updatedAt?: string;
  /** スコア（関連ノート用） */
  score?: number;
  /** 関連理由（関連ノート用） */
  reason?: string;
  /** クリック時のコールバック */
  onClick?: (noteId: string) => void;
  /** カスタムクラス */
  className?: string;
}

/**
 * ノートリンクカード共通コンポーネント
 * バックリンク、関連ノート、発リンクで使用
 */
export function NoteLinkCard({
  noteId,
  noteTitle,
  previewText,
  updatedAt,
  score,
  reason,
  onClick,
  className = "",
}: NoteLinkCardProps) {
  /**
   * 日時フォーマット（相対時間表示）
   */
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    // 1週間以上前は日付表示
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /**
   * スコアを星アイコンに変換（5段階）
   */
  const renderScore = (score: number) => {
    const stars = Math.min(5, Math.max(1, Math.ceil(score / 20)));
    return (
      <div className="flex items-center gap-0.5" title={`関連度: ${score}`}>
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-3 h-3 ${i < stars ? "text-yellow-400" : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const handleClick = () => {
    onClick?.(noteId);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        p-3 rounded-lg border border-gray-200
        hover:border-blue-400 hover:bg-blue-50
        cursor-pointer transition-all duration-200
        ${className}
      `}
    >
      {/* タイトルとスコア */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 flex-1 truncate">
          {noteTitle || "無題のノート"}
        </h4>
        {score !== undefined && (
          <div className="ml-2 flex-shrink-0">{renderScore(score)}</div>
        )}
      </div>

      {/* プレビューテキスト（コンテキスト） */}
      {previewText && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{previewText}</p>
      )}

      {/* フッター：更新日時と関連理由 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {updatedAt && (
          <span title={new Date(updatedAt).toLocaleString("ja-JP")}>
            {formatRelativeTime(updatedAt)}
          </span>
        )}
        {reason && <span className="text-blue-600 font-medium">{reason}</span>}
      </div>
    </div>
  );
}

export default NoteLinkCard;
