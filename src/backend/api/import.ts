import { Router, Request, Response } from "express";
import { prisma } from "../db.js";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { JSDOM } from "jsdom";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import AdmZip from "adm-zip";
import mammoth from "mammoth";
import { createRequire } from "module";
import { detectAndConvert } from "../utils/encoding.js";

const require = createRequire(import.meta.url);
const PdfParse = require("pdf-parse");

const router = Router();

// 一時アップロードディレクトリ
const TEMP_UPLOAD_DIR = path.join(process.cwd(), "temp", "imports");

// ディレクトリ作成（存在しない場合）
async function ensureTempDir() {
  try {
    await fs.access(TEMP_UPLOAD_DIR);
  } catch {
    await fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true });
  }
}

// Multer設定（HTMLファイルアップロード用）
const upload = multer({
  dest: TEMP_UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".html" || ext === ".htm") {
      cb(null, true);
    } else {
      cb(new Error("Only HTML files are allowed"));
    }
  },
});

// Multer設定（ONEPKG用）
const uploadOnepkg = multer({
  dest: TEMP_UPLOAD_DIR,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB（ノートブック全体）
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".onepkg") {
      cb(null, true);
    } else {
      cb(new Error("Only ONEPKG files are allowed"));
    }
  },
});

// Multer設定（DOCX用）
const uploadDocx = multer({
  dest: TEMP_UPLOAD_DIR,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".docx") {
      cb(null, true);
    } else {
      cb(new Error("Only DOCX files are allowed"));
    }
  },
});

// Multer設定（PDF用）
const uploadPdf = multer({
  dest: TEMP_UPLOAD_DIR,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

/**
 * POST /api/import/onenote
 * OneNote HTMLファイルをインポート
 *
 * multipart/form-data:
 * - htmlFile: File (OneNoteからエクスポートしたHTMLファイル)
 * - options: JSON ({ createFolder: boolean, addImportTag: boolean })
 */
router.post(
  "/onenote",
  upload.single("htmlFile"),
  async (req: Request, res: Response) => {
    try {
      // ディレクトリ確保
      await ensureTempDir();

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      // HTMLファイル読み込み
      const htmlContent = await fs.readFile(req.file.path, "utf-8");

      // JSDOM でパース
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // タイトル抽出（h1 または title タグ）
      const h1 = document.querySelector("h1");
      const titleTag = document.querySelector("title");
      const title =
        h1?.textContent ||
        titleTag?.textContent ||
        "無題のノート（インポート）";

      // OneNote特有のスタイルをクリーンアップ
      const bodyHtml = cleanOneNoteHtml(document.body.innerHTML);

      // HTML → TipTap JSON変換
      // Phase 1: 基本テキストのみ（画像は除外）
      const tiptapJson = generateJSON(bodyHtml, [
        StarterKit,
        Link,
        TaskList,
        TaskItem,
      ]);

      // ノート作成
      const note = await prisma.note.create({
        data: {
          title: title.trim(),
          content: JSON.stringify(tiptapJson),
        },
      });

      // オプション処理
      const options = req.body.options ? JSON.parse(req.body.options) : {};

      if (options.addImportTag) {
        // "OneNote Import"タグを作成/取得
        let tag = await prisma.tag.findUnique({
          where: { name: "OneNote Import" },
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: "OneNote Import", color: "#FF6B35" },
          });
        }
        await prisma.noteTag.create({
          data: { noteId: note.id, tagId: tag.id },
        });
      }

      // 一時ファイル削除
      await fs.unlink(req.file.path);

      res.status(201).json({
        success: true,
        data: {
          noteId: note.id,
          title: note.title,
          warnings: [],
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

      console.error("OneNote import error:", error);

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
        error: "Failed to import OneNote file",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * POST /api/import/onepkg
 * OneNote ONEPKGファイルをインポート（構造解析のみ）
 *
 * multipart/form-data:
 * - onepkgFile: File (.onepkgファイル)
 */
router.post(
  "/onepkg",
  uploadOnepkg.single("onepkgFile"),
  async (req: Request, res: Response) => {
    try {
      // ディレクトリ確保
      await ensureTempDir();

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      // ONEPKG（ZIP）を解凍
      const zip = new AdmZip(req.file.path);
      const zipEntries = zip.getEntries();

      // フォルダ構造抽出
      const sections: string[] = [];
      zipEntries.forEach((entry) => {
        if (entry.entryName.endsWith(".one")) {
          sections.push(entry.entryName);
        }
      });

      // 警告メッセージ作成
      const warnings = [
        `ONEPKGファイルに${sections.length}個のセクション (.one) が含まれています。`,
        ".oneファイルは直接インポートできません。",
        "各セクションを個別にHTML形式でエクスポートしてからインポートしてください。",
      ];

      // メタ情報ノート作成（インポートガイド）
      const title = `${path.basename(req.file.originalname, ".onepkg")} - インポートガイド`;
      const content = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: title }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "このノートブックには以下のセクションが含まれています：",
              },
            ],
          },
          {
            type: "bulletList",
            content: sections.map((s) => ({
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: s }],
                },
              ],
            })),
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "各セクションをインポートする方法：",
              },
            ],
          },
          {
            type: "orderedList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "OneNoteで対象のセクションを開く" },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: '「ファイル」→「エクスポート」→「Webページ (.html)」を選択',
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Personal Knowledge Baseでインポート",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const note = await prisma.note.create({
        data: {
          title,
          content: JSON.stringify(content),
          isPinned: true,
        },
      });

      // 一時ファイル削除
      await fs.unlink(req.file.path);

      res.status(201).json({
        success: true,
        data: {
          noteId: note.id,
          title: note.title,
          sectionsCount: sections.length,
          warnings,
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

      console.error("ONEPKG import error:", error);

      // Multerのエラーハンドリング
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File size exceeds the limit of 100MB",
          });
        }
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to import ONEPKG file",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * OneNote HTML クリーンアップ関数
 * OneNote特有のMicrosoft Officeスタイルを除去
 */
function cleanOneNoteHtml(html: string): string {
  // mso-* スタイルを削除
  html = html.replace(/mso-[a-z-]+:[^;]+;?/gi, "");

  // 空のstyle属性を削除
  html = html.replace(/\s*style=""\s*/gi, "");

  // o:p タグを削除（OneNote特有の段落タグ）
  html = html.replace(/<\/?o:p>/gi, "");

  // class属性の中にあるMso*クラスを削除
  html = html.replace(/class="[^"]*Mso[^"]*"/gi, 'class=""');

  // 空のclass属性を削除
  html = html.replace(/\s*class=""\s*/gi, "");

  return html;
}

/**
 * HTMLからタイトルを抽出
 */
function extractTitle(html: string): string | null {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const h1 = document.querySelector("h1");
  const titleTag = document.querySelector("title");
  return h1?.textContent || titleTag?.textContent || null;
}

/**
 * POST /api/import/docx
 * Word文書（.docx）をインポート
 *
 * multipart/form-data:
 * - docxFile: File (Word文書ファイル)
 * - options: JSON ({ addImportTag: boolean })
 */
router.post(
  "/docx",
  uploadDocx.single("docxFile"),
  async (req: Request, res: Response) => {
    try {
      // ディレクトリ確保
      await ensureTempDir();

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      // DOCXファイル読み込み
      const buffer = await fs.readFile(req.file.path);

      // DOCX → HTML変換
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value;
      const warnings = result.messages;

      // タイトル抽出（HTMLから、またはファイル名）
      const title =
        extractTitle(html) ||
        path.basename(req.file.originalname, ".docx");

      // HTML → TipTap JSON変換
      const bodyHtml = cleanOneNoteHtml(html);
      const tiptapJson = generateJSON(bodyHtml, [
        StarterKit,
        Link,
        TaskList,
        TaskItem,
      ]);

      // ノート作成
      const note = await prisma.note.create({
        data: {
          title: title.trim(),
          content: JSON.stringify(tiptapJson),
        },
      });

      // オプション処理
      const options = req.body.options ? JSON.parse(req.body.options) : {};

      if (options.addImportTag) {
        // "DOCX Import"タグを作成/取得
        let tag = await prisma.tag.findUnique({
          where: { name: "DOCX Import" },
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: "DOCX Import", color: "#2B5797" },
          });
        }
        await prisma.noteTag.create({
          data: { noteId: note.id, tagId: tag.id },
        });
      }

      // 一時ファイル削除
      await fs.unlink(req.file.path);

      res.status(201).json({
        success: true,
        data: {
          noteId: note.id,
          title: note.title,
          warnings: warnings.map((m) => m.message),
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

      console.error("DOCX import error:", error);

      // Multerのエラーハンドリング
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File size exceeds the limit of 20MB",
          });
        }
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to import DOCX file",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * POST /api/import/pdf
 * PDFファイルをインポート
 *
 * multipart/form-data:
 * - pdfFile: File (PDFファイル)
 * - options: JSON ({ addImportTag: boolean })
 */
router.post(
  "/pdf",
  uploadPdf.single("pdfFile"),
  async (req: Request, res: Response) => {
    try {
      // ディレクトリ確保
      await ensureTempDir();

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      // PDFファイル読み込み
      const buffer = await fs.readFile(req.file.path);

      // PDF → テキスト抽出（v1 API）
      const pdfData = await PdfParse(buffer);
      let text = pdfData.text;
      const numPages = pdfData.numpages;

      // 文字コード検出と変換（Shift-JIS対応）
      // PDFからのテキストは通常UTF-8だが、念のため検出
      text = detectAndConvert(Buffer.from(text));

      // タイトル抽出（最初の行または最初の見出し）
      const lines = text.split("\n").filter((l: string) => l.trim());
      const title =
        lines[0]?.trim() || path.basename(req.file.originalname, ".pdf");

      // プレーンテキスト → TipTap JSON変換
      // 段落ごとに分割してTipTap形式に
      const paragraphs = text.split("\n\n").filter((p: string) => p.trim());
      const tiptapJson = {
        type: "doc",
        content: paragraphs.map((p: string) => ({
          type: "paragraph",
          content: [{ type: "text", text: p.trim() }],
        })),
      };

      // ノート作成
      const note = await prisma.note.create({
        data: {
          title: title.trim().substring(0, 200),
          content: JSON.stringify(tiptapJson),
        },
      });

      // オプション処理
      const options = req.body.options ? JSON.parse(req.body.options) : {};

      if (options.addImportTag) {
        // "PDF Import"タグを作成/取得
        let tag = await prisma.tag.findUnique({
          where: { name: "PDF Import" },
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: "PDF Import", color: "#D32F2F" },
          });
        }
        await prisma.noteTag.create({
          data: { noteId: note.id, tagId: tag.id },
        });
      }

      // 一時ファイル削除
      await fs.unlink(req.file.path);

      res.status(201).json({
        success: true,
        data: {
          noteId: note.id,
          title: note.title,
          warnings: [
            "PDFからのインポートはテキストのみです。書式は保持されません。",
          ],
          info: {
            pages: numPages,
            textLength: text.length,
          },
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

      console.error("PDF import error:", error);

      // Multerのエラーハンドリング
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File size exceeds the limit of 30MB",
          });
        }
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to import PDF file",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
