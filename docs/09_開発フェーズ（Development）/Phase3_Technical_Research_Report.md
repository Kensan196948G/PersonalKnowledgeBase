# Phase 3 技術調査レポート（Technical Research Report）

**作成日**: 2025-12-14
**担当**: SubAgent 3 (Technical Research)
**対象フェーズ**: Phase 3 - 知識化機能

---

## 目次

1. [調査概要](#調査概要)
2. [TipTap Mention拡張（ノート間リンク）](#tiptap-mention拡張ノート間リンク)
3. [Obsidian/Roam型ノート間リンク実装](#obsidianroam型ノート間リンク実装)
4. [バックリンク実装とSQLite最適化](#バックリンク実装とsqlite最適化)
5. [関連ノート推薦（TF-IDF/類似度計算）](#関連ノート推薦tf-idf類似度計算)
6. [推奨ライブラリ一覧](#推奨ライブラリ一覧)
7. [技術選定の理由](#技術選定の理由)
8. [パフォーマンス・セキュリティ考慮事項](#パフォーマンスセキュリティ考慮事項)
9. [実装ロードマップ](#実装ロードマップ)

---

## 調査概要

Phase 3「知識化機能」の実装に必要な技術調査を実施しました。以下4つの主要機能について、2025年最新のベストプラクティスとライブラリを調査しました。

### 調査対象機能

1. **ノート間リンク** - `[[ノート名]]` 記法とオートコンプリート
2. **バックリンク表示** - リバースインデックスと効率的なクエリ
3. **関連ノート提示** - TF-IDF/コサイン類似度による推薦
4. **全文検索最適化** - SQLite FTS5活用

---

## TipTap Mention拡張（ノート間リンク）

### 公式実装方法

TipTap v2.9.x では、**Mention extension**と**Suggestion utility**を組み合わせて実装します。

#### インストール要件

```bash
npm install @tiptap/extension-mention
npm install @tiptap/suggestion  # v2.0.0-beta.193以降は必須
```

#### 基本実装パターン

```typescript
import { Mention } from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'

const CustomMention = Mention.configure({
  suggestion: {
    char: '[[',  // Obsidian風トリガー
    items: async ({ query }) => {
      // 非同期でノート一覧を取得可能
      const notes = await fetchNotes(query)
      return notes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase())
      )
    },
    render: () => {
      let component
      let popup

      return {
        onStart: props => {
          component = new ReactRenderer(SuggestionList, {
            props,
            editor: props.editor,
          })

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate(props) {
          component.updateProps(props)
          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          })
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup[0].hide()
            return true
          }
          return component.ref?.onKeyDown(props)
        },

        onExit() {
          popup[0].destroy()
          component.destroy()
        },
      }
    },
  },
})
```

#### カスタマイズのポイント

1. **非同期クエリ対応**: `items`関数でAPI呼び出し可能（fuse.jsなど高度な検索も統合可）
2. **トリガー文字変更**: `char: '[['`でObsidian風、`char: '@'`でメンション風に変更可能
3. **ポップアップライブラリ**: tippy.js推奨（公式例）だが、他のライブラリも使用可能
4. **HTMLカスタマイズ**: レンダリング時に独自HTML属性追加可能

### 推奨実装アプローチ

**現行システムとの統合**:
- 既存のTipTap 2.9.1と互換性あり
- Zustandストアからノート一覧取得
- React Componentで候補リスト表示

---

## Obsidian/Roam型ノート間リンク実装

### Wiki Link記法のベストプラクティス

#### 基本記法

```markdown
[[ノート名]]                    # 基本リンク
[[ノート名|表示テキスト]]       # カスタム表示
[[ノート名#見出し]]             # 見出しへのリンク
[[フォルダ/ノート名]]           # パス指定
```

#### Obsidian実装の仕組み

1. **ファイル名ベース**: 拡張子なしのファイル名がリンクターゲット
2. **双方向リンク**: ページAがページBをリンク → Bに自動的にAのバックリンク表示
3. **グローバルユニーク**: プロジェクト全体で一意なファイル名を推奨

### 実装上の技術的考慮点

#### リンク解析（Parsing）

```typescript
// 正規表現パターン
const WIKI_LINK_PATTERN = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g

interface WikiLink {
  raw: string           // [[原文]]
  target: string        // リンク先ノート名
  heading?: string      // 見出し指定
  displayText?: string  // カスタム表示テキスト
}

function parseWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = []
  let match

  while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
    links.push({
      raw: match[0],
      target: match[1].trim(),
      heading: match[2]?.trim(),
      displayText: match[3]?.trim(),
    })
  }

  return links
}
```

#### データベーススキーマ（推奨）

```prisma
// Prisma Schema拡張
model NoteLink {
  id           String   @id @default(uuid())
  sourceNoteId String   // リンク元
  targetNoteId String?  // リンク先（存在する場合）
  targetTitle  String   // [[ここに書かれたテキスト]]
  linkType     String   @default("wikilink") // wikilink, mention, etc.
  displayText  String?  // カスタム表示
  heading      String?  // 見出し指定
  createdAt    DateTime @default(now())

  sourceNote   Note     @relation("OutgoingLinks", fields: [sourceNoteId], references: [id], onDelete: Cascade)
  targetNote   Note?    @relation("IncomingLinks", fields: [targetNoteId], references: [id], onDelete: SetNull)

  @@index([sourceNoteId])
  @@index([targetNoteId])
  @@index([targetTitle])
}

// Note modelに追加
model Note {
  // ... 既存フィールド
  outgoingLinks NoteLink[] @relation("OutgoingLinks")
  incomingLinks NoteLink[] @relation("IncomingLinks")
}
```

### Nólëbase Integrationsの活用

**Bi-directional Links拡張** ([Nólëbase Integrations](https://nolebase-integrations.ayaka.io/pages/en/integrations/markdown-it-bi-directional-links/)):
- markdown-it用の双方向リンクプラグイン
- TypeScript完全対応
- `[[target | alternative title]]`記法サポート

現行システムはTipTap（ProseMirror）ベースなので、概念のみ参考にする。

---

## バックリンク実装とSQLite最適化

### リバースインデックスの効率的実装

#### Org-roamアプローチ（参考）

Org-roamは**SQLiteデータベース**でノード（ノート・見出し）とリンク関係を管理し、EmacsSQLライブラリ経由でクエリ実行します。

**テーブル構成**:
- `nodes`: ノートとその属性
- `links`: ノード間のリンク関係
- `tags`: タグ情報

#### 推奨SQLiteクエリ（バックリンク取得）

```sql
-- 特定ノートへのバックリンク取得
SELECT
  n.id,
  n.title,
  n.updatedAt,
  COUNT(nl.id) as linkCount
FROM Note n
INNER JOIN NoteLink nl ON nl.sourceNoteId = n.id
WHERE nl.targetNoteId = ?
GROUP BY n.id
ORDER BY n.updatedAt DESC;

-- コンテキスト付きバックリンク（リンク周辺テキスト）
SELECT
  n.id,
  n.title,
  n.content,
  nl.displayText,
  nl.heading
FROM Note n
INNER JOIN NoteLink nl ON nl.sourceNoteId = n.id
WHERE nl.targetNoteId = ?
ORDER BY n.updatedAt DESC;
```

### SQLite Full-Text Search (FTS5)最適化

#### FTS5の利点

1. **高速検索**: リニアスキャン不要、インバーテッドインデックス使用
2. **ランキング機能**: BM25アルゴリズムによるスコアリング
3. **ハイライト**: MATCH結果のハイライト機能内蔵

#### Prismaとの併用方法

**問題**: Prisma ORM自体はSQLite FTS5未サポート（2025年12月現在）

**解決策**: Raw SQLとPrismaの併用

```typescript
// FTS5仮想テーブル作成（マイグレーション時）
await prisma.$executeRawUnsafe(`
  CREATE VIRTUAL TABLE IF NOT EXISTS note_fts
  USING fts5(
    id UNINDEXED,
    title,
    content,
    tokenize='porter unicode61'
  );
`)

// トリガーで同期
await prisma.$executeRawUnsafe(`
  CREATE TRIGGER IF NOT EXISTS note_fts_insert
  AFTER INSERT ON Note
  BEGIN
    INSERT INTO note_fts(id, title, content)
    VALUES (new.id, new.title, new.content);
  END;
`)

// 検索実行
const results = await prisma.$queryRawUnsafe<Array<{id: string, title: string, rank: number}>>`
  SELECT id, title, bm25(note_fts) as rank
  FROM note_fts
  WHERE note_fts MATCH ?
  ORDER BY rank
  LIMIT 20
`, query)
```

#### パフォーマンス最適化Tips

1. **optimize()実行**: 定期的に`INSERT INTO note_fts(note_fts) VALUES('optimize');`
2. **適切なtokenizer**: 日本語は`tokenize='unicode61'`または外部トークナイザ
3. **インデックス戦略**: `UNINDEXED`でメタデータ（id等）は検索対象外に

---

## 関連ノート推薦（TF-IDF/類似度計算）

### TF-IDFライブラリ比較

#### 1. **natural** (推奨)

```bash
npm install natural
```

**特徴**:
- 総合NLPライブラリ（トークナイズ、ステミング、分類、TF-IDF等）
- TF-IDF実装: `natural.TfIdf`クラス
- ドキュメント単位での類似度計算可能
- ファイルからのロード対応

**実装例**:

```typescript
import natural from 'natural'

const TfIdf = natural.TfIdf
const tfidf = new TfIdf()

// ノートを追加
notes.forEach(note => {
  tfidf.addDocument(note.content, { id: note.id, title: note.title })
})

// 特定ノートに類似したノートを取得
function findSimilarNotes(noteId: string, limit: number = 5) {
  const targetNote = notes.find(n => n.id === noteId)
  if (!targetNote) return []

  const scores: Array<{ id: string; title: string; score: number }> = []

  notes.forEach(note => {
    if (note.id === noteId) return // 自分自身は除外

    let similarity = 0
    const targetTerms = tfidf.listTerms(notes.indexOf(targetNote))

    targetTerms.forEach(term => {
      const targetScore = tfidf.tfidf(term.term, notes.indexOf(targetNote))
      const compareScore = tfidf.tfidf(term.term, notes.indexOf(note))
      similarity += Math.min(targetScore, compareScore)
    })

    scores.push({ id: note.id, title: note.title, score: similarity })
  })

  return scores.sort((a, b) => b.score - a.score).slice(0, limit)
}
```

**長所**:
- 包括的なNLP機能
- アクティブなメンテナンス（2025年7月更新確認）
- シリアライズ/デシリアライズ対応

**短所**:
- コサイン類似度は別途実装必要
- やや重量級

#### 2. **tf-idf-search**

```bash
npm install tf-idf-search
```

**特徴**:
- TF-IDFコサイン類似度による検索特化
- 軽量で使いやすいAPI
- TypeScript型定義あり

**実装例**:

```typescript
import TfIdfSearch from 'tf-idf-search'

const search = new TfIdfSearch()

notes.forEach(note => {
  search.addDocument(note.id, note.content)
})

// クエリ実行
const results = search.search('検索キーワード')
// => [{ id: 'note-1', score: 0.85 }, ...]
```

**長所**:
- シンプルなAPI
- コサイン類似度内蔵
- 検索特化で高速

**短所**:
- 機能が限定的（トークナイズ等は未対応）

#### 3. **tiny-tfidf** (学習・実験用)

```bash
# GitHub: kerryrodden/tiny-tfidf
```

**特徴**:
- 最小限実装（教育目的）
- TF-IDF + コサイン類似度
- 依存関係ゼロ

**長所**:
- 実装がシンプルで理解しやすい
- カスタマイズ容易

**短所**:
- プロダクション利用には機能不足

### Fuzzy Search: Fuse.js

```bash
npm install fuse.js
```

**用途**: オートコンプリート候補のあいまい検索

```typescript
import Fuse from 'fuse.js'

const fuse = new Fuse(notes, {
  keys: ['title', 'content'],
  threshold: 0.3,  // 0.0 = 完全一致, 1.0 = すべてマッチ
  includeScore: true,
  minMatchCharLength: 2,
})

const results = fuse.search('検索')
// => [{ item: Note, score: 0.12 }, ...]
```

**長所**:
- 軽量（依存関係なし）
- TypeScript完全対応
- 柔軟なオプション

**短所**:
- 大規模データ（100万件以上）には不向き

---

## 推奨ライブラリ一覧

### 必須ライブラリ

| ライブラリ | バージョン | 用途 | 優先度 |
|-----------|-----------|------|--------|
| **@tiptap/extension-mention** | ^2.9.1 | ノート間リンクUI | 必須 |
| **@tiptap/suggestion** | ^2.9.1 | オートコンプリート | 必須 |
| **tippy.js** | ^6.3.7 | ポップアップ表示 | 必須 |
| **@tippyjs/react** | ^4.2.6 | React統合 | 必須 |
| **natural** | ^7.0.7 | TF-IDF関連ノート推薦 | 必須 |
| **fuse.js** | ^7.0.0 | あいまい検索 | 推奨 |

### オプションライブラリ

| ライブラリ | 用途 | 検討タイミング |
|-----------|------|---------------|
| **d3.js** | グラフビュー可視化 | Phase 3後半 |
| **vis-network** | ネットワーク図（軽量） | Phase 3後半 |
| **react-flow** | インタラクティブグラフ | Phase 3後半 |

---

## 技術選定の理由

### 既存技術スタックとの整合性

| 判断基準 | 評価 |
|---------|------|
| **TypeScript互換性** | ✅ すべてのライブラリがTS対応 |
| **React統合** | ✅ TipTap React、Tippy Reactあり |
| **SQLite対応** | ✅ Prisma Raw SQL併用で実現可能 |
| **バンドルサイズ** | ✅ 軽量（Natural除く、サーバー側利用） |
| **学習コスト** | ✅ TipTap既存知識活用可能 |

### 過去の設計方針との一貫性

CLAUDE.mdおよび技術選定ドキュメントに基づく評価:

1. **シンプルさ優先**:
   - ✅ TipTap拡張として実装（新規フレームワーク不要）
   - ✅ SQLite活用（追加DB不要）

2. **ローカルファースト**:
   - ✅ Natural（Node.js）でサーバー側処理
   - ✅ Fuse.js（ブラウザ）でクライアント側処理

3. **将来のAI連携を阻害しない**:
   - ✅ TF-IDF → Phase 4でベクトル検索に移行可能
   - ✅ リンクデータはグラフ構造保持

---

## パフォーマンス・セキュリティ考慮事項

### パフォーマンス

#### ボトルネック予測

1. **TF-IDF再計算**: ノート追加/更新時に全体再計算は重い
   - **対策**: キャッシュ機構（Redis or メモリキャッシュ）
   - **対策**: 差分更新（incrementalに変更箇所のみ再計算）

2. **FTS5インデックス更新**: リアルタイム更新は負荷大
   - **対策**: トリガーで自動同期
   - **対策**: 定期的に`optimize()`実行

3. **バックリンククエリ**: 大量ノート（10万件以上）で遅延
   - **対策**: 適切なインデックス作成
   - **対策**: ページネーション実装

#### スケーラビリティ目標

| 項目 | 目標 | 実装方針 |
|------|------|---------|
| ノート数 | 1万件まで快適 | SQLiteインデックス最適化 |
| リンク数 | ノートあたり100件 | 正規化テーブル |
| 検索レスポンス | 100ms以内 | FTS5活用 |
| オートコンプリート | 50ms以内 | Fuse.jsクライアント側 |

### セキュリティ

#### SQLインジェクション対策

```typescript
// ❌ 危険（文字列連結）
await prisma.$queryRawUnsafe(`SELECT * FROM note_fts WHERE note_fts MATCH '${userInput}'`)

// ✅ 安全（パラメータバインド）
await prisma.$queryRaw`SELECT * FROM note_fts WHERE note_fts MATCH ${userInput}`
```

#### XSS対策（リンク表示）

```typescript
// TipTapのレンダリングはデフォルトでサニタイズされる
// カスタムHTML属性追加時は注意
const NoteLinkNode = Node.create({
  renderHTML({ node }) {
    return ['a', {
      href: `#/notes/${encodeURIComponent(node.attrs.noteId)}`,  // エンコード必須
      class: 'note-link',
      'data-note-id': node.attrs.noteId,  // data属性は安全
    }, node.attrs.noteTitle]
  }
})
```

---

## 実装ロードマップ

### Phase 3-1: ノート間リンク基盤（Week 1-2）

**優先度**: 最高

```
□ TipTap Mention拡張実装
  └─ @tiptap/extension-mention導入
  └─ カスタムMention設定（[[トリガー）
  └─ tippy.jsポップアップ統合

□ NoteLinkスキーマ追加
  └─ Prismaマイグレーション
  └─ リンク保存API実装

□ リンク解析処理
  └─ [[ノート名]]パース処理
  └─ 保存時にNoteLinkテーブル更新
```

### Phase 3-2: オートコンプリート（Week 2-3）

```
□ Fuse.js統合
  └─ ノート一覧のあいまい検索
  └─ Suggestionコンポーネント作成

□ UIコンポーネント
  └─ ドロップダウン候補リスト
  └─ キーボードナビゲーション
```

### Phase 3-3: バックリンク表示（Week 3-4）

```
□ バックリンククエリ実装
  └─ GET /api/notes/:id/backlinks
  └─ SQLiteインデックス最適化

□ バックリンクUIコンポーネント
  └─ ノート下部にパネル表示
  └─ コンテキスト付き表示
```

### Phase 3-4: 関連ノート推薦（Week 4-5）

```
□ Natural TF-IDF実装
  └─ サーバー側TF-IDF計算
  └─ キャッシュ機構

□ 関連ノートAPI
  └─ GET /api/notes/:id/related
  └─ スコアリング・ランキング

□ 関連ノートUI
  └─ サイドバー表示
```

### Phase 3-5: SQLite FTS5最適化（Week 5-6）

```
□ FTS5仮想テーブル
  └─ マイグレーションスクリプト
  └─ トリガー設定

□ 全文検索API改善
  └─ Raw SQLクエリ統合
  └─ ハイライト機能
```

### Phase 3-6: グラフビュー（オプション）（Week 6+）

```
□ グラフデータAPI
  └─ GET /api/graph
  └─ ノード・エッジJSON生成

□ 可視化コンポーネント
  └─ react-flow or vis-network
  └─ インタラクティブ操作
```

---

## 参考資料

### TipTap関連

- [Suggestion utility | Tiptap Editor Docs](https://tiptap.dev/docs/editor/api/utilities/suggestion)
- [Mention extension | Tiptap Editor Docs](https://tiptap.dev/docs/editor/extensions/nodes/mention)
- [Mentions example | Tiptap Editor Docs](https://tiptap.dev/docs/examples/advanced/mentions)

### Obsidian/Roam Research

- [Internal links - Obsidian Help](https://help.obsidian.md/links)
- [Bi-directional Links | Nólëbase Integrations](https://nolebase-integrations.ayaka.io/pages/en/integrations/markdown-it-bi-directional-links/)
- [Org-roam User Manual](https://www.orgroam.com/manual.html)

### SQLite FTS

- [SQLite FTS5 Extension](https://sqlite.org/fts5.html)
- [Full-text search (Preview) | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/full-text-search)
- [SQLite Full-Text Search: Your Ultimate Guide to Optimizing Queries - SQL Knowledge Center](https://www.sql-easy.com/learn/sqlite-full-text-search/)

### TF-IDF/類似度

- [natural - npm](https://www.npmjs.com/package/natural/v/1.0.1)
- [tf-idf-search - npm (GitHub: spapazov/tf-idf-search)](https://github.com/spapazov/tf-idf-search)
- [tiny-tfidf - GitHub (kerryrodden/tiny-tfidf)](https://github.com/kerryrodden/tiny-tfidf)
- [Building a content-based recommendation engine in JS](https://www.gravitywell.co.uk/insights/building-a-content-based-recommendation-engine-in-js/)

### Fuzzy Search

- [Fuse.js | Fuse.js](https://www.fusejs.io/)
- [GitHub - krisk/Fuse: Lightweight fuzzy-search, in JavaScript](https://github.com/krisk/Fuse)
- [Implementing a Fuzzy Search in React JS Using Fuse.JS / Blogs / Perficient](https://blogs.perficient.com/2025/03/17/implementing-a-fuzzy-search-in-react-js-using-fuse-js/)

### UI/Popup

- [Tippy.js - Tooltip, Popover, Dropdown, and Menu Library](https://atomiks.github.io/tippyjs/)
- [@tippyjs/react - npm](https://www.npmjs.com/package/@tippyjs/react)

---

## 次のステップ

1. **SubAgent 1 (Frontend)** へ技術選定共有
2. **SubAgent 2 (Backend)** へAPI設計指示
3. **SubAgent 4 (Test)** へテスト戦略策定依頼
4. **統合**: 各SubAgentの成果物をマージし、Phase 3実装開始

---

**作成**: SubAgent 3 (Technical Research)
**レビュー待ち**: MainAgent
**ステータス**: 完了
