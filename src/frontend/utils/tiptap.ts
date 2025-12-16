/**
 * TipTap関連のユーティリティ関数
 */

import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import { NoteLink } from "../components/Editor/extensions/NoteLinkExtension";

/**
 * TipTap JSON文字列をHTMLに変換
 */
export function tiptapJsonToHtml(jsonString: string): string {
  console.log(
    "[tiptapJsonToHtml] Called with string length:",
    jsonString?.length,
  );
  console.log(
    "[tiptapJsonToHtml] Input preview:",
    jsonString?.substring(0, 100),
  );

  // 空文字列の場合は空のHTMLを返す
  if (!jsonString || jsonString.trim() === "") {
    console.log("[tiptapJsonToHtml] Empty string, returning empty");
    return "";
  }

  try {
    // JSON文字列をパース
    const json = JSON.parse(jsonString);
    console.log(
      "[tiptapJsonToHtml] Parsed JSON:",
      JSON.stringify(json).substring(0, 200),
    );

    // TipTap JSONをHTMLに変換
    // NoteLinkは最小限の設定で追加（suggestion機能は不要）
    const html = generateHTML(json, [
      StarterKit,
      Link,
      TaskList,
      TaskItem,
      Image,
      NoteLink.configure({
        suggestion: {
          items: async () => [],
          render: () => ({
            onStart: () => {},
            onUpdate: () => {},
            onExit: () => {},
            onKeyDown: () => false,
          }),
        },
      }),
    ]);

    console.log("[tiptapJsonToHtml] Generated HTML length:", html.length);
    console.log("[tiptapJsonToHtml] HTML preview:", html.substring(0, 200));
    return html;
  } catch (error) {
    console.error(
      "[tiptapJsonToHtml] Failed to convert TipTap JSON to HTML:",
      error,
    );
    console.error("[tiptapJsonToHtml] Input was:", jsonString);
    // エラーの場合は元の文字列を返す（HTMLとして解釈される可能性）
    return jsonString;
  }
}
