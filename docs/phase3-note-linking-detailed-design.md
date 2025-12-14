# Phase 3: ノート間リンク機能 - 詳細設計書

作成日: 2025-12-14
バージョン: 1.0
SubAgent: SubAgent 2 (Plan)

---

## 目次

1. [概要](#概要)
2. [技術スタック調査結果](#技術スタック調査結果)
3. [データベース設計](#データベース設計)
4. [API設計](#api設計)
5. [フロントエンド設計](#フロントエンド設計)
6. [実装計画](#実装計画)
7. [4並列SubAgent タスク分割](#4並列subagent-タスク分割)
8. [テスト計画](#テスト計画)
9. [将来の拡張性](#将来の拡張性)

---

## 概要

### Phase 3 の目標

Phase 3では、ノート間の関連性を構築し、知識をネットワーク化する機能を実装します。

#### 主要機能

1. **ノート間リンク** - `[[ノート名]]` 形式でのリンク作成
2. **バックリンク表示** - そのノートを参照している他のノートを表示
3. **関連ノート提案** - 共通タグ・キーワードに基づく関連ノート提示

#### 参考システム

- **Obsidian**: 双方向リンク、グラフビュー、ローカルファースト
- **Roam Research**: ブロック参照、ネットワーク思考
- **Notion**: シンプルなページリンク

本システムは **Obsidian** のアプローチに近く、ローカルファーストで軽量、かつ拡張性を重視します。

---

## 技術スタック調査結果

### TipTap 拡張機能

#### 1. TipTap Mention Extension

公式の `@tiptap/extension-mention` を利用可能:

- **機能**: @mention形式の入力支援
- **カスタマイズ性**: トリガー文字変更可能 (`@` → `[[`)
- **オートコンプリート**: カスタム候補リスト表示
- **レンダリング**: HTMLのカスタマイズ可能
- **複数タイプ**: 複数種類のmentionを共存可能

**採用理由**:
- 公式サポート、安定性が高い
- 既存のTipTap環境に統合しやすい
- カスタマイズ性が高い

#### 2. Wiki-style Links 専用拡張

サードパーティの `tiptap-wikilink-extension` も存在:

- **機能**: `[[` `]]` 形式のWikiリンク
- **状態**: npmパッケージ未公開、GitHub直接インストール
- **安定性**: メンテナンス状況不明

**不採用理由**:
- npmパッケージ未公開で依存管理が不安定
- Mention拡張でカスタマイズ可能
- 長期メンテナンス性に懸念

#### 採用方針

**TipTap Mention Extension をカスタマイズして実装**

- トリガー: `[[` (2文字トリガー)
- クロージング: `]]` (自動補完)
- レンダリング: `<a>` タグでリンク化
- オートコンプリート: ノート名で検索・フィルタ

### 双方向リンクのベストプラクティス

調査結果から得られた知見:

1. **双方向性の自動管理**
   - リンク作成時に自動的に逆方向のリンクも記録
   - データベースレベルで一貫性を保証

2. **グラフビューの重要性**
   - ノード（ノート）とエッジ（リンク）の可視化
   - ローカルグラフ（現在のノート周辺）が特に有用

3. **インデックス戦略**
   - source_idx, target_idx で高速検索
   - 大規模グラフでもパフォーマンス維持

4. **リンク切れ対応**
   - 存在しないノートへのリンク（赤リンク）を明示
   - リンク先ノート削除時の対応ロジック

---

## データベース設計

### 新規テーブル: NoteLink

ノート間のリンク関係を管理するテーブル。

```prisma
model NoteLink {
  id          String   @id @default(uuid())
  sourceId    String   // リンク元ノートID
  targetId    String   // リンク先ノートID
  linkText    String   // リンクテキスト（[[ノート名|表示テキスト]] の場合に使用）
  context     String?  // リンク周辺のコンテキスト（検索用）
  createdAt   DateTime @default(now())

  // リレーション
  source      Note     @relation("SourceLinks", fields: [sourceId], references: [id], onDelete: Cascade)
  target      Note     @relation("TargetLinks", fields: [targetId], references: [id], onDelete: Cascade)

  // インデックス
  @@index([sourceId])
  @@index([targetId])
  @@index([sourceId, targetId])
  @@unique([sourceId, targetId, linkText]) // 同一リンクの重複防止
}
```

### Note モデルの拡張

既存のNoteモデルにリレーションを追加:

```prisma
model Note {
  id        String   @id @default(uuid())
  title     String
  content   String
  // ... 既存フィールド ...

  // Phase 3: ノート間リンク
  outgoingLinks NoteLink[] @relation("SourceLinks")  // このノートから出ているリンク
  incomingLinks NoteLink[] @relation("TargetLinks")  // このノートへ入ってくるリンク
}
```

### インデックス戦略

| インデックス | 目的 | 使用クエリ |
|------------|------|-----------|
| `sourceId` | アウトゴーイングリンク検索 | 「このノートがリンクしている先は？」 |
| `targetId` | バックリンク検索 | 「このノートを参照しているノートは？」 |
| `sourceId, targetId` | リンク存在確認 | 重複チェック、削除時 |
| `linkText` | テキスト検索 | リンクテキストでの検索 |

### データ整合性

#### カスケード削除

- ノート削除時: 関連するすべてのNoteLinkを自動削除 (`onDelete: Cascade`)
- 孤立したリンクが残らないように保証

#### リンク切れ対応

リンク先ノートが存在しない場合の処理:

1. **作成時**: ノートが存在しない場合でもリンクを作成可能（赤リンク）
2. **表示時**: フロントエンドで存在チェック、赤リンクとして表示
3. **削除時**: ノート削除時にリンクもカスケード削除

---

## API設計

### エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/links` | リンク作成 |
| GET | `/api/links/:noteId` | ノートのアウトゴーイングリンク一覧 |
| GET | `/api/backlinks/:noteId` | バックリンク取得 |
| GET | `/api/related/:noteId` | 関連ノート取得 |
| DELETE | `/api/links/:id` | リンク削除 |
| PUT | `/api/links/:id` | リンク更新 |

---

### POST /api/links

**概要**: 新規リンクを作成

**リクエストボディ**:
```typescript
{
  sourceId: string;      // リンク元ノートID (UUID)
  targetTitle: string;   // リンク先ノートタイトル
  linkText?: string;     // 表示テキスト（省略時はtargetTitle）
  context?: string;      // リンク周辺のコンテキスト
}
```

**レスポンス（成功: 201）**:
```typescript
{
  success: true;
  message: "Link created successfully";
  data: {
    id: string;
    sourceId: string;
    targetId: string;
    linkText: string;
    context: string | null;
    createdAt: string;
    source: { id: string; title: string; };
    target: { id: string; title: string; };
  }
}
```

**エラーレスポンス**:
- `400`: sourceIdが無効、targetTitleが空
- `404`: sourceNoteが存在しない、targetNoteが見つからない（赤リンクの場合はtargetNote作成）
- `409`: 同一リンクが既に存在
- `500`: サーバーエラー

**実装ロジック**:
1. sourceIdの存在確認
2. targetTitleでノートを検索
3. 存在しない場合: 赤リンク対応（後述）
4. 重複チェック（sourceId + targetId + linkText）
5. NoteLink作成

**赤リンク対応**:
- オプション1: リンク作成時にtargetNoteを自動作成（空のノート）
- オプション2: targetIdをnullable化、存在しないノートへのリンクを許可
- **採用**: オプション1（UX向上、データ整合性）

---

### GET /api/links/:noteId

**概要**: 指定ノートのアウトゴーイングリンク一覧取得

**パスパラメータ**:
- `noteId`: ノートID (UUID)

**レスポンス（成功: 200）**:
```typescript
{
  success: true;
  count: number;
  data: Array<{
    id: string;
    targetId: string;
    linkText: string;
    context: string | null;
    createdAt: string;
    target: {
      id: string;
      title: string;
      isPinned: boolean;
      isFavorite: boolean;
      isArchived: boolean;
    }
  }>
}
```

**クエリパラメータ（オプション）**:
- `includeContext`: コンテキストを含めるか（デフォルト: false）
- `limit`: 取得件数上限（デフォルト: 100）

**エラーレスポンス**:
- `400`: noteIdが無効
- `404`: ノートが存在しない
- `500`: サーバーエラー

**実装ロジック**:
```typescript
const links = await prisma.noteLink.findMany({
  where: { sourceId: noteId },
  include: {
    target: {
      select: {
        id: true,
        title: true,
        isPinned: true,
        isFavorite: true,
        isArchived: true
      }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: limit
});
```

---

### GET /api/backlinks/:noteId

**概要**: 指定ノートへのバックリンク取得

**パスパラメータ**:
- `noteId`: ノートID (UUID)

**レスポンス（成功: 200）**:
```typescript
{
  success: true;
  count: number;
  data: Array<{
    id: string;
    sourceId: string;
    linkText: string;
    context: string | null;
    createdAt: string;
    source: {
      id: string;
      title: string;
      isPinned: boolean;
      isFavorite: boolean;
      isArchived: boolean;
      updatedAt: string;
    }
  }>
}
```

**クエリパラメータ（オプション）**:
- `includeContext`: コンテキストを含めるか（デフォルト: true）
- `limit`: 取得件数上限（デフォルト: 50）
- `excludeArchived`: アーカイブ済みノートを除外（デフォルト: true）

**エラーレスポンス**:
- `400`: noteIdが無効
- `404`: ノートが存在しない
- `500`: サーバーエラー

**実装ロジック**:
```typescript
const backlinks = await prisma.noteLink.findMany({
  where: {
    targetId: noteId,
    source: excludeArchived ? { isArchived: false } : undefined
  },
  include: {
    source: {
      select: {
        id: true,
        title: true,
        isPinned: true,
        isFavorite: true,
        isArchived: true,
        updatedAt: true
      }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: limit
});
```

---

### GET /api/related/:noteId

**概要**: 関連ノート提案

関連度スコアに基づいてノートを提案します。

**関連度計算ロジック**:

1. **共通タグ** (重み: 3.0)
   - 共通タグ数 × 3.0
2. **リンク関係** (重み: 5.0)
   - 相互リンク: 5.0
   - 一方向リンク: 2.5
3. **同一フォルダ** (重み: 1.0)
   - 同じフォルダに属する: 1.0
4. **キーワード類似度** (重み: 2.0)
   - タイトル・コンテンツの共通キーワード数 × 0.5

**パスパラメータ**:
- `noteId`: ノートID (UUID)

**クエリパラメータ（オプション）**:
- `limit`: 取得件数上限（デフォルト: 10）
- `threshold`: 最小関連度スコア（デフォルト: 1.0）
- `excludeLinked`: 既にリンク済みのノートを除外（デフォルト: false）

**レスポンス（成功: 200）**:
```typescript
{
  success: true;
  count: number;
  data: Array<{
    note: {
      id: string;
      title: string;
      isPinned: boolean;
      isFavorite: boolean;
      updatedAt: string;
    };
    score: number;
    reasons: {
      commonTags: number;
      linkRelation: 'bidirectional' | 'incoming' | 'outgoing' | null;
      sameFolder: boolean;
      keywordSimilarity: number;
    }
  }>
}
```

**実装ロジック**（疑似コード）:
```typescript
// 1. 対象ノートの情報取得
const targetNote = await prisma.note.findUnique({
  where: { id: noteId },
  include: { tags: true, folder: true, outgoingLinks: true, incomingLinks: true }
});

// 2. 候補ノート取得（自分自身とアーカイブ済みを除外）
const candidates = await prisma.note.findMany({
  where: {
    id: { not: noteId },
    isArchived: false
  },
  include: { tags: true, folder: true, outgoingLinks: true, incomingLinks: true }
});

// 3. 各候補の関連度スコア計算
const scoredNotes = candidates.map(candidate => {
  let score = 0;
  const reasons = {
    commonTags: 0,
    linkRelation: null,
    sameFolder: false,
    keywordSimilarity: 0
  };

  // 共通タグ
  const commonTags = candidate.tags.filter(ct =>
    targetNote.tags.some(tt => tt.tagId === ct.tagId)
  );
  reasons.commonTags = commonTags.length;
  score += commonTags.length * 3.0;

  // リンク関係
  const hasOutgoingLink = targetNote.outgoingLinks.some(l => l.targetId === candidate.id);
  const hasIncomingLink = targetNote.incomingLinks.some(l => l.sourceId === candidate.id);
  if (hasOutgoingLink && hasIncomingLink) {
    reasons.linkRelation = 'bidirectional';
    score += 5.0;
  } else if (hasOutgoingLink) {
    reasons.linkRelation = 'outgoing';
    score += 2.5;
  } else if (hasIncomingLink) {
    reasons.linkRelation = 'incoming';
    score += 2.5;
  }

  // 同一フォルダ
  if (candidate.folderId && candidate.folderId === targetNote.folderId) {
    reasons.sameFolder = true;
    score += 1.0;
  }

  // キーワード類似度（簡易実装）
  const targetKeywords = extractKeywords(targetNote.title + ' ' + targetNote.content);
  const candidateKeywords = extractKeywords(candidate.title + ' ' + candidate.content);
  const commonKeywords = targetKeywords.filter(k => candidateKeywords.includes(k));
  reasons.keywordSimilarity = commonKeywords.length;
  score += commonKeywords.length * 0.5;

  return { note: candidate, score, reasons };
});

// 4. スコアでソート、閾値フィルタ、上限適用
const relatedNotes = scoredNotes
  .filter(sn => sn.score >= threshold)
  .sort((a, b) => b.score - a.score)
  .slice(0, limit);
```

**キーワード抽出ロジック**（簡易版）:
```typescript
function extractKeywords(text: string): string[] {
  // 1. 小文字化
  const normalized = text.toLowerCase();

  // 2. HTMLタグ除去
  const stripped = normalized.replace(/<[^>]*>/g, ' ');

  // 3. 単語分割（日本語対応は将来対応）
  const words = stripped.split(/\s+/);

  // 4. ストップワード除去（簡易）
  const stopwords = ['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were'];
  const filtered = words.filter(w => w.length > 2 && !stopwords.includes(w));

  // 5. 重複除去
  return Array.from(new Set(filtered));
}
```

**Phase 4での改善**:
- TF-IDF による重み付け
- 形態素解析（日本語対応）
- ベクトル埋め込みによる意味的類似度

---

### DELETE /api/links/:id

**概要**: リンク削除

**パスパラメータ**:
- `id`: リンクID (UUID)

**レスポンス（成功: 200）**:
```typescript
{
  success: true;
  message: "Link deleted successfully";
}
```

**エラーレスポンス**:
- `400`: idが無効
- `404`: リンクが存在しない
- `500`: サーバーエラー

---

### PUT /api/links/:id

**概要**: リンク更新（リンクテキスト、コンテキスト変更）

**パスパラメータ**:
- `id`: リンクID (UUID)

**リクエストボディ**:
```typescript
{
  linkText?: string;
  context?: string;
}
```

**レスポンス（成功: 200）**:
```typescript
{
  success: true;
  message: "Link updated successfully";
  data: {
    id: string;
    sourceId: string;
    targetId: string;
    linkText: string;
    context: string | null;
    updatedAt: string;
  }
}
```

---

## フロントエンド設計

### コンポーネント構成

```
src/frontend/components/
├── Editor/
│   ├── TipTapEditor.tsx              # 既存（拡張）
│   ├── extensions/
│   │   └── NoteLinkExtension.ts      # 新規: Wiki-style Link拡張
│   └── NoteLinkSuggestion.tsx        # 新規: オートコンプリートUI
├── NoteLinks/
│   ├── BacklinkPanel.tsx             # 新規: バックリンク表示パネル
│   ├── RelatedNotesWidget.tsx        # 新規: 関連ノート提案ウィジェット
│   ├── OutgoingLinksPanel.tsx        # 新規: アウトゴーイングリンク表示
│   └── NoteLinkCard.tsx              # 新規: リンクカード（共通コンポーネント）
└── Graph/                            # Phase 3.5（オプション）
    └── NoteGraphView.tsx             # ノートグラフビュー
```

---

### 1. NoteLinkExtension.ts

TipTap Mention拡張をカスタマイズしたWiki-style Link拡張。

**機能**:
- `[[` 入力時にオートコンプリート起動
- ノート名候補表示
- `]]` で自動クローズ
- リンククリックでノート遷移

**実装**（擬似コード）:
```typescript
import { Node } from '@tiptap/core';
import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import NoteLinkSuggestion from './NoteLinkSuggestion';

export const NoteLinkExtension = Mention.extend({
  name: 'noteLink',

  // トリガーを [[ に変更
  addOptions() {
    return {
      ...this.parent?.(),
      suggestion: {
        char: '[[',
        allowSpaces: true,

        // ノート名候補を取得
        items: async ({ query }) => {
          const response = await fetch(`/api/notes?search=${query}&limit=10`);
          const data = await response.json();
          return data.data.map(note => ({
            id: note.id,
            title: note.title
          }));
        },

        // オートコンプリートUIのレンダリング
        render: () => {
          let component;
          let popup;

          return {
            onStart: props => {
              component = new ReactRenderer(NoteLinkSuggestion, {
                props,
                editor: props.editor
              });

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start'
              });
            },

            onUpdate(props) {
              component.updateProps(props);
              popup[0].setProps({
                getReferenceClientRect: props.clientRect
              });
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }
              return component.ref?.onKeyDown(props);
            },

            onExit() {
              popup[0].destroy();
              component.destroy();
            }
          };
        }
      }
    };
  },

  // レンダリング: <a> タグで表示
  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      {
        ...HTMLAttributes,
        class: 'note-link',
        'data-note-id': node.attrs.id,
        'data-note-title': node.attrs.label,
        href: `#/notes/${node.attrs.id}`
      },
      `[[${node.attrs.label}]]`
    ];
  },

  // リンククリック時のハンドリング
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            if (target.classList.contains('note-link')) {
              const noteId = target.getAttribute('data-note-id');
              if (noteId) {
                // ルーターでノート遷移
                window.location.hash = `/notes/${noteId}`;
                return true;
              }
            }
            return false;
          }
        }
      })
    ];
  }
});
```

---

### 2. NoteLinkSuggestion.tsx

オートコンプリート候補リストUI。

**Props**:
```typescript
interface NoteLinkSuggestionProps {
  items: Array<{ id: string; title: string }>;
  command: (item: { id: string; label: string }) => void;
  editor: Editor;
}
```

**実装**:
```typescript
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export const NoteLinkSuggestion = forwardRef((props: NoteLinkSuggestionProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.title });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    }
  }));

  return (
    <div className="bg-white border rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto">
      {props.items.length === 0 ? (
        <div className="text-gray-500 text-sm p-2">ノートが見つかりません</div>
      ) : (
        props.items.map((item, index) => (
          <button
            key={item.id}
            className={`w-full text-left px-3 py-2 rounded hover:bg-blue-50 ${
              index === selectedIndex ? 'bg-blue-100' : ''
            }`}
            onClick={() => selectItem(index)}
          >
            {item.title}
          </button>
        ))
      )}
    </div>
  );
});
```

---

### 3. BacklinkPanel.tsx

バックリンク表示パネル。

**Props**:
```typescript
interface BacklinkPanelProps {
  noteId: string;
}
```

**実装**:
```typescript
import { useEffect, useState } from 'react';
import { NoteLinkCard } from './NoteLinkCard';

interface Backlink {
  id: string;
  sourceId: string;
  linkText: string;
  context: string | null;
  source: {
    id: string;
    title: string;
    updatedAt: string;
  };
}

export function BacklinkPanel({ noteId }: BacklinkPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBacklinks = async () => {
      try {
        const response = await fetch(`/api/backlinks/${noteId}?includeContext=true`);
        const data = await response.json();
        if (data.success) {
          setBacklinks(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch backlinks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBacklinks();
  }, [noteId]);

  if (loading) {
    return <div className="p-4 text-gray-500">読み込み中...</div>;
  }

  if (backlinks.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        このノートを参照しているノートはありません
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3">
        バックリンク ({backlinks.length})
      </h3>
      <div className="space-y-2">
        {backlinks.map(backlink => (
          <NoteLinkCard
            key={backlink.id}
            noteId={backlink.source.id}
            title={backlink.source.title}
            context={backlink.context}
            updatedAt={backlink.source.updatedAt}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### 4. RelatedNotesWidget.tsx

関連ノート提案ウィジェット。

**Props**:
```typescript
interface RelatedNotesWidgetProps {
  noteId: string;
  limit?: number;
}
```

**実装**:
```typescript
import { useEffect, useState } from 'react';
import { NoteLinkCard } from './NoteLinkCard';

interface RelatedNote {
  note: {
    id: string;
    title: string;
    updatedAt: string;
  };
  score: number;
  reasons: {
    commonTags: number;
    linkRelation: string | null;
    sameFolder: boolean;
    keywordSimilarity: number;
  };
}

export function RelatedNotesWidget({ noteId, limit = 5 }: RelatedNotesWidgetProps) {
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedNotes = async () => {
      try {
        const response = await fetch(`/api/related/${noteId}?limit=${limit}`);
        const data = await response.json();
        if (data.success) {
          setRelatedNotes(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch related notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedNotes();
  }, [noteId, limit]);

  if (loading) {
    return <div className="p-4 text-gray-500">関連ノートを検索中...</div>;
  }

  if (relatedNotes.length === 0) {
    return null; // 関連ノートがない場合は非表示
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <span className="mr-2">💡</span>
        関連ノート
      </h3>
      <div className="space-y-2">
        {relatedNotes.map(related => (
          <div key={related.note.id}>
            <NoteLinkCard
              noteId={related.note.id}
              title={related.note.title}
              updatedAt={related.note.updatedAt}
              badge={
                <span className="text-xs text-gray-500">
                  スコア: {related.score.toFixed(1)}
                </span>
              }
            />
            {/* 関連理由の表示（オプション） */}
            <div className="text-xs text-gray-500 mt-1 ml-2">
              {related.reasons.commonTags > 0 && (
                <span className="mr-2">共通タグ: {related.reasons.commonTags}</span>
              )}
              {related.reasons.linkRelation && (
                <span className="mr-2">リンク: {related.reasons.linkRelation}</span>
              )}
              {related.reasons.sameFolder && (
                <span className="mr-2">同じフォルダ</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 5. NoteLinkCard.tsx

リンクカード共通コンポーネント。

**Props**:
```typescript
interface NoteLinkCardProps {
  noteId: string;
  title: string;
  context?: string | null;
  updatedAt: string;
  badge?: React.ReactNode;
}
```

**実装**:
```typescript
import { useNavigate } from 'react-router-dom';

export function NoteLinkCard({ noteId, title, context, updatedAt, badge }: NoteLinkCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/notes/${noteId}`);
  };

  return (
    <div
      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-blue-600 hover:underline">{title}</h4>
        {badge}
      </div>

      {context && (
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
          {context}
        </p>
      )}

      <div className="text-xs text-gray-400 mt-2">
        更新: {new Date(updatedAt).toLocaleDateString('ja-JP')}
      </div>
    </div>
  );
}
```

---

### UI/UX 配置

#### ノート編集画面

```
┌─────────────────────────────────────────────────────┐
│ Header: ノートタイトル                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [エディタ]                                          │
│ - TipTapEditor                                      │
│ - NoteLinkExtension有効                             │
│ - [[ 入力時にオートコンプリート表示                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 下部パネル（タブ切替）                               │
│ ┌───────┬───────┬───────┐                          │
│ │ バックリンク │ 関連ノート │ アウトゴーイング │     │
│ └───────┴───────┴───────┘                          │
│                                                     │
│ [選択されたパネルの内容]                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### レスポンシブ対応

- **デスクトップ**: 下部にパネル表示
- **モバイル**: スライドアウトサイドバー、またはモーダル表示

---

## 実装計画

### Phase 3 実装ステップ

#### ステップ1: データベース・API（Week 1）

1. **Prismaスキーマ拡張**
   - NoteLinkモデル追加
   - Noteモデルにリレーション追加
   - マイグレーション実行

2. **API実装**
   - POST /api/links
   - GET /api/links/:noteId
   - GET /api/backlinks/:noteId
   - DELETE /api/links/:id

3. **ユニットテスト**
   - API各エンドポイントのテスト
   - エッジケーステスト

#### ステップ2: フロントエンド基本機能（Week 2）

1. **NoteLinkExtension実装**
   - TipTap Mention拡張カスタマイズ
   - `[[` トリガー実装
   - オートコンプリート実装

2. **NoteLinkSuggestion実装**
   - 候補リストUI
   - キーボードナビゲーション

3. **エディタ統合**
   - useEditor.tsに拡張追加
   - リンククリックハンドリング

#### ステップ3: バックリンク・関連ノート（Week 3）

1. **BacklinkPanel実装**
   - API統合
   - コンテキスト表示

2. **RelatedNotesWidget実装**
   - 関連ノートAPI統合
   - スコア表示

3. **UI統合**
   - タブパネル実装
   - レスポンシブ対応

#### ステップ4: 関連ノートアルゴリズム（Week 4）

1. **GET /api/related/:noteId 実装**
   - 関連度計算ロジック
   - キーワード抽出

2. **パフォーマンス最適化**
   - クエリ最適化
   - キャッシング検討

3. **統合テスト**
   - E2Eテスト
   - パフォーマンステスト

---

## 4並列SubAgent タスク分割

### SubAgent 1: データベース層（DB Schema & Migration）

**担当ファイル**:
- `prisma/schema.prisma`
- `prisma/migrations/`

**タスク**:
1. NoteLinkモデル追加
2. Noteモデルにリレーション追加
3. インデックス設定
4. マイグレーション実行
5. Prismaクライアント生成確認

**成果物**:
- マイグレーションファイル
- 更新されたPrismaスキーマ
- データベーススキーマドキュメント

**依存関係**: なし（最初に実行可能）

---

### SubAgent 2: バックエンドAPI（Backend API Implementation）

**担当ファイル**:
- `src/backend/api/links.ts` (新規)
- `src/backend/services/linkService.ts` (新規)
- `src/backend/services/relatedNotesService.ts` (新規)
- `src/backend/index.ts` (ルート追加)

**タスク**:
1. POST /api/links 実装
2. GET /api/links/:noteId 実装
3. GET /api/backlinks/:noteId 実装
4. GET /api/related/:noteId 実装（関連度計算含む）
5. DELETE /api/links/:id 実装
6. PUT /api/links/:id 実装
7. エラーハンドリング

**成果物**:
- APIエンドポイント実装
- ビジネスロジックサービス
- APIドキュメント

**依存関係**: SubAgent 1（DBスキーマ）完了後

---

### SubAgent 3: フロントエンド（Frontend Components & TipTap Extension）

**担当ファイル**:
- `src/frontend/components/Editor/extensions/NoteLinkExtension.ts` (新規)
- `src/frontend/components/Editor/NoteLinkSuggestion.tsx` (新規)
- `src/frontend/components/NoteLinks/BacklinkPanel.tsx` (新規)
- `src/frontend/components/NoteLinks/RelatedNotesWidget.tsx` (新規)
- `src/frontend/components/NoteLinks/OutgoingLinksPanel.tsx` (新規)
- `src/frontend/components/NoteLinks/NoteLinkCard.tsx` (新規)
- `src/frontend/hooks/useEditor.ts` (拡張追加)

**タスク**:
1. NoteLinkExtension実装（TipTap Mention カスタマイズ）
2. NoteLinkSuggestion実装（オートコンプリートUI）
3. BacklinkPanel実装
4. RelatedNotesWidget実装
5. OutgoingLinksPanel実装
6. NoteLinkCard共通コンポーネント実装
7. useEditorへの拡張統合

**成果物**:
- TipTap拡張
- UIコンポーネント
- コンポーネントストーリーブック（オプション）

**依存関係**: SubAgent 2（API）完了後（モックデータで先行開発可能）

---

### SubAgent 4: テスト（Testing & Integration）

**担当ファイル**:
- `tests/backend/api/links.test.ts` (新規)
- `tests/backend/services/linkService.test.ts` (新規)
- `tests/backend/services/relatedNotesService.test.ts` (新規)
- `tests/frontend/components/NoteLinks/*.test.tsx` (新規)
- `tests/e2e/note-linking.spec.ts` (新規)

**タスク**:
1. バックエンドAPIユニットテスト
   - 各エンドポイントのテスト
   - エラーケーステスト
   - エッジケーステスト
2. フロントエンドコンポーネントテスト
   - NoteLinkExtensionテスト
   - BacklinkPanelテスト
   - RelatedNotesWidgetテスト
3. 統合テスト
   - リンク作成フロー
   - バックリンク表示フロー
4. E2Eテスト（Playwright）
   - ノート間リンク作成
   - オートコンプリート動作
   - バックリンク表示
   - 関連ノート表示

**成果物**:
- テストスイート
- テストカバレッジレポート
- E2Eテストレポート

**依存関係**: SubAgent 2, 3 完了後

---

### 並列実行フロー

```
[SubAgent 1: DB Schema]
    └─> 完了後 ──┐
                 ├─> [SubAgent 2: Backend API] ──┐
                 └─> [SubAgent 3: Frontend]      ├─> [SubAgent 4: Testing]
                                                  │
                     (モックで先行開発可能) ─────┘
```

**タイムライン**:
- Day 1-2: SubAgent 1（DB Schema）
- Day 3-7: SubAgent 2, 3 並列実行
- Day 8-10: SubAgent 4（Testing & Integration）

---

## テスト計画

### 1. ユニットテスト

#### バックエンドAPI

**テストケース**:
- POST /api/links
  - 正常系: リンク作成成功
  - 異常系: 存在しないsourceId
  - 異常系: 重複リンク
  - エッジケース: 空のlinkText

- GET /api/backlinks/:noteId
  - 正常系: バックリンク取得
  - 正常系: バックリンクなし
  - 異常系: 存在しないnoteId

- GET /api/related/:noteId
  - 正常系: 関連ノート取得（スコア順）
  - 正常系: 関連ノートなし
  - エッジケース: 閾値フィルタ

#### フロントエンド

**テストケース**:
- NoteLinkExtension
  - `[[` 入力時にオートコンプリート起動
  - ノート選択でリンク挿入
  - `Esc` でキャンセル

- BacklinkPanel
  - バックリンク表示
  - バックリンクなし表示
  - リンククリックで遷移

---

### 2. 統合テスト

**シナリオ**:
1. ノートAでノートBへのリンク作成
2. ノートBのバックリンクにノートAが表示される
3. ノートBからノートAへのリンク作成
4. 関連ノートにお互いが表示される（双方向リンク）

---

### 3. E2Eテスト（Playwright）

**シナリオ**:
```typescript
test('ノート間リンク作成フロー', async ({ page }) => {
  // 1. ノートA作成
  await page.goto('/');
  await page.click('button:has-text("新規ノート")');
  await page.fill('input[placeholder="タイトル"]', 'ノートA');

  // 2. ノートB作成
  await page.click('button:has-text("新規ノート")');
  await page.fill('input[placeholder="タイトル"]', 'ノートB');

  // 3. ノートAでノートBへのリンク作成
  await page.click('text=ノートA');
  await page.click('.ProseMirror');
  await page.keyboard.type('[[');
  await page.waitForSelector('text=ノートB');
  await page.click('text=ノートB');

  // 4. リンクが表示されることを確認
  await expect(page.locator('a.note-link')).toContainText('[[ノートB]]');

  // 5. ノートBを開く
  await page.click('text=ノートB');

  // 6. バックリンクにノートAが表示されることを確認
  await page.click('text=バックリンク');
  await expect(page.locator('text=ノートA')).toBeVisible();
});
```

---

## 将来の拡張性

### Phase 3.5（オプション）

#### グラフビュー

- **ノードグラフ可視化**
  - D3.js または Cytoscape.js 使用
  - ノート間のリンク関係を視覚化
  - ローカルグラフ・グローバルグラフ

#### リンクタイプ

- **リンクの種類**
  - 参照リンク（デフォルト）
  - 派生リンク（「〜から派生」）
  - 反論リンク（「〜に反論」）
  - 補足リンク（「〜を補足」）

### Phase 4（AI連携）

#### ベクトル埋め込み

- **セマンティック検索**
  - OpenAI Embeddings API
  - ベクトルデータベース（Chroma, Pinecone）
  - 意味的類似度による関連ノート提案

#### AI要約

- **バックリンクコンテキスト要約**
  - 大量のバックリンクを要約
  - 関連性の自動説明

---

## 技術リソース・参考文献

### TipTap

- [Extensions | Tiptap Editor Docs](https://tiptap.dev/docs/editor/extensions/overview)
- [Mention extension | Tiptap Editor Docs](https://tiptap.dev/docs/editor/extensions/nodes/mention)
- [Mentions example | Tiptap Editor Docs](https://tiptap.dev/docs/examples/advanced/mentions)
- [How to add a link to a Tiptap mention](https://peterwhite.dev/posts/tiptap-mentions-add-link)

### Wiki-style Links

- [GitHub - aarkue/tiptap-wikilink-extension](https://github.com/aarkue/tiptap-wikilink-extension)

### Graph Database Design

- [GitHub - dpapathanasiou/simple-graph](https://github.com/dpapathanasiou/simple-graph)
- [Unlimited On-Demand Graph Databases with Cloudflare Durable Objects | Boris Tane](https://boristane.com/blog/durable-objects-graph-databases/)

### PKM Tools Comparison

- [Roam Research and Obsidian: A Comprehensive Comparison](https://medium.com/@theo-james/roam-research-and-obsidian-a-comprehensive-comparison-for-note-taking-19c591655f84)
- [Creating and Working with Links in Obsidian - TechBloat](https://www.techbloat.com/creating-and-working-with-links-in-obsidian.html)
- [Obsidian vs. Roam vs. LogSeq: Which PKM App is Right For You? – The Sweet Setup](https://thesweetsetup.com/obsidian-vs-roam/)

---

## まとめ

本設計書では、Phase 3のノート間リンク機能について以下を定義しました:

1. **データベース設計**: NoteLinkモデル、双方向リレーション、インデックス戦略
2. **API設計**: 6つのエンドポイント、関連度計算アルゴリズム
3. **フロントエンド設計**: TipTap拡張、UI コンポーネント、UX配置
4. **実装計画**: 4週間のステップバイステップ計画
5. **並列開発**: 4つのSubAgentでの並列タスク分割
6. **テスト計画**: ユニット、統合、E2Eテスト

次のステップは、本設計書に基づいて4並列SubAgentでの実装開始です。

---

**承認者**: _____________
**承認日**: _____________
