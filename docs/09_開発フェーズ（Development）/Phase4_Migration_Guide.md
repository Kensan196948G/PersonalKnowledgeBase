# Phase 4: データベースマイグレーション手順書

## 概要

Phase 4（AI連携機能）のデータベーススキーマを有効化するための手順書。
現在、`prisma/schema.prisma` 内にコメントアウトされた状態でPhase 4用テーブルが準備されています。

---

## 準備状況

### 準備済みテーブル（コメントアウト状態）

| テーブル名 | 用途 | 状態 |
|-----------|------|------|
| `AiSummary` | AI要約履歴 | コメントアウト済み |
| `AiTagSuggestion` | AIタグ提案履歴 | コメントアウト済み |
| `AiProofreadHistory` | AI文章校正履歴 | コメントアウト済み |
| `AiExpansionHistory` | AI文章展開履歴 | コメントアウト済み |
| `AiSettings` | AI設定 | コメントアウト済み |
| `AiMetrics` | AI処理メトリクス | コメントアウト済み |

### Noteモデルへのリレーション追加（コメントアウト状態）

```prisma
// Phase 4: AI連携機能リレーション（準備中）
// aiSummaries      AiSummary[]
// aiTagSuggestions AiTagSuggestion[]
```

---

## Phase 4移行手順

### ステップ1: スキーマ確認

```bash
# 現在のスキーマファイル確認
cat prisma/schema.prisma

# Phase 4セクション（131行目以降）にコメントアウトされたテーブル定義を確認
```

### ステップ2: コメント解除

**Noteモデルのリレーション部分（35-37行目）**

変更前:
```prisma
  // Phase 4: AI連携機能リレーション（準備中）
  // aiSummaries      AiSummary[]
  // aiTagSuggestions AiTagSuggestion[]
```

変更後:
```prisma
  // Phase 4: AI連携機能リレーション
  aiSummaries      AiSummary[]
  aiTagSuggestions AiTagSuggestion[]
```

**Phase 4テーブル定義部分（131行目以降）**

変更前:
```prisma
// =====================================
// Phase 4: AI連携機能用テーブル（準備中）
// =====================================
//
// Phase 4実装時にコメントを解除してマイグレーション実行
// 詳細: docs/09_開発フェーズ（Development）/Phase4_Database_Schema.md
//
// // AI要約履歴
// model AiSummary {
//   id            String   @id @default(uuid())
//   ...
// }
```

変更後:
```prisma
// =====================================
// Phase 4: AI連携機能用テーブル
// =====================================

// AI要約履歴
model AiSummary {
  id            String   @id @default(uuid())
  ...
}
```

**全モデルのコメントを解除** (以下のモデル全て):
- `AiSummary`
- `AiTagSuggestion`
- `AiProofreadHistory`
- `AiExpansionHistory`
- `AiSettings`
- `AiMetrics`

### ステップ3: スキーマ検証

```bash
# スキーマ文法チェック
npx prisma validate

# 期待される出力:
# The schema at prisma/schema.prisma is valid 🚀
```

### ステップ4: マイグレーション作成

```bash
# データベースのバックアップ（推奨）
cp data/knowledge.db data/knowledge.db.backup-$(date +%Y%m%d_%H%M%S)

# マイグレーション作成
npx prisma migrate dev --name add_phase4_ai_features

# 期待される出力:
# Applying migration `20251214XXXXXX_add_phase4_ai_features`
# ✔ Generated Prisma Client (x.x.x) to ./node_modules/@prisma/client
```

### ステップ5: Prismaクライアント再生成

```bash
# Prismaクライアント生成（自動で実行されるが、念のため）
npx prisma generate

# 期待される出力:
# ✔ Generated Prisma Client (x.x.x)
```

### ステップ6: マイグレーション確認

```bash
# マイグレーション状態確認
npx prisma migrate status

# 期待される出力:
# Database schema is up to date!

# テーブル作成確認
sqlite3 data/knowledge.db ".tables"

# 期待される出力（Phase 4テーブルが含まれる）:
# AiExpansionHistory  AiSummary           NoteTag
# AiMetrics           AiTagSuggestion     Template
# AiProofreadHistory  Attachment          _prisma_migrations
# AiSettings          Folder
# Note                NoteLink
```

### ステップ7: Prisma Studioで確認

```bash
# Prisma Studio起動
npx prisma studio

# ブラウザで http://localhost:5555 を開く
# 左メニューに Phase 4 テーブルが表示されることを確認:
# - AiSummary
# - AiTagSuggestion
# - AiProofreadHistory
# - AiExpansionHistory
# - AiSettings
# - AiMetrics
```

---

## データ初期化（オプション）

### AI設定のデフォルト値投入

```typescript
// scripts/init-ai-settings.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initAiSettings() {
  const settings = await prisma.aiSettings.upsert({
    where: { userId: 'default' },
    update: {},
    create: {
      userId: 'default',
      defaultModel: 'llama3.2:1b',
      temperature: 0.3,
      enableCache: true,
      cacheTTL: 3600,
      autoTagging: false,
      autoSummary: false,
    },
  });

  console.log('AI設定を初期化しました:', settings);
}

initAiSettings()
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

実行:
```bash
# TypeScript実行環境で実行
npx tsx scripts/init-ai-settings.ts

# または、Node.jsで実行（ビルド後）
npm run build
node dist/scripts/init-ai-settings.js
```

---

## トラブルシューティング

### マイグレーション失敗時

```bash
# マイグレーション状態確認
npx prisma migrate status

# マイグレーション解決（既に適用された場合）
npx prisma migrate resolve --applied <migration_name>

# マイグレーションリセット（開発環境のみ、全データ削除注意）
npx prisma migrate reset
```

### データベースロックエラー

```bash
# サーバーを停止
# Ctrl+C で開発サーバーを停止

# データベース接続を確認
lsof data/knowledge.db

# 再度マイグレーション実行
npx prisma migrate dev --name add_phase4_ai_features
```

### Prismaクライアント型エラー

```bash
# Prismaクライアント再生成
npx prisma generate

# node_modules削除して再インストール
rm -rf node_modules package-lock.json
npm install

# TypeScript型チェック
npm run typecheck
```

---

## ロールバック手順（緊急時）

### 方法1: バックアップから復元

```bash
# サーバー停止
# Ctrl+C で開発サーバーを停止

# バックアップから復元
cp data/knowledge.db.backup-YYYYMMDD_HHMMSS data/knowledge.db

# マイグレーション状態リセット
npx prisma migrate reset

# 既存のマイグレーション適用
npx prisma migrate deploy
```

### 方法2: マイグレーション削除

```bash
# 最新のマイグレーションファイル削除
rm -rf prisma/migrations/YYYYMMDDXXXXXX_add_phase4_ai_features

# スキーマを元に戻す（Phase 4部分を再度コメントアウト）
# prisma/schema.prisma を編集

# マイグレーション状態リセット
npx prisma migrate reset

# 既存のマイグレーション再適用
npx prisma migrate deploy
```

---

## 移行チェックリスト

### Phase 4移行前

- [ ] データベースのバックアップ作成
- [ ] 現在のマイグレーション状態確認（`npx prisma migrate status`）
- [ ] 開発サーバーが停止していることを確認
- [ ] Phase 4ドキュメント確認（`Phase4_Database_Schema.md`）

### Phase 4移行中

- [ ] Noteモデルのリレーションコメント解除
- [ ] Phase 4テーブル定義のコメント解除（全6モデル）
- [ ] スキーマ検証（`npx prisma validate`）
- [ ] マイグレーション作成（`npx prisma migrate dev`）
- [ ] Prismaクライアント再生成確認

### Phase 4移行後

- [ ] マイグレーション状態確認（`npx prisma migrate status`）
- [ ] Prisma Studioで新テーブル確認
- [ ] AI設定の初期化実行
- [ ] 開発サーバー起動確認（`npm run dev`）
- [ ] TypeScript型チェック（`npm run typecheck`）
- [ ] 既存機能の動作確認（Phase 1-3）

---

## 次のステップ

Phase 4移行完了後:

1. **バックエンドAPI実装**
   - AI要約エンドポイント（`POST /api/ai/summarize`）
   - タグ提案エンドポイント（`POST /api/ai/suggest-tags`）
   - 文章校正エンドポイント（`POST /api/ai/proofread`）

2. **フロントエンド統合**
   - AIボタンUI追加
   - 要約表示コンポーネント
   - タグ提案UI

3. **Ollama連携**
   - Ollama APIクライアント実装
   - モデル管理機能
   - エラーハンドリング

4. **テスト作成**
   - データベーステスト
   - API統合テスト
   - E2Eテスト

---

## 参考ドキュメント

- `docs/09_開発フェーズ（Development）/Phase4_Database_Schema.md` - スキーマ詳細
- `docs/09_開発フェーズ（Development）/Phase4_Implementation_Roadmap.md` - 実装ロードマップ
- `docs/09_開発フェーズ（Development）/Phase4_Quick_Start_Guide.md` - クイックスタート
- `prisma/schema.prisma` - Prismaスキーマファイル

---

## まとめ

Phase 4データベースマイグレーションは以下の流れで実行します:

1. バックアップ作成
2. スキーマのコメント解除（Noteモデル + Phase 4テーブル）
3. スキーマ検証
4. マイグレーション作成・適用
5. Prismaクライアント再生成
6. 動作確認

コメントアウト状態で準備されているため、Phase 4実装開始時に安全に有効化できます。
