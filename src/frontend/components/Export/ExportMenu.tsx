import { useState, useRef, useEffect } from 'react';

export interface ExportMenuProps {
  noteId: string;
  noteTitle: string;
}

type ExportFormat = 'markdown' | 'html' | 'pdf' | 'json';

interface FormatOption {
  format: ExportFormat;
  label: string;
  icon: string;
  extension: string;
}

const EXPORT_FORMATS: FormatOption[] = [
  { format: 'markdown', label: 'Markdown', icon: '📄', extension: 'md' },
  { format: 'html', label: 'HTML', icon: '🌐', extension: 'html' },
  { format: 'pdf', label: 'PDF', icon: '📕', extension: 'pdf' },
  { format: 'json', label: 'JSON (バックアップ)', icon: '📦', extension: 'json' },
];

/**
 * ノートエクスポートメニューコンポーネント
 *
 * 機能:
 * - ドロップダウンメニューでエクスポート形式を選択
 * - 各形式でノートをダウンロード
 * - ローディング表示とエラーハンドリング
 */
export function ExportMenu({ noteId, noteTitle }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * エクスポート処理
   */
  const handleExport = async (format: ExportFormat, extension: string) => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export/${format}/${noteId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'エクスポートに失敗しました' }));
        throw new Error(errorData.error || 'エクスポートに失敗しました');
      }

      // レスポンスからBlobを取得
      const blob = await response.blob();

      // ダウンロード用のリンクを作成
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${noteTitle}.${extension}`;
      document.body.appendChild(a);
      a.click();

      // クリーンアップ
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      alert(error instanceof Error ? error.message : 'エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* エクスポートボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="
          flex items-center gap-2 px-3 py-1.5
          text-sm font-medium text-gray-700
          bg-white border border-gray-300 rounded-md
          hover:bg-gray-50 hover:border-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
        aria-label="エクスポート"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isExporting ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
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
            <span>エクスポート中...</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>エクスポート</span>
            <svg
              className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div
          className="
            absolute right-0 top-full mt-2
            w-56
            bg-white border border-gray-200 rounded-lg shadow-lg
            overflow-hidden
            z-50
          "
          role="menu"
          aria-orientation="vertical"
        >
          {EXPORT_FORMATS.map((option) => (
            <button
              key={option.format}
              onClick={() => handleExport(option.format, option.extension)}
              disabled={isExporting}
              className="
                w-full flex items-center gap-3 px-4 py-3
                text-left text-sm text-gray-700
                hover:bg-gray-50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                border-b border-gray-100 last:border-b-0
              "
              role="menuitem"
            >
              <span className="text-xl">{option.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">
                  .{option.extension}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
