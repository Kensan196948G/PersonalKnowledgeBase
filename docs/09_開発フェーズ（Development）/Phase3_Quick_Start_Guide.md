# Phase 3 クイックスタートガイド

## 即座に実装開始するための簡易版ガイド

このドキュメントは、Phase 3の実装をすぐに開始したい場合のクイックリファレンスです。
詳細は `Phase3_Implementation_Roadmap.md` を参照してください。

---

## 1分で理解する Phase 3

### 何を作るか？

- **[[ノート名]]** でリンク作成（Obsidian風）
- **バックリンク表示**（このノートを参照している他ノート）
- **関連ノート提案**（似たテーマのノートを自動提示）

### なぜ作るか？

メモを「孤立した情報」から「つながる知識」へ進化させる

### どう作るか？

4つのSubAgentで並列開発（3-5日で完成）

---

## SubAgent実行コマンド（コピペ用）

### Phase 3 一括起動

```
以下のタスクを4つのSubAgentで並列実行してください:

SubAgent 1 (general-purpose): データベーススキーマ拡張
- prisma/schema.prisma に NoteLink モデル追加
- npx prisma db push && npx prisma generate
- テストデータ作成

SubAgent 2 (general-purpose): バックエンドAPI実装
- src/backend/utils/linkParser.ts（リンク解析）
- src/backend/api/links.ts（4つのエンドポイント）
- src/backend/services/relatedNotesService.ts（関連ノート計算）

SubAgent 3 (general-purpose): TipTapエディタ拡張
- src/frontend/extensions/NoteLink.ts（[[]]記法）
- オートコンプリート実装
- ホバープレビュー実装

SubAgent 4 (general-purpose): UI/UXコンポーネント
- src/frontend/components/Links/BacklinkPanel.tsx
- src/frontend/components/Links/RelatedNotesPanel.tsx
- レイアウト統合

実行順序: SubAgent 1 → SubAgent 2 → (SubAgent 3 + SubAgent 4 並列)
```

---

## 各SubAgentの詳細タスク

### SubAgent 1: データベース（2-3時間）

**ファイル**
- `prisma/schema.prisma`（編集）
- `prisma/seed-links.ts`（新規）

**実装内容**
```prisma
model NoteLink {
  id           String   @id @default(uuid())
  sourceNoteId String
  targetNoteId String
  anchorText   String?
  createdAt    DateTime @default(now())

  sourceNote   Note     @relation("OutgoingLinks", fields: [sourceNoteId], references: [id], onDelete: Cascade)
  targetNote   Note     @relation("IncomingLinks", fields: [targetNoteId], references: [id], onDelete: Cascade)

  @@unique([sourceNoteId, targetNoteId])
  @@index([sourceNoteId])
  @@index([targetNoteId])
}

model Note {
  // 既存フィールド...
  outgoingLinks NoteLink[] @relation("OutgoingLinks")
  incomingLinks NoteLink[] @relation("IncomingLinks")
}
```

**コマンド**
```bash
npx prisma db push
npx prisma generate
npm run db:seed
```

**完了条件**
- [ ] NoteLink テーブル作成完了
- [ ] Prisma Client 再生成完了

---

### SubAgent 2: バックエンドAPI（6-8時間）

**ファイル**
- `src/backend/utils/linkParser.ts`（新規）
- `src/backend/services/relatedNotesService.ts`（新規）
- `src/backend/api/links.ts`（新規）
- `src/backend/api/notes.ts`（編集）

**APIエンドポイント**
```typescript
GET  /api/notes/:id/links        // 発リンク一覧
GET  /api/notes/:id/backlinks    // 被リンク一覧
GET  /api/notes/:id/related      // 関連ノート（上位5件）
POST /api/notes/:id/links/sync   // リンク同期（手動トリガー）
```

**リンク解析ロジック**
```typescript
// linkParser.ts
const LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function extractLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  let match;
  while ((match = LINK_PATTERN.exec(content)) !== null) {
    links.push({
      noteTitle: match[1].trim(),
      anchorText: match[2]?.trim(),
    });
  }
  return links;
}

export async function syncNoteLinks(noteId: string, content: string) {
  const links = extractLinks(content);

  // 既存リンク削除
  await prisma.noteLink.deleteMany({ where: { sourceNoteId: noteId } });

  // 新規リンク作成
  for (const link of links) {
    const targetNote = await prisma.note.findFirst({
      where: { title: link.noteTitle }
    });

    if (targetNote) {
      await prisma.noteLink.create({
        data: {
          sourceNoteId: noteId,
          targetNoteId: targetNote.id,
          anchorText: link.anchorText,
        }
      });
    }
  }
}
```

**完了条件**
- [ ] 4つのAPIエンドポイント実装
- [ ] ノート保存時の自動リンク同期
- [ ] ユニットテスト作成

---

### SubAgent 3: TipTapエディタ（8-10時間）

**ファイル**
- `src/frontend/extensions/NoteLink.ts`（新規）
- `src/frontend/components/Editor/NoteLinkSuggestion.tsx`（新規）
- `src/frontend/components/Editor/NoteLinkPreview.tsx`（新規）
- `src/frontend/hooks/useEditor.ts`（編集）

**TipTap拡張**
```typescript
// NoteLink.ts
import { Node, mergeAttributes } from '@tiptap/core';

export const NoteLink = Node.create({
  name: 'noteLink',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      noteId: { default: null },
      noteTitle: { default: '' },
      exists: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-note-link]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const className = node.attrs.exists
      ? 'text-blue-600 hover:text-blue-800 underline cursor-pointer'
      : 'text-red-600 hover:text-red-800 underline cursor-pointer';

    return ['a', mergeAttributes(HTMLAttributes, {
      class: className,
      'data-note-link': '',
      'data-note-id': node.attrs.noteId,
    }), node.attrs.noteTitle];
  },
});
```

**オートコンプリート**
```typescript
// NoteLinkSuggestion.tsx
// [[ 入力検知
// ノート一覧取得
// ドロップダウン表示
// 選択時に [[ノート名]] 挿入
```

**完了条件**
- [ ] [[ 入力でオートコンプリート
- [ ] リンククリックで遷移
- [ ] ホバーでプレビュー

---

### SubAgent 4: UI/UX（6-8時間）

**ファイル**
- `src/frontend/components/Links/BacklinkPanel.tsx`（新規）
- `src/frontend/components/Links/RelatedNotesPanel.tsx`（新規）
- `src/frontend/components/Layout/MainLayout.tsx`（編集）

**バックリンクパネル**
```typescript
// BacklinkPanel.tsx
interface Backlink {
  noteId: string;
  noteTitle: string;
  context: string;  // リンク前後50文字
  updatedAt: Date;
}

export function BacklinkPanel({ noteId }: { noteId: string }) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);

  useEffect(() => {
    fetch(`/api/notes/${noteId}/backlinks`)
      .then(res => res.json())
      .then(data => setBacklinks(data.data));
  }, [noteId]);

  return (
    <div className="mt-6 p-4 border-t">
      <h3 className="text-lg font-semibold mb-2">バックリンク ({backlinks.length})</h3>
      {backlinks.length === 0 ? (
        <p className="text-gray-500">このノートへのリンクはありません</p>
      ) : (
        <ul className="space-y-2">
          {backlinks.map(bl => (
            <li key={bl.noteId}>
              <a href={`#/notes/${bl.noteId}`} className="text-blue-600 hover:underline">
                {bl.noteTitle}
              </a>
              <p className="text-sm text-gray-600">{bl.context}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**関連ノートパネル**
```typescript
// RelatedNotesPanel.tsx
interface RelatedNote {
  noteId: string;
  noteTitle: string;
  score: number;
  reason: string;  // "3個の共通タグ" 等
}

export function RelatedNotesPanel({ noteId }: { noteId: string }) {
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);

  useEffect(() => {
    fetch(`/api/notes/${noteId}/related`)
      .then(res => res.json())
      .then(data => setRelatedNotes(data.data));
  }, [noteId]);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">関連ノート</h3>
      <ul className="space-y-2">
        {relatedNotes.map(rn => (
          <li key={rn.noteId}>
            <a href={`#/notes/${rn.noteId}`} className="text-blue-600 hover:underline">
              {rn.noteTitle}
            </a>
            <p className="text-xs text-gray-500">{rn.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**完了条件**
- [ ] バックリンクパネル表示
- [ ] 関連ノートパネル表示
- [ ] レイアウト統合

---

## テスト手順

### 1. 手動テスト

```bash
# サーバー起動
npm run dev

# ブラウザで確認
# 1. 新規ノート作成
# 2. "[[テストノート]]" と入力
# 3. オートコンプリート確認
# 4. リンククリックで遷移確認
# 5. バックリンク表示確認
# 6. 関連ノート表示確認
```

### 2. ユニットテスト

```bash
npm run test:backend  # バックエンドテスト
npm run test:frontend # フロントエンドテスト
```

### 3. E2Eテスト（オプション）

```bash
npx playwright test tests/e2e/noteLinks.spec.ts
```

---

## トラブルシューティング

### よくある問題

**1. Prisma Client が更新されない**
```bash
npx prisma generate --force
```

**2. リンクが検出されない**
- 正規表現パターン確認
- コンテンツのエンコーディング確認

**3. オートコンプリートが表示されない**
- TipTap拡張が登録されているか確認
- ブラウザコンソールでエラー確認

**4. バックリンクが表示されない**
- API呼び出し確認（Network タブ）
- データベースに NoteLink が保存されているか確認

---

## 完了チェックリスト

### Phase 3 最小限の完了条件

- [ ] **DB**: NoteLink テーブル存在
- [ ] **API**: 4つのエンドポイント動作
- [ ] **Editor**: [[]] でリンク作成可能
- [ ] **UI**: バックリンク表示
- [ ] **UI**: 関連ノート表示
- [ ] **Test**: 主要フロー手動確認

### 追加で実装すると良い機能

- [ ] ホバープレビュー
- [ ] 赤リンク（存在しないノート）の検出
- [ ] リンク一覧ページ
- [ ] グラフビュー（Phase 3.5）

---

## 次のステップ

Phase 3完了後：

1. **Phase 3.5（オプション）**: グラフ可視化、ブロック参照
2. **Phase 4**: AI連携（ベクトル検索、セマンティック検索、AI要約）

---

## 参考コマンド集

```bash
# 開発サーバー起動
npm run dev

# データベース確認
npx prisma studio

# テスト実行
npm test

# 型チェック
npm run typecheck

# Lint
npm run lint

# ビルド
npm run build
```

---

## サポート

詳細は以下を参照：
- 詳細ロードマップ: `Phase3_Implementation_Roadmap.md`
- コンセプトドキュメント: `docs/06_思考整理（Knowledge）/`
- 技術スタック: `CLAUDE.md`

---

**最終更新**: 2025-12-14
**Phase**: Phase 3
**想定期間**: 3-5日（実作業20-27時間）
