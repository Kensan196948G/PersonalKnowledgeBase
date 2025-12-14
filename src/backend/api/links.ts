/**
 * Links API
 *
 * ノート間リンクの管理API
 */

import { Router, Request, Response } from "express";
import { prisma } from "../db.js";
import { getRelatedNotes } from "../services/relatedNotesService.js";

const router = Router();

/**
 * POST /api/links
 * リンク作成
 *
 * リクエストボディ:
 * - sourceId: string (リンク元ノートID)
 * - targetTitle: string (リンク先ノートタイトル)
 * - linkText: string (オプショナル、表示テキスト)
 * - context: string (オプショナル、リンク周辺のコンテキスト)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { sourceId, targetTitle, linkText, context } = req.body;

    // バリデーション
    if (!sourceId || !targetTitle) {
      return res.status(400).json({
        success: false,
        error: "sourceId and targetTitle are required",
      });
    }

    // UUIDバリデーション
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sourceId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid sourceId format",
      });
    }

    // ソースノート存在チェック
    const sourceNote = await prisma.note.findUnique({
      where: { id: sourceId },
    });

    if (!sourceNote) {
      return res.status(404).json({
        success: false,
        error: "Source note not found",
      });
    }

    // ターゲットノート検索
    let targetNote = await prisma.note.findFirst({
      where: { title: targetTitle.trim() },
    });

    // ターゲットノートが存在しない場合、空のノートを作成（赤リンク対応）
    if (!targetNote) {
      targetNote = await prisma.note.create({
        data: {
          title: targetTitle.trim(),
          content: "",
          isPinned: false,
          isFavorite: false,
          isArchived: false,
        },
      });
    }

    // 重複チェック
    const existingLink = await prisma.noteLink.findFirst({
      where: {
        sourceNoteId: sourceId,
        targetNoteId: targetNote.id,
        linkText: linkText || targetTitle.trim(),
      },
    });

    if (existingLink) {
      return res.status(409).json({
        success: false,
        error: "Link already exists",
      });
    }

    // リンク作成
    const link = await prisma.noteLink.create({
      data: {
        sourceNoteId: sourceId,
        targetNoteId: targetNote.id,
        linkText: linkText || targetTitle.trim(),
        context: context || null,
      },
      include: {
        sourceNote: {
          select: {
            id: true,
            title: true,
          },
        },
        targetNote: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Link created successfully",
      data: link,
    });
  } catch (error) {
    console.error("Error creating link:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create link",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/links/:noteId
 * アウトゴーイングリンク一覧取得
 *
 * クエリパラメータ:
 * - includeContext: boolean (コンテキストを含めるか、デフォルト: false)
 * - limit: number (取得件数上限、デフォルト: 100)
 */
router.get("/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const { includeContext = "false", limit = "100" } = req.query;

    // UUIDバリデーション
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid noteId format",
      });
    }

    // ノート存在チェック
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    const limitNum = Math.min(parseInt(limit as string) || 100, 1000);

    // アウトゴーイングリンク取得
    const links = await prisma.noteLink.findMany({
      where: { sourceNoteId: noteId },
      include: {
        targetNote: {
          select: {
            id: true,
            title: true,
            isPinned: true,
            isFavorite: true,
            isArchived: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limitNum,
    });

    // コンテキストを含めない場合は除外
    const data =
      includeContext === "true"
        ? links
        : links.map(({ context: _context, ...rest }) => rest);

    res.json({
      success: true,
      count: links.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching outgoing links:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch outgoing links",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/links/backlinks/:noteId
 * バックリンク取得
 *
 * クエリパラメータ:
 * - includeContext: boolean (コンテキストを含めるか、デフォルト: true)
 * - limit: number (取得件数上限、デフォルト: 50)
 * - excludeArchived: boolean (アーカイブ済みノートを除外、デフォルト: true)
 */
router.get("/backlinks/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const {
      includeContext = "true",
      limit = "50",
      excludeArchived = "true",
    } = req.query;

    // UUIDバリデーション
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid noteId format",
      });
    }

    // ノート存在チェック
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    const limitNum = Math.min(parseInt(limit as string) || 50, 500);
    const shouldExcludeArchived = excludeArchived === "true";

    // バックリンク取得
    const backlinks = await prisma.noteLink.findMany({
      where: {
        targetNoteId: noteId,
        ...(shouldExcludeArchived && {
          sourceNote: {
            isArchived: false,
          },
        }),
      },
      include: {
        sourceNote: {
          select: {
            id: true,
            title: true,
            isPinned: true,
            isFavorite: true,
            isArchived: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limitNum,
    });

    // コンテキストを含めない場合は除外
    const data =
      includeContext === "true"
        ? backlinks
        : backlinks.map(({ context: _context, ...rest }) => rest);

    res.json({
      success: true,
      count: backlinks.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching backlinks:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch backlinks",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/links/:id
 * リンク削除
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // UUIDバリデーション
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid link ID format",
      });
    }

    // リンク存在チェック
    const existingLink = await prisma.noteLink.findUnique({
      where: { id },
    });

    if (!existingLink) {
      return res.status(404).json({
        success: false,
        error: "Link not found",
      });
    }

    // リンク削除
    await prisma.noteLink.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Link deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting link:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete link",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/links/:id
 * リンク更新
 *
 * リクエストボディ:
 * - linkText: string (オプショナル)
 * - context: string (オプショナル)
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { linkText, context } = req.body;

    // UUIDバリデーション
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid link ID format",
      });
    }

    // リンク存在チェック
    const existingLink = await prisma.noteLink.findUnique({
      where: { id },
    });

    if (!existingLink) {
      return res.status(404).json({
        success: false,
        error: "Link not found",
      });
    }

    // 更新データ構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (linkText !== undefined) updateData.linkText = linkText;
    if (context !== undefined) updateData.context = context;

    // リンク更新
    const link = await prisma.noteLink.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: "Link updated successfully",
      data: link,
    });
  } catch (error) {
    console.error("Error updating link:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update link",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/links/related/:noteId
 * 関連ノート取得
 *
 * クエリパラメータ:
 * - limit: number (取得件数上限、デフォルト: 10)
 * - threshold: number (最小関連度スコア、デフォルト: 1.0)
 * - excludeLinked: boolean (既にリンク済みのノートを除外、デフォルト: false)
 */
router.get("/related/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const {
      limit = "10",
      threshold = "1.0",
      excludeLinked = "false",
    } = req.query;

    // UUIDバリデーション
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid noteId format",
      });
    }

    // ノート存在チェック
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    const limitNum = Math.min(parseInt(limit as string) || 10, 100);
    const thresholdNum = parseFloat(threshold as string) || 1.0;
    const shouldExcludeLinked = excludeLinked === "true";

    // 関連ノート取得
    const relatedNotes = await getRelatedNotes(noteId, {
      limit: limitNum,
      threshold: thresholdNum,
      excludeLinked: shouldExcludeLinked,
    });

    res.json({
      success: true,
      count: relatedNotes.length,
      data: relatedNotes,
    });
  } catch (error) {
    console.error("Error fetching related notes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch related notes",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
