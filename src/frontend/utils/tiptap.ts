/**
 * TipTap関連のユーティリティ関数
 */

import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';

/**
 * TipTap JSON文字列をHTMLに変換
 */
export function tiptapJsonToHtml(jsonString: string): string {
  try {
    // JSON文字列をパース
    const json = JSON.parse(jsonString);

    // TipTap JSONをHTMLに変換
    const html = generateHTML(json, [
      StarterKit,
      Link,
      TaskList,
      TaskItem,
      Image,
    ]);

    return html;
  } catch (error) {
    console.error('Failed to convert TipTap JSON to HTML:', error);
    // エラーの場合は元の文字列を返す（HTMLとして解釈される可能性）
    return jsonString;
  }
}
