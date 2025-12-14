# Phase 4: AI機能実装例

## Ollama TypeScript SDK 実装ガイド

---

## 1. セットアップ

### 1.1 パッケージインストール

```bash
# Ollama TypeScript SDK
npm install ollama

# 型定義（既にインストール済み）
npm install --save-dev @types/node
```

### 1.2 Ollama サーバー確認

```bash
# Ollama バージョン確認
ollama --version

# Llama 3.2 モデルダウンロード
ollama pull llama3.2:1b
ollama pull llama3.2:3b

# 利用可能なモデル確認
ollama list

# Ollama サーバー起動（通常は自動起動）
ollama serve
```

---

## 2. 基本的な実装パターン

### 2.1 Ollama クライアント初期化

```typescript
// src/backend/services/aiService.ts

import { Ollama } from 'ollama';

// Ollamaクライアントのシングルトンインスタンス
class OllamaClient {
  private static instance: Ollama | null = null;

  static getInstance(): Ollama {
    if (!this.instance) {
      this.instance = new Ollama({
        host: process.env.OLLAMA_HOST || 'http://localhost:11434'
      });
    }
    return this.instance;
  }
}

export const ollama = OllamaClient.getInstance();
```

### 2.2 通常のレスポンス生成

```typescript
// src/backend/services/aiService.ts

import { ollama } from './ollamaClient.js';
import { SUMMARY_PROMPT_SHORT } from './prompts.js';

interface SummarizeOptions {
  content: string;
  level: 'short' | 'medium' | 'long';
  model?: 'llama3.2:1b' | 'llama3.2:3b';
}

export async function summarizeNote(
  options: SummarizeOptions
): Promise<string> {
  const { content, level, model = 'llama3.2:1b' } = options;

  // プロンプト生成
  const prompt = SUMMARY_PROMPT_SHORT.replace('{content}', content);

  try {
    // Ollama に推論リクエスト
    const response = await ollama.generate({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,  // 低めで一貫性のある出力
        top_p: 0.9,
        top_k: 40,
        num_predict: 200,  // 最大トークン数
      }
    });

    return response.response.trim();
  } catch (error) {
    console.error('Ollama summarization error:', error);
    throw new Error('Failed to generate summary');
  }
}
```

### 2.3 ストリーミングレスポンス

```typescript
// src/backend/services/aiService.ts

import { Response } from 'express';

export async function summarizeNoteStream(
  options: SummarizeOptions,
  res: Response
): Promise<void> {
  const { content, level, model = 'llama3.2:1b' } = options;

  const prompt = SUMMARY_PROMPT_SHORT.replace('{content}', content);

  // Server-Sent Events ヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await ollama.generate({
      model,
      prompt,
      stream: true,  // ストリーミング有効化
      options: {
        temperature: 0.3,
        top_p: 0.9,
      }
    });

    let fullResponse = '';

    // AsyncIterableをイテレート
    for await (const chunk of stream) {
      fullResponse += chunk.response;

      // SSEフォーマットでクライアントに送信
      res.write(`data: ${JSON.stringify({
        chunk: chunk.response,
        done: false
      })}\n\n`);
    }

    // 完了通知
    res.write(`data: ${JSON.stringify({
      summary: fullResponse.trim(),
      done: true
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({
      error: 'Streaming failed',
      done: true
    })}\n\n`);
    res.end();
  }
}
```

---

## 3. API エンドポイント実装

### 3.1 要約API

```typescript
// src/backend/api/ai.ts

import { Router, Request, Response } from 'express';
import { summarizeNote, summarizeNoteStream } from '../services/aiService.js';
import { prisma } from '../db.js';

const router = Router();

/**
 * POST /api/ai/summarize
 * ノート要約
 */
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const {
      noteId,
      content,
      level = 'short',
      language = 'ja',
      stream = false,
    } = req.body;

    // バリデーション
    if (!noteId && !content) {
      return res.status(400).json({
        success: false,
        error: 'noteId or content is required',
      });
    }

    // ノートIDから内容取得
    let noteContent = content;
    if (noteId && !content) {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          error: 'Note not found',
        });
      }

      noteContent = note.content;
    }

    const startTime = Date.now();

    // ストリーミングレスポンス
    if (stream) {
      await summarizeNoteStream(
        { content: noteContent, level },
        res
      );
      return;
    }

    // 通常レスポンス
    const summary = await summarizeNote({
      content: noteContent,
      level,
    });

    const processingTime = Date.now() - startTime;

    // 要約履歴を保存
    if (noteId) {
      await prisma.aiSummary.create({
        data: {
          noteId,
          summary,
          level,
          tokenCount: estimateTokens(summary),
          model: 'llama3.2:1b',
        },
      });
    }

    res.json({
      success: true,
      data: {
        summary,
        level,
        tokenCount: estimateTokens(summary),
        processingTime,
        model: 'llama3.2:1b',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
      details: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;
```

### 3.2 タグ提案API

```typescript
// src/backend/api/ai.ts

/**
 * POST /api/ai/suggest-tags
 * タグ自動提案
 */
router.post('/suggest-tags', async (req: Request, res: Response) => {
  try {
    const {
      noteId,
      content,
      maxTags = 5,
      existingTags = [],
    } = req.body;

    // バリデーション
    if (!noteId && !content) {
      return res.status(400).json({
        success: false,
        error: 'noteId or content is required',
      });
    }

    // ノート内容取得
    let noteContent = content;
    if (noteId && !content) {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          error: 'Note not found',
        });
      }

      noteContent = note.content;
    }

    // 既存タグ一覧を取得
    const allTags = await prisma.tag.findMany({
      select: { name: true },
    });
    const existingTagNames = allTags.map(t => t.name);

    // プロンプト生成
    const prompt = TAG_SUGGESTION_PROMPT
      .replace('{maxTags}', maxTags.toString())
      .replace('{existingTags}', existingTagNames.join(', '))
      .replace('{content}', noteContent);

    const startTime = Date.now();

    // Ollama リクエスト
    const response = await ollama.generate({
      model: 'llama3.2:3b',  // タグ提案は高精度モデル
      prompt,
      stream: false,
      options: {
        temperature: 0.5,  // 中程度の創造性
        format: 'json',    // JSON出力を要求
      },
    });

    // JSON パース
    const result = JSON.parse(response.response);
    const processingTime = Date.now() - startTime;

    // 提案履歴を保存
    if (noteId && result.tags) {
      for (const tagSuggestion of result.tags) {
        await prisma.aiTagSuggestion.create({
          data: {
            noteId,
            tagName: tagSuggestion.tag,
            confidence: tagSuggestion.confidence,
            reason: tagSuggestion.reason,
            isAccepted: false,
          },
        });
      }
    }

    res.json({
      success: true,
      data: {
        suggestions: result.tags.map((tag: any) => ({
          ...tag,
          isExisting: existingTagNames.includes(tag.tag),
        })),
        model: 'llama3.2:3b',
        processingTime,
      },
    });
  } catch (error) {
    console.error('Tag suggestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suggest tags',
      details: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});
```

### 3.3 文章校正API

```typescript
/**
 * POST /api/ai/proofread
 * 文章校正
 */
router.post('/proofread', async (req: Request, res: Response) => {
  try {
    const {
      content,
      language = 'ja',
      checkTypes = ['grammar', 'spelling', 'style', 'clarity'],
    } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content is required',
      });
    }

    // プロンプト選択
    const prompt = language === 'ja'
      ? PROOFREAD_PROMPT_JA
      : PROOFREAD_PROMPT_EN;

    const finalPrompt = prompt
      .replace('{checkTypes}', checkTypes.join(', '))
      .replace('{content}', content);

    const startTime = Date.now();

    // Ollama リクエスト
    const response = await ollama.generate({
      model: 'llama3.2:3b',
      prompt: finalPrompt,
      stream: false,
      options: {
        temperature: 0.2,  // 校正は低温度で一貫性重視
        format: 'json',
      },
    });

    const result = JSON.parse(response.response);
    const processingTime = Date.now() - startTime;

    // 校正履歴を保存
    await prisma.aiProofreadHistory.create({
      data: {
        originalText: content,
        correctedText: result.corrected,
        issuesFound: result.stats.totalIssues,
        issuesData: JSON.stringify(result.suggestions),
        language,
      },
    });

    res.json({
      success: true,
      data: {
        ...result,
        model: 'llama3.2:3b',
        processingTime,
      },
    });
  } catch (error) {
    console.error('Proofread error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to proofread',
      details: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});
```

---

## 4. エラーハンドリング実装

### 4.1 Ollama接続チェック

```typescript
// src/backend/services/aiService.ts

export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const models = await ollama.list();
    return models.models.length > 0;
  } catch (error) {
    console.error('Ollama connection failed:', error);
    return false;
  }
}

export async function checkModelAvailability(
  modelName: string
): Promise<boolean> {
  try {
    const models = await ollama.list();
    return models.models.some(m => m.name === modelName);
  } catch (error) {
    console.error('Model check failed:', error);
    return false;
  }
}
```

### 4.2 リトライロジック

```typescript
// src/backend/utils/retry.ts

interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  let delay = options.initialDelay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === options.maxRetries) {
        break;
      }

      // エラーがリトライ可能か判定
      if (!isRetryableError(error)) {
        throw error;
      }

      console.warn(`Retry attempt ${attempt + 1}/${options.maxRetries} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));

      // 指数バックオフ
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
    }
  }

  throw lastError!;
}

function isRetryableError(error: any): boolean {
  const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
  return retryableCodes.includes(error?.code);
}
```

### 4.3 タイムアウト実装

```typescript
// src/backend/utils/timeout.ts

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error('Operation timed out')
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(timeoutError), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

// 使用例
import { withTimeout } from '../utils/timeout.js';

const summary = await withTimeout(
  summarizeNote({ content: noteContent, level }),
  30000,  // 30秒タイムアウト
  new Error('Summarization timeout')
);
```

---

## 5. ユーティリティ関数

### 5.1 トークン数推定

```typescript
// src/backend/utils/tokenEstimator.ts

export function estimateTokens(text: string): number {
  // 日本語: 約1.5文字 = 1トークン
  // 英語: 約4文字 = 1トークン
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
  const otherChars = text.length - japaneseChars;

  return Math.ceil(japaneseChars / 1.5 + otherChars / 4);
}

export function truncateToTokenLimit(
  text: string,
  maxTokens: number
): string {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // トークン制限に収まるようテキストを切り詰め
  const ratio = maxTokens / estimatedTokens;
  const truncatedLength = Math.floor(text.length * ratio);

  return text.slice(0, truncatedLength) + '...（以下省略）';
}
```

### 5.2 プロンプトビルダー

```typescript
// src/backend/utils/promptBuilder.ts

export class PromptBuilder {
  private template: string;
  private variables: Record<string, string> = {};

  constructor(template: string) {
    this.template = template;
  }

  set(key: string, value: string): this {
    this.variables[key] = value;
    return this;
  }

  build(): string {
    let result = this.template;

    for (const [key, value] of Object.entries(this.variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return result;
  }

  // トークン制限を適用
  buildWithTokenLimit(maxTokens: number): string {
    const fullPrompt = this.build();
    return truncateToTokenLimit(fullPrompt, maxTokens);
  }
}

// 使用例
const prompt = new PromptBuilder(SUMMARY_PROMPT_SHORT)
  .set('content', noteContent)
  .buildWithTokenLimit(8000);
```

---

## 6. キャッシング実装

### 6.1 インメモリキャッシュ

```typescript
// src/backend/utils/cache.ts

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, value: T, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 期限切れエントリを削除
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// グローバルキャッシュインスタンス
export const summaryCache = new MemoryCache<string>();

// 定期的にクリーンアップ（5分ごと）
setInterval(() => summaryCache.cleanup(), 5 * 60 * 1000);
```

### 6.2 キャッシュ統合

```typescript
// src/backend/services/aiService.ts

import { summaryCache } from '../utils/cache.js';
import crypto from 'crypto';

function generateCacheKey(operation: string, params: any): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify({ operation, ...params }));
  return hash.digest('hex');
}

export async function summarizeNoteWithCache(
  options: SummarizeOptions
): Promise<string> {
  // キャッシュキー生成
  const cacheKey = generateCacheKey('summarize', options);

  // キャッシュチェック
  const cached = summaryCache.get(cacheKey);
  if (cached) {
    console.log('Cache hit for summary');
    return cached;
  }

  // キャッシュミス - 新規生成
  const summary = await summarizeNote(options);

  // キャッシュに保存（1時間）
  summaryCache.set(cacheKey, summary, 3600);

  return summary;
}
```

---

## 7. テスト実装

### 7.1 単体テスト

```typescript
// tests/backend/aiService.test.ts

import { describe, it, expect, beforeAll } from '@jest/globals';
import { summarizeNote, checkOllamaConnection } from '../src/backend/services/aiService';

describe('AI Service', () => {
  beforeAll(async () => {
    // Ollama接続確認
    const isConnected = await checkOllamaConnection();
    if (!isConnected) {
      console.warn('Ollama is not running. Skipping AI tests.');
    }
  });

  it('should summarize note content', async () => {
    const content = `
      TypeScriptは静的型付けを提供するJavaScriptのスーパーセット。
      開発時の型チェックにより、バグを早期発見できる。
      大規模開発に適している。
    `;

    const summary = await summarizeNote({
      content,
      level: 'short',
    });

    expect(summary).toBeTruthy();
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThan(100);
  }, 30000);  // 30秒タイムアウト

  it('should handle empty content', async () => {
    await expect(
      summarizeNote({ content: '', level: 'short' })
    ).rejects.toThrow();
  });

  it('should estimate tokens correctly', () => {
    const japaneseText = 'これは日本語のテキストです';
    const tokens = estimateTokens(japaneseText);
    expect(tokens).toBeGreaterThan(0);
  });
});
```

---

## 8. モニタリング実装

### 8.1 メトリクス収集

```typescript
// src/backend/utils/metrics.ts

interface AiMetrics {
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  processingTime: number;
  success: boolean;
  errorCode?: string;
  timestamp: Date;
}

class MetricsCollector {
  private metrics: AiMetrics[] = [];

  record(metric: AiMetrics): void {
    this.metrics.push(metric);

    // 最大1000件まで保持
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  getStats(operation?: string) {
    const filtered = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    return {
      total: filtered.length,
      success: filtered.filter(m => m.success).length,
      failed: filtered.filter(m => !m.success).length,
      avgProcessingTime: filtered.reduce((sum, m) => sum + m.processingTime, 0) / filtered.length,
      totalTokens: filtered.reduce((sum, m) => sum + m.inputTokens + m.outputTokens, 0),
    };
  }
}

export const metricsCollector = new MetricsCollector();
```

### 8.2 メトリクス記録

```typescript
// 要約関数にメトリクス記録を追加
export async function summarizeNote(
  options: SummarizeOptions
): Promise<string> {
  const startTime = Date.now();
  let success = false;
  let errorCode: string | undefined;

  try {
    const result = await ollama.generate({...});
    success = true;
    return result.response.trim();
  } catch (error) {
    errorCode = error.code || 'UNKNOWN_ERROR';
    throw error;
  } finally {
    metricsCollector.record({
      operation: 'summarize',
      model: options.model || 'llama3.2:1b',
      inputTokens: estimateTokens(options.content),
      outputTokens: success ? estimateTokens(result.response) : 0,
      processingTime: Date.now() - startTime,
      success,
      errorCode,
      timestamp: new Date(),
    });
  }
}
```

---

## 9. 環境変数設定

### 9.1 .env ファイル

```bash
# Ollama設定
OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2:1b

# AI機能設定
AI_ENABLED=true
AI_CACHE_TTL=3600
AI_MAX_CONCURRENT_REQUESTS=3
AI_TIMEOUT_SECONDS=30

# モデル選択
AI_MODEL_SUMMARY=llama3.2:1b
AI_MODEL_TAGS=llama3.2:3b
AI_MODEL_PROOFREAD=llama3.2:3b
```

### 9.2 設定ファイル

```typescript
// src/backend/config/ai.ts

export const AI_CONFIG = {
  ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
  enabled: process.env.AI_ENABLED === 'true',
  cacheTTL: Number(process.env.AI_CACHE_TTL) || 3600,
  maxConcurrentRequests: Number(process.env.AI_MAX_CONCURRENT_REQUESTS) || 3,
  timeoutSeconds: Number(process.env.AI_TIMEOUT_SECONDS) || 30,

  models: {
    summary: process.env.AI_MODEL_SUMMARY || 'llama3.2:1b',
    tags: process.env.AI_MODEL_TAGS || 'llama3.2:3b',
    proofread: process.env.AI_MODEL_PROOFREAD || 'llama3.2:3b',
  },

  timeouts: {
    summarize: 30000,
    tagSuggest: 20000,
    proofread: 60000,
    expand: 45000,
  },
};
```

---

## 10. デプロイメント

### 10.1 Docker Compose設定

```yaml
# docker-compose.yml

version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OLLAMA_HOST=http://ollama:11434
    depends_on:
      - ollama
    restart: unless-stopped

volumes:
  ollama_data:
```

### 10.2 初期セットアップスクリプト

```bash
#!/bin/bash
# scripts/setup-ollama.sh

echo "Setting up Ollama..."

# Ollama起動確認
if ! command -v ollama &> /dev/null; then
    echo "Ollama is not installed. Installing..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Ollamaサーバー起動
ollama serve &

# モデルダウンロード
echo "Downloading Llama 3.2 models..."
ollama pull llama3.2:1b
ollama pull llama3.2:3b

echo "Ollama setup complete!"
ollama list
```

---

これで Phase 4 AI機能の実装に必要なすべてのコード例が揃いました。
