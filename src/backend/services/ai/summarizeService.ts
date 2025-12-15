/**
 * AI要約サービス
 * Ollamaを使用してノート内容を要約する
 */

import { Ollama } from "ollama";
import { prisma } from "../../db.js";
import {
  generateSummarizePrompt,
  type SummarizeLevel,
} from "./prompts/summarize.js";

// Ollama接続設定
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

// リトライ設定
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// キャッシュ設定
interface CacheEntry {
  summary: string;
  tokenCount: number;
  timestamp: number;
}

const summaryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1時間

/**
 * Ollama クライアント初期化
 */
function createOllamaClient(): Ollama {
  return new Ollama({ host: OLLAMA_HOST });
}

/**
 * キャッシュキー生成
 */
function getCacheKey(noteId: string, level: SummarizeLevel): string {
  return `${noteId}:${level}`;
}

/**
 * キャッシュから要約を取得
 */
function getCachedSummary(
  noteId: string,
  level: SummarizeLevel,
): CacheEntry | null {
  const key = getCacheKey(noteId, level);
  const cached = summaryCache.get(key);

  if (!cached) return null;

  // TTL チェック
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    summaryCache.delete(key);
    return null;
  }

  return cached;
}

/**
 * キャッシュに要約を保存
 */
function setCachedSummary(
  noteId: string,
  level: SummarizeLevel,
  summary: string,
  tokenCount: number,
): void {
  const key = getCacheKey(noteId, level);
  summaryCache.set(key, {
    summary,
    tokenCount,
    timestamp: Date.now(),
  });
}

/**
 * リトライ付きで関数を実行
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;

      console.warn(
        `Retry ${i + 1}/${retries} after error:`,
        error instanceof Error ? error.message : error,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * トークン数を推定（簡易版）
 * 実際のトークン数はOllamaから取得できないため、文字数 / 4 で推定
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * ノート内容を要約生成
 */
export async function generateSummary(
  noteId: string,
  level: SummarizeLevel = "medium",
  options: {
    useCache?: boolean;
    model?: string;
    temperature?: number;
  } = {},
): Promise<{
  summary: string;
  tokenCount: number;
  processingTime: number;
  cached: boolean;
}> {
  const startTime = Date.now();
  const { useCache = true, model = DEFAULT_MODEL, temperature = 0.3 } = options;

  // キャッシュチェック
  if (useCache) {
    const cached = getCachedSummary(noteId, level);
    if (cached) {
      return {
        summary: cached.summary,
        tokenCount: cached.tokenCount,
        processingTime: Date.now() - startTime,
        cached: true,
      };
    }
  }

  // ノート取得
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { id: true, title: true, content: true },
  });

  if (!note) {
    throw new Error(`Note not found: ${noteId}`);
  }

  // コンテンツが空の場合
  if (!note.content || note.content.trim().length === 0) {
    throw new Error("Note content is empty");
  }

  // プロンプト生成
  const prompt = generateSummarizePrompt(note.content, level);

  // Ollama API 呼び出し（リトライ付き）
  const ollama = createOllamaClient();

  const response = await withRetry(async () => {
    return await ollama.chat({
      model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      options: {
        temperature,
      },
    });
  });

  const summary = response.message.content.trim();
  const tokenCount = estimateTokenCount(summary);
  const processingTime = Date.now() - startTime;

  // キャッシュ保存
  if (useCache) {
    setCachedSummary(noteId, level, summary, tokenCount);
  }

  // DB保存
  await prisma.aiSummary.create({
    data: {
      noteId,
      summary,
      level,
      tokenCount,
      model,
      processingTime,
    },
  });

  return {
    summary,
    tokenCount,
    processingTime,
    cached: false,
  };
}

/**
 * ノートの要約履歴を取得
 */
export async function getSummaryHistory(noteId: string) {
  return await prisma.aiSummary.findMany({
    where: { noteId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      summary: true,
      level: true,
      tokenCount: true,
      model: true,
      processingTime: true,
      createdAt: true,
    },
  });
}

/**
 * 要約履歴を削除
 */
export async function deleteSummary(summaryId: string): Promise<boolean> {
  try {
    await prisma.aiSummary.delete({
      where: { id: summaryId },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ollama接続テスト
 */
export async function testOllamaConnection(): Promise<{
  connected: boolean;
  version?: string;
  models?: string[];
  error?: string;
}> {
  try {
    const ollama = createOllamaClient();

    // バージョン取得（接続確認）
    const versionResponse = await fetch(`${OLLAMA_HOST}/api/version`);
    if (!versionResponse.ok) {
      throw new Error("Failed to fetch Ollama version");
    }
    const versionData = (await versionResponse.json()) as { version: string };

    // モデルリスト取得
    const listResponse = await ollama.list();
    const models = listResponse.models.map((m) => m.name);

    return {
      connected: true,
      version: versionData.version,
      models,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * キャッシュクリア
 */
export function clearCache(): void {
  summaryCache.clear();
}

/**
 * キャッシュサイズ取得
 */
export function getCacheSize(): number {
  return summaryCache.size;
}
