# Phase 4: AI機能クイックリファレンス

## 1分でわかるPhase 4 AI機能

---

## セットアップ（5分）

### ステップ1: Ollamaインストール

```bash
# Linux/Mac
curl -fsSL https://ollama.com/install.sh | sh

# モデルダウンロード
ollama pull llama3.2:1b
ollama pull llama3.2:3b

# 確認
ollama list
```

### ステップ2: NPMパッケージインストール

```bash
npm install ollama
```

### ステップ3: データベーススキーマ更新

```bash
# prisma/schema.prisma に Phase4 のモデルを追加
npx prisma migrate dev --name add_ai_features
npx prisma generate
```

---

## API一覧

### 要約API

```bash
# 短文要約
POST /api/ai/summarize
{
  "noteId": "uuid",
  "level": "short",
  "stream": false
}

# レスポンス
{
  "success": true,
  "data": {
    "summary": "要約テキスト",
    "tokenCount": 50,
    "processingTime": 1234
  }
}
```

### タグ提案API

```bash
POST /api/ai/suggest-tags
{
  "noteId": "uuid",
  "maxTags": 5
}

# レスポンス
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "tag": "TypeScript",
        "confidence": 0.95,
        "reason": "TypeScriptに関する記述が多い"
      }
    ]
  }
}
```

### 文章校正API

```bash
POST /api/ai/proofread
{
  "content": "校正対象テキスト",
  "language": "ja",
  "checkTypes": ["grammar", "spelling"]
}

# レスポンス
{
  "success": true,
  "data": {
    "corrected": "校正後テキスト",
    "suggestions": [...]
  }
}
```

### 文章展開API

```bash
POST /api/ai/expand
{
  "content": "展開元テキスト",
  "direction": "elaborate"
}
```

---

## コード例

### 基本的な要約実装

```typescript
import { Ollama } from 'ollama';

const ollama = new Ollama();

async function summarize(content: string) {
  const response = await ollama.generate({
    model: 'llama3.2:1b',
    prompt: `以下のノートを50文字以内で要約:\n\n${content}`,
    options: {
      temperature: 0.3,
      num_predict: 200,
    }
  });

  return response.response.trim();
}
```

### ストリーミングレスポンス

```typescript
async function summarizeStream(content: string, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');

  const stream = await ollama.generate({
    model: 'llama3.2:1b',
    prompt: `要約:\n\n${content}`,
    stream: true,
  });

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify({ chunk: chunk.response })}\n\n`);
  }

  res.end();
}
```

---

## プロンプトテンプレート

### 要約（Short）

```typescript
const SUMMARY_PROMPT = `
あなたは優れた要約者です。以下のノートを1-2文で要約してください。

【要約ルール】
- 50文字以内
- 最も重要なポイントのみ
- 結論を優先

【ノート内容】
{content}

【要約】
`.trim();
```

### タグ提案

```typescript
const TAG_PROMPT = `
あなたは分類専門家です。適切なタグを{maxTags}個提案してください。

【既存タグ】
{existingTags}

【ノート内容】
{content}

【出力（JSON）】
{
  "tags": [
    {
      "tag": "タグ名",
      "confidence": 0.95,
      "reason": "理由"
    }
  ]
}
`.trim();
```

---

## よく使うコマンド

### Ollama管理

```bash
# モデル一覧
ollama list

# モデル削除
ollama rm llama3.2:1b

# Ollamaサーバー起動
ollama serve

# モデル実行テスト
ollama run llama3.2:1b "Hello"
```

### データベース操作

```bash
# スキーマ更新
npx prisma db push

# Prisma Studio起動
npx prisma studio

# マイグレーション確認
npx prisma migrate status
```

### テスト実行

```bash
# AI機能テスト
npm run test:backend -- aiService.test.ts

# 統合テスト
npm run test
```

---

## トラブルシューティング

### Ollamaに接続できない

```bash
# Ollamaサーバー状態確認
curl http://localhost:11434/api/tags

# Ollamaプロセス確認
ps aux | grep ollama

# Ollama再起動
killall ollama
ollama serve
```

### モデルが見つからない

```bash
# モデル再ダウンロード
ollama pull llama3.2:1b

# モデル確認
ollama list
```

### タイムアウトエラー

```typescript
// タイムアウト時間を延長
const AI_TIMEOUTS = {
  SUMMARIZE: 60000,  // 30秒 → 60秒
};
```

### メモリ不足

```bash
# 軽量モデルに切り替え
ollama pull llama3.2:1b  # 3b → 1b
```

---

## パフォーマンス最適化

### モデル選択

| タスク | モデル | 理由 |
|--------|--------|------|
| 短文要約 | llama3.2:1b | 高速 |
| 詳細要約 | llama3.2:3b | 高精度 |
| タグ提案 | llama3.2:3b | 文脈理解 |
| 文章校正 | llama3.2:3b | 高精度 |

### キャッシング

```typescript
import crypto from 'crypto';

const cache = new Map();

function getCacheKey(operation: string, params: any) {
  return crypto.createHash('md5')
    .update(JSON.stringify({ operation, ...params }))
    .digest('hex');
}

async function summarizeWithCache(content: string) {
  const key = getCacheKey('summarize', { content });

  if (cache.has(key)) {
    return cache.get(key);
  }

  const summary = await summarize(content);
  cache.set(key, summary);

  return summary;
}
```

### 並列処理制限

```typescript
import pLimit from 'p-limit';

const limit = pLimit(3);  // 同時実行3件まで

const summaries = await Promise.all(
  noteIds.map(id => limit(() => summarizeNote(id)))
);
```

---

## 環境変数

```bash
# .env
OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2:1b

AI_ENABLED=true
AI_CACHE_TTL=3600
AI_MAX_CONCURRENT_REQUESTS=3
AI_TIMEOUT_SECONDS=30

AI_MODEL_SUMMARY=llama3.2:1b
AI_MODEL_TAGS=llama3.2:3b
AI_MODEL_PROOFREAD=llama3.2:3b
```

---

## データベーススキーマ（要点）

### AiSummary（要約履歴）

```prisma
model AiSummary {
  id         String   @id @default(uuid())
  noteId     String
  summary    String
  level      String   // "short" | "medium" | "long"
  tokenCount Int
  model      String
  createdAt  DateTime @default(now())

  note       Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([noteId])
}
```

### AiTagSuggestion（タグ提案）

```prisma
model AiTagSuggestion {
  id         String   @id @default(uuid())
  noteId     String
  tagName    String
  confidence Float    // 0-1
  reason     String?
  isAccepted Boolean  @default(false)
  createdAt  DateTime @default(now())

  note       Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([noteId])
}
```

---

## テストコード例

```typescript
import { describe, it, expect } from '@jest/globals';
import { summarizeNote } from '../src/backend/services/aiService';

describe('AI Summary', () => {
  it('should generate short summary', async () => {
    const summary = await summarizeNote({
      content: 'TypeScriptは型安全なJavaScript拡張...',
      level: 'short',
    });

    expect(summary).toBeTruthy();
    expect(summary.length).toBeLessThan(100);
  }, 30000);
});
```

---

## メトリクス収集

```typescript
// メトリクス記録
await prisma.aiMetrics.create({
  data: {
    operation: 'summarize',
    model: 'llama3.2:1b',
    inputTokens: 500,
    outputTokens: 50,
    processingTime: 1234,
    success: true,
  },
});

// 統計取得
const stats = await prisma.aiMetrics.groupBy({
  by: ['operation'],
  _avg: { processingTime: true },
  _count: { id: true },
});
```

---

## エラーハンドリング

### エラーコード

| コード | 意味 | 対処 |
|--------|------|------|
| `OLLAMA_CONNECTION_ERROR` | Ollama接続失敗 | Ollama起動確認 |
| `MODEL_NOT_FOUND` | モデル未DL | `ollama pull` |
| `TIMEOUT` | タイムアウト | タイムアウト延長 |
| `CONTEXT_LENGTH_EXCEEDED` | 長すぎ | テキスト分割 |

### リトライ実装

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Unreachable');
}
```

---

## デプロイメント

### Docker Compose

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

  app:
    build: .
    environment:
      - OLLAMA_HOST=http://ollama:11434
    depends_on:
      - ollama

volumes:
  ollama_data:
```

---

## 次のステップ

### Phase 4.1（Week 1-2）
- [ ] Ollama接続基盤実装
- [ ] 要約API実装
- [ ] エラーハンドリング
- [ ] 単体テスト

### Phase 4.2（Week 3-4）
- [ ] タグ提案API
- [ ] ストリーミング実装
- [ ] キャッシング実装
- [ ] 統合テスト

### Phase 4.3（Week 5-6）
- [ ] 文章校正API
- [ ] 文章展開API
- [ ] 関連ノート提案
- [ ] パフォーマンス最適化

---

## 参考リンク

- [Ollama公式](https://ollama.com)
- [Ollama JS SDK](https://github.com/ollama/ollama-js)
- [Llama 3.2](https://ollama.com/library/llama3.2)
- [Prompt Engineering Guide](https://www.promptingguide.ai/models/llama-3)

---

## よくある質問（FAQ）

**Q: Ollamaは常時起動が必要？**
A: はい。AI機能を使う際はOllamaサーバーが起動している必要があります。

**Q: 1bと3bモデルの違いは？**
A: 1bは軽量高速、3bは高精度。要約は1b、タグ提案・校正は3bを推奨。

**Q: オフラインでも動く？**
A: はい。Ollamaは完全ローカル実行なのでオフラインで動作します。

**Q: GPUは必要？**
A: 不要。CPUのみで動作しますが、GPUがあれば高速化します。

**Q: メモリ使用量は？**
A: llama3.2:1bで約2GB、llama3.2:3bで約4GB程度です。

**Q: 商用利用可能？**
A: Llama 3.2は商用利用可能なライセンスです。

---

このクイックリファレンスで、Phase 4 AI機能の全体像を把握できます。
詳細は各設計書を参照してください。
