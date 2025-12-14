# Phase 4: AI機能 API設計書

## 概要

Ollama + Llama 3.2を使用したAI機能のAPI設計。
ローカル環境でプライバシーを保護しながら、要約・タグ提案・文章校正機能を提供。

## 技術スタック

| 項目 | 技術 |
|------|------|
| **LLMランタイム** | Ollama (ローカル実行) |
| **モデル** | Llama 3.2 (1B/3B) |
| **SDK** | ollama (公式TypeScript/JavaScript SDK) |
| **レスポンス形式** | ストリーミング + 通常 |
| **コンテキスト長** | 最大128K tokens |

### Ollama TypeScript SDK インストール

```bash
npm install ollama
```

### Ollama セットアップ

```bash
# Ollama インストール（Linux）
curl -fsSL https://ollama.com/install.sh | sh

# Llama 3.2 モデルダウンロード
ollama pull llama3.2:1b   # 軽量版（1B）
ollama pull llama3.2:3b   # 高性能版（3B）

# Ollama サーバー起動
ollama serve
```

## API エンドポイント設計

### 1. POST /api/ai/summarize - ノート要約

#### リクエスト

```typescript
{
  "noteId": "uuid",           // 要約対象ノートID
  "content": "string",        // ノート内容（noteId未指定時）
  "level": "short" | "medium" | "long",  // 要約レベル
  "language": "ja" | "en",    // 出力言語（デフォルト: ja）
  "stream": boolean           // ストリーミングレスポンス（デフォルト: false）
}
```

#### レスポンス（通常）

```typescript
{
  "success": true,
  "data": {
    "summary": "要約テキスト",
    "level": "short",
    "tokenCount": 150,
    "processingTime": 1234,   // ミリ秒
    "model": "llama3.2:1b",
    "createdAt": "2025-12-14T10:00:00Z"
  }
}
```

#### レスポンス（ストリーミング）

```
Content-Type: text/event-stream

data: {"chunk": "要約の", "done": false}
data: {"chunk": "最初の", "done": false}
data: {"chunk": "部分", "done": false}
data: {"summary": "完全な要約テキスト", "tokenCount": 150, "done": true}
```

#### エラーレスポンス

```typescript
{
  "success": false,
  "error": "Failed to generate summary",
  "details": {
    "code": "OLLAMA_CONNECTION_ERROR" | "TIMEOUT" | "INVALID_INPUT",
    "message": "詳細なエラーメッセージ"
  }
}
```

---

### 2. POST /api/ai/suggest-tags - タグ自動提案

#### リクエスト

```typescript
{
  "noteId": "uuid",           // 解析対象ノートID
  "content": "string",        // ノート内容（noteId未指定時）
  "maxTags": number,          // 最大提案数（デフォルト: 5）
  "existingTags": string[]    // 既存タグリスト（整合性チェック用）
}
```

#### レスポンス

```typescript
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "tag": "プログラミング",
        "confidence": 0.92,       // 信頼度スコア（0-1）
        "reason": "技術的な内容が多く含まれています",
        "isExisting": true        // 既存タグとの一致
      },
      {
        "tag": "TypeScript",
        "confidence": 0.85,
        "reason": "TypeScriptに関する記述が頻出",
        "isExisting": false
      }
    ],
    "model": "llama3.2:3b",
    "processingTime": 890
  }
}
```

---

### 3. POST /api/ai/proofread - 文章校正

#### リクエスト

```typescript
{
  "content": "string",        // 校正対象テキスト
  "language": "ja" | "en",    // 言語（デフォルト: ja）
  "checkTypes": string[]      // チェック種別配列
  // ["grammar", "spelling", "style", "clarity"]
}
```

#### レスポンス

```typescript
{
  "success": true,
  "data": {
    "original": "元のテキスト",
    "corrected": "校正後のテキスト",
    "suggestions": [
      {
        "type": "grammar",      // grammar | spelling | style | clarity
        "severity": "high",     // high | medium | low
        "position": {
          "start": 10,
          "end": 15
        },
        "original": "間違った表現",
        "suggestion": "正しい表現",
        "explanation": "助詞の使い方が不適切です"
      }
    ],
    "stats": {
      "totalIssues": 3,
      "grammarIssues": 1,
      "spellingIssues": 0,
      "styleIssues": 2
    },
    "model": "llama3.2:3b",
    "processingTime": 1500
  }
}
```

---

### 4. POST /api/ai/expand - 文章展開（アイデア拡張）

#### リクエスト

```typescript
{
  "content": "string",        // 展開元テキスト
  "direction": "elaborate" | "brainstorm" | "outline",
  // elaborate: 詳細化
  // brainstorm: アイデア出し
  // outline: アウトライン化
  "language": "ja" | "en",
  "stream": boolean
}
```

#### レスポンス

```typescript
{
  "success": true,
  "data": {
    "expanded": "展開されたテキスト",
    "direction": "elaborate",
    "tokenCount": 500,
    "model": "llama3.2:3b",
    "processingTime": 2000
  }
}
```

---

### 5. POST /api/ai/related-notes - 関連ノート提案

#### リクエスト

```typescript
{
  "noteId": "uuid",           // 基準ノートID
  "maxResults": number,       // 最大提案数（デフォルト: 5）
  "includeContent": boolean   // コンテンツを含めるか
}
```

#### レスポンス

```typescript
{
  "success": true,
  "data": {
    "relatedNotes": [
      {
        "noteId": "uuid",
        "title": "関連ノートタイトル",
        "similarity": 0.87,     // 類似度スコア（0-1）
        "reason": "共通のトピックと関連性の高いキーワードが含まれています",
        "snippet": "関連部分のスニペット..."
      }
    ],
    "model": "llama3.2:3b",
    "processingTime": 1200
  }
}
```

---

## データベーススキーマ拡張

### AiSummary（要約履歴）

```prisma
model AiSummary {
  id            String   @id @default(uuid())
  noteId        String
  summary       String
  level         String   // "short" | "medium" | "long"
  tokenCount    Int
  model         String   // "llama3.2:1b" | "llama3.2:3b"
  createdAt     DateTime @default(now())

  note          Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([noteId])
  @@index([createdAt])
}
```

### AiTagSuggestion（タグ提案履歴）

```prisma
model AiTagSuggestion {
  id            String   @id @default(uuid())
  noteId        String
  tagName       String
  confidence    Float    // 0-1
  reason        String?
  isAccepted    Boolean  @default(false)
  createdAt     DateTime @default(now())

  note          Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([noteId])
  @@index([isAccepted])
}
```

### AiProofreadHistory（校正履歴）

```prisma
model AiProofreadHistory {
  id            String   @id @default(uuid())
  originalText  String
  correctedText String
  issuesFound   Int
  issuesData    String   // JSON形式で詳細保存
  language      String
  createdAt     DateTime @default(now())

  @@index([createdAt])
}
```

---

## プロンプトテンプレート設計

### 1. 要約プロンプト

#### Short（短文要約）

```typescript
const SUMMARY_PROMPT_SHORT = `
あなたは優れた要約者です。以下のノートを1-2文で簡潔に要約してください。

【要約ルール】
- 最も重要なポイントのみを抽出
- 50文字以内
- 結論や核心的な情報を優先
- 箇条書きは使わず、自然な文章で

【ノート内容】
{content}

【要約】
`.trim();
```

#### Medium（中文要約）

```typescript
const SUMMARY_PROMPT_MEDIUM = `
あなたは優れた要約者です。以下のノートを3-5文で要約してください。

【要約ルール】
- 主要なポイントを網羅
- 150文字程度
- 論理的な流れを保持
- 重要な詳細も含める

【ノート内容】
{content}

【要約】
`.trim();
```

#### Long（長文要約）

```typescript
const SUMMARY_PROMPT_LONG = `
あなたは優れた要約者です。以下のノートを詳細に要約してください。

【要約ルール】
- 全体の構造を保持
- 重要なポイントすべてを含む
- 300-500文字程度
- 必要に応じてセクション分け
- 具体例も含める

【ノート内容】
{content}

【要約】
`.trim();
```

---

### 2. タグ提案プロンプト

```typescript
const TAG_SUGGESTION_PROMPT = `
あなたはナレッジベースの分類専門家です。以下のノート内容を分析し、適切なタグを{maxTags}個提案してください。

【既存タグ】
{existingTags}

【タグ提案ルール】
1. できるだけ既存タグを使用する
2. 新規タグは必要最小限に
3. 具体的で検索に役立つタグ
4. 1-2単語の短いタグ
5. 階層構造は不要

【ノート内容】
{content}

【提案フォーマット（JSON）】
必ず以下のJSON形式で出力してください：
{
  "tags": [
    {
      "tag": "タグ名",
      "confidence": 0.95,
      "reason": "提案理由"
    }
  ]
}
`.trim();
```

---

### 3. 文章校正プロンプト

```typescript
const PROOFREAD_PROMPT_JA = `
あなたは日本語の校正専門家です。以下のテキストを校正し、改善提案を行ってください。

【チェック項目】
{checkTypes}

【校正ルール】
- 文法ミス、誤字脱字を修正
- わかりにくい表現を指摘
- より自然な言い回しを提案
- 重複表現を削除
- 敬体/常体の統一

【元のテキスト】
{content}

【出力フォーマット（JSON）】
{
  "corrected": "校正後の全文",
  "suggestions": [
    {
      "type": "grammar",
      "severity": "high",
      "original": "間違った表現",
      "suggestion": "正しい表現",
      "explanation": "理由"
    }
  ]
}
`.trim();
```

---

### 4. 文章展開プロンプト

#### Elaborate（詳細化）

```typescript
const EXPAND_ELABORATE_PROMPT = `
あなたは優れたライターです。以下のアイデアを詳細に展開してください。

【展開ルール】
- 元のアイデアを深掘り
- 具体例や詳細を追加
- 論理的な構造を保つ
- 3-5倍の文量に拡張
- 自然で読みやすい文章

【元のアイデア】
{content}

【展開された文章】
`.trim();
```

#### Brainstorm（アイデア出し）

```typescript
const EXPAND_BRAINSTORM_PROMPT = `
あなたは創造的なアイデア発想者です。以下のトピックに関連するアイデアを10個ブレインストーミングしてください。

【ブレインストーミングルール】
- 多様な視点からアイデアを出す
- 実現可能性は問わない
- 具体的で明確なアイデア
- 箇条書きで列挙
- 各アイデアに簡単な説明を付ける

【トピック】
{content}

【アイデア一覧】
`.trim();
```

#### Outline（アウトライン化）

```typescript
const EXPAND_OUTLINE_PROMPT = `
あなたは文書構造化の専門家です。以下の内容を体系的なアウトラインに整理してください。

【アウトライン化ルール】
- 階層構造を使用（# ## ###）
- 論理的な順序で整理
- 各セクションに簡潔な説明
- 重複を排除
- 拡張可能な構造

【元の内容】
{content}

【アウトライン】
`.trim();
```

---

## エラーハンドリング設計

### エラーコード一覧

| コード | 説明 | HTTPステータス | 対処方法 |
|--------|------|----------------|----------|
| `OLLAMA_CONNECTION_ERROR` | Ollama接続失敗 | 503 | Ollamaサーバーの起動確認 |
| `MODEL_NOT_FOUND` | モデル未ダウンロード | 404 | `ollama pull llama3.2` 実行 |
| `TIMEOUT` | 処理タイムアウト | 504 | タイムアウト時間延長/モデル変更 |
| `INVALID_INPUT` | 不正な入力 | 400 | リクエストパラメータ修正 |
| `CONTEXT_LENGTH_EXCEEDED` | コンテキスト長超過 | 413 | テキストを分割して処理 |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 | 429 | リトライ待機 |
| `INTERNAL_ERROR` | 内部エラー | 500 | ログ確認・再試行 |

### タイムアウト設定

```typescript
const AI_TIMEOUTS = {
  SUMMARIZE: 30000,      // 30秒
  TAG_SUGGEST: 20000,    // 20秒
  PROOFREAD: 60000,      // 60秒
  EXPAND: 45000,         // 45秒
  RELATED_NOTES: 30000   // 30秒
};
```

### リトライ戦略

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,    // 1秒
  maxDelay: 10000,       // 10秒
  backoffMultiplier: 2,  // 指数バックオフ
  retryableErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND'
  ]
};
```

---

## パフォーマンス最適化

### 1. モデル選択戦略

| タスク | 推奨モデル | 理由 |
|--------|-----------|------|
| 要約（Short） | llama3.2:1b | 高速処理が重要 |
| 要約（Medium/Long） | llama3.2:3b | 精度優先 |
| タグ提案 | llama3.2:3b | 文脈理解が重要 |
| 文章校正 | llama3.2:3b | 高精度が必要 |
| 文章展開 | llama3.2:3b | 創造性が重要 |
| 関連ノート提案 | llama3.2:3b | 意味理解が重要 |

### 2. キャッシング戦略

```typescript
interface CacheConfig {
  // 同一ノートの要約は1時間キャッシュ
  summaryCacheTTL: 3600;

  // タグ提案は30分キャッシュ
  tagSuggestionCacheTTL: 1800;

  // 校正結果は5分キャッシュ
  proofreadCacheTTL: 300;

  // キャッシュキー生成
  generateCacheKey: (operation: string, params: any) => string;
}
```

### 3. バッチ処理

複数ノートの要約を一括処理する際の最適化：

```typescript
async function batchSummarize(noteIds: string[], level: string) {
  // 5件ずつバッチ処理
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < noteIds.length; i += batchSize) {
    const batch = noteIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(id => summarizeNote(id, level))
    );
    results.push(...batchResults);
  }

  return results;
}
```

---

## トークン数管理

### コンテキスト長制限

| モデル | 最大トークン数 | 推奨入力長 | 推奨出力長 |
|--------|---------------|-----------|-----------|
| llama3.2:1b | 128K | 8K | 2K |
| llama3.2:3b | 128K | 16K | 4K |

### トークン数推定

```typescript
function estimateTokens(text: string): number {
  // 日本語: 約1.5文字 = 1トークン
  // 英語: 約4文字 = 1トークン
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
  const otherChars = text.length - japaneseChars;

  return Math.ceil(japaneseChars / 1.5 + otherChars / 4);
}

function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const ratio = maxTokens / estimatedTokens;
  const truncatedLength = Math.floor(text.length * ratio);

  return text.slice(0, truncatedLength) + '...';
}
```

---

## セキュリティ・プライバシー

### 1. ローカル実行の保証

- すべてのAI処理はローカルOllamaサーバーで実行
- 外部APIへのデータ送信なし
- ネットワーク通信はlocalhost内のみ

### 2. データ保護

- 要約・校正履歴はローカルDBに保存
- 個人情報を含むノートも安全に処理可能
- オフライン環境でも動作

### 3. リソース制限

```typescript
const RESOURCE_LIMITS = {
  maxConcurrentRequests: 3,     // 同時実行数
  maxInputLength: 50000,        // 最大入力文字数
  maxOutputLength: 10000,       // 最大出力文字数
  maxCacheSize: 100 * 1024 * 1024  // 100MB
};
```

---

## 監視・ロギング

### メトリクス収集

```typescript
interface AiMetrics {
  operation: string;           // summarize, tag-suggest, etc.
  model: string;               // llama3.2:1b, llama3.2:3b
  inputTokens: number;
  outputTokens: number;
  processingTime: number;      // ミリ秒
  success: boolean;
  errorCode?: string;
  timestamp: Date;
}
```

### ログレベル

```typescript
enum LogLevel {
  DEBUG = 'debug',     // 詳細な処理ログ
  INFO = 'info',       // 通常の処理ログ
  WARN = 'warn',       // 警告（リトライ発生など）
  ERROR = 'error'      // エラー
}
```

---

## 実装優先順位

### Phase 4.1: 基礎機能（Week 1-2）

1. Ollama接続基盤
2. 要約API（基本実装）
3. エラーハンドリング
4. 単体テスト

### Phase 4.2: 拡張機能（Week 3-4）

1. タグ提案API
2. ストリーミングレスポンス
3. キャッシング実装
4. 統合テスト

### Phase 4.3: 高度機能（Week 5-6）

1. 文章校正API
2. 文章展開API
3. 関連ノート提案
4. パフォーマンス最適化

---

## 参考リンク

- [Ollama公式ドキュメント](https://docs.ollama.com)
- [Ollama JavaScript SDK](https://github.com/ollama/ollama-js)
- [Llama 3.2モデル情報](https://ollama.com/library/llama3.2)
- [Prompt Engineering Guide](https://www.promptingguide.ai/models/llama-3)
