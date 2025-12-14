import { JSDOM } from "jsdom";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

/**
 * OneNote HTMLクリーンアップ
 * OneNote特有のスタイルやメタデータを削除
 */
export function cleanOneNoteHtml(html: string): string {
  // mso-* スタイル削除（Microsoft Office固有）
  let cleaned = html.replace(/mso-[a-z-]+:[^;]+;?/gi, "");

  // 空のstyle属性削除
  cleaned = cleaned.replace(/\s*style=""\s*/gi, "");

  // ONENote固有のクラス削除
  cleaned = cleaned.replace(/class="[^"]*o:p[^"]*"/gi, "");

  // 空白の正規化
  cleaned = cleaned.replace(/&nbsp;/g, " ");

  // 不要な改行削除
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n");

  return cleaned;
}

/**
 * タイトル抽出
 * h1タグまたはtitleタグからタイトルを抽出
 */
export function extractTitle(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // h1タグを優先
  const h1 = document.querySelector("h1");
  if (h1 && h1.textContent) {
    return h1.textContent.trim();
  }

  // titleタグをフォールバック
  const titleTag = document.querySelector("title");
  if (titleTag && titleTag.textContent) {
    return titleTag.textContent.trim();
  }

  // デフォルト
  return "無題のノート（インポート）";
}

/**
 * メタデータ抽出
 * OneNote HTMLからメタデータを抽出（オプショナル）
 */
export function extractMetadata(html: string): {
  createdAt?: Date;
  tags?: string[];
} {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const metadata: { createdAt?: Date; tags?: string[] } = {};

  // メタタグから作成日時を抽出（あれば）
  const createdMeta = document.querySelector('meta[name="created"]');
  if (createdMeta) {
    const content = createdMeta.getAttribute("content");
    if (content) {
      const date = new Date(content);
      if (!isNaN(date.getTime())) {
        metadata.createdAt = date;
      }
    }
  }

  return metadata;
}

/**
 * OneNote HTML → TipTap JSON変換
 */
export function convertOneNoteToTipTap(html: string): object {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // body要素のHTMLを取得
  const bodyHtml = document.body.innerHTML;

  // クリーンアップ
  const cleanedHtml = cleanOneNoteHtml(bodyHtml);

  // TipTap JSON変換
  try {
    const json = generateJSON(cleanedHtml, [
      StarterKit,
      Link,
      TaskList,
      TaskItem,
      // Phase 1: Imageは除外
    ]);

    return json;
  } catch (error) {
    console.error("Failed to convert HTML to TipTap JSON:", error);
    // フォールバック: 空のドキュメント
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: cleanedHtml.substring(0, 1000) }],
        },
      ],
    };
  }
}

/**
 * フル変換処理
 */
export async function importOneNoteHtml(htmlContent: string): Promise<{
  title: string;
  content: object;
  metadata: { createdAt?: Date; tags?: string[] };
}> {
  const title = extractTitle(htmlContent);
  const metadata = extractMetadata(htmlContent);
  const content = convertOneNoteToTipTap(htmlContent);

  return {
    title,
    content,
    metadata,
  };
}
