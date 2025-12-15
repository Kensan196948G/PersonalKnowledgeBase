import { useState, useRef, useEffect } from "react";
import { FolderSelector } from "../Folders/FolderSelector";
import { importApi } from "../../lib/api";

export interface ImportModalProps {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
  /** インポート完了時のコールバック */
  onImportComplete?: () => void;
  /** デフォルトのフォルダID */
  defaultFolderId?: string | null;
}

interface ImportResult {
  filename: string;
  success: boolean;
  noteId?: number;
  title?: string;
  error?: string;
}

/**
 * インポートモーダルコンポーネント
 * 複数ファイルの一括インポートをサポート
 */
export function ImportModal({
  isOpen,
  onClose,
  onImportComplete,
  defaultFolderId = null,
}: ImportModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const [addImportTag, setAddImportTag] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // defaultFolderIdが変更されたら更新
  useEffect(() => {
    setFolderId(defaultFolderId);
  }, [defaultFolderId]);

  // モーダルが閉じられたらリセット
  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setProgress(0);
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      setError("ファイルを選択してください");
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setError(null);
    setResults([]);

    try {
      // アップロード処理
      const data = await importApi.batch(selectedFiles, folderId, addImportTag);

      if (data.success) {
        setResults(data.data.results);
        setProgress(100);

        // 成功時、2秒後にモーダルを閉じる
        setTimeout(() => {
          onImportComplete?.();
          onClose();
        }, 2000);
      } else {
        setError(data.error || "インポートに失敗しました");
      }
    } catch (err) {
      console.error("Import error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "インポート中にエラーが発生しました",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            ファイルをインポート
          </h2>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
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
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* ファイル選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ファイル選択
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".html,.htm,.mht,.mhtml,.docx,.pdf,.onepkg"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                ファイルを選択
              </button>
              <span className="text-sm text-gray-500">
                対応形式: HTML, MHT, MHTML, DOCX, PDF, ONEPKG
              </span>
            </div>

            {/* 選択されたファイル一覧 */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-gray-700">
                  選択されたファイル ({selectedFiles.length}件)
                </p>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {file.name}
                      </span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        disabled={isImporting}
                        className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* フォルダ選択 */}
          <div>
            <FolderSelector
              selectedFolderId={folderId}
              onFolderSelect={setFolderId}
              disabled={isImporting}
            />
          </div>

          {/* オプション */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={addImportTag}
                onChange={(e) => setAddImportTag(e.target.checked)}
                disabled={isImporting}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                インポートタグを追加 (Batch Import)
              </span>
            </label>
          </div>

          {/* プログレスバー */}
          {isImporting && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  インポート中...
                </span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 結果表示 */}
          {results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  インポート結果
                </h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-600">成功: {successCount}</span>
                  {failureCount > 0 && (
                    <span className="text-red-600">失敗: {failureCount}</span>
                  )}
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`px-3 py-2 border-b border-gray-100 last:border-b-0 ${
                      result.success ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {result.filename}
                        </p>
                        {result.success && result.title && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            → {result.title}
                          </p>
                        )}
                        {!result.success && result.error && (
                          <p className="text-xs text-red-600 mt-0.5">
                            エラー: {result.error}
                          </p>
                        )}
                      </div>
                      <div className="ml-2">
                        {result.success ? (
                          <svg
                            className="w-5 h-5 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-red-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {results.length > 0 ? "閉じる" : "キャンセル"}
          </button>
          {results.length === 0 && (
            <button
              onClick={handleImport}
              disabled={isImporting || selectedFiles.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  インポート中...
                </>
              ) : (
                "インポート開始"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportModal;
