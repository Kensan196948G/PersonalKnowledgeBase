import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

const router = Router();
const prisma = new PrismaClient();

// 許可する画像形式
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

// ファイルサイズ上限 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// アップロードディレクトリ
const UPLOAD_DIR = path.join(process.cwd(), "data", "attachments");

// ディレクトリ作成（存在しない場合）
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Multer設定
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // UUID生成 + 元の拡張子
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uuid}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    // MIMEタイプチェック
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PNG, JPG, GIF, and WebP are allowed.",
        ),
      );
    }
  },
});

/**
 * POST /api/upload
 * 画像アップロード
 *
 * multipart/form-data:
 * - file: File (画像ファイル)
 * - noteId: string (オプショナル、関連するノートID)
 */
router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const { noteId } = req.body;

    // noteId指定時は存在チェック
    if (noteId) {
      const noteExists = await prisma.note.findUnique({
        where: { id: noteId },
      });

      if (!noteExists) {
        // アップロードされたファイルを削除
        await fs.unlink(req.file.path);
        return res.status(400).json({
          success: false,
          error: "Specified note does not exist",
        });
      }
    }

    // Attachmentレコード作成
    const attachment = await prisma.attachment.create({
      data: {
        fileName: req.file.originalname,
        filePath: `/attachments/${req.file.filename}`,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        noteId: noteId || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        id: attachment.id,
        fileName: attachment.fileName,
        filePath: attachment.filePath,
        url: `/api/attachments/${req.file.filename}`,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
      },
    });
  } catch (error) {
    // エラー時、アップロードされたファイルを削除
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Failed to delete uploaded file:", unlinkError);
      }
    }

    console.error("Error uploading file:", error);

    // Multerのエラーハンドリング
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: "File size exceeds the limit of 10MB",
        });
      }
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to upload file",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/upload/:id
 * アップロード済みファイル情報取得
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: "Attachment not found",
      });
    }

    res.json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    console.error("Error fetching attachment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch attachment",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/upload/:id
 * アップロード済みファイル削除
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: "Attachment not found",
      });
    }

    // ファイル削除
    const filePath = path.join(UPLOAD_DIR, path.basename(attachment.filePath));
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.error("Failed to delete file:", fileError);
      // ファイル削除失敗してもDBレコードは削除する
    }

    // DBレコード削除
    await prisma.attachment.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete attachment",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
