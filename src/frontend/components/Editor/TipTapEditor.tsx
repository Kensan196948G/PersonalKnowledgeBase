import { useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { useEditor } from "../../hooks/useEditor";
import { useImageUpload } from "../../hooks/useImageUpload";
import { Toolbar } from "./Toolbar";

export interface TipTapEditorProps {
  /** 初期コンテンツ（HTML形式） */
  content?: string;
  /** コンテンツ変更時のコールバック */
  onChange?: (html: string) => void;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** 編集可能かどうか */
  editable?: boolean;
  /** クラス名 */
  className?: string;
}

/**
 * TipTapベースのリッチテキストエディタコンポーネント
 *
 * 主な機能:
 * - 基本フォーマット: 太字、斜体、打ち消し線、インラインコード
 * - 見出し: H1, H2, H3
 * - リスト: 箇条書き、番号付きリスト、タスクリスト
 * - ブロック: 引用、コードブロック、水平線
 * - 挿入: リンク、画像
 * - 履歴: 元に戻す、やり直す
 */
export function TipTapEditor({
  content = "",
  onChange,
  placeholder = "ここにメモを入力...",
  editable = true,
  className = "",
}: TipTapEditorProps) {
  console.log("[TipTapEditor] Rendered with content length:", content.length);
  console.log("[TipTapEditor] Content preview:", content.substring(0, 100));

  const { editor, isActive } = useEditor({
    content,
    onChange,
    placeholder,
    editable,
  });

  const { uploadImage, isUploading } = useImageUpload();

  // Ctrl+V 画像貼り付け処理
  useEffect(() => {
    if (!editor || !editable) {
      return;
    }

    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      // クリップボード内の画像を検出
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          try {
            // 画像をアップロード
            const imageUrl = await uploadImage(file);

            if (imageUrl && editor) {
              // エディタに画像を挿入
              editor.chain().focus().setImage({ src: imageUrl }).run();
            }
          } catch (err) {
            // エラーは useImageUpload 内でトースト表示される
            console.error("Image upload failed:", err);
          }
        }
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("paste", handlePaste);

    return () => {
      editorElement.removeEventListener("paste", handlePaste);
    };
  }, [editor, editable, uploadImage]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={`border rounded-lg overflow-hidden bg-white ${className} ${
        isUploading ? "opacity-75 pointer-events-none" : ""
      }`}
    >
      {/* ツールバー */}
      {editable && (
        <Toolbar
          editor={editor}
          isActive={isActive}
          uploadImage={uploadImage}
          isUploading={isUploading}
        />
      )}

      {/* エディタ本体 */}
      <EditorContent
        editor={editor}
        className="p-4 prose prose-sm max-w-none focus:outline-none min-h-[200px]"
      />

      {/* アップロード中インジケーター */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="text-sm text-gray-600">画像をアップロード中...</div>
        </div>
      )}
    </div>
  );
}

export default TipTapEditor;
