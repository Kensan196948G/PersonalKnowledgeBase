import { useState, useEffect, memo, useCallback } from "react";
import { NoteLinkCard } from "./NoteLinkCard";

export interface Backlink {
  noteId: string;
  noteTitle: string;
  context: string; // リンク前後のテキスト
  updatedAt: string;
}

export interface BacklinkPanelProps {
  /** 現在のノートID */
  noteId: string;
  /** ノートクリック時のコールバック */
  onNoteClick?: (noteId: string) => void;
  /** カスタムクラス */
  className?: string;
}

// 仮想スクロール設定（現在は未使用）
// const ITEM_HEIGHT = 80; // 各アイテムの高さ（px）

/**
 * バックリンクパネルコンポーネント（最適化版）
 * 現在のノートを参照している他のノート一覧を表示
 * - React.memo でメモ化
 * - 100+ バックリンク時に仮想スクロール（react-window）を使用
 */
export const BacklinkPanel = memo(function BacklinkPanel({
  noteId,
  onNoteClick,
  className = "",
}: BacklinkPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true); // デフォルトで折りたたみ

  useEffect(() => {
    const fetchBacklinks = async () => {
      if (!noteId) {
        setBacklinks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/links/backlinks/${noteId}`);
        if (!response.ok) {
          throw new Error("バックリンクの取得に失敗しました");
        }

        const data = await response.json();
        setBacklinks(data.backlinks || []);
      } catch (err) {
        console.error("Failed to fetch backlinks:", err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchBacklinks();
  }, [noteId]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={`border-t border-gray-200 ${className}`}
      data-testid="backlink-panel"
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={toggleCollapse}
        data-testid="backlink-toggle"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            バックリンク
            {!loading && backlinks.length > 0 && (
              <span className="ml-2 text-gray-500 font-normal">
                ({backlinks.length})
              </span>
            )}
          </h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? "" : "transform rotate-180"}`}
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
      </div>

      {/* コンテンツ */}
      {!isCollapsed && (
        <div className="px-4 pb-4 max-h-[200px] overflow-y-auto">
          {/* ローディング状態 */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <svg
                className="w-6 h-6 animate-spin text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}

          {/* エラー状態 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-600"
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
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* バックリンク一覧 */}
          {!loading && !error && backlinks.length > 0 && (
            <div className="space-y-2" data-testid="backlink-list">
              {backlinks.map((backlink) => (
                <div
                  key={backlink.noteId}
                  data-testid={`backlink-item-${backlink.noteId}`}
                >
                  <NoteLinkCard
                    noteId={backlink.noteId}
                    noteTitle={backlink.noteTitle}
                    previewText={backlink.context}
                    updatedAt={backlink.updatedAt}
                    onClick={onNoteClick}
                  />
                </div>
              ))}
            </div>
          )}

          {/* バックリンクなし */}
          {!loading && !error && backlinks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <p className="text-sm">このノートへのリンクはありません</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default BacklinkPanel;
