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
const { PDFParse: PdfParse } = require("pdf-parse");

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

// Multer設定（MHT/MHTML用）
const uploadMht = multer({
  dest: TEMP_UPLOAD_DIR,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".mht" || ext === ".mhtml") {
      cb(null, true);
    } else {
      cb(new Error("Only MHT/MHTML files are allowed"));
    }
  },
});

// Multer設定（バッチインポート用 - 複数ファイル、複数形式対応）
const uploadBatch = multer({
  dest: TEMP_UPLOAD_DIR,
  limits: {
    fileSize: 100 * 1024 * 1024, // 各ファイル最大100MB
    files: 50, // 最大50ファイル
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [
      ".html",
      ".htm",
      ".mht",
      ".mhtml",
      ".docx",
      ".pdf",
      ".onepkg",
    ];
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only HTML, MHT, MHTML, DOCX, PDF, ONEPKG files are allowed"),
      );
    }
  },
});

/**
 * POST /api/import/onenote
 * OneNote HTMLファイルをインポート
 *
 * multipart/form-data:
 * - htmlFile: File (OneNoteからエクスポートしたHTMLファイル)
 * - folderId: string (optional, フォルダID)
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

      // メタデータ抽出
      const metadata = extractMetadata(htmlContent);

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

      // オプション処理
      const options = req.body.options ? JSON.parse(req.body.options) : {};

      // フォルダ指定の検証
      let folderId: string | undefined = undefined;
      if (req.body.folderId) {
        folderId = req.body.folderId;

        // フォルダ存在チェック
        const folder = await prisma.folder.findUnique({
          where: { id: folderId },
        });
        if (!folder) {
          return res.status(404).json({
            success: false,
            error: `Folder with id ${folderId} not found`,
          });
        }
      }

      // ノート作成（メタデータを使用）
      const note = await prisma.note.create({
        data: {
          title: title.trim(),
          content: JSON.stringify(tiptapJson),
          folderId: folderId,
          // メタデータから作成日時・更新日時を設定（nullの場合は@default(now())が使用される）
          createdAt: metadata.createdAt || undefined,
          updatedAt: metadata.updatedAt || undefined,
        },
      });

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
                        text: "「ファイル」→「エクスポート」→「Webページ (.html)」を選択",
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
 * quoted-printableデコード（UTF-8マルチバイト対応）
 */
function decodeQuotedPrintable(buffer: Buffer): string {
  let text = buffer.toString("binary");

  // ソフト改行を削除（=\r\n または =\n）
  text = text.replace(/=\r?\n/g, "");

  // =XX形式をバイト値に変換
  const bytes: number[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "=" && i + 2 < text.length) {
      const hex = text.substring(i + 1, i + 3);
      if (/^[0-9A-F]{2}$/i.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    bytes.push(text.charCodeAt(i) & 0xff);
    i++;
  }

  return Buffer.from(bytes).toString("utf-8");
}

/**
 * MHTファイルからHTMLコンテンツを抽出（文字コード対応強化版）
 */
function extractHtmlFromMht(buffer: Buffer): string {
  // MHTファイル全体をquoted-printableデコード
  const decoded = decodeQuotedPrintable(buffer);

  console.log("MHT decoded (first 500 chars):", decoded.substring(0, 500));

  // HTMLタグを抽出
  const htmlMatch = decoded.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) {
    return htmlMatch[0];
  }

  throw new Error("No HTML content found in MHT file");
}

/**
 * メタデータ構造
 */
interface DocumentMetadata {
  createdAt: Date | null;
  updatedAt: Date | null;
  author: string | null;
}

/**
 * HTMLからメタデータを抽出
 * OneNoteやその他のドキュメントから作成日時・更新日時・著者情報を取得
 */
function extractMetadata(html: string): DocumentMetadata {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  let createdAt: Date | null = null;
  let updatedAt: Date | null = null;
  let author: string | null = null;

  // <meta name="created" content="..."> を探す
  const createdMeta = document.querySelector(
    'meta[name="created"], meta[name="Created"], meta[name="dcterms.created"]',
  );
  if (createdMeta) {
    const content = createdMeta.getAttribute("content");
    if (content) {
      const parsed = new Date(content);
      if (!isNaN(parsed.getTime())) {
        createdAt = parsed;
      }
    }
  }

  // <meta name="modified" content="..."> を探す
  const modifiedMeta = document.querySelector(
    'meta[name="modified"], meta[name="Modified"], meta[name="dcterms.modified"], meta[name="last-modified"]',
  );
  if (modifiedMeta) {
    const content = modifiedMeta.getAttribute("content");
    if (content) {
      const parsed = new Date(content);
      if (!isNaN(parsed.getTime())) {
        updatedAt = parsed;
      }
    }
  }

  // <meta name="author" content="..."> を探す
  const authorMeta = document.querySelector(
    'meta[name="author"], meta[name="Author"], meta[name="dcterms.creator"]',
  );
  if (authorMeta) {
    const content = authorMeta.getAttribute("content");
    if (content) {
      author = content.trim();
    }
  }

  return {
    createdAt,
    updatedAt,
    author,
  };
}

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
 * - folderId: string (optional, フォルダID)
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
        extractTitle(html) || path.basename(req.file.originalname, ".docx");

      // HTML → TipTap JSON変換
      const bodyHtml = cleanOneNoteHtml(html);
      const tiptapJson = generateJSON(bodyHtml, [
        StarterKit,
        Link,
        TaskList,
        TaskItem,
      ]);

      // オプション処理
      const options = req.body.options ? JSON.parse(req.body.options) : {};

      // フォルダ指定の検証
      let folderId: string | undefined = undefined;
      if (req.body.folderId) {
        folderId = req.body.folderId;

        // フォルダ存在チェック
        const folder = await prisma.folder.findUnique({
          where: { id: folderId },
        });
        if (!folder) {
          return res.status(404).json({
            success: false,
            error: `Folder with id ${folderId} not found`,
          });
        }
      }

      // ノート作成
      const note = await prisma.note.create({
        data: {
          title: title.trim(),
          content: JSON.stringify(tiptapJson),
          folderId: folderId,
        },
      });

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
 * - folderId: string (optional, フォルダID)
 * - options: JSON ({ addImportTag: boolean, splitByDate: boolean })
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

      // PDF → テキスト抽出（v2 API）
      const parser = new PdfParse({ data: buffer });
      const pdfData = await parser.getText();
      let text = pdfData.text;
      const numPages = pdfData.total || 0;

      // 文字コード検出と変換（Shift-JIS対応）
      // PDFからのテキストは通常UTF-8だが、念のため検出
      text = detectAndConvert(Buffer.from(text));

      // オプション処理
      const options = req.body.options ? JSON.parse(req.body.options) : {};

      // フォルダ指定の検証
      let folderId: string | undefined = undefined;
      if (req.body.folderId) {
        folderId = req.body.folderId;

        // フォルダ存在チェック
        const folder = await prisma.folder.findUnique({
          where: { id: folderId },
        });
        if (!folder) {
          return res.status(404).json({
            success: false,
            error: `Folder with id ${folderId} not found`,
          });
        }
      }

      // 日付ベース分割が有効な場合
      if (options.splitByDate) {
        // テキストを日付ごとに分割
        const sections = detectDateSections(text);

        console.log(`Detected ${sections.length} date sections`);

        // 各セクションをノートとして作成
        const createdNotes: Array<{
          noteId: string;
          title: string;
          date: string;
        }> = [];

        for (const section of sections) {
          // セクション内容をTipTap JSON形式に変換
          const paragraphs = section.content
            .split("\n\n")
            .filter((p: string) => p.trim());
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
              title: section.title.trim().substring(0, 200),
              content: JSON.stringify(tiptapJson),
              folderId: folderId,
            },
          });

          createdNotes.push({
            noteId: note.id,
            title: note.title,
            date: section.title,
          });

          // タグ追加（オプション）
          if (options.addImportTag) {
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
        }

        // 一時ファイル削除
        await fs.unlink(req.file.path);

        return res.status(201).json({
          success: true,
          data: {
            notes: createdNotes,
            totalSections: sections.length,
            folderId: folderId,
          },
        });
      }

      // splitByDate が false の場合：既存の動作（1つのノートとして作成）

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
          folderId: folderId,
        },
      });

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

/**
 * POST /api/import/mht
 * MHT/MHTML形式ファイルをインポート
 *
 * multipart/form-data:
 * - mhtFile: File (OneNoteからエクスポートしたMHT/MHTMLファイル)
 * - folderId: string (optional, フォルダID)
 * - options: JSON ({ addImportTag: boolean })
 */
router.post(
  "/mht",
  uploadMht.single("mhtFile"),
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

      // MHTファイル読み込み（バイナリで）
      const buffer = await fs.readFile(req.file.path);

      // MHTファイルからHTMLを抽出（文字コード自動検出込み）
      const htmlContent = extractHtmlFromMht(buffer);

      // メタデータ抽出
      const metadata = extractMetadata(htmlContent);

      // デバッグ: HTMLの最初の2000文字をログ出力
      console.log(
        "MHT extracted HTML preview:",
        htmlContent.substring(0, 2000),
      );

      // JSDOM でパース
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // タイトル抽出（h1、title タグ、または最初のテキスト）
      const h1 = document.querySelector("h1");
      const titleTag = document.querySelector("title");

      // 最初の大きなテキスト（段落やdiv）を探す
      const firstParagraph = document.querySelector("p, div");
      const firstText = firstParagraph?.textContent
        ?.trim()
        .split("\n")[0]
        .trim()
        .substring(0, 100);

      console.log("Raw h1:", h1?.innerHTML);
      console.log("Raw title tag:", titleTag?.innerHTML);
      console.log("First text:", firstText);

      const title =
        h1?.textContent?.trim() ||
        titleTag?.textContent?.trim() ||
        firstText ||
        "インポートされたノート";

      console.log("MHT extracted title:", title);

      // OneNote特有のスタイルをクリーンアップ
      const bodyHtml = cleanOneNoteHtml(document.body.innerHTML);

      console.log("MHT cleaned body HTML length:", bodyHtml.length);
      console.log("MHT cleaned body preview:", bodyHtml.substring(0, 500));

      // HTML → TipTap JSON変換
      console.log("Converting HTML to TipTap JSON...");
      const tiptapJson = generateJSON(bodyHtml, [
        StarterKit,
        Link,
        TaskList,
        TaskItem,
      ]);

      const jsonString = JSON.stringify(tiptapJson);
      console.log("TipTap JSON size:", jsonString.length, "bytes");
      console.log("TipTap JSON preview:", jsonString.substring(0, 500));

      // オプション処理
      const options = req.body.options ? JSON.parse(req.body.options) : {};

      // フォルダ指定の検証
      let folderId: string | undefined = undefined;
      if (req.body.folderId) {
        folderId = req.body.folderId;

        // フォルダ存在チェック
        const folder = await prisma.folder.findUnique({
          where: { id: folderId },
        });
        if (!folder) {
          return res.status(404).json({
            success: false,
            error: `Folder with id ${folderId} not found`,
          });
        }
      }

      // ノート作成（メタデータを使用）
      console.log("Creating note in database...");
      const note = await prisma.note.create({
        data: {
          title: title.trim(),
          content: jsonString,
          folderId: folderId,
          // メタデータから作成日時・更新日時を設定（nullの場合は@default(now())が使用される）
          createdAt: metadata.createdAt || undefined,
          updatedAt: metadata.updatedAt || undefined,
        },
      });
      console.log("Note created successfully, ID:", note.id);

      if (options.addImportTag) {
        // "MHT Import"タグを作成/取得
        let tag = await prisma.tag.findUnique({
          where: { name: "MHT Import" },
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: "MHT Import", color: "#4A90E2" },
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
          info: {
            format: "MHT/MHTML",
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

      console.error("MHT import error:", error);

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
        error: "Failed to import MHT file",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * 単一ファイルのインポート処理（バッチインポート用ヘルパー）
 * 各ファイル形式に応じて適切な処理を実行
 */
async function processSingleFile(
  filePath: string,
  originalName: string,
  folderId?: string,
  options?: { splitByDate?: boolean },
): Promise<{ noteIds: string[]; titles: string[] }> {
  const ext = path.extname(originalName).toLowerCase();

  let title = "";
  let tiptapJson: any;
  const noteIds: string[] = [];
  const titles: string[] = [];

  switch (ext) {
    case ".html":
    case ".htm": {
      // HTML処理
      const htmlContent = await fs.readFile(filePath, "utf-8");
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      const h1 = document.querySelector("h1");
      const titleTag = document.querySelector("title");
      title =
        h1?.textContent ||
        titleTag?.textContent ||
        path.basename(originalName, ext);
      const bodyHtml = cleanOneNoteHtml(document.body.innerHTML);
      tiptapJson = generateJSON(bodyHtml, [
        StarterKit,
        Link,
        TaskList,
        TaskItem,
      ]);

      // ノート作成（単一）
      const note = await prisma.note.create({
        data: {
          title: title.trim().substring(0, 200),
          content: JSON.stringify(tiptapJson),
          folderId: folderId || null,
        },
      });
      noteIds.push(note.id);
      titles.push(note.title);
      break;
    }

    case ".mht":
    case ".mhtml": {
      // MHT処理
      const buffer = await fs.readFile(filePath);
      const htmlContent = extractHtmlFromMht(buffer);
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      const h1 = document.querySelector("h1");
      const titleTag = document.querySelector("title");
      const firstParagraph = document.querySelector("p, div");
      const firstText = firstParagraph?.textContent
        ?.trim()
        .split("\n")[0]
        .trim()
        .substring(0, 100);
      title =
        h1?.textContent?.trim() ||
        titleTag?.textContent?.trim() ||
        firstText ||
        path.basename(originalName, ext);
      const bodyHtml = cleanOneNoteHtml(document.body.innerHTML);
      tiptapJson = generateJSON(bodyHtml, [
        StarterKit,
        Link,
        TaskList,
        TaskItem,
      ]);

      // ノート作成（単一）
      const note = await prisma.note.create({
        data: {
          title: title.trim().substring(0, 200),
          content: JSON.stringify(tiptapJson),
          folderId: folderId || null,
        },
      });
      noteIds.push(note.id);
      titles.push(note.title);
      break;
    }

    case ".docx": {
      // DOCX処理
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value;
      title = extractTitle(html) || path.basename(originalName, ".docx");
      const bodyHtml = cleanOneNoteHtml(html);
      tiptapJson = generateJSON(bodyHtml, [
        StarterKit,
        Link,
        TaskList,
        TaskItem,
      ]);

      // ノート作成（単一）
      const note = await prisma.note.create({
        data: {
          title: title.trim().substring(0, 200),
          content: JSON.stringify(tiptapJson),
          folderId: folderId || null,
        },
      });
      noteIds.push(note.id);
      titles.push(note.title);
      break;
    }

    case ".pdf": {
      // PDF処理
      const buffer = await fs.readFile(filePath);
      const parser = new PdfParse({ data: buffer });
      const pdfData = await parser.getText();
      let text = pdfData.text;
      text = detectAndConvert(Buffer.from(text));
      const lines = text.split("\n").filter((l: string) => l.trim());
      const baseTitle = lines[0]?.trim() || path.basename(originalName, ".pdf");

      // 日付分割オプションが有効な場合
      if (options?.splitByDate) {
        const sections = detectDateSections(text);

        // 分割されたセクションごとにノート作成
        for (const section of sections) {
          const paragraphs = section.content
            .split("\n\n")
            .filter((p: string) => p.trim());

          const sectionTiptapJson = {
            type: "doc",
            content: paragraphs.map((p: string) => ({
              type: "paragraph",
              content: [{ type: "text", text: p.trim() }],
            })),
          };

          // 日付からタイトルを生成
          const sectionTitle =
            section.title !== "インポートされたノート"
              ? `${baseTitle} - ${section.title}`
              : baseTitle;

          const note = await prisma.note.create({
            data: {
              title: sectionTitle.trim().substring(0, 200),
              content: JSON.stringify(sectionTiptapJson),
              folderId: folderId || null,
            },
          });

          noteIds.push(note.id);
          titles.push(note.title);
        }
      } else {
        // 日付分割なし（従来の処理）
        const paragraphs = text.split("\n\n").filter((p: string) => p.trim());
        tiptapJson = {
          type: "doc",
          content: paragraphs.map((p: string) => ({
            type: "paragraph",
            content: [{ type: "text", text: p.trim() }],
          })),
        };

        const note = await prisma.note.create({
          data: {
            title: baseTitle.trim().substring(0, 200),
            content: JSON.stringify(tiptapJson),
            folderId: folderId || null,
          },
        });

        noteIds.push(note.id);
        titles.push(note.title);
      }
      break;
    }

    case ".onepkg": {
      // ONEPKG処理（インポートガイドノート作成）
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      const sections: string[] = [];
      zipEntries.forEach((entry) => {
        if (entry.entryName.endsWith(".one")) {
          sections.push(entry.entryName);
        }
      });
      title = `${path.basename(originalName, ".onepkg")} - インポートガイド`;
      tiptapJson = {
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
                        text: "「ファイル」→「エクスポート」→「Webページ (.html)」を選択",
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

      // ノート作成（単一）
      const note = await prisma.note.create({
        data: {
          title: title.trim().substring(0, 200),
          content: JSON.stringify(tiptapJson),
          folderId: folderId || null,
        },
      });

      noteIds.push(note.id);
      titles.push(note.title);
      break;
    }

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }

  return { noteIds, titles };
}

/**
 * 日付セクション情報
 */
interface DateSection {
  title: string; // 日付文字列
  content: string; // セクション内容
  startIndex: number; // テキスト内の開始位置
  endIndex: number; // テキスト内の終了位置
}

/**
 * テキストから日付パターンを検出し、セクションに分割
 *
 * 対応する日付パターン:
 * - YYYY年M月D日 (例: 2025年1月1日)
 * - M月D日 (例: 1月1日)
 * - YYYY/M/D (例: 2025/1/1)
 * - YYYY-M-D (例: 2025-1-1)
 *
 * ページ区切りパターン:
 * - -- N of M -- (例: -- 1 of 10 --)
 */
function detectDateSections(text: string): DateSection[] {
  const sections: DateSection[] = [];

  // 日付パターンの正規表現
  const datePatterns = [
    // YYYY年M月D日 (例: 2025年1月1日、2025年01月01日)
    /(\d{4})年(\d{1,2})月(\d{1,2})日/g,
    // M月D日 (例: 1月1日、01月01日)
    /(?<!\d)(\d{1,2})月(\d{1,2})日/g,
    // YYYY/M/D (例: 2025/1/1、2025/01/01)
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
    // YYYY-M-D (例: 2025-1-1、2025-01-01)
    /(\d{4})-(\d{1,2})-(\d{1,2})/g,
  ];

  // ページ区切りパターン (例: -- 1 of 10 --)
  const pageBreakPattern = /--\s*\d+\s+of\s+\d+\s*--/gi;

  // すべての日付とその位置を収集
  const dateMatches: Array<{ index: number; text: string }> = [];

  for (const pattern of datePatterns) {
    pattern.lastIndex = 0; // 正規表現の状態をリセット
    let match;
    while ((match = pattern.exec(text)) !== null) {
      dateMatches.push({
        index: match.index,
        text: match[0],
      });
    }
  }

  // ページ区切り位置も収集
  const pageBreaks: number[] = [];
  pageBreakPattern.lastIndex = 0;
  let pageMatch;
  while ((pageMatch = pageBreakPattern.exec(text)) !== null) {
    pageBreaks.push(pageMatch.index);
  }

  // 日付を位置順にソート
  dateMatches.sort((a, b) => a.index - b.index);

  // 重複する日付マッチを削除（同じ位置または重なっている位置）
  // 例: "2025年1月1日" は "YYYY年M月D日" と "M月D日" の両方にマッチするため
  const uniqueMatches: Array<{ index: number; text: string }> = [];
  for (let i = 0; i < dateMatches.length; i++) {
    const current = dateMatches[i];
    const currentEnd = current.index + current.text.length;

    // 既存のマッチと重複していないかチェック
    const overlaps = uniqueMatches.some((existing) => {
      const existingEnd = existing.index + existing.text.length;
      // 重複判定：範囲が重なっている、または5文字以内に近接している
      return (
        (current.index >= existing.index && current.index < existingEnd) ||
        (currentEnd > existing.index && currentEnd <= existingEnd) ||
        (existing.index >= current.index && existing.index < currentEnd) ||
        Math.abs(current.index - existing.index) < 5
      );
    });

    if (!overlaps) {
      uniqueMatches.push(current);
    } else {
      // 重複している場合、より長い（具体的な）パターンを優先
      const overlappingIndex = uniqueMatches.findIndex((existing) => {
        const existingEnd = existing.index + existing.text.length;
        return (
          (current.index >= existing.index && current.index < existingEnd) ||
          (currentEnd > existing.index && currentEnd <= existingEnd) ||
          (existing.index >= current.index && existing.index < currentEnd) ||
          Math.abs(current.index - existing.index) < 5
        );
      });

      if (overlappingIndex !== -1) {
        const existing = uniqueMatches[overlappingIndex];
        // より長いテキストを持つ方を採用
        if (current.text.length > existing.text.length) {
          uniqueMatches[overlappingIndex] = current;
        }
      }
    }
  }

  // 日付が見つからない場合は、テキスト全体を1つのセクションとして返す
  if (uniqueMatches.length === 0) {
    return [
      {
        title: "インポートされたノート",
        content: text,
        startIndex: 0,
        endIndex: text.length,
      },
    ];
  }

  // 日付ごとにセクション分割
  for (let i = 0; i < uniqueMatches.length; i++) {
    const currentDate = uniqueMatches[i];
    const nextDate = uniqueMatches[i + 1];

    // セクションの開始位置（日付の直後の改行以降）
    let startIndex = currentDate.index;
    const lineStart = text.lastIndexOf("\n", startIndex);
    if (lineStart !== -1) {
      startIndex = lineStart + 1;
    }

    // セクションの終了位置を決定
    let endIndex: number;

    if (nextDate) {
      // 次の日付の直前まで
      endIndex = nextDate.index;

      // 次の日付の行の開始まで戻る
      const nextLineStart = text.lastIndexOf("\n", endIndex);
      if (nextLineStart !== -1) {
        endIndex = nextLineStart;
      }
    } else {
      // 最後のセクション：テキストの末尾まで
      endIndex = text.length;
    }

    // セクション内にページ区切りがある場合、そこで終了
    const breakInSection = pageBreaks.find(
      (breakPos) => breakPos > startIndex && breakPos < endIndex,
    );
    if (breakInSection) {
      endIndex = breakInSection;
    }

    // セクション内容を抽出
    const content = text.substring(startIndex, endIndex).trim();

    // 空のセクションはスキップ
    if (content.length === 0) {
      continue;
    }

    sections.push({
      title: currentDate.text,
      content: content,
      startIndex: startIndex,
      endIndex: endIndex,
    });
  }

  return sections;
}

/**
 * POST /api/import/batch
 * 複数ファイルの一括インポート
 *
 * multipart/form-data:
 * - files: File[] (最大50ファイル、各種形式対応)
 * - folderId: string (optional, 全ファイル共通のフォルダID)
 * - options: JSON ({ addImportTag: boolean, splitByDate: boolean })
 *   - addImportTag: タグ"Batch Import"を自動付与
 *   - splitByDate: PDFファイルを日付ヘッダーで分割（日付パターン検出）
 */
router.post(
  "/batch",
  uploadBatch.array("files", 50),
  async (req: Request, res: Response) => {
    const uploadedFiles: Express.Multer.File[] = [];

    try {
      // ディレクトリ確保
      await ensureTempDir();

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files uploaded",
        });
      }

      uploadedFiles.push(...req.files);

      // オプション処理
      const options = req.body.options ? JSON.parse(req.body.options) : {};

      // フォルダ指定の検証
      let folderId: string | undefined = undefined;
      if (req.body.folderId) {
        folderId = req.body.folderId;

        // フォルダ存在チェック
        const folder = await prisma.folder.findUnique({
          where: { id: folderId },
        });
        if (!folder) {
          return res.status(404).json({
            success: false,
            error: `Folder with id ${folderId} not found`,
          });
        }
      }

      // 各ファイルを順次処理
      const results: Array<{
        noteIds: string[];
        titles: string[];
        status: "success" | "error";
        error?: string;
      }> = [];

      let successCount = 0;
      let errorCount = 0;
      let totalNotesCreated = 0;

      for (const file of uploadedFiles) {
        try {
          console.log(`Processing file: ${file.originalname}`);

          // 単一ファイル処理（splitByDateオプションを渡す）
          const result = await processSingleFile(
            file.path,
            file.originalname,
            folderId,
            { splitByDate: options.splitByDate },
          );

          // タグ追加（オプション）- すべてのノートに適用
          if (options.addImportTag && result.noteIds.length > 0) {
            let tag = await prisma.tag.findUnique({
              where: { name: "Batch Import" },
            });
            if (!tag) {
              tag = await prisma.tag.create({
                data: { name: "Batch Import", color: "#9C27B0" },
              });
            }
            // すべてのノートにタグを追加
            for (const noteId of result.noteIds) {
              await prisma.noteTag.create({
                data: { noteId: noteId, tagId: tag.id },
              });
            }
          }

          results.push({
            noteIds: result.noteIds,
            titles: result.titles,
            status: "success",
          });

          successCount++;
          totalNotesCreated += result.noteIds.length;

          // 一時ファイル削除
          await fs.unlink(file.path);
        } catch (fileError) {
          console.error(
            `Error processing file ${file.originalname}:`,
            fileError,
          );

          results.push({
            noteIds: [],
            titles: [file.originalname],
            status: "error",
            error:
              fileError instanceof Error ? fileError.message : "Unknown error",
          });

          errorCount++;

          // エラーが発生してもファイル削除を試みる
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error(
              `Failed to delete file ${file.originalname}:`,
              unlinkError,
            );
          }
        }
      }

      res.status(201).json({
        success: true,
        data: {
          totalFiles: uploadedFiles.length,
          successCount,
          errorCount,
          totalNotesCreated,
          notes: results,
          folderId: folderId,
        },
      });
    } catch (error) {
      // 全体エラー時、すべてのアップロードファイルを削除
      for (const file of uploadedFiles) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error("Failed to delete uploaded file:", unlinkError);
        }
      }

      console.error("Batch import error:", error);

      // Multerのエラーハンドリング
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "One or more files exceed the size limit of 100MB",
          });
        }
        if (error.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            success: false,
            error: "Too many files. Maximum 50 files allowed",
          });
        }
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to import files",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
