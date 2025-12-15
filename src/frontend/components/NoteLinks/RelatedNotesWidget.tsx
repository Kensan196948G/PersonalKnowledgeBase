import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { NoteLinkCard } from "./NoteLinkCard";

export interface RelatedNote {
  noteId: string;
  noteTitle: string;
  score: number;
  reason: string; // "3個の共通タグ" 等
  updatedAt?: string;
}

export interface RelatedNotesWidgetProps {
  /** 現在のノートID */
  noteId: string;
  /** ノートクリック時のコールバック */
  onNoteClick?: (noteId: string) => void;
  /** 表示件数（デフォルト: 5） */
  limit?: number;
  /** カスタムクラス */
  className?: string;
}

// キャッシュ設定
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5分間有効
const CACHE_KEY_PREFIX = "related-notes-cache-";

interface CachedData {
  data: RelatedNote[];
  timestamp: number;
}

/**
 * 関連ノートウィジェットコンポーネント（最適化版）
 * 現在のノートと関連性の高いノートを自動提案
 * - React.memo でメモ化
 * - localStorage キャッシング（5分間有効）
 */
export const RelatedNotesWidget = memo(function RelatedNotesWidget({
  noteId,
  onNoteClick,
  limit = 5,
  className = "",
}: RelatedNotesWidgetProps) {
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // キャッシュキー生成（メモ化）
  const cacheKey = useMemo(
    () => `${CACHE_KEY_PREFIX}${noteId}-${limit}`,
    [noteId, limit],
  );

  useEffect(() => {
    const fetchRelatedNotes = async () => {
      if (!noteId) {
        setRelatedNotes([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // キャッシュチェック
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedData: CachedData = JSON.parse(cached);
            const isExpired =
              Date.now() - cachedData.timestamp > CACHE_DURATION_MS;

            if (!isExpired) {
              // キャッシュが有効
              setRelatedNotes(cachedData.data);
              setLoading(false);
              return;
            } else {
              // キャッシュ期限切れ - 削除
              localStorage.removeItem(cacheKey);
            }
          } catch {
            // キャッシュパースエラー - 削除
            localStorage.removeItem(cacheKey);
          }
        }

        // APIリクエスト
        const response = await fetch(
          `/api/links/related/${noteId}?limit=${limit}`,
        );
        if (!response.ok) {
          throw new Error("関連ノートの取得に失敗しました");
        }

        const data = await response.json();
        const notes = data.relatedNotes || [];

        setRelatedNotes(notes);

        // キャッシュに保存
        try {
          const cacheData: CachedData = {
            data: notes,
            timestamp: Date.now(),
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (e) {
          // localStorage容量エラーは無視
          console.warn("Failed to cache related notes:", e);
        }
      } catch (err) {
        console.error("Failed to fetch related notes:", err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedNotes();
  }, [noteId, limit, cacheKey]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 ${className}`}
      data-testid="related-notes-widget"
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            関連ノート
            {!loading && relatedNotes.length > 0 && (
              <span className="ml-2 text-gray-500 font-normal">
                ({relatedNotes.length})
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
        <div className="px-4 pb-4">
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

          {/* 関連ノート一覧 */}
          {!loading && !error && relatedNotes.length > 0 && (
            <div className="space-y-2" data-testid="related-notes-list">
              {relatedNotes.map((note) => (
                <div
                  key={note.noteId}
                  data-testid={`related-note-item-${note.noteId}`}
                >
                  <NoteLinkCard
                    noteId={note.noteId}
                    noteTitle={note.noteTitle}
                    score={note.score}
                    reason={note.reason}
                    updatedAt={note.updatedAt}
                    onClick={onNoteClick}
                  />
                  {note.score !== undefined && (
                    <span
                      data-testid={`related-note-score-${note.noteId}`}
                      style={{ display: "none" }}
                    >
                      {note.score}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 関連ノートなし */}
          {!loading && !error && relatedNotes.length === 0 && (
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm">関連ノートが見つかりません</p>
              <p className="text-xs mt-1">
                タグやリンクを追加すると、関連ノートが提案されます
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default RelatedNotesWidget;
