import { useState, useEffect } from "react";
import { NoteLinkCard } from "./NoteLinkCard";

export interface OutgoingLink {
  noteId: string;
  noteTitle: string;
  anchorText?: string; // [[ノート名|表示テキスト]] の「表示テキスト」部分
  exists: boolean; // リンク先が存在するか
  updatedAt?: string;
}

export interface OutgoingLinksPanelProps {
  /** 現在のノートID */
  noteId: string;
  /** ノートクリック時のコールバック */
  onNoteClick?: (noteId: string) => void;
  /** カスタムクラス */
  className?: string;
}

/**
 * 発リンク（アウトゴーイングリンク）パネルコンポーネント
 * 現在のノートから他のノートへのリンク一覧を表示
 */
export function OutgoingLinksPanel({
  noteId,
  onNoteClick,
  className = "",
}: OutgoingLinksPanelProps) {
  const [outgoingLinks, setOutgoingLinks] = useState<OutgoingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true); // デフォルトで折りたたみ

  useEffect(() => {
    const fetchOutgoingLinks = async () => {
      if (!noteId) {
        setOutgoingLinks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/links/${noteId}`);
        if (!response.ok) {
          throw new Error("発リンクの取得に失敗しました");
        }

        const data = await response.json();
        setOutgoingLinks(data.links || []);
      } catch (err) {
        console.error("Failed to fetch outgoing links:", err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchOutgoingLinks();
  }, [noteId]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // 存在するリンクと存在しないリンクを分類
  const existingLinks = outgoingLinks.filter((link) => link.exists);
  const missingLinks = outgoingLinks.filter((link) => !link.exists);

  return (
    <div
      className={`border-t border-gray-200 ${className}`}
      data-testid="outgoing-links-panel"
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={toggleCollapse}
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
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            発リンク
            {!loading && outgoingLinks.length > 0 && (
              <span className="ml-2 text-gray-500 font-normal">
                ({outgoingLinks.length})
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

          {/* 発リンク一覧 */}
          {!loading && !error && outgoingLinks.length > 0 && (
            <div className="space-y-4" data-testid="outgoing-links-list">
              {/* 存在するリンク */}
              {existingLinks.length > 0 && (
                <div className="space-y-2">
                  {existingLinks.map((link) => (
                    <div
                      key={link.noteId}
                      data-testid={`outgoing-link-item-${link.noteId}`}
                    >
                      <NoteLinkCard
                        noteId={link.noteId}
                        noteTitle={link.anchorText || link.noteTitle}
                        updatedAt={link.updatedAt}
                        onClick={onNoteClick}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 存在しないリンク（赤リンク） */}
              {missingLinks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg
                      className="w-4 h-4 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>リンク先が存在しません</span>
                  </div>
                  {missingLinks.map((link, index) => (
                    <div
                      key={`missing-${index}`}
                      className="p-3 rounded-lg border border-red-200 bg-red-50"
                    >
                      <h4 className="font-medium text-red-900">
                        {link.anchorText || link.noteTitle}
                      </h4>
                      <p className="text-xs text-red-700 mt-1">
                        クリックして新しいノートを作成
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 発リンクなし */}
          {!loading && !error && outgoingLinks.length === 0 && (
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              <p className="text-sm">このノートからのリンクはありません</p>
              <p className="text-xs mt-1">
                [[ノート名]]の形式でリンクを作成できます
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OutgoingLinksPanel;
