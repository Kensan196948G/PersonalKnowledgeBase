/**
 * AI要約API
 * エンドポイント:
 * - POST /api/ai/summarize - 要約生成
 * - GET /api/ai/summaries/:noteId - 履歴取得
 * - DELETE /api/ai/summaries/:id - 履歴削除
 * - GET /api/ai/test-connection - Ollama接続テスト
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  generateSummary,
  getSummaryHistory,
  deleteSummary,
  testOllamaConnection,
  clearCache,
  getCacheSize,
} from "../../services/ai/summarizeService.js";

const router = Router();

// バリデーションスキーマ
const summarizeRequestSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  level: z.enum(["short", "medium", "long"]).default("medium"),
  useCache: z.boolean().optional().default(true),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/**
 * POST /api/ai/summarize
 * ノート内容を要約生成
 */
router.post("/summarize", async (req: Request, res: Response) => {
  try {
    // バリデーション
    const validatedData = summarizeRequestSchema.parse(req.body);

    // 要約生成
    const result = await generateSummary(
      validatedData.noteId,
      validatedData.level,
      {
        useCache: validatedData.useCache,
        model: validatedData.model,
        temperature: validatedData.temperature,
      },
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Summarize error:", error);

    // バリデーションエラー
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    // その他のエラー
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/ai/summaries/:noteId
 * ノートの要約履歴を取得
 */
router.get("/summaries/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;

    // UUID検証
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        noteId,
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid note ID format",
      });
    }

    const summaries = await getSummaryHistory(noteId);

    res.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error("Get summaries error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/ai/summaries/:id
 * 要約履歴を削除
 */
router.delete("/summaries/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // UUID検証
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid summary ID format",
      });
    }

    const deleted = await deleteSummary(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Summary not found",
      });
    }

    res.json({
      success: true,
      message: "Summary deleted successfully",
    });
  } catch (error) {
    console.error("Delete summary error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/ai/test-connection
 * Ollama接続テスト
 */
router.get("/test-connection", async (_req: Request, res: Response) => {
  try {
    const result = await testOllamaConnection();

    if (result.connected) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(503).json({
        success: false,
        error: "Ollama connection failed",
        details: result,
      });
    }
  } catch (error) {
    console.error("Test connection error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/ai/clear-cache
 * キャッシュクリア（開発・デバッグ用）
 */
router.post("/clear-cache", (_req: Request, res: Response) => {
  try {
    const sizeBeforeClear = getCacheSize();
    clearCache();

    res.json({
      success: true,
      message: "Cache cleared successfully",
      clearedEntries: sizeBeforeClear,
    });
  } catch (error) {
    console.error("Clear cache error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/ai/cache-status
 * キャッシュ状態取得
 */
router.get("/cache-status", (_req: Request, res: Response) => {
  try {
    const size = getCacheSize();

    res.json({
      success: true,
      data: {
        size,
        ttl: 3600, // 1時間（秒）
      },
    });
  } catch (error) {
    console.error("Cache status error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
