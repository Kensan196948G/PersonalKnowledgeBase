import { Router, Request, Response } from "express";
import { prisma } from "../db.js";
import { generateHTML } from "@tiptap/html";
import TurndownService from "turndown";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import puppeteer from "puppeteer";
import AdmZip from "adm-zip";

const router = Router();

/**
 * エクスポートデータの型定義
 */
interface ExportNote {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
  folder: {
    id: string;
    name: string;
  } | null;
  attachments: Array<{
    id: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
  }>;
}

interface ExportData {
  version: string;
  exportedAt: string;
  note?: ExportNote;
  notes?: ExportNote[];
  notesCount?: number;
}

/**
 * HTML生成ヘルパー関数
 */
function generateHTMLContent(content: string): string {
  try {
    const jsonContent = JSON.parse(content);
    return generateHTML(jsonContent, [
      StarterKit,
      Image,
      Link,
      TaskList,
      TaskItem,
    ]);
  } catch (error) {
    console.error("Error parsing TipTap content:", error);
    return "<p>コンテンツの解析に失敗しました</p>";
  }
}

/**
 * 完全なHTMLドキュメントを生成
 */
function generateFullHTML(
  title: string,
  contentHtml: string,
  createdAt: Date,
  updatedAt: Date,
  tags: Array<{ tag: { name: string } }>,
  folder?: { name: string } | null,
): string {
  const tagsHtml =
    tags.length > 0
      ? '<div class="tags"><strong>タグ:</strong> ' +
        tags
          .map((t) => '<span class="tag">' + t.tag.name + "</span>")
          .join(" ") +
        "</div>"
      : "";
  const folderHtml = folder
    ? '<div class="folder"><strong>フォルダ:</strong> ' + folder.name + "</div>"
    : "";

  return (
    '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' +
    title +
    '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif;line-height:1.6;color:#333;max-width:800px;margin:0 auto;padding:2rem;background:#fff}h1{font-size:2rem;margin-bottom:1rem;color:#1a1a1a;border-bottom:2px solid #e5e5e5;padding-bottom:.5rem}.metadata{font-size:.875rem;color:#666;margin-bottom:1.5rem;padding:.75rem;background:#f9f9f9;border-radius:4px}.metadata div{margin-bottom:.25rem}.tags{margin-top:.5rem}.tag{display:inline-block;background:#e3f2fd;color:#1976d2;padding:.25rem .5rem;border-radius:3px;font-size:.75rem;margin-right:.5rem}.content{margin-top:2rem}.content p{margin-bottom:1rem}.content h2{font-size:1.5rem;margin-top:1.5rem;margin-bottom:.75rem;color:#2c3e50}.content h3{font-size:1.25rem;margin-top:1.25rem;margin-bottom:.5rem;color:#34495e}.content ul,.content ol{margin-left:1.5rem;margin-bottom:1rem}.content li{margin-bottom:.5rem}.content blockquote{border-left:4px solid #ddd;padding-left:1rem;margin:1rem 0;color:#666;font-style:italic}.content pre{background:#f5f5f5;padding:1rem;border-radius:4px;overflow-x:auto;margin-bottom:1rem}.content code{background:#f5f5f5;padding:.2rem .4rem;border-radius:3px;font-family:"Courier New",monospace;font-size:.875rem}.content pre code{background:transparent;padding:0}.content img{max-width:100%;height:auto;margin:1rem 0;border-radius:4px}.content a{color:#1976d2;text-decoration:none}.content a:hover{text-decoration:underline}.content hr{border:none;border-top:1px solid #e5e5e5;margin:1.5rem 0}@media print{body{padding:1rem}}</style></head><body><h1>' +
    title +
    '</h1><div class="metadata"><div><strong>作成日時:</strong> ' +
    new Date(createdAt).toLocaleString("ja-JP") +
    "</div><div><strong>更新日時:</strong> " +
    new Date(updatedAt).toLocaleString("ja-JP") +
    "</div>" +
    folderHtml +
    tagsHtml +
    '</div><div class="content">' +
    contentHtml +
    "</div></body></html>"
  );
}

/**
 * GET /api/export/html/:noteId
 * ノートをHTML形式でエクスポート
 */
/**
 * GET /api/export/html/all
 * 全ノートをHTML形式でZIPエクスポート
 */
router.get("/html/all", async (_req: Request, res: Response) => {
  try {
    const notes = await prisma.note.findMany({
      include: { tags: { include: { tag: true } }, folder: true },
      orderBy: { updatedAt: "desc" },
    });

    const zip = new AdmZip();

    for (const note of notes) {
      // TipTap JSON → HTML変換
      const contentHtml = generateHTMLContent(note.content);
      const fullHtml = generateFullHTML(
        note.title,
        contentHtml,
        note.createdAt,
        note.updatedAt,
        note.tags,
        note.folder,
      );

      // ファイル名をサニタイズ
      const sanitizedTitle = note.title
        .replace(/[/\\?%*:|"<>]/g, "-")
        .substring(0, 100);
      zip.addFile(`${sanitizedTitle}.html`, Buffer.from(fullHtml, "utf-8"));
    }

    const zipBuffer = zip.toBuffer();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="all-notes-html-${timestamp}.zip"`,
    );
    res.send(zipBuffer);
  } catch (error) {
    console.error("HTML bulk export error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to export all notes as HTML" });
  }
});

router.get("/html/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid note ID format" });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { tags: { include: { tag: true } }, folder: true },
    });

    if (!note) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    const contentHtml = generateHTMLContent(note.content);
    const fullHtml = generateFullHTML(
      note.title,
      contentHtml,
      note.createdAt,
      note.updatedAt,
      note.tags,
      note.folder,
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="' + encodeURIComponent(note.title) + '.html"',
    );
    res.send(fullHtml);
  } catch (error) {
    console.error("HTML export error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to generate HTML",
        message: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

/**
 * GET /api/export/pdf/:noteId
 * ノートをPDF形式でエクスポート（Puppeteer使用）
 */
router.get("/pdf/:noteId", async (req: Request, res: Response) => {
  let browser;
  try {
    const { noteId } = req.params;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid note ID format" });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { tags: { include: { tag: true } }, folder: true },
    });

    if (!note) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    const contentHtml = generateHTMLContent(note.content);
    const fullHtml = generateFullHTML(
      note.title,
      contentHtml,
      note.createdAt,
      note.updatedAt,
      note.tags,
      note.folder,
    );

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      timeout: 30000,
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      printBackground: true,
      timeout: 30000,
    });

    await browser.close();
    browser = undefined;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="' + encodeURIComponent(note.title) + '.pdf"',
    );
    res.send(pdf);
  } catch (error) {
    console.error("PDF export error:", error);
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return res
          .status(504)
          .json({
            success: false,
            error: "PDF generation timeout",
            message: "PDF生成がタイムアウトしました",
          });
      }
      if (error.message.includes("Failed to launch")) {
        return res
          .status(500)
          .json({
            success: false,
            error: "Puppeteer launch failed",
            message: "PDFエンジンの起動に失敗しました",
          });
      }
    }

    res
      .status(500)
      .json({
        success: false,
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

/**
 * GET /api/export/markdown/:noteId
 * ノートをMarkdown形式でエクスポート
 */
/**
 * GET /api/export/markdown/all
 * 全ノートをMarkdown形式でZIPエクスポート
 */
router.get("/markdown/all", async (_req: Request, res: Response) => {
  try {
    const notes = await prisma.note.findMany({
      include: { tags: { include: { tag: true } }, folder: true },
      orderBy: { updatedAt: "desc" },
    });

    const zip = new AdmZip();

    for (const note of notes) {
      // TipTap JSON → HTML → Markdown変換
      let tiptapJson;
      try {
        tiptapJson =
          typeof note.content === "string"
            ? JSON.parse(note.content)
            : note.content;
      } catch (error) {
        console.error(`Failed to parse content for note ${note.id}:`, error);
        continue; // スキップして次のノートへ
      }

      const html = generateHTML(tiptapJson, [
        StarterKit,
        Image,
        Link,
        TaskList,
        TaskItem,
      ]);
      const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        bulletListMarker: "-",
      });
      const markdown = turndownService.turndown(html);

      // フロントマター追加
      const tagNames = note.tags.map((t) => t.tag.name).join(", ");
      const folderName = note.folder ? note.folder.name : "";
      const frontMatter = `---
title: ${note.title}
created: ${note.createdAt.toISOString()}
updated: ${note.updatedAt.toISOString()}${tagNames ? `\ntags: ${tagNames}` : ""}${folderName ? `\nfolder: ${folderName}` : ""}
isPinned: ${note.isPinned}
isFavorite: ${note.isFavorite}
isArchived: ${note.isArchived}
---

`;
      const content = frontMatter + markdown;

      // ファイル名をサニタイズ
      const sanitizedTitle = note.title
        .replace(/[/\\?%*:|"<>]/g, "-")
        .substring(0, 100);
      zip.addFile(`${sanitizedTitle}.md`, Buffer.from(content, "utf-8"));
    }

    const zipBuffer = zip.toBuffer();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="all-notes-markdown-${timestamp}.zip"`,
    );
    res.send(zipBuffer);
  } catch (error) {
    console.error("Markdown bulk export error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to export all notes as Markdown",
      });
  }
});

router.get("/markdown/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid note ID format" });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { tags: { include: { tag: true } }, folder: true },
    });

    if (!note) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    let tiptapJson;
    try {
      tiptapJson =
        typeof note.content === "string"
          ? JSON.parse(note.content)
          : note.content;
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, error: "Failed to parse note content" });
    }

    const html = generateHTML(tiptapJson, [
      StarterKit,
      Image,
      Link,
      TaskList,
      TaskItem,
    ]);
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    const markdown = turndownService.turndown(html);
    const tagNames = note.tags.map((t) => t.tag.name).join(", ");
    const folderName = note.folder ? note.folder.name : "";

    const frontMatter = `---
title: ${note.title}
created: ${note.createdAt.toISOString()}
updated: ${note.updatedAt.toISOString()}${tagNames ? `\ntags: ${tagNames}` : ""}${folderName ? `\nfolder: ${folderName}` : ""}
isPinned: ${note.isPinned}
isFavorite: ${note.isFavorite}
isArchived: ${note.isArchived}
---

`;

    const output = frontMatter + markdown;
    const sanitizedTitle = note.title
      .replace(/[/\\?%*:|"<>]/g, "-")
      .substring(0, 200);

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(sanitizedTitle)}.md"`,
    );
    res.send(output);
  } catch (error) {
    console.error("Markdown export error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to export Markdown" });
  }
});

/**
 * GET /api/export/json/all
 * 全ノートの一括JSON形式エクスポート
 * ⚠️ 注意: このルートは /json/:noteId より前に定義する必要がある
 */
router.get("/json/all", async (_req: Request, res: Response) => {
  try {
    const notes = await prisma.note.findMany({
      include: {
        tags: { include: { tag: true } },
        folder: true,
        attachments: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const exportData: ExportData = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      notesCount: notes.length,
      notes: notes.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        isPinned: note.isPinned,
        isFavorite: note.isFavorite,
        isArchived: note.isArchived,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        tags: note.tags.map((nt) => ({
          id: nt.tag.id,
          name: nt.tag.name,
          color: nt.tag.color,
        })),
        folder: note.folder
          ? { id: note.folder.id, name: note.folder.name }
          : null,
        attachments: note.attachments.map((att) => ({
          id: att.id,
          fileName: att.fileName,
          filePath: att.filePath,
          mimeType: att.mimeType,
          fileSize: att.fileSize,
        })),
      })),
    };

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `all-notes-backup-${timestamp}.json`;

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (error) {
    console.error("JSON bulk export error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to export all notes" });
  }
});

/**
 * GET /api/export/json/:noteId
 * 単一ノートのJSON形式エクスポート
 */
router.get("/json/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid note ID format" });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        tags: { include: { tag: true } },
        folder: true,
        attachments: true,
      },
    });

    if (!note) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    const exportData: ExportData = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      note: {
        id: note.id,
        title: note.title,
        content: note.content,
        isPinned: note.isPinned,
        isFavorite: note.isFavorite,
        isArchived: note.isArchived,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        tags: note.tags.map((nt) => ({
          id: nt.tag.id,
          name: nt.tag.name,
          color: nt.tag.color,
        })),
        folder: note.folder
          ? { id: note.folder.id, name: note.folder.name }
          : null,
        attachments: note.attachments.map((att) => ({
          id: att.id,
          fileName: att.fileName,
          filePath: att.filePath,
          mimeType: att.mimeType,
          fileSize: att.fileSize,
        })),
      },
    };

    const sanitizedTitle =
      note.title
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 100) || "note";
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedTitle}.json"`,
    );
    res.json(exportData);
  } catch (error) {
    console.error("JSON export error:", error);
    res.status(500).json({ success: false, error: "Failed to export JSON" });
  }
});

export default router;
