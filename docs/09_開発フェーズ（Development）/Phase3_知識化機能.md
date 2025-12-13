# Phase 3: 知識化

## 目標

メモ同士の「関係性」を活用できる状態にする。
孤立したメモではなく、つながりを持った知識ベースへ。

## 前提条件

Phase 2 完了

## 機能一覧

### 必須機能

| 機能 | 状態 | 詳細 |
|------|------|------|
| ノート間リンク | [ ] | [[ノート名]] 記法 |
| バックリンク表示 | [ ] | 被参照ノートの一覧 |
| リンク自動補完 | [ ] | [[ 入力時の候補表示 |
| リンクプレビュー | [ ] | ホバーで内容プレビュー |

### オプション機能

| 機能 | 状態 | 詳細 |
|------|------|------|
| 関係可視化 | [ ] | グラフビュー |
| 関連ノート提示 | [ ] | 類似・関連の自動提案 |
| ブロック参照 | [ ] | 特定段落の埋め込み |
| 目次自動生成 | [ ] | 見出しからTOC生成 |
| アウトライナー | [ ] | 階層的メモ編集 |
| デイリーノート | [ ] | 日付ベースのノート |

## 技術実装

### リンク解析

```typescript
// [[ノート名]] の正規表現
const LINK_PATTERN = /\[\[([^\]]+)\]\]/g

// TipTap カスタム拡張
const NoteLink = Node.create({
  name: 'noteLink',
  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      noteId: { default: null },
      noteTitle: { default: '' },
    }
  },
})
```

### データモデル追加

```prisma
model NoteLink {
  id           String @id @default(uuid())
  sourceNoteId String
  targetNoteId String
  sourceNote   Note   @relation("OutgoingLinks", fields: [sourceNoteId], references: [id])
  targetNote   Note   @relation("IncomingLinks", fields: [targetNoteId], references: [id])
  createdAt    DateTime @default(now())

  @@unique([sourceNoteId, targetNoteId])
}
```

### バックエンド API 追加

```
# リンク
GET /api/notes/:id/links        # 発リンク一覧
GET /api/notes/:id/backlinks    # 被リンク一覧
GET /api/notes/:id/related      # 関連ノート

# グラフ
GET /api/graph                  # 全体グラフデータ
GET /api/graph/:id              # 特定ノート中心のグラフ
```

## UI コンポーネント

- リンクオートコンプリート: [[ 入力時のドロップダウン
- バックリンクパネル: ノート下部に被参照一覧
- グラフビュー: D3.js or vis.js によるネットワーク図
- ホバープレビュー: リンク上でポップアップ

## 完了条件

- [ ] [[ノート名]] でリンクを作成できる
- [ ] リンク先候補が自動補完される
- [ ] バックリンクが表示される
- [ ] リンクをクリックで遷移できる
- [ ] （オプション）グラフビューで関係を確認できる
