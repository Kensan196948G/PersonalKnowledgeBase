import { useRef } from "react";
import { Editor } from "@tiptap/react";

interface ToolbarProps {
  /** TipTap エディタインスタンス */
  editor: Editor;
  /** 指定したフォーマットがアクティブかどうか */
  isActive: (name: string, attributes?: Record<string, unknown>) => boolean;
  /** 画像アップロード関数（オプション） */
  uploadImage?: (file: File) => Promise<string>;
  /** アップロード中かどうか */
  isUploading?: boolean;
}

/**
 * エディタのツールバーコンポーネント
 * フォーマットボタンを提供する
 */
export function Toolbar({
  editor,
  isActive,
  uploadImage,
  isUploading = false,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImageUrl = () => {
    const url = window.prompt("画像URLを入力してください:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !uploadImage) return;

    try {
      const imageUrl = await uploadImage(file);
      if (imageUrl) {
        editor.chain().focus().setImage({ src: imageUrl }).run();
      }
    } catch (err) {
      console.error("Image upload failed:", err);
    }

    // ファイル選択をリセット（同じファイルを再選択可能にする）
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddLink = () => {
    const url = window.prompt("リンクURLを入力してください:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
      {/* テキストフォーマット */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={isActive("bold")}
        title="太字 (Ctrl+B)"
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={isActive("italic")}
        title="斜体 (Ctrl+I)"
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={isActive("strike")}
        title="取り消し線"
      >
        <span className="line-through">S</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={isActive("code")}
        title="インラインコード"
      >
        <span className="font-mono">&lt;&gt;</span>
      </ToolbarButton>

      <ToolbarDivider />

      {/* 見出し */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={isActive("heading", { level: 1 })}
        title="見出し1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={isActive("heading", { level: 2 })}
        title="見出し2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={isActive("heading", { level: 3 })}
        title="見出し3"
      >
        H3
      </ToolbarButton>

      <ToolbarDivider />

      {/* リスト */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={isActive("bulletList")}
        title="箇条書き"
      >
        •
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={isActive("orderedList")}
        title="番号リスト"
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={isActive("taskList")}
        title="タスクリスト"
      >
        ☑
      </ToolbarButton>

      <ToolbarDivider />

      {/* ブロック */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={isActive("blockquote")}
        title="引用"
      >
        "
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={isActive("codeBlock")}
        title="コードブロック"
      >
        {"</>"}
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="水平線"
      >
        ―
      </ToolbarButton>

      <ToolbarDivider />

      {/* 挿入 */}
      <ToolbarButton
        onClick={handleAddLink}
        active={isActive("link")}
        title="リンク挿入"
      >
        🔗
      </ToolbarButton>

      {/* 画像挿入 - ファイルアップロード（uploadImage が提供されている場合） */}
      {uploadImage && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="画像ファイルをアップロード"
            disabled={isUploading}
          >
            📁
          </ToolbarButton>
        </>
      )}

      {/* 画像挿入 - URL入力 */}
      <ToolbarButton onClick={handleAddImageUrl} title="画像URL挿入">
        🖼
      </ToolbarButton>

      <ToolbarDivider />

      {/* 元に戻す/やり直す */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="元に戻す (Ctrl+Z)"
      >
        ↶
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="やり直す (Ctrl+Shift+Z)"
      >
        ↷
      </ToolbarButton>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}

/**
 * ツールバーボタンコンポーネント
 */
function ToolbarButton({
  onClick,
  children,
  active = false,
  disabled = false,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        px-2 py-1 text-sm rounded transition-colors min-w-[28px]
        ${
          active
            ? "bg-blue-100 text-blue-700"
            : "hover:bg-gray-200 text-gray-700"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}

/**
 * ツールバーの区切り線
 */
function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 mx-1 self-center" />;
}

export default Toolbar;
