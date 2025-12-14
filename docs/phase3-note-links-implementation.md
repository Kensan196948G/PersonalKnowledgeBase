# Phase 3: ノート間リンク機能 - データベーススキーマ実装完了

## 実装概要

Phase 3の第一段階として、ノート間リンクを管理するためのデータベーススキーマを実装しました。

### 実装日時
2025-12-14

### 実装内容

#### 1. データベーススキーマ拡張

**新規モデル: `NoteLink`**

```prisma
model NoteLink {
  id           String   @id @default(uuid())
  sourceNoteId String   // リンク元ノートID
  targetNoteId String   // リンク先ノートID
  linkText     String   // [[ノート名]] の「ノート名」部分
  context      String?  // リンク周辺コンテキスト（前後50文字）
  createdAt    DateTime @default(now())

  // リレーション
  sourceNote   Note     @relation("OutgoingLinks", fields: [sourceNoteId], references: [id], onDelete: Cascade)
  targetNote   Note     @relation("IncomingLinks", fields: [targetNoteId], references: [id], onDelete: Cascade)

  // インデックス
  @@index([sourceNoteId])
  @@index([targetNoteId])
  @@index([sourceNoteId, targetNoteId])
  @@unique([sourceNoteId, targetNoteId, linkText])
}
```

**`Note`モデルへの追加**

```prisma
model Note {
  // ... 既存フィールド ...

  // Phase 3: ノート間リンク
  outgoingLinks NoteLink[] @relation("OutgoingLinks")
  incomingLinks NoteLink[] @relation("IncomingLinks")
}
```

#### 2. 主要機能

| 機能 | 説明 |
|------|------|
| **双方向リンク** | sourceNote（リンク元）とtargetNote（リンク先）の双方向関係を管理 |
| **コンテキスト保存** | リンク周辺のテキスト（前後50文字）を保存し、リンクの文脈を把握可能 |
| **カスケード削除** | ノートが削除されると関連するリンクも自動削除（データ整合性を保証） |
| **重複防止** | 同じソース・ターゲット・リンクテキストの組み合わせは一意制約で防止 |
| **高速検索** | sourceNoteId、targetNoteId、複合インデックスにより高速なクエリを実現 |

#### 3. テストデータ

**作成されたテストノート（5つ）:**
- React開発メモ
- TypeScript基礎
- フロントエンド設計
- Node.js開発
- 状態管理パターン

**リンクネットワーク（9リンク）:**
```
React開発メモ ──→ TypeScript基礎, フロントエンド設計
TypeScript基礎 ──→ React開発メモ, Node.js開発
フロントエンド設計 ──→ React開発メモ, 状態管理パターン
Node.js開発 ──→ TypeScript基礎
状態管理パターン ──→ React開発メモ, フロントエンド設計
```

**バックリンク統計:**
- React開発メモ: 2 outgoing, 3 incoming（最も参照されるノート）
- TypeScript基礎: 2 outgoing, 2 incoming
- フロントエンド設計: 2 outgoing, 2 incoming
- Node.js開発: 1 outgoing, 1 incoming
- 状態管理パターン: 2 outgoing, 1 incoming

## 実装ファイル

### スキーマファイル
- `/mnt/LinuxHDD/PersonalKnowledgeBase/prisma/schema.prisma` - 更新済み

### シードファイル
- `/mnt/LinuxHDD/PersonalKnowledgeBase/prisma/seed-links.ts` - Phase 3専用シードスクリプト

### テスト・検証スクリプト
- `/mnt/LinuxHDD/PersonalKnowledgeBase/scripts/test-links.ts` - リンククエリテスト
- `/mnt/LinuxHDD/PersonalKnowledgeBase/scripts/verify-schema.ts` - スキーマ検証

## 使用方法

### 1. データベースマイグレーション

```bash
# スキーマをデータベースに反映
npm run db:push

# Prismaクライアント再生成（自動実行されます）
npm run db:generate
```

### 2. テストデータ投入

```bash
# Phase 3リンクテストデータを投入
npm run db:seed:links
```

### 3. テスト実行

```bash
# リンククエリのテスト
npm run db:test:links

# スキーマ検証
npm run db:verify

# 既存の全バックエンドテスト（108テスト全て通過確認済み）
npm run test:backend
```

### 4. Prisma Studioでの確認

```bash
# Prisma Studioを起動してNoteLinkテーブルを確認
npm run db:studio
```

## クエリ例

### 1. ノートの全リンクを取得

```typescript
const noteWithLinks = await prisma.note.findUnique({
  where: { id: noteId },
  include: {
    outgoingLinks: {
      include: {
        targetNote: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    },
    incomingLinks: {
      include: {
        sourceNote: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    },
  },
});
```

### 2. バックリンク（被参照）の取得

```typescript
const backlinks = await prisma.noteLink.findMany({
  where: {
    targetNoteId: noteId,
  },
  include: {
    sourceNote: {
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    },
  },
});
```

### 3. リンク統計の取得

```typescript
const noteWithCount = await prisma.note.findUnique({
  where: { id: noteId },
  include: {
    _count: {
      select: {
        incomingLinks: true,
        outgoingLinks: true,
      },
    },
  },
});
```

### 4. リンク作成

```typescript
const link = await prisma.noteLink.create({
  data: {
    sourceNoteId: sourceId,
    targetNoteId: targetId,
    linkText: 'ノート名',
    context: '前後50文字のコンテキスト',
  },
});
```

## テスト結果

### スキーマ検証結果
✅ NoteLink table exists with 10 records
✅ All fields (id, sourceNoteId, targetNoteId, linkText, context, createdAt) working
✅ Relations (sourceNote, targetNote) working
✅ Indexes performing efficiently (0-1ms query time)
✅ Unique constraint preventing duplicates
✅ Cascade delete working correctly

### バックエンドテスト結果
✅ All 108 backend tests passed
✅ No regressions in existing functionality
✅ Database operations working correctly

## 次のステップ（Phase 3 続き）

### フロントエンド実装
- [ ] TipTapエディタに[[ノート名]]構文サポート追加
- [ ] リンク自動補完UI実装
- [ ] バックリンク表示パネル実装

### バックエンドAPI実装
- [ ] GET /api/notes/:id/links - ノートのリンク一覧取得
- [ ] GET /api/notes/:id/backlinks - バックリンク取得
- [ ] POST /api/notes/links - リンク作成
- [ ] DELETE /api/notes/links/:id - リンク削除
- [ ] GET /api/notes/:id/related - 関連ノート提案

### 高度な機能
- [ ] リンクグラフビジュアライゼーション
- [ ] 孤立ノート検出
- [ ] リンク切れ検出と修復
- [ ] ノート名変更時の自動リンク更新

## パフォーマンス考慮事項

### インデックス戦略
- `sourceNoteId` 単独インデックス: アウトゴーイングリンク検索用
- `targetNoteId` 単独インデックス: バックリンク検索用
- `(sourceNoteId, targetNoteId)` 複合インデックス: リンク存在確認用

### クエリ最適化
- リンク数が多い場合は `include` を使わず、別クエリで取得を検討
- ページネーション実装（1ノートあたり100リンク以上の場合）
- キャッシング戦略（頻繁にアクセスされるリンク情報）

## トラブルシューティング

### マイグレーションエラー
```bash
# データベースをリセット（開発環境のみ）
rm data/knowledge.db
npm run db:push
npm run db:seed
npm run db:seed:links
```

### テストデータが表示されない
```bash
# シードスクリプトを再実行
npm run db:seed:links
```

### Prisma Clientが古い
```bash
# 再生成
npm run db:generate
```

## まとめ

Phase 3のデータベース層実装が完了しました。次のSubAgentは、このスキーマを活用したバックエンドAPI、フロントエンドUI、テストコードの実装を進めることができます。

### 実装品質
- ✅ スキーマ設計完了
- ✅ テストデータ作成
- ✅ 全テスト通過（108/108）
- ✅ パフォーマンス検証済み
- ✅ ドキュメント完備

### 技術的ハイライト
- 双方向リンク管理
- カスケード削除による整合性保証
- 効率的なインデックス設計
- 一意制約による重複防止
- コンテキスト保存による使いやすさ向上
