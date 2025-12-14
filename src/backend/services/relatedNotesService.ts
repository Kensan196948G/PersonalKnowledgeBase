/**
 * Related Notes Service
 *
 * 関連ノートの提案機能
 * スコアリングアルゴリズムに基づいて関連性の高いノートを提案
 */

import { prisma } from "../db.js";
import { extractKeywords } from "../utils/linkParser.js";

/**
 * 関連理由の詳細
 */
export interface RelationReasons {
  /** 共通タグ数 */
  commonTags: number;
  /** リンク関係 ('bidirectional' | 'incoming' | 'outgoing' | null) */
  linkRelation: "bidirectional" | "incoming" | "outgoing" | null;
  /** 同一フォルダか */
  sameFolder: boolean;
  /** キーワード類似度（共通キーワード数） */
  keywordSimilarity: number;
}

/**
 * 関連ノート情報
 */
export interface RelatedNote {
  /** ノート情報 */
  note: {
    id: string;
    title: string;
    isPinned: boolean;
    isFavorite: boolean;
    updatedAt: Date;
  };
  /** 関連度スコア */
  score: number;
  /** 関連理由 */
  reasons: RelationReasons;
}

/**
 * 関連ノート取得オプション
 */
export interface RelatedNotesOptions {
  /** 取得件数上限（デフォルト: 10） */
  limit?: number;
  /** 最小関連度スコア（デフォルト: 1.0） */
  threshold?: number;
  /** 既にリンク済みのノートを除外（デフォルト: false） */
  excludeLinked?: boolean;
}

/**
 * スコアリング重み
 */
const SCORING_WEIGHTS = {
  /** 共通タグの重み */
  COMMON_TAGS: 3.0,
  /** 双方向リンクの重み */
  BIDIRECTIONAL_LINK: 5.0,
  /** 一方向リンクの重み */
  UNIDIRECTIONAL_LINK: 2.5,
  /** 同一フォルダの重み */
  SAME_FOLDER: 1.0,
  /** キーワード類似度の重み */
  KEYWORD_SIMILARITY: 0.5,
};

/**
 * 関連ノートを取得
 *
 * @param noteId ノートID
 * @param options オプション
 * @returns 関連ノートの配列（スコア降順）
 */
export async function getRelatedNotes(
  noteId: string,
  options: RelatedNotesOptions = {},
): Promise<RelatedNote[]> {
  const { limit = 10, threshold = 1.0, excludeLinked = false } = options;

  try {
    // 1. 対象ノートの情報取得
    const targetNote = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        folder: true,
        outgoingLinks: {
          select: {
            targetNoteId: true,
          },
        },
        incomingLinks: {
          select: {
            sourceNoteId: true,
          },
        },
      },
    });

    if (!targetNote) {
      throw new Error("Note not found");
    }

    // 2. 候補ノート取得（自分自身とアーカイブ済みを除外）
    const candidates = await prisma.note.findMany({
      where: {
        id: { not: noteId },
        isArchived: false,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        folder: true,
        outgoingLinks: {
          select: {
            targetNoteId: true,
          },
        },
        incomingLinks: {
          select: {
            sourceNoteId: true,
          },
        },
      },
    });

    // 3. ターゲットノートのキーワード抽出（事前計算）
    const targetKeywords = extractKeywords(
      targetNote.title + " " + targetNote.content,
    );

    // 4. 各候補の関連度スコア計算
    const scoredNotes: RelatedNote[] = [];

    for (const candidate of candidates) {
      let score = 0;
      const reasons: RelationReasons = {
        commonTags: 0,
        linkRelation: null,
        sameFolder: false,
        keywordSimilarity: 0,
      };

      // 4-1. 共通タグ
      const targetTagIds = targetNote.tags.map((nt) => nt.tagId);
      const candidateTagIds = candidate.tags.map((nt) => nt.tagId);
      const commonTagIds = targetTagIds.filter((tagId) =>
        candidateTagIds.includes(tagId),
      );
      reasons.commonTags = commonTagIds.length;
      score += commonTagIds.length * SCORING_WEIGHTS.COMMON_TAGS;

      // 4-2. リンク関係
      const hasOutgoingLink = targetNote.outgoingLinks.some(
        (link) => link.targetNoteId === candidate.id,
      );
      const hasIncomingLink = targetNote.incomingLinks.some(
        (link) => link.sourceNoteId === candidate.id,
      );

      if (hasOutgoingLink && hasIncomingLink) {
        reasons.linkRelation = "bidirectional";
        score += SCORING_WEIGHTS.BIDIRECTIONAL_LINK;
      } else if (hasOutgoingLink) {
        reasons.linkRelation = "outgoing";
        score += SCORING_WEIGHTS.UNIDIRECTIONAL_LINK;
      } else if (hasIncomingLink) {
        reasons.linkRelation = "incoming";
        score += SCORING_WEIGHTS.UNIDIRECTIONAL_LINK;
      }

      // 既にリンク済みのノートを除外
      if (excludeLinked && (hasOutgoingLink || hasIncomingLink)) {
        continue;
      }

      // 4-3. 同一フォルダ
      if (candidate.folderId && candidate.folderId === targetNote.folderId) {
        reasons.sameFolder = true;
        score += SCORING_WEIGHTS.SAME_FOLDER;
      }

      // 4-4. キーワード類似度
      const candidateKeywords = extractKeywords(
        candidate.title + " " + candidate.content,
      );
      const commonKeywords = targetKeywords.filter((keyword) =>
        candidateKeywords.includes(keyword),
      );
      reasons.keywordSimilarity = commonKeywords.length;
      score += commonKeywords.length * SCORING_WEIGHTS.KEYWORD_SIMILARITY;

      // 閾値フィルタ
      if (score >= threshold) {
        scoredNotes.push({
          note: {
            id: candidate.id,
            title: candidate.title,
            isPinned: candidate.isPinned,
            isFavorite: candidate.isFavorite,
            updatedAt: candidate.updatedAt,
          },
          score,
          reasons,
        });
      }
    }

    // 5. スコアでソート、上限適用
    const relatedNotes = scoredNotes
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return relatedNotes;
  } catch (error) {
    console.error("Error getting related notes:", error);
    throw error;
  }
}

/**
 * リンク切れノート検出
 *
 * コンテンツが空のノート（赤リンクで作成されたノート）を検出
 *
 * @returns リンク切れノートの配列
 */
export async function findRedLinkNotes(): Promise<
  Array<{
    id: string;
    title: string;
    incomingLinksCount: number;
  }>
> {
  const redLinkNotes = await prisma.note.findMany({
    where: {
      content: "",
    },
    include: {
      incomingLinks: {
        select: {
          id: true,
        },
      },
    },
  });

  return redLinkNotes.map((note) => ({
    id: note.id,
    title: note.title,
    incomingLinksCount: note.incomingLinks.length,
  }));
}
