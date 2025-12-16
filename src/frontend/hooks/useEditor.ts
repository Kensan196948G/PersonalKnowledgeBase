import { useEditor as useTipTapEditor, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useCallback, useEffect } from "react";
import {
  NoteLink,
  getSuggestionRenderer,
  NoteSuggestionItem,
} from "../components/Editor/extensions/NoteLinkExtension";
import { useNoteStore } from "../stores/noteStore";

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
  const notes = useNoteStore((state) => state.notes);

  // ノート一覧を取得してSuggestionに渡す
  const fetchNotesForSuggestion = useCallback(async (): Promise<
    NoteSuggestionItem[]
  > => {
    return notes.map((note) => ({
      id: note.id,
      title: note.title,
      exists: true,
    }));
  }, [notes]);

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
      NoteLink.configure({
        suggestion: {
          items: async () => {
            const allNotes = await fetchNotesForSuggestion();
            return allNotes;
          },
          render: () => getSuggestionRenderer(fetchNotesForSuggestion),
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // contentプロパティが変更されたときにエディタの内容を更新
  useEffect(() => {
    console.log(
      "[useEditor] ========== Content useEffect triggered ==========",
    );
    console.log("[useEditor] editor exists:", !!editor);
    console.log("[useEditor] content length:", content.length);
    console.log("[useEditor] content preview:", content.substring(0, 100));

    if (!editor) {
      console.log("[useEditor] No editor instance, skipping update");
      return;
    }

    // 現在のエディタのHTML内容を取得
    const currentContent = editor.getHTML();

    // 正規化：空のコンテンツを統一
    const normalizeContent = (html: string) => {
      if (!html || html === "<p></p>" || html.trim() === "") {
        return "";
      }
      return html;
    };

    const normalizedContent = normalizeContent(content);
    const normalizedCurrent = normalizeContent(currentContent);

    console.log(
      "[useEditor] normalizedContent length:",
      normalizedContent.length,
    );
    console.log(
      "[useEditor] normalizedCurrent length:",
      normalizedCurrent.length,
    );
    console.log(
      "[useEditor] Content different:",
      normalizedContent !== normalizedCurrent,
    );

    // contentが変更されていて、かつ現在のエディタ内容と異なる場合のみ更新
    // これにより、ユーザーが編集中に外部からの更新で上書きされるのを防ぐ
    if (normalizedContent !== normalizedCurrent) {
      console.log("[useEditor] Content changed, updating editor");
      console.log("[useEditor] New content length:", normalizedContent.length);
      console.log(
        "[useEditor] Current content length:",
        normalizedCurrent.length,
      );
      console.log(
        "[useEditor] New content preview:",
        normalizedContent.substring(0, 100),
      );

      // エディタの内容を更新（履歴を追加せず、選択位置も保持しない）
      editor.commands.setContent(content, false);
      console.log("[useEditor] Editor content updated successfully");
    } else {
      console.log("[useEditor] Content unchanged, skipping update");
    }
    console.log("[useEditor] ========================================");
  }, [editor, content]);

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
