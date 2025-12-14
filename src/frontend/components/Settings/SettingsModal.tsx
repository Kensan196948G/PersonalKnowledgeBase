import { useEffect, useState } from "react";
import { OneNoteImportModal } from "../Import";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 設定画面モーダル
 */
export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Escapeキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // エクスポートメニューの状態管理
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // インポートモーダルの状態管理
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  if (!isOpen) return null;

  /**
   * インポート成功ハンドラ
   */
  const handleImportSuccess = (noteId: string) => {
    console.log("Imported note ID:", noteId);
    alert("インポートが完了しました！");
  };

  /**
   * 全ノートエクスポート（形式指定）
   */
  const handleExportAll = async (format: "json" | "markdown" | "html") => {
    try {
      const response = await fetch(`/api/export/${format}/all`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const extension = format === "json" ? "json" : "zip";
      a.download = `all-notes-${format}-${timestamp}.${extension}`;

      a.click();
      window.URL.revokeObjectURL(url);
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error("Export all error:", error);
      alert("全ノートのエクスポートに失敗しました");
    }
  };

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">設定</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
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

          {/* コンテンツ */}
          <div className="px-6 py-4 space-y-6">
            {/* アプリ情報 */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                アプリケーション情報
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">名前:</span>
                  <span className="font-medium">Personal Knowledge Base</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">バージョン:</span>
                  <span className="font-medium">0.2.0 (Phase 2完了)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">開発者:</span>
                  <span className="font-medium">個人プロジェクト</span>
                </div>
              </div>
            </section>

            {/* データ管理 */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                データ管理
              </h3>
              <div className="space-y-3">
                <div className="relative">
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="
                      w-full flex items-center justify-between px-4 py-3
                      bg-blue-50 text-blue-700 rounded-lg
                      hover:bg-blue-100 transition-colors
                    "
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      <div className="text-left">
                        <div className="font-medium">
                          全ノートをエクスポート
                        </div>
                        <div className="text-xs text-blue-600">
                          形式を選択してバックアップ
                        </div>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 transition-transform ${isExportMenuOpen ? "rotate-180" : ""}`}
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

                  {isExportMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={() => handleExportAll("json")}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 flex items-center gap-3"
                      >
                        <span className="text-2xl">📦</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            JSON形式
                          </div>
                          <div className="text-xs text-gray-600">
                            全データを構造化形式で保存
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleExportAll("markdown")}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 flex items-center gap-3"
                      >
                        <span className="text-2xl">📄</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            Markdown (ZIP)
                          </div>
                          <div className="text-xs text-gray-600">
                            各ノートを.mdファイルとして保存
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleExportAll("html")}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                      >
                        <span className="text-2xl">🌐</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            HTML (ZIP)
                          </div>
                          <div className="text-xs text-gray-600">
                            各ノートをHTMLファイルとして保存
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">💡 ヒント:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>定期的にバックアップを作成することを推奨します</li>
                      <li>
                        個別ノートのエクスポートは各ノートの「エクスポート」ボタンから
                      </li>
                      <li>JSON形式は後で再インポート可能です（将来機能）</li>
                      <li>Markdown/HTMLは他のアプリケーションで閲覧可能です</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* OneNoteインポート */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                OneNoteインポート
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="
                    w-full flex items-center justify-between px-4 py-3
                    bg-purple-50 text-purple-700 rounded-lg
                    hover:bg-purple-100 transition-colors
                  "
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <div className="text-left">
                      <div className="font-medium">
                        OneNoteファイルをインポート
                      </div>
                      <div className="text-xs text-purple-600">
                        HTMLファイルからノートを作成
                      </div>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
                  <p className="font-medium mb-1">使用方法</p>
                  <ol className="text-xs space-y-1 list-decimal list-inside">
                    <li>
                      OneNoteで「ファイル」→「エクスポート」→「Webページ
                      (.html)」
                    </li>
                    <li>
                      エクスポートしたHTMLファイルを上のボタンからアップロード
                    </li>
                    <li>自動的にノートが作成されます</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* キーボードショートカット */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                キーボードショートカット
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">検索</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                    Ctrl/Cmd + K
                  </kbd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">サイドバー切り替え</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                    Ctrl/Cmd + \
                  </kbd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">太字</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                    Ctrl/Cmd + B
                  </kbd>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">斜体</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                    Ctrl/Cmd + I
                  </kbd>
                </div>
              </div>
            </section>
          </div>

          {/* フッター */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="
                px-4 py-2 bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 transition-colors
                font-medium
              "
            >
              閉じる
            </button>
          </div>
        </div>
      </div>

      {/* OneNoteインポートモーダル */}
      <OneNoteImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </>
  );
}

export default SettingsModal;
