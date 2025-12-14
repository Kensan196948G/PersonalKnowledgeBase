import { useState, useRef } from 'react';

export interface OneNoteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (noteId: string) => void;
}

export function OneNoteImportModal({ isOpen, onClose, onSuccess }: OneNoteImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [addImportTag, setAddImportTag] = useState(true);
  const [importType, setImportType] = useState<'html' | 'docx' | 'pdf' | 'onepkg' | 'mht'>('html');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleTypeChange = (newType: 'html' | 'docx' | 'pdf' | 'onepkg' | 'mht') => {
    setImportType(newType);
    setFile(null); // Clear file when changing type
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();

      // 形式に応じたフィールド名を使用
      const fieldName = importType === 'html' ? 'htmlFile' :
                       importType === 'docx' ? 'docxFile' :
                       importType === 'pdf' ? 'pdfFile' :
                       importType === 'mht' ? 'mhtFile' :
                       'onepkgFile';

      formData.append(fieldName, file);
      formData.append('options', JSON.stringify({ addImportTag }));

      const endpoint = `/api/import/${importType === 'html' ? 'onenote' : importType}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'インポートに失敗しました');
      }

      const result = await response.json();
      onSuccess?.(result.data.noteId);
      onClose();
      alert(`インポート成功: ${result.data.title}`);
    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'インポートに失敗しました');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">OneNoteファイルをインポート</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* インポート形式選択 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                インポート形式
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="html"
                    checked={importType === 'html'}
                    onChange={e => handleTypeChange(e.target.value as 'html' | 'docx' | 'pdf' | 'onepkg' | 'mht')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">HTML</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="docx"
                    checked={importType === 'docx'}
                    onChange={e => handleTypeChange(e.target.value as 'html' | 'docx' | 'pdf' | 'onepkg' | 'mht')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">DOCX</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="pdf"
                    checked={importType === 'pdf'}
                    onChange={e => handleTypeChange(e.target.value as 'html' | 'docx' | 'pdf' | 'onepkg' | 'mht')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">PDF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="onepkg"
                    checked={importType === 'onepkg'}
                    onChange={e => handleTypeChange(e.target.value as 'html' | 'docx' | 'pdf' | 'onepkg' | 'mht')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">ONEPKG</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="mht"
                    checked={importType === 'mht'}
                    onChange={e => handleTypeChange(e.target.value as 'html' | 'docx' | 'pdf' | 'onepkg' | 'mht')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">MHT</span>
                </label>
              </div>
            </div>

            {/* ファイル選択エリア */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  importType === 'html' ? '.html,.htm' :
                  importType === 'docx' ? '.docx' :
                  importType === 'pdf' ? '.pdf' :
                  importType === 'mht' ? '.mht,.mhtml' :
                  '.onepkg'
                }
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="space-y-2">
                  <svg className="w-12 h-12 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-medium">
                    {importType.toUpperCase()}ファイルをドロップ
                  </p>
                  <p className="text-sm text-gray-500">またはクリックして選択</p>
                </div>
              )}
            </div>

            {/* オプション */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addImportTag}
                  onChange={e => setAddImportTag(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">"OneNote Import"タグを追加</span>
              </label>
            </div>

            {/* 説明 */}
            <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
              <p className="font-medium mb-1">📝 ヒント</p>
              <p className="text-xs">
                {importType === 'html' && 'OneNoteで「ファイル」→「エクスポート」→「Webページ (.html)」を選択してエクスポートしたファイルをアップロードしてください。'}
                {importType === 'docx' && 'OneNoteで「ファイル」→「エクスポート」→「Word文書 (.docx)」を選択してエクスポートしたファイルをアップロードしてください。'}
                {importType === 'pdf' && 'OneNoteで「ファイル」→「エクスポート」→「PDF (.pdf)」を選択してエクスポートしたファイルをアップロードしてください。'}
                {importType === 'onepkg' && 'OneNoteで「ファイル」→「エクスポート」→「OneNoteパッケージ (.onepkg)」を選択してエクスポートしたファイルをアップロードしてください。'}
                {importType === 'mht' && 'OneNoteで「ファイル」→「エクスポート」→「単一ファイルWebページ (.mht/.mhtml)」を選択してエクスポートしたファイルをアップロードしてください。'}
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? 'インポート中...' : 'インポート実行'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
