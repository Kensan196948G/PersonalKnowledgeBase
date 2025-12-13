import { Router, Request, Response } from "express";
import { prisma } from "../db.js";

const router = Router();

/**
 * UUID バリデーション用の正規表現
 */
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * フォルダ名のバリデーション
 */
function validateFolderName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Folder name is required" };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { valid: false, error: "Folder name cannot be empty or whitespace only" };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: "Folder name must be 100 characters or less" };
  }

  return { valid: true };
}

/**
 * 循環参照チェック（自分自身や子孫を親にできない）
 * @param folderId チェック対象のフォルダID
 * @param newParentId 新しい親フォルダID
 */
async function checkCircularReference(
  folderId: string,
  newParentId: string,
): Promise<boolean> {
  // 自分自身を親にしようとしている
  if (folderId === newParentId) {
    return true;
  }

  // 子孫を辿って、循環参照がないかチェック
  let currentId: string | null = newParentId;
  const visitedIds = new Set<string>();

  while (currentId) {
    // 既に訪問済み（循環参照）
    if (visitedIds.has(currentId)) {
      return true;
    }

    // チェック対象のフォルダに到達（子孫を親にしようとしている）
    if (currentId === folderId) {
      return true;
    }

    visitedIds.add(currentId);

    // 親フォルダを取得
    const folder: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    currentId = folder?.parentId || null;
  }

  return false;
}

/**
 * フォルダツリーを階層構造に変換
 */
interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  noteCount: number;
  createdAt: Date;
  updatedAt: Date;
  children: FolderTreeNode[];
}

function buildFolderTree(folders: any[]): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>();
  const rootFolders: FolderTreeNode[] = [];

  // 全フォルダをマップに登録
  folders.forEach((folder) => {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      noteCount: folder._count?.notes || 0,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      children: [],
    });
  });

  // 親子関係を構築
  folders.forEach((folder) => {
    const node = folderMap.get(folder.id)!;

    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // 親が見つからない場合はルートとして扱う
        rootFolders.push(node);
      }
    } else {
      rootFolders.push(node);
    }
  });

  return rootFolders;
}

/**
 * GET /api/folders
 * フォルダツリー全体を取得
 *
 * クエリパラメータ:
 * - flat: 'true' の場合、階層構造ではなくフラットなリストで返す
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { flat } = req.query;

    const folders = await prisma.folder.findMany({
      include: {
        _count: {
          select: { notes: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    if (flat === "true") {
      // フラットなリストで返す
      res.json({
        success: true,
        count: folders.length,
        data: folders.map((folder) => ({
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          noteCount: folder._count.notes,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
        })),
      });
    } else {
      // 階層構造で返す
      const tree = buildFolderTree(folders);
      res.json({
        success: true,
        count: folders.length,
        data: tree,
      });
    }
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch folders",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/folders/:id
 * 単一フォルダ取得
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // UUIDバリデーション
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid folder ID format",
      });
    }

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            notes: true,
            children: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { notes: true },
            },
          },
          orderBy: {
            name: "asc",
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Folder not found",
      });
    }

    res.json({
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        parent: folder.parent,
        noteCount: folder._count.notes,
        childrenCount: folder._count.children,
        children: folder.children.map((child) => ({
          id: child.id,
          name: child.name,
          parentId: child.parentId,
          noteCount: child._count.notes,
          createdAt: child.createdAt,
          updatedAt: child.updatedAt,
        })),
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching folder:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch folder",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/folders
 * フォルダ作成
 *
 * リクエストボディ:
 * - name: string (必須、1-100文字)
 * - parentId: string (オプショナル、存在するフォルダIDまたはnull)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, parentId } = req.body;

    // フォルダ名バリデーション
    const nameValidation = validateFolderName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({
        success: false,
        error: nameValidation.error,
      });
    }

    // 親フォルダ存在チェック
    if (parentId) {
      if (!uuidRegex.test(parentId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid parent folder ID format",
        });
      }

      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId },
      });

      if (!parentFolder) {
        return res.status(400).json({
          success: false,
          error: "Parent folder does not exist",
        });
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
      },
      include: {
        _count: {
          select: { notes: true },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      data: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        parent: folder.parent,
        noteCount: folder._count.notes,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create folder",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/folders/:id
 * フォルダ更新（name, parentId変更）
 *
 * リクエストボディ:
 * - name: string (オプショナル、1-100文字)
 * - parentId: string | null (オプショナル)
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parentId } = req.body;

    // UUIDバリデーション
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid folder ID format",
      });
    }

    // フォルダ存在チェック
    const existingFolder = await prisma.folder.findUnique({
      where: { id },
    });

    if (!existingFolder) {
      return res.status(404).json({
        success: false,
        error: "Folder not found",
      });
    }

    // 更新データ構築
    const updateData: any = {};

    // フォルダ名更新
    if (name !== undefined) {
      const nameValidation = validateFolderName(name);
      if (!nameValidation.valid) {
        return res.status(400).json({
          success: false,
          error: nameValidation.error,
        });
      }
      updateData.name = name.trim();
    }

    // 親フォルダ更新
    if (parentId !== undefined) {
      if (parentId === null) {
        // ルートフォルダに移動
        updateData.parentId = null;
      } else {
        // UUIDバリデーション
        if (!uuidRegex.test(parentId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid parent folder ID format",
          });
        }

        // 親フォルダ存在チェック
        const parentFolder = await prisma.folder.findUnique({
          where: { id: parentId },
        });

        if (!parentFolder) {
          return res.status(400).json({
            success: false,
            error: "Parent folder does not exist",
          });
        }

        // 循環参照チェック
        const hasCircularRef = await checkCircularReference(id, parentId);
        if (hasCircularRef) {
          return res.status(400).json({
            success: false,
            error: "Circular reference detected: cannot set a folder or its descendants as parent",
          });
        }

        updateData.parentId = parentId;
      }
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { notes: true },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Folder updated successfully",
      data: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        parent: folder.parent,
        noteCount: folder._count.notes,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update folder",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/folders/:id
 * フォルダ削除
 *
 * クエリパラメータ:
 * - force: 'true' の場合、子フォルダがあっても削除（未実装、将来対応）
 *
 * 動作:
 * - 子フォルダがある場合はエラー（409 Conflict）
 * - フォルダ内のノートは親なし（folderId = null）に変更
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // UUIDバリデーション
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid folder ID format",
      });
    }

    // フォルダ存在チェック
    const existingFolder = await prisma.folder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            notes: true,
          },
        },
      },
    });

    if (!existingFolder) {
      return res.status(404).json({
        success: false,
        error: "Folder not found",
      });
    }

    // 子フォルダ存在チェック
    if (existingFolder._count.children > 0) {
      return res.status(409).json({
        success: false,
        error: "Cannot delete folder with subfolders",
        message: `This folder contains ${existingFolder._count.children} subfolder(s). Please delete or move them first.`,
      });
    }

    // フォルダ内のノートを親なしに変更してから削除
    // Prismaのスキーマ設定により、onDelete: SetNull が適用されるため
    // 削除時に自動的にノートのfolderId = null になる
    await prisma.folder.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Folder deleted successfully",
      notesAffected: existingFolder._count.notes,
    });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete folder",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/folders/:folderId/notes/:noteId
 * ノートをフォルダに移動
 *
 * パスパラメータ:
 * - folderId: 移動先フォルダID（'null' または 'root' でフォルダから除外）
 * - noteId: 移動するノートID
 */
router.post("/:folderId/notes/:noteId", async (req: Request, res: Response) => {
  try {
    const { folderId, noteId } = req.params;

    // ノートIDバリデーション
    if (!uuidRegex.test(noteId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid note ID format",
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

    // フォルダから除外する場合
    if (folderId === "null" || folderId === "root") {
      const updatedNote = await prisma.note.update({
        where: { id: noteId },
        data: { folderId: null },
        include: {
          folder: true,
          tags: {
            include: { tag: true },
          },
        },
      });

      return res.json({
        success: true,
        message: "Note moved to root (no folder)",
        data: updatedNote,
      });
    }

    // フォルダIDバリデーション
    if (!uuidRegex.test(folderId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid folder ID format",
      });
    }

    // フォルダ存在チェック
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Folder not found",
      });
    }

    // ノートをフォルダに移動
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: { folderId },
      include: {
        folder: true,
        tags: {
          include: { tag: true },
          },
      },
    });

    res.json({
      success: true,
      message: "Note moved to folder successfully",
      data: updatedNote,
    });
  } catch (error) {
    console.error("Error moving note to folder:", error);
    res.status(500).json({
      success: false,
      error: "Failed to move note to folder",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
