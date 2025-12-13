import { useState } from "react";
import type { NoteListItem } from "../../types/note";
import { extractTextFromTipTap, truncateText } from "../../lib/utils";

export interface NoteCardProps {
  /** ノートデータ */
  note: NoteListItem;
  /** 選択状態 */
  isSelected?: boolean;
  /** クリック時のコールバック */
  onClick?: (noteId: string) => void;
  /** 削除時のコールバック */
  onDelete?: (noteId: string) => void;
  /** タグクリック時のコールバック（フィルタ用） */
  onTagClick?: (tagId: string) => void;
}

/**
 * 個別ノートカードコンポーネント
 * タイトル、プレビュー、メタ情報、削除ボタンを表示
 */
export function NoteCard({
  note,
  isSelected = false,
  onClick,
  onDelete,
  onTagClick,
}: NoteCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // コンテンツプレビュー: TipTap JSONから純粋なテキストを抽出
  const contentText = extractTextFromTipTap(note.content);
  const previewText = truncateText(contentText, 150);

  const handleCardClick = () => {
    if (!showDeleteConfirm) {
      onClick?.(note.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await onDelete?.(note.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        relative p-4 cursor-pointer transition-all duration-200
        border-l-4
        ${
          isSelected
            ? "bg-blue-50 border-blue-500 shadow-sm"
            : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-200"
        }
        ${isDeleting ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      {/* 削除確認オーバーレイ */}
      {showDeleteConfirm && (
        <div
          className="absolute inset-0 bg-red-50 border-2 border-red-500 rounded-lg p-4 z-10 flex flex-col items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium text-red-900 mb-3">
            このノートを削除しますか？
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="
                px-3 py-1.5 text-sm font-medium
                bg-red-600 text-white rounded
                hover:bg-red-700 active:bg-red-800
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {isDeleting ? "削除中..." : "削除"}
            </button>
            <button
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="
                px-3 py-1.5 text-sm font-medium
                bg-gray-200 text-gray-700 rounded
                hover:bg-gray-300 active:bg-gray-400
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ヘッダー部分：タイトルとアイコン */}
      <div className="flex items-start justify-between mb-2">
        <h3
          className={`
            font-medium flex-1 truncate
            ${isSelected ? "text-blue-900" : "text-gray-900"}
          `}
        >
          {note.title || "無題のノート"}
        </h3>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {/* ピン留めアイコン */}
          {note.isPinned && (
            <span className="text-yellow-500" title="ピン留め">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1 1 0 011 1v5h3a1 1 0 110 2h-3v5a1 1 0 11-2 0v-5H6a1 1 0 110-2h3V4a1 1 0 011-1z" />
              </svg>
            </span>
          )}

          {/* お気に入りアイコン */}
          {note.isFavorite && (
            <span className="text-red-500" title="お気に入り">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}

          {/* 削除ボタン */}
          {onDelete && !showDeleteConfirm && (
            <button
              onClick={handleDeleteClick}
              className="
                p-1 rounded text-gray-400
                hover:text-red-600 hover:bg-red-50
                transition-colors
              "
              title="削除"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* プレビューテキスト */}
      {previewText && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{previewText}</p>
      )}

      {/* フッター部分：メタ情報 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {/* 更新日時 */}
          <span title={new Date(note.updatedAt).toLocaleString("ja-JP")}>
            {formatRelativeTime(note.updatedAt)}
          </span>

          {/* フォルダ */}
          {note.folder && (
            <span className="flex items-center">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              {note.folder.name}
            </span>
          )}

          {/* タグ数 */}
          {note.tags && note.tags.length > 0 && (
            <span className="flex items-center">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
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
            <button
              key={noteTag.tagId}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(noteTag.tagId);
              }}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:ring-2 hover:ring-offset-1 transition-all"
              style={
                noteTag.tag.color
                  ? {
                      backgroundColor: `${noteTag.tag.color}20`,
                      color: noteTag.tag.color,
                    }
                  : undefined
              }
              title={`${noteTag.tag.name}でフィルタ`}
            >
              {noteTag.tag.name}
            </button>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-gray-400">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default NoteCard;
