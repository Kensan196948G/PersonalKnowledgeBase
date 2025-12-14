# Phase 4: AI機能データベーススキーマ拡張

## 概要

AI機能（要約・タグ提案・文章校正）の履歴と設定を保存するためのデータベーススキーマ拡張。

---

## 1. Prismaスキーマ拡張

### 1.1 完全なスキーマ定義

```prisma
// prisma/schema.prisma

// =====================================
// Phase 4: AI機能テーブル
// =====================================

// AI要約履歴
model AiSummary {
  id            String   @id @default(uuid())
  noteId        String
  summary       String   // 生成された要約テキスト
  level         String   // "short" | "medium" | "long"
  tokenCount    Int      // 出力トークン数
  model         String   // 使用したモデル ("llama3.2:1b" | "llama3.2:3b")
  processingTime Int?    // 処理時間（ミリ秒）
  createdAt     DateTime @default(now())

  note          Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([noteId])
  @@index([createdAt])
  @@index([level])
}

// AIタグ提案履歴
model AiTagSuggestion {
  id            String   @id @default(uuid())
  noteId        String
  tagName       String   // 提案されたタグ名
  confidence    Float    // 信頼度スコア（0-1）
  reason        String?  // 提案理由
  isAccepted    Boolean  @default(false)  // ユーザーが採用したか
  isExisting    Boolean  @default(false)  // 既存タグか新規タグか
  createdAt     DateTime @default(now())

  note          Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([noteId])
  @@index([isAccepted])
  @@index([tagName])
}

// AI文章校正履歴
model AiProofreadHistory {
  id            String   @id @default(uuid())
  originalText  String   // 元のテキスト
  correctedText String   // 校正後のテキスト
  issuesFound   Int      // 発見された問題の数
  issuesData    String   // 問題の詳細（JSON形式）
  language      String   // "ja" | "en"
  checkTypes    String   // チェック種別（JSON配列）
  model         String   // 使用したモデル
  processingTime Int?    // 処理時間（ミリ秒）
  createdAt     DateTime @default(now())

  @@index([createdAt])
  @@index([language])
}

// AI文章展開履歴
model AiExpansionHistory {
  id            String   @id @default(uuid())
  originalText  String   // 元のテキスト
  expandedText  String   // 展開後のテキスト
  direction     String   // "elaborate" | "brainstorm" | "outline"
  tokenCount    Int      // 出力トークン数
  model         String   // 使用したモデル
  processingTime Int?    // 処理時間（ミリ秒）
  createdAt     DateTime @default(now())

  @@index([createdAt])
  @@index([direction])
}

// AI設定
model AiSettings {
  id              String   @id @default(uuid())
  userId          String   @default("default")  // 将来のマルチユーザー対応
  defaultModel    String   @default("llama3.2:1b")
  temperature     Float    @default(0.3)
  enableCache     Boolean  @default(true)
  cacheTTL        Int      @default(3600)  // キャッシュ有効期限（秒）
  autoTagging     Boolean  @default(false)  // 自動タグ提案
  autoSummary     Boolean  @default(false)  // 自動要約生成
  updatedAt       DateTime @updatedAt

  @@unique([userId])
}

// AI処理メトリクス
model AiMetrics {
  id              String   @id @default(uuid())
  operation       String   // "summarize" | "tag-suggest" | "proofread" | "expand"
  model           String   // 使用したモデル
  inputTokens     Int      // 入力トークン数
  outputTokens    Int      // 出力トークン数
  processingTime  Int      // 処理時間（ミリ秒）
  success         Boolean  // 成功/失敗
  errorCode       String?  // エラーコード
  timestamp       DateTime @default(now())

  @@index([operation])
  @@index([timestamp])
  @@index([success])
}
```

### 1.2 Noteモデルへのリレーション追加

```prisma
model Note {
  id        String   @id @default(uuid())
  title     String
  content   String
  // ... 既存フィールド ...

  // Phase 4: AI機能リレーション
  aiSummaries      AiSummary[]
  aiTagSuggestions AiTagSuggestion[]

  // ... 既存リレーション ...
}
```

---

## 2. マイグレーション実行

### 2.1 スキーマ更新手順

```bash
# 1. スキーマファイルを編集
# prisma/schema.prisma に上記のモデルを追加

# 2. マイグレーション作成
npx prisma migrate dev --name add_ai_features

# 3. Prismaクライアント再生成
npx prisma generate

# 4. マイグレーション適用確認
npx prisma migrate status

# 5. データベース確認
npx prisma studio
```

### 2.2 既存データへの影響

このマイグレーションは新規テーブル追加のみで、既存データには影響しません。

---

## 3. データベースクエリ例

### 3.1 要約履歴の保存

```typescript
// ノートの要約を保存
await prisma.aiSummary.create({
  data: {
    noteId: 'note-uuid',
    summary: '生成された要約テキスト',
    level: 'short',
    tokenCount: 50,
    model: 'llama3.2:1b',
    processingTime: 1234,
  },
});
```

### 3.2 ノートの要約履歴取得

```typescript
// 特定ノートの全要約履歴
const summaries = await prisma.aiSummary.findMany({
  where: { noteId: 'note-uuid' },
  orderBy: { createdAt: 'desc' },
  take: 10,
});

// 最新の要約のみ取得
const latestSummary = await prisma.aiSummary.findFirst({
  where: { noteId: 'note-uuid', level: 'short' },
  orderBy: { createdAt: 'desc' },
});
```

### 3.3 タグ提案の記録と取得

```typescript
// タグ提案を保存
await prisma.aiTagSuggestion.create({
  data: {
    noteId: 'note-uuid',
    tagName: 'TypeScript',
    confidence: 0.95,
    reason: 'TypeScriptに関する内容が多く含まれています',
    isExisting: true,
  },
});

// 採用されたタグ提案を取得
const acceptedTags = await prisma.aiTagSuggestion.findMany({
  where: {
    noteId: 'note-uuid',
    isAccepted: true,
  },
});

// タグ採用をマーク
await prisma.aiTagSuggestion.update({
  where: { id: 'suggestion-uuid' },
  data: { isAccepted: true },
});
```

### 3.4 校正履歴の保存

```typescript
// 校正結果を保存
await prisma.aiProofreadHistory.create({
  data: {
    originalText: '元のテキスト',
    correctedText: '校正後のテキスト',
    issuesFound: 3,
    issuesData: JSON.stringify([
      {
        type: 'grammar',
        severity: 'high',
        original: '間違い',
        suggestion: '修正',
      },
    ]),
    language: 'ja',
    checkTypes: JSON.stringify(['grammar', 'spelling']),
    model: 'llama3.2:3b',
    processingTime: 2000,
  },
});
```

### 3.5 メトリクス記録

```typescript
// AI処理のメトリクスを記録
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

// 統計情報取得
const stats = await prisma.aiMetrics.groupBy({
  by: ['operation', 'model'],
  _avg: {
    processingTime: true,
    inputTokens: true,
    outputTokens: true,
  },
  _count: {
    id: true,
  },
  where: {
    timestamp: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 過去7日間
    },
    success: true,
  },
});
```

---

## 4. インデックス戦略

### 4.1 パフォーマンス最適化

| テーブル | インデックス | 理由 |
|---------|-------------|------|
| AiSummary | noteId, createdAt, level | ノート別・日時別・レベル別検索 |
| AiTagSuggestion | noteId, isAccepted, tagName | 採用済みタグ検索 |
| AiProofreadHistory | createdAt, language | 時系列・言語別検索 |
| AiMetrics | operation, timestamp, success | 統計集計クエリ最適化 |

### 4.2 複合インデックス（必要に応じて追加）

```prisma
model AiSummary {
  // ...

  @@index([noteId, level, createdAt])  // 複合検索最適化
}

model AiMetrics {
  // ...

  @@index([operation, success, timestamp])  // 統計クエリ最適化
}
```

---

## 5. データクリーンアップ

### 5.1 古いデータ削除

```typescript
// 30日以上前のメトリクスを削除
await prisma.aiMetrics.deleteMany({
  where: {
    timestamp: {
      lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  },
});

// 削除されたノートの要約履歴は自動削除（onDelete: Cascade）
```

### 5.2 定期クリーンアップジョブ

```typescript
// scripts/cleanup-ai-data.ts

import { prisma } from '../src/backend/db.js';

async function cleanupOldAiData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // メトリクスは30日で削除
  const deletedMetrics = await prisma.aiMetrics.deleteMany({
    where: { timestamp: { lt: thirtyDaysAgo } },
  });

  // 校正履歴は90日で削除
  const deletedProofreads = await prisma.aiProofreadHistory.deleteMany({
    where: { createdAt: { lt: ninetyDaysAgo } },
  });

  console.log(`Cleanup complete:
    - Deleted ${deletedMetrics.count} metrics
    - Deleted ${deletedProofreads.count} proofreading histories
  `);
}

cleanupOldAiData().then(() => process.exit(0));
```

---

## 6. バックアップ戦略

### 6.1 AIデータのエクスポート

```typescript
// scripts/export-ai-data.ts

import { prisma } from '../src/backend/db.js';
import fs from 'fs';

async function exportAiData(noteId: string) {
  const aiData = {
    summaries: await prisma.aiSummary.findMany({
      where: { noteId },
    }),
    tagSuggestions: await prisma.aiTagSuggestion.findMany({
      where: { noteId },
    }),
  };

  fs.writeFileSync(
    `ai-data-${noteId}.json`,
    JSON.stringify(aiData, null, 2)
  );

  console.log(`AI data exported for note ${noteId}`);
}
```

### 6.2 AIデータのインポート

```typescript
// scripts/import-ai-data.ts

import { prisma } from '../src/backend/db.js';
import fs from 'fs';

async function importAiData(filePath: string) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // 要約をインポート
  for (const summary of data.summaries) {
    await prisma.aiSummary.create({
      data: {
        noteId: summary.noteId,
        summary: summary.summary,
        level: summary.level,
        tokenCount: summary.tokenCount,
        model: summary.model,
      },
    });
  }

  // タグ提案をインポート
  for (const suggestion of data.tagSuggestions) {
    await prisma.aiTagSuggestion.create({
      data: {
        noteId: suggestion.noteId,
        tagName: suggestion.tagName,
        confidence: suggestion.confidence,
        reason: suggestion.reason,
        isAccepted: suggestion.isAccepted,
      },
    });
  }

  console.log('AI data imported successfully');
}
```

---

## 7. データベースビュー（オプション）

### 7.1 よく使うクエリのビュー化

```sql
-- AIメトリクス統計ビュー（SQLite用）
CREATE VIEW ai_metrics_stats AS
SELECT
  operation,
  model,
  COUNT(*) as total_operations,
  SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_operations,
  AVG(processingTime) as avg_processing_time,
  AVG(inputTokens) as avg_input_tokens,
  AVG(outputTokens) as avg_output_tokens,
  DATE(timestamp) as date
FROM AiMetrics
GROUP BY operation, model, DATE(timestamp);
```

---

## 8. データ検証

### 8.1 整合性チェック

```typescript
// scripts/validate-ai-data.ts

import { prisma } from '../src/backend/db.js';

async function validateAiData() {
  // 孤立した要約履歴チェック
  const orphanedSummaries = await prisma.aiSummary.findMany({
    where: {
      note: null,
    },
  });

  if (orphanedSummaries.length > 0) {
    console.warn(`Found ${orphanedSummaries.length} orphaned summaries`);
  }

  // 無効な信頼度スコアチェック
  const invalidConfidence = await prisma.aiTagSuggestion.findMany({
    where: {
      OR: [
        { confidence: { lt: 0 } },
        { confidence: { gt: 1 } },
      ],
    },
  });

  if (invalidConfidence.length > 0) {
    console.warn(`Found ${invalidConfidence.length} invalid confidence scores`);
  }

  console.log('Data validation complete');
}
```

---

## 9. パフォーマンスモニタリング

### 9.1 スロークエリ検出

```typescript
// クエリ実行時間を記録
const start = Date.now();
const result = await prisma.aiSummary.findMany({
  where: { noteId },
  include: { note: true },
});
const duration = Date.now() - start;

if (duration > 1000) {
  console.warn(`Slow query detected: ${duration}ms`);
}
```

### 9.2 データベースサイズ監視

```bash
# SQLiteデータベースサイズ確認
du -h data/knowledge.db

# テーブル別レコード数
sqlite3 data/knowledge.db "
  SELECT
    'AiSummary' as table_name,
    COUNT(*) as count
  FROM AiSummary
  UNION ALL
  SELECT 'AiTagSuggestion', COUNT(*) FROM AiTagSuggestion
  UNION ALL
  SELECT 'AiMetrics', COUNT(*) FROM AiMetrics;
"
```

---

## 10. トラブルシューティング

### 10.1 マイグレーション失敗時

```bash
# マイグレーション状態確認
npx prisma migrate status

# マイグレーション解決
npx prisma migrate resolve --applied <migration_name>

# マイグレーションリセット（開発環境のみ）
npx prisma migrate reset
```

### 10.2 データ不整合修復

```typescript
// scripts/repair-ai-data.ts

import { prisma } from '../src/backend/db.js';

async function repairAiData() {
  // 無効な信頼度スコアを修正
  await prisma.aiTagSuggestion.updateMany({
    where: { confidence: { lt: 0 } },
    data: { confidence: 0 },
  });

  await prisma.aiTagSuggestion.updateMany({
    where: { confidence: { gt: 1 } },
    data: { confidence: 1 },
  });

  console.log('Data repair complete');
}
```

---

## まとめ

Phase 4のデータベーススキーマ拡張により、以下が実現されます：

1. AI要約・タグ提案・校正の履歴管理
2. ユーザー設定の永続化
3. パフォーマンスメトリクスの収集
4. 効率的なクエリ実行（インデックス最適化）
5. データ整合性の保証（CASCADE削除）

次のステップ：
- マイグレーション実行
- API実装との統合
- テストデータ投入
- パフォーマンステスト
