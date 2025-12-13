import { Router, Request, Response } from "express";
import { prisma } from "../db.js";

const router = Router();

/**
 * GET /api/notes
 * ノート一覧取得（ソート、フィルタ対応）
 *
 * クエリパラメータ:
 * - sortBy: 'createdAt' | 'updatedAt' | 'title' (デフォルト: 'updatedAt')
 * - order: 'asc' | 'desc' (デフォルト: 'desc')
 * - folderId: フォルダIDでフィルタ
 * - isPinned: ピン留めフィルタ ('true' | 'false')
 * - isFavorite: お気に入りフィルタ ('true' | 'false')
 * - isArchived: アーカイブフィルタ ('true' | 'false')
 * - search: タイトル・コンテンツの部分一致検索
 * - tags: タグIDのカンマ区切り（例: "tag1,tag2,tag3"）
 * - tagsMode: 'AND' | 'OR' (デフォルト: 'AND')
 * - fromDate: 作成日の開始日（YYYY-MM-DD）
 * - toDate: 作成日の終了日（YYYY-MM-DD）
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      sortBy = "updatedAt",
      order = "desc",
      folderId,
      isPinned,
      isFavorite,
      isArchived,
      search,
      tags,
      tagsMode = "AND",
      fromDate,
      toDate,
    } = req.query;

    // ソートバリデーション
    const validSortFields = ["createdAt", "updatedAt", "title"];
    const sortField = validSortFields.includes(sortBy as string)
      ? (sortBy as string)
      : "updatedAt";
    const sortOrder = order === "asc" ? "asc" : "desc";

    // フィルタ条件構築
    const where: any = {};

    if (folderId) {
      where.folderId = folderId as string;
    }

    if (isPinned !== undefined) {
      where.isPinned = isPinned === "true";
    }

    if (isFavorite !== undefined) {
      where.isFavorite = isFavorite === "true";
    }

    if (isArchived !== undefined) {
      where.isArchived = isArchived === "true";
    }

    if (search) {
      // SQLiteでは大文字小文字を区別しない検索はLIKE演算子で実現
      // Prismaのcontainsはデフォルトで大文字小文字を区別しないため、modeオプションは不要
      where.OR = [
        { title: { contains: search as string } },
        { content: { contains: search as string } },
      ];
    }

    // タグフィルタ（AND/OR対応）
    if (tags) {
      const tagIds = (tags as string).split(",").filter((id) => id.trim());
      if (tagIds.length > 0) {
        if (tagsMode === "OR") {
          // OR検索: いずれかのタグを含む
          where.tags = {
            some: { tagId: { in: tagIds } },
          };
        } else {
          // AND検索: 全てのタグを含む
          where.AND = tagIds.map((tagId) => ({
            tags: { some: { tagId } },
          }));
        }
      }
    }

    // 日付範囲フィルタ
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const fromDateTime = new Date(fromDate as string);
        if (!isNaN(fromDateTime.getTime())) {
          where.createdAt.gte = fromDateTime;
        }
      }
      if (toDate) {
        const toDateTime = new Date(toDate as string);
        if (!isNaN(toDateTime.getTime())) {
          // 終了日は23:59:59まで含める
          toDateTime.setHours(23, 59, 59, 999);
          where.createdAt.lte = toDateTime;
        }
      }
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      include: {
        tags: {
          include: { tag: true },
        },
        folder: true,
      },
    });

    res.json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notes",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/notes/:id
 * 単一ノート取得
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // UUIDバリデーション（簡易）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid note ID format",
      });
    }

    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        tags: {
          include: { tag: true },
        },
        folder: true,
        attachments: true,
      },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    res.json({
      success: true,
      data: note,
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch note",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/notes
 * ノート作成
 *
 * リクエストボディ:
 * - title: string (オプショナル、デフォルト: '無題のノート')
 * - content: string (オプショナル、デフォルト: '')
 * - folderId: string (オプショナル)
 * - isPinned: boolean (オプショナル、デフォルト: false)
 * - isFavorite: boolean (オプショナル、デフォルト: false)
 * - isArchived: boolean (オプショナル、デフォルト: false)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      title = "無題のノート",
      content = "",
      folderId,
      isPinned = false,
      isFavorite = false,
      isArchived = false,
    } = req.body;

    // フォルダ存在チェック（folderId指定時）
    if (folderId) {
      const folderExists = await prisma.folder.findUnique({
        where: { id: folderId },
      });
      if (!folderExists) {
        return res.status(400).json({
          success: false,
          error: "Specified folder does not exist",
        });
      }
    }

    const note = await prisma.note.create({
      data: {
        title,
        content,
        folderId,
        isPinned,
        isFavorite,
        isArchived,
      },
      include: {
        tags: {
          include: { tag: true },
        },
        folder: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: note,
    });
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create note",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/notes/:id
 * ノート更新
 *
 * リクエストボディ:
 * - title: string (オプショナル)
 * - content: string (オプショナル)
 * - folderId: string | null (オプショナル)
 * - isPinned: boolean (オプショナル)
 * - isFavorite: boolean (オプショナル)
 * - isArchived: boolean (オプショナル)
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, isPinned, isFavorite, isArchived, folderId } =
      req.body;

    // UUIDバリデーション
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid note ID format",
      });
    }

    // ノート存在チェック
    const existingNote = await prisma.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    // フォルダ存在チェック（folderId指定時）
    if (folderId && folderId !== null) {
      const folderExists = await prisma.folder.findUnique({
        where: { id: folderId },
      });
      if (!folderExists) {
        return res.status(400).json({
          success: false,
          error: "Specified folder does not exist",
        });
      }
    }

    // 更新データ構築（undefined値は除外）
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (folderId !== undefined) updateData.folderId = folderId;

    const note = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        tags: {
          include: { tag: true },
        },
        folder: true,
      },
    });

    res.json({
      success: true,
      message: "Note updated successfully",
      data: note,
    });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update note",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/notes/:id
 * ノート削除
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
        error: "Invalid note ID format",
      });
    }

    // ノート存在チェック
    const existingNote = await prisma.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    // カスケード削除により、関連するNoteTag、Attachmentも削除される
    await prisma.note.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete note",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
