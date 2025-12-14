import { useEffect } from "react";
import { useAiStore } from "../../stores/aiStore";
import type { SummaryLevel } from "../../types/ai";

export interface SummaryPanelProps {
  noteId: string;
  noteContent?: string;
  onClose?: () => void;
}

export function SummaryPanel({
  noteId,
  noteContent,
  onClose,
}: SummaryPanelProps) {
  const {
    currentSummary,
    summaryHistory,
    isSummarizing,
    summaryError,
    generateSummary,
    clearSummary,
    clearError,
  } = useAiStore();

  useEffect(() => {
    // クリーンアップ
    return () => {
      clearSummary();
    };
  }, [clearSummary]);

  const handleGenerateSummary = async (level: SummaryLevel) => {
    await generateSummary(noteId, level, noteContent);
  };

  const handleClearError = () => {
    clearError("summary");
  };

  const formatProcessingTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}秒`;
  };

  return (
    <div className="summary-panel bg-white rounded-lg shadow-sm border border-gray-200">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">AI要約</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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

      {/* 要約レベル選択 */}
      <div className="p-4 bg-gray-50">
        <p className="text-xs text-gray-600 mb-3">要約スタイルを選択:</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleGenerateSummary("short")}
            disabled={isSummarizing}
            className="
              px-3 py-2 rounded-lg text-sm font-medium transition-all
              bg-white border-2 border-gray-200
              hover:border-blue-500 hover:bg-blue-50
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            <div className="text-blue-600 font-semibold">短文</div>
            <div className="text-xs text-gray-500 mt-1">1-2文</div>
          </button>
          <button
            onClick={() => handleGenerateSummary("medium")}
            disabled={isSummarizing}
            className="
              px-3 py-2 rounded-lg text-sm font-medium transition-all
              bg-white border-2 border-gray-200
              hover:border-blue-500 hover:bg-blue-50
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            <div className="text-blue-600 font-semibold">中文</div>
            <div className="text-xs text-gray-500 mt-1">3-5文</div>
          </button>
          <button
            onClick={() => handleGenerateSummary("long")}
            disabled={isSummarizing}
            className="
              px-3 py-2 rounded-lg text-sm font-medium transition-all
              bg-white border-2 border-gray-200
              hover:border-blue-500 hover:bg-blue-50
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            <div className="text-blue-600 font-semibold">長文</div>
            <div className="text-xs text-gray-500 mt-1">詳細</div>
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {summaryError && (
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
              <p className="text-sm text-red-700">{summaryError}</p>
            </div>
            <button
              onClick={handleClearError}
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

      {/* ローディング状態 */}
      {isSummarizing && (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-3 text-sm text-gray-600">AI要約を生成中...</p>
          <p className="mt-1 text-xs text-gray-500">
            この処理には数秒かかる場合があります
          </p>
        </div>
      )}

      {/* 要約結果表示 */}
      {currentSummary && !isSummarizing && (
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {currentSummary.summary}
                </p>
                <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formatProcessingTime(currentSummary.processingTime)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      {currentSummary.tokenCount} tokens
                    </span>
                  </div>
                  <span className="text-gray-500">{currentSummary.model}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 要約履歴 */}
      {summaryHistory.length > 0 && !isSummarizing && (
        <div className="p-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 mb-3">
            過去の要約 ({summaryHistory.length}件)
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {summaryHistory.map((summary, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-3 text-xs border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {summary.level === "short"
                      ? "短文"
                      : summary.level === "medium"
                        ? "中文"
                        : "長文"}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(summary.createdAt).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-gray-700 line-clamp-2">{summary.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 初期状態 */}
      {!currentSummary && !isSummarizing && !summaryError && (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm">要約スタイルを選択して生成を開始</p>
          <p className="text-xs text-gray-400 mt-1">
            AIがノートの内容を自動で要約します
          </p>
        </div>
      )}
    </div>
  );
}

export default SummaryPanel;
