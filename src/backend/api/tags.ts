import { Router, Request, Response } from "express";
import { prisma } from "../db.js";

const router = Router();

/**
 * バリデーションヘルパー: UUID形式チェック
 */
const isValidUUID = (id: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * バリデーションヘルパー: HEXカラーコードチェック
 */
const isValidHexColor = (color: string): boolean => {
  const hexRegex = /^#[0-9A-F]{6}$/i;
  return hexRegex.test(color);
};

/**
 * バリデーションヘルパー: タグ名チェック
 */
const isValidTagName = (name: string): boolean => {
  // 1〜50文字、空白のみは不可
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 50;
};

/**
 * GET /api/tags
 * 全タグ一覧取得（ノート数含む）
 *
 * レスポンス例:
 * {
 *   "success": true,
 *   "count": 3,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "name": "プログラミング",
 *       "color": "#FF5733",
 *       "createdAt": "2024-01-01T00:00:00.000Z",
 *       "_count": { "notes": 5 }
 *     }
 *   ]
 * }
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });

    res.json({
      success: true,
      count: tags.length,
      data: tags,
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tags",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/tags/:id
 * 単一タグ取得（詳細情報）
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // UUIDバリデーション
    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid tag ID format",
      });
    }

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        error: "Tag not found",
      });
    }

    res.json({
      success: true,
      data: tag,
    });
  } catch (error) {
    console.error("Error fetching tag:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tag",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/tags
 * タグ作成
 *
 * リクエストボディ:
 * {
 *   "name": "プログラミング",
 *   "color": "#FF5733" // オプショナル
 * }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    // タグ名バリデーション
    if (!isValidTagName(name)) {
      return res.status(400).json({
        success: false,
        error: "Invalid tag name",
        message: "Tag name must be 1-50 characters and not empty",
      });
    }

    // カラーコードバリデーション（指定時のみ）
    if (color !== undefined && color !== null && !isValidHexColor(color)) {
      return res.status(400).json({
        success: false,
        error: "Invalid color format",
        message: "Color must be in HEX format (#RRGGBB)",
      });
    }

    // タグ名の重複チェック
    const existingTag = await prisma.tag.findUnique({
      where: { name: name.trim() },
    });

    if (existingTag) {
      return res.status(409).json({
        success: false,
        error: "Tag already exists",
        message: `Tag with name "${name.trim()}" already exists`,
      });
    }

    // タグ作成
    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || null,
      },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Tag created successfully",
      data: tag,
    });
  } catch (error) {
    console.error("Error creating tag:", error);

    // Prismaのユニーク制約エラー（念のため）
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return res.status(409).json({
        success: false,
        error: "Tag already exists",
        message: "A tag with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create tag",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/tags/:id
 * タグ更新
 *
 * リクエストボディ:
 * {
 *   "name": "新しいタグ名",
 *   "color": "#00FF00"
 * }
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    // UUIDバリデーション
    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid tag ID format",
      });
    }

    // タグ存在チェック
    const existingTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      return res.status(404).json({
        success: false,
        error: "Tag not found",
      });
    }

    // バリデーション
    if (name !== undefined && !isValidTagName(name)) {
      return res.status(400).json({
        success: false,
        error: "Invalid tag name",
        message: "Tag name must be 1-50 characters and not empty",
      });
    }

    if (color !== undefined && color !== null && !isValidHexColor(color)) {
      return res.status(400).json({
        success: false,
        error: "Invalid color format",
        message: "Color must be in HEX format (#RRGGBB)",
      });
    }

    // タグ名の重複チェック（名前変更時のみ）
    if (name !== undefined && name.trim() !== existingTag.name) {
      const duplicateTag = await prisma.tag.findUnique({
        where: { name: name.trim() },
      });

      if (duplicateTag) {
        return res.status(409).json({
          success: false,
          error: "Tag already exists",
          message: `Tag with name "${name.trim()}" already exists`,
        });
      }
    }

    // 更新データ構築
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;

    // タグ更新
    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Tag updated successfully",
      data: tag,
    });
  } catch (error) {
    console.error("Error updating tag:", error);

    // Prismaのユニーク制約エラー
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return res.status(409).json({
        success: false,
        error: "Tag already exists",
        message: "A tag with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update tag",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/tags/:id
 * タグ削除（関連するNoteTagは自動削除）
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // UUIDバリデーション
    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid tag ID format",
      });
    }

    // タグ存在チェック
    const existingTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      return res.status(404).json({
        success: false,
        error: "Tag not found",
      });
    }

    // カスケード削除により、関連するNoteTagも削除される
    await prisma.tag.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete tag",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/notes/:noteId/tags
 * 特定ノートのタグ一覧取得
 */
router.get("/notes/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;

    // UUIDバリデーション
    if (!isValidUUID(noteId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid note ID format",
      });
    }

    // ノート存在チェック
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    // タグのみを抽出
    const tags = note.tags.map((noteTag) => noteTag.tag);

    res.json({
      success: true,
      count: tags.length,
      data: tags,
    });
  } catch (error) {
    console.error("Error fetching note tags:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch note tags",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/notes/:noteId/tags/:tagId
 * ノートにタグを付与
 */
router.post(
  "/notes/:noteId/tags/:tagId",
  async (req: Request, res: Response) => {
    try {
      const { noteId, tagId } = req.params;

      // UUIDバリデーション
      if (!isValidUUID(noteId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid note ID format",
        });
      }

      if (!isValidUUID(tagId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid tag ID format",
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

      // タグ存在チェック
      const tag = await prisma.tag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        return res.status(404).json({
          success: false,
          error: "Tag not found",
        });
      }

      // 既に付与済みかチェック
      const existingNoteTag = await prisma.noteTag.findUnique({
        where: {
          noteId_tagId: {
            noteId,
            tagId,
          },
        },
      });

      if (existingNoteTag) {
        return res.status(409).json({
          success: false,
          error: "Tag already assigned to note",
          message: "This tag is already assigned to this note",
        });
      }

      // NoteTag作成
      const noteTag = await prisma.noteTag.create({
        data: {
          noteId,
          tagId,
        },
        include: {
          tag: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Tag assigned to note successfully",
        data: noteTag,
      });
    } catch (error) {
      console.error("Error assigning tag to note:", error);
      res.status(500).json({
        success: false,
        error: "Failed to assign tag to note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * DELETE /api/notes/:noteId/tags/:tagId
 * ノートからタグを削除
 */
router.delete(
  "/notes/:noteId/tags/:tagId",
  async (req: Request, res: Response) => {
    try {
      const { noteId, tagId } = req.params;

      // UUIDバリデーション
      if (!isValidUUID(noteId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid note ID format",
        });
      }

      if (!isValidUUID(tagId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid tag ID format",
        });
      }

      // NoteTag存在チェック
      const existingNoteTag = await prisma.noteTag.findUnique({
        where: {
          noteId_tagId: {
            noteId,
            tagId,
          },
        },
      });

      if (!existingNoteTag) {
        return res.status(404).json({
          success: false,
          error: "Tag assignment not found",
          message: "This tag is not assigned to this note",
        });
      }

      // NoteTag削除
      await prisma.noteTag.delete({
        where: {
          noteId_tagId: {
            noteId,
            tagId,
          },
        },
      });

      res.json({
        success: true,
        message: "Tag removed from note successfully",
      });
    } catch (error) {
      console.error("Error removing tag from note:", error);
      res.status(500).json({
        success: false,
        error: "Failed to remove tag from note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
