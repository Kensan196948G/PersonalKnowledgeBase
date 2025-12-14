# Phase 4: セマンティック検索・RAG詳細設計

**作成日**: 2025-12-14
**担当**: SubAgent 2
**状態**: 設計完了

---

## 目次

1. [概要](#概要)
2. [技術選定](#技術選定)
3. [アーキテクチャ設計](#アーキテクチャ設計)
4. [セマンティック検索設計](#セマンティック検索設計)
5. [ハイブリッド検索設計](#ハイブリッド検索設計)
6. [RAGパイプライン設計](#ragパイプライン設計)
7. [API設計](#api設計)
8. [パフォーマンス最適化](#パフォーマンス最適化)
9. [ハルシネーション対策](#ハルシネーション対策)
10. [実装ロードマップ](#実装ロードマップ)

---

## 概要

### 目的

個人ナレッジベースに対する高精度な意味検索と、LLMを活用した質問応答（RAG）機能を実現する。

### 提供機能

| 機能 | 説明 |
|------|------|
| **セマンティック検索** | テキストの意味的類似性に基づくノート検索 |
| **ハイブリッド検索** | キーワード検索 + ベクトル検索の統合 |
| **RAG質問応答** | ナレッジベースに基づく自然言語Q&A |
| **類似ノート提案** | 現在のノートに関連するノート自動提案 |

### 設計方針

- **プライバシーファースト**: ローカル処理を優先、外部APIは明示的同意の上で使用
- **段階的実装**: セマンティック検索 → ハイブリッド検索 → RAG の順に実装
- **SQLite活用**: 既存のSQLiteにベクトル検索機能を追加（sqlite-vec）
- **軽量モデル優先**: ブラウザ/Node.jsで動作する軽量埋め込みモデル（Transformers.js）

---

## 技術選定

### 1. 埋め込みモデル（Embedding Model）

**選定**: **Transformers.js** + **all-MiniLM-L6-v2**

| 項目 | 詳細 |
|------|------|
| ライブラリ | `@xenova/transformers` (v3.x) |
| モデル | `Xenova/all-MiniLM-L6-v2` |
| ベクトル次元 | 384次元 |
| 実行環境 | Node.js / Browser (ONNX Runtime) |
| ライセンス | Apache 2.0 |

**選定理由**:
- サーバーサイド不要（完全ローカル実行）
- 軽量（約22MB）で高精度
- 多言語対応（日本語も対応）
- 外部API不要（プライバシー保護）

**参考**: [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/en/index)

### 2. ベクトルデータベース

**選定**: **sqlite-vec**

| 項目 | 詳細 |
|------|------|
| パッケージ | `sqlite-vec` (npm) |
| 距離計算 | コサイン類似度、L2距離 |
| インデックス | SIMD最適化 |
| 統合 | better-sqlite3 / node:sqlite |

**選定理由**:
- 既存のSQLiteと統合可能（追加DBサーバー不要）
- 軽量（単一拡張機能）
- K-NN検索対応
- SQLクエリとベクトル検索の混在可能

**参考**: [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec), [npm package](https://www.npmjs.com/package/sqlite-vec)

### 3. RAG実装方式

**選定**: **カスタムRAGパイプライン**（LangChain.js非採用）

| 比較項目 | LangChain.js | カスタム実装 |
|----------|--------------|--------------|
| 学習コスト | 高 | 低 |
| 柔軟性 | 中 | 高 |
| 依存関係 | 多 | 少 |
| デバッグ | 困難 | 容易 |
| パフォーマンス | 中 | 高（最適化可能） |

**選定理由**:
- 個人開発のためシンプルさ優先
- 機能範囲が限定的（フル機能不要）
- 完全な制御とデバッグの容易さ
- 依存関係の最小化

**参考**: [RAG Best Practices 2025](https://orkes.io/blog/rag-best-practices/), [Custom RAG Discussion](https://community.latenode.com/t/benefits-of-using-langchain-vs-building-custom-rag-implementation-from-scratch/39073)

---

## アーキテクチャ設計

### システム全体像

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Search Input │  │ RAG Q&A Box  │  │ Similar Notes Panel │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ API Requests
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    API Layer                               │  │
│  │  /api/search/semantic  /api/ai/qa  /api/ai/similar       │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Embedding Service                          │  │
│  │  - Text → Vector (Transformers.js)                        │  │
│  │  - Caching (LRU)                                          │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Search & Retrieval Service                    │  │
│  │  - Vector Search (sqlite-vec)                             │  │
│  │  - Keyword Search (FTS5)                                  │  │
│  │  - Hybrid Search (RRF)                                    │  │
│  │  - Reranking (Cross-Encoder)                              │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   RAG Service                              │  │
│  │  - Context Construction                                    │  │
│  │  - Prompt Engineering                                      │  │
│  │  - LLM Invocation (Optional: Anthropic/OpenAI)            │  │
│  └───────────────────────┬───────────────────────────────────┘  │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (SQLite)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Notes Table  │  │ FTS5 Index   │  │ note_embeddings      │  │
│  │ (Existing)   │  │ (Keyword)    │  │ (Vector: BLOB)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### データフロー

#### 1. セマンティック検索フロー

```
User Query → Embed Query → Vector Search (sqlite-vec)
          → Cosine Similarity → Ranked Results → Frontend
```

#### 2. ハイブリッド検索フロー

```
User Query → [Parallel Execution]
             ├─ Embed → Vector Search → Results A
             └─ Keyword → FTS5 Search → Results B
          → RRF Fusion → Reranking (Optional) → Unified Results
```

#### 3. RAGフロー

```
User Question → Embed Question → Hybrid Retrieval
             → Select Top-K Documents → Context Construction
             → Prompt Engineering → LLM API → Parse Response
             → Format Answer + Sources → Frontend
```

---

## セマンティック検索設計

### 1. データベーススキーマ拡張

**新規テーブル: `note_embeddings`**

```sql
CREATE TABLE note_embeddings (
  id TEXT PRIMARY KEY,           -- Note ID (FK to notes.id)
  embedding BLOB NOT NULL,        -- 384次元ベクトル (Float32Array)
  model_version TEXT NOT NULL,    -- "all-MiniLM-L6-v2@v1"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES Note(id) ON DELETE CASCADE
);

-- ベクトル検索インデックス (sqlite-vec)
CREATE INDEX idx_note_embeddings_vec ON note_embeddings
  USING vec (embedding);
```

**Prismaスキーマ追加**

```prisma
model NoteEmbedding {
  id           String   @id
  embedding    Bytes    // Float32Array as BLOB
  modelVersion String   @map("model_version")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  note         Note     @relation(fields: [id], references: [id], onDelete: Cascade)

  @@map("note_embeddings")
}

// Note モデルに追加
model Note {
  // ... 既存フィールド
  embedding    NoteEmbedding?
}
```

### 2. 埋め込み生成サービス

**ファイル**: `src/backend/services/embeddingService.ts`

```typescript
import { pipeline } from '@xenova/transformers';
import LRU from 'lru-cache';

class EmbeddingService {
  private model: any;
  private cache: LRU<string, Float32Array>;
  private readonly MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
  private readonly MODEL_VERSION = 'all-MiniLM-L6-v2@v1';

  constructor() {
    this.cache = new LRU({ max: 500 }); // 最大500件キャッシュ
  }

  async initialize() {
    // モデル初回ロード（初回のみダウンロード、以降はキャッシュ）
    this.model = await pipeline('feature-extraction', this.MODEL_NAME);
  }

  async embed(text: string): Promise<Float32Array> {
    // キャッシュチェック
    const cacheKey = this.hashText(text);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // 埋め込み生成
    const output = await this.model(text, {
      pooling: 'mean',
      normalize: true,
    });

    const embedding = new Float32Array(output.data);
    this.cache.set(cacheKey, embedding);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    // バッチ処理で効率化
    return Promise.all(texts.map(text => this.embed(text)));
  }

  private hashText(text: string): string {
    // 簡易ハッシュ（本番ではcryptoモジュール使用推奨）
    return Buffer.from(text).toString('base64').substring(0, 32);
  }

  getModelVersion(): string {
    return this.MODEL_VERSION;
  }
}

export const embeddingService = new EmbeddingService();
```

### 3. ベクトル検索実装

**ファイル**: `src/backend/services/vectorSearchService.ts`

```typescript
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

class VectorSearchService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    sqliteVec.load(db); // sqlite-vec 拡張ロード
  }

  /**
   * コサイン類似度によるK-NN検索
   */
  searchSimilar(
    queryEmbedding: Float32Array,
    limit: number = 10,
    threshold: number = 0.7
  ): Array<{ id: string; score: number }> {
    const stmt = this.db.prepare(`
      SELECT
        id,
        vec_distance_cosine(embedding, ?) AS distance
      FROM note_embeddings
      WHERE vec_distance_cosine(embedding, ?) < ?
      ORDER BY distance ASC
      LIMIT ?
    `);

    const maxDistance = 1 - threshold; // コサイン類似度 → 距離
    const results = stmt.all(
      queryEmbedding.buffer,
      queryEmbedding.buffer,
      maxDistance,
      limit
    );

    return results.map((row: any) => ({
      id: row.id,
      score: 1 - row.distance, // 距離 → 類似度スコア
    }));
  }

  /**
   * バッチ埋め込み挿入
   */
  insertEmbeddings(embeddings: Array<{ id: string; vector: Float32Array; modelVersion: string }>) {
    const insert = this.db.prepare(`
      INSERT INTO note_embeddings (id, embedding, model_version)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        embedding = excluded.embedding,
        model_version = excluded.model_version,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = this.db.transaction((items) => {
      for (const item of items) {
        insert.run(item.id, item.vector.buffer, item.modelVersion);
      }
    });

    transaction(embeddings);
  }
}

export default VectorSearchService;
```

### 4. セマンティック検索API

**エンドポイント**: `POST /api/search/semantic`

**リクエスト**:
```typescript
{
  query: string;          // 検索クエリ
  limit?: number;         // 結果数（デフォルト: 10）
  threshold?: number;     // 類似度閾値（デフォルト: 0.7）
  filters?: {             // オプショナルフィルタ
    folderId?: string;
    tags?: string[];
    dateRange?: { from: string; to: string };
  };
}
```

**レスポンス**:
```typescript
{
  success: true;
  count: number;
  data: Array<{
    id: string;
    title: string;
    content: string;
    score: number;        // 類似度スコア (0-1)
    tags: Tag[];
    createdAt: string;
  }>;
  timing: {
    embedding: number;    // 埋め込み生成時間 (ms)
    search: number;       // 検索時間 (ms)
    total: number;
  };
}
```

**実装**: `src/backend/api/search.ts`

```typescript
router.post('/semantic', async (req, res) => {
  const startTime = Date.now();
  const { query, limit = 10, threshold = 0.7, filters } = req.body;

  try {
    // 1. クエリ埋め込み生成
    const embedStart = Date.now();
    const queryEmbedding = await embeddingService.embed(query);
    const embedTime = Date.now() - embedStart;

    // 2. ベクトル検索
    const searchStart = Date.now();
    const results = vectorSearchService.searchSimilar(
      queryEmbedding,
      limit * 2, // リランキング用に多めに取得
      threshold
    );
    const searchTime = Date.now() - searchStart;

    // 3. フィルタ適用 + ノート情報取得
    const noteIds = results.map(r => r.id);
    const notes = await prisma.note.findMany({
      where: {
        id: { in: noteIds },
        ...(filters?.folderId && { folderId: filters.folderId }),
        ...(filters?.tags && {
          tags: { some: { tagId: { in: filters.tags } } }
        }),
        // ... その他フィルタ
      },
      include: { tags: { include: { tag: true } } },
    });

    // 4. スコアマージ + ソート
    const rankedNotes = notes
      .map(note => ({
        ...note,
        score: results.find(r => r.id === note.id)?.score || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    res.json({
      success: true,
      count: rankedNotes.length,
      data: rankedNotes,
      timing: {
        embedding: embedTime,
        search: searchTime,
        total: Date.now() - startTime,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## ハイブリッド検索設計

### 1. RRF (Reciprocal Rank Fusion) アルゴリズム

**概要**: キーワード検索とベクトル検索の結果を統合するランキング融合手法。

**アルゴリズム**:
```
RRF_score(d) = Σ (1 / (k + rank_i(d)))

d: ドキュメント
rank_i(d): 検索手法iにおけるドキュメントdのランク
k: 定数（通常60）
```

**参考**: [Azure AI Hybrid Search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking), [OpenSearch RRF](https://opensearch.org/blog/introducing-reciprocal-rank-fusion-hybrid-search/)

### 2. ハイブリッド検索実装

**ファイル**: `src/backend/services/hybridSearchService.ts`

```typescript
interface SearchResult {
  id: string;
  score: number;
  source: 'vector' | 'keyword';
}

class HybridSearchService {
  private readonly RRF_K = 60; // RRF定数

  /**
   * ハイブリッド検索（ベクトル + キーワード + RRF）
   */
  async search(
    query: string,
    options: {
      limit?: number;
      vectorWeight?: number;  // ベクトル検索の重み (0-1)
      keywordWeight?: number; // キーワード検索の重み (0-1)
    }
  ): Promise<SearchResult[]> {
    const { limit = 10, vectorWeight = 0.5, keywordWeight = 0.5 } = options;

    // 1. 並列検索実行
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(query, limit * 2),
      this.keywordSearch(query, limit * 2),
    ]);

    // 2. RRFスコア計算
    const rrfScores = this.calculateRRF(vectorResults, keywordResults);

    // 3. 重み付けスコア計算
    const finalScores = rrfScores.map(item => ({
      ...item,
      score:
        (item.vectorRank ? vectorWeight / (this.RRF_K + item.vectorRank) : 0) +
        (item.keywordRank ? keywordWeight / (this.RRF_K + item.keywordRank) : 0),
    }));

    // 4. ソート + 制限
    return finalScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async vectorSearch(query: string, limit: number): Promise<SearchResult[]> {
    const embedding = await embeddingService.embed(query);
    return vectorSearchService.searchSimilar(embedding, limit)
      .map(r => ({ ...r, source: 'vector' as const }));
  }

  private async keywordSearch(query: string, limit: number): Promise<SearchResult[]> {
    // FTS5 全文検索（既存実装を利用）
    const results = await prisma.$queryRaw`
      SELECT id, rank
      FROM notes_fts
      WHERE notes_fts MATCH ${query}
      ORDER BY rank
      LIMIT ${limit}
    `;
    return results.map((r: any, idx: number) => ({
      id: r.id,
      score: 1 / (idx + 1), // ランクベースのスコア
      source: 'keyword' as const,
    }));
  }

  private calculateRRF(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[]
  ) {
    const allIds = new Set([
      ...vectorResults.map(r => r.id),
      ...keywordResults.map(r => r.id),
    ]);

    return Array.from(allIds).map(id => {
      const vectorRank = vectorResults.findIndex(r => r.id === id) + 1;
      const keywordRank = keywordResults.findIndex(r => r.id === id) + 1;

      return {
        id,
        vectorRank: vectorRank || null,
        keywordRank: keywordRank || null,
      };
    });
  }
}

export default HybridSearchService;
```

### 3. リランキング（オプショナル）

**目的**: 上位候補をクロスエンコーダで再評価し精度向上。

**実装方針**:
- 初期実装: RRFのみ（シンプル）
- Phase 4.5: クロスエンコーダ追加（`cross-encoder/ms-marco-MiniLM-L-6-v2`）

**参考**: [Cross-Encoder Reranking](https://www.zeroentropy.dev/articles/ultimate-guide-to-choosing-the-best-reranking-model-in-2025), [Pinecone Rerankers](https://www.pinecone.io/learn/series/rag/rerankers/)

---

## RAGパイプライン設計

### 1. RAGアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                       RAG Pipeline                           │
│                                                               │
│  ┌────────────────┐                                          │
│  │  User Question │                                          │
│  └────────┬───────┘                                          │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 1: Retrieval (検索)                               │ │
│  │  - Hybrid Search (Vector + Keyword + RRF)              │ │
│  │  - Top-K Selection (デフォルト: 5)                     │ │
│  └────────┬───────────────────────────────────────────────┘ │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 2: Context Construction (コンテキスト構築)        │ │
│  │  - Chunk Selection (関連度順)                         │ │
│  │  - Token Count Validation (< 4000 tokens)              │ │
│  │  - Metadata Injection (title, date, tags)              │ │
│  └────────┬───────────────────────────────────────────────┘ │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 3: Prompt Engineering (プロンプト生成)            │ │
│  │  - System Prompt (役割定義)                           │ │
│  │  - Context Injection (検索結果)                       │ │
│  │  - User Question                                       │ │
│  │  - Output Format Specification                         │ │
│  └────────┬───────────────────────────────────────────────┘ │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 4: LLM Invocation (LLM呼び出し)                  │ │
│  │  - API: Anthropic Claude / OpenAI GPT (選択可)        │ │
│  │  - Streaming Response (リアルタイム表示)              │ │
│  │  - Error Handling + Retry                              │ │
│  └────────┬───────────────────────────────────────────────┘ │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 5: Response Parsing (レスポンス解析)             │ │
│  │  - Answer Extraction                                   │ │
│  │  - Source Attribution (引用元ノート)                  │ │
│  │  - Confidence Score (Optional)                         │ │
│  └────────┬───────────────────────────────────────────────┘ │
│           ▼                                                   │
│  ┌────────────────┐                                          │
│  │ Final Response │                                          │
│  └────────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### 2. コンテキスト構築戦略

**チャンキング**: 検索結果のノート全文を使用（平均1000-2000トークン想定）

**トークン管理**:
```typescript
interface ContextConfig {
  maxTokens: number;        // 最大トークン数（デフォルト: 4000）
  topK: number;             // 上位K件（デフォルト: 5）
  includeMetadata: boolean; // メタデータ含む（デフォルト: true）
}

function constructContext(
  retrievedNotes: Note[],
  config: ContextConfig
): string {
  let context = '';
  let tokenCount = 0;

  for (const note of retrievedNotes.slice(0, config.topK)) {
    const noteText = formatNoteForContext(note, config.includeMetadata);
    const noteTokens = estimateTokens(noteText);

    if (tokenCount + noteTokens > config.maxTokens) break;

    context += noteText + '\n\n---\n\n';
    tokenCount += noteTokens;
  }

  return context;
}

function formatNoteForContext(note: Note, includeMetadata: boolean): string {
  let text = `# ${note.title}\n\n${note.content}`;

  if (includeMetadata) {
    text += `\n\n[メタデータ]\n`;
    text += `- 作成日: ${note.createdAt}\n`;
    text += `- タグ: ${note.tags.map(t => t.name).join(', ')}\n`;
  }

  return text;
}

function estimateTokens(text: string): number {
  // 簡易推定: 英語約4文字/トークン、日本語約2文字/トークン
  return Math.ceil(text.length / 3);
}
```

**参考**: [RAG Context Engineering](https://www.analyticsvidhya.com/blog/2025/07/context-engineering/), [Prompt Engineering Guide](https://www.promptingguide.ai/research/rag)

### 3. プロンプトエンジニアリング

**システムプロンプト**:
```typescript
const SYSTEM_PROMPT = `あなたは個人ナレッジベースのアシスタントです。

役割:
- ユーザーの質問に対し、提供されたノート（コンテキスト）に基づいて回答する
- コンテキストに情報がない場合は「情報が見つかりませんでした」と正直に答える
- 回答には必ず参照元のノートタイトルを明記する

制約:
- コンテキスト外の一般知識は使用しない（ハルシネーション防止）
- 推測や憶測は避け、事実のみを述べる
- 複数のノートに情報がある場合は統合して回答する

出力形式:
{
  "answer": "回答本文（Markdown形式）",
  "sources": [
    { "noteId": "uuid", "noteTitle": "ノートタイトル", "relevance": "高/中/低" }
  ],
  "confidence": "high/medium/low"
}`;
```

**ユーザープロンプトテンプレート**:
```typescript
function buildUserPrompt(question: string, context: string): string {
  return `
## コンテキスト（検索結果）

${context}

## 質問

${question}

## 回答

上記のコンテキストに基づいて、質問に回答してください。
JSON形式で出力してください。
`.trim();
}
```

**参考**: [RAG Prompt Engineering](https://www.k2view.com/blog/rag-prompt-engineering/), [LLM Prompting Guide 2025](https://www.lakera.ai/blog/prompt-engineering-guide)

### 4. RAGサービス実装

**ファイル**: `src/backend/services/ragService.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

class RAGService {
  private client: Anthropic;
  private hybridSearch: HybridSearchService;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.hybridSearch = new HybridSearchService();
  }

  async answerQuestion(
    question: string,
    options: {
      topK?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ) {
    const { topK = 5, maxTokens = 4000, stream = false } = options;

    // 1. Retrieval（検索）
    const retrievedNotes = await this.hybridSearch.search(question, {
      limit: topK,
    });

    const notes = await prisma.note.findMany({
      where: { id: { in: retrievedNotes.map(r => r.id) } },
      include: { tags: { include: { tag: true } } },
    });

    // 2. Context Construction（コンテキスト構築）
    const context = constructContext(notes, { maxTokens, topK, includeMetadata: true });

    // 3. Prompt Engineering（プロンプト生成）
    const userPrompt = buildUserPrompt(question, context);

    // 4. LLM Invocation（LLM呼び出し）
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    // 5. Response Parsing（レスポンス解析）
    const answerData = JSON.parse(response.content[0].text);

    return {
      answer: answerData.answer,
      sources: answerData.sources.map((src: any) => ({
        ...src,
        note: notes.find(n => n.id === src.noteId),
      })),
      confidence: answerData.confidence,
      metadata: {
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        retrievedNotes: notes.length,
      },
    };
  }
}

export default RAGService;
```

---

## API設計

### 1. セマンティック検索API

**エンドポイント**: `POST /api/search/semantic`

詳細は「セマンティック検索設計」セクション参照。

### 2. ハイブリッド検索API

**エンドポイント**: `POST /api/search/hybrid`

**リクエスト**:
```typescript
{
  query: string;
  limit?: number;
  vectorWeight?: number;    // ベクトル検索の重み（0-1、デフォルト: 0.5）
  keywordWeight?: number;   // キーワード検索の重み（0-1、デフォルト: 0.5）
}
```

**レスポンス**:
```typescript
{
  success: true;
  count: number;
  data: Array<{
    id: string;
    title: string;
    content: string;
    score: number;
    matchType: 'vector' | 'keyword' | 'hybrid';
    tags: Tag[];
  }>;
}
```

### 3. RAG質問応答API

**エンドポイント**: `POST /api/ai/qa`

**リクエスト**:
```typescript
{
  question: string;         // 質問文
  conversationId?: string;  // 会話ID（フォローアップ質問用）
  options?: {
    topK?: number;          // 検索結果数（デフォルト: 5）
    stream?: boolean;       // ストリーミング応答（デフォルト: false）
  };
}
```

**レスポンス**:
```typescript
{
  success: true;
  data: {
    answer: string;         // 回答（Markdown）
    sources: Array<{
      noteId: string;
      noteTitle: string;
      relevance: 'high' | 'medium' | 'low';
      note: Note;           // ノート詳細
    }>;
    confidence: 'high' | 'medium' | 'low';
    metadata: {
      model: string;
      tokensUsed: number;
      retrievedNotes: number;
      responseTime: number;
    };
  };
}
```

### 4. 類似ノート提案API

**エンドポイント**: `GET /api/ai/similar/:noteId`

**パラメータ**:
- `noteId`: ノートID
- `limit`: 結果数（デフォルト: 5）

**レスポンス**:
```typescript
{
  success: true;
  data: Array<{
    id: string;
    title: string;
    score: number;          // 類似度スコア
    tags: Tag[];
    preview: string;        // コンテンツプレビュー（最初200文字）
  }>;
}
```

### 5. Q&A履歴API

**エンドポイント**: `GET /api/ai/qa/history`

**クエリパラメータ**:
- `limit`: 取得件数（デフォルト: 20）
- `offset`: オフセット（ページネーション）

**レスポンス**:
```typescript
{
  success: true;
  count: number;
  data: Array<{
    id: string;
    question: string;
    answer: string;
    sources: string[];      // ノートIDリスト
    createdAt: string;
  }>;
}
```

**データベーススキーマ**:
```prisma
model QAHistory {
  id        String   @id @default(uuid())
  question  String
  answer    String
  sources   String   // JSON配列（ノートID）
  model     String
  tokensUsed Int
  createdAt DateTime @default(now())

  @@index([createdAt])
  @@map("qa_history")
}
```

---

## パフォーマンス最適化

### 1. キャッシング戦略

| レイヤー | 対象 | 手法 | TTL |
|----------|------|------|-----|
| **埋め込み** | クエリベクトル | LRU (lru-cache) | 1時間 |
| **検索結果** | セマンティック検索 | Redis (オプション) | 15分 |
| **モデル** | Transformers.js | ディスクキャッシュ | 永続 |

**実装例**:
```typescript
import LRU from 'lru-cache';

const embeddingCache = new LRU<string, Float32Array>({
  max: 500,
  ttl: 1000 * 60 * 60, // 1時間
});

const searchCache = new LRU<string, SearchResult[]>({
  max: 100,
  ttl: 1000 * 60 * 15, // 15分
});
```

### 2. バッチ処理

**初期埋め込み生成**:
```typescript
async function generateAllEmbeddings() {
  const notes = await prisma.note.findMany({ select: { id: true, content: true } });
  const batchSize = 50;

  for (let i = 0; i < notes.length; i += batchSize) {
    const batch = notes.slice(i, i + batchSize);
    const embeddings = await embeddingService.embedBatch(
      batch.map(n => n.content)
    );

    await vectorSearchService.insertEmbeddings(
      batch.map((note, idx) => ({
        id: note.id,
        vector: embeddings[idx],
        modelVersion: embeddingService.getModelVersion(),
      }))
    );

    console.log(`Processed ${i + batch.length} / ${notes.length} notes`);
  }
}
```

### 3. 並列処理

**ハイブリッド検索の並列化**:
```typescript
const [vectorResults, keywordResults] = await Promise.all([
  vectorSearchService.search(query),
  keywordSearchService.search(query),
]);
```

### 4. タイムアウト設定

```typescript
const TIMEOUT_CONFIG = {
  embedding: 5000,      // 埋め込み生成: 5秒
  search: 3000,         // 検索: 3秒
  llm: 30000,           // LLM呼び出し: 30秒
};

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}
```

### 5. インデックス最適化

```sql
-- ベクトルインデックス
CREATE INDEX idx_note_embeddings_vec ON note_embeddings USING vec (embedding);

-- 複合インデックス
CREATE INDEX idx_notes_folder_updated ON Note(folderId, updatedAt DESC);
CREATE INDEX idx_notes_archived_pinned ON Note(isArchived, isPinned, updatedAt DESC);
```

**参考**: [RAG Performance Optimization](https://dev.to/jamesli/rag-performance-optimization-engineering-practice-implementation-guide-based-on-langchain-34ej)

---

## ハルシネーション対策

### 1. データ品質管理

**ノートの品質スコアリング**:
```typescript
function calculateNoteQuality(note: Note): number {
  let score = 0;

  // 長さチェック（短すぎる/長すぎるノートは低スコア）
  if (note.content.length > 100 && note.content.length < 10000) score += 0.3;

  // 構造チェック（見出し、リストがあると高スコア）
  if (note.content.includes('#')) score += 0.2;
  if (note.content.includes('-') || note.content.includes('*')) score += 0.1;

  // メタデータ充実度
  if (note.tags.length > 0) score += 0.2;
  if (note.folder) score += 0.1;

  // 更新頻度（最近更新されたノートは高スコア）
  const daysSinceUpdate = (Date.now() - new Date(note.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 30) score += 0.1;

  return Math.min(score, 1.0);
}
```

### 2. 検索精度向上

**メタデータフィルタの活用**:
```typescript
// 日付範囲でフィルタ（古すぎる情報を除外）
const recentNotes = notes.filter(n => {
  const monthsSinceCreation =
    (Date.now() - new Date(n.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsSinceCreation < 12; // 過去1年以内
});
```

### 3. 不確実性モデリング

**信頼度スコアの計算**:
```typescript
function calculateConfidence(
  retrievedNotes: Note[],
  topScore: number
): 'high' | 'medium' | 'low' {
  const avgQuality = retrievedNotes.reduce((sum, n) =>
    sum + calculateNoteQuality(n), 0
  ) / retrievedNotes.length;

  if (topScore > 0.85 && avgQuality > 0.7) return 'high';
  if (topScore > 0.7 && avgQuality > 0.5) return 'medium';
  return 'low';
}
```

**プロンプトへの組み込み**:
```typescript
const SYSTEM_PROMPT_WITH_UNCERTAINTY = `
...（既存のシステムプロンプト）

重要な指示:
- コンテキストに十分な情報がない場合は「提供された情報では回答できません」と正直に答える
- 推測が必要な場合は「推測ですが...」と明記する
- 複数の解釈が可能な場合は選択肢を提示する
`;
```

### 4. 引用の強制

**参照元の明示**:
```typescript
// プロンプトに引用を強制
const USER_PROMPT_TEMPLATE = `
...

回答の際は、必ず以下の形式で引用元を明記してください:
- 「[ノート名](noteId)によると...」
- 複数のソースがある場合はすべて列挙してください
`;
```

### 5. 検証メカニズム

**回答検証フロー**:
```typescript
async function validateAnswer(
  answer: string,
  sources: Note[],
  question: string
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // 引用チェック
  if (!answer.includes('によると') && !answer.includes('参照')) {
    issues.push('引用元が明記されていません');
  }

  // ソースとの整合性チェック（簡易版）
  const answerWords = new Set(answer.toLowerCase().split(/\s+/));
  const sourceWords = new Set(
    sources.flatMap(s => s.content.toLowerCase().split(/\s+/))
  );
  const commonWords = [...answerWords].filter(w => sourceWords.has(w));

  if (commonWords.length < answerWords.size * 0.3) {
    issues.push('回答がソースと乖離している可能性があります');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
```

**参考**: [RAG Hallucination Prevention](https://machinelearningmastery.com/understanding-rag-part-viii-mitigating-hallucinations-in-rag/), [Hallucination Mitigation Review](https://www.mdpi.com/2227-7390/13/5/856)

---

## 実装ロードマップ

### Phase 4.1: セマンティック検索（2週間）

**Week 1**:
- [ ] sqlite-vec インストール・設定
- [ ] Transformers.js 統合
- [ ] EmbeddingService 実装
- [ ] VectorSearchService 実装
- [ ] note_embeddings テーブル作成

**Week 2**:
- [ ] セマンティック検索API実装
- [ ] バッチ埋め込み生成スクリプト
- [ ] フロントエンド UI（検索ボックス拡張）
- [ ] テスト・デバッグ

**成果物**:
- `/api/search/semantic` エンドポイント
- 全ノートの埋め込みDB
- セマンティック検索UI

### Phase 4.2: ハイブリッド検索（1週間）

- [ ] FTS5 インデックス作成（既存キーワード検索の拡張）
- [ ] HybridSearchService 実装（RRF）
- [ ] `/api/search/hybrid` エンドポイント
- [ ] UI拡張（検索モード切り替え）
- [ ] パフォーマンステスト

**成果物**:
- ハイブリッド検索機能
- 検索精度の比較レポート

### Phase 4.3: RAG基盤（1週間）

- [ ] Anthropic/OpenAI SDKセットアップ
- [ ] RAGService 実装
- [ ] プロンプトテンプレート作成
- [ ] コンテキスト構築ロジック
- [ ] エラーハンドリング

**成果物**:
- RAGサービスの基盤
- プロンプトテンプレート集

### Phase 4.4: RAG質問応答UI（1週間）

- [ ] Q&Aインターフェース作成
- [ ] ストリーミングレスポンス対応
- [ ] ソース表示機能
- [ ] Q&A履歴機能
- [ ] UIテスト

**成果物**:
- Q&A機能の完成
- ユーザーテストフィードバック

### Phase 4.5: 最適化・改善（継続的）

- [ ] キャッシング導入
- [ ] リランキング実装（オプション）
- [ ] ハルシネーション検証強化
- [ ] パフォーマンスチューニング
- [ ] ユーザーフィードバック反映

---

## 参考資料

### RAG実装

- [LangChain RAG Tutorial](https://js.langchain.com/docs/tutorials/rag/)
- [RAG Best Practices 2025](https://orkes.io/blog/rag-best-practices/)
- [Custom RAG vs LangChain Discussion](https://community.latenode.com/t/benefits-of-using-langchain-vs-building-custom-rag-implementation-from-scratch/39073)

### ハイブリッド検索

- [Azure AI Hybrid Search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [Machine Learning Plus: Hybrid Search](https://www.machinelearningplus.com/gen-ai/hybrid-search-vector-keyword-techniques-for-better-rag/)
- [OpenSearch RRF](https://opensearch.org/blog/introducing-reciprocal-rank-fusion-hybrid-search/)

### リランキング

- [ZeroEntropy Reranking Guide](https://www.zeroentropy.dev/articles/ultimate-guide-to-choosing-the-best-reranking-model-in-2025)
- [Pinecone Rerankers](https://www.pinecone.io/learn/series/rag/rerankers/)

### ハルシネーション対策

- [RAG Hallucination Mitigation](https://machinelearningmastery.com/understanding-rag-part-viii-mitigating-hallucinations-in-rag/)
- [MDPI: Hallucination Review](https://www.mdpi.com/2227-7390/13/5/856)
- [Mindee: RAG Hallucinations Explained](https://www.mindee.com/blog/rag-hallucinations-explained)

### プロンプトエンジニアリング

- [Prompt Engineering Guide](https://www.promptingguide.ai/research/rag)
- [Lakera: Prompt Engineering Guide 2025](https://www.lakera.ai/blog/prompt-engineering-guide)
- [Context Engineering](https://www.analyticsvidhya.com/blog/2025/07/context-engineering/)

### 技術ライブラリ

- [Transformers.js](https://huggingface.co/docs/transformers.js/en/index)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)
- [Anthropic SDK](https://docs.anthropic.com/en/api/client-sdks)

---

## アーキテクチャ図

### システム全体図

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Search Panel    │  │ Q&A Panel       │  │ Similar Notes   │ │
│  │ - Semantic      │  │ - Question Input│  │ - Auto Suggest  │ │
│  │ - Hybrid        │  │ - Answer Display│  │ - Manual Trigger│ │
│  │ - Keyword       │  │ - Source Links  │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express)                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      API Routes                              ││
│  │  /api/search/semantic  /api/search/hybrid                   ││
│  │  /api/ai/qa  /api/ai/similar/:id                            ││
│  └─────────────────────────┬───────────────────────────────────┘│
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │               Core Services Layer                            ││
│  │                                                               ││
│  │  ┌──────────────────┐  ┌──────────────────┐                ││
│  │  │ EmbeddingService │  │ RAGService       │                ││
│  │  │ - Transformers.js│  │ - Retrieval      │                ││
│  │  │ - Model: MiniLM  │  │ - Context Build  │                ││
│  │  │ - Cache (LRU)    │  │ - LLM Invoke     │                ││
│  │  └──────────────────┘  └──────────────────┘                ││
│  │                                                               ││
│  │  ┌──────────────────┐  ┌──────────────────┐                ││
│  │  │ VectorSearch     │  │ HybridSearch     │                ││
│  │  │ - sqlite-vec     │  │ - RRF Algorithm  │                ││
│  │  │ - Cosine Sim     │  │ - Score Fusion   │                ││
│  │  └──────────────────┘  └──────────────────┘                ││
│  └─────────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (SQLite)                           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Note         │  │ FTS5 Index   │  │ note_embeddings      │  │
│  │ - id         │  │ (title,      │  │ - id (FK)            │  │
│  │ - title      │  │  content)    │  │ - embedding (BLOB)   │  │
│  │ - content    │  │              │  │ - model_version      │  │
│  │ - metadata   │  │              │  │   [vec index]        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ QAHistory    │  │ Tag, Folder  │                             │
│  │ - question   │  │ (Existing)   │                             │
│  │ - answer     │  │              │                             │
│  │ - sources    │  │              │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘

External Services (Optional):
┌─────────────────────────────────────────┐
│ LLM APIs (User Opt-in)                  │
│ - Anthropic Claude                      │
│ - OpenAI GPT-4                          │
└─────────────────────────────────────────┘
```

### RAGフロー詳細図

```
User Question: "先月のプロジェクトAの進捗は？"
    │
    ▼
┌───────────────────────────────────────────────────────────┐
│ Step 1: Query Embedding                                    │
│ Transformers.js: "先月のプロジェクトAの進捗は？"           │
│ → [0.123, -0.456, 0.789, ..., 0.234] (384次元)           │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│ Step 2: Hybrid Retrieval (Parallel)                       │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────┐     │
│  │ Vector Search       │    │ Keyword Search       │     │
│  │ - sqlite-vec K-NN   │    │ - FTS5 MATCH         │     │
│  │ - Top 10 results    │    │ - Top 10 results     │     │
│  └─────────────────────┘    └──────────────────────┘     │
│           │                           │                    │
│           └───────────┬───────────────┘                    │
│                       ▼                                     │
│           ┌───────────────────────┐                        │
│           │ RRF Score Fusion      │                        │
│           │ score = Σ 1/(60+rank) │                        │
│           └───────────────────────┘                        │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
Retrieved Notes (Top 5):
  1. "プロジェクトA進捗報告 11月" (score: 0.92)
  2. "週次レビュー 2025-11" (score: 0.87)
  3. "プロジェクトA課題リスト" (score: 0.78)
  ...
    │
    ▼
┌───────────────────────────────────────────────────────────┐
│ Step 3: Context Construction                               │
│                                                             │
│ # プロジェクトA進捗報告 11月                                │
│ - タスクA: 完了（11/15）                                   │
│ - タスクB: 進行中（80%）                                   │
│ ...                                                         │
│ ---                                                         │
│ # 週次レビュー 2025-11                                      │
│ プロジェクトAは順調。残課題2件。                            │
│ ...                                                         │
│                                                             │
│ [Token Count: 1,245 / 4,000]                               │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│ Step 4: Prompt Construction                                │
│                                                             │
│ System: あなたは個人ナレッジベースのアシスタントです...    │
│                                                             │
│ User:                                                       │
│ ## コンテキスト                                             │
│ [上記の検索結果]                                            │
│                                                             │
│ ## 質問                                                     │
│ 先月のプロジェクトAの進捗は？                               │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│ Step 5: LLM Invocation                                     │
│ Anthropic Claude 3.5 Sonnet                                │
│ (or OpenAI GPT-4)                                          │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│ Step 6: Response Parsing                                   │
│                                                             │
│ {                                                           │
│   "answer": "プロジェクトAは先月順調に進捗しました...",    │
│   "sources": [                                              │
│     { "noteId": "uuid1", "noteTitle": "進捗報告 11月",     │
│       "relevance": "high" },                                │
│     ...                                                     │
│   ],                                                        │
│   "confidence": "high"                                      │
│ }                                                           │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
                  Final Answer
                  to Frontend
```

---

## まとめ

本設計書では、Phase 4（セマンティック検索・RAG）の実装に必要な全要素を網羅しました。

### 重要なポイント

1. **技術選定**: Transformers.js + sqlite-vec によるローカルファースト実装
2. **段階的実装**: セマンティック検索 → ハイブリッド検索 → RAG の順に段階的に実装
3. **ハルシネーション対策**: データ品質管理、引用強制、検証メカニズム
4. **パフォーマンス**: キャッシング、バッチ処理、並列化
5. **プライバシー**: 埋め込み生成はローカル、LLM呼び出しはオプトイン

### 次のステップ

1. SubAgent 1, 3, 4 の設計書と統合
2. 実装優先度の決定
3. Phase 4.1（セマンティック検索）の実装開始

---

**設計完了日**: 2025-12-14
**次回レビュー**: Phase 4.1 実装完了後
