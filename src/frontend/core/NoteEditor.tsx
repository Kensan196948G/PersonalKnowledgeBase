import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useCallback } from "react";

export interface NoteEditorProps {
  /** 初期コンテンツ（HTML形式） */
  content?: string;
  /** コンテンツ変更時のコールバック */
  onChange?: (html: string) => void;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** 編集可能かどうか */
  editable?: boolean;
}

/**
 * TipTapベースのリッチテキストエディタ
 */
export function NoteEditor({
  content = "",
  onChange,
  placeholder = "ここにメモを入力...",
  editable = true,
}: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 hover:underline cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // ツールバーボタンのアクティブ状態を取得
  const isActive = useCallback(
    (name: string, attributes?: Record<string, unknown>) => {
      return editor?.isActive(name, attributes) ?? false;
    },
    [editor],
  );

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* ツールバー */}
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
          {/* テキストフォーマット */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={isActive("bold")}
            title="太字"
          >
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={isActive("italic")}
            title="斜体"
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
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={isActive("heading", { level: 1 })}
            title="見出し1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={isActive("heading", { level: 2 })}
            title="見出し2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
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

          {/* 元に戻す/やり直す */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="元に戻す"
          >
            ↶
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="やり直す"
          >
            ↷
          </ToolbarButton>
        </div>
      )}

      {/* エディタ本体 */}
      <EditorContent
        editor={editor}
        className="p-4 prose prose-sm max-w-none focus:outline-none"
      />
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

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 mx-1 self-center" />;
}

export default NoteEditor;
