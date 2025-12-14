# Phase 4: ベクトル検索・セマンティック検索 技術設計書

**作成日**: 2025-12-14
**対象フェーズ**: Phase 4 - AI連携
**ステータス**: 設計完了・実装待ち

---

## 目次

1. [エグゼクティブサマリー](#エグゼクティブサマリー)
2. [技術選定](#技術選定)
3. [アーキテクチャ設計](#アーキテクチャ設計)
4. [データベーススキーマ設計](#データベーススキーマ設計)
5. [埋め込み生成パイプライン](#埋め込み生成パイプライン)
6. [API設計](#api設計)
7. [実装ロードマップ](#実装ロードマップ)
8. [パフォーマンス考慮事項](#パフォーマンス考慮事項)
9. [セキュリティとプライバシー](#セキュリティとプライバシー)
10. [参考資料](#参考資料)

---

## エグゼクティブサマリー

### 目的

Personal Knowledge Base システムにベクトル検索・セマンティック検索機能を追加し、キーワードベースの検索では発見できなかった関連ノートを意味的に検索可能にする。

### 技術スタック決定

| コンポーネント | 選定技術 | 理由 |
|--------------|---------|------|
| **ベクトルDB** | **LanceDB** | TypeScript完全サポート、ローカルファースト、SQLiteと併用可能 |
| **埋め込みモデル** | **Ollama + nomic-embed-text v1.5** | ローカル実行、768次元（柔軟に64-768調整可）、プライバシー保護 |
| **メタデータDB** | **SQLite (Prisma)** | 既存システムとの統合、埋め込み管理情報を保存 |

### 主要機能

1. **ベクトル埋め込み生成**: ノート作成・更新時にバックグラウンドで自動生成
2. **セマンティック検索**: 自然言語クエリから意味的に類似したノートを検索
3. **類似ノート提案**: 閲覧中ノートに関連するノートを自動提案
4. **増分更新**: 新規・更新ノートのみを効率的に埋め込み生成

---

## 技術選定

### 1. ベクトルデータベース: LanceDB

#### 選定理由

**LanceDB**を選定した理由:

1. **TypeScript/Node.js ネイティブサポート**
   - `@lancedb/lancedb` npm パッケージで簡単にインストール
   - 型安全な実装が可能
   - 外部サーバー不要のembedded architecture

2. **ローカルファースト設計**
   - ディスク上にローカル保存
   - プライバシー重視（データが外部送信されない）
   - オフライン動作可能

3. **高パフォーマンス**
   - 25ms以下のベクトル検索レイテンシ
   - メタデータフィルタリング込みでも50ms
   - 数千QPS対応可能

4. **SQLiteとの共存**
   - 既存SQLiteデータベースと並行利用
   - Apache Arrow形式でパフォーマンス最適化
   - DuckDB統合によるSQL分析も可能

5. **スケーラビリティ**
   - ラップトップ上で数億ベクトルに対応
   - 段階的な成長に対応

#### sqlite-vss との比較

| 項目 | LanceDB | sqlite-vss |
|------|---------|-----------|
| TypeScript対応 | ネイティブ | Faiss C++ラッパー経由 |
| スケール | 数億ベクトル | 中規模まで |
| 保守性 | 活発な開発 | 個人プロジェクト |
| 複雑さ | 独立DB | SQLite拡張（依存管理複雑） |
| 将来性 | マルチモーダルAI対応 | ベクトル検索のみ |

**結論**: LanceDBはTypeScript統合が優れており、将来の拡張性も高いため採用。

---

### 2. 埋め込みモデル: Ollama + nomic-embed-text v1.5

#### 選定理由

1. **完全ローカル実行**
   - プライバシー重視（個人メモは機密情報含む）
   - API料金不要
   - オフライン動作

2. **優れた性能**
   - OpenAI text-embedding-ada-002を上回る性能
   - 8192トークンの長いコンテキスト対応
   - 多言語対応（日本語含む）

3. **柔軟な次元数**
   - Matryoshka Representation Learning採用
   - 64 〜 768次元を用途に応じて選択可能
   - 推奨: **384次元**（速度とパフォーマンスのバランス）

4. **TypeScript統合が容易**
   - Ollama公式JavaScriptライブラリ
   - 簡単なAPIコール: `ollama.embeddings()`

#### モデル仕様

| 項目 | 仕様 |
|------|------|
| モデル名 | nomic-embed-text v1.5 |
| パラメータ数 | 137M |
| 埋め込み次元 | 64 〜 768（可変） |
| コンテキスト長 | 8192 トークン |
| 言語対応 | 多言語（日本語含む） |
| API | Ollama REST API (localhost:11434) |

#### 次元数選定

| 次元 | 用途 | 特性 |
|------|------|------|
| 64-128 | 軽量・高速検索 | ストレージ少、精度やや劣る |
| **384** | **推奨（バランス型）** | **速度と精度の最適バランス** |
| 768 | 最高精度 | ストレージ大、計算コスト高 |

**結論**: 個人用途では384次元で十分な精度を確保しつつ高速動作を実現。

---

### 3. 代替案との比較

#### OpenAI Embeddings API（クラウド）

| 項目 | OpenAI API | Ollama (ローカル) |
|------|-----------|-------------------|
| プライバシー | データ送信あり | 完全ローカル |
| コスト | 従量課金 | 無料（電力のみ） |
| 性能 | 非常に高い | 十分高い |
| オフライン | 不可 | 可能 |
| レイテンシ | ネットワーク依存 | 低レイテンシ |

**結論**: プライバシーとコストの観点からOllamaを優先。将来的にオプションとしてOpenAI APIも追加可能。

---

## アーキテクチャ設計

### システム全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  - セマンティック検索UI                                       │
│  - 類似ノート表示コンポーネント                                │
│  - 埋め込み生成状況表示                                       │
└────────────────────┬────────────────────────────────────────┘
                     │ API Calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend (Express + TypeScript)               │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                  │
│  ├─ POST /api/embeddings/generate                          │
│  ├─ POST /api/search/semantic                              │
│  ├─ GET  /api/notes/:id/similar                            │
│  └─ GET  /api/embeddings/status                            │
│                                                             │
│  Service Layer                                              │
│  ├─ EmbeddingService                                        │
│  │   ├─ generateEmbedding(noteId)                          │
│  │   ├─ batchGenerateEmbeddings(noteIds[])                 │
│  │   └─ syncEmbeddings()                                   │
│  ├─ SemanticSearchService                                   │
│  │   ├─ searchByQuery(query)                               │
│  │   └─ findSimilarNotes(noteId)                           │
│  └─ OllamaClient                                            │
│      └─ embedText(text, dimensions)                        │
└────────┬───────────────────────────┬────────────────────────┘
         │                           │
         ▼                           ▼
┌──────────────────┐      ┌──────────────────────────────────┐
│  SQLite (Prisma) │      │       LanceDB (Vector DB)        │
├──────────────────┤      ├──────────────────────────────────┤
│ - Note           │      │ - noteId: string                 │
│ - NoteEmbedding  │◄────►│ - vector: float32[384]           │
│   ├─ noteId      │      │ - title: string                  │
│   ├─ model       │      │ - content_preview: string        │
│   ├─ dimensions  │      │ - updatedAt: timestamp           │
│   ├─ status      │      │ - tags: string[]                 │
│   └─ updatedAt   │      └──────────────────────────────────┘
└──────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│      Ollama (localhost:11434)    │
├──────────────────────────────────┤
│  Model: nomic-embed-text v1.5    │
│  Dimensions: 384                 │
│  Context: 8192 tokens            │
└──────────────────────────────────┘
```

### データフロー

#### 1. 埋め込み生成フロー

```
ノート作成/更新
    ↓
バックグラウンドジョブキュー追加
    ↓
EmbeddingService.generateEmbedding(noteId)
    ↓
1. Prismaからノート取得
2. テキスト前処理（タイトル + コンテンツ）
3. OllamaClient.embedText() ← Ollama API呼び出し
4. LanceDBにベクトル保存
5. Prisma NoteEmbeddingにメタデータ保存
    ↓
完了（status: 'completed'）
```

#### 2. セマンティック検索フロー

```
ユーザークエリ入力
    ↓
POST /api/search/semantic?q="機械学習の基礎"
    ↓
SemanticSearchService.searchByQuery(query)
    ↓
1. OllamaClient.embedText(query) ← クエリをベクトル化
2. LanceDB.search(queryVector, limit=10) ← ベクトル検索
3. メタデータフィルタ適用（タグ、日付など）
4. Prismaから完全なノート情報取得
    ↓
結果をスコア付きで返却
```

#### 3. 類似ノート提案フロー

```
ノート表示
    ↓
GET /api/notes/:id/similar
    ↓
SemanticSearchService.findSimilarNotes(noteId)
    ↓
1. LanceDBから対象ノートのベクトル取得
2. LanceDB.search(noteVector, limit=5) ← 近傍検索
3. 自分自身を除外
4. Prismaから詳細情報取得
    ↓
類似ノート一覧を返却
```

---

## データベーススキーマ設計

### 1. Prisma スキーマ拡張

#### NoteEmbedding モデル追加

```prisma
// Phase 4: ベクトル埋め込み管理
model NoteEmbedding {
  id         String   @id @default(uuid())
  noteId     String   @unique
  model      String   // 使用した埋め込みモデル名（例: "nomic-embed-text-v1.5"）
  dimensions Int      // ベクトル次元数（例: 384）
  status     String   @default("pending") // pending, processing, completed, failed
  errorMsg   String?  // エラーメッセージ（失敗時）
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // リレーション
  note       Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([updatedAt])
}

// Note モデルに追加
model Note {
  // 既存フィールド...

  // Phase 4: 埋め込み情報
  embedding  NoteEmbedding?
}
```

#### フィールド説明

| フィールド | 型 | 説明 |
|-----------|---|------|
| `noteId` | String | 対象ノートのID（ユニーク制約） |
| `model` | String | 埋め込みモデル名（将来的なモデル変更に対応） |
| `dimensions` | Int | ベクトル次元数（384推奨） |
| `status` | String | 生成ステータス（pending/processing/completed/failed） |
| `errorMsg` | String? | エラー発生時のメッセージ |
| `updatedAt` | DateTime | 最終更新日時（ノート更新時の再生成判定に使用） |

### 2. LanceDB テーブルスキーマ

```typescript
interface NoteVectorRecord {
  noteId: string;           // 主キー（Prisma Noteと連携）
  vector: number[];         // 埋め込みベクトル（384次元 float32配列）
  title: string;            // ノートタイトル（検索結果表示用）
  contentPreview: string;   // コンテンツプレビュー（先頭200文字）
  updatedAt: Date;          // 更新日時
  tags: string[];           // タグ配列（フィルタリング用）
  folderId: string | null;  // フォルダID（フィルタリング用）
}
```

#### LanceDB テーブル作成

```typescript
import * as lancedb from '@lancedb/lancedb';

const db = await lancedb.connect('data/lancedb');

const table = await db.createTable('note_embeddings', [
  {
    noteId: 'sample-uuid',
    vector: new Array(384).fill(0),
    title: 'サンプルノート',
    contentPreview: 'これはサンプルです...',
    updatedAt: new Date(),
    tags: ['sample', 'test'],
    folderId: null,
  }
]);
```

### 3. データ整合性戦略

| 操作 | Prisma (SQLite) | LanceDB |
|------|----------------|---------|
| ノート作成 | Note作成 → NoteEmbeddingレコード作成（status: pending） | バックグラウンドで追加 |
| ノート更新 | Note更新 → NoteEmbedding.statusを'pending'に戻す | バックグラウンドで更新 |
| ノート削除 | Note削除（Cascade） | バックグラウンドで削除 |

**同期チェック機能**:
- 定期的にPrismaとLanceDBの整合性チェック
- 欠損レコードの自動修復
- `GET /api/embeddings/status` で状況確認可能

---

## 埋め込み生成パイプライン

### 1. パイプライン設計

#### アーキテクチャ

```
┌─────────────────────────────────────────────┐
│         Embedding Generation Queue          │
├─────────────────────────────────────────────┤
│  - In-Memory Queue (シンプル実装)            │
│  - 将来拡張: BullMQ / Redis Queue            │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│       Embedding Worker (Background)         │
├─────────────────────────────────────────────┤
│  1. Queueからタスク取得                      │
│  2. Prismaからノート取得                     │
│  3. テキスト前処理                           │
│     - HTMLタグ除去                           │
│     - 改行・空白正規化                        │
│     - 長文の場合は分割（8192トークン制限）     │
│  4. Ollama API呼び出し                       │
│     - リトライロジック（3回、指数バックオフ）   │
│     - タイムアウト設定（30秒）                │
│  5. LanceDBに保存                            │
│  6. Prisma NoteEmbedding更新（completed）   │
│  7. エラー時はstatus=failed, errorMsg保存   │
└─────────────────────────────────────────────┘
```

### 2. バッチ処理戦略

#### 推奨バッチサイズ

| ノート数 | バッチサイズ | 理由 |
|---------|------------|------|
| < 100 | 10件/バッチ | 順次処理でOK |
| 100-1000 | 50件/バッチ | 中規模効率化 |
| > 1000 | 100件/バッチ | 大規模一括処理 |

#### LanceDB挿入最適化

- **推奨バッチサイズ**: 500件（LanceDBベストプラクティス）
- **並列制限**: 同時処理は5並列まで（Ollamaの負荷分散）
- **チャンク戦略**: 1000件以上は500件ずつに分割

### 3. エラーハンドリングとリトライ

#### リトライ戦略

```typescript
async function generateEmbeddingWithRetry(
  noteId: string,
  maxRetries = 3
): Promise<void> {
  let attempt = 0;
  const backoffMs = [1000, 2000, 4000]; // 指数バックオフ

  while (attempt < maxRetries) {
    try {
      await generateEmbedding(noteId);
      return; // 成功
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        // 最終失敗 → status=failed
        await prisma.noteEmbedding.update({
          where: { noteId },
          data: {
            status: 'failed',
            errorMsg: error.message,
          },
        });
        throw error;
      }
      // リトライ前の待機
      await sleep(backoffMs[attempt - 1]);
    }
  }
}
```

#### エラー種別と対応

| エラー種別 | 対応策 |
|-----------|--------|
| **ネットワークエラー** | 3回リトライ（指数バックオフ） |
| **Ollamaタイムアウト** | タイムアウト延長（30秒→60秒） |
| **レート制限** | 429エラー時は30秒待機 |
| **テキスト長超過** | 8192トークンで分割処理 |
| **メモリ不足** | バッチサイズを50%削減 |

### 4. 増分更新戦略

#### 更新トリガー

```typescript
// ノート更新時のフック
router.put('/:id', async (req, res) => {
  // ノート更新
  const updatedNote = await prisma.note.update({
    where: { id },
    data: { content: newContent },
  });

  // 埋め込みステータスを'pending'にリセット
  await prisma.noteEmbedding.upsert({
    where: { noteId: id },
    update: { status: 'pending' },
    create: {
      noteId: id,
      model: 'nomic-embed-text-v1.5',
      dimensions: 384,
      status: 'pending',
    },
  });

  // バックグラウンドジョブキューに追加
  embeddingQueue.add({ noteId: id });

  res.json({ success: true, data: updatedNote });
});
```

#### 増分同期ジョブ

```typescript
// 定期実行（例: 5分ごと）
async function syncPendingEmbeddings() {
  const pendingNotes = await prisma.noteEmbedding.findMany({
    where: { status: 'pending' },
    orderBy: { updatedAt: 'asc' },
    take: 100, // 一度に最大100件
  });

  for (const embedding of pendingNotes) {
    await embeddingQueue.add({ noteId: embedding.noteId });
  }
}
```

### 5. パフォーマンス最適化

#### テキスト前処理の最適化

```typescript
function preprocessText(title: string, content: string): string {
  // 1. HTMLタグ除去（TipTapのHTML出力対応）
  const textContent = content.replace(/<[^>]*>/g, ' ');

  // 2. 改行・空白の正規化
  const normalized = textContent.replace(/\s+/g, ' ').trim();

  // 3. タイトルとコンテンツの結合（タイトル重み付け）
  const combined = `${title} ${title} ${normalized}`;

  // 4. 長文の場合は先頭を優先（8192トークン ≈ 32,000文字）
  return combined.slice(0, 32000);
}
```

#### キャッシュ戦略

- **LanceDBの自動キャッシュ**: 15分間のセルフクリーニングキャッシュ（2025年新機能）
- **Prismaクエリキャッシュ**: 頻繁に使用されるノートメタデータ

---

## API設計

### 1. エンドポイント一覧

#### 埋め込み管理API

##### `POST /api/embeddings/generate`

**説明**: 指定ノートの埋め込みを生成（手動トリガー）

**リクエスト**:
```json
{
  "noteId": "uuid-string",
  "force": false  // 既存埋め込みを上書きするか
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "Embedding generation started",
  "data": {
    "noteId": "uuid-string",
    "status": "processing"
  }
}
```

##### `POST /api/embeddings/batch-generate`

**説明**: 複数ノートの一括埋め込み生成

**リクエスト**:
```json
{
  "noteIds": ["uuid-1", "uuid-2", "uuid-3"],
  "force": false
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "Batch generation started",
  "data": {
    "queued": 3,
    "estimated_time_minutes": 2
  }
}
```

##### `GET /api/embeddings/status`

**説明**: 埋め込み生成の進捗状況を取得

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "total_notes": 500,
    "completed": 450,
    "pending": 30,
    "processing": 5,
    "failed": 15,
    "progress_percentage": 90
  }
}
```

---

#### セマンティック検索API

##### `POST /api/search/semantic`

**説明**: 自然言語クエリでセマンティック検索

**リクエスト**:
```json
{
  "query": "機械学習の基礎について",
  "limit": 10,
  "filters": {
    "tags": ["tech", "ai"],
    "folderId": "folder-uuid",
    "fromDate": "2024-01-01",
    "toDate": "2024-12-31"
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "query": "機械学習の基礎について",
  "count": 10,
  "data": [
    {
      "noteId": "uuid-1",
      "title": "機械学習入門",
      "contentPreview": "機械学習とは...",
      "similarity_score": 0.89,
      "tags": ["tech", "ai"],
      "createdAt": "2024-06-15T10:00:00Z"
    }
  ]
}
```

##### `GET /api/notes/:id/similar`

**説明**: 指定ノートに類似したノートを検索

**パラメータ**:
- `id` (path): ノートID
- `limit` (query): 取得件数（デフォルト: 5）

**レスポンス**:
```json
{
  "success": true,
  "noteId": "uuid-1",
  "count": 5,
  "data": [
    {
      "noteId": "uuid-2",
      "title": "関連するノート",
      "similarity_score": 0.85,
      "tags": ["tech"]
    }
  ]
}
```

---

### 2. エラーレスポンス

**標準エラー形式**:

```json
{
  "success": false,
  "error": "Embedding generation failed",
  "message": "Ollama API timeout",
  "details": {
    "noteId": "uuid-1",
    "retries": 3,
    "last_error": "Connection timeout after 30s"
  }
}
```

**HTTPステータスコード**:

| コード | 意味 | 例 |
|-------|------|---|
| 200 | 成功 | 検索結果取得成功 |
| 201 | 作成成功 | 埋め込み生成ジョブ作成 |
| 400 | リクエストエラー | 不正なnoteId |
| 404 | リソース未発見 | ノートが存在しない |
| 429 | レート制限 | Ollama API制限 |
| 500 | サーバーエラー | 内部エラー |
| 503 | サービス利用不可 | Ollama停止中 |

---

## 実装ロードマップ

### フェーズ1: 基盤構築（Week 1-2）

**タスク**:

1. **依存パッケージインストール**
   ```bash
   npm install @lancedb/lancedb ollama
   npm install -D @types/node
   ```

2. **Prisma スキーマ拡張**
   - `NoteEmbedding` モデル追加
   - マイグレーション実行

3. **LanceDB セットアップ**
   - データディレクトリ作成 (`data/lancedb`)
   - 初期化スクリプト作成

4. **Ollama セットアップ**
   ```bash
   # Ollamaインストール（ローカル環境）
   ollama pull nomic-embed-text
   ```

5. **OllamaClient サービス実装**
   - `src/backend/services/ollamaClient.ts`
   - エラーハンドリング・リトライロジック

**完了条件**:
- Ollamaから384次元ベクトルを取得できる
- LanceDBへの書き込み・読み取りができる

---

### フェーズ2: 埋め込み生成パイプライン（Week 3-4）

**タスク**:

1. **EmbeddingService 実装**
   - `src/backend/services/embeddingService.ts`
   - `generateEmbedding(noteId)`
   - `batchGenerateEmbeddings(noteIds[])`

2. **バックグラウンドジョブキュー**
   - シンプルなIn-Memoryキュー実装
   - （将来拡張: BullMQ導入）

3. **ノート更新フック**
   - `PUT /api/notes/:id` に埋め込み再生成ロジック追加

4. **埋め込み管理API**
   - `POST /api/embeddings/generate`
   - `POST /api/embeddings/batch-generate`
   - `GET /api/embeddings/status`

**完了条件**:
- ノート作成/更新時に自動で埋め込み生成
- ステータス確認APIで進捗確認可能

---

### フェーズ3: セマンティック検索（Week 5-6）

**タスク**:

1. **SemanticSearchService 実装**
   - `src/backend/services/semanticSearchService.ts`
   - `searchByQuery(query, filters)`
   - `findSimilarNotes(noteId, limit)`

2. **検索API実装**
   - `POST /api/search/semantic`
   - `GET /api/notes/:id/similar`

3. **メタデータフィルタリング**
   - タグ、フォルダ、日付範囲でのフィルタ
   - LanceDBのSQLライクフィルタ活用

**完了条件**:
- 自然言語クエリで意味的に類似したノートを検索できる
- 既存の検索機能と統合される

---

### フェーズ4: フロントエンド統合（Week 7-8）

**タスク**:

1. **セマンティック検索UI**
   - 検索バーに「セマンティック検索」トグル追加
   - 結果表示に類似度スコア表示

2. **類似ノート表示コンポーネント**
   - ノート詳細画面にサイドバー追加
   - 関連ノート5件をリアルタイム表示

3. **埋め込み生成状況UI**
   - 設定画面に進捗バー表示
   - 手動一括生成ボタン

4. **パフォーマンス最適化**
   - 検索結果のページネーション
   - 遅延ロード・キャッシュ

**完了条件**:
- UIからセマンティック検索を実行できる
- 類似ノートが自動表示される

---

### フェーズ5: テストと最適化（Week 9-10）

**タスク**:

1. **ユニットテスト**
   - `embeddingService.test.ts`
   - `semanticSearchService.test.ts`
   - `ollamaClient.test.ts`

2. **統合テスト**
   - E2Eテスト（セマンティック検索フロー）
   - パフォーマンステスト（1000件のノートで検索速度計測）

3. **パフォーマンスチューニング**
   - インデックス最適化
   - バッチサイズ調整

4. **ドキュメント作成**
   - ユーザーガイド
   - API仕様書

**完了条件**:
- テストカバレッジ80%以上
- 1000件のノートで平均検索時間 < 100ms

---

## パフォーマンス考慮事項

### 1. 検索パフォーマンス

#### 目標レイテンシ

| 操作 | 目標レイテンシ | 備考 |
|------|--------------|------|
| セマンティック検索 | < 100ms | ベクトル検索 + メタデータ取得 |
| 類似ノート検索 | < 50ms | 単純な近傍検索 |
| 埋め込み生成 | < 2秒/ノート | Ollama API呼び出し |

#### 最適化手法

1. **LanceDBインデックス**
   - IVF (Inverted File Index) 使用
   - 1万件以上で自動インデックス作成

2. **クエリベクトルキャッシュ**
   - 頻繁なクエリは15分間キャッシュ

3. **並列処理**
   - メタデータ取得とベクトル検索を並列実行

### 2. ストレージ効率

#### ストレージ見積もり

| ノート数 | ベクトルサイズ | メタデータ | 合計 |
|---------|--------------|-----------|------|
| 1,000 | 1.5 MB | 0.5 MB | 2 MB |
| 10,000 | 15 MB | 5 MB | 20 MB |
| 100,000 | 150 MB | 50 MB | 200 MB |

**計算式**:
- ベクトルサイズ = ノート数 × 384次元 × 4バイト(float32)
- メタデータサイズ ≈ ノート数 × 500バイト

**結論**: 個人用途では10万ノートでも200MB程度で軽量。

### 3. スケーラビリティ

#### ボトルネック分析

| 項目 | ボトルネック | 対策 |
|------|------------|------|
| 埋め込み生成 | Ollama処理速度 | バッチ処理、並列化 |
| ベクトル検索 | メモリ不足 | ディスク上のLanceDB使用 |
| メタデータ取得 | Prismaクエリ | インデックス、キャッシュ |

#### スケール戦略

- **10万ノートまで**: 現行設計で問題なし
- **10万～100万ノート**: LanceDB Cloud移行検討
- **100万ノート以上**: 分散ベクトルDB検討（Qdrant等）

---

## セキュリティとプライバシー

### 1. プライバシー保護

#### ローカルファースト設計

- **埋め込み生成**: 完全ローカル（Ollama）
- **ベクトル検索**: ローカルディスク（LanceDB）
- **外部通信**: なし

#### データ保持ポリシー

- ベクトルデータは削除されたノートと同時に削除
- ユーザーの明示的な同意なしに外部送信しない

### 2. 将来のクラウド対応

#### オプトイン設計

```typescript
// 設定例
interface EmbeddingConfig {
  provider: 'ollama' | 'openai';  // デフォルト: ollama
  apiKey?: string;                 // OpenAI使用時のみ
  warnOnCloudUsage: boolean;       // デフォルト: true
}
```

#### データ送信時の警告

```
⚠️ 警告: OpenAI Embeddings APIを使用する場合、
ノートの内容がOpenAIのサーバーに送信されます。
機密情報を含むノートには使用しないでください。

[ ] この警告を今後表示しない
[キャンセル] [同意して続行]
```

### 3. APIセキュリティ

#### 認証・認可（将来拡張）

- 現在: 単一ユーザー（ローカル）のため認証不要
- 将来: マルチユーザー対応時にJWT認証導入

#### レート制限

```typescript
// Ollama API呼び出しの制限
const rateLimiter = {
  maxConcurrent: 5,        // 同時実行数
  maxPerMinute: 60,        // 1分あたり最大60リクエスト
  backoffOnError: true,    // エラー時は自動バックオフ
};
```

---

## 参考資料

### 技術ドキュメント

#### LanceDB

- [GitHub - lancedb/lancedb](https://github.com/lancedb/lancedb)
- [@lancedb/lancedb - npm](https://www.npmjs.com/package/@lancedb/lancedb)
- [LanceDB TypeScript Documentation](https://lancedb.github.io/lancedb/js/globals/)
- [LanceDB Enterprise Performance Benchmarks](https://lancedb.com/docs/enterprise/benchmark/)
- [Ingesting Data in LanceDB Tables](https://lancedb.com/docs/tables/update/)
- [Reindexing and Incremental Indexing in LanceDB](https://lancedb.com/docs/indexing/reindexing/)

#### Ollama + nomic-embed-text

- [nomic-embed-text - Ollama Library](https://ollama.com/library/nomic-embed-text)
- [Nomic Embed Text V2 Blog](https://www.nomic.ai/blog/posts/nomic-embed-text-v2)
- [Ollama Embedded Models: 2025 Local AI Guide](https://collabnix.com/ollama-embedded-models-the-complete-technical-guide-to-local-ai-embeddings-in-2025/)
- [Ollama API Integration Guide](https://collabnix.com/ollama-api-integration-building-production-ready-llm-applications/)
- [Fixing API Rate Limit Exceeded in Ollama](https://markaicode.com/fix-ollama-api-rate-limit-exceeded-trading-systems/)
- [How to Fix 'Embedding Generation Failed' Error](https://markaicode.com/fix-ollama-embedding-generation-failed-error/)
- [Implementing Retry Logic for LLM API Failures 2025](https://markaicode.com/llm-api-retry-logic-implementation/)

#### Vector Embeddings Best Practices

- [How to Get the Right Vector Embeddings](https://medium.com/vector-database/how-to-get-the-right-vector-embeddings-83295ced7f35)
- [Embedding models and dimensions optimization](https://devblogs.microsoft.com/azure-sql/embedding-models-and-dimensions-optimizing-the-performance-resource-usage-ratio/)
- [9 Vector Dimension Rules You Shouldn't Ignore](https://medium.com/@Nexumo_/9-vector-dimension-rules-you-shouldnt-ignore-0d1ed559e953)

#### 比較記事

- [Compare LanceDB vs. SQLite in 2025](https://slashdot.org/software/comparison/LanceDB-vs-SQLite/)
- [LanceDB vs SQLite (2025) - PeerSpot](https://www.peerspot.com/products/comparisons/lancedb_vs_sqlite)
- [sqlite-vss GitHub](https://github.com/asg017/sqlite-vss)

---

## 次のステップ

### 即座に開始可能なタスク

1. **Ollamaセットアップ**
   ```bash
   # Ollamaインストール後
   ollama pull nomic-embed-text
   ollama run nomic-embed-text "テストメッセージ"
   ```

2. **LanceDB検証**
   ```bash
   npm install @lancedb/lancedb
   # サンプルスクリプトで動作確認
   ```

3. **Prisma スキーマ拡張**
   - `NoteEmbedding` モデル追加
   - `npx prisma db push`

### SubAgent分担提案

| SubAgent | 担当領域 | 優先度 |
|---------|---------|--------|
| **SubAgent 2** | バックエンドサービス実装 | 高 |
| **SubAgent 3** | API実装 | 高 |
| **SubAgent 4** | フロントエンド統合 | 中 |
| **SubAgent 5** | テスト実装 | 中 |

---

## まとめ

### 技術選定の確定

| 項目 | 選定技術 |
|------|---------|
| ベクトルDB | **LanceDB** |
| 埋め込みモデル | **Ollama + nomic-embed-text v1.5** |
| ベクトル次元 | **384次元** |
| メタデータ管理 | **SQLite (Prisma)** |

### 期待される成果

1. **検索精度向上**: キーワード一致だけでなく意味的に類似したノートを発見
2. **知識発見の加速**: 忘れていた関連ノートが自動提案される
3. **プライバシー保護**: 完全ローカル処理で機密情報を保護
4. **低コスト**: API料金不要、電力コストのみ
5. **拡張性**: 将来のマルチモーダル（画像検索等）にも対応可能

### リスクと緩和策

| リスク | 影響 | 緩和策 |
|-------|------|--------|
| Ollama性能不足 | 埋め込み生成遅延 | バッチ処理、バックグラウンド実行 |
| LanceDB学習コスト | 開発遅延 | 段階的実装、豊富なドキュメント活用 |
| ストレージ増加 | ディスク容量圧迫 | 384次元で軽量化、定期クリーンアップ |

---

**作成者**: SubAgent 1 (Phase 4 技術調査担当)
**最終更新**: 2025-12-14
**ステータス**: 設計完了・実装準備完了
