# Phase 3 ノート間リンク - クイックリファレンス

## 実装状況

| 項目 | 状態 | 担当SubAgent |
|------|------|--------------|
| データベーススキーマ | ✅ 完了 | SubAgent 1 (本タスク) |
| バックエンドAPI | ⏳ 未実装 | SubAgent 2 |
| フロントエンドUI | ⏳ 未実装 | SubAgent 3 |
| テストコード | ⏳ 未実装 | SubAgent 4 |

---

## コマンド一覧

```bash
# データベース操作
npm run db:push           # スキーマをDBに反映
npm run db:seed:links     # Phase 3テストデータ投入
npm run db:verify         # スキーマ検証
npm run db:test:links     # リンククエリテスト
npm run db:studio         # Prisma Studio起動

# テスト
npm run test:backend      # バックエンドテスト（108テスト）
npm run test              # 全テスト実行
```

---

## データベーススキーマ

### NoteLink モデル

```prisma
model NoteLink {
  id           String   @id @default(uuid())
  sourceNoteId String   // リンク元
  targetNoteId String   // リンク先
  linkText     String   // [[ノート名]]
  context      String?  // 前後50文字
  createdAt    DateTime @default(now())

  sourceNote   Note @relation("OutgoingLinks", ...)
  targetNote   Note @relation("IncomingLinks", ...)

  @@index([sourceNoteId])
  @@index([targetNoteId])
  @@index([sourceNoteId, targetNoteId])
  @@unique([sourceNoteId, targetNoteId, linkText])
}
```

### Note モデル追加フィールド

```prisma
model Note {
  // ...既存フィールド...
  outgoingLinks NoteLink[] @relation("OutgoingLinks")
  incomingLinks NoteLink[] @relation("IncomingLinks")
}
```

---

## クエリ例

### 1. ノートの全リンク取得

```typescript
const note = await prisma.note.findUnique({
  where: { id: noteId },
  include: {
    outgoingLinks: {
      include: { targetNote: true }
    },
    incomingLinks: {
      include: { sourceNote: true }
    }
  }
});
```

### 2. バックリンク取得

```typescript
const backlinks = await prisma.noteLink.findMany({
  where: { targetNoteId: noteId },
  include: {
    sourceNote: {
      select: { id: true, title: true }
    }
  }
});
```

### 3. リンク作成

```typescript
await prisma.noteLink.create({
  data: {
    sourceNoteId: sourceId,
    targetNoteId: targetId,
    linkText: 'ノート名',
    context: '前後のコンテキスト'
  }
});
```

### 4. リンク統計

```typescript
const note = await prisma.note.findUnique({
  where: { id: noteId },
  include: {
    _count: {
      select: {
        incomingLinks: true,
        outgoingLinks: true
      }
    }
  }
});
```

---

## テストデータ

### テストノート（5つ）
- React開発メモ
- TypeScript基礎
- フロントエンド設計
- Node.js開発
- 状態管理パターン

### リンクネットワーク（9リンク）

```
React開発メモ ──→ TypeScript基礎, フロントエンド設計
TypeScript基礎 ──→ React開発メモ, Node.js開発
フロントエンド設計 ──→ React開発メモ, 状態管理パターン
Node.js開発 ──→ TypeScript基礎
状態管理パターン ──→ React開発メモ, フロントエンド設計
```

### バックリンク統計
```
React開発メモ:      2 outgoing, 3 incoming ★最多参照
TypeScript基礎:     2 outgoing, 2 incoming
フロントエンド設計:  2 outgoing, 2 incoming
Node.js開発:        1 outgoing, 1 incoming
状態管理パターン:    2 outgoing, 1 incoming
```

---

## ファイル構成

### スキーマ
- `prisma/schema.prisma` - データベーススキーマ定義

### シード
- `prisma/seed.ts` - 基本シードデータ
- `prisma/seed-links.ts` - **Phase 3リンクテストデータ**

### スクリプト
- `scripts/test-links.ts` - **リンククエリテスト**
- `scripts/verify-schema.ts` - **スキーマ検証**

### ドキュメント
- `docs/phase3-note-links-implementation.md` - **詳細実装ドキュメント**
- `docs/phase3-completion-summary.md` - **完了報告**
- `docs/PHASE3-QUICK-REFERENCE.md` - **本ファイル**

---

## 次のSubAgentタスク

### SubAgent 2: バックエンドAPI
**ファイル**: `src/backend/api/links.ts`

推奨エンドポイント:
```typescript
GET    /api/notes/:id/links      // リンク一覧
GET    /api/notes/:id/backlinks  // バックリンク
POST   /api/notes/links          // リンク作成
DELETE /api/notes/links/:id      // リンク削除
GET    /api/notes/:id/related    // 関連ノート提案
```

### SubAgent 3: フロントエンドUI
**ファイル**: `src/frontend/components/LinkPanel.tsx`

推奨機能:
- [[ノート名]]構文サポート
- リンク自動補完
- バックリンク表示パネル
- リンククリック遷移

### SubAgent 4: テスト
**ファイル**: `tests/backend/links.test.ts`, `tests/frontend/LinkPanel.test.tsx`

推奨テスト:
- API統合テスト
- コンポーネントテスト
- E2Eテスト

---

## トラブルシューティング

### スキーマがDBに反映されない
```bash
rm data/knowledge.db
npm run db:push
npm run db:seed
npm run db:seed:links
```

### テストが失敗する
```bash
npm run db:verify  # スキーマ確認
npm run db:studio  # データ確認
```

### Prisma Clientが古い
```bash
npm run db:generate
```

---

## 検証済み事項

✅ NoteLink テーブル作成完了
✅ インデックス動作確認（0-1ms）
✅ ユニーク制約動作確認
✅ カスケード削除動作確認
✅ リレーション動作確認
✅ 既存テスト全通過（108/108）
✅ テストデータ投入成功（5ノート、9リンク）

---

## 重要な制約

1. **ユニーク制約**: 同じ(source, target, linkText)の組み合わせは1つまで
2. **カスケード削除**: ノート削除時に関連リンクも自動削除
3. **必須フィールド**: sourceNoteId, targetNoteId, linkText
4. **オプションフィールド**: context

---

## パフォーマンス

- **インデックスクエリ**: 0-1ms（高速）
- **リンク統計**: リアルタイム集計可能
- **スケーラビリティ**: 数千リンクまで対応可能

---

## 参考ドキュメント

詳細は以下を参照:
- `docs/phase3-note-links-implementation.md` - 完全な実装ドキュメント
- `docs/phase3-completion-summary.md` - 実装完了報告
- `prisma/schema.prisma` - スキーマ定義
- `scripts/test-links.ts` - クエリ例
