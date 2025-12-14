/**
 * Link Parser Utility
 *
 * ノート内容から[[ノート名]]形式のリンクを抽出・解析します
 */

import { prisma } from "../db.js";

/**
 * 解析されたリンク情報
 */
export interface ParsedLink {
  /** リンク全体のテキスト（例: "[[ノート名|表示テキスト]]"） */
  fullText: string;
  /** リンク先ノートのタイトル */
  targetTitle: string;
  /** カスタム表示テキスト（省略可） */
  displayText?: string;
  /** リンク周辺のコンテキスト */
  context: string;
  /** コンテンツ内での開始位置 */
  startIndex: number;
  /** コンテンツ内での終了位置 */
  endIndex: number;
}

/**
 * ノート内容から[[]]形式のリンクを抽出
 *
 * サポート形式:
 * - [[ノート名]]
 * - [[ノート名|表示テキスト]]
 *
 * @param content ノートのコンテンツ
 * @returns 解析されたリンクの配列
 */
export function extractLinks(content: string): ParsedLink[] {
  // 正規表現: [[ノート名]] または [[ノート名|表示テキスト]]
  const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const links: ParsedLink[] = [];

  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const fullText = match[0];
    const targetTitle = match[1].trim();
    const displayText = match[2]?.trim();
    const startIndex = match.index;
    const endIndex = startIndex + fullText.length;

    // リンク周辺のコンテキストを取得（前後50文字）
    const contextStart = Math.max(0, startIndex - 50);
    const contextEnd = Math.min(content.length, endIndex + 50);
    const context = content.substring(contextStart, contextEnd).trim();

    links.push({
      fullText,
      targetTitle,
      displayText,
      context,
      startIndex,
      endIndex,
    });
  }

  return links;
}

/**
 * HTMLコンテンツからプレーンテキストを抽出
 *
 * @param html HTMLコンテンツ
 * @returns プレーンテキスト
 */
export function stripHtml(html: string): string {
  // HTMLタグを除去
  const stripped = html.replace(/<[^>]*>/g, ' ');

  // 複数の空白を1つにまとめ
  const normalized = stripped.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * ノートのリンクを同期（保存時に自動実行）
 *
 * 処理フロー:
 * 1. コンテンツから現在のリンクを抽出
 * 2. DB内の既存リンクを削除
 * 3. 新しいリンクを作成（リンク先ノートが存在する場合）
 * 4. リンク先ノートが存在しない場合は空のノートを作成（赤リンク対応）
 *
 * @param noteId ノートID
 * @param content ノートのコンテンツ
 */
export async function syncNoteLinks(noteId: string, content: string): Promise<void> {
  try {
    // 1. コンテンツからリンクを抽出
    const parsedLinks = extractLinks(content);

    // 2. 既存のアウトゴーイングリンクを削除
    await prisma.noteLink.deleteMany({
      where: { sourceNoteId: noteId },
    });

    // 3. 新しいリンクを作成
    for (const link of parsedLinks) {
      // リンク先ノートを検索（タイトルで完全一致）
      let targetNote = await prisma.note.findFirst({
        where: {
          title: link.targetTitle,
        },
      });

      // リンク先ノートが存在しない場合、空のノートを作成（赤リンク対応）
      if (!targetNote) {
        targetNote = await prisma.note.create({
          data: {
            title: link.targetTitle,
            content: '',
            isPinned: false,
            isFavorite: false,
            isArchived: false,
          },
        });
      }

      // リンクを作成（重複チェック付き）
      try {
        await prisma.noteLink.create({
          data: {
            sourceNoteId: noteId,
            targetNoteId: targetNote.id,
            linkText: link.displayText || link.targetTitle,
            context: link.context,
          },
        });
      } catch (error) {
        // 重複エラーの場合はスキップ
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          console.log(`Duplicate link skipped: ${noteId} -> ${targetNote.id}`);
          continue;
        }
        throw error;
      }
    }

    console.log(`Synced ${parsedLinks.length} links for note ${noteId}`);
  } catch (error) {
    console.error('Error syncing note links:', error);
    throw error;
  }
}

/**
 * リンク切れチェック
 *
 * @param noteId ノートID
 * @returns リンク切れのリンク一覧
 */
export async function findBrokenLinks(noteId: string): Promise<{ linkId: string; targetTitle: string }[]> {
  const links = await prisma.noteLink.findMany({
    where: { sourceNoteId: noteId },
    include: {
      targetNote: {
        select: {
          id: true,
          title: true,
          content: true,
        },
      },
    },
  });

  // コンテンツが空の場合はリンク切れと判定
  const brokenLinks = links
    .filter(link => link.targetNote.content === '')
    .map(link => ({
      linkId: link.id,
      targetTitle: link.targetNote.title,
    }));

  return brokenLinks;
}

/**
 * キーワード抽出（簡易版）
 *
 * Phase 4では形態素解析・TF-IDFで高度化予定
 *
 * @param text テキスト
 * @returns キーワードの配列
 */
export function extractKeywords(text: string): string[] {
  // 1. HTMLタグ除去
  const stripped = stripHtml(text);

  // 2. 小文字化
  const normalized = stripped.toLowerCase();

  // 3. 単語分割（簡易：スペースと記号で分割）
  const words = normalized.split(/[\s、。，．！？!?,.:;]+/);
  // 4. ストップワード除去（英語のみ、日本語は将来対応）
  const stopwords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
    'this', 'that', 'these', 'those', 'it', 'its', 'be', 'been', 'have', 'has',
  ];

  // 5. フィルタリング（長さ2文字以上、ストップワード除外）
  const filtered = words.filter(
    w => w.length > 1 && !stopwords.includes(w)
  );

  // 6. 重複除去
  const unique = Array.from(new Set(filtered));

  return unique;
}
