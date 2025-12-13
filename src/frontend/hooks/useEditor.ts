import { useEditor as useTipTapEditor, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useCallback } from "react";

export interface UseEditorOptions {
  /** 初期コンテンツ（HTML形式） */
  content?: string;
  /** コンテンツ変更時のコールバック */
  onChange?: (html: string) => void;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** 編集可能かどうか */
  editable?: boolean;
}

export interface UseEditorReturn {
  /** TipTap エディタインスタンス */
  editor: Editor | null;
  /** 指定したフォーマットがアクティブかどうか */
  isActive: (name: string, attributes?: Record<string, unknown>) => boolean;
}

/**
 * TipTap エディタのカスタムフック
 * エディタインスタンスの作成と状態管理を行う
 */
export function useEditor({
  content = "",
  onChange,
  placeholder = "ここにメモを入力...",
  editable = true,
}: UseEditorOptions = {}): UseEditorReturn {
  const editor = useTipTapEditor({
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

  return {
    editor,
    isActive,
  };
}

export default useEditor;
